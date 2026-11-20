import { config } from "dotenv";
config({ path: ".env.local" });

import { ethers } from "ethers";
import type { Payment, PaymentStatus } from "../src/types/payment";
import {
  getPayments,
  updatePayment,
  disconnectDb,
} from "../src/lib/db";

/**
 * Reconcile database payment records against Base Sepolia.
 *
 * The event listener only sees events while it is running, and a client-side
 * write can fail after the on-chain escrow already exists. This script treats
 * the chain as the source of truth:
 *
 *   - resolves each record's escrow id (stored id, transaction receipt, or a
 *     bounded scan around the record's createdAt for EscrowCreated)
 *   - reads the escrow's live status with `getEscrow`
 *   - fills in missing txHash / blockNumber / release date where recoverable
 *   - corrects stale statuses
 *
 * Writes are field-level and only happen when a value differs, so the script is
 * safe to run repeatedly (e.g. from cron) and against an already-clean database.
 *
 * The public Base Sepolia RPC limits `eth_getLogs` to 200 blocks, so the script
 * never scans the full chain. It reads receipts for transactions the database
 * already knows about, and only searches a short window after `createdAt` when
 * the record lost its on-chain linkage entirely.
 *
 * Usage:
 *   npm run reconcile          # apply corrections
 *   npm run reconcile:dry      # show what would change, write nothing
 */

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_SMART_ESCROW_ADDRESS;
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const LOG_CHUNK_SIZE = Number(process.env.RECONCILE_LOG_CHUNK) || 200;
const MATCH_WINDOW_BLOCKS = Number(process.env.RECONCILE_MATCH_WINDOW) || 10_800; // ~6h of Base blocks

const DRY_RUN =
  process.argv.includes("--dry-run") ||
  process.env.DRY_RUN === "1" ||
  process.env.DRY_RUN === "true";

// When a MongoDB URI is configured, the database is required. A failed
// connection must abort the run rather than silently reconcile the local JSON
// fallback and report success.
const REQUIRE_MONGO = Boolean(process.env.MONGODB_URI);

const TOPIC_ESCROW_CREATED = ethers.id(
  "EscrowCreated(uint256,address,address,address,uint256,string,uint256)"
);

const SMART_ESCROW_ABI = [
  "event EscrowCreated(uint256 indexed id, address indexed sender, address indexed receiver, address token, uint256 amount, string condition, uint256 deadline)",
  "event EscrowReleased(uint256 indexed id, address indexed receiver, uint256 amount)",
  "event EscrowRefunded(uint256 indexed id, address indexed sender, uint256 amount)",
  "function getEscrow(uint256 _id) view returns (tuple(uint256 id, address sender, address receiver, address token, uint256 amount, string condition, uint256 deadline, uint8 status, uint8 escrowType, uint256 interval, address conditionTarget, uint256 conditionTokenId))",
];

type PaymentUpdates = Parameters<typeof updatePayment>[1];

type CreatedEvent = {
  id: number;
  sender: string;
  receiver: string;
  amount: bigint;
  condition: string;
  txHash: string;
  blockNumber: number;
};

type OnChainEscrow = {
  id: bigint;
  sender: string;
  receiver: string;
  token: string;
  amount: bigint;
  condition: string;
  status: number;
};

// The app treats an on-chain refund as a cancelled payment (see the history
// page, which labels "cancelled" as "Refunded").
const STATUS_BY_ONCHAIN: Record<number, PaymentStatus> = {
  0: "active",
  1: "completed",
  2: "cancelled",
};

const TOKEN_DECIMALS: Record<Payment["token"], number> = {
  ETH: 18,
  USDC: 6,
  USDT: 6,
};

const ZERO_ADDRESS = ethers.ZeroAddress.toLowerCase();

function describeUpdates(updates: PaymentUpdates): string {
  return Object.entries(updates)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(", ");
}

function expectedAmount(payment: Payment): bigint | null {
  const decimals = TOKEN_DECIMALS[payment.token];
  if (decimals === undefined) return null;
  try {
    return ethers.parseUnits(payment.amount.toFixed(decimals), decimals);
  } catch {
    return null;
  }
}

function createdEventFromLog(
  log: ethers.Log,
  contract: ethers.Contract
): CreatedEvent | null {
  try {
    const parsed = contract.interface.parseLog(log);
    if (!parsed || parsed.name !== "EscrowCreated") return null;
    return {
      id: Number(parsed.args.id),
      sender: String(parsed.args.sender),
      receiver: String(parsed.args.receiver),
      amount: parsed.args.amount as bigint,
      condition: String(parsed.args.condition),
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
    };
  } catch {
    return null;
  }
}

function createdEventFromReceipt(
  receipt: ethers.TransactionReceipt,
  contract: ethers.Contract,
  contractAddress: string
): CreatedEvent | null {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contractAddress.toLowerCase()) continue;
    const event = createdEventFromLog(log, contract);
    if (event) return event;
  }
  return null;
}

/** Decode the escrow id from any escrow event in a known transaction receipt. */
function extractEscrowId(
  receipt: ethers.TransactionReceipt,
  contract: ethers.Contract,
  contractAddress: string
): number | null {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contractAddress.toLowerCase()) continue;
    try {
      const parsed = contract.interface.parseLog(log);
      if (
        parsed &&
        (parsed.name === "EscrowCreated" ||
          parsed.name === "EscrowReleased" ||
          parsed.name === "EscrowRefunded")
      ) {
        return Number(parsed.args.id);
      }
    } catch {
      // Log from another contract or an unknown event.
    }
  }
  return null;
}

async function getBlockOrNull(
  provider: ethers.Provider,
  blockNumber: number
): Promise<ethers.Block | null> {
  try {
    return await provider.getBlock(blockNumber);
  } catch {
    // Public RPCs prune old history and reject reads below their floor.
    return null;
  }
}

async function findFirstAvailableBlock(
  provider: ethers.Provider,
  latestBlock: number
): Promise<number> {
  if (await getBlockOrNull(provider, 0)) return 0;

  let low = 0;
  let high = latestBlock;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const block = await getBlockOrNull(provider, mid);
    if (block) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
}

async function findBlockByTimestamp(
  provider: ethers.Provider,
  timestampSeconds: number
): Promise<number> {
  const latestBlock = await provider.getBlockNumber();
  const latest = await getBlockOrNull(provider, latestBlock);
  if (!latest) throw new Error("The RPC returned no block at the chain head.");
  if (timestampSeconds >= latest.timestamp) return latestBlock;

  const first = await findFirstAvailableBlock(provider, latestBlock);
  const firstBlock = await getBlockOrNull(provider, first);
  if (!firstBlock || timestampSeconds <= firstBlock.timestamp) return first;

  let low = first;
  let high = latestBlock;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const block = await getBlockOrNull(provider, mid);
    if (block && block.timestamp < timestampSeconds) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

/**
 * Search a short window after `createdAt` for an EscrowCreated event matching
 * this payment. This is the last resort for records that lost every on-chain
 * link (contractEscrowId, txHash and settlement hashes are all missing).
 */
async function findCreatedEventInWindow(
  payment: Payment,
  provider: ethers.Provider,
  contract: ethers.Contract,
  address: string,
  expectedId?: number
): Promise<CreatedEvent | null> {
  const createdAt = Date.parse(payment.createdAt);
  if (Number.isNaN(createdAt)) return null;
  if (!ethers.isAddress(payment.senderAddress) || !ethers.isAddress(payment.receiverAddress)) {
    return null;
  }

  const latestBlock = await provider.getBlockNumber();
  const startBlock = await findBlockByTimestamp(provider, Math.floor(createdAt / 1000));
  const endBlock = Math.min(latestBlock, startBlock + MATCH_WINDOW_BLOCKS);
  if (endBlock < startBlock) return null;

  const senderTopic = ethers.zeroPadValue(payment.senderAddress, 32);
  const receiverTopic = ethers.zeroPadValue(payment.receiverAddress, 32);
  const amount = expectedAmount(payment);
  const matches: CreatedEvent[] = [];

  for (let from = startBlock; from <= endBlock; from += LOG_CHUNK_SIZE) {
    const to = Math.min(from + LOG_CHUNK_SIZE - 1, endBlock);
    const logs = await provider.getLogs({
      address,
      fromBlock: from,
      toBlock: to,
      topics: [TOPIC_ESCROW_CREATED, null, senderTopic, receiverTopic],
    });

    for (const log of logs) {
      const event = createdEventFromLog(log, contract);
      if (!event) continue;
      if (expectedId !== undefined && event.id !== expectedId) continue;
      if (amount !== null && event.amount !== amount) continue;
      matches.push(event);
    }
  }

  if (matches.length === 0) return null;

  if (matches.length > 1 && payment.condition) {
    const conditioned = matches.filter(
      (event) => event.condition === payment.condition
    );
    if (conditioned.length === 1) return conditioned[0];
  }

  if (matches.length > 1) {
    if (expectedId !== undefined) {
      console.warn(
        `[RECONCILE] ${payment.id}: ${matches.length} escrow creations match in the ` +
          `window (${matches.map((event) => `#${event.id}`).join(", ")}); using #${expectedId} ` +
          `because the escrow id is already known.`
      );
      return matches[0];
    }

    console.warn(
      `[RECONCILE] ${payment.id}: ${matches.length} escrow creations match in the ` +
        `window (${matches.map((event) => `#${event.id}`).join(", ")}); not guessing.`
    );
    return null;
  }

  return matches[0];
}

type ResolvedEscrow = {
  id: number;
  source: string;
  created: CreatedEvent | null;
  settlement: { txHash: string; blockNumber: number } | null;
};

async function resolveEscrow(
  payment: Payment,
  provider: ethers.Provider,
  contract: ethers.Contract,
  address: string,
  claimedIds: Set<number>
): Promise<ResolvedEscrow | null> {
  if (typeof payment.contractEscrowId === "number") {
    return {
      id: payment.contractEscrowId,
      source: "record",
      created: null,
      settlement: null,
    };
  }

  const candidates: Array<[string, string | undefined]> = [
    ["txHash", payment.txHash],
    ["releasedTxHash", payment.releasedTxHash],
    ["refundedTxHash", payment.refundedTxHash],
  ];

  for (const [field, hash] of candidates) {
    if (!hash) continue;
    const receipt = await provider.getTransactionReceipt(hash);
    if (!receipt) {
      console.warn(
        `[RECONCILE] ${payment.id}: ${field} ${hash} is not on this chain; ignoring it.`
      );
      continue;
    }
    const id = extractEscrowId(receipt, contract, address);
    if (id === null) continue;

    const created =
      field === "txHash"
        ? createdEventFromReceipt(receipt, contract, address)
        : null;
    return {
      id,
      source: field,
      created,
      settlement:
        field === "releasedTxHash" || field === "refundedTxHash"
          ? { txHash: hash, blockNumber: receipt.blockNumber }
          : null,
    };
  }

  const matched = await findCreatedEventInWindow(payment, provider, contract, address);
  if (matched && !claimedIds.has(matched.id)) {
    return { id: matched.id, source: "EscrowCreated window", created: matched, settlement: null };
  }

  return null;
}

async function main() {
  if (!ESCROW_ADDRESS) {
    console.error(
      "[RECONCILE] NEXT_PUBLIC_SMART_ESCROW_ADDRESS is not set. Nothing to reconcile against."
    );
    process.exitCode = 1;
    return;
  }

  const address = ethers.getAddress(ESCROW_ADDRESS);

  console.log("[RECONCILE] Reconciling database payments against Base Sepolia.");
  console.log(`[RECONCILE] Contract: ${address}`);
  console.log(`[RECONCILE] RPC: ${RPC_URL}`);
  console.log(
    REQUIRE_MONGO
      ? "[RECONCILE] Payment store: MongoDB (required — aborts if unreachable)."
      : "[RECONCILE] Payment store: local JSON database (src/scratch/db.json)."
  );
  if (DRY_RUN) {
    console.log("[RECONCILE] DRY RUN — no database writes will be made.");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const network = await provider.getNetwork();
  if (network.chainId !== 84532n) {
    console.warn(
      `[RECONCILE] WARNING: RPC reports chain ${network.chainId}, expected Base Sepolia (84532).`
    );
  }

  const contract = new ethers.Contract(address, SMART_ESCROW_ABI, provider);
  const payments = await getPayments({ requireMongo: REQUIRE_MONGO });
  console.log(`[RECONCILE] ${payments.length} payment record(s) to check.`);

  const timestamps = new Map<number, string>();
  const timestampOf = async (blockNumber: number): Promise<string> => {
    const cached = timestamps.get(blockNumber);
    if (cached) return cached;
    const block = await provider.getBlock(blockNumber);
    const iso = new Date((block?.timestamp ?? Math.floor(Date.now() / 1000)) * 1000)
      .toISOString();
    timestamps.set(blockNumber, iso);
    return iso;
  };

  const claimedIds = new Set<number>();
  for (const payment of payments) {
    if (typeof payment.contractEscrowId === "number") {
      claimedIds.add(payment.contractEscrowId);
    }
  }

  let corrected = 0;
  let consistent = 0;
  let skipped = 0;

  for (const payment of payments) {
    const resolved = await resolveEscrow(
      payment,
      provider,
      contract,
      address,
      claimedIds
    );

    if (!resolved) {
      console.warn(
        `[RECONCILE] ${payment.id}: no escrow id could be resolved; leaving record untouched.`
      );
      skipped++;
      continue;
    }

    const { id, source } = resolved;
    claimedIds.add(id);

    const escrow = (await contract.getEscrow(id)) as unknown as OnChainEscrow;

    if (!escrow.sender || escrow.sender.toLowerCase() === ZERO_ADDRESS) {
      console.warn(
        `[RECONCILE] ${payment.id}: escrow #${id} does not exist on this contract; skipping.`
      );
      skipped++;
      continue;
    }

    if (escrow.sender.toLowerCase() !== payment.senderAddress.toLowerCase()) {
      console.warn(
        `[RECONCILE] ${payment.id}: escrow #${id} belongs to ${escrow.sender}, ` +
          `not ${payment.senderAddress}; skipping to avoid corrupting another record.`
      );
      skipped++;
      continue;
    }

    if (escrow.receiver.toLowerCase() !== payment.receiverAddress.toLowerCase()) {
      console.warn(
        `[RECONCILE] ${payment.id}: receiver on-chain (${escrow.receiver}) differs ` +
          `from the record (${payment.receiverAddress}); correcting the linkage anyway.`
      );
    }

    const onchainStatus = STATUS_BY_ONCHAIN[Number(escrow.status)];
    if (!onchainStatus) {
      console.warn(
        `[RECONCILE] ${payment.id}: escrow #${id} has unknown status ${escrow.status}; skipping.`
      );
      skipped++;
      continue;
    }

    // Records with an id but no creation tx can still recover it from the
    // bounded window (useful after the bookkeeping fix).
    let createdEvent = resolved.created;
    if (!createdEvent && !payment.txHash) {
      createdEvent = await findCreatedEventInWindow(
        payment,
        provider,
        contract,
        address,
        id
      );
    }

    const updates: PaymentUpdates = {};

    if (payment.contractEscrowId !== id) updates.contractEscrowId = id;
    if (payment.status !== onchainStatus) updates.status = onchainStatus;
    if (!payment.txHash && createdEvent) updates.txHash = createdEvent.txHash;
    if (payment.blockNumber === undefined && createdEvent) {
      updates.blockNumber = createdEvent.blockNumber;
    }

    if (onchainStatus === "completed") {
      if (!payment.releasedTxHash && resolved.settlement) {
        updates.releasedTxHash = resolved.settlement.txHash;
      }
      if (!payment.releaseDate) {
        const hash = payment.releasedTxHash ?? resolved.settlement?.txHash;
        if (hash) {
          const receipt = await provider.getTransactionReceipt(hash);
          if (receipt) updates.releaseDate = await timestampOf(receipt.blockNumber);
        }
      }
    } else if (onchainStatus === "cancelled") {
      if (!payment.refundedTxHash && resolved.settlement) {
        updates.refundedTxHash = resolved.settlement.txHash;
      }
      if (!payment.releaseDate) {
        const hash = payment.refundedTxHash ?? resolved.settlement?.txHash;
        if (hash) {
          const receipt = await provider.getTransactionReceipt(hash);
          if (receipt) updates.releaseDate = await timestampOf(receipt.blockNumber);
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      consistent++;
      continue;
    }

    console.log(
      `[RECONCILE] ${payment.id} -> escrow #${id} (via ${source}): ${describeUpdates(updates)}`
    );

    if (DRY_RUN) {
      corrected++;
      continue;
    }

    const saved = await updatePayment(payment.id, updates, {
      requireMongo: REQUIRE_MONGO,
    });
    if (!saved) {
      console.error(
        `[RECONCILE] ${payment.id}: database update returned no record; the write may have failed.`
      );
      skipped++;
      continue;
    }
    corrected++;
  }

  console.log(
    `[RECONCILE] Done: ${payments.length} scanned, ${corrected} ` +
      `${DRY_RUN ? "would be corrected" : "corrected"}, ${consistent} already consistent, ` +
      `${skipped} skipped (no on-chain match or safety guard).`
  );

  await disconnectDb();
}

main().catch(async (err) => {
  console.error("[RECONCILE] Fatal error:", err);
  await disconnectDb();
  process.exitCode = 1;
});

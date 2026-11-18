import { config } from "dotenv";
config({ path: ".env.local" });

import { ethers } from "ethers";
import type { Payment } from "../src/types/payment";
import {
  getPayments,
  updatePayment as updatePaymentRecord,
  disconnectDb,
} from "../src/lib/db";

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_SMART_ESCROW_ADDRESS;
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const EXECUTOR_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const POLL_INTERVAL_MS = 30_000; // Check every 30 seconds

// Dry run: inspect the payments that would be executed, then exit.
// Enable with `--dry-run` or `DRY_RUN=true`. No signer, RPC or transaction is
// needed, so this works offline against MongoDB or the local JSON database.
const DRY_RUN =
  process.argv.includes("--dry-run") ||
  process.env.DRY_RUN === "1" ||
  process.env.DRY_RUN === "true";

const SMART_ESCROW_ABI = [
  "function executeScheduledRelease(uint256 _id) external",
  "function executeRecurringPayout(uint256 _id) external",
];

// Idempotency: track which escrows we've already attempted to execute in this session
const executedThisSession = new Set<string>();

async function findDuePayments(type: "scheduled" | "recurring"): Promise<Payment[]> {
  try {
    const all = await getPayments();
    return all.filter(
      (payment) =>
        payment.type === type &&
        payment.status === "active" &&
        typeof payment.contractEscrowId === "number"
    );
  } catch (err) {
    console.error(`[SCHEDULER] Failed to query ${type} payments:`, err);
    return [];
  }
}

async function executeScheduledEscrow(
  contract: ethers.Contract,
  escrowId: number
): Promise<string | null> {
  try {
    const tx = await contract.executeScheduledRelease(escrowId);
    const receipt = await tx.wait();
    console.log(`[SCHEDULER] Scheduled release confirmed: escrowId=${escrowId} tx=${receipt.hash}`);
    return receipt.hash;
  } catch (err: any) {
    if (err?.message?.includes("Scheduled time not reached")) {
      console.log(`[SCHEDULER] Escrow ${escrowId}: scheduled time not reached yet, skipping.`);
    } else if (err?.message?.includes("Escrow is not active")) {
      console.log(`[SCHEDULER] Escrow ${escrowId}: already settled, skipping.`);
    } else {
      console.error(`[SCHEDULER] Scheduled release failed for escrow ${escrowId}:`, err?.message || err);
    }
    return null;
  }
}

async function executeRecurringPayout(
  contract: ethers.Contract,
  escrowId: number,
  paymentId: string
): Promise<string | null> {
  try {
    const tx = await contract.executeRecurringPayout(escrowId);
    const receipt = await tx.wait();
    console.log(`[SCHEDULER] Recurring payout confirmed: escrowId=${escrowId} tx=${receipt.hash}`);
    return receipt.hash;
  } catch (err: any) {
    if (err?.message?.includes("Interval not yet elapsed")) {
      console.log(`[SCHEDULER] Escrow ${escrowId}: interval not yet elapsed, skipping.`);
    } else if (err?.message?.includes("Escrow is not active")) {
      console.log(`[SCHEDULER] Escrow ${escrowId}: already settled, skipping.`);
    } else if (err?.message?.includes("Recurring period expired")) {
      console.log(`[SCHEDULER] Escrow ${escrowId}: recurring period expired, marking as completed.`);
      await updatePaymentRecord(paymentId, { status: "completed" });
    } else {
      console.error(`[SCHEDULER] Recurring payout failed for escrow ${escrowId}:`, err?.message || err);
    }
    return null;
  }
}

async function runDryRun(): Promise<void> {
  console.log("[SCHEDULER] DRY RUN — no transactions will be sent.");

  const scheduled = await findDuePayments("scheduled");
  const recurring = await findDuePayments("recurring");

  const describeSchedule = (payment: Payment): string =>
    payment.type === "scheduled"
      ? `scheduledAt=${payment.scheduledAt ?? "not set"}`
      : `frequency=${payment.frequency ?? "on-chain interval"}`;

  if (scheduled.length === 0 && recurring.length === 0) {
    console.log("[SCHEDULER] No active scheduled or recurring payments with an escrow id.");
  }

  for (const payment of scheduled) {
    console.log(
      `[SCHEDULER] [scheduled] ${payment.id} | escrow #${payment.contractEscrowId} | ` +
      `${payment.amount} ${payment.token} -> ${payment.receiverName} (${payment.receiverAddress}) | ` +
      `${describeSchedule(payment)}`
    );
  }

  for (const payment of recurring) {
    console.log(
      `[SCHEDULER] [recurring] ${payment.id} | escrow #${payment.contractEscrowId} | ` +
      `${payment.amount} ${payment.token} -> ${payment.receiverName} (${payment.receiverAddress}) | ` +
      `${describeSchedule(payment)}`
    );
  }

  console.log(
    `[SCHEDULER] Dry run complete: ${scheduled.length} scheduled, ${recurring.length} recurring candidate(s).`
  );
  console.log(
    "[SCHEDULER] Timing (scheduled deadline / recurring interval) is re-checked on-chain at execution time."
  );
  console.log(
    "[SCHEDULER] Run without --dry-run, with DEPLOYER_PRIVATE_KEY set, to execute these payments."
  );
}

async function main() {
  const escrowAddress = ESCROW_ADDRESS;
  const executorKey = EXECUTOR_KEY;

  if (!DRY_RUN && !escrowAddress) {
    console.error("[SCHEDULER] NEXT_PUBLIC_SMART_ESCROW_ADDRESS is not set.");
    process.exit(1);
  }
  if (!DRY_RUN && !executorKey) {
    console.error("[SCHEDULER] DEPLOYER_PRIVATE_KEY is not set. The scheduler needs this to sign transactions.");
    process.exit(1);
  }

  console.log("[SCHEDULER] Starting SmartEscrow payment executor...");
  if (escrowAddress) {
    console.log(`[SCHEDULER] Contract: ${escrowAddress}`);
  } else {
    console.log("[SCHEDULER] Contract: not set (dry run uses the database only).");
  }
  console.log(`[SCHEDULER] Poll interval: ${POLL_INTERVAL_MS}ms`);

  console.log(
    process.env.MONGODB_URI
      ? "[SCHEDULER] Payment store: MongoDB."
      : "[SCHEDULER] Payment store: local JSON database (src/scratch/db.json)."
  );

  if (DRY_RUN) {
    await runDryRun();
    await disconnectDb();
    return;
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(executorKey as string, provider);
  const contract = new ethers.Contract(escrowAddress as string, SMART_ESCROW_ABI, wallet);

  const network = await provider.getNetwork();
  console.log(`[SCHEDULER] Executor wallet: ${wallet.address}`);
  console.log(`[SCHEDULER] Network: ${network.name} (chainId: ${network.chainId})`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`[SCHEDULER] Executor balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.warn("[SCHEDULER] WARNING: Executor wallet has 0 ETH. Transactions will fail.");
  }

  console.log("[SCHEDULER] Listening for due payments... (press Ctrl+C to stop)");

  const poll = async () => {
    try {
      // Process scheduled payments
      const dueScheduled = await findDuePayments("scheduled");
      for (const payment of dueScheduled) {
        const escrowId = payment.contractEscrowId as number;
        const paymentId = payment.id;
        const idempotencyKey = `scheduled-${escrowId}`;

        if (executedThisSession.has(idempotencyKey)) continue;

        console.log(`[SCHEDULER] Checking scheduled payment ${paymentId} (escrow ${escrowId})...`);
        const txHash = await executeScheduledEscrow(contract, escrowId);

        if (txHash) {
          executedThisSession.add(idempotencyKey);
          const updated = await updatePaymentRecord(paymentId, {
            status: "completed",
            releasedTxHash: txHash,
            releaseDate: new Date().toISOString(),
          });
          if (!updated) {
            console.warn(`[SCHEDULER] Payment ${paymentId} was not found while recording the release.`);
          }
        }
      }

      // Process recurring payments
      const dueRecurring = await findDuePayments("recurring");
      for (const payment of dueRecurring) {
        const escrowId = payment.contractEscrowId as number;
        const paymentId = payment.id;

        // For recurring, we DON'T skip previously executed — each interval is a new payout
        // But we prevent double-execution within the same poll cycle
        const now = Date.now();
        const idempotencyKey = `recurring-${escrowId}-${Math.floor(now / POLL_INTERVAL_MS)}`;

        if (executedThisSession.has(idempotencyKey)) continue;

        console.log(`[SCHEDULER] Checking recurring payment ${paymentId} (escrow ${escrowId})...`);
        const txHash = await executeRecurringPayout(contract, escrowId, paymentId);

        if (txHash) {
          executedThisSession.add(idempotencyKey);

          // Store the latest payout tx hash
          await updatePaymentRecord(paymentId, {
            releasedTxHash: txHash,
          });

          console.log(`[SCHEDULER] Recurring payout recorded for ${paymentId}: tx=${txHash}`);
        }
      }

      // Clean up idempotency keys older than 1 hour to prevent memory leak
      // (Keys are based on time windows, so old keys naturally become stale)
      if (executedThisSession.size > 1000) {
        executedThisSession.clear();
        console.log("[SCHEDULER] Cleared idempotency cache (memory limit).");
      }
    } catch (err) {
      console.error("[SCHEDULER] Poll error:", err);
    }
  };

  const interval = setInterval(poll, POLL_INTERVAL_MS);

  const shutdown = async () => {
    console.log("\n[SCHEDULER] Shutting down...");
    clearInterval(interval);
    await disconnectDb();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Initial poll
  await poll();
}

main().catch(async (err) => {
  console.error("[SCHEDULER] Fatal error:", err);
  await disconnectDb();
  process.exitCode = 1;
});

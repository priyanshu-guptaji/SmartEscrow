import { config } from "dotenv";
config({ path: ".env.local" });

import { ethers } from "ethers";
import mongoose from "mongoose";

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_SMART_ESCROW_ADDRESS;
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const MONGODB_URI = process.env.MONGODB_URI;
const POLL_INTERVAL_MS = 12_000; // Base Sepolia block time ~2s, poll every 12s

const SMART_ESCROW_ABI = [
  "event EscrowCreated(uint256 indexed id, address indexed sender, address indexed receiver, address token, uint256 amount, string condition, uint256 deadline)",
  "event EscrowReleased(uint256 indexed id, address indexed receiver, uint256 amount)",
  "event EscrowRefunded(uint256 indexed id, address indexed sender, uint256 amount)",
];

const TOPIC_ESCROW_CREATED = "0x8aab5acf4a464bd2d79150e4230aadd9e44b0a3b2f1031b3757b9f5a1e1abf59";
const TOPIC_ESCROW_RELEASED = "0x6244ed823ca6be0f11bc890c3fafcf3c29cb23420c14243642e930b5e07e6d0a";
const TOPIC_ESCROW_REFUNDED = "0xeac97bc1917fcedc984e3d0671d4e83b359890323d5d1c2de32b28d17c356ced";

const processedTxs = new Set<string>();

let PaymentModel: mongoose.Model<Record<string, unknown>> | null = null;

async function connectMongo(): Promise<boolean> {
  if (!MONGODB_URI) {
    console.log("[LISTENER] No MONGODB_URI configured — events will be logged but not persisted.");
    return false;
  }
  if (mongoose.connection.readyState === 1) return true;
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("[LISTENER] Connected to MongoDB.");

    const schema = new mongoose.Schema({
      id: { type: String, required: true, unique: true },
      senderAddress: { type: String, required: true, index: true },
      receiverName: { type: String, required: true },
      receiverAddress: { type: String, required: true },
      amount: { type: Number, required: true },
      token: { type: String, required: true },
      type: { type: String, required: true, index: true },
      status: { type: String, required: true, index: true },
      condition: { type: String, required: true },
      createdAt: { type: String, required: true },
      releaseDate: { type: String },
      description: { type: String },
      naturalLanguagePrompt: { type: String },
      contractEscrowId: { type: Number, sparse: true, index: true },
      txHash: { type: String },
      fundedTxHash: { type: String },
      releasedTxHash: { type: String },
      refundedTxHash: { type: String },
      blockNumber: { type: Number },
      duration: { type: Number },
      scheduledAt: { type: String },
      frequency: { type: String },
    }, { strict: false });

    PaymentModel = mongoose.models.Payment || mongoose.model("Payment", schema);
    return true;
  } catch (err) {
    console.error("[LISTENER] MongoDB connection failed:", err);
    return false;
  }
}

async function updatePaymentByEscrowId(
  escrowId: number,
  updates: Record<string, unknown>
): Promise<boolean> {
  if (!PaymentModel) return false;
  try {
    const result = await PaymentModel.findOneAndUpdate(
      { contractEscrowId: escrowId },
      { $set: updates },
      { returnDocument: "after" }
    ).lean();
    return result !== null;
  } catch (err) {
    console.error(`[LISTENER] Failed to update payment for escrow ${escrowId}:`, err);
    return false;
  }
}

function decodeUint256(hex: string): number {
  return parseInt(hex, 16);
}

function decodeAddress(hex: string): string {
  return "0x" + hex.slice(26);
}

async function processLogs(logs: Array<{
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
}>) {
  const connected = await connectMongo();

  for (const log of logs) {
    const txKey = `${log.transactionHash}-${log.logIndex}`;
    if (processedTxs.has(txKey)) {
      console.log(`[LISTENER] Skipping already-processed event: ${txKey}`);
      continue;
    }
    processedTxs.add(txKey);

    const topic0 = log.topics[0];
    const blockNumber = decodeUint256(log.blockNumber);

    if (topic0 === TOPIC_ESCROW_CREATED) {
      const escrowId = decodeUint256(log.topics[1]);
      const sender = decodeAddress(log.topics[2]);
      const receiver = decodeAddress(log.topics[3]);
      console.log(`[LISTENER] EscrowCreated: id=${escrowId} sender=${sender} receiver=${receiver} tx=${log.transactionHash} block=${blockNumber}`);

      if (connected) {
        const updated = await updatePaymentByEscrowId(escrowId, {
          txHash: log.transactionHash,
          status: "active",
          blockNumber,
        });
        if (!updated) {
          console.log(`[LISTENER] No matching payment in DB for escrow ${escrowId}. Event logged only.`);
        }
      }
    } else if (topic0 === TOPIC_ESCROW_RELEASED) {
      const escrowId = decodeUint256(log.topics[1]);
      const receiver = decodeAddress(log.topics[2]);
      console.log(`[LISTENER] EscrowReleased: id=${escrowId} receiver=${receiver} tx=${log.transactionHash} block=${blockNumber}`);

      if (connected) {
        await updatePaymentByEscrowId(escrowId, {
          status: "completed",
          releasedTxHash: log.transactionHash,
          releaseDate: new Date().toISOString(),
        });
      }
    } else if (topic0 === TOPIC_ESCROW_REFUNDED) {
      const escrowId = decodeUint256(log.topics[1]);
      const sender = decodeAddress(log.topics[2]);
      console.log(`[LISTENER] EscrowRefunded: id=${escrowId} sender=${sender} tx=${log.transactionHash} block=${blockNumber}`);

      if (connected) {
        await updatePaymentByEscrowId(escrowId, {
          status: "cancelled",
          refundedTxHash: log.transactionHash,
          releaseDate: new Date().toISOString(),
        });
      }
    }
  }
}

async function main() {
  if (!ESCROW_ADDRESS) {
    console.error("[LISTENER] NEXT_PUBLIC_SMART_ESCROW_ADDRESS is not set. Cannot start listener.");
    process.exit(1);
  }

  console.log("[LISTENER] Starting SmartEscrow event listener...");
  console.log(`[LISTENER] Contract: ${ESCROW_ADDRESS}`);
  console.log(`[LISTENER] RPC: ${RPC_URL}`);
  console.log(`[LISTENER] Poll interval: ${POLL_INTERVAL_MS}ms`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const network = await provider.getNetwork();
  console.log(`[LISTENER] Connected to chain ${network.name} (chainId: ${network.chainId})`);

  let lastBlock = await provider.getBlockNumber();
  console.log(`[LISTENER] Starting from block ${lastBlock}`);

  await connectMongo();

  const topicFilter = [
    [TOPIC_ESCROW_CREATED, TOPIC_ESCROW_RELEASED, TOPIC_ESCROW_REFUNDED],
  ];

  console.log("[LISTENER] Listening for events... (press Ctrl+C to stop)");

  const poll = async () => {
    try {
      const currentBlock = await provider.getBlockNumber();
      if (currentBlock <= lastBlock) return;

      const fromBlock = lastBlock + 1;
      const logs = await provider.getLogs({
        address: ESCROW_ADDRESS as `0x${string}`,
        fromBlock: BigInt(fromBlock),
        toBlock: "latest",
        topics: topicFilter,
      });

      if (logs.length > 0) {
        console.log(`[LISTENER] Found ${logs.length} event(s) in blocks ${fromBlock}-${currentBlock}`);
        await processLogs(logs as any);
      }

      lastBlock = currentBlock;
    } catch (err) {
      console.error("[LISTENER] Poll error:", err);
    }
  };

  const interval = setInterval(poll, POLL_INTERVAL_MS);

  process.on("SIGINT", async () => {
    console.log("\n[LISTENER] Shutting down...");
    clearInterval(interval);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\n[LISTENER] Shutting down...");
    clearInterval(interval);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(0);
  });

  // Initial poll
  await poll();
}

main().catch((err) => {
  console.error("[LISTENER] Fatal error:", err);
  process.exit(1);
});

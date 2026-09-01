import { config } from "dotenv";
config({ path: ".env.local" });

import { ethers } from "ethers";
import mongoose from "mongoose";

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_SMART_ESCROW_ADDRESS;
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const MONGODB_URI = process.env.MONGODB_URI;
const EXECUTOR_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const POLL_INTERVAL_MS = 30_000; // Check every 30 seconds

const SMART_ESCROW_ABI = [
  "function executeScheduledRelease(uint256 _id) external",
  "function executeRecurringPayout(uint256 _id) external",
  "function getEscrow(uint256 _id) external view (uint256 id, address sender, address receiver, address token, uint256 amount, string condition, uint256 deadline, uint8 status, uint8 escrowType, uint256 interval, address conditionTarget, uint256 conditionTokenId)",
];

let PaymentModel: mongoose.Model<Record<string, unknown>> | null = null;

// Idempotency: track which escrows we've already attempted to execute in this session
const executedThisSession = new Set<string>();

async function connectMongo(): Promise<boolean> {
  if (!MONGODB_URI) {
    console.log("[SCHEDULER] No MONGODB_URI configured — cannot read payment state.");
    return false;
  }
  if (mongoose.connection.readyState === 1) return true;
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("[SCHEDULER] Connected to MongoDB.");

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
    console.error("[SCHEDULER] MongoDB connection failed:", err);
    return false;
  }
}

async function findDuePayments(type: "scheduled" | "recurring"): Promise<Array<Record<string, unknown>>> {
  if (!PaymentModel) return [];
  try {
    return await PaymentModel.find({
      type,
      status: "active",
      contractEscrowId: { $ne: null, $exists: true },
    }).lean();
  } catch (err) {
    console.error(`[SCHEDULER] Failed to query ${type} payments:`, err);
    return [];
  }
}

async function updatePayment(id: string, updates: Record<string, unknown>): Promise<boolean> {
  if (!PaymentModel) return false;
  try {
    await PaymentModel.findOneAndUpdate({ id }, { $set: updates });
    return true;
  } catch (err) {
    console.error(`[SCHEDULER] Failed to update payment ${id}:`, err);
    return false;
  }
}

async function executeScheduledEscrow(
  contract: ethers.Contract,
  escrowId: number,
  signerAddress: string
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
  paymentId: string,
  signerAddress: string
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
      await updatePayment(paymentId, { status: "completed" });
    } else {
      console.error(`[SCHEDULER] Recurring payout failed for escrow ${escrowId}:`, err?.message || err);
    }
    return null;
  }
}

async function main() {
  if (!ESCROW_ADDRESS) {
    console.error("[SCHEDULER] NEXT_PUBLIC_SMART_ESCROW_ADDRESS is not set.");
    process.exit(1);
  }
  if (!EXECUTOR_KEY) {
    console.error("[SCHEDULER] DEPLOYER_PRIVATE_KEY is not set. The scheduler needs this to sign transactions.");
    process.exit(1);
  }

  console.log("[SCHEDULER] Starting SmartEscrow payment executor...");
  console.log(`[SCHEDULER] Contract: ${ESCROW_ADDRESS}`);
  console.log(`[SCHEDULER] Poll interval: ${POLL_INTERVAL_MS}ms`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(EXECUTOR_KEY, provider);
  const contract = new ethers.Contract(ESCROW_ADDRESS, SMART_ESCROW_ABI, wallet);

  const network = await provider.getNetwork();
  console.log(`[SCHEDULER] Executor wallet: ${wallet.address}`);
  console.log(`[SCHEDULER] Network: ${network.name} (chainId: ${network.chainId})`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`[SCHEDULER] Executor balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.warn("[SCHEDULER] WARNING: Executor wallet has 0 ETH. Transactions will fail.");
  }

  const mongoConnected = await connectMongo();
  if (!mongoConnected) {
    console.warn("[SCHEDULER] MongoDB not available. Scheduler will run but cannot update payment records.");
  }

  console.log("[SCHEDULER] Listening for due payments... (press Ctrl+C to stop)");

  const poll = async () => {
    try {
      // Process scheduled payments
      const dueScheduled = await findDuePayments("scheduled");
      for (const payment of dueScheduled) {
        const escrowId = payment.contractEscrowId as number;
        const paymentId = payment.id as string;
        const idempotencyKey = `scheduled-${escrowId}`;

        if (executedThisSession.has(idempotencyKey)) continue;

        console.log(`[SCHEDULER] Checking scheduled payment ${paymentId} (escrow ${escrowId})...`);
        const txHash = await executeScheduledEscrow(contract, escrowId, wallet.address);

        if (txHash) {
          executedThisSession.add(idempotencyKey);
          await updatePayment(paymentId, {
            status: "completed",
            releasedTxHash: txHash,
            releaseDate: new Date().toISOString(),
          });
        }
      }

      // Process recurring payments
      const dueRecurring = await findDuePayments("recurring");
      for (const payment of dueRecurring) {
        const escrowId = payment.contractEscrowId as number;
        const paymentId = payment.id as string;

        // For recurring, we DON'T skip previously executed — each interval is a new payout
        // But we prevent double-execution within the same poll cycle
        const now = Date.now();
        const idempotencyKey = `recurring-${escrowId}-${Math.floor(now / POLL_INTERVAL_MS)}`;

        if (executedThisSession.has(idempotencyKey)) continue;

        console.log(`[SCHEDULER] Checking recurring payment ${paymentId} (escrow ${escrowId})...`);
        const txHash = await executeRecurringPayout(contract, escrowId, paymentId, wallet.address);

        if (txHash) {
          executedThisSession.add(idempotencyKey);

          // Store the latest payout tx hash
          await updatePayment(paymentId, {
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

  process.on("SIGINT", async () => {
    console.log("\n[SCHEDULER] Shutting down...");
    clearInterval(interval);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\n[SCHEDULER] Shutting down...");
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
  console.error("[SCHEDULER] Fatal error:", err);
  process.exit(1);
});

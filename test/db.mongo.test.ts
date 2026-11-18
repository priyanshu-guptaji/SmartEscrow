import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import mongoose from "mongoose";

import {
  savePayment,
  getPaymentById,
  updatePayment,
  updatePaymentByEscrowId,
  disconnectDb,
} from "../src/lib/db";
import type { Payment } from "../src/types/payment";

// Opt-in integration tests. They only run when a test database is supplied:
//   MONGODB_TEST_URI=mongodb://... npm run test:db:mongo
// or, to reuse the app connection string explicitly:
//   RUN_MONGO_TESTS=1 MONGODB_URI=mongodb://... npm run test:db:mongo
const RUN_EXPLICITLY = process.env.RUN_MONGO_TESTS === "1";
const MONGO_URI = process.env.MONGODB_TEST_URI || (RUN_EXPLICITLY ? process.env.MONGODB_URI : undefined);

const SKIP_REASON =
  "Set MONGODB_TEST_URI (or RUN_MONGO_TESTS=1 with MONGODB_URI) to run MongoDB integration tests.";

if (MONGO_URI) {
  process.env.MONGODB_URI = MONGO_URI;
}
// Make sure a stray JSON fallback cannot satisfy the assertions.
delete process.env.LOCAL_DB_PATH;

const RUN_ID = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const SENDER = `0x${RUN_ID.replace(/\D/g, "").padEnd(40, "0").slice(0, 40)}`.toLowerCase();
const ESCROW_ID = 900_000_000 + Math.floor(Math.random() * 1_000_000);
const UNKNOWN_ESCROW_ID = 2_000_000_000 + Math.floor(Math.random() * 1_000_000);

function testPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: `pay_mongo_test_${RUN_ID}`,
    senderAddress: SENDER,
    receiverName: "Mongo Test Receiver",
    receiverAddress: "0x71c2728892154f65b20a8642657132c0424165b2",
    amount: 0.75,
    token: "ETH",
    type: "conditional",
    status: "pending",
    condition: "Mongo integration condition",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("MongoDB database layer (integration)", { skip: MONGO_URI ? false : SKIP_REASON }, function () {
  before(async function () {
    // Connect directly first: the DB layer silently falls back to JSON when a
    // connection fails, so fail loudly here instead of asserting on a fallback.
    await mongoose.connect(MONGO_URI as string);
    assert.equal(mongoose.connection.readyState, 1, "MongoDB connection must be established");
  });

  after(async function () {
    const PaymentModel = mongoose.models.Payment as mongoose.Model<Record<string, unknown>> | undefined;
    if (PaymentModel) {
      await PaymentModel.deleteMany({ senderAddress: SENDER });
    }
    await disconnectDb();
  });

  it("writes and reads a payment through MongoDB", async function () {
    const payment = testPayment();

    await savePayment(payment);

    const fetched = await getPaymentById(payment.id);
    assert.ok(fetched, "payment must be readable back");
    assert.equal(fetched.id, payment.id);
    assert.equal(fetched.receiverName, payment.receiverName);
    assert.equal(fetched.contractEscrowId, undefined);

    // Confirm the record really lives in the Mongo collection.
    const PaymentModel = mongoose.models.Payment as mongoose.Model<Record<string, unknown>>;
    const doc = await PaymentModel.findOne({ id: payment.id }).lean();
    assert.ok(doc, "payment must exist in the MongoDB collection");
  });

  it("does not duplicate an existing payment id", async function () {
    const payment = testPayment();

    await savePayment(payment);
    await savePayment({ ...payment, amount: 999 });

    const fetched = await getPaymentById(payment.id);
    assert.equal(fetched?.amount, 0.75);
  });

  it("updates a payment by id", async function () {
    const payment = testPayment();
    await savePayment(payment);

    const updated = await updatePayment(payment.id, {
      status: "active",
      txHash: "0xfeed",
      blockNumber: 123,
      contractEscrowId: ESCROW_ID,
    });

    assert.ok(updated);
    assert.equal(updated.status, "active");
    assert.equal(updated.txHash, "0xfeed");
    assert.equal(updated.contractEscrowId, ESCROW_ID);
    assert.equal(updated.receiverName, payment.receiverName);
  });

  it("updates a payment by escrow id", async function () {
    const payment = testPayment({ contractEscrowId: ESCROW_ID });
    await savePayment(payment);

    const updated = await updatePaymentByEscrowId(ESCROW_ID, {
      status: "completed",
      releasedTxHash: "0xbeef",
      releaseDate: new Date().toISOString(),
    });

    assert.ok(updated);
    assert.equal(updated.id, payment.id);
    assert.equal(updated.status, "completed");
    assert.equal(updated.releasedTxHash, "0xbeef");

    const fetched = await getPaymentById(payment.id);
    assert.equal(fetched?.status, "completed");
  });

  it("returns null for an unknown escrow id", async function () {
    const updated = await updatePaymentByEscrowId(UNKNOWN_ESCROW_ID, { status: "completed" });
    assert.equal(updated, null);
  });
});

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, beforeEach, describe, it } from "node:test";

import {
  savePayment,
  getPayments,
  getPaymentById,
  getPaymentsBySender,
  updatePayment,
  updatePaymentByEscrowId,
} from "../src/lib/db";
import type { Payment } from "../src/types/payment";

// Point the JSON fallback at a temp file and force the JSON backend. The path
// is read lazily on every operation, so setting it here is enough.
const TEST_DB_PATH = path.join(
  os.tmpdir(),
  `smartescrow-db-test-${process.pid}.json`
);
process.env.LOCAL_DB_PATH = TEST_DB_PATH;
delete process.env.MONGODB_URI;

const SENDER = "0x1111111111111111111111111111111111111111";
const RECEIVER = "0x71C2728892154F65B20a8642657132C0424165B2";

function samplePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: `pay_db_test_${Math.random().toString(36).slice(2)}`,
    senderAddress: SENDER,
    receiverName: "DB Test Receiver",
    receiverAddress: RECEIVER.toLowerCase(),
    amount: 1.25,
    token: "ETH",
    type: "conditional",
    status: "pending",
    condition: "Release after testing",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("Local JSON database layer", function () {
  beforeEach(function () {
    fs.rmSync(TEST_DB_PATH, { force: true });
  });

  after(function () {
    fs.rmSync(TEST_DB_PATH, { force: true });
  });

  it("creates the file and persists a payment", async function () {
    const payment = samplePayment();

    await savePayment(payment);

    assert.ok(fs.existsSync(TEST_DB_PATH), "database file must be created");
    const stored = JSON.parse(fs.readFileSync(TEST_DB_PATH, "utf-8")) as Payment[];
    assert.equal(stored.length, 1);
    assert.equal(stored[0].id, payment.id);

    const fetched = await getPaymentById(payment.id);
    assert.deepEqual(fetched, payment);
  });

  it("does not duplicate a payment with the same id", async function () {
    const payment = samplePayment();

    await savePayment(payment);
    await savePayment({ ...payment, amount: 99 });

    const all = await getPayments();
    assert.equal(all.length, 1);
    assert.equal(all[0].amount, 1.25, "the original record must be kept");
  });

  it("returns payments only for the matching sender, case-insensitively", async function () {
    const mine = samplePayment();
    const other = samplePayment({ senderAddress: "0x2222222222222222222222222222222222222222" });

    await savePayment(mine);
    await savePayment(other);

    const lower = await getPaymentsBySender(SENDER.toLowerCase());
    const upper = await getPaymentsBySender(SENDER.toUpperCase().replace("0X", "0x"));

    assert.equal(lower.length, 1);
    assert.equal(lower[0].id, mine.id);
    assert.equal(upper.length, 1);
    assert.equal(upper[0].id, mine.id);
  });

  it("updates only the provided fields", async function () {
    const payment = samplePayment();
    await savePayment(payment);

    const updated = await updatePayment(payment.id, {
      status: "active",
      txHash: "0xabc",
      contractEscrowId: 12,
    });

    assert.ok(updated);
    assert.equal(updated.status, "active");
    assert.equal(updated.txHash, "0xabc");
    assert.equal(updated.contractEscrowId, 12);
    assert.equal(updated.receiverName, payment.receiverName);
    assert.equal(updated.amount, payment.amount);
    assert.equal(updated.createdAt, payment.createdAt);

    const fetched = await getPaymentById(payment.id);
    assert.equal(fetched?.status, "active");
  });

  it("returns null when updating an unknown payment id", async function () {
    const updated = await updatePayment("pay_missing", { status: "completed" });
    assert.equal(updated, null);
  });

  it("updates a payment by its on-chain escrow id", async function () {
    const payment = samplePayment({ contractEscrowId: 42 });
    await savePayment(payment);

    const updated = await updatePaymentByEscrowId(42, {
      status: "completed",
      releasedTxHash: "0xdeadbeef",
      releaseDate: "2026-01-01T00:00:00.000Z",
    });

    assert.ok(updated);
    assert.equal(updated.id, payment.id);
    assert.equal(updated.status, "completed");
    assert.equal(updated.releasedTxHash, "0xdeadbeef");

    const fetched = await getPaymentById(payment.id);
    assert.equal(fetched?.status, "completed");
    assert.equal(fetched?.releasedTxHash, "0xdeadbeef");
  });

  it("does not touch other payments when updating by escrow id", async function () {
    const target = samplePayment({ contractEscrowId: 7 });
    const bystander = samplePayment({ contractEscrowId: 8 });
    await savePayment(target);
    await savePayment(bystander);

    await updatePaymentByEscrowId(7, { status: "refunded" });

    const untouched = await getPaymentById(bystander.id);
    assert.equal(untouched?.status, "pending");
  });

  it("returns null for an unknown escrow id", async function () {
    const payment = samplePayment({ contractEscrowId: 1 });
    await savePayment(payment);

    const updated = await updatePaymentByEscrowId(999, { status: "completed" });
    assert.equal(updated, null);
  });
});

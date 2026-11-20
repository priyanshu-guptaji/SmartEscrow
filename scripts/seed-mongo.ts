import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import type { Payment } from "../src/types/payment";

/**
 * Import payments from the local JSON database into MongoDB.
 *
 * The JSON fallback is used by the app when MONGODB_URI is unset, so developers
 * can accumulate dev payments before a database is available. This script
 * copies those records into the configured MongoDB database once it exists.
 *
 * The import is idempotent and non-destructive: records are matched by `id` and
 * written with `$setOnInsert`, so existing documents are never overwritten and
 * re-running the script only reports them as already present.
 *
 * Usage:
 *   npm run seed            # import into MONGODB_URI
 *   npm run seed:dry        # show what would be imported, write nothing
 *   LOCAL_DB_PATH=path.json npm run seed   # import a different JSON file
 */

const DRY_RUN =
  process.argv.includes("--dry-run") ||
  process.env.DRY_RUN === "1" ||
  process.env.DRY_RUN === "true";

function getSourcePath(): string {
  return process.env.LOCAL_DB_PATH
    ? path.resolve(process.env.LOCAL_DB_PATH)
    : path.join(process.cwd(), "src", "scratch", "db.json");
}

function readLocalPayments(sourcePath: string): Payment[] {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Local database not found at ${sourcePath}.`);
  }

  const raw = fs.readFileSync(sourcePath, "utf-8");
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`${sourcePath} does not contain a JSON array of payments.`);
  }

  const invalid = parsed.findIndex(
    (record) =>
      !record ||
      typeof record !== "object" ||
      typeof (record as Payment).id !== "string" ||
      (record as Payment).id.length === 0 ||
      typeof (record as Payment).senderAddress !== "string" ||
      !/^0x[a-fA-F0-9]{40}$/.test((record as Payment).senderAddress)
  );

  if (invalid !== -1) {
    throw new Error(
      `${sourcePath}: record at index ${invalid} is missing a valid id or senderAddress.`
    );
  }

  return parsed as Payment[];
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      "[SEED] MONGODB_URI is not set. Configure it in .env.local before seeding."
    );
    process.exitCode = 1;
    return;
  }

  const sourcePath = getSourcePath();
  const payments = readLocalPayments(sourcePath);

  console.log("[SEED] Importing local payments into MongoDB.");
  console.log(
    `[SEED] Source: ${path.relative(process.cwd(), sourcePath)} (${payments.length} record(s))`
  );
  if (DRY_RUN) {
    console.log("[SEED] DRY RUN — no database writes will be made.");
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  } catch (error) {
    const detail = error instanceof Error ? error.message.split("\n")[0] : String(error);
    console.error(
      `[SEED] Could not connect to MongoDB at the configured MONGODB_URI. (${detail})`
    );
    process.exitCode = 1;
    return;
  }

  const db = mongoose.connection.db;
  if (!db) {
    console.error("[SEED] MongoDB connected without a usable database handle.");
    process.exitCode = 1;
    await mongoose.disconnect();
    return;
  }

  console.log(`[SEED] Target database: ${mongoose.connection.name}`);

  const collection = db.collection("payments");
  const ids = payments.map((payment) => payment.id);

  let existingIds = new Set<string>();
  if (ids.length > 0) {
    const existing = await collection
      .find({ id: { $in: ids } }, { projection: { id: 1 } })
      .toArray();
    existingIds = new Set(existing.map((doc) => String(doc.id)));
  }

  let inserted = 0;
  let skipped = 0;

  for (const payment of payments) {
    if (existingIds.has(payment.id)) {
      skipped++;
      console.log(`[SEED] ${payment.id}: already present, leaving it untouched.`);
      continue;
    }

    if (DRY_RUN) {
      inserted++;
      console.log(`[SEED] ${payment.id}: would insert.`);
      continue;
    }

    // Drop any Mongo export metadata so the server assigns a fresh _id.
    const { _id: _ignored, ...document } = payment as Payment & { _id?: unknown };
    const result = await collection.updateOne(
      { id: payment.id },
      { $setOnInsert: document },
      { upsert: true }
    );

    if (result.upsertedCount === 1) {
      inserted++;
      console.log(`[SEED] ${payment.id}: inserted.`);
    } else {
      skipped++;
      console.log(`[SEED] ${payment.id}: already present, leaving it untouched.`);
    }
  }

  console.log(
    `[SEED] Done: ${payments.length} read, ${inserted} ` +
      `${DRY_RUN ? "would be inserted" : "inserted"}, ${skipped} already present.`
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("[SEED] Fatal error:", err);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});

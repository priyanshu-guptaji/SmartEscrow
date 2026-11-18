import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import type { Payment, PaymentStatus } from '../types/payment';

// `MONGODB_URI` is read lazily: the background scripts load `.env.local` with
// dotenv after their imports are evaluated, so a module-level read would always
// see undefined. It also keeps the JSON fallback working without any config.
function getMongoUri(): string | undefined {
  return process.env.MONGODB_URI;
}

// Local JSON database path. `LOCAL_DB_PATH` lets tests point the fallback at a
// temporary file so they never touch the real development database.
function getLocalDbPath(): string {
  const override = process.env.LOCAL_DB_PATH;
  return override
    ? path.resolve(override)
    : path.join(process.cwd(), 'src', 'scratch', 'db.json');
}

// Mongoose schema/model (only compiled if MONGODB_URI is provided)
let PaymentModel: mongoose.Model<Payment> | null = null;

function getPaymentModel(): mongoose.Model<Payment> | null {
  if (!getMongoUri()) return null;

  if (!PaymentModel) {
    const paymentSchema = new mongoose.Schema({
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
    });

    PaymentModel =
      (mongoose.models.Payment as mongoose.Model<Payment>) ||
      mongoose.model<Payment>('Payment', paymentSchema);
  }

  return PaymentModel;
}

// Ensure local db directory and file exist
function initializeLocalDB() {
  const dbPath = getLocalDbPath();
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify([], null, 2));
  }
}

// MongoDB connection helper
async function connectToMongo(): Promise<boolean> {
  const uri = getMongoUri();
  if (!uri) return false;
  if (mongoose.connection.readyState === 1) return true;
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB successfully.");
    return true;
  } catch (error) {
    console.error("MongoDB connection failed, using local database fallback:", error);
    return false;
  }
}

// Returns a connected model, or null when the JSON fallback should be used.
async function getConnectedModel(): Promise<mongoose.Model<Payment> | null> {
  if (!(await connectToMongo())) return null;
  return getPaymentModel();
}

// Reading from local JSON db
function readLocalDB(): Payment[] {
  initializeLocalDB();
  try {
    const data = fs.readFileSync(getLocalDbPath(), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read local DB file, returning empty array:", error);
    return [];
  }
}

// Writing to local JSON db
function writeLocalDB(payments: Payment[]) {
  initializeLocalDB();
  try {
    fs.writeFileSync(getLocalDbPath(), JSON.stringify(payments, null, 2));
  } catch (error) {
    console.error("Failed to write to local DB file:", error);
  }
}

type PaymentUpdates = Partial<Pick<Payment,
  | 'status'
  | 'releaseDate'
  | 'releasedTxHash'
  | 'refundedTxHash'
  | 'txHash'
  | 'fundedTxHash'
  | 'blockNumber'
  | 'contractEscrowId'
>>;

const UPDATABLE_FIELDS: Array<keyof PaymentUpdates> = [
  'status',
  'releaseDate',
  'releasedTxHash',
  'refundedTxHash',
  'txHash',
  'fundedTxHash',
  'blockNumber',
  'contractEscrowId',
];

function pickUpdates(updates: PaymentUpdates): Partial<Record<string, unknown>> {
  const data: Partial<Record<string, unknown>> = {};
  for (const field of UPDATABLE_FIELDS) {
    if (updates[field] !== undefined) {
      data[field] = updates[field];
    }
  }
  return data;
}

// DB Abstractions
export async function savePayment(payment: Payment): Promise<Payment> {
  const model = await getConnectedModel();

  if (model) {
    const existing = await model.findOne({ id: payment.id }).lean();
    if (existing) {
      return existing as unknown as Payment;
    }
    const newDoc = new model(payment);
    await newDoc.save();
    return payment;
  } else {
    // Local JSON DB
    const list = readLocalDB();
    // Prevent duplicate entries
    const exists = list.some(p => p.id === payment.id);
    if (!exists) {
      list.unshift(payment); // Add to beginning
      writeLocalDB(list);
    }
    return payment;
  }
}

export async function getPayments(): Promise<Payment[]> {
  const model = await getConnectedModel();

  if (model) {
    const docs = await model.find().sort({ createdAt: -1 }).lean();
    return docs as unknown as Payment[];
  } else {
    // Local JSON DB
    return readLocalDB();
  }
}

export async function getPaymentsBySender(senderAddress: string): Promise<Payment[]> {
  const model = await getConnectedModel();

  if (model) {
    const docs = await model.find({
      senderAddress: senderAddress.toLowerCase()
    }).sort({ createdAt: -1 }).lean();
    return docs as unknown as Payment[];
  } else {
    // Local JSON DB
    const list = readLocalDB();
    return list.filter(p =>
      p.senderAddress?.toLowerCase() === senderAddress.toLowerCase()
    );
  }
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const model = await getConnectedModel();

  if (model) {
    const doc = await model.findOne({ id }).lean();
    return doc as unknown as Payment | null;
  } else {
    // Local JSON DB
    const list = readLocalDB();
    return list.find(p => p.id === id) || null;
  }
}

export async function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
  releaseDate?: string
): Promise<Payment | null> {
  return updatePayment(id, { status, releaseDate });
}

export async function updatePayment(
  id: string,
  updates: PaymentUpdates
): Promise<Payment | null> {
  const model = await getConnectedModel();

  if (model) {
    const updated = await model.findOneAndUpdate(
      { id },
      { $set: pickUpdates(updates) },
      { returnDocument: 'after' }
    ).lean();
    return updated as unknown as Payment | null;
  } else {
    // Local JSON DB
    const list = readLocalDB();
    let updatedPayment: Payment | null = null;
    const newList = list.map(p => {
      if (p.id === id) {
        updatedPayment = {
          ...p,
          ...updates,
        };
        return updatedPayment;
      }
      return p;
    });
    if (updatedPayment) {
      writeLocalDB(newList);
    }
    return updatedPayment;
  }
}

/**
 * Update the payment linked to an on-chain escrow id.
 * Used by the event listener, which only knows the escrow id from the log.
 */
export async function updatePaymentByEscrowId(
  escrowId: number,
  updates: PaymentUpdates
): Promise<Payment | null> {
  const model = await getConnectedModel();

  if (model) {
    const updated = await model.findOneAndUpdate(
      { contractEscrowId: escrowId },
      { $set: pickUpdates(updates) },
      { returnDocument: 'after' }
    ).lean();
    return updated as unknown as Payment | null;
  } else {
    // Local JSON DB
    const list = readLocalDB();
    let updatedPayment: Payment | null = null;
    const newList = list.map(p => {
      if (p.contractEscrowId === escrowId) {
        updatedPayment = {
          ...p,
          ...updates,
        };
        return updatedPayment;
      }
      return p;
    });
    if (updatedPayment) {
      writeLocalDB(newList);
    }
    return updatedPayment;
  }
}

/**
 * Close the MongoDB connection, if one was opened.
 * The background scripts call this on shutdown; the Next app never does.
 */
export async function disconnectDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

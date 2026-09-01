import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { Payment, PaymentStatus } from '@/types/payment';

const MONGODB_URI = process.env.MONGODB_URI;

// Define local JSON database path
const LOCAL_DB_DIR = path.join(process.cwd(), 'src', 'scratch');
const LOCAL_DB_PATH = path.join(LOCAL_DB_DIR, 'db.json');

// Mongoose schema (only compiled if MONGODB_URI is provided)
let PaymentModel: mongoose.Model<Payment> | null = null;

if (MONGODB_URI) {
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

  PaymentModel = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
}

// Ensure local db directory and file exist
function initializeLocalDB() {
  if (!fs.existsSync(LOCAL_DB_DIR)) {
    fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify([], null, 2));
  }
}

// MongoDB connection helper
async function connectToMongo() {
  if (!MONGODB_URI) return false;
  if (mongoose.connection.readyState === 1) return true;
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully.");
    return true;
  } catch (error) {
    console.error("MongoDB connection failed, using local database fallback:", error);
    return false;
  }
}

// Reading from local JSON db
function readLocalDB(): Payment[] {
  initializeLocalDB();
  try {
    const data = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
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
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(payments, null, 2));
  } catch (error) {
    console.error("Failed to write to local DB file:", error);
  }
}

// DB Abstractions
export async function savePayment(payment: Payment): Promise<Payment> {
  const isMongoConnected = await connectToMongo();

  if (isMongoConnected && PaymentModel) {
    const existing = await PaymentModel.findOne({ id: payment.id }).lean();
    if (existing) {
      return existing as unknown as Payment;
    }
    const newDoc = new PaymentModel(payment);
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
  const isMongoConnected = await connectToMongo();

  if (isMongoConnected && PaymentModel) {
    const docs = await PaymentModel.find().sort({ createdAt: -1 }).lean();
    return docs as unknown as Payment[];
  } else {
    // Local JSON DB
    return readLocalDB();
  }
}

export async function getPaymentsBySender(senderAddress: string): Promise<Payment[]> {
  const isMongoConnected = await connectToMongo();

  if (isMongoConnected && PaymentModel) {
    const docs = await PaymentModel.find({
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
  const isMongoConnected = await connectToMongo();

  if (isMongoConnected && PaymentModel) {
    const doc = await PaymentModel.findOne({ id }).lean();
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
  updates: Partial<Pick<Payment, 'status' | 'releaseDate' | 'releasedTxHash' | 'refundedTxHash' | 'txHash' | 'fundedTxHash' | 'blockNumber' | 'contractEscrowId'>>
): Promise<Payment | null> {
  const isMongoConnected = await connectToMongo();

  if (isMongoConnected && PaymentModel) {
    const updateData: Partial<Record<string, unknown>> = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.releaseDate !== undefined) updateData.releaseDate = updates.releaseDate;
    if (updates.releasedTxHash !== undefined) updateData.releasedTxHash = updates.releasedTxHash;
    if (updates.refundedTxHash !== undefined) updateData.refundedTxHash = updates.refundedTxHash;
    if (updates.txHash !== undefined) updateData.txHash = updates.txHash;
    if (updates.fundedTxHash !== undefined) updateData.fundedTxHash = updates.fundedTxHash;
    if (updates.blockNumber !== undefined) updateData.blockNumber = updates.blockNumber;
    if (updates.contractEscrowId !== undefined) updateData.contractEscrowId = updates.contractEscrowId;

    const updated = await PaymentModel.findOneAndUpdate(
      { id },
      { $set: updateData },
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

import { NextResponse } from "next/server";
import { getPayments, savePayment, updatePaymentStatus } from "@/lib/db";
import { Payment } from "@/types/payment";

export async function GET() {
  try {
    const list = await getPayments();
    return NextResponse.json({ data: list });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("GET payments API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const paymentData = await request.json();
    
    // Validate request body
    if (!paymentData.receiverName || !paymentData.receiverAddress || !paymentData.amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newPayment: Payment = {
      ...paymentData,
      id: paymentData.id || `pay_${Date.now()}`,
      status: paymentData.status || "active",
      createdAt: paymentData.createdAt || new Date().toISOString(),
    };

    await savePayment(newPayment);
    return NextResponse.json({ success: true, data: newPayment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("POST payments API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status, releaseDate } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "ID and status are required fields" }, { status: 400 });
    }

    const updated = await updatePaymentStatus(id, status, releaseDate);

    if (!updated) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("PATCH payments API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

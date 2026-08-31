import { NextResponse } from "next/server";
import { getPaymentsBySender, getPaymentById, savePayment, updatePayment } from "@/lib/db";
import { verifyRequestAuth } from "@/lib/auth";
import { Payment } from "@/types/payment";

export async function GET(request: Request) {
  try {
    // Verify wallet authentication
    const walletAddress = await verifyRequestAuth(request);
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Authentication required. Please sign the nonce with your wallet." },
        { status: 401 }
      );
    }

    // Return ONLY payments belonging to this wallet (as sender)
    const list = await getPaymentsBySender(walletAddress);
    return NextResponse.json({ data: list });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("GET payments API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Verify wallet authentication
    const walletAddress = await verifyRequestAuth(request);
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Authentication required. Please sign the nonce with your wallet." },
        { status: 401 }
      );
    }

    const paymentData = await request.json();
    
    // Validate required fields
    if (!paymentData.receiverName || !paymentData.receiverAddress || !paymentData.amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate receiverAddress format
    if (!/^0x[a-fA-F0-9]{40}$/.test(paymentData.receiverAddress)) {
      return NextResponse.json(
        { error: "Invalid receiver wallet address format" },
        { status: 400 }
      );
    }

    // Validate amount is a positive number
    const amount = parseFloat(paymentData.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // Validate token
    const validTokens = ["ETH", "USDC", "USDT"];
    if (!validTokens.includes(paymentData.token)) {
      return NextResponse.json(
        { error: "Invalid token. Must be ETH, USDC, or USDT" },
        { status: 400 }
      );
    }

    // Validate payment type
    const validTypes = ["conditional", "scheduled", "recurring", "nft-conditional"];
    if (!validTypes.includes(paymentData.type)) {
      return NextResponse.json(
        { error: "Invalid payment type" },
        { status: 400 }
      );
    }

    // Enforce sender address from authenticated wallet (never trust frontend)
    const newPayment: Payment = {
      ...paymentData,
      senderAddress: walletAddress,
      id: paymentData.id || `pay_${crypto.randomUUID()}`,
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
    // Verify wallet authentication
    const walletAddress = await verifyRequestAuth(request);
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Authentication required. Please sign the nonce with your wallet." },
        { status: 401 }
      );
    }

    const { id, status, releaseDate, releasedTxHash, refundedTxHash } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "ID and status are required fields" }, { status: 400 });
    }

    // Verify the payment belongs to this wallet
    const existingPayment = await getPaymentById(id);
    if (!existingPayment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    if (existingPayment.senderAddress?.toLowerCase() !== walletAddress) {
      return NextResponse.json(
        { error: "Unauthorized: You can only modify your own payments" },
        { status: 403 }
      );
    }

    const updated = await updatePayment(id, {
      status,
      releaseDate,
      releasedTxHash,
      refundedTxHash,
    });

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

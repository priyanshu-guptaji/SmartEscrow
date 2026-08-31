import { NextResponse } from "next/server";
import { generateNonce, getSignMessage } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    const nonce = generateNonce(address);
    const message = getSignMessage(address, nonce);

    return NextResponse.json({ nonce, message });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Auth nonce API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

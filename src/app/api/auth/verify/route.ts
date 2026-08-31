import { NextResponse } from "next/server";
import { verifyWalletSignature } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { address, signature, nonce } = await request.json();

    if (!address || !signature || !nonce) {
      return NextResponse.json(
        { error: "address, signature, and nonce are required" },
        { status: 400 }
      );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    const isValid = await verifyWalletSignature(address, signature, nonce);

    if (!isValid) {
      return NextResponse.json(
        { error: "Signature verification failed" },
        { status: 401 }
      );
    }

    return NextResponse.json({ verified: true, address: address.toLowerCase() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Auth verify API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

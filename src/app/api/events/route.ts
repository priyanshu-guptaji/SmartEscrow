import { NextResponse } from "next/server";
import { verifyRequestAuth } from "@/lib/auth";

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_SMART_ESCROW_ADDRESS || "";
const BASE_SEPOLIA_RPC = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

async function rpcCall(method: string, params: unknown[] = []): Promise<unknown> {
  const res = await fetch(BASE_SEPOLIA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "RPC error");
  return json.result;
}

// Event topic0 hashes (keccak256 of event signatures)
const TOPIC_ESCROW_CREATED = "0x8aab5acf4a464bd2d79150e4230aadd9e44b0a3b2f1031b3757b9f5a1e1abf59";
const TOPIC_ESCROW_RELEASED = "0x6244ed823ca6be0f11bc890c3fafcf3c29cb23420c14243642e930b5e07e6d0a";
const TOPIC_ESCROW_REFUNDED = "0xeac97bc1917fcedc984e3d0671d4e83b359890323d5d1c2de32b28d17c356ced";

interface RpcLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
}

function decodeUint256(hex: string): number {
  return parseInt(hex, 16);
}

function decodeAddress(hex: string): string {
  return "0x" + hex.slice(26);
}

function decodeLogs(logs: RpcLog[]): Array<{
  type: "Created" | "Released" | "Refunded";
  escrowId: number;
  blockNumber: number;
  txHash: string;
  details: Record<string, string>;
}> {
  const decoded = [];

  for (const log of logs) {
    const topic0 = log.topics[0];

    if (topic0 === TOPIC_ESCROW_CREATED) {
      decoded.push({
        type: "Created" as const,
        escrowId: decodeUint256(log.topics[1]),
        blockNumber: decodeUint256(log.blockNumber),
        txHash: log.transactionHash,
        details: {
          sender: decodeAddress(log.topics[2]),
          receiver: decodeAddress(log.topics[3]),
        },
      });
    } else if (topic0 === TOPIC_ESCROW_RELEASED) {
      decoded.push({
        type: "Released" as const,
        escrowId: decodeUint256(log.topics[1]),
        blockNumber: decodeUint256(log.blockNumber),
        txHash: log.transactionHash,
        details: {
          receiver: decodeAddress(log.topics[2]),
        },
      });
    } else if (topic0 === TOPIC_ESCROW_REFUNDED) {
      decoded.push({
        type: "Refunded" as const,
        escrowId: decodeUint256(log.topics[1]),
        blockNumber: decodeUint256(log.blockNumber),
        txHash: log.transactionHash,
        details: {
          sender: decodeAddress(log.topics[2]),
        },
      });
    }
  }

  return decoded;
}

export async function GET(request: Request) {
  try {
    const walletAddress = await verifyRequestAuth(request);
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!ESCROW_ADDRESS) {
      return NextResponse.json(
        { error: "SmartEscrow contract not deployed. Set NEXT_PUBLIC_SMART_ESCROW_ADDRESS." },
        { status: 503 }
      );
    }

    // Get current block and contract balance
    const [blockNumberHex, balanceHex] = await Promise.all([
      rpcCall("eth_blockNumber") as Promise<string>,
      rpcCall("eth_getBalance", [ESCROW_ADDRESS, "latest"]) as Promise<string>,
    ]);

    const currentBlock = parseInt(blockNumberHex || "0x0", 16);
    const contractBalanceWei = balanceHex || "0x0";

    // Query recent events from the last 10000 blocks (roughly ~3.4 days on Base)
    const fromBlock = Math.max(0, currentBlock - 10000);
    const fromBlockHex = "0x" + fromBlock.toString(16);

    let events: Array<{
      type: "Created" | "Released" | "Refunded";
      escrowId: number;
      blockNumber: number;
      txHash: string;
      details: Record<string, string>;
    }> = [];

    try {
      const logs = (await rpcCall("eth_getLogs", [{
        address: ESCROW_ADDRESS,
        fromBlock: fromBlockHex,
        toBlock: "latest",
        topics: [
          // OR filter for all 3 event types
          [
            TOPIC_ESCROW_CREATED,
            TOPIC_ESCROW_RELEASED,
            TOPIC_ESCROW_REFUNDED,
          ],
        ],
      }])) as RpcLog[] | null;

      if (logs && Array.isArray(logs)) {
        events = decodeLogs(logs);
        // Sort newest first
        events.sort((a, b) => b.blockNumber - a.blockNumber);
      }
    } catch {
      // Event query failed — return basic info without events
    }

    return NextResponse.json({
      success: true,
      contractAddress: ESCROW_ADDRESS,
      currentBlock,
      contractBalanceWei,
      network: "Base Sepolia",
      chainId: 84532,
      events,
      eventsFromBlock: fromBlock,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Events API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

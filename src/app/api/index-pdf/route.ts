
import { NextResponse } from "next/server";
import { retrieveRelevantChunks } from "@/lib/rag/retrieval";

export const runtime = "nodejs";

export async function GET() {
    try {
        const results = await retrieveRelevantChunks(
            "How do I connect MetaMask to SmartEscrow?",
            4
        );

        return NextResponse.json({
            success: true,
            question: "How do I connect MetaMask to SmartEscrow?",
            retrievedChunks: results,
        });
    } catch (error) {
        console.error("Retrieval testing error:", error);

        return NextResponse.json(
            { success: false, error: "Information retrieval failed." },
            { status: 500 }
        );
    }
}

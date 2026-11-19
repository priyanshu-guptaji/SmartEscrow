
import { NextRequest, NextResponse } from "next/server";
import { RagError } from "@/lib/rag/errors";
import { generateAnswer } from "@/lib/rag/generateAnswer";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const question = body.question;

        if (
            typeof question !== "string" ||
            !question.trim()
        ) {
            return NextResponse.json(
                { success: false, error: "Please enter a valid question." },
                { status: 400 }
            );
        }

        const answer = await generateAnswer(question.trim());

        return NextResponse.json({
            success: true,
            question: question.trim(),
            answer,
        });
    } catch (error) {
        if (error instanceof RagError) {
            console.error(`Chatbot configuration error (${error.code}):`, error.message);

            return NextResponse.json(
                {
                    success: false,
                    code: error.code,
                    error: error.message,
                },
                { status: 503 }
            );
        }

        console.error("Chatbot API error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Unable to generate an answer. Please try again.",
            },
            { status: 500 }
        );
    }
}

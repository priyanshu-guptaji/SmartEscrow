import { GoogleGenerativeAI } from "@google/generative-ai";
import { RagError } from "./errors";

export async function generateEmbedding(
    text: string
): Promise<number[]> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new RagError(
            "MISSING_API_KEY",
            "The chatbot isn't configured: GEMINI_API_KEY is missing from .env.local."
        );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const embeddingModel = genAI.getGenerativeModel({
        model: "gemini-embedding-001",
    });

    const result = await embeddingModel.embedContent(text);

    return result.embedding.values;
}

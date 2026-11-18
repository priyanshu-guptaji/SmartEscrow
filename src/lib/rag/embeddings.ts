
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

export async function generateEmbedding(
    text: string
): Promise<number[]> {
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing from .env.local");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const embeddingModel = genAI.getGenerativeModel({
        model: "gemini-embedding-001",
    });

    const result = await embeddingModel.embedContent(text);

    return result.embedding.values;
}

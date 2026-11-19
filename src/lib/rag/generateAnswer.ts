
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RagError } from "./errors";
import { retrieveRelevantChunks } from "./retrieval";

export async function generateAnswer(
    question: string
): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new RagError(
            "MISSING_API_KEY",
            "The chatbot isn't configured: GEMINI_API_KEY is missing from .env.local."
        );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
    });

    const relevantChunks = await retrieveRelevantChunks(question, 4);

    const context = relevantChunks
        .map((chunk) => chunk.text)
        .join("\n\n");

    const prompt = `
You are the SmartEscrow support assistant.

Answer the user's question using ONLY the information
provided in the knowledge base context below.

Rules:
1. Give clear and beginner-friendly answers.
2. Do not invent information.
3. If the answer is not available in the context,
   say: "I couldn't find this information in the SmartEscrow knowledge base."
4. Never claim to know live wallet balances, transaction status,
   or actual escrow state.
5. Never ask users for private keys, passwords, or recovery phrases.

Knowledge Base Context:
${context}

User Question:
${question}

Answer:
`;

    const result = await model.generateContent(prompt);

    return result.response.text();
}

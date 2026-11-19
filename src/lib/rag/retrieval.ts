
import { generateEmbedding } from "./embeddings";
import { RagError } from "./errors";
import { loadVectorStore } from "./vectorStore";

function cosineSimilarity(
    a: number[],
    b: number[]
): number {
    if (a.length !== b.length || a.length === 0) {
        return 0;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        magnitudeA += a[i] * a[i];
        magnitudeB += b[i] * b[i];
    }

    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }

    return dotProduct /
        (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

export async function retrieveRelevantChunks(
    question: string,
    topK: number = 4
) {
    const records = await loadVectorStore();

    if (records.length === 0) {
        throw new RagError(
            "EMPTY_KNOWLEDGE_BASE",
            "The chatbot knowledge base is empty. Index the SmartEscrow knowledge PDF before asking questions."
        );
    }

    const questionEmbedding = await generateEmbedding(question);

    const results = records.map((record) => ({
        text: record.text,
        score: cosineSimilarity(
            questionEmbedding,
            record.embedding
        ),
    }));

    return results
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}

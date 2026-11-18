
import { loadPDF } from "./pdfLoader";
import { chunkText } from "./chunker";
import { generateEmbedding } from "./embeddings";
import { saveVectorStore, type VectorRecord } from "./vectorStore";

export async function indexPDF(): Promise<number> {
    console.log("Reading SmartEscrow PDF...");

    const text = await loadPDF();

    console.log("Splitting PDF into chunks...");

    const chunks = chunkText(text, 1000, 150);

    const records: VectorRecord[] = [];

    console.log(`Generating embeddings for ${chunks.length} chunks...`);

    for (let i = 0; i < chunks.length; i++) {
        console.log(`Processing chunk ${i + 1}/${chunks.length}`);

        const embedding = await generateEmbedding(chunks[i]);

        records.push({
            id: i,
            text: chunks[i],
            embedding,
        });
    }

    console.log("Saving vector store...");

    await saveVectorStore(records);

    console.log("Indexing completed successfully!");

    return records.length;
}

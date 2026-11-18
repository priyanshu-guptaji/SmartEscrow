
export function chunkText(
    text: string,
    chunkSize: number = 1000,
    overlap: number = 150
): string[] {
    if (overlap >= chunkSize || overlap < 0) {
        throw new Error("Overlap must be smaller than chunk size.");
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);

        const chunk = text.slice(start, end).trim();

        if (chunk.length > 0) {
            chunks.push(chunk);
        }

        if (end === text.length) {
            break;
        }

        start = end - overlap;
    }

    return chunks;
}

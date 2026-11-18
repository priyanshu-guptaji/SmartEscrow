import "pdf-parse/worker";
import fs from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";

export async function loadPDF(): Promise<string> {
    const pdfPath = path.join(
        process.cwd(),
        "knowledge",
        "smartescrow_knowledge.pdf"
    );

    const fileBuffer = await fs.readFile(pdfPath);

    const parser = new PDFParse({
        data: new Uint8Array(fileBuffer),
    });

    try {
        const result = await parser.getText();
        return result.text;
    } finally {
        await parser.destroy();
    }
}

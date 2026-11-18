
import fs from "node:fs/promises";
import path from "node:path";

export interface VectorRecord {
    id: number;
    text: string;
    embedding: number[];
}

const STORE_PATH = path.join(
    process.cwd(),
    "data",
    "smartescrow-vectors.json"
);

export async function saveVectorStore(
    records: VectorRecord[]
): Promise<void> {
    await fs.mkdir(path.dirname(STORE_PATH), {
        recursive: true,
    });

    await fs.writeFile(
        STORE_PATH,
        JSON.stringify(records),
        "utf-8"
    );
}

export async function loadVectorStore(): Promise<VectorRecord[]> {
    try {
        const data = await fs.readFile(STORE_PATH, "utf-8");
        return JSON.parse(data) as VectorRecord[];
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return [];
        }

        throw error;
    }
}

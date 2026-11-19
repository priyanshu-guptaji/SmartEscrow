export type RagErrorCode =
    | "MISSING_API_KEY"
    | "EMPTY_KNOWLEDGE_BASE";

/**
 * A configuration problem that prevents the chatbot from answering.
 * The API maps these to a 503 with the message shown to the user.
 */
export class RagError extends Error {
    readonly code: RagErrorCode;

    constructor(code: RagErrorCode, message: string) {
        super(message);
        this.name = "RagError";
        this.code = code;
    }
}

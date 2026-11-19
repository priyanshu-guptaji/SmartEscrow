import assert from "node:assert/strict";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, it, mock } from "node:test";
import dotenv from "dotenv";

// Load the same local configuration the dev server uses, without failing
// when a checkout has no .env.local (the live test is skipped in that case).
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const VECTOR_STORE_PATH = path.join(
  process.cwd(),
  "data",
  "smartescrow-vectors.json"
);

function mockRequest(body?: unknown): Request {
  return new Request("http://localhost:3000/api/chatbot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function callRoute(body?: unknown) {
  const { POST } = await import("../src/app/api/chatbot/route");
  const res = await POST(mockRequest(body) as never);
  return { status: res.status, json: await res.json() };
}

afterEach(() => {
  mock.restoreAll();
});

// ===================================================================
// API INTEGRATION: POST /api/chatbot — request validation
// ===================================================================
describe("API Integration: POST /api/chatbot validation", function () {
  it("Rejects a request without a question", async function () {
    const { status, json } = await callRoute({});
    assert.equal(status, 400);
    assert.equal(json.success, false);
    assert.match(json.error, /valid question/i);
  });

  it("Rejects a whitespace-only question", async function () {
    const { status, json } = await callRoute({ question: "   \n\t " });
    assert.equal(status, 400);
    assert.equal(json.success, false);
  });

  it("Rejects a non-string question", async function () {
    const { status, json } = await callRoute({ question: 42 });
    assert.equal(status, 400);
    assert.equal(json.success, false);
  });
});

// ===================================================================
// API INTEGRATION: POST /api/chatbot — configuration errors
// ===================================================================
describe("API Integration: POST /api/chatbot configuration errors", function () {
  it("Returns a clear error when GEMINI_API_KEY is missing", async function () {
    const previousKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const { status, json } = await callRoute({
        question: "What is SmartEscrow?",
      });

      assert.equal(status, 503);
      assert.equal(json.success, false);
      assert.equal(json.code, "MISSING_API_KEY");
      assert.match(json.error, /GEMINI_API_KEY/);
      assert.match(json.error, /\.env\.local/);
    } finally {
      if (previousKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = previousKey;
      }
    }
  });

  it("Returns a clear error when the knowledge base is empty", async function () {
    const previousKey = process.env.GEMINI_API_KEY;
    // A dummy key is enough: the empty store is detected before any
    // embedding request is made.
    process.env.GEMINI_API_KEY = "test-key";

    mock.method(fsPromises, "readFile", async () => {
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    });

    try {
      const { status, json } = await callRoute({
        question: "What is SmartEscrow?",
      });

      assert.equal(status, 503);
      assert.equal(json.success, false);
      assert.equal(json.code, "EMPTY_KNOWLEDGE_BASE");
      assert.match(json.error, /knowledge base is empty/i);
    } finally {
      if (previousKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = previousKey;
      }
    }
  });
});

// ===================================================================
// API INTEGRATION: POST /api/chatbot — live answer (needs Gemini)
// ===================================================================
const canRunLive =
  Boolean(process.env.GEMINI_API_KEY) &&
  fs.existsSync(VECTOR_STORE_PATH);

describe("API Integration: POST /api/chatbot live answer", function () {
  it(
    "Answers a question from the indexed knowledge base",
    { skip: canRunLive ? false : "GEMINI_API_KEY or the vector store is missing" },
    async function () {
      const { status, json } = await callRoute({
        question: "What is SmartEscrow?",
      });

      assert.equal(status, 200);
      assert.equal(json.success, true);
      assert.equal(json.question, "What is SmartEscrow?");
      assert.equal(typeof json.answer, "string");
      assert.ok(json.answer.trim().length > 20);
      assert.doesNotMatch(
        json.answer,
        /couldn't find this information/i
      );
    }
  );

  it(
    "Echoes the trimmed question",
    { skip: canRunLive ? false : "GEMINI_API_KEY or the vector store is missing" },
    async function () {
      const { status, json } = await callRoute({
        question: "  What is an escrow?  ",
      });

      assert.equal(status, 200);
      assert.equal(json.question, "What is an escrow?");
    }
  );
});

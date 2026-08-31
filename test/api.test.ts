import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { generatePrivateKey, privateKeyToAccount, signMessage } from "viem/accounts";
import { generateNonce, getSignMessage } from "../src/lib/auth";
import { savePayment } from "../src/lib/db";
import { Payment } from "../src/types/payment";

const walletKey = generatePrivateKey();
const walletAccount = privateKeyToAccount(walletKey);

async function authenticateWallet(
  address: string,
  privateKey: `0x${string}`
): Promise<Record<string, string>> {
  const nonce = generateNonce(address);
  const message = getSignMessage(address, nonce);
  const signature = await signMessage({ message, privateKey });
  return {
    "X-Wallet-Address": address,
    "X-Wallet-Signature": signature,
    "X-Wallet-Nonce": nonce,
  };
}

function mockRequest(url: string, options: {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
} = {}): Request {
  const { method = "GET", headers = {}, body } = options;
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request(url, init);
}

function samplePayment(sender: string, overrides: Partial<Payment> = {}): Payment {
  return {
    id: `pay_api_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    senderAddress: sender,
    receiverName: "API Test Receiver",
    receiverAddress: "0x71C2728892154F65B20a8642657132C0424165B2",
    amount: 2.0,
    token: "ETH",
    type: "conditional",
    status: "active",
    condition: "Release after testing",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ===================================================================
// API INTEGRATION: POST /api/auth/nonce
// ===================================================================
describe("API Integration: POST /api/auth/nonce", function () {
  it("Returns nonce and message for valid address", async function () {
    const { POST } = await import("../src/app/api/auth/nonce/route");
    const req = mockRequest("http://localhost:3000/api/auth/nonce", {
      method: "POST",
      body: { address: walletAccount.address },
    });
    const res = await POST(req);
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.ok(json.nonce);
    assert.ok(json.message);
    assert.ok(json.nonce.startsWith("0x"));
  });

  it("Rejects invalid address format", async function () {
    const { POST } = await import("../src/app/api/auth/nonce/route");
    const req = mockRequest("http://localhost:3000/api/auth/nonce", {
      method: "POST",
      body: { address: "not-an-address" },
    });
    const res = await POST(req);
    assert.equal(res.status, 400);
  });

  it("Rejects missing address", async function () {
    const { POST } = await import("../src/app/api/auth/nonce/route");
    const req = mockRequest("http://localhost:3000/api/auth/nonce", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    assert.equal(res.status, 400);
  });
});

// ===================================================================
// API INTEGRATION: POST /api/auth/verify
// ===================================================================
describe("API Integration: POST /api/auth/verify", function () {
  it("Verifies a valid signature", async function () {
    const { POST } = await import("../src/app/api/auth/verify/route");
    const nonce = generateNonce(walletAccount.address);
    const message = getSignMessage(walletAccount.address, nonce);
    const signature = await signMessage({ message, privateKey: walletKey });

    const req = mockRequest("http://localhost:3000/api/auth/verify", {
      method: "POST",
      body: { address: walletAccount.address, signature, nonce },
    });
    const res = await POST(req);
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.verified, true);
    assert.equal(json.address, walletAccount.address.toLowerCase());
  });

  it("Rejects invalid signature", async function () {
    const { POST } = await import("../src/app/api/auth/verify/route");
    const nonce = generateNonce(walletAccount.address);
    const req = mockRequest("http://localhost:3000/api/auth/verify", {
      method: "POST",
      body: {
        address: walletAccount.address,
        signature: "0x" + "00".repeat(65),
        nonce,
      },
    });
    const res = await POST(req);
    assert.equal(res.status, 401);
  });
});

// ===================================================================
// API INTEGRATION: POST /api/parse-payment (rule-based fallback)
// ===================================================================
describe("API Integration: POST /api/parse-payment", function () {
  it("Parses a basic ETH payment instruction", async function () {
    const { POST } = await import("../src/app/api/parse-payment/route");
    const req = mockRequest("http://localhost:3000/api/parse-payment", {
      method: "POST",
      body: { prompt: "Pay Alice 1.5 ETH after she delivers the website" },
    });
    const res = await POST(req);
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.ok(json.data);
    assert.equal(json.data.amount, 1.5);
    assert.equal(json.data.token, "ETH");
    assert.ok(json.data.receiverName);
    assert.ok(json.data.condition);
  });

  it("Parses USDC payment", async function () {
    const { POST } = await import("../src/app/api/parse-payment/route");
    const req = mockRequest("http://localhost:3000/api/parse-payment", {
      method: "POST",
      body: { prompt: "Send 500 USDC to Bob for the audit" },
    });
    const res = await POST(req);
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.data.amount, 500);
    assert.equal(json.data.token, "USDC");
  });

  it("Parses scheduled payment", async function () {
    const { POST } = await import("../src/app/api/parse-payment/route");
    const req = mockRequest("http://localhost:3000/api/parse-payment", {
      method: "POST",
      body: { prompt: "Schedule 0.01 ETH to Rahul on September 15" },
    });
    const res = await POST(req);
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.data.type, "scheduled");
    assert.equal(json.data.amount, 0.01);
  });

  it("Parses recurring payment", async function () {
    const { POST } = await import("../src/app/api/parse-payment/route");
    const req = mockRequest("http://localhost:3000/api/parse-payment", {
      method: "POST",
      body: { prompt: "Pay Rahul 0.005 ETH every 7 days" },
    });
    const res = await POST(req);
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.data.type, "recurring");
    assert.equal(json.data.amount, 0.005);
  });

  it("Parses ENS address", async function () {
    const { POST } = await import("../src/app/api/parse-payment/route");
    const req = mockRequest("http://localhost:3000/api/parse-payment", {
      method: "POST",
      body: { prompt: "Pay rahul.eth 1 ETH for the NFT" },
    });
    const res = await POST(req);
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.data.receiverAddress, "rahul.eth");
  });

  it("Parses 0x address", async function () {
    const { POST } = await import("../src/app/api/parse-payment/route");
    const req = mockRequest("http://localhost:3000/api/parse-payment", {
      method: "POST",
      body: { prompt: "Send 2 ETH to 0x71C2728892154F65B20a8642657132C0424165B2 for audit" },
    });
    const res = await POST(req);
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.data.receiverAddress, "0x71C2728892154F65B20a8642657132C0424165B2");
  });

  it("Rejects empty prompt", async function () {
    const { POST } = await import("../src/app/api/parse-payment/route");
    const req = mockRequest("http://localhost:3000/api/parse-payment", {
      method: "POST",
      body: { prompt: "" },
    });
    const res = await POST(req);
    assert.equal(res.status, 400);
  });

  it("Rejects missing prompt", async function () {
    const { POST } = await import("../src/app/api/parse-payment/route");
    const req = mockRequest("http://localhost:3000/api/parse-payment", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    assert.equal(res.status, 400);
  });
});

// ===================================================================
// API INTEGRATION: GET /api/events (contract not deployed)
// ===================================================================
describe("API Integration: GET /api/events", function () {
  it("Returns 503 when contract not deployed", async function () {
    const headers = await authenticateWallet(walletAccount.address, walletKey);
    const { GET } = await import("../src/app/api/events/route");
    const req = mockRequest("http://localhost:3000/api/events", { headers });
    const res = await GET(req);
    const json = await res.json();
    // Should be 503 if NEXT_PUBLIC_SMART_ESCROW_ADDRESS is empty, or 200 if set
    assert.ok(res.status === 503 || res.status === 200);
    if (res.status === 503) {
      assert.ok(json.error.includes("not deployed"));
    }
  });

  it("Returns 401 without auth", async function () {
    const { GET } = await import("../src/app/api/events/route");
    const req = mockRequest("http://localhost:3000/api/events");
    const res = await GET(req);
    assert.equal(res.status, 401);
  });
});

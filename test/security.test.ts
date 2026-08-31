import assert from "node:assert/strict";
import { describe, it, before, beforeEach, afterEach } from "node:test";
import { generatePrivateKey, privateKeyToAccount, signMessage } from "viem/accounts";
import { generateNonce, getSignMessage, verifyWalletSignature, verifyRequestAuth } from "../src/lib/auth";
import { savePayment, getPaymentsBySender, getPaymentById } from "../src/lib/db";
import { Payment } from "../src/types/payment";

// --- Test wallets ---
const walletAKey = generatePrivateKey();
const walletAAccount = privateKeyToAccount(walletAKey);

const walletBKey = generatePrivateKey();
const walletBAccount = privateKeyToAccount(walletBKey);

// Helper: request a nonce then sign it, returning headers
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

// Helper: build a mock Request with auth headers
function mockRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
): Request {
  const { method = "GET", headers = {}, body } = options;
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

// --- Sample payment data ---
function samplePayment(senderAddress: string, overrides: Partial<Payment> = {}): Payment {
  return {
    id: `pay_sec_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    senderAddress,
    receiverName: "Test Receiver",
    receiverAddress: "0x71C2728892154F65B20a8642657132C0424165B2",
    amount: 1.5,
    token: "ETH",
    type: "conditional",
    status: "active",
    condition: "Release after delivery",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ===================================================================
// TEST 1: Customer A authenticates, requests payments → only A's returned
// ===================================================================
describe("Security: Wallet-scoped payment access (TEST 1 & 2)", function () {
  const addressA = walletAAccount.address;
  const addressB = walletBAccount.address;
  let paymentA1Id: string;
  let paymentA2Id: string;

  beforeEach(async function () {
    const p1 = samplePayment(addressA, { id: `pay_a1_${Date.now()}` });
    const p2 = samplePayment(addressA, { id: `pay_a2_${Date.now()}` });
    await savePayment(p1);
    await savePayment(p2);
    paymentA1Id = p1.id;
    paymentA2Id = p2.id;
  });

  it("TEST 1: Customer A authenticates → only wallet A payments returned", async function () {
    const headers = await authenticateWallet(addressA, walletAKey);
    const req = mockRequest("http://localhost:3000/api/payments", { headers });

    // Import the GET handler
    const { GET } = await import("../src/app/api/payments/route");
    const response = await GET(req);
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(json.data));
    for (const p of json.data) {
      assert.equal(p.senderAddress.toLowerCase(), addressA.toLowerCase());
    }
  });

  it("TEST 2: Customer B authenticates → wallet A payments NOT returned", async function () {
    const headers = await authenticateWallet(addressB, walletBKey);
    const req = mockRequest("http://localhost:3000/api/payments", { headers });

    const { GET } = await import("../src/app/api/payments/route");
    const response = await GET(req);
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(json.data));
    for (const p of json.data) {
      assert.notEqual(p.senderAddress.toLowerCase(), addressA.toLowerCase());
    }
  });
});

// ===================================================================
// TEST 3: Customer A attempts to PATCH Customer B's payment → rejected
// ===================================================================
describe("Security: Cross-user PATCH prevention (TEST 3)", function () {
  const addressA = walletAAccount.address;
  const addressB = walletBAccount.address;

  it("TEST 3: Customer A attempts to PATCH Customer B's payment → rejected", async function () {
    // Create a payment owned by wallet B
    const paymentB = samplePayment(addressB, { id: `pay_b_patch_${Date.now()}` });
    await savePayment(paymentB);

    // Customer A tries to modify it
    const headers = await authenticateWallet(addressA, walletAKey);
    const req = mockRequest("http://localhost:3000/api/payments", {
      method: "PATCH",
      headers,
      body: {
        id: paymentB.id,
        status: "completed",
      },
    });

    const { PATCH } = await import("../src/app/api/payments/route");
    const response = await PATCH(req);
    const json = await response.json();

    assert.equal(response.status, 403);
    assert.ok(json.error.includes("Unauthorized"));
  });
});

// ===================================================================
// TEST 4: Customer A spoofs senderWallet in POST → rejected
// ===================================================================
describe("Security: Sender wallet spoofing prevention (TEST 4)", function () {
  const addressA = walletAAccount.address;
  const addressB = walletBAccount.address;

  it("TEST 4: Customer A creates payment with wallet B as senderWallet → rejected (spoofed)", async function () {
    const headers = await authenticateWallet(addressA, walletAKey);
    const req = mockRequest("http://localhost:3000/api/payments", {
      method: "POST",
      headers,
      body: {
        receiverName: "Attacker Target",
        receiverAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38",
        amount: 100,
        token: "ETH",
        type: "conditional",
        condition: "Release on delivery",
        // Attempt to spoof senderAddress as wallet B
        senderAddress: addressB,
      },
    });

    const { POST } = await import("../src/app/api/payments/route");
    const response = await POST(req);
    const json = await response.json();

    // Should succeed (200) but senderAddress must be wallet A, NOT wallet B
    if (response.status === 200) {
      assert.equal(
        json.data.senderAddress.toLowerCase(),
        addressA.toLowerCase(),
        "senderAddress must be the authenticated wallet, not the spoofed value"
      );
      assert.notEqual(
        json.data.senderAddress.toLowerCase(),
        addressB.toLowerCase(),
        "senderAddress must NOT be the spoofed wallet B"
      );
    } else {
      // If rejected, that's also acceptable
      assert.ok(response.status >= 400);
    }
  });
});

// ===================================================================
// TEST 5: Invalid wallet signature → auth rejected
// ===================================================================
describe("Security: Invalid signature rejection (TEST 5)", function () {
  it("TEST 5: Invalid wallet signature → authentication rejected", async function () {
    const addressA = walletAAccount.address;
    const nonce = generateNonce(addressA);

    // Create a completely bogus signature
    const fakeSignature = "0x" + "00".repeat(65);

    const req = mockRequest("http://localhost:3000/api/payments", {
      headers: {
        "X-Wallet-Address": addressA,
        "X-Wallet-Signature": fakeSignature,
        "X-Wallet-Nonce": nonce,
      },
    });

    const { GET } = await import("../src/app/api/payments/route");
    const response = await GET(req);

    assert.equal(response.status, 401);
  });

  it("TEST 5b: Signature signed by wrong key → rejected", async function () {
    const addressA = walletAAccount.address;
    // Sign with wallet B's key but claim to be wallet A
    const nonce = generateNonce(addressA);
    const message = getSignMessage(addressA, nonce);
    const wrongSignature = await signMessage({ message, privateKey: walletBKey });

    const result = await verifyWalletSignature(addressA, wrongSignature, nonce);
    assert.equal(result, false);
  });
});

// ===================================================================
// TEST 6: Reused nonce → auth rejected
// ===================================================================
describe("Security: Nonce reuse prevention (TEST 6)", function () {
  it("TEST 6: Reused nonce → authentication rejected", async function () {
    const addressA = walletAAccount.address;
    const nonce = generateNonce(addressA);
    const message = getSignMessage(addressA, nonce);
    const signature = await signMessage({ message, privateKey: walletAKey });

    // First use: should succeed
    const result1 = await verifyWalletSignature(addressA, signature, nonce);
    assert.equal(result1, true, "First use should succeed");

    // Second use: nonce should be deleted, should fail
    const result2 = await verifyWalletSignature(addressA, signature, nonce);
    assert.equal(result2, false, "Reused nonce should be rejected");
  });
});

// ===================================================================
// TEST 7: Invalid AI-generated Ethereum address → rejected
// ===================================================================
describe("Security: Invalid receiver address validation (TEST 7)", function () {
  const addressA = walletAAccount.address;

  it("TEST 7a: Invalid receiver address format → payment rejected", async function () {
    const headers = await authenticateWallet(addressA, walletAKey);
    const req = mockRequest("http://localhost:3000/api/payments", {
      method: "POST",
      headers,
      body: {
        receiverName: "Test",
        receiverAddress: "not-a-valid-address",
        amount: 1,
        token: "ETH",
        type: "conditional",
        condition: "Release",
      },
    });

    const { POST } = await import("../src/app/api/payments/route");
    const response = await POST(req);

    assert.equal(response.status, 400);
    const json = await response.json();
    assert.ok(json.error.includes("Invalid receiver wallet address"));
  });

  it("TEST 7b: Too-short address → payment rejected", async function () {
    const headers = await authenticateWallet(addressA, walletAKey);
    const req = mockRequest("http://localhost:3000/api/payments", {
      method: "POST",
      headers,
      body: {
        receiverName: "Test",
        receiverAddress: "0x1234",
        amount: 1,
        token: "ETH",
        type: "conditional",
        condition: "Release",
      },
    });

    const { POST } = await import("../src/app/api/payments/route");
    const response = await POST(req);

    assert.equal(response.status, 400);
  });

  it("TEST 7c: Valid address → accepted", async function () {
    const headers = await authenticateWallet(addressA, walletAKey);
    const req = mockRequest("http://localhost:3000/api/payments", {
      method: "POST",
      headers,
      body: {
        receiverName: "Test",
        receiverAddress: "0x71C2728892154F65B20a8642657132C0424165B2",
        amount: 1,
        token: "ETH",
        type: "conditional",
        condition: "Release",
      },
    });

    const { POST } = await import("../src/app/api/payments/route");
    const response = await POST(req);

    assert.equal(response.status, 200);
  });
});

// ===================================================================
// TEST 8: Invalid/unsupported token → payment creation rejected
// ===================================================================
describe("Security: Token validation (TEST 8)", function () {
  const addressA = walletAAccount.address;

  it("TEST 8a: Invalid token → payment rejected", async function () {
    const headers = await authenticateWallet(addressA, walletAKey);
    const req = mockRequest("http://localhost:3000/api/payments", {
      method: "POST",
      headers,
      body: {
        receiverName: "Test",
        receiverAddress: "0x71C2728892154F65B20a8642657132C0424165B2",
        amount: 1,
        token: "DOGE",
        type: "conditional",
        condition: "Release",
      },
    });

    const { POST } = await import("../src/app/api/payments/route");
    const response = await POST(req);

    assert.equal(response.status, 400);
    const json = await response.json();
    assert.ok(json.error.includes("Invalid token"));
  });

  it("TEST 8b: Negative amount → payment rejected", async function () {
    const headers = await authenticateWallet(addressA, walletAKey);
    const req = mockRequest("http://localhost:3000/api/payments", {
      method: "POST",
      headers,
      body: {
        receiverName: "Test",
        receiverAddress: "0x71C2728892154F65B20a8642657132C0424165B2",
        amount: -5,
        token: "ETH",
        type: "conditional",
        condition: "Release",
      },
    });

    const { POST } = await import("../src/app/api/payments/route");
    const response = await POST(req);

    assert.equal(response.status, 400);
    const json = await response.json();
    assert.ok(json.error.includes("Amount must be a positive number"));
  });

  it("TEST 8c: Zero amount → payment rejected", async function () {
    const headers = await authenticateWallet(addressA, walletAKey);
    const req = mockRequest("http://localhost:3000/api/payments", {
      method: "POST",
      headers,
      body: {
        receiverName: "Test",
        receiverAddress: "0x71C2728892154F65B20a8642657132C0424165B2",
        amount: 0,
        token: "ETH",
        type: "conditional",
        condition: "Release",
      },
    });

    const { POST } = await import("../src/app/api/payments/route");
    const response = await POST(req);

    assert.equal(response.status, 400);
  });

  it("TEST 8d: Missing required fields → payment rejected", async function () {
    const headers = await authenticateWallet(addressA, walletAKey);
    const req = mockRequest("http://localhost:3000/api/payments", {
      method: "POST",
      headers,
      body: {
        receiverName: "",
        receiverAddress: "",
        amount: 0,
      },
    });

    const { POST } = await import("../src/app/api/payments/route");
    const response = await POST(req);

    assert.equal(response.status, 400);
  });

  it("TEST 8e: Valid ETH, USDC, USDT tokens → accepted", async function () {
    for (const token of ["ETH", "USDC", "USDT"]) {
      const headers = await authenticateWallet(addressA, walletAKey);
      const req = mockRequest("http://localhost:3000/api/payments", {
        method: "POST",
        headers,
        body: {
          receiverName: "Test",
          receiverAddress: "0x71C2728892154F65B20a8642657132C0424165B2",
          amount: 1,
          token,
          type: "conditional",
          condition: "Release",
        },
      });

      const { POST } = await import("../src/app/api/payments/route");
      const response = await POST(req);
      assert.equal(response.status, 200, `Token ${token} should be accepted`);
    }
  });
});

// ===================================================================
// Additional security tests
// ===================================================================
describe("Security: Additional protections", function () {
  it("Authentication required: no auth headers → 401", async function () {
    const req = mockRequest("http://localhost:3000/api/payments");
    const { GET } = await import("../src/app/api/payments/route");
    const response = await GET(req);
    assert.equal(response.status, 401);
  });

  it("PATCH requires auth: no headers → 401", async function () {
    const req = mockRequest("http://localhost:3000/api/payments", {
      method: "PATCH",
      body: { id: "fake", status: "completed" },
    });
    const { PATCH } = await import("../src/app/api/payments/route");
    const response = await PATCH(req);
    assert.equal(response.status, 401);
  });

  it("POST requires auth: no headers → 401", async function () {
    const req = mockRequest("http://localhost:3000/api/payments", {
      method: "POST",
      body: { receiverName: "Test", amount: 1 },
    });
    const { POST } = await import("../src/app/api/payments/route");
    const response = await POST(req);
    assert.equal(response.status, 401);
  });

  it("Invalid address format in auth → rejected", async function () {
    const req = mockRequest("http://localhost:3000/api/payments", {
      headers: {
        "X-Wallet-Address": "not-an-address",
        "X-Wallet-Signature": "0x00",
        "X-Wallet-Nonce": "0x00",
      },
    });
    const { GET } = await import("../src/app/api/payments/route");
    const response = await GET(req);
    assert.equal(response.status, 401);
  });

  it("Missing individual auth headers → rejected", async function () {
    // Missing signature
    const req1 = mockRequest("http://localhost:3000/api/payments", {
      headers: {
        "X-Wallet-Address": walletAAccount.address,
        "X-Wallet-Nonce": "0x00",
      },
    });
    const { GET } = await import("../src/app/api/payments/route");
    const response1 = await GET(req1);
    assert.equal(response1.status, 401);

    // Missing nonce
    const req2 = mockRequest("http://localhost:3000/api/payments", {
      headers: {
        "X-Wallet-Address": walletAAccount.address,
        "X-Wallet-Signature": "0x00",
      },
    });
    const response2 = await GET(req2);
    assert.equal(response2.status, 401);
  });
});

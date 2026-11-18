import assert from "node:assert/strict";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { createPublicClient, createWalletClient, http, parseEther, zeroAddress } from "viem";
import { hardhat } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { extractEscrowIdFromLogs } from "../src/lib/escrowEvents";

const PORT = 8546;
const RPC_URL = `http://127.0.0.1:${PORT}`;

// Hardhat's first default dev account (public, well-known test key).
const DEV_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

function loadArtifact(): { abi: readonly unknown[]; bytecode: `0x${string}` } {
  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "contracts",
    "SmartEscrow.sol",
    "SmartEscrow.json"
  );
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  return { abi: artifact.abi, bytecode: artifact.bytecode as `0x${string}` };
}

async function waitForNode(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      });
      const json = (await res.json()) as { result?: string };
      if (json.result) return;
    } catch {
      // Node not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Hardhat node did not become ready on ${RPC_URL}`);
}

function stopNode(child: ChildProcess | null): void {
  if (!child || child.pid === undefined) return;

  if (process.platform === "win32") {
    try {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
    } catch {
      // Already exited
    }
  } else {
    child.kill("SIGTERM");
  }
}

describe("E2E: escrow creation on a local Hardhat node", function () {
  let node: ChildProcess | null = null;
  let publicClient: ReturnType<typeof createPublicClient>;
  let walletClient: ReturnType<typeof createWalletClient>;
  let account: ReturnType<typeof privateKeyToAccount>;
  let escrowAddress: `0x${string}`;
  let abi: readonly unknown[];

  before(async function () {
    node = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["hardhat", "node", "--port", String(PORT)],
      {
        cwd: process.cwd(),
        stdio: "ignore",
        shell: process.platform === "win32",
      }
    );

    await waitForNode();

    account = privateKeyToAccount(DEV_PRIVATE_KEY);

    publicClient = createPublicClient({
      chain: hardhat,
      transport: http(RPC_URL),
    });

    walletClient = createWalletClient({
      chain: hardhat,
      transport: http(RPC_URL),
      account,
    });

    const artifact = loadArtifact();
    abi = artifact.abi;

    // Deploy the real compiled contract to the local node.
    const deployHash = await walletClient.deployContract({
      abi,
      bytecode: artifact.bytecode,
      args: [account.address],
    });
    const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });

    assert.ok(deployReceipt.contractAddress, "Contract deployment failed");
    escrowAddress = deployReceipt.contractAddress;
  });

  after(function () {
    stopNode(node);
    node = null;
  });

  it("captures escrow id 0 from the EscrowCreated event", async function () {
    const receiver = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const amount = parseEther("1");

    const hash = await walletClient.writeContract({
      address: escrowAddress,
      abi,
      functionName: "createEscrow",
      args: [receiver, zeroAddress, amount, "E2E release condition", 3600n],
      value: amount,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const escrowId = extractEscrowIdFromLogs(receipt.logs);
    assert.equal(escrowId, 0, "EscrowCreated event must yield escrow id 0");

    // The captured id must point at the escrow that was just created.
    const escrow = (await publicClient.readContract({
      address: escrowAddress,
      abi,
      functionName: "getEscrow",
      args: [BigInt(escrowId as number)],
    })) as {
      sender: `0x${string}`;
      receiver: `0x${string}`;
      amount: bigint;
      condition: string;
      status: number;
    };

    assert.equal(escrow.sender.toLowerCase(), account.address.toLowerCase());
    assert.equal(escrow.receiver.toLowerCase(), receiver.toLowerCase());
    assert.equal(escrow.amount, amount);
    assert.equal(escrow.condition, "E2E release condition");
    assert.equal(Number(escrow.status), 0); // Active
  });

  it("captures incrementing ids for consecutive escrows", async function () {
    const receiver = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
    const amount = parseEther("0.25");

    const hash = await walletClient.writeContract({
      address: escrowAddress,
      abi,
      functionName: "createEscrow",
      args: [receiver, zeroAddress, amount, "Second escrow", 3600n],
      value: amount,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const escrowId = extractEscrowIdFromLogs(receipt.logs);
    assert.equal(escrowId, 1, "Second escrow must be id 1");

    const escrow = (await publicClient.readContract({
      address: escrowAddress,
      abi,
      functionName: "getEscrow",
      args: [BigInt(escrowId as number)],
    })) as { receiver: `0x${string}`; amount: bigint };

    assert.equal(escrow.receiver.toLowerCase(), receiver.toLowerCase());
    assert.equal(escrow.amount, amount);
  });

  it("returns null when the receipt has no EscrowCreated event", function () {
    assert.equal(extractEscrowIdFromLogs([]), null);
  });
});

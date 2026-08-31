import { config } from "dotenv";
config({ path: ".env.local" });

import { network } from "hardhat";

async function main() {
  // --- Preflight: validate environment ---
  if (!process.env.DEPLOYER_PRIVATE_KEY) {
    console.error("BLOCKED: DEPLOYER_PRIVATE_KEY is not set in .env.local.");
    console.error("Add it with 0x prefix and try again.");
    process.exitCode = 1;
    return;
  }
  if (!process.env.DEPLOYER_PRIVATE_KEY.startsWith("0x")) {
    console.error("BLOCKED: DEPLOYER_PRIVATE_KEY must start with 0x.");
    process.exitCode = 1;
    return;
  }

  const { ethers } = await network.create();
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    console.error("BLOCKED: No signers available. Check DEPLOYER_PRIVATE_KEY and network config.");
    process.exitCode = 1;
    return;
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceEth = ethers.formatEther(balance);

  // --- Preflight report ---
  console.log("=== SmartEscrow Deployment Preflight ===");
  console.log("Network:              Base Sepolia");
  console.log("Chain ID:             84532");
  console.log("Deployer address:     " + deployer.address);
  console.log("Deployer balance:     " + balanceEth + " ETH");

  // Estimate deployment gas
  const factory = await ethers.getContractFactory("SmartEscrow");
  const deployTx = await factory.getDeployTransaction(deployer.address);
  const estimatedGas = await ethers.provider.estimateGas(deployTx);
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  const estimatedCost = estimatedGas * gasPrice;
  const estimatedCostEth = ethers.formatEther(estimatedCost);

  console.log("Estimated gas:       " + estimatedGas.toString());
  console.log("Gas price:           " + ethers.formatUnits(gasPrice, "gwei") + " gwei");
  console.log("Estimated cost:      " + estimatedCostEth + " ETH");
  console.log("Sufficient:          " + (balance >= estimatedCost ? "YES" : "NO"));
  console.log("");

  if (balance < estimatedCost) {
    console.error("BLOCKED: Insufficient Base Sepolia ETH for deployment.");
    console.error("  Required: ~" + estimatedCostEth + " ETH");
    console.error("  Available: " + balanceEth + " ETH");
    console.error("");
    console.error("Fund the deployer wallet with Base Sepolia ETH from a faucet:");
    console.error("  https://www.alchemy.com/faucets/base-sepolia");
    console.error("  https://faucet.quicknode.com/ethereum/sepolia (then bridge to Base Sepolia)");
    process.exitCode = 1;
    return;
  }

  console.log("Preflight PASSED. Deploying...");

  // --- Deploy ---
  const smartEscrow = await ethers.deployContract("SmartEscrow", [deployer.address]);
  await smartEscrow.waitForDeployment();

  const contractAddress = await smartEscrow.getAddress();
  const deployReceipt = await (smartEscrow.deploymentTransaction())?.wait();

  console.log("");
  console.log("=== Deployment Complete ===");
  console.log("Contract address:    " + contractAddress);
  console.log("Transaction hash:    " + (deployReceipt?.hash ?? "unknown"));
  console.log("Network:             Base Sepolia");
  console.log("Chain ID:            84532");
  console.log("");
  console.log("Next steps:");
  console.log("  Add to .env.local:");
  console.log("    NEXT_PUBLIC_SMART_ESCROW_ADDRESS=" + contractAddress);
  console.log("  Then restart the dev server.");
}

main().catch((error) => {
  console.error("Deployment failed:", error.message || error);
  process.exitCode = 1;
});

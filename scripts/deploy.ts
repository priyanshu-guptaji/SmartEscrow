import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy SmartEscrow and set the deployer as the initial oracle for MVP testing
  const smartEscrow = await ethers.deployContract("SmartEscrow", [deployer.address]);
  await smartEscrow.waitForDeployment();

  console.log("SmartEscrow deployed to:", await smartEscrow.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { config } from "dotenv";
config({ path: ".env.local" });

import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatEthersChaiMatchers from "@nomicfoundation/hardhat-ethers-chai-matchers";

export default defineConfig({
  plugins: [hardhatEthers, hardhatEthersChaiMatchers],
  mocha: {
    spec: "./test/**/*.test.ts",
  },
  networks: {
    baseSepolia: {
      type: "http" as const,
      chainId: 84532,
      url: process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    localhost: {
      type: "http" as const,
      url: "http://127.0.0.1:8545",
    },
  },
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
});

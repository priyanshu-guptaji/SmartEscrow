# SmartEscrow

AI-powered Web3 conditional payment system. Translate natural language into secure, self-executing escrow smart contracts on Base Sepolia.

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS, wagmi/viem
- **Smart Contracts:** Solidity 0.8.20, Hardhat 3
- **AI Parser:** Google Gemini AI with rule-based fallback
- **Database:** MongoDB (with local JSON fallback)

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See `.env.example` for the full list. Key variables in `.env.local`:

| Variable | Description |
|----------|-------------|
| `DEPLOYER_PRIVATE_KEY` | Wallet private key for contract deployment (0x prefix, never commit) |
| `GEMINI_API_KEY` | Google Gemini AI key for natural language parsing (optional) |
| `NEXT_PUBLIC_SMART_ESCROW_ADDRESS` | Deployed contract address (set after deployment) |

## Smart Contracts

```bash
# Run tests
npx hardhat run --no-compile test/SmartEscrow.test.ts

# Deploy to Base Sepolia
npx hardhat run scripts/deploy.ts --network baseSepolia
```

The `SmartEscrow` contract supports:
- **Conditional escrows** — release when an oracle verifies a condition
- **Scheduled escrows** — release at a future timestamp
- **Recurring escrows** — periodic payouts with configurable intervals
- **NFT-conditional escrows** — release based on ERC-721 ownership

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test:contracts` | Run Hardhat Solidity tests |
| `npx hardhat run scripts/deploy.ts --network baseSepolia` | Deploy contract |

## Project Structure

```
src/
  app/            # Next.js App Router pages and API routes
  components/     # React UI components
  context/        # React context providers (Web3, Escrow state)
  hooks/          # Custom hooks (contract interactions, ENS)
  lib/            # Utilities (contracts ABI, database, mock data)
  types/          # TypeScript type definitions
contracts/        # Solidity smart contracts
scripts/          # Deployment scripts
test/             # Hardhat contract tests
```

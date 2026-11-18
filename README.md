# SmartEscrow

AI-powered Web3 conditional payment system. Translate natural language into secure, self-executing escrow smart contracts on Base Sepolia.

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Payment Lifecycle](#payment-lifecycle)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Zero-Cost Student Setup](#zero-cost-student-setup)
- [Environment Variables](#environment-variables)
- [Smart Contracts](#smart-contracts)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Background Services](#background-services)
- [API Reference](#api-reference)

---

## Overview

SmartEscrow is a decentralized escrow platform that allows users to create conditional cryptocurrency payments using natural language. Users describe payment terms in plain English (e.g., "Pay 50 USDC to Alice when the GitHub PR is merged"), and the system converts these into enforceable smart contracts on the Base Sepolia testnet.

### Key Features

- **Natural Language Parsing** — Describe payment terms in English; Gemini AI converts them to structured escrow parameters
- **4 Escrow Types** — Conditional, Scheduled, Recurring, and NFT-conditional payments
- **Multi-Token Support** — ETH, USDC, and USDT on Base Sepolia
- **Wallet Authentication** — Nonce-based signature verification (no passwords)
- **Non-Custodial** — Funds locked in audited smart contracts; no third-party custody
- **Event-Driven Automation** — Background services monitor blockchain events and execute scheduled payouts

---

## How It Works

### 1. Connect Wallet
Users connect MetaMask (or any EIP-1193 wallet) to Base Sepolia (chain ID 84532). Authentication uses a nonce-based signature scheme — no passwords or email required.

### 2. Define Payment Terms
Type natural language payment conditions into the parser:
> "Release 100 USDC to 0xAlice... when the delivery is confirmed before December 31"

The Gemini AI parser (with rule-based fallback) extracts:
- **Receiver** — name and wallet address (ENS resolution supported)
- **Amount** — numeric value and token (ETH/USDC/USDT)
- **Condition** — release criteria
- **Duration** — timeout in seconds
- **Type** — conditional, scheduled, recurring, or NFT-conditional

### 3. Review and Confirm
The parsed parameters are displayed for review. Users can edit any field before confirming.

### 4. Create Escrow on-Chain
The system creates the escrow in two steps:
1. **Database record** created with `pending` status
2. **Smart contract** called to lock funds on-chain
3. **Database updated** with transaction hash and `active` status

### 5. Automatic Settlement
- **Conditional** — Oracle verifies condition, then release is triggered
- **Scheduled** — Scheduler auto-releases at the specified timestamp
- **Recurring** — Scheduler executes periodic payouts at defined intervals
- **NFT-conditional** — Release based on ERC-721 ownership verification

---

## Payment Lifecycle

```
                    ┌─────────────┐
                    │   PENDING   │  ← DB record created, no on-chain tx yet
                    └──────┬──────┘
                           │ Blockchain call succeeds
                           ▼
                    ┌─────────────┐
                    │    ACTIVE   │  ← Funds locked in smart contract
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │COMPLETED │ │ CANCELLED│ │ REFUNDED │
       └──────────┘ └──────────┘ └──────────┘
              │            │            │
              │       Sender cancels   │ Refund verified
              │       before deadline  │
              ▼                        ▼
        Funds sent to           Funds returned
          receiver               to sender
```

### Status Definitions

| Status | Description |
|--------|-------------|
| `pending` | Payment record created in DB; awaiting blockchain confirmation |
| `active` | Funds locked in smart contract; escrow is live |
| `completed` | Funds released to receiver; escrow fulfilled |
| `cancelled` | Sender cancelled before release; funds returned |
| `refunded` | Refund processed on-chain; funds returned to sender |
| `failed` | Blockchain transaction failed or was rejected |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS |
| **Web3** | wagmi v3, viem v2 (wallet connection, contract interaction) |
| **Smart Contracts** | Solidity 0.8.20, Hardhat 3 |
| **AI Parser** | Google Gemini AI with rule-based fallback |
| **Database** | MongoDB Atlas (with local JSON file fallback) |
| **Authentication** | Nonce-based wallet signature verification |
| **Network** | Base Sepolia (chain ID 84532) |

---

## Project Structure

```
smartescrow/
├── contracts/
│   ├── SmartEscrow.sol          # Main escrow contract (316 lines)
│   └── MockToken.sol            # Test ERC20 token for development
│
├── scripts/
│   ├── deploy.ts                # Contract deployment to Base Sepolia
│   ├── event-listener.ts        # Monitors blockchain events, syncs to DB
│   ├── scheduler.ts             # Executes scheduled/recurring payouts (--dry-run supported)
│   └── run-mongo-tests.mjs      # Disposable MongoDB container test runner
│
├── test/
│   ├── SmartEscrow.test.ts      # Contract tests (23 tests)
│   ├── e2e.test.ts              # Local Hardhat node end-to-end tests (3 tests)
│   ├── security.test.ts         # Security audit tests (22 tests)
│   ├── api.test.ts              # API endpoint tests (15 tests)
│   ├── db.test.ts               # Local JSON database tests (8 tests)
│   └── db.mongo.test.ts         # MongoDB integration tests (5 tests, opt-in)
│
├── src/
│   ├── app/
│   │   ├── (public)/            # Public pages (landing, about)
│   │   │   ├── page.tsx         # Landing page
│   │   │   └── about/page.tsx   # About page with roadmap
│   │   │
│   │   ├── (dashboard)/         # Authenticated dashboard
│   │   │   └── dashboard/
│   │   │       ├── page.tsx             # Dashboard with metrics
│   │   │       ├── create-payment/      # 4-step payment creation wizard
│   │   │       ├── payments/[id]/       # Payment detail + transaction log
│   │   │       ├── history/             # Payment history
│   │   │       └── profile/             # User profile
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── nonce/route.ts       # Generate auth nonce
│   │       │   └── verify/route.ts      # Verify wallet signature
│   │       ├── payments/route.ts        # GET/POST/PATCH payments
│   │       ├── parse-payment/route.ts   # NL payment parser (Gemini AI)
│   │       └── events/route.ts          # On-chain event queries
│   │
│   ├── components/              # Reusable UI components
│   ├── context/
│   │   └── EscrowContext.tsx     # Global state (payments, auth, metrics)
│   ├── hooks/
│   │   ├── useEscrowContract.ts # Contract interaction hooks
│   │   └── useENS.ts            # ENS name resolution
│   ├── lib/
│   │   ├── auth.ts              # Wallet signature verification
│   │   ├── contracts.ts         # ABI definitions + token addresses
│   │   ├── db.ts                # MongoDB + JSON fallback database
│   │   └── mockData.ts          # Demo data for unauthenticated users
│   └── types/
│       └── payment.ts           # TypeScript type definitions
│
├── hardhat.config.ts            # Hardhat config (Base Sepolia)
├── next.config.ts               # Next.js config
├── tailwind.config.ts           # Tailwind CSS config
└── tsconfig.json                # TypeScript config
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MetaMask browser extension
- Base Sepolia ETH — free from a faucet, no real funds needed (see [Zero-Cost Student Setup](#zero-cost-student-setup))

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd smartescrow

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys (see Environment Variables below)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### MetaMask Setup

1. Add Base Sepolia network:
   - Network Name: `Base Sepolia`
   - RPC URL: `https://sepolia.base.org`
   - Chain ID: `84532`
   - Currency Symbol: `ETH`
   - Block Explorer: `https://sepolia.basescan.org`

2. Get free testnet ETH — see [Zero-Cost Student Setup](#zero-cost-student-setup) for faucet options that do not require a mainnet balance.

### Connecting in the App

1. Open the console at `/dashboard`.
2. Click **Connect Wallet** in the top-right header (or the connect button in the dashboard empty state).
3. Choose **Browser Wallet** (MetaMask, Rabby, or any EIP-6963 wallet) or **Coinbase Wallet**.
4. Approve the connection in your wallet.
5. The app then asks you to sign a short message to prove you own the wallet. Signing is free and sends no transaction; the signed message authenticates your API requests for five minutes.
6. If your wallet is on another network, the wallet menu shows **Base Sepolia required** with a **Switch to Base Sepolia** button. Escrows only work on chain ID `84532`.
7. While connected, the header shows your address and ETH balance; open that menu to see the network, switch networks, or disconnect.

If no browser wallet is installed, the wallet menu marks the browser connector as “not detected” and shows an **Install MetaMask** link. The Coinbase Wallet option works without an extension by opening its own connection flow.

---

## Zero-Cost Student Setup

Everything in this project runs on test networks. **Testnet ETH and test USDC are free and have no real value**, so deploying the contract and creating, releasing, and refunding escrows costs **$0**. You never need to buy crypto or hold a mainnet balance.

| Item | Cost | Notes |
|------|------|-------|
| Base Sepolia ETH | Free | Gas fees and ETH escrow amounts; from faucets |
| Test USDC | Free | Circle faucet; for token escrows |
| Contract deployment | Free | Paid in faucet ETH |
| Gemini parser | Free / optional | Rule-based fallback works without an API key |
| Database | Free / optional | Local JSON fallback, or MongoDB Atlas free tier |

### 1. Create a throwaway wallet

Create a fresh wallet in MetaMask and use it only for this project. Never put a real wallet's private key in `.env.local`. The same wallet can deploy the contract and act as the demo payer.

Add the Base Sepolia network (see [MetaMask Setup](#metamask-setup)) and copy its address.

### 2. Get free Base Sepolia ETH

| Faucet | Drip | Requirements | Link |
|--------|------|--------------|------|
| QuickNode | Base Sepolia ETH | No account, no mainnet balance | https://faucet.quicknode.com/base/sepolia |
| Chainlink | 0.5 ETH | Connect a wallet | https://faucets.chain.link/base-sepolia |
| Coinbase CDP | Small ETH claims, up to 0.1 ETH/day; 1 USDC/claim | Free CDP account, no mainnet balance | https://portal.cdp.coinbase.com/products/faucet |
| Circle | 20 test USDC every 2 hours | No account | https://faucet.circle.com (select Base Sepolia) |

**Do not use a faucet that requires a mainnet balance** (Alchemy's Base Sepolia faucet currently requires 0.001 ETH on Ethereum mainnet plus mainnet activity). If one faucet rejects you, try another — requirements and drip sizes change over time, and the faucet page is authoritative.

0.001–0.01 test ETH is plenty for deployment and a demo; escrow amounts can be as small as `0.0001 ETH` or `1 USDC`.

### 3. Configure the deployer key

Add the throwaway wallet's private key to `.env.local`:

```bash
DEPLOYER_PRIVATE_KEY=0xYOUR_TESTNET_ONLY_KEY
```

- Keep the `0x` prefix; no quotes or spaces.
- This key is used only by the deploy script and scheduler. The app itself never needs it — users pay from their own connected wallet.
- `.env.local` is gitignored. Never prefix the key with `NEXT_PUBLIC_`.

If the public RPC is rate-limited during your demo, use a free Alchemy or QuickNode endpoint:

```bash
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_FREE_KEY
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_FREE_KEY
```

### 4. Deploy and start the app

```bash
npm run deploy   # validates the key, checks gas balance, deploys, writes the address to .env.local
npm run dev      # restart required so Next.js picks up NEXT_PUBLIC_SMART_ESCROW_ADDRESS
```

Confirm the address was written:

```bash
grep NEXT_PUBLIC_SMART_ESCROW_ADDRESS .env.local
```

PowerShell: `Select-String NEXT_PUBLIC_SMART_ESCROW_ADDRESS .env.local`

### 5. Make a free test payment

1. Open `/dashboard`, connect the wallet, and switch to Base Sepolia if prompted.
2. Sign the free auth message (no gas, no transaction).
3. Create a payment with a tiny amount (`0.0001 ETH` or `1 USDC`).
4. For USDC, approve the token first (one extra transaction) — test USDC is free from the Circle faucet.

### Zero-cost troubleshooting

| Symptom | Fix |
|---------|-----|
| Faucet rejects the wallet | Try another faucet from the table; some gate by account age or existing testnet balance |
| `BLOCKED: Insufficient ... ETH` | Fund the exact **deployer address** printed by the script, not another account |
| `429` / RPC errors | Set `BASE_SEPOLIA_RPC_URL` to a free Alchemy/QuickNode endpoint |
| UI says contract not deployed | Restart `npm run dev`; verify the address in `.env.local` has no quotes or spaces |
| USDC create fails on allowance | Approve USDC first, then create the escrow |

> Faucet and rate-limit details were checked in November 2026. Testnet funds have no monetary value and cannot be sold; never pay anyone for testnet tokens.

---

## Environment Variables

Configure `.env.local`:

```bash
# Google Gemini AI (optional — rule-based fallback if not set)
GEMINI_API_KEY=your_gemini_api_key

# MongoDB Atlas (optional — falls back to local JSON file)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/smartescrow

# Base Sepolia RPC (default: public RPC)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Deployer wallet (required for contract deployment + scheduler)
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Deployed contract address (set automatically after deployment)
NEXT_PUBLIC_SMART_ESCROW_ADDRESS=

# Network config
NEXT_PUBLIC_BASE_SEPOLIA_CHAIN_ID=84532
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DEPLOYER_PRIVATE_KEY` | Yes | Wallet private key for deployment + scheduler execution |
| `GEMINI_API_KEY` | No | Google Gemini AI key for natural language parsing |
| `MONGODB_URI` | No | MongoDB Atlas connection string (JSON fallback if empty) |
| `NEXT_PUBLIC_SMART_ESCROW_ADDRESS` | After deploy | Set automatically by deploy script |

---

## Smart Contracts

### SmartEscrow.sol

The main contract supports 4 escrow types:

#### Conditional Escrow
```solidity
createConditionalEscrow(receiver, token, amount, condition, duration)
```
Funds locked until oracle verifies the condition is met.

#### Scheduled Escrow
```solidity
createScheduledEscrow(receiver, token, amount, condition, duration, releaseTimestamp)
```
Funds locked until specified timestamp, then auto-released.

#### Recurring Escrow
```solidity
createRecurringEscrow(receiver, token, amount, condition, duration, interval)
```
Periodic payouts at defined intervals (e.g., monthly salary).

#### NFT-Conditional Escrow
```solidity
createNFTConditionalEscrow(receiver, token, amount, condition, duration, nftContract, tokenId)
```
Release based on ERC-721 NFT ownership.

### Contract Security

- ReentrancyGuard on all state-changing functions
- Checks-Effects-Interactions pattern
- Only sender can refund (before deadline)
- Only oracle/executor can trigger releases
- Token address validation (USDC, USDT, WETH on Base Sepolia)

### Token Addresses (Base Sepolia)

| Token | Address |
|-------|---------|
| USDC | `0x036CbD53842c54125e4100383a0C066889486Bd1` |
| USDT | `0x0000000000000000000000000000000000000000` (placeholder) |
| WETH | `0x4200000000000000000000000000000000000006` |

---

## Security

### Authentication Flow

```
1. Client requests nonce from /api/auth/nonce
2. Server generates random nonce, stores in memory (5-min expiry)
3. Client signs nonce message with wallet
4. Client sends request with headers:
   - X-Wallet-Address: 0x...
   - X-Wallet-Signature: 0x...
   - X-Wallet-Nonce: <nonce>
5. Server verifies signature, checks nonce hasn't been reused
6. Request proceeds with authenticated address
```

### Security Protections

| Protection | Implementation |
|------------|---------------|
| **Nonce Reuse Prevention** | Each nonce is deleted after use; replay attacks blocked |
| **Signature Verification** | ECDSA recovery via viem; invalid signatures rejected |
| **Wallet-Scoped Access** | GET /api/payments returns only the authenticated wallet's payments |
| **Sender Spoofing Prevention** | Server derives address from cryptographic signature |
| **Cross-User PATCH Prevention** | Ownership check before any payment modification |
| **Rate Limiting** | Nonce generation limited per address |
| **In-Memory Auth Store** | Nonces reset on server restart (acceptable for college project) |

---

## Testing

### Run All Tests

```bash
# Everything (MongoDB integration is skipped unless configured)
npm test

# Contract tests (23 tests)
npm run test:contracts

# End-to-end on a local Hardhat node (3 tests)
npm run test:e2e

# Security tests (22 tests)
npm run test:security

# API tests (15 tests)
npm run test:api

# Local JSON database layer (8 tests)
npm run test:db

# MongoDB integration (opt-in, 5 tests; skipped without a URI)
MONGODB_TEST_URI="mongodb://localhost:27017/smartescrow_test" npm run test:db:mongo

# MongoDB integration with a disposable Docker container (see below)
npm run test:db:mongo:docker
```

### MongoDB Integration Tests

The database layer has two backends: MongoDB and the local JSON fallback. MongoDB coverage is opt-in so `npm test` never requires a database. There are two ways to run it.

#### Option A — Existing MongoDB instance

Point the suite at any MongoDB server and database. The tests create and delete only their own records (keyed by a unique sender address), but a dedicated test database is still recommended.

```bash
MONGODB_TEST_URI="mongodb://127.0.0.1:27017/smartescrow_test" npm run test:db:mongo
```

On Windows PowerShell:

```powershell
$env:MONGODB_TEST_URI="mongodb://127.0.0.1:27017/smartescrow_test"; npm run test:db:mongo
```

#### Option B — Disposable Docker container (recommended)

If Docker is available, you do not need MongoDB installed or running:

```bash
npm run test:db:mongo:docker
```

The runner (`scripts/run-mongo-tests.mjs`) performs the whole lifecycle:

1. Verifies the Docker daemon is reachable.
2. Allocates a free localhost port (no clashes with an existing MongoDB on 27017).
3. Starts `mongo:7` detached with `--rm` as `smartescrow-mongo-test-<pid>`.
4. Waits until MongoDB answers `db.runCommand({ ping: 1 })` (up to 60 s).
5. Runs `test/db.mongo.test.ts` with `MONGODB_TEST_URI` set to the container.
6. Stops and removes the container — on success, on failure, and on `Ctrl+C`/SIGTERM.
7. Exits with the test suite's exit code.

**Prerequisites:** Docker Desktop (or a Docker Engine) must be running. There is no MongoDB prerequisite; the image is pulled on first use.

**Overrides:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `MONGO_IMAGE` | `mongo:7` | Container image, e.g. `MONGO_IMAGE=mongo:8` |
| `MONGODB_TEST_DB` | `smartescrow_test` | Database name created inside the container |
| `MONGODB_TEST_URI` | — | If already set, the container is skipped and this URI is used |

```bash
# Use MongoDB 8 and a custom database name
MONGO_IMAGE=mongo:8 MONGODB_TEST_DB=smartescrow_ci npm run test:db:mongo:docker
```

**Troubleshooting:**

- `Docker is not available` — start Docker Desktop and re-run, or use Option A with a reachable MongoDB URI.
- The first run is slower because the image is downloaded; later runs start in seconds.
- If a run is interrupted before cleanup, remove the container manually:
  ```bash
  docker ps -a --filter name=smartescrow-mongo-test
  docker rm -f <container-name>
  ```
- The suite does not touch the local JSON database and does not modify `src/scratch/db.json`.

### Test Coverage

| Category | Tests | Coverage |
|----------|-------|----------|
| Contract deployment | 2 | Owner, initial state |
| Admin functions | 3 | Oracle, executor, pause |
| ETH escrow | 5 | Create, release, refund, double-release, unauthorized |
| ERC20 escrow | 3 | Create, release, refund |
| Scheduled escrow | 2 | Create, execute |
| Recurring escrow | 2 | Create, execute |
| NFT escrow | 2 | Create, unauthorized |
| Security | 22 | Auth, spoofing, nonce reuse, ownership |
| API endpoints | 15 | Auth, payments, parser, events |
| End-to-end | 3 | Local node deploy, escrow creation, id capture |
| Local database | 8 | Save, dedupe, update, update by escrow id |
| MongoDB (opt-in) | 5 | Save, dedupe, update, update by escrow id |
| **Total** | **71** (+5 opt-in) | **0 failures** |

---

## Deployment

### Deploy Contract to Base Sepolia

```bash
npm run deploy
```

The deploy script:
1. Validates `DEPLOYER_PRIVATE_KEY` is set and correctly formatted
2. Checks wallet balance sufficiency
3. Estimates deployment gas cost
4. Deploys SmartEscrow contract
5. Auto-writes `NEXT_PUBLIC_SMART_ESCROW_ADDRESS` to `.env.local`
6. Prints transaction hash and contract address

### Post-Deployment

After deployment, restart the dev server:

```bash
npm run dev
```

---

## Background Services

### Event Listener

Monitors blockchain events and syncs them to the database.

```bash
npm run listener
```

**Events monitored:**
- `EscrowCreated` — Links on-chain escrow ID to DB payment record
- `EscrowReleased` — Updates payment status to `completed`
- `EscrowRefunded` — Updates payment status to `refunded`

**Deduplication:** Uses `Set<string>` of `txHash-logIndex` to prevent processing the same event twice.

### Scheduler

Executes scheduled and recurring payments when conditions are met.

```bash
npm run scheduler

# Inspect what would be executed without sending any transaction
npm run scheduler:dry
# or: npx tsx scripts/scheduler.ts --dry-run
# or: DRY_RUN=true npm run scheduler
```

**Dry run:** Reads the payment store (MongoDB or the local JSON fallback), lists every active scheduled/recurring payment with an escrow id, then exits. It needs no `DEPLOYER_PRIVATE_KEY`, no contract address and no RPC connection, so it is safe to run against production data.

**Scheduled payments:** Queries DB for payments with `status=active` and `scheduledAt` in the past; calls `executeScheduledRelease` on-chain.

**Recurring payments:** Queries DB for payments with `status=active` and `frequency` set; checks if enough time has passed since last execution; calls `executeRecurringPayout` on-chain.

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/nonce` | Generate auth nonce for wallet address |
| POST | `/api/auth/verify` | Verify wallet signature against nonce |

### Payments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/payments` | Required | List payments for authenticated wallet |
| POST | `/api/payments` | Required | Create new payment record |
| PATCH | `/api/payments` | Required | Update payment status/data |

### Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/parse-payment` | Parse natural language to payment parameters |
| GET | `/api/events` | Query on-chain escrow events |

### Payment Data Model

```typescript
interface Payment {
  id: string;                    // pay_<uuid>
  senderAddress: string;         // lowercase, derived from signature
  receiverName: string;
  receiverAddress: string;       // lowercase
  amount: number;
  token: 'ETH' | 'USDC' | 'USDT';
  type: 'conditional' | 'scheduled' | 'recurring' | 'nft-conditional';
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'refunded' | 'failed';
  condition: string;
  createdAt: string;             // ISO 8601
  releaseDate?: string;
  description?: string;
  naturalLanguagePrompt?: string;
  contractEscrowId?: number;     // on-chain escrow ID
  txHash?: string;               // creation transaction
  fundedTxHash?: string;         // funding transaction
  releasedTxHash?: string;       // release transaction
  refundedTxHash?: string;       // refund transaction
  blockNumber?: number;
  duration?: number;             // seconds
  scheduledAt?: string;          // ISO 8601 (scheduled type)
  frequency?: string;            // daily|weekly|monthly|quarterly (recurring type)
}
```

---

## License

MIT

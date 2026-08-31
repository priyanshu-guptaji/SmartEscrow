import { Payment, TokenSymbol } from '@/types/payment';

// Dev-only mock seed data. These are fake demo records injected into the local
// JSON fallback DB when MongoDB is not configured.  They intentionally use the
// same dummy sender address so the dev dashboard is populated.
const DEV_SENDER = '0x1234567890abcdef1234567890abcdef12345678';

export const MOCK_PAYMENTS: Payment[] = [
  {
    id: 'pay_001',
    senderAddress: DEV_SENDER,
    receiverName: 'Alice Vance',
    receiverAddress: '0x71C2728892154F65B20a8642657132C0424165B2',
    amount: 1.25,
    token: 'ETH',
    type: 'conditional',
    status: 'active',
    condition: 'Release when the portfolio website frontend is deployed and matches Figma specification.',
    createdAt: '2026-07-20T10:30:00Z',
    description: 'Web design completion escrow',
    naturalLanguagePrompt: 'Pay Alice 1.25 ETH if she finishes the portfolio website frontend.'
  },
  {
    id: 'pay_002',
    senderAddress: DEV_SENDER,
    receiverName: 'Bob Builder',
    receiverAddress: '0x3Fd9b2401de1a35B2781B7e9A06a5d18B68e19a2',
    amount: 500.0,
    token: 'USDC',
    type: 'conditional',
    status: 'pending',
    condition: 'Release when the solidity smart contract audit report passes with 0 critical issues.',
    createdAt: '2026-07-24T14:15:00Z',
    description: 'Smart contract audit escrow',
    naturalLanguagePrompt: 'Escrow 500 USDC for Bob. Release when the solidity smart contract audit report passes with 0 critical issues.'
  },
  {
    id: 'pay_003',
    senderAddress: DEV_SENDER,
    receiverName: 'Charlie Dev',
    receiverAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
    amount: 0.5,
    token: 'ETH',
    type: 'conditional',
    status: 'completed',
    condition: 'Release when the smart contract unit test suite achieves 100% code coverage.',
    createdAt: '2026-07-10T08:00:00Z',
    releaseDate: '2026-07-22T19:45:00Z',
    description: 'Test coverage bounty',
    naturalLanguagePrompt: 'Send Charlie 0.5 ETH when test coverage hits 100%.'
  },
  {
    id: 'pay_004',
    senderAddress: DEV_SENDER,
    receiverName: 'Dave Operations',
    receiverAddress: '0x99A8d981C5b2781B7e9A06a5d18B68e3E3e3e3e3',
    amount: 250.0,
    token: 'USDT',
    type: 'recurring',
    status: 'active',
    condition: 'Released automatically on the 1st of every month.',
    createdAt: '2026-06-01T00:00:00Z',
    description: 'Monthly tooling subscription payment',
    naturalLanguagePrompt: 'Pay Dave 250 USDT recurring on the 1st of every month.',
    frequency: 'monthly',
  },
  {
    id: 'pay_005',
    senderAddress: DEV_SENDER,
    receiverName: 'Eve Consultant',
    receiverAddress: '0xEee5228892154F65B20a8642657132C04241882a',
    amount: 1.5,
    token: 'ETH',
    type: 'scheduled',
    status: 'active',
    condition: 'Release automatically on September 1, 2026 at 12:00 UTC.',
    createdAt: '2026-07-18T16:00:00Z',
    description: 'Scheduled Q3 advisory payout',
    naturalLanguagePrompt: 'Pay Eve 1.5 ETH scheduled on September 1, 2026.',
    scheduledAt: '2026-09-01T12:00:00Z',
  },
  {
    id: 'pay_006',
    senderAddress: DEV_SENDER,
    receiverName: 'Frank Marketer',
    receiverAddress: '0x44B7c329892154F65B20a8642657132C0424177c3',
    amount: 0.8,
    token: 'ETH',
    type: 'conditional',
    status: 'cancelled',
    condition: 'Release when the campaign gets 1,000 signups before July 20, 2026.',
    createdAt: '2026-07-05T09:00:00Z',
    releaseDate: '2026-07-20T23:59:00Z',
    description: 'Marketing milestone escrow',
    naturalLanguagePrompt: 'Send Frank 0.8 ETH if marketing campaign hits 1k signups before July 20.'
  }
];

export const TOKEN_PRICES: { [key in TokenSymbol]: number } = {
  ETH: 3400.0,
  USDC: 1.0,
  USDT: 1.0,
};

export const MOCK_WALLET_BALANCE = {
  ETH: 4.82,
  USDC: 2450.0,
  USDT: 120.0,
};

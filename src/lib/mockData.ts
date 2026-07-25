import { Payment, TokenSymbol } from '@/types/payment';

export const MOCK_PAYMENTS: Payment[] = [
  {
    id: 'pay_001',
    receiverName: 'Alice Vance',
    receiverAddress: '0x71C...65B2',
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
    receiverName: 'Bob Builder',
    receiverAddress: '0x3Fd...19a2',
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
    receiverName: 'Charlie Dev',
    receiverAddress: '8xKm...Y3t4',
    amount: 10.0,
    token: 'SOL',
    type: 'conditional',
    status: 'completed',
    condition: 'BTC price hits $100,000 before December 31, 2026 according to Chainlink oracle.',
    createdAt: '2026-07-10T08:00:00Z',
    releaseDate: '2026-07-22T19:45:00Z',
    description: 'Market prediction wager',
    naturalLanguagePrompt: 'Send Charlie 10 SOL if BTC price hits $100k before Dec 31.'
  },
  {
    id: 'pay_004',
    receiverName: 'Dave Operations',
    receiverAddress: '0x99A...d981',
    amount: 250.0,
    token: 'USDT',
    type: 'recurring',
    status: 'active',
    condition: 'Released automatically on the 1st of every month.',
    createdAt: '2026-06-01T00:00:00Z',
    description: 'Monthly tooling subscription payment',
    naturalLanguagePrompt: 'Pay Dave 250 USDT recurring on the 1st of every month.'
  },
  {
    id: 'pay_005',
    receiverName: 'Eve Consultant',
    receiverAddress: '0xEee...882a',
    amount: 1.5,
    token: 'ETH',
    type: 'scheduled',
    status: 'active',
    condition: 'Release automatically on September 1, 2026 at 12:00 UTC.',
    createdAt: '2026-07-18T16:00:00Z',
    description: 'Scheduled Q3 advisory payout',
    naturalLanguagePrompt: 'Pay Eve 1.5 ETH scheduled on September 1, 2026.'
  },
  {
    id: 'pay_006',
    receiverName: 'Frank Marketer',
    receiverAddress: '0x44B...77c3',
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
  SOL: 145.0
};

export const MOCK_WALLET_BALANCE = {
  ETH: 4.82,
  USDC: 2450.0,
  USDT: 120.0,
  SOL: 32.5
};

export const MOCK_CONNECTED_WALLET = '0x71C272...65B20a8';

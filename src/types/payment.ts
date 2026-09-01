export type PaymentType = 'conditional' | 'scheduled' | 'recurring' | 'nft-conditional';

export type PaymentStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'refunded' | 'failed';

export type TokenSymbol = 'ETH' | 'USDC' | 'USDT';

export interface Payment {
  id: string;
  senderAddress: string;
  receiverName: string;
  receiverAddress: string;
  amount: number;
  token: TokenSymbol;
  type: PaymentType;
  status: PaymentStatus;
  condition: string;
  createdAt: string;
  releaseDate?: string;
  description?: string;
  naturalLanguagePrompt?: string;
  contractEscrowId?: number;
  txHash?: string;
  fundedTxHash?: string;
  releasedTxHash?: string;
  refundedTxHash?: string;
  blockNumber?: number;
  duration?: number;
  scheduledAt?: string;
  frequency?: string;
}

export interface DashboardMetrics {
  totalPaymentsVolume: number;
  activeEscrowsCount: number;
  completedTransactionsCount: number;
  walletBalance: {
    [key in TokenSymbol]: number;
  };
  connectedWallet: string | null;
}

export type TxState =
  | 'idle'
  | 'preparing'
  | 'wallet-pending'
  | 'confirming'
  | 'confirmed'
  | 'failed';

export interface ContractEscrow {
  id: bigint;
  sender: `0x${string}`;
  receiver: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
  condition: string;
  deadline: bigint;
  status: number;
}

export const ESCROW_STATUS_MAP: Record<number, 'Active' | 'Completed' | 'Refunded'> = {
  0: 'Active',
  1: 'Completed',
  2: 'Refunded',
};


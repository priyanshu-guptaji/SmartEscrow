export type PaymentType = 'conditional' | 'scheduled' | 'recurring';

export type PaymentStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export type TokenSymbol = 'ETH' | 'USDC' | 'USDT' | 'SOL';

export interface Payment {
  id: string;
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
}

export interface DashboardMetrics {
  totalPaymentsVolume: number; // in USD equivalent (mocked)
  activeEscrowsCount: number;
  completedTransactionsCount: number;
  walletBalance: {
    [key in TokenSymbol]: number;
  };
  connectedWallet: string | null;
}

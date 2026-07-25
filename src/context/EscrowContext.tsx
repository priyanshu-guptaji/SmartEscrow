'use client';

import React, { createContext, useContext } from 'react';
import { useMockEscrow } from '@/hooks/useMockEscrow';
import { Payment, DashboardMetrics, TokenSymbol } from '@/types/payment';

interface EscrowContextType {
  payments: Payment[];
  walletConnected: boolean;
  walletBalance: { [key in TokenSymbol]: number };
  toggleWallet: () => void;
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt' | 'status'>) => Payment;
  triggerRelease: (id: string) => void;
  cancelPayment: (id: string) => void;
  metrics: DashboardMetrics;
  isInitialized: boolean;
}

const EscrowContext = createContext<EscrowContextType | undefined>(undefined);

export function EscrowProvider({ children }: { children: React.ReactNode }) {
  const escrow = useMockEscrow();

  return (
    <EscrowContext.Provider value={escrow}>
      {children}
    </EscrowContext.Provider>
  );
}

export function useEscrow() {
  const context = useContext(EscrowContext);
  if (context === undefined) {
    throw new Error('useEscrow must be used within an EscrowProvider');
  }
  return context;
}

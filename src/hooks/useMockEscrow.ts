'use client';

import { useState } from 'react';
import { Payment, DashboardMetrics } from '@/types/payment';
import { MOCK_PAYMENTS, TOKEN_PRICES, MOCK_WALLET_BALANCE, MOCK_CONNECTED_WALLET } from '@/lib/mockData';

function getInitialPayments(): Payment[] {
  if (typeof window === 'undefined') return MOCK_PAYMENTS;
  const stored = localStorage.getItem('smartescrow_payments');
  return stored ? JSON.parse(stored) : MOCK_PAYMENTS;
}

function getInitialConnected(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem('smartescrow_wallet_connected');
  return stored !== null ? stored === 'true' : true;
}

function getInitialBalance() {
  if (typeof window === 'undefined') return MOCK_WALLET_BALANCE;
  const stored = localStorage.getItem('smartescrow_wallet_balance');
  return stored ? JSON.parse(stored) : MOCK_WALLET_BALANCE;
}

export function useMockEscrow() {
  const [payments, setPayments] = useState<Payment[]>(getInitialPayments);
  const [walletConnected, setWalletConnected] = useState<boolean>(getInitialConnected);
  const [walletBalance, setWalletBalance] = useState(getInitialBalance);
  const [isInitialized] = useState<boolean>(typeof window !== 'undefined');

  // Sync state helper
  const savePayments = (newPayments: Payment[]) => {
    setPayments(newPayments);
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartescrow_payments', JSON.stringify(newPayments));
    }
  };

  const toggleWallet = () => {
    const nextConnected = !walletConnected;
    setWalletConnected(nextConnected);
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartescrow_wallet_connected', String(nextConnected));
    }
  };

  const addPayment = (newPaymentData: Omit<Payment, 'id' | 'createdAt' | 'status'>) => {
    const newPayment: Payment = {
      ...newPaymentData,
      id: `pay_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: newPaymentData.type === 'conditional' ? 'active' : 'active', // default active
    };

    const updated = [newPayment, ...payments];
    savePayments(updated);

    // Deduct amount from wallet balance if wallet is connected
    if (walletConnected) {
      const token = newPayment.token;
      const currentBal = walletBalance[token] || 0;
      const nextBalance = {
        ...walletBalance,
        [token]: Math.max(0, currentBal - newPayment.amount),
      };
      setWalletBalance(nextBalance);
      if (typeof window !== 'undefined') {
        localStorage.setItem('smartescrow_wallet_balance', JSON.stringify(nextBalance));
      }
    }

    return newPayment;
  };

  const triggerRelease = (id: string) => {
    const updated = payments.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          status: 'completed' as const,
          releaseDate: new Date().toISOString(),
        };
      }
      return p;
    });
    savePayments(updated);
  };

  const cancelPayment = (id: string) => {
    const targetPayment = payments.find((p) => p.id === id);
    const updated = payments.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          status: 'cancelled' as const,
          releaseDate: new Date().toISOString(),
        };
      }
      return p;
    });
    savePayments(updated);

    // Refund wallet balance
    if (targetPayment && walletConnected) {
      const token = targetPayment.token;
      const currentBal = walletBalance[token] || 0;
      const nextBalance = {
        ...walletBalance,
        [token]: currentBal + targetPayment.amount,
      };
      setWalletBalance(nextBalance);
      if (typeof window !== 'undefined') {
        localStorage.setItem('smartescrow_wallet_balance', JSON.stringify(nextBalance));
      }
    }
  };

  // Compute metrics based on payments list
  const activeEscrowsCount = payments.filter((p) => p.status === 'active' || p.status === 'pending').length;
  const completedTransactionsCount = payments.filter((p) => p.status === 'completed').length;
  
  // Calculate total volume (active + completed) in USD
  const totalPaymentsVolume = payments
    .filter((p) => p.status === 'active' || p.status === 'completed')
    .reduce((acc, p) => {
      const price = TOKEN_PRICES[p.token] || 1;
      return acc + (p.amount * price);
    }, 0);

  return {
    payments: isInitialized ? payments : MOCK_PAYMENTS,
    walletConnected,
    walletBalance,
    toggleWallet,
    addPayment,
    triggerRelease,
    cancelPayment,
    metrics: {
      totalPaymentsVolume,
      activeEscrowsCount,
      completedTransactionsCount,
      walletBalance,
      connectedWallet: walletConnected ? MOCK_CONNECTED_WALLET : null,
    } as DashboardMetrics,
    isInitialized,
  };
}

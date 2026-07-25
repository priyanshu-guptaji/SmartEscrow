'use client';

import { useState, useEffect } from 'react';
import { Payment, DashboardMetrics, TokenSymbol } from '@/types/payment';
import { MOCK_PAYMENTS, TOKEN_PRICES, MOCK_WALLET_BALANCE, MOCK_CONNECTED_WALLET } from '@/lib/mockData';

export function useMockEscrow() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [walletConnected, setWalletConnected] = useState<boolean>(true);
  const [walletBalance, setWalletBalance] = useState(MOCK_WALLET_BALANCE);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Hydrate state from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedPayments = localStorage.getItem('smartescrow_payments');
      const storedConnected = localStorage.getItem('smartescrow_wallet_connected');
      const storedBalance = localStorage.getItem('smartescrow_wallet_balance');

      if (storedPayments) {
        setPayments(JSON.parse(storedPayments));
      } else {
        setPayments(MOCK_PAYMENTS);
        localStorage.setItem('smartescrow_payments', JSON.stringify(MOCK_PAYMENTS));
      }

      if (storedConnected !== null) {
        setWalletConnected(storedConnected === 'true');
      }

      if (storedBalance) {
        setWalletBalance(JSON.parse(storedBalance));
      }

      setIsInitialized(true);
    }
  }, []);

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

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Payment, DashboardMetrics } from '@/types/payment';
import { MOCK_PAYMENTS, TOKEN_PRICES, MOCK_WALLET_BALANCE } from '@/lib/mockData';

interface EscrowContextType {
  payments: Payment[];
  isLoading: boolean;
  walletConnected: boolean;
  walletAddress: string | null;
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt' | 'status'>) => Promise<Payment>;
  triggerRelease: (id: string) => Promise<void>;
  cancelPayment: (id: string) => Promise<void>;
  refreshPayments: () => Promise<void>;
  metrics: DashboardMetrics;
  isInitialized: boolean;
}

const EscrowContext = createContext<EscrowContextType | undefined>(undefined);

export function EscrowProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const [payments, setPayments] = useState<Payment[]>(MOCK_PAYMENTS);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Seed the mock dataset into the local database on first run
  const seedMockData = useCallback(async () => {
    try {
      for (const payment of MOCK_PAYMENTS) {
        await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payment),
        });
      }
    } catch {
      // Silently fail seeding — UI still shows mock data
    }
  }, []);

  // Fetch payments from the database API (falls back to mock if unavailable)
  const refreshPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/payments');
      if (res.ok) {
        const { data } = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setPayments(data);
        } else {
          // API returned empty — stay with mock data seed
          setPayments(MOCK_PAYMENTS);
          // Seed mock data into local DB for first run
          await seedMockData();
        }
      } else {
        setPayments(MOCK_PAYMENTS);
      }
    } catch {
      // API unavailable; fallback to mock data
      setPayments(MOCK_PAYMENTS);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [seedMockData]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!cancelled) {
        await refreshPayments();
      }
    }
    init();
    return () => { cancelled = true; };
  }, [refreshPayments]);

  const addPayment = async (
    newPaymentData: Omit<Payment, 'id' | 'createdAt' | 'status'>
  ): Promise<Payment> => {
    const newPayment: Payment = {
      ...newPaymentData,
      id: `pay_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    // Optimistic update
    setPayments((prev) => [newPayment, ...prev]);

    // Persist to API
    try {
      await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayment),
      });
    } catch (e) {
      console.error('Failed to persist payment to API:', e);
    }

    return newPayment;
  };

  const triggerRelease = async (id: string) => {
    const releaseDate = new Date().toISOString();

    // Optimistic update
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'completed', releaseDate } : p))
    );

    try {
      await fetch('/api/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'completed', releaseDate }),
      });
    } catch (e) {
      console.error('Failed to update payment status:', e);
    }
  };

  const cancelPayment = async (id: string) => {
    const releaseDate = new Date().toISOString();

    // Optimistic update
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'cancelled', releaseDate } : p))
    );

    try {
      await fetch('/api/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'cancelled', releaseDate }),
      });
    } catch (e) {
      console.error('Failed to update payment status:', e);
    }
  };

  // Compute metrics
  const activeEscrowsCount = payments.filter(
    (p) => p.status === 'active' || p.status === 'pending'
  ).length;
  const completedTransactionsCount = payments.filter((p) => p.status === 'completed').length;
  const totalPaymentsVolume = payments
    .filter((p) => p.status === 'active' || p.status === 'completed')
    .reduce((acc, p) => {
      const price = TOKEN_PRICES[p.token] || 1;
      return acc + p.amount * price;
    }, 0);

  const metrics: DashboardMetrics = {
    totalPaymentsVolume,
    activeEscrowsCount,
    completedTransactionsCount,
    walletBalance: MOCK_WALLET_BALANCE,
    connectedWallet: address ?? null,
  };

  return (
    <EscrowContext.Provider
      value={{
        payments,
        isLoading,
        walletConnected: isConnected,
        walletAddress: address ?? null,
        addPayment,
        triggerRelease,
        cancelPayment,
        refreshPayments,
        metrics,
        isInitialized,
      }}
    >
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

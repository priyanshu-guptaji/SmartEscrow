'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { Payment, DashboardMetrics } from '@/types/payment';
import { MOCK_PAYMENTS, TOKEN_PRICES, MOCK_WALLET_BALANCE } from '@/lib/mockData';

interface EscrowContextType {
  payments: Payment[];
  isLoading: boolean;
  walletConnected: boolean;
  walletAddress: string | null;
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt' | 'status' | 'senderAddress'>) => Promise<Payment>;
  updatePayment: (id: string, updates: Partial<Pick<Payment, 'status' | 'releaseDate' | 'releasedTxHash' | 'refundedTxHash' | 'txHash' | 'fundedTxHash' | 'blockNumber' | 'contractEscrowId'>>) => Promise<Payment | null>;
  triggerRelease: (id: string) => Promise<void>;
  cancelPayment: (id: string) => Promise<void>;
  refreshPayments: () => Promise<void>;
  getAuthHeaders: () => Promise<Record<string, string> | null>;
  metrics: DashboardMetrics;
  isInitialized: boolean;
}

const EscrowContext = createContext<EscrowContextType | undefined>(undefined);

const AUTH_HEADER_TTL_MS = 4 * 60 * 1000; // 4 minutes (nonce expires in 5)

interface CachedAuth {
  headers: Record<string, string>;
  expiresAt: number;
}

/**
 * Build wallet auth headers by requesting a nonce and having the wallet sign it.
 * Returns headers to attach to API requests, or null if authentication fails.
 */
async function buildAuthHeaders(
  address: string,
  signMessageAsync: (args: { message: string }) => Promise<string>
): Promise<Record<string, string> | null> {
  try {
    const nonceRes = await fetch('/api/auth/nonce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });
    if (!nonceRes.ok) {
      console.error('Nonce request failed:', nonceRes.status);
      return null;
    }
    const { nonce, message } = await nonceRes.json();

    const signature = await signMessageAsync({ message });

    return {
      'X-Wallet-Address': address,
      'X-Wallet-Signature': signature,
      'X-Wallet-Nonce': nonce,
    };
  } catch (err) {
    console.error('Auth header build failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

export function EscrowProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Cached auth headers to avoid redundant wallet signature popups
  const authCacheRef = useRef<CachedAuth | null>(null);

  const getCachedAuthHeaders = useCallback(async (): Promise<Record<string, string> | null> => {
    if (!isConnected || !address) return null;

    // Return cached headers if still valid
    if (authCacheRef.current && authCacheRef.current.expiresAt > Date.now()) {
      return authCacheRef.current.headers;
    }

    // Build fresh headers
    const headers = await buildAuthHeaders(address, signMessageAsync);
    if (headers) {
      authCacheRef.current = {
        headers,
        expiresAt: Date.now() + AUTH_HEADER_TTL_MS,
      };
    }
    return headers;
  }, [isConnected, address, signMessageAsync]);

  // Invalidate cache when wallet disconnects or address changes
  useEffect(() => {
    if (!isConnected || !address) {
      authCacheRef.current = null;
    }
  }, [isConnected, address]);

  // Fetch payments from the database API (falls back to mock if unavailable)
  const refreshPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const authHeaders = await getCachedAuthHeaders();

      if (authHeaders) {
        const res = await fetch('/api/payments', { headers: authHeaders });
        if (res.ok) {
          const { data } = await res.json();
          if (Array.isArray(data)) {
            if (data.length > 0) {
              setPayments(data);
            } else {
              // Authenticated but no real payments — show mock data as demo examples
              // Mock data is NOT persisted to DB to avoid contaminating real payment records
              setPayments(MOCK_PAYMENTS);
            }
          } else {
            setPayments(MOCK_PAYMENTS);
          }
        } else if (res.status === 401) {
          // Auth failed — invalidate cache and show mock data
          authCacheRef.current = null;
          setPayments(MOCK_PAYMENTS);
        } else {
          setPayments(MOCK_PAYMENTS);
        }
      } else {
        // Not connected or auth failed — show mock data
        setPayments(MOCK_PAYMENTS);
      }
    } catch {
      setPayments(MOCK_PAYMENTS);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [getCachedAuthHeaders]);

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
    newPaymentData: Omit<Payment, 'id' | 'createdAt' | 'status' | 'senderAddress'>
  ): Promise<Payment> => {
    const newPayment: Payment = {
      ...newPaymentData,
      senderAddress: address || '',
      id: `pay_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    // Optimistic update
    setPayments((prev) => [newPayment, ...prev]);

    // Persist to API with wallet auth
    try {
      const authHeaders = await getCachedAuthHeaders();

      await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeaders || {}),
        },
        body: JSON.stringify(newPayment),
      });
    } catch (e) {
      console.error('Failed to persist payment to API:', e);
    }

    return newPayment;
  };

  const updatePayment = async (
    id: string,
    updates: Partial<Pick<Payment, 'status' | 'releaseDate' | 'releasedTxHash' | 'refundedTxHash' | 'txHash' | 'fundedTxHash' | 'blockNumber' | 'contractEscrowId'>>
  ): Promise<Payment | null> => {
    // Optimistic update
    let updatedPayment: Payment | null = null;
    setPayments((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          updatedPayment = { ...p, ...updates };
          return updatedPayment;
        }
        return p;
      })
    );

    try {
      const authHeaders = await getCachedAuthHeaders();

      if (!authHeaders) {
        console.error('Cannot update payment: wallet authentication failed');
        return null;
      }

      const res = await fetch('/api/payments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!res.ok) {
        console.error('PATCH failed:', res.status, await res.text());
        return null;
      }

      const { data } = await res.json();
      return data as Payment;
    } catch (e) {
      console.error('Failed to update payment:', e);
      return null;
    }
  };

  const triggerRelease = async (id: string) => {
    const releaseDate = new Date().toISOString();

    // Optimistic update
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'completed', releaseDate } : p))
    );

    try {
      const authHeaders = await getCachedAuthHeaders();

      if (!authHeaders) {
        console.error('Cannot update payment: wallet authentication failed');
        return;
      }

      const res = await fetch('/api/payments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ id, status: 'completed', releaseDate }),
      });

      if (!res.ok) {
        console.error('PATCH failed:', res.status, await res.text());
      }
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
      const authHeaders = await getCachedAuthHeaders();

      if (!authHeaders) {
        console.error('Cannot update payment: wallet authentication failed');
        return;
      }

      const res = await fetch('/api/payments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ id, status: 'cancelled', releaseDate }),
      });

      if (!res.ok) {
        console.error('PATCH failed:', res.status, await res.text());
      }
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
    .filter((p) => p.status === 'active' || p.status === 'completed' || p.status === 'pending')
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
        updatePayment,
        triggerRelease,
        cancelPayment,
        refreshPayments,
        getAuthHeaders: getCachedAuthHeaders,
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

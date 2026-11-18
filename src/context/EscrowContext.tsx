'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { Payment, DashboardMetrics } from '@/types/payment';
import { MOCK_PAYMENTS, TOKEN_PRICES, MOCK_WALLET_BALANCE } from '@/lib/mockData';

interface EscrowContextType {
  /** Payments that actually belong to the connected wallet. */
  payments: Payment[];
  /** What the console should render: real payments, or the demo set when the
   *  sample-data toggle is on. Never a mix of both. */
  displayPayments: Payment[];
  showSampleData: boolean;
  setShowSampleData: (value: boolean) => void;
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
  // Demo records are opt-in and clearly labelled; they are never merged into
  // the wallet's real payment list.
  const [showSampleData, setShowSampleData] = useState(false);

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

  // Fetch the connected wallet's real payments from the database API.
  const refreshPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const authHeaders = await getCachedAuthHeaders();

      if (authHeaders) {
        const res = await fetch('/api/payments', { headers: authHeaders });
        if (res.ok) {
          const { data } = await res.json();
          setPayments(Array.isArray(data) ? data : []);
        } else if (res.status === 401) {
          // Auth failed — invalidate the cached headers and show no payments.
          authCacheRef.current = null;
          setPayments([]);
        } else {
          setPayments([]);
        }
      } else {
        // Not connected or auth failed — there is nothing real to show.
        setPayments([]);
      }
    } catch {
      setPayments([]);
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

    // Persist to API with wallet auth. If this fails the caller must know,
    // otherwise an on-chain escrow could exist with no database record.
    try {
      const authHeaders = await getCachedAuthHeaders();

      if (!authHeaders) {
        throw new Error('Wallet authentication failed. Please sign the message and try again.');
      }

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(newPayment),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to save payment (HTTP ${res.status})`);
      }
    } catch (e) {
      // Roll back the optimistic entry so the UI does not show a payment
      // that was never persisted.
      setPayments((prev) => prev.filter((p) => p.id !== newPayment.id));
      console.error('Failed to persist payment to API:', e);
      throw e;
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

  // Metrics always describe the wallet's real payments, never the demo set.
  const metrics: DashboardMetrics = {
    totalPaymentsVolume,
    activeEscrowsCount,
    completedTransactionsCount,
    walletBalance: MOCK_WALLET_BALANCE,
    connectedWallet: address ?? null,
  };

  const displayPayments = showSampleData ? MOCK_PAYMENTS : payments;

  return (
    <EscrowContext.Provider
      value={{
        payments,
        displayPayments,
        showSampleData,
        setShowSampleData,
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

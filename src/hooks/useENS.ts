'use client';

import { useState, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import type { Address } from 'viem';

export function useENS() {
  const [resolvedAddress, setResolvedAddress] = useState<Address | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const publicClient = usePublicClient();

  const resolveENS = useCallback(
    async (nameOrAddress: string): Promise<Address | null> => {
      setResolveError(null);

      if (!nameOrAddress) {
        setResolvedAddress(null);
        return null;
      }

      if (nameOrAddress.startsWith('0x') && nameOrAddress.length === 42) {
        setResolvedAddress(nameOrAddress as Address);
        return nameOrAddress as Address;
      }

      if (!nameOrAddress.endsWith('.eth')) {
        setResolveError('Enter a valid wallet address (0x...) or ENS name (name.eth)');
        return null;
      }

      if (!publicClient) {
        setResolveError('No RPC client available');
        return null;
      }

      setIsResolving(true);
      try {
        const address = await publicClient.getEnsAddress({ name: nameOrAddress });
        if (address) {
          setResolvedAddress(address);
          setIsResolving(false);
          return address;
        } else {
          setResolveError(`ENS name "${nameOrAddress}" could not be resolved`);
          setResolvedAddress(null);
          setIsResolving(false);
          return null;
        }
      } catch {
        setResolveError('Failed to resolve ENS name. Please try again.');
        setResolvedAddress(null);
        setIsResolving(false);
        return null;
      }
    },
    [publicClient]
  );

  const clearResolution = useCallback(() => {
    setResolvedAddress(null);
    setResolveError(null);
  }, []);

  return {
    resolvedAddress,
    isResolving,
    resolveError,
    resolveENS,
    clearResolution,
  };
}

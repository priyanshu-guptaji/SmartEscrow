'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance, useReadContract } from 'wagmi';
import { parseUnits, formatEther, decodeEventLog, type Address } from 'viem';
import { SMART_ESCROW_ABI, ERC20_ABI, TOKEN_ADDRESSES } from '@/lib/contracts';
import type { TxState, TokenSymbol } from '@/types/payment';

const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_SMART_ESCROW_ADDRESS || '') as Address;

function parseWalletError(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes('user rejected') || msg.includes('user denied') || msg.includes('action_rejected')) {
    return 'Transaction was rejected by your wallet.';
  }
  if (msg.includes('insufficient funds') || msg.includes('insufficient balance')) {
    return 'Insufficient funds for this transaction. Please add ETH to your wallet.';
  }
  if (msg.includes('wrong network') || msg.includes('chain') && msg.includes('mismatch')) {
    return 'Wrong network. Please switch MetaMask to Base Sepolia (chainId 84532).';
  }
  if (msg.includes('not deployed') || msg.includes('escrow contract not deployed')) {
    return 'SmartEscrow contract not deployed. Set NEXT_PUBLIC_SMART_ESCROW_ADDRESS in .env.local.';
  }
  if (msg.includes('nonce')) {
    return 'Transaction nonce error. Please reset your MetaMask account (Settings > Advanced > Reset Account).';
  }
  if (msg.includes('gas')) {
    return 'Transaction will exceed gas limits or gas estimation failed. Try a smaller amount.';
  }
  if (msg.includes('execution reverted')) {
    return 'Smart contract execution failed. The transaction was reverted on-chain.';
  }
  return message;
}

function getTokenAddress(token: TokenSymbol): Address | null {
  if (token === 'ETH') return null;
  const addr = TOKEN_ADDRESSES[token];
  return addr ? (addr as Address) : null;
}

function getTokenDecimals(token: TokenSymbol): number {
  if (token === 'ETH') return 18;
  if (token === 'USDC') return 6;
  if (token === 'USDT') return 6;
  return 18;
}

type CreateEscrowParams = {
  receiver: Address;
  token: TokenSymbol;
  amount: string;
  condition: string;
  duration: number;
};

type CreateScheduledEscrowParams = CreateEscrowParams & {
  releaseTimestamp: number;
};

type CreateRecurringEscrowParams = CreateEscrowParams & {
  interval: number;
};

type CreateNFTConditionalEscrowParams = CreateEscrowParams & {
  nftContract: Address;
  tokenId: number;
};

export function useEscrowContract() {
  const { address } = useAccount();
  const [txState, setTxState] = useState<TxState>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  const { isLoading: isConfirming, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const { data: balance } = useBalance({ address });

  // Derive escrowId from receipt logs (no useEffect needed)
  const escrowId = useMemo(() => {
    if (!receipt) return null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: SMART_ESCROW_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === 'EscrowCreated' && decoded.args) {
          const args = decoded.args as { id: bigint };
          return Number(args.id);
        }
      } catch {
        // Not this event
      }
    }
    return null;
  }, [receipt]);

  // Derive effective txState — if receipt arrived, we're confirmed
  const effectiveTxState: TxState = useMemo(() => {
    if (receipt && txState === 'confirming') return 'confirmed';
    return txState;
  }, [receipt, txState]);

  const createEscrow = useCallback(
    async ({ receiver, token, amount, condition, duration }: CreateEscrowParams) => {
      if (!address) throw new Error('Wallet not connected');
      if (!ESCROW_ADDRESS) throw new Error('Escrow contract not deployed. Set NEXT_PUBLIC_SMART_ESCROW_ADDRESS.');

      setTxState('preparing');
      setError(null);

      const tokenAddress = getTokenAddress(token);
      const decimals = getTokenDecimals(token);
      const amountWei = parseUnits(amount, decimals);

      try {
        if (token === 'ETH') {
          const hash = await writeContractAsync({
            address: ESCROW_ADDRESS,
            abi: SMART_ESCROW_ABI,
            functionName: 'createEscrow',
            args: [receiver, tokenAddress ?? '0x0000000000000000000000000000000000000000', amountWei, condition, BigInt(duration)],
            value: amountWei,
          });
          setTxHash(hash);
          setTxState('confirming');
          return hash;
        } else {
          if (!tokenAddress) throw new Error(`Token ${token} not configured on Base Sepolia`);

          setTxState('wallet-pending');
          const approveHash = await writeContractAsync({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [ESCROW_ADDRESS, amountWei],
          });
          setTxState('confirming');
          setTxHash(approveHash);

          setTxState('preparing');
          const hash = await writeContractAsync({
            address: ESCROW_ADDRESS,
            abi: SMART_ESCROW_ABI,
            functionName: 'createEscrow',
            args: [receiver, tokenAddress, amountWei, condition, BigInt(duration)],
          });
          setTxHash(hash);
          setTxState('confirming');
          return hash;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Transaction failed';
        const friendlyMessage = parseWalletError(message);
        setError(friendlyMessage);
        setTxState('failed');
        throw err;
      }
    },
    [address, writeContractAsync]
  );

  const createScheduledEscrow = useCallback(
    async ({ receiver, token, amount, condition, releaseTimestamp }: CreateScheduledEscrowParams) => {
      if (!address) throw new Error('Wallet not connected');
      if (!ESCROW_ADDRESS) throw new Error('Escrow contract not deployed. Set NEXT_PUBLIC_SMART_ESCROW_ADDRESS.');

      setTxState('preparing');
      setError(null);

      const tokenAddress = getTokenAddress(token);
      const decimals = getTokenDecimals(token);
      const amountWei = parseUnits(amount, decimals);

      try {
        if (token === 'ETH') {
          const hash = await writeContractAsync({
            address: ESCROW_ADDRESS,
            abi: SMART_ESCROW_ABI,
            functionName: 'createScheduledEscrow',
            args: [receiver, tokenAddress ?? '0x0000000000000000000000000000000000000000', amountWei, condition, BigInt(releaseTimestamp)],
            value: amountWei,
          });
          setTxHash(hash);
          setTxState('confirming');
          return hash;
        } else {
          if (!tokenAddress) throw new Error(`Token ${token} not configured on Base Sepolia`);

          setTxState('wallet-pending');
          const approveHash = await writeContractAsync({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [ESCROW_ADDRESS, amountWei],
          });
          setTxState('confirming');
          setTxHash(approveHash);

          setTxState('preparing');
          const hash = await writeContractAsync({
            address: ESCROW_ADDRESS,
            abi: SMART_ESCROW_ABI,
            functionName: 'createScheduledEscrow',
            args: [receiver, tokenAddress, amountWei, condition, BigInt(releaseTimestamp)],
          });
          setTxHash(hash);
          setTxState('confirming');
          return hash;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Transaction failed';
        setError(parseWalletError(message));
        setTxState('failed');
        throw err;
      }
    },
    [address, writeContractAsync]
  );

  const createRecurringEscrow = useCallback(
    async ({ receiver, token, amount, condition, interval, duration }: CreateRecurringEscrowParams) => {
      if (!address) throw new Error('Wallet not connected');
      if (!ESCROW_ADDRESS) throw new Error('Escrow contract not deployed. Set NEXT_PUBLIC_SMART_ESCROW_ADDRESS.');

      setTxState('preparing');
      setError(null);

      const tokenAddress = getTokenAddress(token);
      const decimals = getTokenDecimals(token);
      const amountWei = parseUnits(amount, decimals);

      try {
        if (token === 'ETH') {
          const hash = await writeContractAsync({
            address: ESCROW_ADDRESS,
            abi: SMART_ESCROW_ABI,
            functionName: 'createRecurringEscrow',
            args: [receiver, tokenAddress ?? '0x0000000000000000000000000000000000000000', amountWei, condition, BigInt(interval), BigInt(duration)],
            value: amountWei,
          });
          setTxHash(hash);
          setTxState('confirming');
          return hash;
        } else {
          if (!tokenAddress) throw new Error(`Token ${token} not configured on Base Sepolia`);

          setTxState('wallet-pending');
          const approveHash = await writeContractAsync({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [ESCROW_ADDRESS, amountWei],
          });
          setTxState('confirming');
          setTxHash(approveHash);

          setTxState('preparing');
          const hash = await writeContractAsync({
            address: ESCROW_ADDRESS,
            abi: SMART_ESCROW_ABI,
            functionName: 'createRecurringEscrow',
            args: [receiver, tokenAddress, amountWei, condition, BigInt(interval), BigInt(duration)],
          });
          setTxHash(hash);
          setTxState('confirming');
          return hash;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Transaction failed';
        setError(parseWalletError(message));
        setTxState('failed');
        throw err;
      }
    },
    [address, writeContractAsync]
  );

  const createNFTConditionalEscrow = useCallback(
    async ({ receiver, token, amount, condition, duration, nftContract, tokenId }: CreateNFTConditionalEscrowParams) => {
      if (!address) throw new Error('Wallet not connected');
      if (!ESCROW_ADDRESS) throw new Error('Escrow contract not deployed. Set NEXT_PUBLIC_SMART_ESCROW_ADDRESS.');

      setTxState('preparing');
      setError(null);

      const tokenAddress = getTokenAddress(token);
      const decimals = getTokenDecimals(token);
      const amountWei = parseUnits(amount, decimals);

      try {
        if (token === 'ETH') {
          const hash = await writeContractAsync({
            address: ESCROW_ADDRESS,
            abi: SMART_ESCROW_ABI,
            functionName: 'createNFTConditionalEscrow',
            args: [receiver, tokenAddress ?? '0x0000000000000000000000000000000000000000', amountWei, condition, BigInt(duration), nftContract, BigInt(tokenId)],
            value: amountWei,
          });
          setTxHash(hash);
          setTxState('confirming');
          return hash;
        } else {
          if (!tokenAddress) throw new Error(`Token ${token} not configured on Base Sepolia`);

          setTxState('wallet-pending');
          const approveHash = await writeContractAsync({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [ESCROW_ADDRESS, amountWei],
          });
          setTxState('confirming');
          setTxHash(approveHash);

          setTxState('preparing');
          const hash = await writeContractAsync({
            address: ESCROW_ADDRESS,
            abi: SMART_ESCROW_ABI,
            functionName: 'createNFTConditionalEscrow',
            args: [receiver, tokenAddress, amountWei, condition, BigInt(duration), nftContract, BigInt(tokenId)],
          });
          setTxHash(hash);
          setTxState('confirming');
          return hash;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Transaction failed';
        setError(parseWalletError(message));
        setTxState('failed');
        throw err;
      }
    },
    [address, writeContractAsync]
  );

  const releaseEscrow = useCallback(
    async (escrowId: number) => {
      if (!address) throw new Error('Wallet not connected');
      if (!ESCROW_ADDRESS) throw new Error('Escrow contract not deployed');

      setTxState('preparing');
      setError(null);

      try {
        const hash = await writeContractAsync({
          address: ESCROW_ADDRESS,
          abi: SMART_ESCROW_ABI,
          functionName: 'release',
          args: [BigInt(escrowId)],
        });
        setTxHash(hash);
        setTxState('confirming');
        return hash;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Release failed';
        setError(parseWalletError(message));
        setTxState('failed');
        throw err;
      }
    },
    [address, writeContractAsync]
  );

  const refundEscrow = useCallback(
    async (escrowId: number) => {
      if (!address) throw new Error('Wallet not connected');
      if (!ESCROW_ADDRESS) throw new Error('Escrow contract not deployed');

      setTxState('preparing');
      setError(null);

      try {
        const hash = await writeContractAsync({
          address: ESCROW_ADDRESS,
          abi: SMART_ESCROW_ABI,
          functionName: 'refund',
          args: [BigInt(escrowId)],
        });
        setTxHash(hash);
        setTxState('confirming');
        return hash;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Refund failed';
        setError(parseWalletError(message));
        setTxState('failed');
        throw err;
      }
    },
    [address, writeContractAsync]
  );

  const resolveEscrow = useCallback(
    async (escrowId: number, release: boolean) => {
      if (!address) throw new Error('Wallet not connected');
      if (!ESCROW_ADDRESS) throw new Error('Escrow contract not deployed');

      setTxState('preparing');
      setError(null);

      try {
        const hash = await writeContractAsync({
          address: ESCROW_ADDRESS,
          abi: SMART_ESCROW_ABI,
          functionName: 'resolveEscrow',
          args: [BigInt(escrowId), release],
        });
        setTxHash(hash);
        setTxState('confirming');
        return hash;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Resolve failed';
        setError(parseWalletError(message));
        setTxState('failed');
        throw err;
      }
    },
    [address, writeContractAsync]
  );

  const executeScheduledRelease = useCallback(
    async (escrowId: number) => {
      if (!address) throw new Error('Wallet not connected');
      if (!ESCROW_ADDRESS) throw new Error('Escrow contract not deployed');

      setTxState('preparing');
      setError(null);

      try {
        const hash = await writeContractAsync({
          address: ESCROW_ADDRESS,
          abi: SMART_ESCROW_ABI,
          functionName: 'executeScheduledRelease',
          args: [BigInt(escrowId)],
        });
        setTxHash(hash);
        setTxState('confirming');
        return hash;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Scheduled release failed';
        setError(parseWalletError(message));
        setTxState('failed');
        throw err;
      }
    },
    [address, writeContractAsync]
  );

  const executeRecurringPayout = useCallback(
    async (escrowId: number) => {
      if (!address) throw new Error('Wallet not connected');
      if (!ESCROW_ADDRESS) throw new Error('Escrow contract not deployed');

      setTxState('preparing');
      setError(null);

      try {
        const hash = await writeContractAsync({
          address: ESCROW_ADDRESS,
          abi: SMART_ESCROW_ABI,
          functionName: 'executeRecurringPayout',
          args: [BigInt(escrowId)],
        });
        setTxHash(hash);
        setTxState('confirming');
        return hash;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Recurring payout failed';
        setError(parseWalletError(message));
        setTxState('failed');
        throw err;
      }
    },
    [address, writeContractAsync]
  );

  const resetTxState = useCallback(() => {
    setTxState('idle');
    setTxHash(undefined);
    setError(null);
  }, []);

  return {
    txState: effectiveTxState,
    txHash,
    isConfirming,
    error,
    escrowId,
    balance: balance ? parseFloat(formatEther(balance.value)) : 0,
    createEscrow,
    createScheduledEscrow,
    createRecurringEscrow,
    createNFTConditionalEscrow,
    releaseEscrow,
    refundEscrow,
    resolveEscrow,
    executeScheduledRelease,
    executeRecurringPayout,
    resetTxState,
  };
}

export function useTokenBalance(tokenAddress: Address | undefined, ownerAddress: Address | undefined) {
  const { data } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: ownerAddress ? [ownerAddress] : undefined,
    query: { enabled: !!tokenAddress && !!ownerAddress },
  });
  return data;
}

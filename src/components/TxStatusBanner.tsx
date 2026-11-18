'use client';

import React from 'react';
import { CheckCircleIcon, WalletIcon } from './Icons';
import type { TxState } from '@/types/payment';

const EXPLORER_BASE = 'https://sepolia.basescan.org/tx/';

interface TxStatusBannerProps {
  txState: TxState;
  txHash?: string;
  /**
   * Which ERC-20 step is running: 'approve' while the token approval is in
   * flight, 'escrow' between the approval and the escrow deposit.
   */
  step?: 'approve' | 'escrow' | null;
  confirmedMessage?: string;
}

export default function TxStatusBanner({
  txState,
  txHash,
  step = null,
  confirmedMessage = 'Transaction confirmed!',
}: TxStatusBannerProps) {
  if (txState === 'idle' || txState === 'failed') return null;

  const isConfirmed = txState === 'confirmed';
  const isWaiting = txState === 'preparing' || txState === 'wallet-pending';

  let title: string;
  let detail: string;
  if (isConfirmed) {
    title = confirmedMessage;
    detail = 'The transaction has been mined on Base Sepolia.';
  } else if (isWaiting && step === 'escrow') {
    title = 'Confirm the escrow deposit in your wallet';
    detail = 'The token approval is complete. Confirm the escrow transaction in your wallet to finish the deposit.';
  } else if (isWaiting) {
    title = step === 'approve' ? 'Approve the token in your wallet' : 'Waiting for wallet confirmation';
    detail = 'Open your wallet and confirm the transaction to continue.';
  } else if (step === 'approve') {
    title = 'Approving token spend on Base Sepolia...';
    detail = 'The approval transaction was submitted and is waiting to be mined.';
  } else {
    title = 'Confirming transaction on Base Sepolia...';
    detail = 'The transaction was submitted and is waiting to be mined.';
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-lg border p-4 text-xs flex items-start gap-2.5 ${
        isConfirmed
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-blue-200 bg-blue-50 text-[#0a4d94]'
      }`}
    >
      {isConfirmed ? (
        <CheckCircleIcon size={16} className="mt-0.5 shrink-0 text-emerald-600" />
      ) : isWaiting ? (
        <WalletIcon size={16} className="mt-0.5 shrink-0" />
      ) : (
        <div className="mt-0.5 h-4 w-4 animate-spin rounded-full border-2 border-[#0a4d94] border-t-transparent shrink-0" />
      )}
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className={`mt-0.5 leading-relaxed ${isConfirmed ? 'text-emerald-700' : 'text-slate-600'}`}>
          {detail}
        </p>
        {txHash && !(isWaiting && step === 'escrow') && (
          <a
            href={`${EXPLORER_BASE}${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-mono mt-1 block truncate text-[11px] hover:underline ${
              isConfirmed ? 'text-emerald-700' : 'text-[#0a4d94]'
            }`}
          >
            {txHash}
          </a>
        )}
      </div>
    </div>
  );
}

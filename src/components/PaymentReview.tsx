'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { CheckCircleIcon, LockIcon, AlertCircleIcon, WalletIcon } from './Icons';
import type { TxState } from '@/types/payment';

interface PaymentReviewProps {
  receiverName: string;
  receiverAddress: string;
  amount: string;
  token: string;
  paymentType: string;
  condition: string;
  description: string;
  txState: TxState;
  txHash?: string;
  error?: string | null;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
}

const NETWORK_NAME = 'Base Sepolia';

export default function PaymentReview({
  receiverName,
  receiverAddress,
  amount,
  token,
  paymentType,
  condition,
  description,
  txState,
  txHash,
  error,
  onConfirm,
  onEdit,
  onCancel,
}: PaymentReviewProps) {
  const { isConnected, address } = useAccount();

  const isProcessing = txState !== 'idle' && txState !== 'failed';

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : 'Not connected';

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div>
            <h3 className="text-sm font-bold text-white">Payment Summary</h3>
            <p className="text-xs text-slate-500">Review the escrow details before confirming.</p>
          </div>
          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            Confirm Required
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-slate-500 font-semibold">Receiver</span>
            <div className="text-right">
              <p className="text-white font-semibold">{receiverName}</p>
              <p className="text-[10px] text-slate-500 font-mono">{receiverAddress}</p>
            </div>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-slate-500 font-semibold">Amount</span>
            <p className="text-white font-bold font-mono text-sm">{amount} {token}</p>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-slate-500 font-semibold">Type</span>
            <p className="text-white font-semibold capitalize">{paymentType}</p>
          </div>

          <div className="flex justify-between items-start py-2 border-b border-white/5">
            <span className="text-slate-500 font-semibold">Condition</span>
            <p className="text-slate-300 text-right max-w-xs leading-relaxed">{condition}</p>
          </div>

          {description && (
            <div className="flex justify-between items-start py-2 border-b border-white/5">
              <span className="text-slate-500 font-semibold">Description</span>
              <p className="text-slate-300 text-right max-w-xs">{description}</p>
            </div>
          )}

          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-slate-500 font-semibold">Network</span>
            <span className="text-indigo-400 font-semibold">{NETWORK_NAME}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-slate-500 font-semibold">Escrow</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <LockIcon size={12} /> Enabled
            </span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-slate-500 font-semibold">From Wallet</span>
            <span className="text-slate-300 font-mono">{shortAddress}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-400 flex items-start gap-2">
          <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold mb-1">Transaction Failed</p>
            <p className="text-rose-400/80">{error}</p>
          </div>
        </div>
      )}

      {txHash && txState === 'confirming' && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-xs text-indigo-400 flex items-center gap-2">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent shrink-0" />
          <div>
            <p className="font-semibold">Transaction pending...</p>
            <p className="text-indigo-400/70 font-mono mt-1 truncate">{txHash}</p>
          </div>
        </div>
      )}

      {txState === 'confirmed' && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircleIcon size={16} className="shrink-0" />
          <div>
            <p className="font-semibold">Escrow created successfully!</p>
            {txHash && <p className="text-emerald-400/70 font-mono mt-1 truncate">{txHash}</p>}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-2 gap-3">
        <button
          type="button"
          onClick={onEdit}
          disabled={isProcessing}
          className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
        >
          Edit Payment
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isConnected || isProcessing}
            className="glow-btn flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-8 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {!isConnected ? (
              <span className="flex items-center gap-1.5">
                <WalletIcon size={14} />
                Connect Wallet to Confirm
              </span>
            ) : isProcessing ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Processing...</span>
              </>
            ) : (
              <span className="flex items-center gap-1.5">
                <LockIcon size={14} />
                Confirm &amp; Deposit
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

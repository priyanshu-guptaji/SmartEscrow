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
      <div className="surface-card-elevated rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">Payment Summary</h3>
            <p className="text-xs text-slate-500">Review escrow details before signing the transaction.</p>
          </div>
          <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
            Confirmation Required
          </span>
        </div>

        <div className="space-y-2 text-xs divide-y divide-slate-100">
          <div className="flex justify-between items-center py-2.5">
            <span className="text-slate-500 font-medium">Recipient</span>
            <div className="text-right">
              <p className="text-slate-900 font-semibold">{receiverName}</p>
              <p className="text-[11px] text-slate-500 font-mono">{receiverAddress}</p>
            </div>
          </div>

          <div className="flex justify-between items-center py-2.5">
            <span className="text-slate-500 font-medium">Deposit Amount</span>
            <p className="text-slate-900 font-bold font-mono text-sm">{amount} {token}</p>
          </div>

          <div className="flex justify-between items-center py-2.5">
            <span className="text-slate-500 font-medium">Agreement Type</span>
            <p className="text-slate-900 font-medium capitalize">{paymentType}</p>
          </div>

          <div className="flex justify-between items-start py-2.5">
            <span className="text-slate-500 font-medium">Release Condition</span>
            <p className="text-slate-800 font-medium text-right max-w-xs leading-relaxed">{condition}</p>
          </div>

          {description && (
            <div className="flex justify-between items-start py-2.5">
              <span className="text-slate-500 font-medium">Description</span>
              <p className="text-slate-700 text-right max-w-xs">{description}</p>
            </div>
          )}

          <div className="flex justify-between items-center py-2.5">
            <span className="text-slate-500 font-medium">Network</span>
            <span className="text-[#0a4d94] font-semibold">{NETWORK_NAME}</span>
          </div>

          <div className="flex justify-between items-center py-2.5">
            <span className="text-slate-500 font-medium">Escrow Security</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <LockIcon size={12} /> Non-Custodial Smart Contract
            </span>
          </div>

          <div className="flex justify-between items-center py-2.5">
            <span className="text-slate-500 font-medium">From Wallet</span>
            <span className="text-slate-700 font-mono">{shortAddress}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircleIcon size={16} className="mt-0.5 shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold mb-0.5">Transaction Failed</p>
            <p className="text-rose-700 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {txHash && txState === 'confirming' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-[#0a4d94] flex items-center gap-2.5">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0a4d94] border-t-transparent shrink-0" />
          <div>
            <p className="font-semibold">Transaction pending on Base Sepolia...</p>
            <p className="text-slate-600 font-mono mt-0.5 truncate text-[11px]">{txHash}</p>
          </div>
        </div>
      )}

      {txState === 'confirmed' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-center gap-2.5">
          <CheckCircleIcon size={16} className="shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold">Escrow deployed successfully</p>
            {txHash && <p className="text-emerald-700 font-mono mt-0.5 truncate text-[11px]">{txHash}</p>}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-2 gap-3">
        <button
          type="button"
          onClick={onEdit}
          disabled={isProcessing}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50 text-left"
        >
          Edit Terms
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="btn-secondary rounded-md px-4 py-2.5 text-xs font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isConnected || isProcessing}
            className="btn-primary flex h-10 items-center justify-center gap-2 rounded-md px-6 text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!isConnected ? (
              <span className="flex items-center gap-1.5">
                <WalletIcon size={14} />
                Connect Wallet
              </span>
            ) : isProcessing ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Confirming Deposit...</span>
              </>
            ) : (
              <span className="flex items-center gap-1.5">
                <LockIcon size={14} />
                Lock Deposit
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

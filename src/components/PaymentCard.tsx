'use client';

import React from 'react';
import { Payment, TokenSymbol } from '@/types/payment';
import { ClockIcon, CheckCircleIcon, CancelIcon, LockIcon, ArrowUpRightIcon } from './Icons';

interface PaymentCardProps {
  payment: Payment;
  onRelease?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export default function PaymentCard({ payment, onRelease, onCancel }: PaymentCardProps) {
  const getStatusStyle = (status: Payment['status']) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          icon: <CheckCircleIcon size={14} />,
        };
      case 'cancelled':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          icon: <CancelIcon size={14} />,
        };
      case 'active':
        return {
          bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
          icon: <LockIcon size={14} className="animate-pulse" />,
        };
      case 'pending':
      default:
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          icon: <ClockIcon size={14} />,
        };
    }
  };

  const statusStyle = getStatusStyle(payment.status);

  // Helper to format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleReleaseClick = () => {
    /* 
      TODO: Web3 Smart Contract Integration
      1. Connect wallet instance using Web3Provider / wagmi / ethers.js.
      2. Call contract method: `smartEscrowContract.releaseFunds(payment.id)` 
         or `release(bytes32 agreementId)`.
      3. Await receipt of blockchain transaction block confirmation.
      4. Trigger backend indexing API webhook to update status in DB.
    */
    if (onRelease) {
      onRelease(payment.id);
    }
  };

  const handleCancelClick = () => {
    /* 
      TODO: Web3 Smart Contract Integration
      1. Call contract method: `smartEscrowContract.refundFunds(payment.id)`
         or `cancel(bytes32 agreementId)`.
      2. This will refund the locked token back to the creator wallet.
      3. Await transaction receipt.
      4. Sync status with backend API.
    */
    if (onCancel) {
      onCancel(payment.id);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col justify-between border border-white/5 relative overflow-hidden group">
      {/* Background neon accent glows on hover */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all pointer-events-none" />

      <div>
        {/* Header (Token + Amount + Status) */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 border border-white/10 font-bold text-xs text-white">
              {payment.token}
            </div>
            <div>
              <p className="text-sm font-bold text-white font-mono">
                {payment.amount} {payment.token}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
                {payment.type}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyle.bg}`}>
            {statusStyle.icon}
            <span className="capitalize">{payment.status}</span>
          </span>
        </div>

        {/* Receiver */}
        <div className="space-y-1 mb-3">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Receiver</span>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">{payment.receiverName}</span>
            <span className="font-mono text-slate-500">{payment.receiverAddress}</span>
          </div>
        </div>

        {/* Condition */}
        <div className="space-y-1 bg-slate-950/40 rounded-xl p-3 border border-white/5 mb-4 min-h-[72px]">
          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <ArrowUpRightIcon size={10} />
            Conditions of Release
          </span>
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-3" title={payment.condition}>
            {payment.condition}
          </p>
        </div>
      </div>

      {/* Footer and Action Buttons */}
      <div className="pt-2 border-t border-white/5 mt-auto flex items-center justify-between gap-4">
        <span className="text-[10px] text-slate-500 font-medium">
          Created {formatDate(payment.createdAt)}
        </span>

        {payment.status === 'active' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelClick}
              className="text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors px-2 py-1 rounded"
              title="Cancel escrow and refund wallet"
            >
              Cancel
            </button>
            <button
              onClick={handleReleaseClick}
              className="rounded-lg bg-indigo-600/90 hover:bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
            >
              Release
            </button>
          </div>
        )}

        {payment.status === 'completed' && payment.releaseDate && (
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            Released {formatDate(payment.releaseDate)}
          </span>
        )}

        {payment.status === 'cancelled' && payment.releaseDate && (
          <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
            Refunded {formatDate(payment.releaseDate)}
          </span>
        )}
      </div>
    </div>
  );
}

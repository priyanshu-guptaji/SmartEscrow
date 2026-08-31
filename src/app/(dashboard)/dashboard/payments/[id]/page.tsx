'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useEscrow } from '@/context/EscrowContext';
import { useEscrowContract } from '@/hooks/useEscrowContract';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { CheckCircleIcon, CancelIcon, ClockIcon, LockIcon, ChevronRightIcon } from '@/components/Icons';

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  active: { bg: 'bg-indigo-500/10 border-indigo-500/30', text: 'text-indigo-400', icon: <LockIcon size={14} className="animate-pulse" /> },
  completed: { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', icon: <CheckCircleIcon size={14} /> },
  cancelled: { bg: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-400', icon: <CancelIcon size={14} /> },
  pending: { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', icon: <ClockIcon size={14} /> },
};

const EXPLORER_BASE = 'https://sepolia.basescan.org/tx/';

export default function PaymentDetailPage() {
  const params = useParams();
  const { payments, getAuthHeaders } = useEscrow();
  const { isConnected } = useAccount();
  const { releaseEscrow, refundEscrow, txState, error: txError, resetTxState } = useEscrowContract();

  const paymentId = params.id as string;
  const payment = payments.find((p) => p.id === paymentId);

  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const [actionTxHash, setActionTxHash] = useState<string | null>(null);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-sm text-slate-400">Connect your wallet to continue.</p>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-sm text-slate-400">Payment not found.</p>
        <Link href="/dashboard/payments" className="text-xs text-indigo-400 font-bold hover:underline">
          View all payments
        </Link>
      </div>
    );
  }

  const effectiveStatus = localStatus || payment.status;
  const statusStyle = STATUS_STYLES[effectiveStatus] || STATUS_STYLES.pending;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleRelease = async () => {
    if (!payment.contractEscrowId && payment.contractEscrowId !== 0) {
      alert('This payment has no on-chain escrow ID. Cannot release on-chain.');
      return;
    }

    resetTxState();
    try {
      const hash = await releaseEscrow(payment.contractEscrowId);
      setActionTxHash(hash);

      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/payments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeaders || {}),
        },
        body: JSON.stringify({
          id: payment.id,
          status: 'completed',
          releasedTxHash: hash,
          releaseDate: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        setLocalStatus('completed');
      }
    } catch (err) {
      console.error('Release failed:', err);
    }
  };

  const handleRefund = async () => {
    if (!payment.contractEscrowId && payment.contractEscrowId !== 0) {
      alert('This payment has no on-chain escrow ID. Cannot refund on-chain.');
      return;
    }

    resetTxState();
    try {
      const hash = await refundEscrow(payment.contractEscrowId);
      setActionTxHash(hash);

      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/payments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeaders || {}),
        },
        body: JSON.stringify({
          id: payment.id,
          status: 'cancelled',
          refundedTxHash: hash,
          releaseDate: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        setLocalStatus('cancelled');
      }
    } catch (err) {
      console.error('Refund failed:', err);
    }
  };

  const isProcessing = txState !== 'idle' && txState !== 'failed' && txState !== 'confirmed';

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/dashboard/payments" className="hover:text-slate-300 transition-colors">Payments</Link>
        <ChevronRightIcon size={12} />
        <span className="text-slate-300 font-mono">{payment.id}</span>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Payment Details
          </h1>
          <p className="text-sm text-slate-400">{payment.description || 'Escrow payment details'}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
          {statusStyle.icon}
          <span className="capitalize">{effectiveStatus}</span>
        </span>
      </div>

      {txError && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-400">
          <p className="font-semibold mb-1">Transaction Error</p>
          <p className="text-rose-400/80">{txError}</p>
        </div>
      )}

      {actionTxHash && (txState === 'confirming' || txState === 'confirmed') && (
        <div className={`rounded-2xl border p-4 text-xs flex items-center gap-2 ${
          txState === 'confirmed'
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
            : 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400'
        }`}>
          {txState === 'confirming' && <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent shrink-0" />}
          {txState === 'confirmed' && <CheckCircleIcon size={16} className="shrink-0" />}
          <div>
            <p className="font-semibold">{txState === 'confirmed' ? 'Transaction confirmed!' : 'Transaction pending...'}</p>
            <a href={`${EXPLORER_BASE}${actionTxHash}`} target="_blank" rel="noopener noreferrer" className="font-mono mt-1 truncate block hover:underline">
              {actionTxHash}
            </a>
          </div>
        </div>
      )}

      <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-3">Payment Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Payment ID</p>
            <p className="text-white font-mono font-bold">{payment.id}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">On-Chain Escrow ID</p>
            <p className="text-white font-mono font-bold">{payment.contractEscrowId ?? 'Not deployed'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Type</p>
            <p className="text-white font-semibold capitalize">{payment.type}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Token</p>
            <p className="text-white font-bold font-mono">{payment.amount} {payment.token}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Sender</p>
            <p className="text-white font-mono text-[10px]">Connected wallet</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Receiver</p>
            <p className="text-white font-semibold">{payment.receiverName}</p>
            <p className="text-[10px] text-slate-500 font-mono">{payment.receiverAddress}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Network</p>
            <p className="text-indigo-400 font-semibold">Base Sepolia</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Created</p>
            <p className="text-white">{formatDate(payment.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-3">Release Condition</h3>
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 rounded-xl p-4 border border-white/5">
          {payment.condition}
        </p>
      </div>

      {payment.naturalLanguagePrompt && (
        <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-white/5 pb-3">Original Prompt</h3>
          <p className="text-xs text-indigo-300 italic font-mono leading-relaxed bg-slate-950/40 rounded-xl p-4 border border-white/5">
            &ldquo;{payment.naturalLanguagePrompt}&rdquo;
          </p>
        </div>
      )}

      <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-3">Transaction Log</h3>
        <div className="space-y-3 font-mono text-[10px] text-slate-400">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <span><span className="text-indigo-400">[DEPLOYED]</span> Payment created</span>
            <span>{formatDate(payment.createdAt)}</span>
          </div>
          {payment.txHash && (
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span><span className="text-amber-400">[DEPOSIT]</span> Funds deposited</span>
              <a href={`${EXPLORER_BASE}${payment.txHash}`} target="_blank" rel="noopener noreferrer" className="text-amber-400 truncate max-w-[200px] hover:underline">
                {payment.txHash.slice(0, 10)}...
              </a>
            </div>
          )}
          {payment.releasedTxHash && (
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span><span className="text-emerald-400">[RELEASED]</span> Funds released</span>
              <a href={`${EXPLORER_BASE}${payment.releasedTxHash}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 truncate max-w-[200px] hover:underline">
                {payment.releasedTxHash.slice(0, 10)}...
              </a>
            </div>
          )}
          {payment.refundedTxHash && (
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span><span className="text-rose-400">[REFUNDED]</span> Funds refunded</span>
              <a href={`${EXPLORER_BASE}${payment.refundedTxHash}`} target="_blank" rel="noopener noreferrer" className="text-rose-400 truncate max-w-[200px] hover:underline">
                {payment.refundedTxHash.slice(0, 10)}...
              </a>
            </div>
          )}
          {payment.releaseDate && (
            <div className="flex justify-between items-center">
              <span><span className="text-slate-500">[STATUS]</span> Payment {effectiveStatus}</span>
              <span>{formatDate(payment.releaseDate)}</span>
            </div>
          )}
        </div>
      </div>

      {effectiveStatus === 'active' && (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleRefund}
            disabled={isProcessing}
            className="rounded-xl border border-white/10 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Refund Payment'}
          </button>
          <button
            onClick={handleRelease}
            disabled={isProcessing}
            className="glow-btn flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </>
            ) : (
              'Release Funds'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

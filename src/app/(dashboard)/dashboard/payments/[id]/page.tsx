'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useEscrow } from '@/context/EscrowContext';
import { useEscrowContract } from '@/hooks/useEscrowContract';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { CheckCircleIcon, CancelIcon, ClockIcon, LockIcon, ChevronRightIcon } from '@/components/Icons';

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  active: { bg: 'bg-blue-50 border-blue-200', text: 'text-[#0a4d94]', icon: <LockIcon size={12} /> },
  completed: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', icon: <CheckCircleIcon size={12} /> },
  cancelled: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-800', icon: <CancelIcon size={12} /> },
  pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: <ClockIcon size={12} /> },
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
        <p className="text-sm text-slate-600">Connect your wallet to continue.</p>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-sm text-slate-600">Payment not found.</p>
        <Link href="/dashboard/payments" className="text-xs text-[#0a4d94] font-bold hover:underline">
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
        <Link href="/dashboard/payments" className="hover:text-slate-900 transition-colors">Payments</Link>
        <ChevronRightIcon size={12} />
        <span className="text-slate-700 font-mono">{payment.id}</span>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Payment Details
          </h1>
          <p className="text-sm text-slate-600 font-normal">{payment.description || 'Escrow payment agreement'}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded border px-3 py-1 text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
          {statusStyle.icon}
          <span className="capitalize">{effectiveStatus}</span>
        </span>
      </div>

      {txError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <p className="font-semibold mb-1">Transaction Error</p>
          <p className="text-rose-700 leading-relaxed">{txError}</p>
        </div>
      )}

      {actionTxHash && (txState === 'confirming' || txState === 'confirmed') && (
        <div className={`rounded-lg border p-4 text-xs flex items-center gap-2.5 ${
          txState === 'confirmed'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-blue-200 bg-blue-50 text-[#0a4d94]'
        }`}>
          {txState === 'confirming' && <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0a4d94] border-t-transparent shrink-0" />}
          {txState === 'confirmed' && <CheckCircleIcon size={16} className="shrink-0 text-emerald-600" />}
          <div>
            <p className="font-semibold">{txState === 'confirmed' ? 'Transaction confirmed!' : 'Transaction pending...'}</p>
            <a href={`${EXPLORER_BASE}${actionTxHash}`} target="_blank" rel="noopener noreferrer" className="font-mono mt-0.5 truncate block hover:underline text-[11px]">
              {actionTxHash}
            </a>
          </div>
        </div>
      )}

      <div className="surface-card rounded-lg p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Payment Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="text-slate-500 font-medium">Payment ID</p>
            <p className="text-slate-900 font-mono font-semibold">{payment.id}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-medium">On-Chain Escrow ID</p>
            <p className="text-slate-900 font-mono font-semibold">{payment.contractEscrowId ?? 'Not deployed'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-medium">Type</p>
            <p className="text-slate-900 font-medium capitalize">{payment.type}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-medium">Deposit Amount</p>
            <p className="text-slate-900 font-bold font-mono text-sm">{payment.amount} {payment.token}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-medium">Sender</p>
            <p className="text-slate-700 font-mono text-[11px]">Connected wallet</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-medium">Recipient</p>
            <p className="text-slate-900 font-semibold">{payment.receiverName}</p>
            <p className="text-[11px] text-slate-500 font-mono">{payment.receiverAddress}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-medium">Network</p>
            <p className="text-[#0a4d94] font-semibold">Base Sepolia</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-medium">Created</p>
            <p className="text-slate-700">{formatDate(payment.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="surface-card rounded-lg p-6 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Release Condition</h3>
        <p className="text-xs text-slate-800 leading-relaxed surface-inset rounded-md p-4 font-normal">
          {payment.condition}
        </p>
      </div>

      {payment.naturalLanguagePrompt && (
        <div className="surface-card rounded-lg p-6 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Original Prompt</h3>
          <p className="text-xs text-slate-700 italic font-mono leading-relaxed surface-inset rounded-md p-4">
            &ldquo;{payment.naturalLanguagePrompt}&rdquo;
          </p>
        </div>
      )}

      <div className="surface-card rounded-lg p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Transaction Log</h3>
        <div className="space-y-2.5 font-mono text-xs text-slate-600">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pb-2 border-b border-slate-100">
            <span><span className="text-[#0a4d94] font-semibold">[CREATED]</span> Payment initialized</span>
            <span className="text-slate-500 text-[11px]">{formatDate(payment.createdAt)}</span>
          </div>
          {payment.txHash && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pb-2 border-b border-slate-100">
              <span><span className="text-amber-700 font-semibold">[DEPOSIT]</span> Funds locked in smart contract</span>
              <a href={`${EXPLORER_BASE}${payment.txHash}`} target="_blank" rel="noopener noreferrer" className="text-[#0a4d94] truncate max-w-[200px] hover:underline text-[11px]">
                {payment.txHash.slice(0, 12)}...
              </a>
            </div>
          )}
          {payment.releasedTxHash && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pb-2 border-b border-slate-100">
              <span><span className="text-emerald-700 font-semibold">[RELEASED]</span> Funds released to recipient</span>
              <a href={`${EXPLORER_BASE}${payment.releasedTxHash}`} target="_blank" rel="noopener noreferrer" className="text-emerald-700 truncate max-w-[200px] hover:underline text-[11px]">
                {payment.releasedTxHash.slice(0, 12)}...
              </a>
            </div>
          )}
          {payment.refundedTxHash && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pb-2 border-b border-slate-100">
              <span><span className="text-rose-700 font-semibold">[REFUNDED]</span> Funds refunded to sender</span>
              <a href={`${EXPLORER_BASE}${payment.refundedTxHash}`} target="_blank" rel="noopener noreferrer" className="text-rose-700 truncate max-w-[200px] hover:underline text-[11px]">
                {payment.refundedTxHash.slice(0, 12)}...
              </a>
            </div>
          )}
          {payment.releaseDate && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
              <span><span className="text-slate-500">[STATUS]</span> Payment {effectiveStatus}</span>
              <span className="text-slate-500 text-[11px]">{formatDate(payment.releaseDate)}</span>
            </div>
          )}
        </div>
      </div>

      {effectiveStatus === 'active' && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <button
            onClick={handleRefund}
            disabled={isProcessing}
            className="btn-secondary rounded-md px-5 py-2.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Refund Payment'}
          </button>
          <button
            onClick={handleRelease}
            disabled={isProcessing}
            className="btn-primary flex h-10 items-center justify-center gap-2 rounded-md px-6 text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Processing...</span>
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

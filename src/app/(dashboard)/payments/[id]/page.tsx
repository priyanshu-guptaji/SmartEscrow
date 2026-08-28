'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useEscrow } from '@/context/EscrowContext';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { CheckCircleIcon, CancelIcon, ClockIcon, LockIcon, ChevronRightIcon } from '@/components/Icons';

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  active: { bg: 'bg-indigo-500/10 border-indigo-500/30', text: 'text-indigo-400', icon: <LockIcon size={14} className="animate-pulse" /> },
  completed: { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', icon: <CheckCircleIcon size={14} /> },
  cancelled: { bg: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-400', icon: <CancelIcon size={14} /> },
  pending: { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', icon: <ClockIcon size={14} /> },
};

export default function PaymentDetailPage() {
  const params = useParams();
  const { payments, triggerRelease, cancelPayment } = useEscrow();
  const { isConnected } = useAccount();

  const paymentId = params.id as string;
  const payment = payments.find((p) => p.id === paymentId);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-sm text-slate-400">Please connect your wallet to view payment details.</p>
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

  const statusStyle = STATUS_STYLES[payment.status] || STATUS_STYLES.pending;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

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
          <span className="capitalize">{payment.status}</span>
        </span>
      </div>

      <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-3">Payment Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Payment ID</p>
            <p className="text-white font-mono font-bold">{payment.id}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Type</p>
            <p className="text-white font-semibold capitalize">{payment.type}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Receiver</p>
            <p className="text-white font-semibold">{payment.receiverName}</p>
            <p className="text-[10px] text-slate-500 font-mono">{payment.receiverAddress}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Token</p>
            <p className="text-white font-bold font-mono">{payment.amount} {payment.token}</p>
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
          {payment.fundedTxHash && (
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span><span className="text-amber-400">[FUNDED]</span> Funds deposited</span>
              <span className="text-amber-400 truncate max-w-[200px]">{payment.fundedTxHash}</span>
            </div>
          )}
          {payment.releasedTxHash && (
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span><span className="text-emerald-400">[RELEASED]</span> Funds released</span>
              <span className="text-emerald-400 truncate max-w-[200px]">{payment.releasedTxHash}</span>
            </div>
          )}
          {payment.refundedTxHash && (
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span><span className="text-rose-400">[REFUNDED]</span> Funds refunded</span>
              <span className="text-rose-400 truncate max-w-[200px]">{payment.refundedTxHash}</span>
            </div>
          )}
          {payment.releaseDate && (
            <div className="flex justify-between items-center">
              <span><span className="text-slate-500">[STATUS]</span> Payment {payment.status}</span>
              <span>{formatDate(payment.releaseDate)}</span>
            </div>
          )}
        </div>
      </div>

      {payment.status === 'active' && (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => { cancelPayment(payment.id); }}
            className="rounded-xl border border-white/10 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-all"
          >
            Refund Payment
          </button>
          <button
            onClick={() => { triggerRelease(payment.id); }}
            className="glow-btn flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20"
          >
            Release Funds
          </button>
        </div>
      )}
    </div>
  );
}

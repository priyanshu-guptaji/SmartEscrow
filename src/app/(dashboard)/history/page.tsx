'use client';

import React, { useState } from 'react';
import { useEscrow } from '@/context/EscrowContext';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { CancelIcon, CheckCircleIcon, ClockIcon, LockIcon, ChevronRightIcon } from '@/components/Icons';

export default function HistoryPage() {
  const { payments } = useEscrow();
  const { isConnected } = useAccount();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredPayments = payments
    .filter((p) => {
      const matchesSearch =
        searchQuery === '' ||
        p.receiverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            <CheckCircleIcon size={10} />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
            <CancelIcon size={10} />
            Refunded
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
            <LockIcon size={10} className="animate-pulse" />
            Active
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
            <ClockIcon size={10} />
            Pending
          </span>
        );
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-sm text-slate-400">Please connect your wallet to view history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Transaction History
        </h1>
        <p className="text-sm text-slate-400">
          Chronological log of all payment activity.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by ID, receiver, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 w-40"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Refunded</option>
        </select>
      </div>

      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01] text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Payment ID</th>
                <th className="px-6 py-4">Receiver</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">TX Hash</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-300 font-medium">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-normal">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-400">
                      {payment.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-semibold">{payment.receiverName}</div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-200">
                      {payment.amount} {payment.token}
                    </td>
                    <td className="px-6 py-4 capitalize text-slate-400">{payment.type}</td>
                    <td className="px-6 py-4">{getStatusBadge(payment.status)}</td>
                    <td className="px-6 py-4 font-mono text-[10px] text-slate-500 max-w-[120px] truncate">
                      {payment.txHash || payment.fundedTxHash || '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/payments/${payment.id}`}
                        className="rounded-lg bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-indigo-400 transition-all inline-flex items-center gap-1"
                      >
                        View
                        <ChevronRightIcon size={10} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

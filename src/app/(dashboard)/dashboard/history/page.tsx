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
          <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
            <CheckCircleIcon size={10} />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-800">
            <CancelIcon size={10} />
            Refunded
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-[#0a4d94]">
            <LockIcon size={10} />
            Active
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
            <ClockIcon size={10} />
            Pending
          </span>
        );
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="surface-card rounded-lg p-8 text-center space-y-3 max-w-md">
          <p className="text-sm text-slate-600">Please connect your wallet to view transaction history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Transaction History
        </h1>
        <p className="text-sm text-slate-600 font-normal">
          Chronological log of all smart contract escrow activity.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by ID, recipient name, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md bg-white border border-slate-300 px-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0a4d94]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md bg-white border border-slate-300 px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0a4d94] w-full sm:w-40"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Refunded</option>
        </select>
      </div>

      <div className="surface-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                <th className="px-4 sm:px-6 py-3.5">Date</th>
                <th className="px-4 sm:px-6 py-3.5">Payment ID</th>
                <th className="px-4 sm:px-6 py-3.5">Recipient</th>
                <th className="px-4 sm:px-6 py-3.5">Amount</th>
                <th className="px-4 sm:px-6 py-3.5 hidden sm:table-cell">Type</th>
                <th className="px-4 sm:px-6 py-3.5">Status</th>
                <th className="px-4 sm:px-6 py-3.5 hidden md:table-cell">TX Hash</th>
                <th className="px-4 sm:px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-normal">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 sm:px-6 py-12 text-center text-slate-500 font-normal">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 sm:px-6 py-4 text-slate-500 whitespace-nowrap text-xs">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 font-mono font-semibold text-slate-800 text-xs">
                      {payment.id}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="text-slate-900 font-semibold">{payment.receiverName}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 font-mono font-bold text-slate-900">
                      {payment.amount} {payment.token}
                    </td>
                    <td className="px-4 sm:px-6 py-4 capitalize text-slate-600 hidden sm:table-cell">{payment.type}</td>
                    <td className="px-4 sm:px-6 py-4">{getStatusBadge(payment.status)}</td>
                    <td className="px-4 sm:px-6 py-4 font-mono text-[11px] text-slate-500 max-w-[120px] truncate hidden md:table-cell">
                      {payment.txHash || payment.fundedTxHash || '—'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/payments/${payment.id}`}
                        className="rounded bg-slate-100 border border-slate-200 hover:border-slate-300 hover:bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-all inline-flex items-center gap-1"
                      >
                        Details
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

'use client';

import React, { useState } from 'react';
import { useEscrow } from '@/context/EscrowContext';
import { Payment } from '@/types/payment';
import { CancelIcon, CheckCircleIcon, ClockIcon, LockIcon } from '@/components/Icons';

export default function PaymentHistoryPage() {
  const { payments } = useEscrow();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Filter logic
  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.receiverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.receiverAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' ? true : p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Payment['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
            <CheckCircleIcon size={12} />
            <span>Completed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400">
            <CancelIcon size={12} />
            <span>Refunded</span>
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">
            <LockIcon size={12} className="animate-pulse" />
            <span>Active</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
            <ClockIcon size={12} />
            <span>Pending</span>
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Transaction Audit Logs
        </h1>
        <p className="text-sm text-slate-400">
          Inspect, filter, and audit smart contract parameters and release history.
        </p>
      </div>

      {/* Filters Area */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            placeholder="Search by receiver name, address, or memo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 pl-10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
            🔍
          </div>
        </div>

        {/* Status Select */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 w-40"
          >
            <option value="all">All Logs</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Refunded</option>
          </select>
        </div>
      </div>

      {/* Tables Container */}
      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01] text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Agreement ID</th>
                <th className="px-6 py-4">Receiver</th>
                <th className="px-6 py-4">Lock Value</th>
                <th className="px-6 py-4">Agreement Type</th>
                <th className="px-6 py-4">Deployed Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-300 font-medium">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-normal">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-400">
                      {payment.id}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-white font-semibold">{payment.receiverName}</div>
                        <div className="text-[10px] text-slate-500 font-mono tracking-tight">{payment.receiverAddress}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-200">
                      {payment.amount} {payment.token}
                    </td>
                    <td className="px-6 py-4 capitalize text-slate-400">
                      {payment.type}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedPayment(payment)}
                        className="rounded-lg bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-indigo-400 transition-all"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal Overlay */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-xl rounded-3xl p-6 border border-white/10 shadow-2xl relative space-y-5 animate-in zoom-in-95 duration-150 text-slate-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  Escrow Contract Audit Detail
                </span>
                <h3 className="text-base font-extrabold text-white font-mono">
                  {selectedPayment.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-slate-500 hover:text-white transition-colors text-sm"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 text-xs">
              {/* Receiver Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Receiver Name</p>
                  <p className="text-white font-semibold text-sm">{selectedPayment.receiverName}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Wallet Address</p>
                  <p className="text-slate-200 font-mono tracking-tight">{selectedPayment.receiverAddress}</p>
                </div>
              </div>

              {/* Amount Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Locked Balance</p>
                  <p className="text-white font-bold text-sm font-mono">{selectedPayment.amount} {selectedPayment.token}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Contract Type</p>
                  <p className="text-slate-300 capitalize font-semibold">{selectedPayment.type}</p>
                </div>
              </div>

              {/* Prompt Text (If exists) */}
              {selectedPayment.naturalLanguagePrompt && (
                <div className="space-y-1">
                  <p className="text-indigo-400 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1">
                    <span>⚡ Original Natural Language Prompt</span>
                  </p>
                  <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3 font-mono text-slate-300 italic">
                    &ldquo;{selectedPayment.naturalLanguagePrompt}&rdquo;
                  </div>
                </div>
              )}

              {/* Conditions */}
              <div className="space-y-1">
                <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Cryptographic Release Condition</p>
                <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3 text-slate-300 font-medium leading-relaxed">
                  {selectedPayment.condition}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5 text-[10px] text-slate-500 font-medium">
                <div>
                  <p>DEPLOYED TIMESTAMP</p>
                  <p className="text-slate-400 font-mono mt-0.5">{formatDate(selectedPayment.createdAt)}</p>
                </div>
                {selectedPayment.releaseDate && (
                  <div>
                    <p>{selectedPayment.status === 'completed' ? 'RELEASED TIMESTAMP' : 'REFUNDED TIMESTAMP'}</p>
                    <p className="text-slate-400 font-mono mt-0.5">{formatDate(selectedPayment.releaseDate)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-white/5">
              <button
                onClick={() => setSelectedPayment(null)}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white transition-all shadow-md shadow-indigo-600/10"
              >
                Close Audit Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useEscrow } from '@/context/EscrowContext';
import { useAccount } from 'wagmi';
import PaymentCard from '@/components/PaymentCard';
import Link from 'next/link';
import { PlusIcon } from '@/components/Icons';

export default function PaymentsPage() {
  const { payments } = useEscrow();
  const { isConnected } = useAccount();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'conditional' | 'scheduled' | 'recurring'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const displayedPayments = payments.filter((p) => {
    const matchesStatus = filter === 'all' || p.status === filter;
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    const matchesSearch =
      searchQuery === '' ||
      p.receiverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.condition.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="glass-card rounded-2xl p-8 border border-white/5 text-center space-y-3 max-w-md">
          <p className="text-sm text-slate-400">Please connect your wallet to view payments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Payments
          </h1>
          <p className="text-sm text-slate-400">
            All escrow payments — active, completed, and refunded.
          </p>
        </div>
        <Link
          href="/dashboard/create-payment"
          className="glow-btn flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20"
        >
          <PlusIcon size={16} />
          <span>New Payment</span>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 pl-10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
            &#x1F50D;
          </div>
        </div>

        <div className="flex rounded-lg bg-slate-950/60 p-0.5 border border-white/5">
          {(['all', 'active', 'completed', 'cancelled'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium uppercase tracking-tight transition-all ${
                filter === t
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Types</option>
          <option value="conditional">Conditional</option>
          <option value="scheduled">Scheduled</option>
          <option value="recurring">Recurring</option>
        </select>
      </div>

      {displayedPayments.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/5 space-y-3">
          <p className="text-sm text-slate-400">No payments found matching your filters.</p>
          <Link
            href="/dashboard/create-payment"
            className="text-xs text-indigo-400 font-bold hover:underline"
          >
            Create your first payment →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayedPayments.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                />
              ))}
        </div>
      )}
    </div>
  );
}

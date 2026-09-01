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
        <div className="surface-card rounded-lg p-8 text-center space-y-3 max-w-md">
          <p className="text-sm text-slate-600">Please connect your wallet to view payments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Payments
          </h1>
          <p className="text-sm text-slate-600 font-normal">
            All escrow agreements — active, settled, and refunded.
          </p>
        </div>
        <Link
          href="/dashboard/create-payment"
          className="btn-primary flex h-10 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold shadow-sm"
        >
          <PlusIcon size={16} />
          <span>New Payment</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md bg-white border border-slate-300 px-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0a4d94]"
          />
        </div>

        <div className="flex flex-wrap rounded-md bg-slate-100 p-0.5 border border-slate-200">
          {(['all', 'active', 'completed', 'cancelled'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`rounded px-3 py-1 text-xs font-medium capitalize transition-all ${
                filter === t
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="rounded-md bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0a4d94]"
        >
          <option value="all">All Types</option>
          <option value="conditional">Conditional</option>
          <option value="scheduled">Scheduled</option>
          <option value="recurring">Recurring</option>
        </select>
      </div>

      {displayedPayments.length === 0 ? (
        <div className="surface-card rounded-lg p-12 text-center space-y-3">
          <p className="text-sm text-slate-600">No payments found matching your filters.</p>
          <Link
            href="/dashboard/create-payment"
            className="text-xs text-[#0a4d94] font-bold hover:underline"
          >
            Create your first payment
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

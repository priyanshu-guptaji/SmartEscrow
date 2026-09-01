'use client';

import React, { useState } from 'react';
import { useEscrow } from '@/context/EscrowContext';
import PaymentCard from '@/components/PaymentCard';
import Link from 'next/link';
import { PlusIcon, LockIcon, CheckCircleIcon, ArrowUpRightIcon, WalletIcon, SparklesIcon } from '@/components/Icons';

export default function DashboardPage() {
  const { payments, metrics, walletConnected } = useEscrow();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const contractAddress = process.env.NEXT_PUBLIC_SMART_ESCROW_ADDRESS;

  // Filter payments
  const displayedPayments = payments.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  return (
    <div className="space-y-8">
      {/* Title & Introduction */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Console Dashboard
          </h1>
          <p className="text-sm text-slate-600 font-normal">
            Monitor active escrow payments, release pending milestones, and deploy new conditional payments.
          </p>
        </div>
        <Link
          href="/dashboard/create-payment"
          className="btn-primary flex h-10 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold shadow-sm"
        >
          <PlusIcon size={16} />
          <span>New Escrow</span>
        </Link>
      </div>

      {/* Metrics Row (4 Cards) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Total Payments Volume */}
        <div className="surface-card rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Escrow Volume</span>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-[#0a4d94]">
              <span className="text-sm font-bold">$</span>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 font-mono">
              ${metrics.totalPaymentsVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Active + Completed deposits</p>
          </div>
        </div>

        {/* Metric 2: Active Escrows */}
        <div className="surface-card rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Escrows</span>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-50 text-amber-700">
              <LockIcon size={16} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 font-mono">
              {metrics.activeEscrowsCount}
            </h3>
            <p className="text-xs text-amber-800 font-medium mt-1">Awaiting release triggers</p>
          </div>
        </div>

        {/* Metric 3: Completed Transactions */}
        <div className="surface-card rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Completed Payouts</span>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-50 text-emerald-700">
              <CheckCircleIcon size={16} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 font-mono">
              {metrics.completedTransactionsCount}
            </h3>
            <p className="text-xs text-emerald-800 font-medium mt-1">Successfully settled</p>
          </div>
        </div>

        {/* Metric 4: Wallet Status */}
        <div className="surface-card rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Wallet Status</span>
            <div className={`flex h-2.5 w-2.5 rounded-full ${walletConnected ? 'bg-emerald-600' : 'bg-rose-500'}`} />
          </div>
          <div className="mt-3 space-y-1">
            <h3 className="text-xs font-bold text-slate-900 truncate font-mono">
              {walletConnected ? metrics.connectedWallet : 'Disconnected'}
            </h3>
            <p className="text-xs text-slate-500">
              Network: <span className="font-semibold text-slate-800">{walletConnected ? 'Base Sepolia' : 'None'}</span>
            </p>
            {walletConnected && (
              <p className="text-xs text-slate-500">
                Contract: <span className={`font-semibold ${contractAddress ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {contractAddress ? 'Deployed' : 'Not Deployed'}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Escrow Management & Sidebar guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Escrow Payments List */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">Your Agreements</h2>
            
            {/* Filter buttons */}
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
          </div>

          {displayedPayments.length === 0 ? (
            <div className="surface-card rounded-lg p-12 text-center space-y-3">
              <p className="text-sm text-slate-600">No agreements found matching your filter.</p>
              <Link
                href="/dashboard/create-payment"
                className="text-xs text-[#0a4d94] font-bold hover:underline"
              >
                Create your first escrow contract
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

        {/* Right Column: Information & Activity logs */}
        <div className="space-y-5">
          {/* Quick instructions widget */}
          <div className="surface-card rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <SparklesIcon size={14} className="text-[#0a4d94]" />
              Quick Actions
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Create real escrow payments on Base Sepolia. Release funds when conditions are met, or refund if deadlines pass.
            </p>
            <div className="space-y-2 pt-1">
              <Link
                href="/dashboard/create-payment"
                className="flex items-center justify-between rounded-md bg-slate-50 border border-slate-200 hover:bg-slate-100 p-3 text-xs font-medium text-slate-800 transition-all group"
              >
                <span>Natural Language Parser</span>
                <ArrowUpRightIcon size={12} className="text-slate-400 group-hover:text-[#0a4d94]" />
              </Link>
              <Link
                href="/dashboard/history"
                className="flex items-center justify-between rounded-md bg-slate-50 border border-slate-200 hover:bg-slate-100 p-3 text-xs font-medium text-slate-800 transition-all group"
              >
                <span>Transaction History Logs</span>
                <ArrowUpRightIcon size={12} className="text-slate-400 group-hover:text-[#0a4d94]" />
              </Link>
            </div>
          </div>

          {/* Activity Logs (Audit Logs) */}
          <div className="surface-card rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <WalletIcon size={14} className="text-emerald-700" />
              Event Stream
            </h3>
            <div className="space-y-2.5 font-mono text-xs text-slate-600">
              <div className="pb-2.5 border-b border-slate-100">
                <span className="text-emerald-700 font-semibold">[ORACLE]</span> Condition check: GitHub PR merged. Awaiting verification.
              </div>
              <div className="pb-2.5 border-b border-slate-100">
                <span className="text-[#0a4d94] font-semibold">[CONTRACT]</span> Locked 1.25 ETH in escrow on Base Sepolia.
              </div>
              <div className="pb-2.5 border-b border-slate-100">
                <span className="text-slate-700 font-semibold">[WEB3]</span> Gas estimation success: deploy escrow contract.
              </div>
              <div>
                <span className="text-amber-700 font-semibold">[PENDING]</span> 500 USDC escrow active.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

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
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Console Dashboard
          </h1>
          <p className="text-sm text-slate-400">
            Monitor active escrow payments, release pending milestones, and deploy new conditional payments.
          </p>
        </div>
        <Link
          href="/dashboard/create-payment"
          className="glow-btn flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20"
        >
          <PlusIcon size={16} />
          <span>New Escrow</span>
        </Link>
      </div>

      {/* Metrics Row (4 Cards) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Total Payments Volume */}
        <div className="glass-card rounded-2xl p-6 border border-white/5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Escrow Volume</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <span className="text-sm font-bold">$</span>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white font-mono">
              ${metrics.totalPaymentsVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-indigo-300 font-medium mt-1">Active + Completed deposits</p>
          </div>
        </div>

        {/* Metric 2: Active Escrows */}
        <div className="glass-card rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Active Escrows</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <LockIcon size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white font-mono">
              {metrics.activeEscrowsCount}
            </h3>
            <p className="text-[10px] text-amber-300 font-medium mt-1">Awaiting release triggers</p>
          </div>
        </div>

        {/* Metric 3: Completed Transactions */}
        <div className="glass-card rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Completed Payouts</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircleIcon size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white font-mono">
              {metrics.completedTransactionsCount}
            </h3>
            <p className="text-[10px] text-emerald-300 font-medium mt-1">Successfully settled</p>
          </div>
        </div>

        {/* Metric 4: Wallet Status */}
        <div className="glass-card rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Wallet Status</span>
            <div className={`flex h-2 w-2 rounded-full ${walletConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          </div>
          <div className="mt-4 space-y-1">
            <h3 className="text-sm font-bold text-white truncate font-mono">
              {walletConnected ? metrics.connectedWallet : 'Disconnected'}
            </h3>
            <p className="text-[10px] text-slate-400">
              Network: <span className="font-semibold text-indigo-400">{walletConnected ? 'Base Sepolia' : 'None'}</span>
            </p>
            {walletConnected && (
              <p className="text-[10px] text-slate-400">
                Contract: <span className={`font-semibold ${contractAddress ? 'text-emerald-400' : 'text-amber-400'}`}>
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
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Your Agreements</h2>
            
            {/* Filter buttons */}
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
          </div>

          {displayedPayments.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-white/5 space-y-3">
              <p className="text-sm text-slate-400">No agreements found matching your filter.</p>
              <Link
                href="/dashboard/create-payment"
                className="text-xs text-indigo-400 font-bold hover:underline"
              >
                Create your first escrow contract →
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

        {/* Right Column: Information & Activity logs */}
        <div className="space-y-6">
          {/* Quick instructions widget */}
          <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <SparklesIcon size={14} className="text-indigo-400" />
              Quick Sandbox Actions
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect your wallet to create real escrow payments on Base Sepolia. Release funds when conditions are met, or refund if deadlines pass.
            </p>
            <div className="space-y-2">
              <Link
                href="/dashboard/create-payment"
                className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] p-3 text-xs font-semibold text-slate-300 transition-all group"
              >
                <span>Try Natural Language Parser</span>
                <ArrowUpRightIcon size={12} className="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </Link>
              <Link
                href="/dashboard/history"
                className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] p-3 text-xs font-semibold text-slate-300 transition-all group"
              >
                <span>View Transaction Logs</span>
                <ArrowUpRightIcon size={12} className="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </Link>
            </div>
          </div>

          {/* Activity Logs (Audit Logs) */}
          <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <WalletIcon size={14} className="text-emerald-400" />
              Mock Event Stream
            </h3>
            <div className="space-y-3 font-mono text-[10px] text-slate-400">
              <div className="pb-2.5 border-b border-white/5">
                <span className="text-emerald-400">[ORACLE]</span> Condition check: GitHub PR merged for escrow. Awaiting verification.
              </div>
              <div className="pb-2.5 border-b border-white/5">
                <span className="text-indigo-400">[CONTRACT]</span> Locked 1.25 ETH in escrow for Alice Vance on Base Sepolia.
              </div>
              <div className="pb-2.5 border-b border-white/5">
                <span className="text-slate-500">[WEB3]</span> Gas estimation success: deploy escrow contract.
              </div>
              <div>
                <span className="text-amber-400">[PENDING]</span> 500 USDC escrow active. Awaiting oracle audit trigger.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

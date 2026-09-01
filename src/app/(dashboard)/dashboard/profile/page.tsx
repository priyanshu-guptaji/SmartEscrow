'use client';

import React from 'react';
import { useAccount, useBalance, useDisconnect } from 'wagmi';
import { useEscrow } from '@/context/EscrowContext';
import { WalletIcon, CheckCircleIcon, LockIcon } from '@/components/Icons';

export default function ProfilePage() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const { payments, metrics } = useEscrow();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="surface-card rounded-lg p-8 text-center space-y-3 max-w-md">
          <WalletIcon size={32} className="text-slate-400 mx-auto" />
          <p className="text-sm text-slate-600">Please connect your wallet to view your profile.</p>
        </div>
      </div>
    );
  }

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
  const formattedBalance = balance
    ? `${(Number(balance.value) / 10 ** balance.decimals).toFixed(4)} ${balance.symbol}`
    : 'Loading...';

  const stats = {
    totalCreated: payments.length,
    active: payments.filter((p) => p.status === 'active').length,
    completed: payments.filter((p) => p.status === 'completed').length,
    cancelled: payments.filter((p) => p.status === 'cancelled').length,
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Wallet Profile
        </h1>
        <p className="text-sm text-slate-600 font-normal">
          Connected account information and escrow statistics.
        </p>
      </div>

      <div className="surface-card rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Connected Wallet</h3>
          <span className="inline-flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500">Address</p>
              <p className="text-xs text-slate-900 font-mono break-all">{address}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500">Short Identifier</p>
              <p className="text-sm text-slate-900 font-mono font-semibold">{shortAddress}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500">Network</p>
              <p className="text-sm text-[#0a4d94] font-semibold">{chain?.name ?? 'Unknown'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500">Wallet Balance</p>
              <p className="text-sm text-slate-900 font-bold font-mono">{formattedBalance}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500">Permission Level</p>
              <p className="text-sm text-slate-900 font-medium">Standard Account</p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100">
          <button
            onClick={() => disconnect()}
            className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="surface-card rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-slate-900 font-mono">{stats.totalCreated}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Total Payments</p>
        </div>
        <div className="surface-card rounded-lg p-4 text-center">
          <div className="flex justify-center mb-1"><LockIcon size={16} className="text-amber-700" /></div>
          <p className="text-2xl font-bold text-slate-900 font-mono">{stats.active}</p>
          <p className="text-xs text-slate-500 font-medium">Active</p>
        </div>
        <div className="surface-card rounded-lg p-4 text-center">
          <div className="flex justify-center mb-1"><CheckCircleIcon size={16} className="text-emerald-700" /></div>
          <p className="text-2xl font-bold text-slate-900 font-mono">{stats.completed}</p>
          <p className="text-xs text-slate-500 font-medium">Completed</p>
        </div>
        <div className="surface-card rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-slate-900 font-mono">{stats.cancelled}</p>
          <p className="text-xs text-slate-500 font-medium">Refunded</p>
        </div>
      </div>

      <div className="surface-card rounded-lg p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Escrow Volume</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="text-slate-500 font-medium">Total Volume (USD)</p>
            <p className="text-slate-900 font-bold font-mono text-base">
              ${metrics.totalPaymentsVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-medium">Active Escrows</p>
            <p className="text-slate-900 font-bold font-mono text-base">{metrics.activeEscrowsCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

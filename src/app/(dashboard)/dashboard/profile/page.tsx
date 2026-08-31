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
        <div className="glass-card rounded-2xl p-8 border border-white/5 text-center space-y-3 max-w-md">
          <WalletIcon size={32} className="text-slate-500 mx-auto" />
          <p className="text-sm text-slate-400">Please connect your wallet to view your profile.</p>
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
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Wallet Profile
        </h1>
        <p className="text-sm text-slate-400">
          Your connected wallet information and account statistics.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <h3 className="text-sm font-bold text-white">Connected Wallet</h3>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Address</p>
              <p className="text-sm text-white font-mono break-all">{address}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Short Address</p>
              <p className="text-sm text-white font-mono">{shortAddress}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Network</p>
              <p className="text-sm text-indigo-400 font-semibold">{chain?.name ?? 'Unknown'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Balance</p>
              <p className="text-sm text-white font-bold font-mono">{formattedBalance}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Role</p>
              <p className="text-sm text-white">User</p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-white/5">
          <button
            onClick={() => disconnect()}
            className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-white/5 text-center">
          <p className="text-2xl font-bold text-white font-mono">{stats.totalCreated}</p>
          <p className="text-[10px] text-slate-500 font-medium mt-1">Total Payments</p>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-white/5 text-center">
          <div className="flex justify-center mb-1"><LockIcon size={16} className="text-amber-400" /></div>
          <p className="text-2xl font-bold text-white font-mono">{stats.active}</p>
          <p className="text-[10px] text-slate-500 font-medium">Active</p>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-white/5 text-center">
          <div className="flex justify-center mb-1"><CheckCircleIcon size={16} className="text-emerald-400" /></div>
          <p className="text-2xl font-bold text-white font-mono">{stats.completed}</p>
          <p className="text-[10px] text-slate-500 font-medium">Completed</p>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-white/5 text-center">
          <p className="text-2xl font-bold text-white font-mono">{stats.cancelled}</p>
          <p className="text-[10px] text-slate-500 font-medium">Cancelled</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-3">Escrow Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Total Volume (USD)</p>
            <p className="text-white font-bold font-mono text-sm">
              ${metrics.totalPaymentsVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Active Escrows</p>
            <p className="text-white font-bold font-mono text-sm">{metrics.activeEscrowsCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

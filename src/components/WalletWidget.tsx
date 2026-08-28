'use client';

import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { WalletIcon, ChevronDownIcon } from './Icons';

export default function WalletWidget() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConnectors, setShowConnectors] = useState(false);

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const formattedBalance = balance
    ? `${(Number(balance.value) / 10 ** balance.decimals).toFixed(4)} ${balance.symbol}`
    : null;

  if (isConnected && address) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2">
          {/* Balance Trigger */}
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="hidden sm:flex items-center gap-1.5 rounded-l-full bg-white/[0.03] border border-white/10 border-r-0 py-1.5 pl-4 pr-3 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-all"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{formattedBalance ?? '...'}</span>
            <ChevronDownIcon size={12} className="opacity-60" />
          </button>

          {/* Address Button */}
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 rounded-full sm:rounded-l-none sm:rounded-r-full bg-slate-900 border border-white/10 border-l-0 sm:border-l border-indigo-500/20 py-1.5 px-4 text-xs font-mono font-medium text-indigo-300 hover:text-white hover:bg-slate-800 transition-all hover:border-indigo-500/40"
          >
            <WalletIcon size={14} className="text-indigo-400" />
            <span>{shortAddress}</span>
          </button>
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#0d121f] p-2 shadow-xl z-50">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Connected Wallet
            </div>
            <div className="px-3 py-1.5 space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span className="text-slate-500">Network</span>
                <span className="font-semibold text-indigo-400">{chain?.name ?? 'Unknown'}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span className="text-slate-500">Balance</span>
                <span className="font-mono">{formattedBalance ?? '...'}</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 truncate mt-1">{address}</div>
            </div>
            <div className="border-t border-white/5 mt-2 pt-2 px-1">
              <button
                onClick={() => { disconnect(); setShowDropdown(false); }}
                className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowConnectors(!showConnectors)}
        disabled={isPending}
        className="glow-btn flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-violet-700 transition-all disabled:opacity-50"
      >
        <WalletIcon size={14} />
        <span>{isPending ? 'Connecting...' : 'Connect Wallet'}</span>
      </button>

      {showConnectors && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-[#0d121f] p-2 shadow-xl z-50">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Choose Wallet
          </div>
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => { connect({ connector }); setShowConnectors(false); }}
              className="w-full text-left rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
            >
              <WalletIcon size={12} className="text-indigo-400" />
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { WalletIcon, ChevronDownIcon, CheckIcon } from './Icons';
import { TokenSymbol } from '@/types/payment';

interface WalletWidgetProps {
  connected: boolean;
  address: string | null;
  balance: { [key in TokenSymbol]: number };
  onToggleConnect: () => void;
}

export default function WalletWidget({
  connected,
  address,
  balance,
  onToggleConnect,
}: WalletWidgetProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="relative">
      {connected ? (
        <div className="flex items-center gap-2">
          {/* Balance Dropdown Trigger */}
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="hidden sm:flex items-center gap-1.5 rounded-l-full bg-white/[0.03] border border-white/10 border-r-0 py-1.5 pl-4 pr-3 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-all"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{balance.ETH.toFixed(2)} ETH</span>
            <ChevronDownIcon size={12} className="opacity-60" />
          </button>

          {/* Address Display */}
          <button
            onClick={onToggleConnect}
            className="flex items-center gap-2 rounded-full sm:rounded-l-none sm:rounded-r-full bg-slate-900 border border-white/10 border-l-0 sm:border-l border-indigo-500/20 py-1.5 px-4 text-xs font-mono font-medium text-indigo-300 hover:text-white hover:bg-slate-800 transition-all hover:border-indigo-500/40"
            title="Click to Disconnect"
          >
            <WalletIcon size={14} className="text-indigo-400" />
            <span>{address}</span>
          </button>
        </div>
      ) : (
        <button
          onClick={onToggleConnect}
          className="glow-btn flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-violet-700 transition-all"
        >
          <WalletIcon size={14} />
          <span>Connect Wallet</span>
        </button>
      )}

      {/* Mock balances dropdown */}
      {connected && showDropdown && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#0d121f] p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Account Balances
          </div>
          <div className="space-y-1">
            {(Object.keys(balance) as TokenSymbol[]).map((token) => (
              <div
                key={token}
                className="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs hover:bg-white/5 text-slate-300"
              >
                <span className="font-semibold">{token}</span>
                <span className="font-mono">
                  {balance[token].toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 mt-2 pt-2 px-1">
            <button
              onClick={() => {
                setShowDropdown(false);
                onToggleConnect();
              }}
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

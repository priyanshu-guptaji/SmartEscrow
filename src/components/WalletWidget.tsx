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
            className="hidden sm:flex items-center gap-1.5 rounded-l-md bg-slate-50 border border-slate-300 border-r-0 py-1.5 pl-3.5 pr-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>{formattedBalance ?? '...'}</span>
            <ChevronDownIcon size={12} className="opacity-60" />
          </button>

          {/* Address Button */}
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 rounded-md sm:rounded-l-none sm:rounded-r-md bg-white border border-slate-300 py-1.5 px-3.5 text-xs font-mono font-medium text-slate-800 hover:bg-slate-50 transition-all shadow-xs"
          >
            <WalletIcon size={14} className="text-[#0a4d94]" />
            <span>{shortAddress}</span>
          </button>
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-60 rounded-lg border border-slate-200 bg-white p-2 shadow-lg z-50">
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 border-b border-slate-100">
              Connected Wallet
            </div>
            <div className="px-3 py-2 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Network</span>
                <span className="font-semibold text-[#0a4d94]">{chain?.name ?? 'Unknown'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Balance</span>
                <span className="font-mono font-semibold text-slate-900">{formattedBalance ?? '...'}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 truncate pt-1">{address}</div>
            </div>
            <div className="border-t border-slate-100 mt-1 pt-1 px-1">
              <button
                onClick={() => { disconnect(); setShowDropdown(false); }}
                className="w-full text-left rounded-md px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
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
        className="btn-primary flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold shadow-xs disabled:opacity-50"
      >
        <WalletIcon size={14} />
        <span>{isPending ? 'Connecting...' : 'Connect Wallet'}</span>
      </button>

      {showConnectors && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg z-50">
          <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 border-b border-slate-100 mb-1">
            Choose Wallet
          </div>
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => { connect({ connector }); setShowConnectors(false); }}
              className="w-full text-left rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2"
            >
              <WalletIcon size={12} className="text-[#0a4d94]" />
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

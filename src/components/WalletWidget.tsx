'use client';

import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { WalletIcon, ChevronDownIcon } from './Icons';

const METAMASK_DOWNLOAD_URL = 'https://metamask.io/download/';

/**
 * Turn wallet/connector exceptions into guidance a user can act on.
 * A missing injected provider is not a bug: it just means no browser wallet
 * extension is installed in this browser.
 */
function describeConnectError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes('provider not found') || lower.includes('providernotfound')) {
    return 'No browser wallet was detected. Install MetaMask (or another wallet extension), reload this page, or connect with Coinbase Wallet.';
  }
  if (lower.includes('user rejected') || lower.includes('user denied') || lower.includes('rejected the request')) {
    return 'You rejected the connection request in your wallet. Click Connect Wallet to try again.';
  }
  if (lower.includes('@coinbase/wallet-sdk')) {
    return 'Coinbase Wallet is unavailable in this build. Use a browser wallet extension instead.';
  }
  return message || 'Could not connect to the wallet. Please try again.';
}

export default function WalletWidget() {
  const { address, isConnected, chain } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { data: balance } = useBalance({ address });

  const [showDropdown, setShowDropdown] = useState(false);
  const [showConnectors, setShowConnectors] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const formattedBalance = balance
    ? `${(Number(balance.value) / 10 ** balance.decimals).toFixed(4)} ${balance.symbol}`
    : null;

  const hasInjectedWallet = typeof window !== 'undefined' && 'ethereum' in window;
  const isWrongNetwork = isConnected && chain !== undefined && chain.id !== baseSepolia.id;

  const handleConnect = async (connector: (typeof connectors)[number]) => {
    setConnectError(null);
    try {
      await connectAsync({ connector });
      setShowConnectors(false);
    } catch (error) {
      setConnectError(describeConnectError(error));
    }
  };

  const handleSwitchNetwork = async () => {
    setNetworkError(null);
    try {
      await switchChainAsync({ chainId: baseSepolia.id });
    } catch (error) {
      setNetworkError(
        error instanceof Error
          ? error.message
          : 'Could not switch to Base Sepolia. Switch networks in your wallet and try again.'
      );
    }
  };

  if (isConnected && address) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2">
          {/* Balance Trigger */}
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="hidden sm:flex items-center gap-1.5 rounded-l-md bg-slate-50 border border-slate-300 border-r-0 py-1.5 pl-3.5 pr-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"
          >
            <span
              className={`h-2 w-2 rounded-full ${isWrongNetwork ? 'bg-amber-500' : 'bg-emerald-500'}`}
            />
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
          <div className="absolute right-0 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg z-50">
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 border-b border-slate-100">
              Connected Wallet
            </div>
            <div className="px-3 py-2 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Network</span>
                <span className={`font-semibold ${isWrongNetwork ? 'text-amber-700' : 'text-[#0a4d94]'}`}>
                  {chain?.name ?? 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Balance</span>
                <span className="font-mono font-semibold text-slate-900">{formattedBalance ?? '...'}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 truncate pt-1">{address}</div>
            </div>

            {isWrongNetwork && (
              <div className="mx-1 mb-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                <p className="font-semibold">Base Sepolia required</p>
                <p className="mt-0.5 text-amber-800">
                  Escrows are created on Base Sepolia (chain ID 84532).
                </p>
                <button
                  onClick={handleSwitchNetwork}
                  disabled={isSwitching}
                  className="mt-2 w-full rounded border border-amber-300 bg-white px-2 py-1.5 font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  {isSwitching ? 'Switching...' : 'Switch to Base Sepolia'}
                </button>
                {networkError && <p className="mt-1 text-rose-700">{networkError}</p>}
              </div>
            )}

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
        onClick={() => {
          setShowConnectors(!showConnectors);
          setConnectError(null);
        }}
        disabled={isPending}
        className="btn-primary flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold shadow-xs disabled:opacity-50"
      >
        <WalletIcon size={14} />
        <span>{isPending ? 'Connecting...' : 'Connect Wallet'}</span>
      </button>

      {showConnectors && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg z-50">
          <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 border-b border-slate-100 mb-1">
            Choose Wallet
          </div>

          {connectors.map((connector) => {
            const isInjected = connector.type === 'injected';
            const unavailable = isInjected && !hasInjectedWallet;

            return (
              <button
                key={connector.id}
                onClick={() => handleConnect(connector)}
                disabled={isPending}
                className="w-full text-left rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center justify-between gap-2 disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <WalletIcon size={12} className="text-[#0a4d94]" />
                  {connector.name}
                </span>
                {unavailable && (
                  <span className="text-[10px] font-normal text-slate-400">not detected</span>
                )}
              </button>
            );
          })}

          {!hasInjectedWallet && (
            <p className="px-3 py-2 text-[11px] leading-relaxed text-slate-500">
              No browser wallet detected.{' '}
              <a
                href={METAMASK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#0a4d94] hover:underline"
              >
                Install MetaMask
              </a>{' '}
              and reload, or use Coinbase Wallet.
            </p>
          )}

          {connectError && (
            <div className="mx-1 mt-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] leading-relaxed text-rose-800">
              {connectError}
            </div>
          )}

          <p className="px-3 pt-2 pb-1 text-[10px] leading-relaxed text-slate-400 border-t border-slate-100 mt-1">
            You will be asked to sign a message to prove wallet ownership. Signing is free and does not
            send a transaction.
          </p>
        </div>
      )}
    </div>
  );
}

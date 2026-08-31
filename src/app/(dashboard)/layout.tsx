'use client';

import React from 'react';
import { EscrowProvider } from '@/context/EscrowContext';
import Sidebar from '@/components/Sidebar';
import WalletWidget from '@/components/WalletWidget';
import { useAccount } from 'wagmi';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { isConnected, address } = useAccount();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070a13] font-sans text-slate-100">
      {/* Left Sidebar */}
      <Sidebar
        walletConnected={isConnected}
        connectedWallet={address ?? null}
      />

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto relative z-10">
        {/* Sticky Dashboard Topbar Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/[0.06] bg-[#070a13]/80 backdrop-blur-md sticky top-0 z-30">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              SmartEscrow Console
            </span>
          </div>

          {/* Live wallet widget (self-contained, uses Wagmi internally) */}
          <WalletWidget />
        </header>

        {/* Dashboard Main Content Panel */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <EscrowProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </EscrowProvider>
  );
}

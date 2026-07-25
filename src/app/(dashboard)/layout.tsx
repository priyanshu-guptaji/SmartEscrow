'use client';

import React from 'react';
import { EscrowProvider, useEscrow } from '@/context/EscrowContext';
import Sidebar from '@/components/Sidebar';
import WalletWidget from '@/components/WalletWidget';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { walletConnected, metrics, toggleWallet, walletBalance } = useEscrow();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070a13] font-sans text-slate-100">
      {/* Left Sidebar */}
      <Sidebar
        walletConnected={walletConnected}
        connectedWallet={metrics.connectedWallet}
        toggleWallet={toggleWallet}
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

          {/* Connected wallet button widget */}
          <WalletWidget
            connected={walletConnected}
            address={metrics.connectedWallet}
            balance={walletBalance}
            onToggleConnect={toggleWallet}
          />
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

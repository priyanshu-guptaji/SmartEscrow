'use client';

import React, { useState } from 'react';
import { EscrowProvider } from '@/context/EscrowContext';
import Sidebar from '@/components/Sidebar';
import WalletWidget from '@/components/WalletWidget';
import { useAccount } from 'wagmi';
import { MenuIcon } from '@/components/Icons';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { isConnected, address } = useAccount();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070a13] font-sans text-slate-100">
      {/* Left Sidebar */}
      <Sidebar
        walletConnected={isConnected}
        connectedWallet={address ?? null}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto relative z-10 min-w-0">
        {/* Sticky Dashboard Topbar Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-8 border-b border-white/[0.06] bg-[#070a13]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Open menu"
            >
              <MenuIcon size={20} />
            </button>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              SmartEscrow Console
            </span>
          </div>

          {/* Live wallet widget (self-contained, uses Wagmi internally) */}
          <WalletWidget />
        </header>

        {/* Dashboard Main Content Panel */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
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

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LockIcon, DashboardIcon, PlusIcon, HistoryIcon, InfoIcon, WalletIcon } from './Icons';

interface SidebarProps {
  walletConnected: boolean;
  connectedWallet: string | null;
  toggleWallet: () => void;
}

export default function Sidebar({ walletConnected, connectedWallet, toggleWallet }: SidebarProps) {
  const pathname = usePathname();

  const links = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: <DashboardIcon size={18} />,
    },
    {
      name: 'Create Payment',
      href: '/dashboard/create-payment',
      icon: <PlusIcon size={18} />,
    },
    {
      name: 'Payments',
      href: '/dashboard/payments',
      icon: <LockIcon size={18} />,
    },
    {
      name: 'History',
      href: '/dashboard/history',
      icon: <HistoryIcon size={18} />,
    },
  ];

  const secondaryLinks = [
    {
      name: 'Profile',
      href: '/dashboard/profile',
      icon: <WalletIcon size={18} />,
    },
    {
      name: 'Landing Page',
      href: '/',
      icon: <InfoIcon size={18} />,
    },
  ];

  return (
    <aside className="w-64 border-r border-white/[0.06] bg-[#090d16]/95 backdrop-blur-md flex flex-col h-screen sticky top-0">
      {/* Brand Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 group-hover:scale-105 transition-all">
            <LockIcon className="text-white" size={16} />
          </div>
          <span className="font-sans text-lg font-bold tracking-tight text-white">
            Smart<span className="text-gradient">Escrow</span>
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
          Workspace
        </div>
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-500/10 text-indigo-300 border-l-2 border-indigo-500 pl-2.5'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
              }`}
            >
              {link.icon}
              <span>{link.name}</span>
            </Link>
          );
        })}

        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mt-6 mb-2">
          Info & Site
        </div>
        {secondaryLinks.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] transition-all"
          >
            {link.icon}
            <span>{link.name}</span>
          </Link>
        ))}
      </nav>

      {/* Wallet Status Area */}
      <div className="p-4 border-t border-white/[0.06] bg-[#070a13]/50">
        {walletConnected ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] p-3 text-xs">
            <div className="flex items-center justify-between font-medium text-emerald-400 mb-1">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Wallet Connected
              </span>
            </div>
            <p className="font-mono text-slate-400 truncate tracking-tight">{connectedWallet}</p>
            <button
              onClick={toggleWallet}
              className="mt-2 text-[10px] font-semibold text-rose-400 hover:text-rose-300 transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-xs text-center">
            <p className="text-slate-400 mb-2">Wallet Disconnected</p>
            <button
              onClick={toggleWallet}
              className="w-full inline-flex justify-center items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-500/10"
            >
              <WalletIcon size={12} />
              Connect Wallet
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

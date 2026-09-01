'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LockIcon, DashboardIcon, PlusIcon, HistoryIcon, InfoIcon, WalletIcon, CloseIcon } from './Icons';

interface SidebarProps {
  walletConnected: boolean;
  connectedWallet: string | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ walletConnected, connectedWallet, isOpen = false, onClose }: SidebarProps) {
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

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const sidebarContent = (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col h-full">
      {/* Brand Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
        <Link href="/" className="flex items-center gap-2.5 group" onClick={handleNavClick}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0a4d94] text-white shadow-sm transition-transform group-hover:scale-105">
            <LockIcon className="text-white" size={16} />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-slate-900">
            Smart<span className="text-[#0a4d94]">Escrow</span>
          </span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
          >
            <CloseIcon size={20} />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-400 px-3 mb-2">
          Workspace
        </div>
        {links.map((link) => {
          const isActive = link.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#ebf3fb] text-[#0a4d94] font-semibold border-l-2 border-[#0a4d94]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className={isActive ? 'text-[#0a4d94]' : 'text-slate-500'}>
                {link.icon}
              </span>
              <span>{link.name}</span>
            </Link>
          );
        })}

        <div className="text-xs font-semibold text-slate-400 px-3 mt-6 mb-2">
          Navigation
        </div>
        {secondaryLinks.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            onClick={handleNavClick}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
          >
            <span className="text-slate-500">{link.icon}</span>
            <span>{link.name}</span>
          </Link>
        ))}
      </nav>

      {/* Wallet Status Area */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        {walletConnected ? (
          <div className="rounded-lg border border-emerald-200 bg-white p-3 text-xs shadow-xs">
            <div className="flex items-center justify-between font-semibold text-emerald-800 mb-1">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                Wallet Connected
              </span>
            </div>
            <p className="font-mono text-slate-600 truncate text-[11px]">{connectedWallet}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-center shadow-xs">
            <p className="text-slate-700 font-medium">Wallet Disconnected</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Connect via header widget</p>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: always visible, sticky */}
      <div className="hidden lg:block h-screen sticky top-0">
        {sidebarContent}
      </div>

      {/* Mobile: overlay drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <div className="relative h-full w-64 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

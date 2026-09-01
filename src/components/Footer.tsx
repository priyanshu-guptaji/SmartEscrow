import React from 'react';
import Link from 'next/link';
import { LockIcon } from './Icons';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-12 text-slate-600 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Logo & Description */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0a4d94] text-white">
                <LockIcon className="text-white" size={16} />
              </div>
              <span className="font-heading text-lg font-bold tracking-tight text-slate-900">
                Smart<span className="text-[#0a4d94]">Escrow</span>
              </span>
            </Link>
            <p className="max-w-xs text-sm text-slate-600 leading-6 font-normal">
              Self-executing smart escrow contracts compiled from plain-language agreements. Non-custodial and automated.
            </p>
            <div className="flex gap-4 text-xs font-medium text-slate-500">
              <span>Network: Base Sepolia Testnet</span>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Platform</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/dashboard" className="hover:text-[#0a4d94] transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/create-payment" className="hover:text-[#0a4d94] transition-colors">
                  Create Escrow
                </Link>
              </li>
              <li>
                <Link href="/dashboard/history" className="hover:text-[#0a4d94] transition-colors">
                  Transaction History
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Resources</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-[#0a4d94] transition-colors">
                  About SmartEscrow
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#0a4d94] transition-colors">
                  Console Sandbox
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} SmartEscrow. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-slate-500">
            <span>Non-custodial cryptographic escrows</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

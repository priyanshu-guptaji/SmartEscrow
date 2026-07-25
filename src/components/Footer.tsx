import React from 'react';
import Link from 'next/link';
import { LockIcon } from './Icons';

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#04060b] py-12 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Logo & Description */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                <LockIcon className="text-white" size={16} />
              </div>
              <span className="font-sans text-lg font-bold tracking-tight text-white">
                Smart<span className="text-gradient">Escrow</span>
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-6">
              AI-Powered Web3 conditional payments, translating natural language into secure, self-executing escrows.
            </p>
            <div className="flex gap-4 text-xs font-medium text-slate-500">
              <span>Arbitrum</span>
              <span>•</span>
              <span>Optimism</span>
              <span>•</span>
              <span>Ethereum</span>
              <span>•</span>
              <span>Solana</span>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-sm font-semibold text-white">Platform</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/create-payment" className="hover:text-white transition-colors">
                  Create Escrow
                </Link>
              </li>
              <li>
                <Link href="/dashboard/payment-history" className="hover:text-white transition-colors">
                  Transaction Audit
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="text-sm font-semibold text-white">Resources</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <span className="text-slate-600 cursor-not-allowed">Documentation (Soon)</span>
              </li>
              <li>
                <span className="text-slate-600 cursor-not-allowed">Smart Contracts (Soon)</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/[0.04] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} SmartEscrow. Mock UI demonstrating next-gen Web3 UX. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <span className="hover:text-white cursor-pointer transition-colors">Twitter</span>
            <span className="hover:text-white cursor-pointer transition-colors">Discord</span>
            <span className="hover:text-white cursor-pointer transition-colors">GitHub</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

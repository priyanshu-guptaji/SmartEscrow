'use client';

import React from 'react';
import Link from 'next/link';
import HeroSection from '@/components/HeroSection';
import FeatureCards from '@/components/FeatureCards';
import { LockIcon, SparklesIcon, ShieldCheckIcon, WalletIcon } from '@/components/Icons';

export default function LandingPage() {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <HeroSection />

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Escrow Architecture
          </h2>
          <p className="max-w-xl mx-auto text-sm text-slate-600 font-normal">
            Automated conditional payouts running on immutable smart contracts.
          </p>
        </div>
        <FeatureCards />
      </section>

      {/* How It Works (4 Steps) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            How It Works
          </h2>
          <p className="max-w-xl mx-auto text-sm text-slate-600 font-normal">
            From plain-text agreement terms to automatic on-chain release in four steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {/* Connector Line for Desktop */}
          <div className="hidden md:block absolute top-7 left-[12%] right-[12%] h-[1px] bg-slate-200 z-0" />
          
          {[
            {
              step: '1',
              title: 'Connect Wallet',
              description: 'Link your Web3 wallet. Instant setup with zero sign-up forms or credit checks required.',
              icon: <WalletIcon className="text-[#0a4d94]" size={18} />
            },
            {
              step: '2',
              title: 'Define Conditions',
              description: 'State your payout rules in plain text. Define the recipient address, token, and release outcome.',
              icon: <SparklesIcon className="text-[#0a4d94]" size={18} />
            },
            {
              step: '3',
              title: 'Lock Funds',
              description: 'Confirm the transaction in your wallet. Tokens are locked inside an audited smart contract.',
              icon: <LockIcon className="text-[#0a4d94]" size={18} />
            },
            {
              step: '4',
              title: 'Automatic Release',
              description: 'When oracles verify condition compliance, funds transfer automatically to the recipient.',
              icon: <ShieldCheckIcon className="text-emerald-700" size={18} />
            }
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center text-center space-y-3 relative z-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white border border-slate-300 shadow-xs text-slate-900 relative">
                {item.icon}
                <span className="absolute -top-2 -right-2 text-xs font-bold text-white bg-[#0a4d94] px-1.5 py-0.5 rounded">
                  {item.step}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-[240px] font-normal">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Why Use SmartEscrow?
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed font-normal">
              Traditional contracts require legal intermediaries, escrow fees, and manual approval delays. SmartEscrow replaces intermediaries with self-executing blockchain code, enabling instantaneous settlement for transactions of any size.
            </p>
            <div className="space-y-3">
              {[
                'Non-custodial smart contracts protect funds from platform risk',
                'Layer-2 network deployment keeps gas costs under $0.05',
                'Automated oracle verification removes manual payment disputes'
              ].map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs text-slate-700 font-medium justify-center lg:justify-start">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    ✓
                  </div>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="surface-card rounded-lg p-6 space-y-2">
              <span className="text-xs font-semibold text-[#0a4d94] bg-[#ebf3fb] border border-blue-200 px-2 py-0.5 rounded">
                Gas Optimized
              </span>
              <h3 className="text-base font-bold text-slate-900 pt-1">Low-Cost Routing</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Optimized Solidity contracts deployed on Base Sepolia and Ethereum L2s keep gas overhead to cents per transaction.
              </p>
            </div>
            
            <div className="surface-card rounded-lg p-6 space-y-2">
              <span className="text-xs font-semibold text-[#0a4d94] bg-[#ebf3fb] border border-blue-200 px-2 py-0.5 rounded">
                Verification
              </span>
              <h3 className="text-base font-bold text-slate-900 pt-1">Flexible Oracles</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Verify milestone criteria automatically via GitHub pull requests, delivery endpoints, or on-chain time locks.
              </p>
            </div>
            
            <div className="surface-card rounded-lg p-6 space-y-2">
              <span className="text-xs font-semibold text-[#0a4d94] bg-[#ebf3fb] border border-blue-200 px-2 py-0.5 rounded">
                No-Code
              </span>
              <h3 className="text-base font-bold text-slate-900 pt-1">Plain Text Inputs</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                No Solidity knowledge required. Write simple terms and the parser compiles them into verified contract calls.
              </p>
            </div>
            
            <div className="surface-card rounded-lg p-6 space-y-2">
              <span className="text-xs font-semibold text-[#0a4d94] bg-[#ebf3fb] border border-blue-200 px-2 py-0.5 rounded">
                Transparent
              </span>
              <h3 className="text-base font-bold text-slate-900 pt-1">Full Audit Trail</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Every escrow event, deposit, and oracle verification is logged directly on-chain with verifiable block explorer hashes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="surface-card-elevated rounded-xl p-8 sm:p-12 text-center space-y-6">
          <div className="space-y-3 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Create Your First Escrow Agreement
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed font-normal">
              Connect your wallet, describe your payout conditions, and deploy a secure escrow agreement on Base Sepolia in under two minutes.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-3">
              <Link
                href="/dashboard"
                className="btn-primary flex h-11 items-center justify-center rounded-md px-7 text-sm font-semibold shadow-sm w-full sm:w-auto"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/dashboard/create-payment"
                className="btn-secondary flex h-11 items-center justify-center rounded-md px-6 text-sm font-medium w-full sm:w-auto"
              >
                Create Escrow Contract
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

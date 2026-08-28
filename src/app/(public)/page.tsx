'use client';

import React from 'react';
import Link from 'next/link';
import HeroSection from '@/components/HeroSection';
import FeatureCards from '@/components/FeatureCards';
import { LockIcon, SparklesIcon, ShieldCheckIcon, WalletIcon } from '@/components/Icons';

export default function LandingPage() {
  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <HeroSection />

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Core Features of Smart<span className="text-gradient">Escrow</span>
          </h2>
          <p className="max-w-xl mx-auto text-sm text-slate-400">
            A secure foundation built on AI processing, distributed consensus, and decentralized smart contracts.
          </p>
        </div>
        <FeatureCards />
      </section>

      {/* How It Works (4 Steps) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            How It Works
          </h2>
          <p className="max-w-xl mx-auto text-sm text-slate-400">
            From conversational plain-text setup to secure cryptographic release in four easy steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {/* Connector Line for Desktop */}
          <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-[1px] bg-gradient-to-r from-indigo-500/10 via-violet-500/30 to-indigo-500/10 z-0" />
          
          {[
            {
              step: '01',
              title: 'Connect Wallet',
              description: 'Link your Web3 wallet securely. Authenticate in seconds with zero personal details or credit checks required.',
              icon: <WalletIcon className="text-indigo-400" size={20} />
            },
            {
              step: '02',
              title: 'Type Terms',
              description: 'Describe the payment conditions in plain English. Specify the receiver address, token type, and lock amount.',
              icon: <SparklesIcon className="text-violet-400" size={20} />
            },
            {
              step: '03',
              title: 'Lock Funds',
              description: 'Confirm the transaction in your wallet. The specified tokens are locked securely inside a decentralized smart contract.',
              icon: <LockIcon className="text-cyan-400" size={20} />
            },
            {
              step: '04',
              title: 'Auto-Release',
              description: 'Oracles verify compliance automatically. Once condition checks pass, funds transfer instantly to the recipient.',
              icon: <ShieldCheckIcon className="text-emerald-400" size={20} />
            }
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center text-center space-y-4 relative z-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 border border-white/10 shadow-lg text-white font-mono font-bold text-lg relative">
                {item.icon}
                <span className="absolute -top-2 -right-2 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-md">
                  {item.step}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-[240px]">
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
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Why Choose SmartEscrow?
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Traditional contracts are slow and expensive, requiring legal fees and human trust. SmartEscrow replaces lawyers with cryptographic code and AI agents, enabling automated escrow for micro-transactions and enterprise payments alike.
            </p>
            <div className="space-y-4">
              {[
                'Non-custodial smart contracts protect funds from platform hacks',
                'Layer-2 scaling delivers lightning-fast payments under $0.05 gas',
                'Custom dispute resolution and automated oracle checks'
              ].map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs text-slate-300 font-medium justify-center lg:justify-start">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    ✓
                  </div>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-3">
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Ultra-Low Cost
              </span>
              <h3 className="text-lg font-bold text-white">Gas-Optimized Routing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                By utilizing optimized smart contracts on Arbitrum, Base, and Solana, we minimize transaction fees. Secure contracts execute with a fraction of normal gas charges.
              </p>
            </div>
            
            <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-3">
              <span className="text-[10px] font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Automated Verification
              </span>
              <h3 className="text-lg font-bold text-white">Flexible Oracle Integrations</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Easily track GitHub PR merges, stock and token market price action, shipping status API endpoints, or time deadlines. Web2 hooks run via Chainlink Functions.
              </p>
            </div>
            
            <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-3">
              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Zero Setup
              </span>
              <h3 className="text-lg font-bold text-white">No-Code Deployments</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                No solidity skills needed. Write plain text, and we generate, compile, and configure the smart contract behind the scenes, leaving you with simple approvals.
              </p>
            </div>
            
            <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-3">
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Completely Open
              </span>
              <h3 className="text-lg font-bold text-white">Audit Trail Logging</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every escrow lifecycle event, condition evaluation, and oracle verification is logged permanently on-chain. Audit and verify transactions instantly with block explorers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-3xl p-8 sm:p-12 text-center space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-violet-500/5" />
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 space-y-4 max-w-xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Ready to Lock Your First Payment?
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Experience the ease of conditional crypto payments. Connect your Web3 wallet, describe your terms, and deploy your custom secure escrow agreement in under two minutes.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link
                href="/dashboard"
                className="glow-btn flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-8 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-violet-700 transition-all w-full sm:w-auto"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/dashboard/create-payment"
                className="flex h-12 items-center justify-center rounded-full border border-white/10 px-8 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-all w-full sm:w-auto"
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

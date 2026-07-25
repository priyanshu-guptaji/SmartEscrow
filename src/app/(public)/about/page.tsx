import React from 'react';
import Link from 'next/link';
import { LockIcon, SparklesIcon, ShieldCheckIcon, TerminalIcon } from '@/components/Icons';

export default function AboutPage() {
  const pillars = [
    {
      title: 'Conversational UI to Smart Contract',
      description: 'By matching Large Language Models (LLMs) with precise abstract syntax trees (ASTs), we map human intentions directly to EVM bytecode. This removes the coding barrier and makes smart contract technology accessible to everyone.',
      icon: <TerminalIcon className="text-indigo-400" size={20} />,
    },
    {
      title: 'Decentralized Oracle Networks',
      description: 'SmartEscrow connects with decentralized oracle systems like Chainlink. Contracts can safely fetch APIs, query databases, check GitHub releases, verify payment API endpoints, and pull real-world weather metrics to execute code.',
      icon: <SparklesIcon className="text-violet-400" size={20} />,
    },
    {
      title: 'Trustless Escrows',
      description: 'Your capital is completely secure. The application is non-custodial: funds are locked directly in audited open-source smart contracts. The code holds the money, and the code releases it only when release parameters match.',
      icon: <ShieldCheckIcon className="text-emerald-400" size={20} />,
    },
  ];

  const milestones = [
    {
      phase: 'Phase 1',
      title: 'Core Architecture (Current)',
      description: 'Designing high-fidelity prototypes, frontend interface components, user flow mapping, and mock state configurations.',
    },
    {
      phase: 'Phase 2',
      title: 'AI Parsing & LLM Integration',
      description: 'Implementing LLM parsing APIs to translate natural language prompts into standardized JSON schemas containing release rules.',
    },
    {
      phase: 'Phase 3',
      title: 'EVM Smart Contract Deployment',
      description: 'Writing, testing, and deploying audited Solidity smart contracts on testnets (Arbitrum, Base, Sepolia) and implementing WalletConnect.',
    },
    {
      phase: 'Phase 4',
      title: 'Oracle Consensus & Mainnet',
      description: 'Integrating Chainlink Functions and standard API oracles to verify outcomes, followed by official mainnet deployment.',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      {/* Introduction */}
      <section className="text-center space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-2">
          <LockIcon size={24} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          About SmartEscrow
        </h1>
        <p className="max-w-2xl mx-auto text-base text-slate-400 leading-relaxed">
          SmartEscrow was built to bridge the gap between complex blockchain code and everyday business agreements. We make cryptocurrency transactions smart, safe, and conversational.
        </p>
      </section>

      {/* Pillars */}
      <section className="space-y-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white text-center">
          Our Three Technological Pillars
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((pillar, idx) => (
            <div key={idx} className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] border border-white/5">
                {pillar.icon}
              </div>
              <h3 className="text-base font-bold text-white">{pillar.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Concept Flow Diagram */}
      <section className="glass-panel rounded-3xl p-8 border border-white/5 space-y-6">
        <h3 className="text-lg font-bold text-white text-center md:text-left">
          The Trustless Execution Cycle
        </h3>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-1 md:max-w-[200px]">
            <p className="text-sm font-bold text-indigo-400">1. Natural Intent</p>
            <p className="text-xs text-slate-400">User describes the condition using ordinary language.</p>
          </div>
          <span className="text-slate-600 hidden md:inline">→</span>
          <div className="space-y-1 md:max-w-[200px]">
            <p className="text-sm font-bold text-violet-400">2. Smart Lock</p>
            <p className="text-xs text-slate-400">Funds are locked securely in the Escrow Smart Contract.</p>
          </div>
          <span className="text-slate-600 hidden md:inline">→</span>
          <div className="space-y-1 md:max-w-[200px]">
            <p className="text-sm font-bold text-cyan-400">3. Oracle Monitor</p>
            <p className="text-xs text-slate-400">Chainlink or custom API bridges check condition state.</p>
          </div>
          <span className="text-slate-600 hidden md:inline">→</span>
          <div className="space-y-1 md:max-w-[200px]">
            <p className="text-sm font-bold text-emerald-400">4. Auto Payout</p>
            <p className="text-xs text-slate-400">Contract triggers and pays the receiver automatically.</p>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="space-y-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white text-center">
          Development Roadmap
        </h2>
        <div className="relative border-l border-white/10 pl-6 ml-4 space-y-8 max-w-2xl mx-auto">
          {milestones.map((milestone, idx) => (
            <div key={idx} className="relative">
              {/* Bullet Node */}
              <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-[#070a13] ${
                idx === 0 
                  ? 'border-indigo-500 shadow-sm shadow-indigo-500/50' 
                  : 'border-white/20'
              }`} />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    idx === 0 
                      ? 'bg-indigo-500/10 text-indigo-400' 
                      : 'bg-white/5 text-slate-400'
                  }`}>
                    {milestone.phase}
                  </span>
                  <h4 className="text-sm font-bold text-white">{milestone.title}</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {milestone.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center pt-8 border-t border-white/[0.06]">
        <Link
          href="/dashboard"
          className="glow-btn inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-8 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20"
        >
          Explore the Sandbox
        </Link>
      </section>
    </div>
  );
}

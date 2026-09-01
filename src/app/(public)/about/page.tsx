import React from 'react';
import Link from 'next/link';
import { LockIcon, SparklesIcon, ShieldCheckIcon, TerminalIcon } from '@/components/Icons';

export default function AboutPage() {
  const pillars = [
    {
      title: 'Natural Intent to Bytecode',
      description: 'We map plain-language business conditions directly to EVM smart contract parameters. This removes manual drafting friction while preserving cryptographic security.',
      icon: <TerminalIcon className="text-[#0a4d94]" size={20} />,
    },
    {
      title: 'Decentralized Oracle Bridges',
      description: 'SmartEscrow connects to decentralized oracle networks and custom API bridges to verify real-world triggers: GitHub PR merges, delivery confirmations, API webhooks, and deadlines.',
      icon: <SparklesIcon className="text-[#0a4d94]" size={20} />,
    },
    {
      title: 'Non-Custodial Security',
      description: 'Funds are locked directly in audited smart contracts. Neither SmartEscrow nor any third party holds discretionary custody over escrow balances.',
      icon: <ShieldCheckIcon className="text-emerald-700" size={20} />,
    },
  ];

  const milestones = [
    {
      phase: 'Phase 1',
      title: 'Core Protocol Architecture',
      description: 'Interface architecture, escrow state management, and wallet connector infrastructure.',
      done: true,
    },
    {
      phase: 'Phase 2',
      title: 'Natural Language Compiler',
      description: 'Gemini AI parsing engine with deterministic rule-based validation, converting plain English terms into structured escrow parameters.',
      done: true,
    },
    {
      phase: 'Phase 3',
      title: 'Smart Contract Deployment',
      description: 'Solidity contracts supporting conditional, scheduled, recurring, and NFT escrow types on Base Sepolia.',
      done: true,
    },
    {
      phase: 'Phase 4',
      title: 'Automated Oracle Network',
      description: 'Event listener and scheduler for automated payout execution, with blockchain event synchronization to the database.',
      done: true,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Introduction */}
      <section className="text-center space-y-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#ebf3fb] border border-blue-200 text-[#0a4d94] mb-1">
          <LockIcon size={20} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
          About SmartEscrow
        </h1>
        <p className="max-w-2xl mx-auto text-base text-slate-600 leading-relaxed font-normal">
          SmartEscrow replaces traditional escrow overhead with automated smart contracts, enabling instant, transparent, and conditional cryptocurrency transactions.
        </p>
      </section>

      {/* Pillars */}
      <section className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center">
          Core Principles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {pillars.map((pillar, idx) => (
            <div key={idx} className="surface-card rounded-lg p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 border border-slate-200">
                {pillar.icon}
              </div>
              <h3 className="text-base font-bold text-slate-900">{pillar.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Concept Flow Diagram */}
      <section className="surface-card-elevated rounded-xl p-8 space-y-6">
        <h3 className="text-base font-bold text-slate-900 text-center md:text-left">
          The Escrow Lifecycle
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center md:text-left">
          <div className="surface-inset rounded-lg p-4 space-y-1">
            <p className="text-xs font-bold text-[#0a4d94]">1. Agreement Definition</p>
            <p className="text-xs text-slate-600">User defines the terms in natural language.</p>
          </div>
          <div className="surface-inset rounded-lg p-4 space-y-1">
            <p className="text-xs font-bold text-[#0a4d94]">2. Smart Lock</p>
            <p className="text-xs text-slate-600">Tokens are locked in an audited smart contract.</p>
          </div>
          <div className="surface-inset rounded-lg p-4 space-y-1">
            <p className="text-xs font-bold text-[#0a4d94]">3. Oracle Verification</p>
            <p className="text-xs text-slate-600">Automated oracles verify milestone completion.</p>
          </div>
          <div className="surface-inset rounded-lg p-4 space-y-1">
            <p className="text-xs font-bold text-emerald-800">4. Payout Settlement</p>
            <p className="text-xs text-slate-600">Contract transfers funds to the recipient.</p>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center">
          Development Roadmap
        </h2>
        <div className="border-l-2 border-slate-200 pl-6 ml-4 space-y-8 max-w-2xl mx-auto">
          {milestones.map((milestone, idx) => (
            <div key={idx} className="relative">
              <span className={`absolute -left-[31px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 bg-white ${
                milestone.done
                  ? 'border-emerald-600 bg-emerald-600'
                  : 'border-slate-300 bg-white'
              }`} />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    milestone.done
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {milestone.phase}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">{milestone.title}</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  {milestone.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center pt-8 border-t border-slate-200">
        <Link
          href="/dashboard"
          className="btn-primary inline-flex h-11 items-center justify-center rounded-md px-7 text-sm font-semibold shadow-sm"
        >
          Open Console Sandbox
        </Link>
      </section>
    </div>
  );
}

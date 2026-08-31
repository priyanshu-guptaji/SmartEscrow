'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, SparklesIcon, LockIcon, TerminalIcon } from './Icons';

const SIMULATION_STEPS = [
  {
    input: "Send Alice 2.5 ETH if she deploys the mainnet contract before Friday afternoon.",
    parsed: {
      recipient: "Alice Vance (0x71C...65B2)",
      amount: "2.5 ETH",
      condition: "Mainnet contract deployment completed",
      type: "Conditional Escrow"
    }
  },
  {
    input: "Escrow 1000 USDC for Bob. Release when the frontend audit gets 0 warnings.",
    parsed: {
      recipient: "Bob Builder (0x3Fd...19a2)",
      amount: "1,000 USDC",
      condition: "Frontend audit report has 0 warnings",
      type: "Conditional Escrow"
    }
  },
  {
    input: "Pay Charlie 0.5 ETH when test coverage hits 100%.",
    parsed: {
      recipient: "Charlie Dev (0x742d...D38)",
      amount: "0.5 ETH",
      condition: "Test suite achieves 100% code coverage",
      type: "Conditional Escrow"
    }
  }
];

export default function HeroSection() {
  const [stepIdx, setStepIdx] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showParsed, setShowParsed] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: NodeJS.Timeout;
    const fullText = SIMULATION_STEPS[stepIdx].input;
    
    const typeCharacter = (index: number) => {
      if (!active) return;
      if (index <= fullText.length) {
        setDisplayText(fullText.slice(0, index));
        timer = setTimeout(() => typeCharacter(index + 1), 35);
      } else {
        setIsTyping(false);
        // Show parsing animation after typing completes
        timer = setTimeout(() => {
          if (active) setShowParsed(true);
          // Wait and move to next prompt
          timer = setTimeout(() => {
            if (active) {
              setShowParsed(false);
              setIsTyping(true);
              setDisplayText('');
              setStepIdx((prev) => (prev + 1) % SIMULATION_STEPS.length);
            }
          }, 4500);
        }, 800);
      }
    };

    typeCharacter(0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [stepIdx]);

  return (
    <div className="relative overflow-hidden pt-20 pb-16 lg:pt-32 lg:pb-24">
      {/* Decorative radial blur element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
          
          {/* Hero Left Column */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
              <SparklesIcon size={12} className="animate-pulse" />
              <span>Next-Gen Web3 Payments</span>
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.1]">
              Conditional Payments <br className="hidden sm:inline" />
              via <span className="text-gradient">Natural Language</span>
            </h1>
            
            <p className="max-w-2xl mx-auto lg:mx-0 text-base sm:text-lg text-slate-400 leading-relaxed">
              Describe your contract terms in plain English. SmartEscrow translates your intent, locks funds in trustless smart contracts, and triggers automated release based on real-world outcomes.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-4 pt-2">
              <Link
                href="/dashboard"
                className="glow-btn flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-8 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:from-indigo-600 hover:to-violet-700 transition-all"
              >
                <span>Launch App</span>
                <ArrowRightIcon size={16} />
              </Link>
              <Link
                href="/about"
                className="flex h-12 w-full sm:w-auto items-center justify-center rounded-full border border-white/10 px-8 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-all"
              >
                Learn How It Works
              </Link>
            </div>

            {/* Quick trust metrics */}
            <div className="pt-8 border-t border-white/[0.06] grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-white font-mono">0%</p>
                <p className="text-xs text-slate-500 font-medium">Platform Custody</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-white font-mono">100%</p>
                <p className="text-xs text-slate-500 font-medium">Decentralized</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-white font-mono">5+</p>
                <p className="text-xs text-slate-500 font-medium">Chains Supported</p>
              </div>
            </div>
          </div>

          {/* Hero Right Column - Simulated AI Parsing Interaction */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="glass-panel w-full max-w-xl mx-auto rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
              
              {/* Mock Window Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-rose-500/40" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/40" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/40" />
                </div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <TerminalIcon size={10} />
                  AI Escrow Compiler
                </div>
              </div>

              {/* Chat Input Container */}
              <div className="space-y-4">
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-white/5 relative min-h-[96px] flex flex-col justify-between">
                  <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider block mb-1">
                    Describe Agreement:
                  </span>
                  <p className="text-sm font-mono text-slate-300 leading-relaxed flex-1">
                    {displayText}
                    {isTyping && <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-0.5 animate-pulse" />}
                  </p>
                </div>

                {/* Parsing Loader / Output State */}
                <div className="min-h-[190px] flex flex-col justify-center">
                  {!showParsed ? (
                    <div className="text-center py-8 space-y-2 opacity-50">
                      <div className="h-8 w-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin mx-auto" />
                      <p className="text-xs text-slate-400 font-mono">Awaiting prompt completion...</p>
                    </div>
                  ) : (
                    <div className="border border-indigo-500/20 bg-indigo-500/[0.02] rounded-2xl p-4 space-y-3 animate-in zoom-in-95 duration-200">
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                          <SparklesIcon size={10} />
                          Parsed Parameters
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <LockIcon size={8} /> Ready to Deploy
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <div>
                          <p className="text-slate-500">Recipient</p>
                          <p className="text-slate-200 font-semibold truncate">{SIMULATION_STEPS[stepIdx].parsed.recipient}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Lock Amount</p>
                          <p className="text-white font-extrabold">{SIMULATION_STEPS[stepIdx].parsed.amount}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-slate-500">Oracle Release Condition</p>
                          <p className="text-slate-300 leading-relaxed">{SIMULATION_STEPS[stepIdx].parsed.condition}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Agreement Type</p>
                          <p className="text-indigo-300">{SIMULATION_STEPS[stepIdx].parsed.type}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

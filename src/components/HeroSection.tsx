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
    <div className="relative pt-12 pb-16 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
          
          {/* Hero Left Column */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-[#ebf3fb] px-3.5 py-1 text-xs font-semibold text-[#0a4d94]">
              <span>Conditional Payments Protocol</span>
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.1]">
              Smart Escrow <br className="hidden sm:inline" />
              in <span className="text-[#0a4d94]">Plain English</span>
            </h1>
            
            <p className="max-w-2xl mx-auto lg:mx-0 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              State your payment conditions in plain words. SmartEscrow translates your terms into self-executing smart contracts and releases funds when milestones are verified.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-3 pt-2">
              <Link
                href="/dashboard"
                className="btn-primary flex h-12 w-full sm:w-auto items-center justify-center rounded-md px-7 text-sm font-semibold shadow-sm"
              >
                Open Console
              </Link>
              <Link
                href="/about"
                className="btn-secondary flex h-12 w-full sm:w-auto items-center justify-center rounded-md px-6 text-sm font-medium"
              >
                How It Works
              </Link>
            </div>

            {/* Quick trust metrics */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0">
              <div>
                <p className="text-2xl font-bold text-slate-900 font-mono">0%</p>
                <p className="text-xs text-slate-500 font-medium">Platform Custody</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 font-mono">100%</p>
                <p className="text-xs text-slate-500 font-medium">On-Chain Locked</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 font-mono">5+</p>
                <p className="text-xs text-slate-500 font-medium">Supported Chains</p>
              </div>
            </div>
          </div>

          {/* Hero Right Column - Simulated Natural Language Parsing Interaction */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="surface-card-elevated w-full max-w-xl mx-auto rounded-xl p-6 relative">
              
              {/* Window Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-slate-300" />
                  <div className="h-3 w-3 rounded-full bg-slate-300" />
                  <div className="h-3 w-3 rounded-full bg-slate-300" />
                </div>
                <div className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
                  <TerminalIcon size={12} className="text-[#0a4d94]" />
                  Agreement Compiler
                </div>
              </div>

              {/* Chat Input Container */}
              <div className="space-y-4">
                <div className="surface-inset rounded-lg p-4 relative min-h-[96px] flex flex-col justify-between">
                  <span className="text-xs text-[#0a4d94] font-semibold block mb-1">
                    Agreement terms:
                  </span>
                  <p className="text-sm font-mono text-slate-800 leading-relaxed flex-1">
                    {displayText}
                    {isTyping && <span className="inline-block w-1.5 h-4 bg-[#0a4d94] ml-0.5 animate-pulse" />}
                  </p>
                </div>

                {/* Parsing Loader / Output State */}
                <div className="min-h-[190px] flex flex-col justify-center">
                  {!showParsed ? (
                    <div className="text-center py-8 space-y-2">
                      <div className="h-6 w-6 rounded-full border-2 border-slate-300 border-t-[#0a4d94] animate-spin mx-auto" />
                      <p className="text-xs text-slate-500 font-mono">Parsing terms...</p>
                    </div>
                  ) : (
                    <div className="border border-blue-200 bg-[#ebf3fb] rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-blue-100">
                        <div className="text-xs font-bold text-[#0a4d94] flex items-center gap-1.5">
                          <SparklesIcon size={12} />
                          Extracted Parameters
                        </div>
                        <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <LockIcon size={10} /> Ready to Deploy
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-slate-500 font-medium">Recipient</p>
                          <p className="text-slate-900 font-mono font-semibold truncate">{SIMULATION_STEPS[stepIdx].parsed.recipient}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-medium">Deposit Amount</p>
                          <p className="text-slate-900 font-mono font-bold">{SIMULATION_STEPS[stepIdx].parsed.amount}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-slate-500 font-medium">Release Condition</p>
                          <p className="text-slate-800 font-medium leading-relaxed">{SIMULATION_STEPS[stepIdx].parsed.condition}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-medium">Escrow Type</p>
                          <p className="text-[#0a4d94] font-semibold">{SIMULATION_STEPS[stepIdx].parsed.type}</p>
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

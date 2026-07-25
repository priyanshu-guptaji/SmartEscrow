import React from 'react';
import { TerminalIcon, ShieldCheckIcon, SparklesIcon, RefreshCwIcon } from './Icons';

export default function FeatureCards() {
  const features = [
    {
      title: 'Natural Language Escrows',
      description: 'Define complex conditional payouts in plain English. Our AI parses receiver, amount, token, and release logic.',
      icon: <TerminalIcon className="text-indigo-400" size={24} />,
      badge: 'AI-Powered',
    },
    {
      title: 'Trustless Smart Contracts',
      description: 'Funds are locked directly in audited smart contracts. Neither SmartEscrow nor any third party can access them without conditions met.',
      icon: <ShieldCheckIcon className="text-emerald-400" size={24} />,
      badge: 'Non-Custodial',
    },
    {
      title: 'Real-World Oracle Verification',
      description: 'Oracles monitor real-world conditions: GitHub commits, weather, price feeds, flight delays, or API responses.',
      icon: <SparklesIcon className="text-cyan-400" size={24} />,
      badge: 'Oracles Connected',
    },
    {
      title: 'Multi-Chain Flexibility',
      description: 'Deploy conditional agreements across Arbitrum, Optimism, Base, Ethereum, and Solana with ultra-low gas fees.',
      icon: <RefreshCwIcon className="text-violet-400" size={24} />,
      badge: 'Cross-Chain',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {features.map((feature, idx) => (
        <div key={idx} className="glass-card flex flex-col p-6 rounded-2xl relative overflow-hidden group">
          {/* Accent border top */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.03] border border-white/5 group-hover:border-indigo-500/20 group-hover:bg-indigo-500/5 transition-all">
              {feature.icon}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border border-white/5 rounded-full px-2 py-0.5">
              {feature.badge}
            </span>
          </div>

          <h3 className="text-base font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
            {feature.title}
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed flex-1">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  );
}

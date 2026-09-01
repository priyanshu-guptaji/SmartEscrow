import React from 'react';
import { TerminalIcon, ShieldCheckIcon, SparklesIcon, RefreshCwIcon } from './Icons';

export default function FeatureCards() {
  const features = [
    {
      title: 'Natural Language Escrows',
      description: 'Define conditional payouts in plain sentences. The parser extracts recipient, amount, token, and release triggers.',
      icon: <TerminalIcon className="text-[#0a4d94]" size={20} />,
      badge: 'Parser',
    },
    {
      title: 'Trustless Smart Contracts',
      description: 'Funds are locked directly in audited EVM smart contracts. No intermediary has discretionary custody.',
      icon: <ShieldCheckIcon className="text-emerald-700" size={20} />,
      badge: 'Non-Custodial',
    },
    {
      title: 'Real-World Oracle Verification',
      description: 'Oracles monitor real-world conditions including GitHub commits, price feeds, deliveries, and API webhooks.',
      icon: <SparklesIcon className="text-blue-700" size={20} />,
      badge: 'Oracles',
    },
    {
      title: 'Multi-Chain Settlement',
      description: 'Deploy conditional agreements on Arbitrum, Optimism, Base, and Ethereum with minimal transaction fees.',
      icon: <RefreshCwIcon className="text-slate-700" size={20} />,
      badge: 'Multi-Chain',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {features.map((feature, idx) => (
        <div key={idx} className="surface-card flex flex-col p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 border border-slate-200">
              {feature.icon}
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded px-2 py-0.5">
              {feature.badge}
            </span>
          </div>

          <h3 className="text-base font-bold text-slate-900 mb-2">
            {feature.title}
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed flex-1 font-normal">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  );
}

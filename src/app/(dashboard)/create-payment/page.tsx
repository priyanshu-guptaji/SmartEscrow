'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEscrow } from '@/context/EscrowContext';
import { TokenSymbol, PaymentType } from '@/types/payment';
import { SparklesIcon, TerminalIcon, ChevronRightIcon } from '@/components/Icons';

const PRESET_PROMPTS = [
  {
    text: "Pay Alice Vance 1.25 ETH if she finishes the website frontend layout by next Monday.",
    parsed: {
      name: "Alice Vance",
      address: "0x71C272...65B20a8",
      amount: 1.25,
      token: "ETH" as TokenSymbol,
      type: "conditional" as PaymentType,
      condition: "Release when Alice finishes the website frontend layout by next Monday.",
    }
  },
  {
    text: "Escrow 500 USDC for Bob Builder. Release when the solidity smart contract audit passes.",
    parsed: {
      name: "Bob Builder",
      address: "0x3Fd452...19a2e6",
      amount: 500,
      token: "USDC" as TokenSymbol,
      type: "conditional" as PaymentType,
      condition: "Release when the solidity smart contract audit passes with 0 critical errors.",
    }
  },
  {
    text: "Send Charlie Dev 10 SOL if BTC price hits $100k according to Chainlink oracle.",
    parsed: {
      name: "Charlie Dev",
      address: "8xKm87...Y3t4h2",
      amount: 10,
      token: "SOL" as TokenSymbol,
      type: "conditional" as PaymentType,
      condition: "Chainlink oracle price feed for BTC/USD is greater than or equal to $100,000.",
    }
  }
];

export default function CreatePaymentPage() {
  const router = useRouter();
  const { addPayment, walletConnected } = useEscrow();
  
  // Tabs: 'ai' or 'manual'
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [nlInput, setNlInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // Form Fields
  const [receiverName, setReceiverName] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState<TokenSymbol>('ETH');
  const [paymentType, setPaymentType] = useState<PaymentType>('conditional');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');

  // Submit Feedback
  const [isDeploying, setIsDeploying] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Trigger parsing mock logic
  const handleAIParse = (customText?: string) => {
    const textToParse = customText || nlInput;
    if (!textToParse.trim()) return;

    setIsParsing(true);
    
    /* 
      TODO: AI Integration Points
      1. Send the natural language string `nlInput` to backend API: `POST /api/parser`.
      2. Backend processes the request using an LLM model (e.g. Gemini / OpenAI) 
         instructed with a strict JSON Schema output.
      3. The model extracts entities: receiver name, address, token, amount, release triggers.
      4. Return structured JSON payload to populate the form state reactively.
    */

    setTimeout(() => {
      // Look for a matching preset or compute fallback
      const matchingPreset = PRESET_PROMPTS.find(p => textToParse.includes(p.parsed.name) || p.text === textToParse);

      if (matchingPreset) {
        setReceiverName(matchingPreset.parsed.name);
        setReceiverAddress(matchingPreset.parsed.address);
        setAmount(matchingPreset.parsed.amount.toString());
        setToken(matchingPreset.parsed.token);
        setPaymentType(matchingPreset.parsed.type);
        setCondition(matchingPreset.parsed.condition);
        setDescription(`${matchingPreset.parsed.name} conditional payment`);
      } else {
        // Basic fallback heuristic parser
        const words = textToParse.split(' ');
        let parsedAmount = '1.0';
        let parsedToken: TokenSymbol = 'ETH';
        
        // Find token
        if (textToParse.toLowerCase().includes('sol')) parsedToken = 'SOL';
        if (textToParse.toLowerCase().includes('usdc')) parsedToken = 'USDC';
        if (textToParse.toLowerCase().includes('usdt')) parsedToken = 'USDT';

        // Find numbers
        const numMatch = textToParse.match(/\d+(\.\d+)?/);
        if (numMatch) parsedAmount = numMatch[0];

        setReceiverName('Recipient Wallet');
        setReceiverAddress('0x71C...65B20');
        setAmount(parsedAmount);
        setToken(parsedToken);
        setPaymentType('conditional');
        setCondition(`Released if condition met: "${textToParse}"`);
        setDescription('Custom natural language payment');
      }
      
      setIsParsing(false);
      // Switch tab to let them review and submit
      setActiveTab('manual');
    }, 1500);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverName || !receiverAddress || !amount || !condition) return;

    setIsDeploying(true);

    /*
      TODO: Web3 Transaction & Smart Contract Execution Flow
      1. Trigger wallet pop-up (e.g. MetaMask/Rainbow) to sign transaction.
      2. Estimate gas requirements for contract creation.
      3. Call factory contract: `EscrowFactory.createConditionalPayment(receiverAddress, amount, conditionToken, conditionHash)`.
      4. Lock designated `amount` in smart contract deposit.
      5. Wait for transaction block inclusion.
      6. Post transaction hash to backend database indexer.
    */

    setTimeout(() => {
      addPayment({
        receiverName,
        receiverAddress,
        amount: parseFloat(amount),
        token,
        type: paymentType,
        condition,
        description: description || `${receiverName} Payment`,
        naturalLanguagePrompt: nlInput || undefined
      });

      setIsDeploying(false);
      setSuccessMsg('Escrow smart contract deployed successfully!');
      
      // Redirect back to dashboard after brief delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    }, 2000);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Create Conditional Payment
        </h1>
        <p className="text-sm text-slate-400">
          Configure secure escrows via plain-text AI processing or manually define smart contract conditions.
        </p>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-white/[0.06] gap-6">
        <button
          onClick={() => setActiveTab('ai')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'ai'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <SparklesIcon size={14} />
            AI Prompt Parser
          </span>
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'manual'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <TerminalIcon size={14} />
            Manual Parameters
          </span>
        </button>
      </div>

      {/* Success notification overlay */}
      {successMsg && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400 text-center animate-pulse">
          {successMsg} Redirecting to Dashboard Console...
        </div>
      )}

      {/* AI TAB CONTENT */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <SparklesIcon size={14} className="text-indigo-400" />
                Describe Agreement Terms
              </h3>
              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                Gemini LLM Sandbox
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Describe in plain English: Who gets paid, how much crypto, which token, and the exact triggers of release. We will parse and map these into the contract parameters automatically.
            </p>

            <textarea
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              placeholder="e.g., Lock 1.5 ETH for Alice Vance. Release only when she deploys the github repository frontend next Friday."
              rows={4}
              className="w-full rounded-xl bg-slate-950 border border-white/10 p-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono leading-relaxed"
            />

            <div className="flex justify-end pt-2">
              <button
                onClick={() => handleAIParse()}
                disabled={isParsing || !nlInput.trim()}
                className="glow-btn flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isParsing ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Parsing terms...</span>
                  </>
                ) : (
                  <>
                    <span>Process with AI</span>
                    <ChevronRightIcon size={12} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Presets List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              Select an Example Prompt to Simulate
            </h4>
            <div className="space-y-2">
              {PRESET_PROMPTS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setNlInput(preset.text);
                    handleAIParse(preset.text);
                  }}
                  className="w-full text-left rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-indigo-500/20 p-3 text-xs text-slate-400 hover:text-white transition-all flex items-center justify-between group"
                >
                  <span className="font-mono truncate mr-4">{preset.text}</span>
                  <span className="text-[10px] text-indigo-400 group-hover:translate-x-0.5 transition-all font-semibold whitespace-nowrap">
                    Test Parse →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MANUAL/REVIEW TAB CONTENT */}
      {activeTab === 'manual' && (
        <form onSubmit={handleFormSubmit} className="glass-card rounded-2xl p-6 border border-white/5 space-y-6">
          <div className="pb-3 border-b border-white/5">
            <h3 className="text-sm font-bold text-white">Escrow Deployment Parameters</h3>
            <p className="text-xs text-slate-500">Review parameters extracted by AI or configure contract inputs manually.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Receiver Name */}
            <div className="space-y-1.5 col-span-1">
              <label className="text-xs font-semibold text-slate-400">Receiver Name</label>
              <input
                type="text"
                required
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="e.g. Alice Vance"
                className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Receiver Address */}
            <div className="space-y-1.5 col-span-1">
              <label className="text-xs font-semibold text-slate-400 font-mono">Receiver Address / Wallet</label>
              <input
                type="text"
                required
                value={receiverAddress}
                onChange={(e) => setReceiverAddress(e.target.value)}
                placeholder="e.g. 0x71C... or Solana address"
                className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5 col-span-1">
              <label className="text-xs font-semibold text-slate-400">Amount</label>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Token */}
            <div className="space-y-1.5 col-span-1">
              <label className="text-xs font-semibold text-slate-400">Token Symbol</label>
              <select
                value={token}
                onChange={(e) => setToken(e.target.value as TokenSymbol)}
                className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ETH">ETH (Ethereum)</option>
                <option value="USDC">USDC (USD Coin)</option>
                <option value="USDT">USDT (Tether)</option>
                <option value="SOL">SOL (Solana)</option>
              </select>
            </div>

            {/* Payment Type */}
            <div className="space-y-1.5 col-span-1">
              <label className="text-xs font-semibold text-slate-400">Escrow Model Type</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="conditional">Conditional Release (Oracles)</option>
                <option value="scheduled">Scheduled Date Payout</option>
                <option value="recurring">Recurring Monthly Subscription</option>
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1.5 col-span-1">
              <label className="text-xs font-semibold text-slate-400">Contract Reference Description</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Website Milestone Escrow"
                className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Condition Description */}
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-semibold text-slate-400">Release Logic Condition Details</label>
              <textarea
                required
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="Define validation specs or GitHub branch merges that the oracles will evaluate to release funds."
                rows={3}
                className="w-full rounded-xl bg-slate-950 border border-white/10 p-3.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← Back to Prompt Input
            </button>
            
            <button
              type="submit"
              disabled={isDeploying || !walletConnected}
              className="glow-btn flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-8 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isDeploying ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Locking Funds & Deploying...</span>
                </>
              ) : (
                <>
                  <span>{!walletConnected ? 'Connect Wallet to Deploy' : 'Lock Funds & Deploy'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEscrow } from '@/context/EscrowContext';
import { useEscrowContract } from '@/hooks/useEscrowContract';
import { useENS } from '@/hooks/useENS';
import { useAccount } from 'wagmi';
import { TokenSymbol, PaymentType } from '@/types/payment';
import { SparklesIcon, TerminalIcon, ChevronRightIcon, CheckCircleIcon } from '@/components/Icons';
import PaymentReview from '@/components/PaymentReview';

const PRESET_PROMPTS = [
  "Pay Alice Vance 1.25 ETH if she finishes the website frontend layout by next Monday.",
  "Escrow 500 USDC for Bob Builder. Release when the solidity smart contract audit passes with 0 critical issues.",
  "Send Charlie Dev 0.5 ETH when test coverage hits 100%.",
  "Pay Rahul 10 USDC after he sends me NFT #25.",
];

type Step = 'input' | 'review';

export default function CreatePaymentPage() {
  const router = useRouter();
  const { addPayment } = useEscrow();
  const { isConnected } = useAccount();
  const {
    createEscrow,
    createScheduledEscrow,
    createRecurringEscrow,
    createNFTConditionalEscrow,
    txState, txHash, error: txError, resetTxState,
    escrowId: contractEscrowId,
  } = useEscrowContract();
  const { resolvedAddress, isResolving, resolveError, resolveENS } = useENS();

  const [step, setStep] = useState<Step>('input');
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [nlInput, setNlInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [usedAI, setUsedAI] = useState(false);

  const [receiverName, setReceiverName] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState<TokenSymbol>('ETH');
  const [paymentType, setPaymentType] = useState<PaymentType>('conditional');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('86400');

  // Scheduled payment fields
  const [scheduledDate, setScheduledDate] = useState('');

  // Recurring payment fields
  const [intervalSeconds, setIntervalSeconds] = useState('2592000'); // 30 days default

  // NFT conditional fields
  const [nftContract, setNftContract] = useState('');
  const [nftTokenId, setNftTokenId] = useState('');

  const [successMsg, setSuccessMsg] = useState('');

  const handleAIParse = async (textOverride?: string) => {
    const text = textOverride ?? nlInput;
    if (!text.trim()) return;

    setNlInput(text);
    setIsParsing(true);
    setParseError('');

    try {
      const res = await fetch('/api/parse-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Parse failed');
      }

      const { data, mock } = await res.json();
      setReceiverName(data.receiverName ?? '');
      setReceiverAddress(data.receiverAddress ?? '');
      setAmount(String(data.amount ?? ''));
      setToken((data.token as TokenSymbol) ?? 'ETH');
      setPaymentType((data.type as PaymentType) ?? 'conditional');
      setCondition(data.condition ?? '');
      setDescription(data.description ?? `${data.receiverName ?? 'Recipient'} payment escrow`);
      setUsedAI(!mock);
      setActiveTab('manual');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to parse. Please try again or fill manually.";
      setParseError(message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleProceedToReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverName || !receiverAddress || !amount || !condition) return;

    if (receiverAddress.endsWith('.eth')) {
      const resolved = await resolveENS(receiverAddress);
      if (!resolved) return;
    }

    setStep('review');
  };

  const handleConfirmPayment = async () => {
    if (!receiverName || !receiverAddress || !amount || !condition) return;

    const finalAddress = resolvedAddress || receiverAddress;
    const durationNum = parseInt(duration) || 86400;

    try {
      let hash: `0x${string}`;

      switch (paymentType) {
        case 'scheduled': {
          if (!scheduledDate) throw new Error('Scheduled date is required');
          const releaseTimestamp = Math.floor(new Date(scheduledDate).getTime() / 1000);
          hash = await createScheduledEscrow({
            receiver: finalAddress as `0x${string}`,
            token,
            amount,
            condition,
            duration: durationNum,
            releaseTimestamp,
          });
          break;
        }
        case 'recurring': {
          const interval = parseInt(intervalSeconds) || 2592000;
          hash = await createRecurringEscrow({
            receiver: finalAddress as `0x${string}`,
            token,
            amount,
            condition,
            duration: durationNum,
            interval,
          });
          break;
        }
        case 'nft-conditional': {
          if (!nftContract) throw new Error('NFT contract address is required');
          hash = await createNFTConditionalEscrow({
            receiver: finalAddress as `0x${string}`,
            token,
            amount,
            condition,
            duration: durationNum,
            nftContract: nftContract as `0x${string}`,
            tokenId: parseInt(nftTokenId) || 0,
          });
          break;
        }
        default: {
          hash = await createEscrow({
            receiver: finalAddress as `0x${string}`,
            token,
            amount,
            condition,
            duration: durationNum,
          });
          break;
        }
      }

      await addPayment({
        receiverName,
        receiverAddress: finalAddress,
        amount: parseFloat(amount),
        token,
        type: paymentType,
        condition,
        description: description || `${receiverName} Payment`,
        naturalLanguagePrompt: nlInput || undefined,
        duration: durationNum,
        txHash: hash,
        contractEscrowId: contractEscrowId ?? undefined,
      });

      setSuccessMsg('Escrow smart contract deployed successfully!');
      setTimeout(() => router.push('/dashboard/payments'), 2000);
    } catch {
      // Error is captured by useEscrowContract
    }
  };

  const contractAddress = process.env.NEXT_PUBLIC_SMART_ESCROW_ADDRESS;
  const isContractDeployed = !!contractAddress;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          {step === 'input' ? 'Create Escrow Payment' : 'Review & Confirm'}
        </h1>
        <p className="text-sm text-slate-400">
          {step === 'input'
            ? 'Configure secure escrows via AI-powered plain-text parsing or manually define smart contract conditions.'
            : 'Review payment details before confirming the blockchain transaction.'}
        </p>
      </div>

      {!isContractDeployed && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-400">
          <p className="font-semibold mb-1">SmartEscrow contract not deployed</p>
          <p className="text-amber-400/80">
            Set <code className="font-mono bg-amber-500/10 px-1 rounded">NEXT_PUBLIC_SMART_ESCROW_ADDRESS</code> in your
            .env.local after deploying the contract to Base Sepolia. On-chain escrow creation is unavailable until deployment.
          </p>
        </div>
      )}

      {paymentType === 'scheduled' && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-xs text-indigo-400">
          <p className="font-semibold mb-1">Scheduled Payment Notice</p>
          <p className="text-indigo-400/80">
            Funds are locked in the smart contract until the release time. An executor address (set to the deployer by default) must call <code className="font-mono bg-indigo-500/10 px-1 rounded">executeScheduledRelease</code> after the scheduled time to release funds.
          </p>
        </div>
      )}

      {paymentType === 'recurring' && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-xs text-indigo-400">
          <p className="font-semibold mb-1">Recurring Payment Notice</p>
          <p className="text-indigo-400/80">
            Each payout requires the executor to call <code className="font-mono bg-indigo-500/10 px-1 rounded">executeRecurringPayout</code> after each interval elapses. The executor can be the deployer wallet or a designated automation service.
          </p>
        </div>
      )}

      {successMsg && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400 text-center flex items-center justify-center gap-2">
          <CheckCircleIcon size={16} />
          {successMsg} Redirecting...
        </div>
      )}

      {parseError && step === 'input' && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400 text-center">
          {parseError}
        </div>
      )}

      {step === 'input' && (
        <>
          <div className="flex border-b border-white/[0.06] gap-4 sm:gap-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('ai')}
              className={`pb-3 text-sm font-semibold transition-all relative whitespace-nowrap ${
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
              className={`pb-3 text-sm font-semibold transition-all relative whitespace-nowrap ${
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

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <SparklesIcon size={14} className="text-indigo-400" />
                    Describe Agreement Terms
                  </h3>
                  <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                    Gemini AI Parser
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Describe in plain English: who gets paid, how much crypto, which token, and the exact release trigger. The AI will extract structured parameters automatically.
                </p>

                <textarea
                  value={nlInput}
                  onChange={(e) => setNlInput(e.target.value)}
                  placeholder='e.g., "Pay Rahul 10 USDC after he sends me NFT #25."'
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
                        <span>Parsing with AI...</span>
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

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                  Example Prompts
                </h4>
                <div className="space-y-2">
                  {PRESET_PROMPTS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAIParse(preset)}
                      disabled={isParsing}
                      className="w-full text-left rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-indigo-500/20 p-3 text-xs text-slate-400 hover:text-white transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="font-mono truncate mr-4">{preset}</span>
                      <span className="text-[10px] text-indigo-400 group-hover:translate-x-0.5 transition-all font-semibold whitespace-nowrap">
                        Test Parse &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleProceedToReview} className="glass-card rounded-2xl p-6 border border-white/5 space-y-6">
              <div className="pb-3 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Escrow Deployment Parameters</h3>
                  <p className="text-xs text-slate-500">Review AI-parsed parameters or configure contract inputs manually.</p>
                </div>
                {usedAI && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircleIcon size={10} />
                    AI Parsed
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Receiver Name</label>
                  <input
                    type="text" required value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="e.g. Alice Vance"
                    className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 font-mono">Receiver Address / ENS</label>
                  <input
                    type="text" required value={receiverAddress}
                    onChange={(e) => { setReceiverAddress(e.target.value); }}
                    onBlur={() => { if (receiverAddress.endsWith('.eth')) resolveENS(receiverAddress); }}
                    placeholder="0x... or name.eth"
                    className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  {isResolving && <p className="text-[10px] text-indigo-400">Resolving ENS...</p>}
                  {resolveError && <p className="text-[10px] text-rose-400">{resolveError}</p>}
                  {resolvedAddress && (
                    <p className="text-[10px] text-emerald-400 font-mono break-all">
                      Resolved: {resolvedAddress}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Amount</label>
                  <input
                    type="number" step="any" required value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Token Symbol</label>
                  <select
                    value={token} onChange={(e) => setToken(e.target.value as TokenSymbol)}
                    className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ETH">ETH (Ethereum)</option>
                    <option value="USDC">USDC (USD Coin)</option>
                    <option value="USDT">USDT (Tether)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Escrow Type</label>
                  <select
                    value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                    className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="conditional">Conditional Release (Oracles)</option>
                    <option value="nft-conditional">NFT Conditional Release</option>
                    <option value="scheduled">Scheduled Date Payout</option>
                    <option value="recurring">Recurring Monthly Subscription</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Duration (seconds)</label>
                  <input
                    type="number" value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="86400"
                    className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-600">86400 = 1 day, 604800 = 7 days</p>
                </div>

                {/* Scheduled payment: date picker */}
                {paymentType === 'scheduled' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Release Date &amp; Time</label>
                    <input
                      type="datetime-local" required value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-600">Funds release automatically at this time (requires executor)</p>
                  </div>
                )}

                {/* Recurring payment: interval */}
                {paymentType === 'recurring' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Payout Interval (seconds)</label>
                    <select
                      value={intervalSeconds} onChange={(e) => setIntervalSeconds(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="86400">Daily (86400s)</option>
                      <option value="604800">Weekly (604800s)</option>
                      <option value="2592000">Monthly (2592000s)</option>
                      <option value="7776000">Quarterly (7776000s)</option>
                    </select>
                    <p className="text-[10px] text-slate-600">Requires executor to trigger each payout</p>
                  </div>
                )}

                {/* NFT conditional: contract + tokenId */}
                {paymentType === 'nft-conditional' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 font-mono">NFT Contract Address</label>
                      <input
                        type="text" required value={nftContract}
                        onChange={(e) => setNftContract(e.target.value)}
                        placeholder="0x... (ERC-721 contract)"
                        className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">NFT Token ID</label>
                      <input
                        type="number" required value={nftTokenId}
                        onChange={(e) => setNftTokenId(e.target.value)}
                        placeholder="25"
                        className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Reference Description</label>
                  <input
                    type="text" value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Website Milestone Escrow"
                    className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold text-slate-400">Release Condition</label>
                  <textarea
                    required value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="Define the exact condition that must be satisfied before funds are released..."
                    rows={3}
                    className="w-full rounded-xl bg-slate-950 border border-white/10 p-3.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-4 border-t border-white/5 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('ai')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors"
                >
                  &larr; Back to Prompt Input
                </button>

                <button
                  type="submit"
                  disabled={!isConnected}
                  className="glow-btn flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-8 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isConnected ? (
                    <>
                      <span>Review Payment</span>
                      <ChevronRightIcon size={12} />
                    </>
                  ) : (
                    <span>Connect Wallet to Continue</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {step === 'review' && (
        <PaymentReview
          receiverName={receiverName}
          receiverAddress={resolvedAddress || receiverAddress}
          amount={amount}
          token={token}
          paymentType={paymentType}
          condition={condition}
          description={description}
          txState={txState}
          txHash={txHash}
          error={txError}
          onConfirm={handleConfirmPayment}
          onEdit={() => { setStep('input'); resetTxState(); }}
          onCancel={() => router.push('/dashboard')}
        />
      )}
    </div>
  );
}

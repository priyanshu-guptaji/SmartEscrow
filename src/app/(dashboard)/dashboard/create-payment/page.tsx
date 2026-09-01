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
  const { addPayment, updatePayment } = useEscrow();
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
  const [activeTab, setActiveTab] = useState<'nl' | 'manual'>('nl');
  const [nlInput, setNlInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [usedAutoParse, setUsedAutoParse] = useState(false);

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

  const handleNLParse = async (textOverride?: string) => {
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
      setUsedAutoParse(!mock);
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

    // Map interval seconds to frequency label
    const frequencyMap: Record<string, string> = {
      '86400': 'daily',
      '604800': 'weekly',
      '2592000': 'monthly',
      '7776000': 'quarterly',
    };

    try {
      // Step 1: Create payment record in database with 'pending' status
      const newPayment = await addPayment({
        receiverName,
        receiverAddress: finalAddress,
        amount: parseFloat(amount),
        token,
        type: paymentType,
        condition,
        description: description || `${receiverName} Payment`,
        naturalLanguagePrompt: nlInput || undefined,
        duration: durationNum,
        scheduledAt: paymentType === 'scheduled' ? scheduledDate : undefined,
        frequency: paymentType === 'recurring' ? (frequencyMap[intervalSeconds] || 'monthly') : undefined,
      });

      // Step 2: Call smart contract to create escrow on-chain
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

      // Step 3: Update payment record with blockchain data and set status to 'active'
      await updatePayment(newPayment.id, {
        status: 'active',
        txHash: hash,
        contractEscrowId: contractEscrowId ?? undefined,
      });

      setSuccessMsg('Escrow smart contract deployed successfully!');
      setTimeout(() => router.push('/dashboard/payments'), 2000);
    } catch {
      // Error is captured by useEscrowContract
      // If blockchain failed, the DB record stays in 'pending' status
    }
  };

  const contractAddress = process.env.NEXT_PUBLIC_SMART_ESCROW_ADDRESS;
  const isContractDeployed = !!contractAddress;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {step === 'input' ? 'Create Escrow Payment' : 'Review & Confirm'}
        </h1>
        <p className="text-sm text-slate-600 font-normal">
          {step === 'input'
            ? 'Configure conditional escrows via natural language parsing or manual smart contract parameters.'
            : 'Review payment parameters before confirming the transaction on Base Sepolia.'}
        </p>
      </div>

      {!isContractDeployed && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <p className="font-semibold mb-1">SmartEscrow contract not deployed</p>
          <p className="text-amber-800">
            Set <code className="font-mono bg-amber-100 px-1 rounded">NEXT_PUBLIC_SMART_ESCROW_ADDRESS</code> in your
            .env.local after deploying the contract to Base Sepolia.
          </p>
        </div>
      )}

      {paymentType === 'scheduled' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-[#0a4d94]">
          <p className="font-semibold mb-1">Scheduled Payment Notice</p>
          <p className="text-slate-700">
            Funds are locked in the smart contract until the release time. An executor address calls <code className="font-mono bg-blue-100 px-1 rounded">executeScheduledRelease</code> after the scheduled time.
          </p>
        </div>
      )}

      {paymentType === 'recurring' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-[#0a4d94]">
          <p className="font-semibold mb-1">Recurring Payment Notice</p>
          <p className="text-slate-700">
            Each payout triggers <code className="font-mono bg-blue-100 px-1 rounded">executeRecurringPayout</code> after each interval elapses.
          </p>
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 text-center flex items-center justify-center gap-2">
          <CheckCircleIcon size={16} />
          {successMsg} Redirecting...
        </div>
      )}

      {parseError && step === 'input' && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 text-center">
          {parseError}
        </div>
      )}

      {step === 'input' && (
        <>
          <div className="flex border-b border-slate-200 gap-4 sm:gap-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('nl')}
              className={`pb-3 text-sm font-semibold transition-all relative whitespace-nowrap ${
                activeTab === 'nl'
                  ? 'text-[#0a4d94] border-b-2 border-[#0a4d94]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <SparklesIcon size={14} />
                Natural Language Parser
              </span>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`pb-3 text-sm font-semibold transition-all relative whitespace-nowrap ${
                activeTab === 'manual'
                  ? 'text-[#0a4d94] border-b-2 border-[#0a4d94]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <TerminalIcon size={14} />
                Manual Configuration
              </span>
            </button>
          </div>

          {activeTab === 'nl' && (
            <div className="space-y-6">
              <div className="surface-card rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <SparklesIcon size={14} className="text-[#0a4d94]" />
                    Describe Agreement Terms
                  </h3>
                  <span className="text-xs font-semibold text-[#0a4d94] bg-[#ebf3fb] border border-blue-200 px-2 py-0.5 rounded">
                    Auto Parser
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Describe in plain English: who gets paid, how much crypto, which token, and the exact release trigger. Structured parameters will be extracted automatically.
                </p>

                <textarea
                  value={nlInput}
                  onChange={(e) => setNlInput(e.target.value)}
                  placeholder='e.g., "Pay Rahul 10 USDC after he transfers NFT #25 to my wallet."'
                  rows={4}
                  className="w-full rounded-md bg-white border border-slate-300 p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0a4d94] font-mono leading-relaxed"
                />

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleNLParse()}
                    disabled={isParsing || !nlInput.trim()}
                    className="btn-primary flex h-10 items-center justify-center gap-2 rounded-md px-6 text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isParsing ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Parsing terms...</span>
                      </>
                    ) : (
                      <>
                        <span>Extract Parameters</span>
                        <ChevronRightIcon size={12} />
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
                  Preset Examples
                </h4>
                <div className="space-y-2">
                  {PRESET_PROMPTS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleNLParse(preset)}
                      disabled={isParsing}
                      className="w-full text-left rounded-md bg-white hover:bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700 hover:text-slate-900 transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                    >
                      <span className="font-mono truncate mr-4 text-xs">{preset}</span>
                      <span className="text-xs text-[#0a4d94] font-semibold whitespace-nowrap">
                        Load
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleProceedToReview} className="surface-card rounded-lg p-6 space-y-6">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Escrow Parameters</h3>
                  <p className="text-xs text-slate-500 font-normal">Review extracted parameters or configure contract inputs directly.</p>
                </div>
                {usedAutoParse && (
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircleIcon size={10} />
                    Auto Parsed
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Recipient Name</label>
                  <input
                    type="text" required value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="e.g. Alice Vance"
                    className="w-full rounded-md bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0a4d94]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Recipient Address / ENS</label>
                  <input
                    type="text" required value={receiverAddress}
                    onChange={(e) => { setReceiverAddress(e.target.value); }}
                    onBlur={() => { if (receiverAddress.endsWith('.eth')) resolveENS(receiverAddress); }}
                    placeholder="0x... or name.eth"
                    className="w-full rounded-md bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0a4d94] font-mono"
                  />
                  {isResolving && <p className="text-[10px] text-[#0a4d94]">Resolving ENS...</p>}
                  {resolveError && <p className="text-[10px] text-rose-600">{resolveError}</p>}
                  {resolvedAddress && (
                    <p className="text-[10px] text-emerald-700 font-mono break-all">
                      Resolved: {resolvedAddress}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Amount</label>
                  <input
                    type="number" step="any" required value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full rounded-md bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0a4d94] font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Token Symbol</label>
                  <select
                    value={token} onChange={(e) => setToken(e.target.value as TokenSymbol)}
                    className="w-full rounded-md bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0a4d94]"
                  >
                    <option value="ETH">ETH (Ethereum)</option>
                    <option value="USDC">USDC (USD Coin)</option>
                    <option value="USDT">USDT (Tether)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Escrow Type</label>
                  <select
                    value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                    className="w-full rounded-md bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0a4d94]"
                  >
                    <option value="conditional">Conditional Release (Oracles)</option>
                    <option value="nft-conditional">NFT Conditional Release</option>
                    <option value="scheduled">Scheduled Date Payout</option>
                    <option value="recurring">Recurring Periodic Subscription</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Duration (seconds)</label>
                  <input
                    type="number" value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="86400"
                    className="w-full rounded-md bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0a4d94] font-mono"
                  />
                  <p className="text-[11px] text-slate-500">86400 = 1 day, 604800 = 7 days</p>
                </div>

                {/* Scheduled payment: date picker */}
                {paymentType === 'scheduled' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Release Date &amp; Time</label>
                    <input
                      type="datetime-local" required value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full rounded-md bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0a4d94] font-mono"
                    />
                    <p className="text-[11px] text-slate-500">Funds unlock at this timestamp</p>
                  </div>
                )}

                {/* Recurring payment: interval */}
                {paymentType === 'recurring' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Payout Interval</label>
                    <select
                      value={intervalSeconds} onChange={(e) => setIntervalSeconds(e.target.value)}
                      className="w-full rounded-md bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0a4d94]"
                    >
                      <option value="86400">Daily (86400s)</option>
                      <option value="604800">Weekly (604800s)</option>
                      <option value="2592000">Monthly (2592000s)</option>
                      <option value="7776000">Quarterly (7776000s)</option>
                    </select>
                  </div>
                )}

                {/* NFT conditional: contract + tokenId */}
                {paymentType === 'nft-conditional' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">NFT Contract Address</label>
                      <input
                        type="text" required value={nftContract}
                        onChange={(e) => setNftContract(e.target.value)}
                        placeholder="0x... (ERC-721 contract)"
                        className="w-full rounded-md bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0a4d94] font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">NFT Token ID</label>
                      <input
                        type="number" required value={nftTokenId}
                        onChange={(e) => setNftTokenId(e.target.value)}
                        placeholder="25"
                        className="w-full rounded-md bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0a4d94] font-mono"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Reference Label</label>
                  <input
                    type="text" value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Frontend Milestone Payout"
                    className="w-full rounded-md bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0a4d94]"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Release Condition</label>
                  <textarea
                    required value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="Define the milestone condition that must be fulfilled before release..."
                    rows={3}
                    className="w-full rounded-md bg-white border border-slate-300 p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0a4d94] leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-4 border-t border-slate-100 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('nl')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors text-left"
                >
                  Back to Prompt Input
                </button>

                <button
                  type="submit"
                  disabled={!isConnected}
                  className="btn-primary flex h-10 items-center justify-center gap-2 rounded-md px-7 text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
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

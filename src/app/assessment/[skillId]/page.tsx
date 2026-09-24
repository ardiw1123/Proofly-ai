'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  Coins,
  Database,
  ExternalLink,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Wallet,
} from 'lucide-react';
import {
  useAccount,
  useBalance,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from 'wagmi';
import { formatEther, parseEther, type Hash } from 'viem';

import { CodeEditor } from '@/components/CodeEditor';
import { EvaluationPanel } from '@/components/EvaluationPanel';
import { WalletControl } from '@/components/WalletControl';
import { useAssessmentStore } from '@/stores/assessmentStore';
import { useHydrated } from '@/lib/use-hydrated';
import {
  botChain,
  fetchCandidateState,
  getExplorerTxUrl,
  getPublicClient,
  proofOfSkillAbi,
  CONTRACT_ADDRESS,
  type CandidateOnChainState,
} from '@/lib/contract';
import {
  getSkillTrack,
  type AssessmentAnswer,
  type AssessmentCase,
  type EvaluationResult,
  type ProblemDifficulty,
} from '@/types';

const DIFFICULTY_STYLES: Record<ProblemDifficulty, string> = {
  basic: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  intermediate: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  advanced: 'border-red-500/30 bg-red-500/10 text-red-400',
};

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

export default function AssessmentStudioPage({
  params,
}: {
  params: Promise<{ skillId: string }>;
}) {
  const { skillId: skillIdParam } = use(params);
  const skillId = Number(skillIdParam);
  const skill = getSkillTrack(skillId);
  const isValidSkill = Boolean(skill);

  const { address, isConnected, chainId } = useAccount();
  const walletAddress = address;

  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const wagmiPublicClient = usePublicClient();
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: walletAddress,
  });

  const assessment = useAssessmentStore((state) => state.assessment);
  const answers = useAssessmentStore((state) => state.answers);
  const result = useAssessmentStore((state) => state.result);
  const phase = useAssessmentStore((state) => state.phase);
  const error = useAssessmentStore((state) => state.error);

  const setLoading = useAssessmentStore((state) => state.setLoading);
  const setAssessment = useAssessmentStore((state) => state.setAssessment);
  const setAnswer = useAssessmentStore((state) => state.setAnswer);
  const setEvaluating = useAssessmentStore((state) => state.setEvaluating);
  const setResult = useAssessmentStore((state) => state.setResult);
  const setError = useAssessmentStore((state) => state.setError);
  const reset = useAssessmentStore((state) => state.reset);

  const mounted = useHydrated();

  // On-chain state
  const [candidateState, setCandidateState] = useState<CandidateOnChainState | null>(null);
  const [isLoadingOnChain, setIsLoadingOnChain] = useState(false);
  const [onChainError, setOnChainError] = useState<string | null>(null);

  // Payment flow state
  const [paymentPhase, setPaymentPhase] = useState<
    'idle' | 'approving' | 'confirming' | 'generating' | 'error'
  >('idle');
  const [paymentTxHash, setPaymentTxHash] = useState<Hash | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const hasCaseForThisTrack = assessment?.skillId === skillId;
  const hasResult = Boolean(result);
  const isBusy = phase === 'loading' || phase === 'evaluating';
  const isWrongNetwork = isConnected && chainId !== botChain.id;

  const isInitialLoading = Boolean(
    isConnected &&
      walletAddress &&
      isValidSkill &&
      !hasCaseForThisTrack &&
      candidateState === null &&
      onChainError === null,
  );

  // Load candidate state from the smart contract
  const loadCandidateState = useCallback(
    async (silent = false) => {
      if (!walletAddress || !isValidSkill) return;

      if (!silent) {
        setIsLoadingOnChain(true);
      }
      setOnChainError(null);

      try {
        const state = await fetchCandidateState(walletAddress, skillId);
        setCandidateState(state);
      } catch (err) {
        setOnChainError(
          err instanceof Error
            ? err.message
            : 'Could not fetch candidate status from BOT Chain.',
        );
      } finally {
        if (!silent) {
          setIsLoadingOnChain(false);
        }
      }
    },
    [walletAddress, isValidSkill, skillId],
  );

  useEffect(() => {
    let cancelled = false;

    if (!isConnected || !walletAddress || !isValidSkill || hasCaseForThisTrack) {
      return;
    }

    fetchCandidateState(walletAddress, skillId)
      .then((state) => {
        if (!cancelled) {
          setCandidateState(state);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setOnChainError(
            err instanceof Error
              ? err.message
              : 'Could not fetch candidate status from BOT Chain.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isConnected, walletAddress, isValidSkill, skillId, hasCaseForThisTrack]);

  // Handle start assessment payment & generation
  const handleStartAssessment = async () => {
    if (!walletAddress || !isValidSkill) return;

    if (isWrongNetwork) {
      try {
        switchChain({ chainId: botChain.id });
      } catch {
        setPaymentError(`Please switch your wallet network to ${botChain.name}.`);
      }
      return;
    }

    // Pre-check balance: need 1 BOT + small gas
    if (balanceData && balanceData.value < parseEther('1')) {
      setPaymentError(
        'Insufficient BOT balance. You need at least 1.0 BOT for the assessment fee plus gas. Please ensure your wallet has native BOT on BOT Chain Mainnet.',
      );
      return;
    }

    setPaymentError(null);
    setPaymentPhase('approving');

    let txHash: Hash;

    try {
      txHash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: proofOfSkillAbi,
        functionName: 'startAssessment',
        args: [skillId],
        value: parseEther('1'),
      });
      setPaymentTxHash(txHash);
      setPaymentPhase('confirming');
    } catch (err: unknown) {
      setPaymentPhase('error');
      const rawMsg = err instanceof Error ? err.message : String(err);
      if (
        rawMsg.includes('User rejected') ||
        rawMsg.includes('User denied') ||
        rawMsg.includes('rejected')
      ) {
        setPaymentError('Transaction was rejected in your wallet. You can try again when you are ready.');
      } else if (rawMsg.includes('insufficient funds') || rawMsg.includes('exceeds balance')) {
        setPaymentError(
          'Insufficient BOT balance. You need 1.0 BOT for the assessment fee plus gas for the transaction.',
        );
      } else {
        setPaymentError(rawMsg || 'Failed to submit transaction to wallet.');
      }
      return;
    }

    // Wait for on-chain block confirmation
    const client = wagmiPublicClient ?? getPublicClient();

    try {
      const receipt = await client.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== 'success') {
        setPaymentPhase('error');
        setPaymentError('Transaction failed on BOT Chain. Please verify the transaction on explorer.');
        return;
      }
    } catch {
      setPaymentPhase('error');
      setPaymentError('Failed to confirm transaction on BOT Chain. Check explorer for status.');
      return;
    }

    // Payment confirmed on-chain! Generate case study via server
    setPaymentPhase('generating');
    setLoading();

    try {
      const response = await fetch('/api/assessment/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, skillId, txHash }),
      });

      const data = (await response.json().catch(() => null)) as
        | (AssessmentCase & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? `Failed to generate case study (HTTP ${response.status}).`);
      }

      setPaymentPhase('idle');
      setAssessment(data as AssessmentCase);
      void refetchBalance();
    } catch (err: unknown) {
      setPaymentPhase('error');
      setError(
        err instanceof Error ? err.message : 'An error occurred while generating your case study.',
      );
    }
  };

  const submit = useCallback(async () => {
    if (!assessment || !walletAddress) {
      return;
    }

    const payload: AssessmentAnswer[] = assessment.problems.map((problem) => ({
      problemId: problem.id,
      answer: answers[problem.id] ?? '',
    }));

    if (payload.every((entry) => entry.answer.trim().length === 0)) {
      setError('Enter at least one answer before submitting for AI review.');
      return;
    }

    setEvaluating();

    try {
      const response = await fetch('/api/assessment/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: assessment.sessionId,
          walletAddress,
          skillId,
          answers: payload,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | (EvaluationResult & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? `Failed to evaluate the answers (HTTP ${response.status}).`);
      }

      setResult(data as EvaluationResult);
      // Reload on-chain state to sync attempts/cooldown
      void loadCandidateState();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'An unexpected error occurred.');
    }
  }, [
    assessment,
    answers,
    walletAddress,
    skillId,
    setEvaluating,
    setResult,
    setError,
    loadCandidateState,
  ]);

  const startOver = useCallback(() => {
    reset();
    setPaymentPhase('idle');
    setPaymentTxHash(null);
    setPaymentError(null);
    void loadCandidateState();
  }, [reset, loadCandidateState]);

  if (!mounted) {
    return <div className="min-h-screen" aria-hidden="true" />;
  }

  if (!isConnected || !walletAddress) {
    return <ConnectWalletGate />;
  }

  if (!isValidSkill || !skill) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
        <AlertCircle className="h-10 w-10 text-amber-400" />
        <h1 className="mt-4 text-2xl font-semibold text-white">Unknown skill track</h1>
        <p className="mt-2 text-zinc-400">
          Skill track &quot;{skillIdParam}&quot; does not exist. Choose one of the three available
          tracks.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assessments
        </Link>
      </div>
    );
  }

  // Active in-progress draft or evaluated session
  const showAssessmentWorkspace = hasCaseForThisTrack && assessment;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-blue-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to assessments
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">Assessment Studio</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">{skill.name}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {showAssessmentWorkspace
              ? assessment.scenarioTitle
              : 'Pay 1 BOT to access the dynamic AI-evaluated case study'}
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-zinc-400">
          <Database className="h-3.5 w-3.5 text-blue-400" />
          <span>3 problems · AI Technical Lead review</span>
        </div>
      </header>

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div className="flex-1 text-sm text-red-200">
            <p>{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/10"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Case 1: Active assessment workspace */}
      {showAssessmentWorkspace ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Left panel: case study + problems */}
          <section className="space-y-6">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
                Business context
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-300">
                {assessment.businessContext}
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
                Data schema
              </h2>
              <pre className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-6 text-zinc-300">
                {assessment.schema}
              </pre>
            </div>

            {assessment.problems.map((problem) => (
              <article
                key={problem.id}
                className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-white">
                    Problem {problem.id}: {problem.title}
                  </h3>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-widest ${DIFFICULTY_STYLES[problem.difficulty]}`}
                  >
                    {problem.difficulty}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-300">
                  {problem.problemStatement}
                </p>

                {problem.evaluationCriteria.length > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    {problem.evaluationCriteria.map((criterion) => (
                      <li
                        key={criterion}
                        className="flex items-start gap-2 text-xs leading-5 text-zinc-400"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                        <span>{criterion}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </section>

          {/* Right panel: editor or evaluation result */}
          <section className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {hasResult && result ? (
              <>
                <EvaluationPanel result={result} skillName={assessment.skillName} />
                <button
                  type="button"
                  onClick={startOver}
                  disabled={isBusy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-700 px-6 py-4 font-medium text-zinc-200 transition-colors hover:border-blue-500/60 hover:text-blue-400 disabled:opacity-60"
                >
                  <RefreshCw className="h-4 w-4" />
                  Start a new attempt
                </button>
              </>
            ) : (
              <>
                {assessment.problems.map((problem) => (
                  <div key={problem.id} className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                    <label
                      htmlFor={`answer-${problem.id}`}
                      className="mb-3 block text-sm font-medium text-zinc-300"
                    >
                      Your answer — Problem {problem.id}
                    </label>
                    <CodeEditor
                      id={`answer-${problem.id}`}
                      value={answers[problem.id] ?? ''}
                      onChange={(value) => setAnswer(problem.id, value)}
                      placeholder="Write your solution here..."
                      disabled={isBusy}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={submit}
                  disabled={isBusy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {phase === 'evaluating' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI Technical Lead is reviewing your submission...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit for AI review
                    </>
                  )}
                </button>
              </>
            )}
          </section>
        </div>
      ) : isInitialLoading || isLoadingOnChain ? (
        <div className="mt-10 flex flex-col items-center rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <p className="mt-4 text-zinc-300">Checking candidate on-chain status...</p>
        </div>
      ) : onChainError ? (
        <div className="mt-10 flex flex-col items-center rounded-3xl border border-red-500/30 bg-red-500/10 px-6 py-16 text-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <h2 className="mt-4 text-xl font-semibold text-white">Network Error</h2>
          <p className="mt-2 max-w-md text-sm text-red-200">{onChainError}</p>
          <button
            type="button"
            onClick={() => void loadCandidateState(false)}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-500"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : candidateState?.isCertified ? (
        <CertifiedState skillName={skill.name} />
      ) : candidateState?.isCooldownActive ? (
        <CooldownState
          cooldownUntil={candidateState.cooldownUntil}
          onExpired={() => void loadCandidateState(true)}
        />
      ) : (
        /* Case 2: Payment Gate */
        <PaymentGate
          skillName={skill.name}
          isWrongNetwork={isWrongNetwork}
          isSwitchingChain={isSwitchingChain}
          onSwitchNetwork={() => switchChain({ chainId: botChain.id })}
          balanceFormatted={balanceData ? Number(formatEther(balanceData.value)).toFixed(4) : null}
          hasEnoughBalance={Boolean(balanceData && balanceData.value >= parseEther('1'))}
          paymentPhase={paymentPhase}
          paymentTxHash={paymentTxHash}
          paymentError={paymentError}
          onStart={handleStartAssessment}
          onRetry={handleStartAssessment}
        />
      )}
    </div>
  );
}

function PaymentGate({
  skillName,
  isWrongNetwork,
  isSwitchingChain,
  onSwitchNetwork,
  balanceFormatted,
  hasEnoughBalance,
  paymentPhase,
  paymentTxHash,
  paymentError,
  onStart,
  onRetry,
}: {
  skillName: string;
  isWrongNetwork: boolean;
  isSwitchingChain: boolean;
  onSwitchNetwork: () => void;
  balanceFormatted: string | null;
  hasEnoughBalance: boolean;
  paymentPhase: 'idle' | 'approving' | 'confirming' | 'generating' | 'error';
  paymentTxHash: Hash | null;
  paymentError: string | null;
  onStart: () => void;
  onRetry: () => void;
}) {
  const isPending =
    paymentPhase === 'approving' ||
    paymentPhase === 'confirming' ||
    paymentPhase === 'generating';

  return (
    <div className="mx-auto mt-10 max-w-2xl">
      <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-md">
        <div className="p-8 sm:p-10">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
              <Coins className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-white">Start {skillName} Assessment</h2>
              <p className="text-sm text-zinc-400">
                1 BOT fee required to access the dynamic AI-evaluated case study
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Assessment Fee</span>
              <span className="font-mono font-semibold text-white">1.0 BOT</span>
            </div>
            <div className="flex items-center justify-between text-sm border-t border-zinc-800/80 pt-4">
              <span className="text-zinc-400">Network</span>
              <span className="font-mono text-zinc-300">{botChain.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm border-t border-zinc-800/80 pt-4">
              <span className="text-zinc-400">Your Native BOT Balance</span>
              <span className="font-mono text-zinc-300">
                {balanceFormatted !== null ? `${balanceFormatted} BOT` : 'Loading...'}
              </span>
            </div>
          </div>

          {/* Gas warning note */}
          <p className="mt-3 text-xs text-zinc-500">
            Note: User needs native BOT balance for transaction gas in addition to the 1.0 BOT assessment fee.
          </p>

          {/* Balance insufficient warning */}
          {!hasEnoughBalance && balanceFormatted !== null && (
            <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="text-xs text-amber-200 space-y-1">
                  <p className="font-semibold">Insufficient BOT balance</p>
                  <p>
                    You need at least 1.0 BOT for the assessment fee plus gas. Please ensure your wallet has native BOT tokens on BOT Chain Mainnet before starting.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {paymentError && (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div className="flex-1 text-xs text-red-200">
                  <p>{paymentError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Transaction status tracker */}
          {paymentTxHash && (
            <div className="mt-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-200">
              <div className="flex items-center justify-between">
                <span>Transaction sent:</span>
                <a
                  href={getExplorerTxUrl(paymentTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-blue-300 underline hover:text-blue-100"
                >
                  {paymentTxHash.slice(0, 10)}...{paymentTxHash.slice(-8)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {/* Dynamic Status Display */}
          {paymentPhase === 'approving' && (
            <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/5 py-4 text-sm text-blue-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Confirm transaction in your wallet...</span>
            </div>
          )}

          {paymentPhase === 'confirming' && (
            <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/5 py-4 text-sm text-blue-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Waiting for block confirmation on BOT Chain...</span>
            </div>
          )}

          {paymentPhase === 'generating' && (
            <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/5 py-4 text-sm text-blue-300">
              <Sparkles className="h-4 w-4 animate-spin" />
              <span>Payment confirmed! AI is preparing your case study...</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-8 space-y-3">
            {isWrongNetwork ? (
              <button
                type="button"
                onClick={onSwitchNetwork}
                disabled={isSwitchingChain}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-4 font-medium text-black transition-colors hover:bg-amber-400 disabled:opacity-60"
              >
                {isSwitchingChain ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                Switch to {botChain.name}
              </button>
            ) : paymentPhase === 'error' ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-medium text-white transition-colors hover:bg-blue-500"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            ) : (
              <button
                type="button"
                onClick={onStart}
                disabled={isPending || !hasEnoughBalance}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-medium text-white transition-all hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : !hasEnoughBalance ? (
                  'Insufficient BOT balance (1 BOT required)'
                ) : (
                  'Start assessment — 1 BOT'
                )}
              </button>
            )}

            <div className="flex items-center justify-between px-2 pt-2 text-xs text-zinc-500">
              <a
                href={botChain.blockExplorers.default.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-blue-400"
              >
                BOT Chain Explorer
                <ExternalLink className="h-3 w-3" />
              </a>

              <span>Passing score: 80/100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CooldownState({
  cooldownUntil,
  onExpired,
}: {
  cooldownUntil: number;
  onExpired?: () => void;
}) {
  const mounted = useHydrated();
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, cooldownUntil * 1000 - Date.now()),
  );
  const onExpiredRef = useRef(onExpired);
  const expiredFiredRef = useRef(false);

  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  useEffect(() => {
    const update = () => {
      const remaining = Math.max(0, cooldownUntil * 1000 - Date.now());
      setRemainingMs(remaining);
      if (remaining === 0 && !expiredFiredRef.current) {
        expiredFiredRef.current = true;
        onExpiredRef.current?.();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  return (
    <div className="mt-10 flex flex-col items-center rounded-3xl border border-amber-500/30 bg-amber-500/5 px-6 py-16 text-center">
      <Clock className="h-8 w-8 text-amber-400" />
      <h2 className="mt-4 text-xl font-semibold text-white">Assessment unavailable (Cooldown Active)</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-zinc-300">
        You have already attempted this assessment. A 24-hour cooldown is active on-chain. Please return in{' '}
        <span className="font-mono font-medium text-amber-300">
          {!mounted ? '--:--:--' : formatRemaining(remainingMs)}
        </span>.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-blue-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to assessments
      </Link>
    </div>
  );
}

function CertifiedState({ skillName }: { skillName: string }) {
  return (
    <div className="mt-10 flex flex-col items-center rounded-3xl border border-emerald-500/30 bg-emerald-500/5 px-6 py-16 text-center">
      <Award className="h-10 w-10 text-emerald-400" />
      <h2 className="mt-4 text-xl font-semibold text-white">Already Certified</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-zinc-300">
        You have successfully completed the {skillName} assessment and earned your Soulbound
        Certificate! Certified tracks cannot be retaken.
      </p>
      <div className="mt-6 flex flex-wrap gap-4 justify-center">
        <Link
          href="/badges"
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-500"
        >
          View My Badges
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 px-6 py-3 font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Browse other tracks
        </Link>
      </div>
    </div>
  );
}

function ConnectWalletGate() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10">
          <Wallet className="h-7 w-7 text-blue-400" />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-white">Connect wallet to continue</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Connect your wallet to start this assessment. Your attempt will be tied to your
          wallet and a passing grade earns a permanent Soulbound Certificate.
        </p>
        <div className="mt-8">
          <WalletControl />
        </div>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assessments
        </Link>
      </div>
    </div>
  );
}

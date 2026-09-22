'use client';

import { use, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import { useAccount } from 'wagmi';

import { CodeEditor } from '@/components/CodeEditor';
import { EvaluationPanel } from '@/components/EvaluationPanel';
import { useAssessmentStore } from '@/stores/assessmentStore';
import {
  getSkillTrack,
  type AssessmentAnswer,
  type AssessmentCase,
  type EvaluationResult,
  type ProblemDifficulty,
} from '@/types';

/** Used when no wallet is connected so the assessment can still be tried out. */
const GUEST_WALLET = '0x0000000000000000000000000000000000000000';

const DIFFICULTY_STYLES: Record<ProblemDifficulty, string> = {
  basic: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  intermediate: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  advanced: 'border-red-500/30 bg-red-500/10 text-red-400',
};

export default function AssessmentStudioPage({
  params,
}: {
  params: Promise<{ skillId: string }>;
}) {
  const { skillId: skillIdParam } = use(params);
  const skillId = Number(skillIdParam);
  const skill = getSkillTrack(skillId);
  const isValidSkill = Boolean(skill);

  const { address } = useAccount();
  const walletAddress = address ?? GUEST_WALLET;

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

  const requestKeyRef = useRef<string | null>(null);

  const hasCaseForThisTrack = assessment?.skillId === skillId;
  const hasResult = Boolean(result);
  const isBusy = phase === 'loading' || phase === 'evaluating';

  const generate = useCallback(async () => {
    setLoading();

    try {
      const response = await fetch('/api/assessment/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, skillId }),
      });

      const data = (await response.json().catch(() => null)) as
        | (AssessmentCase & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? `Gagal membuat soal (HTTP ${response.status}).`);
      }

      setAssessment(data as AssessmentCase);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Terjadi kesalahan tak terduga.');
    }
  }, [walletAddress, skillId, setLoading, setAssessment, setError]);

  const retryGenerate = useCallback(() => {
    requestKeyRef.current = null;
    void generate();
  }, [generate]);

  // Generate exactly once per (track, wallet) pair, unless a draft already exists.
  useEffect(() => {
    if (!isValidSkill || hasCaseForThisTrack) {
      return;
    }

    const requestKey = `${skillId}:${walletAddress}`;

    if (requestKeyRef.current === requestKey) {
      return;
    }

    requestKeyRef.current = requestKey;
    void generate();
  }, [isValidSkill, hasCaseForThisTrack, skillId, walletAddress, generate]);

  const submit = useCallback(async () => {
    if (!assessment) {
      return;
    }

    const payload: AssessmentAnswer[] = assessment.problems.map((problem) => ({
      problemId: problem.id,
      answer: answers[problem.id] ?? '',
    }));

    if (payload.every((entry) => entry.answer.trim().length === 0)) {
      setError('Isi minimal satu jawaban sebelum submit ke AI.');
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
        throw new Error(data?.error ?? `Gagal mengevaluasi jawaban (HTTP ${response.status}).`);
      }

      setResult(data as EvaluationResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Terjadi kesalahan tak terduga.');
    }
  }, [
    assessment,
    answers,
    walletAddress,
    skillId,
    setEvaluating,
    setResult,
    setError,
  ]);

  const startOver = useCallback(() => {
    reset();
    requestKeyRef.current = null;
    void generate();
  }, [reset, generate]);

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
            {assessment?.scenarioTitle ?? 'Preparing your case study...'}
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
            onClick={retryGenerate}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      )}

      {!assessment ? (
        <LoadingState phase={phase} onRetry={retryGenerate} />
      ) : (
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
      )}
    </div>
  );
}

function LoadingState({
  phase,
  onRetry,
}: {
  phase: string;
  onRetry: () => void;
}) {
  if (phase === 'error') {
    return (
      <div className="mt-10 flex flex-col items-center rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-16 text-center">
        <AlertCircle className="h-8 w-8 text-amber-400" />
        <p className="mt-4 text-zinc-300">The case study could not be generated.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-500"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-col items-center rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-16 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      <p className="mt-4 flex items-center gap-2 text-zinc-300">
        <Sparkles className="h-4 w-4 text-blue-400" />
        AI is preparing your case study...
      </p>
      <p className="mt-2 text-sm text-zinc-500">
        Generating three unique problems for this session.
      </p>
    </div>
  );
}

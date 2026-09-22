import { AlertTriangle, CheckCircle2, Lightbulb, ThumbsUp, XCircle } from 'lucide-react';

import { ScoreGauge } from '@/components/ScoreGauge';
import {
  PASSING_SCORE,
  RUBRIC_LABELS,
  RUBRIC_MAX,
  type EvaluationResult,
  type RubricBreakdown,
} from '@/types';

interface EvaluationPanelProps {
  result: EvaluationResult;
  skillName: string;
}

const RUBRIC_ORDER: (keyof RubricBreakdown)[] = ['logic', 'efficiency', 'edgeCases', 'syntax'];

function barColor(value: number, max: number): string {
  const ratio = max === 0 ? 0 : value / max;
  if (ratio >= 0.8) return 'bg-emerald-500';
  if (ratio >= 0.5) return 'bg-amber-500';
  return 'bg-red-500';
}

function formatCooldown(unixSeconds?: number): string | null {
  if (!unixSeconds) return null;

  return new Date(unixSeconds * 1000).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function EvaluationPanel({ result, skillName }: EvaluationPanelProps) {
  const cooldown = formatCooldown(result.cooldownUntil);

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <ScoreGauge score={result.score} />

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-widest ${
              result.passed
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {result.passed ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            {result.passed ? 'Passed' : 'Not passed'}
          </div>

          <h2 className="mt-3 text-2xl font-semibold text-white">{skillName}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{result.feedback.summary}</p>

          {!result.passed && (
            <p className="mt-3 text-xs text-amber-400">
              Passing grade is {PASSING_SCORE}. A new attempt unlocks in 24 hours
              {cooldown ? ` (after ${cooldown})` : ''}.
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {RUBRIC_ORDER.map((key) => {
          const value = result.feedback.breakdown[key];
          const max = RUBRIC_MAX[key];
          const percent = max === 0 ? 0 : Math.round((value / max) * 100);

          return (
            <div key={key} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs uppercase tracking-widest text-zinc-500">
                  {RUBRIC_LABELS[key]}
                </span>
                <span className="font-mono text-sm text-zinc-200">
                  {value}
                  <span className="text-zinc-600">/{max}</span>
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full ${barColor(value, max)}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium text-emerald-400">
            <ThumbsUp className="h-4 w-4" />
            Strengths
          </h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-300">
            {result.feedback.strengths}
          </p>
        </section>

        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium text-amber-400">
            <Lightbulb className="h-4 w-4" />
            Areas for improvement
          </h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-300">
            {result.feedback.areasForImprovement}
          </p>
        </section>
      </div>

      {result.feedback.perProblem.length > 0 && (
        <section className="mt-6">
          <h3 className="text-sm font-medium text-zinc-300">Per-problem verdict</h3>
          <div className="mt-3 space-y-3">
            {result.feedback.perProblem.map((verdict) => (
              <div
                key={verdict.problemId}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-200">
                    Problem {verdict.problemId}
                  </span>
                  <span className="font-mono text-sm text-zinc-400">{verdict.score}/100</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{verdict.verdict}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <AlertTriangle className="h-4 w-4 text-zinc-500" />
          Detailed feedback
        </h3>
        <p className="mt-2 whitespace-pre-line rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm leading-6 text-zinc-400">
          {result.feedback.detailedFeedback}
        </p>
      </section>
    </div>
  );
}

import { jsonError, jsonOk, readJsonBody } from '@/lib/api';
import { AiCallError, generateStructuredJson } from '@/lib/ai';
import {
  EVALUATE_SCHEMA_NAME,
  type GeneratedEvaluation,
  evaluateJsonSchema,
  evaluationValidator,
  PASSING_SCORE,
} from '@/lib/ai-schemas';
import { getAttemptCooldown, getSession, markSessionConsumed } from '@/lib/assessment-store';
import { TEMPERATURE_EVALUATE, isAiConfigured } from '@/lib/openai';
import { buildEvaluateSystemPrompt, buildEvaluateUserPrompt } from '@/lib/prompts';
import { evaluateRequestSchema } from '@/lib/schemas';
import type { EvaluationResult } from '@/types';

export const runtime = 'nodejs';

/**
 * POST /api/assessment/evaluate
 *
 * Scores the candidate's answers against the case study that was generated for
 * their session. The session must be valid, unexpired, unused, and owned by the
 * same wallet — that guard is what stops arbitrary score requests.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const parsed = evaluateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError('Invalid input.', 400, parsed.error.flatten());
  }

  if (!isAiConfigured()) {
    return jsonError(
      'OPENAI_API_KEY is not configured on the server. Add it to .env.local and restart the dev server.',
      503,
    );
  }

  const { sessionId, walletAddress, skillId, answers } = parsed.data;
  const session = getSession(sessionId);

  if (!session) {
    return jsonError(
      'Session not found or expired. Please generate a new assessment.',
      404,
    );
  }

  if (session.consumed) {
    return jsonError('This session has already been evaluated. Please generate a new assessment.', 409);
  }

  if (session.assessment.skillId !== skillId) {
    return jsonError('This session does not match the requested skill track.', 400);
  }

  if (session.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    return jsonError('This session belongs to a different wallet.', 403);
  }

  const answersByProblem = new Map(answers.map((entry) => [entry.problemId, entry.answer]));
  const orderedAnswers = session.assessment.problems.map((problem) => ({
    problemId: problem.id,
    answer: answersByProblem.get(problem.id) ?? '',
  }));

  if (orderedAnswers.every((entry) => entry.answer.trim().length === 0)) {
    return jsonError('No answers were submitted. Answer at least one problem before submitting.', 400);
  }

  let evaluation: GeneratedEvaluation;

  try {
    evaluation = await generateStructuredJson({
      schemaName: EVALUATE_SCHEMA_NAME,
      jsonSchema: evaluateJsonSchema,
      systemPrompt: buildEvaluateSystemPrompt(skillId),
      userPrompt: buildEvaluateUserPrompt({
        assessment: session.assessment,
        answers: orderedAnswers,
      }),
      temperature: TEMPERATURE_EVALUATE,
      validator: evaluationValidator,
    });
  } catch (error) {
    if (error instanceof AiCallError) {
      return jsonError(error.message, 502);
    }

    throw error;
  }

  markSessionConsumed(sessionId);

  // The pass/fail decision is derived server-side, never taken from the model.
  const passed = evaluation.score >= PASSING_SCORE;

  // The 24h clock started when this case was generated, so we read it back from
  // the attempt store for this specific skill track rather than recomputing a deadline here.
  const cooldown = getAttemptCooldown(walletAddress, skillId);

  const result: EvaluationResult = {
    passed,
    score: evaluation.score,
    attempt: 1, // On-chain attempt tracking arrives with the SBT minting flow.
    feedback: {
      summary: evaluation.summary,
      breakdown: evaluation.rubricBreakdown,
      strengths: evaluation.strengths,
      areasForImprovement: evaluation.areasForImprovement,
      detailedFeedback: evaluation.detailedFeedback,
      perProblem: evaluation.perProblem,
    },
    ...(cooldown.active ? { cooldownUntil: cooldown.cooldownUntil } : {}),
  };

  return jsonOk(result);
}

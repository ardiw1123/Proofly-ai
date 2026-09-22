import { jsonError, jsonOk, readJsonBody } from '@/lib/api';
import { AiCallError, generateStructuredJson } from '@/lib/ai';
import {
  EVALUATE_SCHEMA_NAME,
  type GeneratedEvaluation,
  evaluateJsonSchema,
  evaluationValidator,
  PASSING_SCORE,
} from '@/lib/ai-schemas';
import { getSession, markSessionConsumed } from '@/lib/assessment-store';
import { TEMPERATURE_EVALUATE, isAiConfigured } from '@/lib/openai';
import { buildEvaluateSystemPrompt, buildEvaluateUserPrompt } from '@/lib/prompts';
import { evaluateRequestSchema } from '@/lib/schemas';
import type { EvaluationResult } from '@/types';

export const runtime = 'nodejs';

/** Failed attempts unlock again after 24 hours. */
const COOLDOWN_SECONDS = 24 * 60 * 60;

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
    return jsonError('Input tidak valid.', 400, parsed.error.flatten());
  }

  if (!isAiConfigured()) {
    return jsonError(
      'OPENAI_API_KEY belum diset di server. Tambahkan ke .env.local lalu restart dev server.',
      503,
    );
  }

  const { sessionId, walletAddress, skillId, answers } = parsed.data;
  const session = getSession(sessionId);

  if (!session) {
    return jsonError(
      'Sesi tidak ditemukan atau sudah kedaluwarsa. Silakan generate soal baru.',
      404,
    );
  }

  if (session.consumed) {
    return jsonError('Sesi ini sudah dievaluasi. Silakan generate soal baru.', 409);
  }

  if (session.assessment.skillId !== skillId) {
    return jsonError('Sesi ini tidak cocok dengan skill track yang diminta.', 400);
  }

  if (session.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    return jsonError('Sesi ini milik wallet lain.', 403);
  }

  const answersByProblem = new Map(answers.map((entry) => [entry.problemId, entry.answer]));
  const orderedAnswers = session.assessment.problems.map((problem) => ({
    problemId: problem.id,
    answer: answersByProblem.get(problem.id) ?? '',
  }));

  if (orderedAnswers.every((entry) => entry.answer.trim().length === 0)) {
    return jsonError('Tidak ada jawaban yang dikirim. Isi minimal satu soal sebelum submit.', 400);
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
    ...(passed ? {} : { cooldownUntil: Math.floor(Date.now() / 1000) + COOLDOWN_SECONDS }),
  };

  return jsonOk(result);
}

import { jsonError, jsonOk, readJsonBody } from '@/lib/api';
import { AiCallError, generateStructuredJson } from '@/lib/ai';
import {
  GENERATE_SCHEMA_NAME,
  type GeneratedCase,
  generateJsonSchema,
  generatedCaseValidator,
} from '@/lib/ai-schemas';
import { SESSION_TTL_MS, createSessionId, recordAttempt, saveSession } from '@/lib/assessment-store';
import { TEMPERATURE_GENERATE, isAiConfigured } from '@/lib/openai';
import { verifyAssessmentPayment } from '@/lib/payment-verification';
import {
  buildGenerateSystemPrompt,
  buildGenerateUserPrompt,
  getTrackName,
} from '@/lib/prompts';
import { generateRequestSchema } from '@/lib/schemas';
import type { AssessmentCase, AssessmentProblem } from '@/types';
import type { Address, Hash } from 'viem';

export const runtime = 'nodejs';

/**
 * POST /api/assessment/generate
 *
 * Generates a brand new business case study with exactly three progressive
 * problems for the requested skill track, and remembers it under a sessionId
 * so the evaluate endpoint can score the candidate against the real questions.
 *
 * Security & Anti-Replay:
 * Requires a valid on-chain payment txHash calling `startAssessment(skillId)` with 1 BOT.
 * Replaying previously used transaction hashes or submitting invalid/fake hashes is rejected.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const parsed = generateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError('Invalid input.', 400, parsed.error.flatten());
  }

  const { walletAddress, skillId, txHash } = parsed.data;

  // Enforce on-chain payment verification server-side before generating any case study.
  const verification = await verifyAssessmentPayment({
    txHash: txHash as Hash,
    walletAddress: walletAddress as Address,
    skillId,
  });

  if (!verification.valid) {
    return jsonError(
      verification.error ?? 'Payment verification failed.',
      verification.statusCode ?? 400,
    );
  }

  if (!isAiConfigured()) {
    return jsonError(
      'OPENAI_API_KEY is not configured on the server. Add it to .env.local and restart the dev server.',
      503,
    );
  }

  let generated: GeneratedCase;

  try {
    generated = await generateStructuredJson({
      schemaName: GENERATE_SCHEMA_NAME,
      jsonSchema: generateJsonSchema,
      systemPrompt: buildGenerateSystemPrompt(skillId),
      userPrompt: buildGenerateUserPrompt({ walletAddress, skillId }),
      temperature: TEMPERATURE_GENERATE,
      validator: generatedCaseValidator,
    });
  } catch (error) {
    if (error instanceof AiCallError) {
      return jsonError(error.message, 502);
    }

    throw error;
  }

  const problems: AssessmentProblem[] = generated.problems.map((problem, index) => ({
    id: index + 1,
    title: problem.title,
    difficulty: problem.difficulty,
    problemStatement: problem.problemStatement,
    evaluationCriteria: problem.evaluationCriteria,
  }));

  const assessment: AssessmentCase = {
    sessionId: createSessionId(),
    skillId,
    skillName: getTrackName(skillId),
    scenarioTitle: generated.scenarioTitle,
    businessContext: generated.businessContext,
    schema: generated.schema,
    problems,
  };

  const now = Date.now();
  saveSession({
    assessment,
    walletAddress,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    consumed: false,
  });

  // Track the attempt timestamp for this specific (wallet, skillId)
  recordAttempt(walletAddress, skillId);

  return jsonOk(assessment);
}

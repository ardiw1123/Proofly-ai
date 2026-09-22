import { jsonError, jsonOk, readJsonBody } from '@/lib/api';
import { AiCallError, generateStructuredJson } from '@/lib/ai';
import {
  GENERATE_SCHEMA_NAME,
  type GeneratedCase,
  generateJsonSchema,
  generatedCaseValidator,
} from '@/lib/ai-schemas';
import { SESSION_TTL_MS, createSessionId, saveSession } from '@/lib/assessment-store';
import { TEMPERATURE_GENERATE, isAiConfigured } from '@/lib/openai';
import {
  buildGenerateSystemPrompt,
  buildGenerateUserPrompt,
  getTrackName,
} from '@/lib/prompts';
import { generateRequestSchema } from '@/lib/schemas';
import type { AssessmentCase, AssessmentProblem } from '@/types';

export const runtime = 'nodejs';

/**
 * POST /api/assessment/generate
 *
 * Generates a brand new business case study with exactly three progressive
 * problems for the requested skill track, and remembers it under a sessionId
 * so the evaluate endpoint can score the candidate against the real questions.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const parsed = generateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError('Input tidak valid.', 400, parsed.error.flatten());
  }

  if (!isAiConfigured()) {
    return jsonError(
      'OPENAI_API_KEY belum diset di server. Tambahkan ke .env.local lalu restart dev server.',
      503,
    );
  }

  const { walletAddress, skillId } = parsed.data;

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

  return jsonOk(assessment);
}

import { z } from 'zod';

import { PASSING_SCORE, RUBRIC_MAX } from '@/types';

export { PASSING_SCORE, RUBRIC_MAX };

/**
 * JSON Schemas sent to the model via Structured Outputs (`strict: true`).
 * The matching zod validators below are the runtime guard for whatever the
 * model actually returns, so a malformed response never reaches the client.
 */

/* ------------------------------------------------------------------ */
/* Question generator                                                  */
/* ------------------------------------------------------------------ */

export const GENERATE_SCHEMA_NAME = 'assessment_case';

export const generateJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['scenarioTitle', 'businessContext', 'schema', 'problems'],
  properties: {
    scenarioTitle: {
      type: 'string',
      description: 'Short headline for the business case study.',
    },
    businessContext: {
      type: 'string',
      description: 'Realistic business situation and why the analysis matters.',
    },
    schema: {
      type: 'string',
      description: 'Mock data schema (tables/columns/types) the candidate works against.',
    },
    problems: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      description: 'Exactly three progressive problems: basic, intermediate, advanced.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'difficulty', 'problemStatement', 'evaluationCriteria'],
        properties: {
          title: { type: 'string' },
          difficulty: { type: 'string', enum: ['basic', 'intermediate', 'advanced'] },
          problemStatement: {
            type: 'string',
            description: 'Hands-on task the candidate must solve. Never theoretical.',
          },
          evaluationCriteria: {
            type: 'array',
            minItems: 2,
            maxItems: 6,
            items: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

export const generatedProblemValidator = z.object({
  title: z.string().min(1),
  difficulty: z.enum(['basic', 'intermediate', 'advanced']),
  problemStatement: z.string().min(1),
  evaluationCriteria: z.array(z.string().min(1)).min(1),
});

export const generatedCaseValidator = z.object({
  scenarioTitle: z.string().min(1),
  businessContext: z.string().min(1),
  schema: z.string().min(1),
  problems: z.array(generatedProblemValidator).length(3),
});

export type GeneratedCase = z.infer<typeof generatedCaseValidator>;

/* ------------------------------------------------------------------ */
/* Answer evaluator                                                    */
/* ------------------------------------------------------------------ */

export const EVALUATE_SCHEMA_NAME = 'assessment_evaluation';

export const evaluateJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'score',
    'passed',
    'summary',
    'rubricBreakdown',
    'strengths',
    'areasForImprovement',
    'detailedFeedback',
    'perProblem',
  ],
  properties: {
    score: { type: 'integer', minimum: 0, maximum: 100 },
    passed: { type: 'boolean' },
    summary: { type: 'string', description: 'One sentence verdict for the candidate.' },
    rubricBreakdown: {
      type: 'object',
      additionalProperties: false,
      required: ['logic', 'efficiency', 'edgeCases', 'syntax'],
      properties: {
        logic: { type: 'integer', minimum: 0, maximum: 40 },
        efficiency: { type: 'integer', minimum: 0, maximum: 25 },
        edgeCases: { type: 'integer', minimum: 0, maximum: 20 },
        syntax: { type: 'integer', minimum: 0, maximum: 15 },
      },
    },
    strengths: { type: 'string' },
    areasForImprovement: { type: 'string' },
    detailedFeedback: { type: 'string' },
    perProblem: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['problemId', 'score', 'verdict'],
        properties: {
          problemId: { type: 'integer', minimum: 1, maximum: 3 },
          score: { type: 'integer', minimum: 0, maximum: 100 },
          verdict: { type: 'string', description: 'What was right and what was missing.' },
        },
      },
    },
  },
} as const;

export const rubricBreakdownValidator = z.object({
  logic: z.number().int().min(0).max(RUBRIC_MAX.logic),
  efficiency: z.number().int().min(0).max(RUBRIC_MAX.efficiency),
  edgeCases: z.number().int().min(0).max(RUBRIC_MAX.edgeCases),
  syntax: z.number().int().min(0).max(RUBRIC_MAX.syntax),
});

/**
 * The rubric breakdown must add up to the reported score, otherwise the
 * evaluation is internally inconsistent and we ask the model to try again.
 */
export const evaluationValidator = z
  .object({
    score: z.number().int().min(0).max(100),
    passed: z.boolean(),
    summary: z.string().min(1),
    rubricBreakdown: rubricBreakdownValidator,
    strengths: z.string().min(1),
    areasForImprovement: z.string().min(1),
    detailedFeedback: z.string().min(1),
    perProblem: z
      .array(
        z.object({
          problemId: z.number().int().min(1),
          score: z.number().int().min(0).max(100),
          verdict: z.string().min(1),
        }),
      )
      .min(1),
  })
  .superRefine((value, ctx) => {
    const { logic, efficiency, edgeCases, syntax } = value.rubricBreakdown;
    const breakdownTotal = logic + efficiency + edgeCases + syntax;

    if (Math.abs(breakdownTotal - value.score) > 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['score'],
        message: `score (${value.score}) tidak konsisten dengan total rubrik (${breakdownTotal})`,
      });
    }
  });

export type GeneratedEvaluation = z.infer<typeof evaluationValidator>;

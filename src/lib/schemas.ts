import { z } from 'zod';

/** Skill tracks supported by the MVP. */
export const skillIdSchema = z
  .number()
  .int('skillId must be an integer')
  .min(1, 'skillId must be at least 1')
  .max(3, 'skillId must be at most 3');

export const walletAddressSchema = z
  .string()
  .trim()
  .min(1, 'walletAddress is required')
  .max(128, 'walletAddress is too long');

/** POST /api/assessment/generate */
export const generateRequestSchema = z.object({
  walletAddress: walletAddressSchema,
  skillId: skillIdSchema,
});

export type GenerateRequestBody = z.infer<typeof generateRequestSchema>;

/** POST /api/assessment/evaluate */
export const evaluateRequestSchema = z.object({
  sessionId: z.string().trim().min(1, 'sessionId is required').max(128),
  walletAddress: walletAddressSchema,
  skillId: skillIdSchema,
  answers: z
    .array(
      z.object({
        problemId: z.number().int('problemId must be an integer'),
        answer: z.string().max(20_000, 'answer is too long'),
      }),
    )
    .min(1, 'at least one answer is required')
    .max(10, 'too many answers'),
});

export type EvaluateRequestBody = z.infer<typeof evaluateRequestSchema>;

import { z } from 'zod';

/** Skill tracks supported by the MVP. */
export const skillIdSchema = z
  .number()
  .int('skillId harus bilangan bulat')
  .min(1, 'skillId minimal 1')
  .max(3, 'skillId maksimal 3');

export const walletAddressSchema = z
  .string()
  .trim()
  .min(1, 'walletAddress wajib diisi')
  .max(128, 'walletAddress terlalu panjang');

/** POST /api/assessment/generate */
export const generateRequestSchema = z.object({
  walletAddress: walletAddressSchema,
  skillId: skillIdSchema,
});

export type GenerateRequestBody = z.infer<typeof generateRequestSchema>;

/** POST /api/assessment/evaluate */
export const evaluateRequestSchema = z.object({
  sessionId: z.string().trim().min(1, 'sessionId wajib diisi').max(128),
  walletAddress: walletAddressSchema,
  skillId: skillIdSchema,
  answers: z
    .array(
      z.object({
        problemId: z.number().int('problemId harus bilangan bulat'),
        answer: z.string().max(20_000, 'jawaban terlalu panjang'),
      }),
    )
    .min(1, 'minimal satu jawaban')
    .max(10, 'terlalu banyak jawaban'),
});

export type EvaluateRequestBody = z.infer<typeof evaluateRequestSchema>;

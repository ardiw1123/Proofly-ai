import { z } from 'zod';

import { AI_MODEL, AiConfigError, getAiClient } from './openai';

/** Raised when the AI call itself fails in a way the user should know about. */
export class AiCallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiCallError';
  }
}

interface StructuredJsonOptions<T> {
  /** Name of the JSON schema sent to the model (a-z, A-Z, 0-9, `_`, `-`). */
  schemaName: string;
  /** JSON Schema the model must follow (Structured Outputs, strict mode). */
  jsonSchema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  /** Runtime guard so a malformed model response never reaches the client. */
  validator: z.ZodType<T>;
}

const MAX_ATTEMPTS = 2;

/**
 * Calls the model in JSON mode and validates the response.
 *
 * The model occasionally returns JSON that does not satisfy the contract even
 * with strict schemas, so we retry once before giving up with a friendly error.
 */
export async function generateStructuredJson<T>(
  options: StructuredJsonOptions<T>,
): Promise<T> {
  const client = getAiClient();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let content: string | null | undefined;

    try {
      const completion = await client.chat.completions.create({
        model: AI_MODEL,
        temperature: options.temperature,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: options.schemaName,
            strict: true,
            schema: options.jsonSchema,
          },
        },
        messages: [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: options.userPrompt },
        ],
      });

      content = completion.choices[0]?.message?.content;
    } catch (error) {
      throw toAiCallError(error);
    }

    if (!content) {
      continue;
    }

    const validation = options.validator.safeParse(parseJson(content));

    if (validation.success) {
      return validation.data;
    }
  }

  throw new AiCallError(
    'AI mengembalikan data yang tidak valid setelah beberapa percobaan. Silakan coba lagi.',
  );
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toAiCallError(error: unknown): Error {
  if (error instanceof AiConfigError) {
    return error;
  }

  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? (error as { status?: unknown }).status
      : undefined;

  if (status === 401) {
    return new AiCallError('OPENAI_API_KEY tidak valid atau sudah kedaluwarsa.');
  }

  if (status === 429) {
    return new AiCallError(
      'Kuota atau rate limit layanan AI tercapai. Silakan coba lagi beberapa saat lagi.',
    );
  }

  if (status === 404) {
    return new AiCallError('Model AI tidak tersedia untuk API key ini.');
  }

  const message = error instanceof Error ? error.message : String(error);
  return new AiCallError(`Gagal menghubungi layanan AI: ${message}`);
}

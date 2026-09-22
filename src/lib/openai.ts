import AiSdkClient from 'openai';

/**
 * Model & sampling configuration for the AI evaluation engine.
 * Generate needs a little more variety; evaluation must stay consistent.
 */
export const AI_MODEL = 'gpt-4o';
export const TEMPERATURE_GENERATE = 0.3;
export const TEMPERATURE_EVALUATE = 0.1;

/**
 * Thrown when the server has no AI API key configured.
 * Routes translate this into a clear, user-facing message instead of crashing.
 */
export class AiConfigError extends Error {
  constructor() {
    super(
      'OPENAI_API_KEY belum diset. Salin .env.example menjadi .env.local lalu paste API key Anda.',
    );
    this.name = 'AiConfigError';
  }
}

let cachedClient: AiSdkClient | null = null;

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * Server-only AI client. Never import this module from a client component.
 */
export function getAiClient(): AiSdkClient {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new AiConfigError();
  }

  cachedClient ??= new AiSdkClient({ apiKey });
  return cachedClient;
}

import { jsonError } from '@/lib/api';
import { AI_MODEL, AiConfigError, getAiClient, isAiConfigured } from '@/lib/openai';

export const runtime = 'nodejs';

/** Must never be prerendered: it performs a live upstream AI call. */
export const dynamic = 'force-dynamic';

/**
 * Fase A acceptance check: proves the API key is valid and GPT-4o is reachable.
 * Open http://localhost:3000/api/health after pasting your key into .env.local.
 */
export async function GET() {
  if (!isAiConfigured()) {
    return jsonError(
      'OPENAI_API_KEY belum diset. Salin .env.example menjadi .env.local lalu paste API key Anda.',
      503,
    );
  }

  try {
    const completion = await getAiClient().chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: 'Reply with the single word: pong' }],
    });

    return Response.json({
      ok: true,
      model: AI_MODEL,
      reply: completion.choices[0]?.message?.content?.trim() ?? '',
    });
  } catch (error) {
    if (error instanceof AiConfigError) {
      return jsonError(error.message, 503);
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonError(`Gagal memanggil ${AI_MODEL}: ${message}`, 502);
  }
}

/**
 * Small helpers to keep API route responses consistent.
 */

export function jsonError(
  message: string,
  status: number,
  details?: unknown,
  headers?: HeadersInit,
) {
  return Response.json(
    { error: message, ...(details ? { details } : {}) },
    { status, ...(headers ? { headers } : {}) },
  );
}

export function jsonOk<T extends object>(payload: T, status = 200) {
  return Response.json(payload, { status });
}

/**
 * Reads and parses a JSON body without throwing on malformed input.
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

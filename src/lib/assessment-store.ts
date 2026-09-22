import type { AssessmentCase } from '@/types';

/** Sessions stay valid for 2 hours, matching the assessment window. */
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export interface StoredAssessmentSession {
  assessment: AssessmentCase;
  walletAddress: string;
  createdAt: number;
  expiresAt: number;
  /** Set once an evaluation succeeded, so the same session cannot be replayed. */
  consumed: boolean;
}

/**
 * MVP storage: a process-local Map. It is intentionally simple — a serverless
 * deployment would swap this for Redis/KV without touching the route contracts.
 * The Map is cached on globalThis so `next dev` hot reloads keep sessions alive.
 */
const globalForSessions = globalThis as typeof globalThis & {
  __posAssessmentSessions?: Map<string, StoredAssessmentSession>;
};

const sessions: Map<string, StoredAssessmentSession> = (globalForSessions.__posAssessmentSessions ??=
  new Map<string, StoredAssessmentSession>());

export function createSessionId(): string {
  const raw =
    globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 14);

  return `sess_${raw.replace(/-/g, '').slice(0, 16)}`;
}

export function saveSession(session: StoredAssessmentSession): void {
  pruneExpiredSessions();
  sessions.set(session.assessment.sessionId, session);
}

/** Returns the session, or null when it is unknown or expired. */
export function getSession(sessionId: string): StoredAssessmentSession | null {
  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

export function markSessionConsumed(sessionId: string): void {
  const session = sessions.get(sessionId);

  if (session) {
    session.consumed = true;
  }
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

function pruneExpiredSessions(): void {
  const now = Date.now();

  for (const [sessionId, session] of sessions) {
    if (session.expiresAt <= now) {
      sessions.delete(sessionId);
    }
  }
}

import type { AssessmentCase } from '@/types';

/** Sessions stay valid for 2 hours, matching the assessment window. */
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * A wallet may only start one assessment every 24 hours. The clock starts when
 * the case study is generated (not when it is submitted), which closes the
 * "generate repeatedly until you get an easy case" loophole. This is the single
 * source of truth for the cooldown — the evaluate endpoint reuses it instead of
 * computing its own deadline.
 */
export const ATTEMPT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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

export interface StoredUsedTx {
  txHash: string;
  walletAddress: string;
  skillId: number;
  usedAt: number;
}

const globalForUsedTx = globalThis as typeof globalThis & {
  __posUsedTxHashes?: Map<string, StoredUsedTx>;
};

const usedTxHashes: Map<string, StoredUsedTx> = (globalForUsedTx.__posUsedTxHashes ??=
  new Map<string, StoredUsedTx>());

export function isTxHashUsed(txHash: string): boolean {
  return usedTxHashes.has(txHash.trim().toLowerCase());
}

export function recordUsedTxHash(
  txHash: string,
  details: { walletAddress: string; skillId: number; timestamp?: number },
): void {
  const normalized = txHash.trim().toLowerCase();
  usedTxHashes.set(normalized, {
    txHash: normalized,
    walletAddress: details.walletAddress.trim().toLowerCase(),
    skillId: details.skillId,
    usedAt: details.timestamp ?? Date.now(),
  });
}

interface StoredAttempt {
  /** Normalised (lowercased) wallet address. */
  walletAddress: string;
  skillId: number;
  startedAt: number;
  expiresAt: number;
}

/**
 * Per-(wallet, skillId) attempt log backing the 24h limit cache.
 * Note: The on-chain contract (ProofOfSkillSBT) is the primary source of truth.
 *
 * MVP storage: process-local Map cached on globalThis. Like `sessions`,
 * it is wiped on server restart and is not shared across instances.
 */
const globalForAttempts = globalThis as typeof globalThis & {
  __posAssessmentAttempts?: Map<string, StoredAttempt>;
};

const attempts: Map<string, StoredAttempt> = (globalForAttempts.__posAssessmentAttempts ??=
  new Map<string, StoredAttempt>());

function normalizeWallet(walletAddress: string): string {
  return walletAddress.trim().toLowerCase();
}

function makeAttemptKey(walletAddress: string, skillId: number): string {
  return `${normalizeWallet(walletAddress)}:${skillId}`;
}

export interface AttemptCooldown {
  /** True while the wallet is still locked out of generating a new case. */
  active: boolean;
  /** Milliseconds left until the wallet may generate again (0 when inactive). */
  remainingMs: number;
  /** Unix timestamp (seconds) when the cooldown ends (0 when inactive). */
  cooldownUntil: number;
}

/** Reads the current cooldown for a wallet and specific skill track without changing it. */
export function getAttemptCooldown(walletAddress: string, skillId: number): AttemptCooldown {
  const key = makeAttemptKey(walletAddress, skillId);
  const record = attempts.get(key);
  const now = Date.now();

  if (!record) {
    return { active: false, remainingMs: 0, cooldownUntil: 0 };
  }

  if (record.expiresAt <= now) {
    attempts.delete(key);
    return { active: false, remainingMs: 0, cooldownUntil: 0 };
  }

  return {
    active: true,
    remainingMs: record.expiresAt - now,
    cooldownUntil: Math.ceil(record.expiresAt / 1000),
  };
}

/**
 * Starts (or restarts) the 24h cooldown for a wallet and skill track. Called only after a case
 * study was generated successfully.
 */
export function recordAttempt(walletAddress: string, skillId: number): AttemptCooldown {
  pruneExpiredAttempts();

  const now = Date.now();
  const record: StoredAttempt = {
    walletAddress: normalizeWallet(walletAddress),
    skillId,
    startedAt: now,
    expiresAt: now + ATTEMPT_COOLDOWN_MS,
  };

  attempts.set(makeAttemptKey(walletAddress, skillId), record);

  return {
    active: true,
    remainingMs: ATTEMPT_COOLDOWN_MS,
    cooldownUntil: Math.ceil(record.expiresAt / 1000),
  };
}

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

function pruneExpiredAttempts(): void {
  const now = Date.now();

  for (const [walletAddress, attempt] of attempts) {
    if (attempt.expiresAt <= now) {
      attempts.delete(walletAddress);
    }
  }
}

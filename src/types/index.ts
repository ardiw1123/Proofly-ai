// Shared TypeScript types for the ProofOfSkill application

export interface SkillTrack {
  id: number; // 1: SQL, 2: Python, 3: Solidity
  name: string;
  description: string;
  icon: string;
  tags: string[];
}

export interface CandidateState {
  currentAttempts: number;
  lastAttemptTime: bigint;
  isCertified: boolean;
}

export interface Certificate {
  skillId: number;
  score: number;
  attemptCount: number;
  completionDate: bigint;
  tokenURI: string;
}

export type ProblemDifficulty = 'basic' | 'intermediate' | 'advanced';

/** One of the three problems inside a generated case study. */
export interface AssessmentProblem {
  id: number;
  title: string;
  difficulty: ProblemDifficulty;
  problemStatement: string;
  evaluationCriteria: string[];
}

/**
 * A dynamically generated assessment: one business case study split into
 * exactly three progressive problems, unique per session.
 */
export interface AssessmentCase {
  sessionId: string;
  skillId: number;
  skillName: string;
  scenarioTitle: string;
  businessContext: string;
  schema: string;
  problems: AssessmentProblem[];
}

/** @deprecated Use {@link AssessmentCase} — kept so older imports keep working. */
export type AssessmentQuestion = AssessmentCase;

export interface RubricBreakdown {
  logic: number;
  efficiency: number;
  edgeCases: number;
  syntax: number;
}

/** Maximum score per rubric dimension. Weights total 100. */
export const RUBRIC_MAX: Record<keyof RubricBreakdown, number> = {
  logic: 40,
  efficiency: 25,
  edgeCases: 20,
  syntax: 15,
};

export const RUBRIC_LABELS: Record<keyof RubricBreakdown, string> = {
  logic: 'Logic & correctness',
  efficiency: 'Efficiency & performance',
  edgeCases: 'Edge case handling',
  syntax: 'Syntax & conventions',
};

/** A submission must reach this score to be considered passing. */
export const PASSING_SCORE = 80;

export interface ProblemVerdict {
  problemId: number;
  score: number;
  verdict: string;
}

export interface EvaluationFeedback {
  summary: string;
  breakdown: RubricBreakdown;
  strengths: string;
  areasForImprovement: string;
  detailedFeedback: string;
  perProblem: ProblemVerdict[];
}

export interface MintAuthorization {
  skillId: number;
  score: number;
  attempt: number;
  tokenURI: string;
  signature: string;
}

export interface EvaluationResult {
  passed: boolean;
  score: number;
  attempt: number;
  feedback: EvaluationFeedback;
  mintAuthorization?: MintAuthorization;
  cooldownUntil?: number;
}

/** Request payload for POST /api/assessment/evaluate. */
export interface AssessmentAnswer {
  problemId: number;
  answer: string;
}

export const SKILL_TRACKS: SkillTrack[] = [
  {
    id: 1,
    name: "SQL for Data Analytics",
    description: "E-commerce transactional analytics, aggregation queries, window functions, CTEs, and performance optimization.",
    icon: "🗄️",
    tags: ["SQL", "Analytics", "Data"],
  },
  {
    id: 2,
    name: "Python for Data Manipulation",
    description: "Financial data cleansing with Pandas/Polars, feature engineering, outlier handling, and vectorized operations.",
    icon: "🐍",
    tags: ["Python", "Pandas", "Data Science"],
  },
  {
    id: 3,
    name: "Solidity & Smart Contracts",
    description: "DeFi and tokenized state management, reentrancy prevention, access control, gas optimization, and storage patterns.",
    icon: "⛓️",
    tags: ["Solidity", "Web3", "EVM"],
  },
];

export function getSkillTrack(skillId: number): SkillTrack | undefined {
  return SKILL_TRACKS.find((track) => track.id === skillId);
}

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

export interface AssessmentQuestion {
  sessionId: string;
  skillId: number;
  skillName: string;
  scenarioTitle: string;
  businessContext: string;
  schema: string;
  challenge: string;
  evaluationCriteria: string[];
}

export interface RubricBreakdown {
  logic: number;
  efficiency: number;
  edgeCases: number;
  syntax: number;
}

export interface EvaluationFeedback {
  summary: string;
  breakdown: RubricBreakdown;
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

import { SKILL_TRACKS, type AssessmentCase } from '@/types';

/**
 * Track-specific guidance injected into the generator prompt.
 * Kept separate from SKILL_TRACKS so UI copy and prompt copy can evolve apart.
 */
const TRACK_GUIDANCE: Record<number, string> = {
  1: [
    'The candidate writes ANSI SQL.',
    'Focus the problems on multi-table JOINs, aggregation, subqueries/CTEs, window functions',
    '(ROW_NUMBER, DENSE_RANK, LAG), NULL handling, and index-aware query design.',
    'A good mock schema uses tables such as users, orders, order_items, products.',
  ].join(' '),
  2: [
    'The candidate writes Python (pandas/polars).',
    'Focus the problems on DataFrame manipulation, outlier handling, missing-value imputation,',
    'type transformations, chained operations, and vectorised (non-looping) implementations.',
    'A good mock schema describes DataFrame columns with their dtypes.',
  ].join(' '),
  3: [
    'The candidate writes Solidity.',
    'Focus the problems on storage vs memory, access control (Ownable/roles), error handling',
    '(require/revert/custom errors), reentrancy prevention, and gas optimisation.',
    'A good mock schema describes the contract state layout (structs, mappings, modifiers).',
  ].join(' '),
};

export function getTrackName(skillId: number): string {
  return SKILL_TRACKS.find((track) => track.id === skillId)?.name ?? 'Technical Assessment';
}

export function buildGenerateSystemPrompt(skillId: number): string {
  return [
    `You are a Lead Technical Evaluator specialising in ${getTrackName(skillId)}.`,
    '',
    'Design ONE realistic, industry-grade business case study and split it into EXACTLY THREE',
    'progressive problems.',
    '',
    'Rules:',
    '- Difficulty: intermediate to advanced.',
    '- Problem 1 is a foundational warm-up, Problem 2 requires intermediate reasoning, and',
    '  Problem 3 is an advanced problem that specifically probes edge cases and efficiency.',
    '- Give a concrete business scenario (e.g. retention drop, inventory valuation, suspicious',
    '  transaction detection, liquidation risk, fee accounting).',
    '- Provide a realistic mock data schema the candidate can work against.',
    '- Every problem must be hands-on problem solving. NEVER ask for definitions, theory, or',
    '  memorised syntax.',
    '- Each problem needs 2-6 concrete evaluation criteria a reviewer can verify.',
    `- ${TRACK_GUIDANCE[skillId] ?? ''}`,
    '- Invent fresh numbers, entity names, and framing every single time. Never reuse a scenario.',
    '- Reply with JSON only, matching the provided schema. No markdown, no prose.',
  ].join('\n');
}

export function buildGenerateUserPrompt(params: {
  walletAddress: string;
  skillId: number;
}): string {
  return [
    `Skill track: ${getTrackName(params.skillId)} (skillId=${params.skillId}).`,
    `Candidate wallet: ${params.walletAddress}.`,
    '',
    'Generate a brand new case study for this candidate. Make it clearly different from any',
    'scenario you have produced before: different industry sub-domain, different metrics,',
    'different constraints.',
  ].join('\n');
}

export function buildEvaluateSystemPrompt(skillId: number): string {
  return [
    `You are a Chief Technical Auditor evaluating a ${getTrackName(skillId)} submission.`,
    'Be strict, objective, and uncompromising. Do not be generous.',
    '',
    'Scoring rubric (total 100):',
    '1. Functional correctness & logic - max 40. Does the solution precisely solve each problem?',
    '2. Efficiency & performance - max 25. Is the approach optimal (algorithmic complexity,',
    '   avoiding wasteful subqueries/loops, memory usage)?',
    '3. Edge case handling - max 20. NULLs, duplicates, empty input, division by zero, boundary',
    '   conditions, overflow, reentrancy?',
    '4. Syntax & conventions - max 15. Readability, formatting, structure, idiomatic usage.',
    '',
    'Rules:',
    '- Score each of the three problems individually in `perProblem` (0-100 each).',
    '- `rubricBreakdown` values must respect the per-metric maximums above.',
    '- `score` must equal the sum of the four rubric metrics (rounded to an integer).',
    '- `passed` must be true only when `score` is 80 or higher.',
    '- An empty, irrelevant, or copy-pasted answer must score near zero.',
    '- Feedback must be specific and actionable, quoting what the candidate actually wrote.',
    '- Reply with JSON only, matching the provided schema. No markdown, no prose.',
  ].join('\n');
}

export function buildEvaluateUserPrompt(params: {
  assessment: AssessmentCase;
  answers: { problemId: number; answer: string }[];
}): string {
  const { assessment, answers } = params;

  const problemBlocks = assessment.problems
    .map((problem) =>
      [
        `Problem ${problem.id} - ${problem.title} (difficulty: ${problem.difficulty})`,
        problem.problemStatement,
        `Evaluation criteria: ${problem.evaluationCriteria.join(' | ')}`,
      ].join('\n'),
    )
    .join('\n\n');

  const answerBlocks = answers
    .map((entry) => {
      const answer = entry.answer.trim();
      return [
        `--- Answer for Problem ${entry.problemId} ---`,
        answer.length > 0 ? answer : '(no answer submitted)',
      ].join('\n');
    })
    .join('\n\n');

  return [
    `SKILL TRACK: ${getTrackName(assessment.skillId)}`,
    '',
    'CASE STUDY',
    `Scenario: ${assessment.scenarioTitle}`,
    `Business context: ${assessment.businessContext}`,
    'Data schema:',
    assessment.schema,
    '',
    'PROBLEMS',
    problemBlocks,
    '',
    'CANDIDATE SUBMISSION',
    answerBlocks,
    '',
    'Evaluate the submission against the rubric.',
  ].join('\n');
}

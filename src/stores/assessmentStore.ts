'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AssessmentCase, EvaluationResult } from '@/types';

export type AssessmentPhase =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'evaluating'
  | 'evaluated'
  | 'error';

interface AssessmentStoreState {
  sessionId: string | null;
  assessment: AssessmentCase | null;
  answers: Record<number, string>;
  result: EvaluationResult | null;
  phase: AssessmentPhase;
  error: string | null;

  setLoading: () => void;
  setAssessment: (assessment: AssessmentCase) => void;
  setAnswer: (problemId: number, value: string) => void;
  setEvaluating: () => void;
  setResult: (result: EvaluationResult) => void;
  setError: (message: string) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  assessment: null,
  answers: {} as Record<number, string>,
  result: null,
  phase: 'idle' as AssessmentPhase,
  error: null,
};

/**
 * Holds the in-progress assessment so a soft refresh does not throw away the
 * candidate's draft. Only the draft is persisted; transient UI state is not.
 */
export const useAssessmentStore = create<AssessmentStoreState>()(
  persist(
    (set) => ({
      ...initialState,

      setLoading: () => set({ phase: 'loading', error: null, result: null }),

      setAssessment: (assessment) =>
        set({
          assessment,
          sessionId: assessment.sessionId,
          answers: {},
          result: null,
          error: null,
          phase: 'ready',
        }),

      setAnswer: (problemId, value) =>
        set((state) => ({ answers: { ...state.answers, [problemId]: value } })),

      setEvaluating: () => set({ phase: 'evaluating', error: null }),

      setResult: (result) => set({ result, phase: 'evaluated', error: null }),

      setError: (message) => set({ phase: 'error', error: message }),

      reset: () => set({ ...initialState }),
    }),
    {
      name: 'pos-assessment',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        assessment: state.assessment,
        answers: state.answers,
      }),
    },
  ),
);

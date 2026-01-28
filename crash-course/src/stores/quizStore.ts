import { create } from 'zustand';
import type {
  QuizState,
  QuestionAttempt,
  QuizAttempt,
  SM2Data,
} from '../types/quiz';
import {
  PASS_THRESHOLD,
  BASE_BOSS_HEALTH,
  BASE_PLAYER_HEALTH,
  SM2_DEFAULT_EASE,
  SM2_MIN_EASE,
} from '../types/quiz';

const QUIZ_STORAGE_KEY = 'crash-course-quiz-data';

export const useQuizStore = create<QuizState>()((set, get) => ({
  // Initial state
  activeQuiz: null,
  bossHealth: BASE_BOSS_HEALTH,
  playerHealth: BASE_PLAYER_HEALTH,
  maxBossHealth: BASE_BOSS_HEALTH,
  maxPlayerHealth: BASE_PLAYER_HEALTH,
  quizAttempts: [],
  sm2Data: {},

  // Actions
  startQuiz: (quizId, questions) => {
    set({
      activeQuiz: {
        quizId,
        questions,
        currentIndex: 0,
        answers: [],
        startedAt: new Date().toISOString(),
        hintsUsed: 0,
      },
      bossHealth: BASE_BOSS_HEALTH,
      playerHealth: BASE_PLAYER_HEALTH,
      maxBossHealth: BASE_BOSS_HEALTH,
      maxPlayerHealth: BASE_PLAYER_HEALTH,
    });
  },

  answerQuestion: (answerIndex, timeSpent) => {
    const { activeQuiz } = get();
    if (!activeQuiz) return;

    const currentQuestion = activeQuiz.questions[activeQuiz.currentIndex];
    const isCorrect = answerIndex === currentQuestion.correctAnswer;

    // Count previous attempts for this question
    const previousAttempts = activeQuiz.answers.filter(
      (a) => a.questionId === currentQuestion.id
    ).length;

    const attempt: QuestionAttempt = {
      questionId: currentQuestion.id,
      selectedAnswer: answerIndex,
      isCorrect,
      timeSpent,
      attemptNumber: previousAttempts + 1,
    };

    set({
      activeQuiz: {
        ...activeQuiz,
        answers: [...activeQuiz.answers, attempt],
      },
    });

    // Update SM-2 data based on performance
    // Quality: 5=perfect, 4=correct after hesitation, 3=correct with difficulty
    // 2=incorrect but remembered after seeing answer, 1=incorrect, 0=complete blackout
    const quality = isCorrect
      ? previousAttempts === 0
        ? 5
        : previousAttempts === 1
        ? 4
        : 3
      : previousAttempts >= 2
      ? 1
      : 2;

    get().updateSM2(currentQuestion.id, quality as 0 | 1 | 2 | 3 | 4 | 5);
  },

  useHint: () => {
    const { activeQuiz } = get();
    if (!activeQuiz) return undefined;

    const currentQuestion = activeQuiz.questions[activeQuiz.currentIndex];

    set({
      activeQuiz: {
        ...activeQuiz,
        hintsUsed: activeQuiz.hintsUsed + 1,
      },
    });

    return currentQuestion.hint;
  },

  nextQuestion: () => {
    const { activeQuiz } = get();
    if (!activeQuiz) return;

    if (activeQuiz.currentIndex < activeQuiz.questions.length - 1) {
      set({
        activeQuiz: {
          ...activeQuiz,
          currentIndex: activeQuiz.currentIndex + 1,
        },
      });
    }
  },

  endQuiz: () => {
    const { activeQuiz, quizAttempts } = get();
    if (!activeQuiz) return null;

    // Calculate score (only count first attempt per question)
    const firstAttempts = new Map<string, QuestionAttempt>();
    activeQuiz.answers.forEach((a) => {
      if (!firstAttempts.has(a.questionId)) {
        firstAttempts.set(a.questionId, a);
      }
    });

    const correctCount = Array.from(firstAttempts.values()).filter(
      (a) => a.isCorrect
    ).length;
    const totalQuestions = activeQuiz.questions.length;
    const score = totalQuestions > 0 ? correctCount / totalQuestions : 0;
    const passed = score >= PASS_THRESHOLD;

    const attempt: QuizAttempt = {
      quizId: activeQuiz.quizId,
      questions: activeQuiz.answers,
      score: Math.round(score * 100),
      passed,
      startedAt: activeQuiz.startedAt,
      completedAt: new Date().toISOString(),
      totalTime: activeQuiz.answers.reduce((sum, a) => sum + a.timeSpent, 0),
    };

    set({
      activeQuiz: null,
      quizAttempts: [...quizAttempts, attempt],
    });

    get().saveQuizData();
    return attempt;
  },

  // Boss battle actions
  dealDamageToBoss: (damage) => {
    set((state) => ({
      bossHealth: Math.max(0, state.bossHealth - damage),
    }));
  },

  takeDamage: (damage) => {
    set((state) => ({
      playerHealth: Math.max(0, state.playerHealth - damage),
    }));
  },

  resetBattle: (bossHealth, playerHealth) => {
    set({
      bossHealth,
      playerHealth,
      maxBossHealth: bossHealth,
      maxPlayerHealth: playerHealth,
    });
  },

  // SM-2 Algorithm implementation
  updateSM2: (questionId, quality) => {
    const { sm2Data } = get();
    const existing = sm2Data[questionId] || {
      questionId,
      easeFactor: SM2_DEFAULT_EASE,
      interval: 0,
      repetitions: 0,
      lastReview: null,
      nextReview: null,
    };

    let { easeFactor, interval, repetitions } = existing;

    if (quality >= 3) {
      // Correct response
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
    } else {
      // Incorrect response - reset
      repetitions = 0;
      interval = 1;
    }

    // Update ease factor
    easeFactor = Math.max(
      SM2_MIN_EASE,
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    const now = new Date();
    const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

    const updated: SM2Data = {
      questionId,
      easeFactor,
      interval,
      repetitions,
      lastReview: now.toISOString(),
      nextReview: nextReview.toISOString(),
    };

    set({
      sm2Data: {
        ...sm2Data,
        [questionId]: updated,
      },
    });
  },

  getNextReviewQuestions: (_topic) => {
    const { sm2Data } = get();
    const now = new Date();

    return Object.values(sm2Data)
      .filter((data) => {
        if (!data.nextReview) return true;
        return new Date(data.nextReview) <= now;
      })
      .sort((a, b) => a.easeFactor - b.easeFactor) // Prioritize lower ease (harder)
      .map((data) => data.questionId);
  },

  // Persistence
  loadQuizData: () => {
    try {
      const saved = localStorage.getItem(QUIZ_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        set({
          quizAttempts: data.quizAttempts || [],
          sm2Data: data.sm2Data || {},
        });
      }
    } catch (e) {
      console.error('Failed to load quiz data:', e);
    }
  },

  saveQuizData: () => {
    const { quizAttempts, sm2Data } = get();
    try {
      localStorage.setItem(
        QUIZ_STORAGE_KEY,
        JSON.stringify({ quizAttempts, sm2Data })
      );
    } catch (e) {
      console.error('Failed to save quiz data:', e);
    }
  },
}));

// Selector hooks
export const useActiveQuiz = () => useQuizStore((s) => s.activeQuiz);
export const useBossHealth = () => useQuizStore((s) => s.bossHealth);
export const usePlayerHealth = () => useQuizStore((s) => s.playerHealth);
export const useQuizAttempts = () => useQuizStore((s) => s.quizAttempts);

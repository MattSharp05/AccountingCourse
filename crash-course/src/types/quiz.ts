// Quiz and boss battle types

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type QuizTopic =
  | 'financial-statements-intro'
  | 'balance-sheet'
  | 'income-statement'
  | 'cash-flow'
  | 'financial-ratios';

export interface QuizQuestion {
  id: string;
  topic: QuizTopic;
  difficulty: Difficulty;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option
  explanation: string;
  hint?: string;
}

export interface QuestionAttempt {
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  timeSpent: number; // Seconds
  attemptNumber: number;
}

export interface QuizAttempt {
  quizId: string;
  questions: QuestionAttempt[];
  score: number;
  passed: boolean;
  startedAt: string;
  completedAt: string;
  totalTime: number;
}

// SM-2 Spaced Repetition types
export interface SM2Data {
  questionId: string;
  easeFactor: number; // Default 2.5, min 1.3
  interval: number; // Days until next review
  repetitions: number;
  lastReview: string | null;
  nextReview: string | null;
}

export interface QuizState {
  // Current quiz session
  activeQuiz: {
    quizId: string;
    questions: QuizQuestion[];
    currentIndex: number;
    answers: QuestionAttempt[];
    startedAt: string;
    hintsUsed: number;
  } | null;

  // Boss battle state
  bossHealth: number;
  playerHealth: number;
  maxBossHealth: number;
  maxPlayerHealth: number;

  // History
  quizAttempts: QuizAttempt[];
  sm2Data: Record<string, SM2Data>;

  // Actions
  startQuiz: (quizId: string, questions: QuizQuestion[]) => void;
  answerQuestion: (answerIndex: number, timeSpent: number) => void;
  useHint: () => string | undefined;
  nextQuestion: () => void;
  endQuiz: () => QuizAttempt | null;

  // Boss battle actions
  dealDamageToBoss: (damage: number) => void;
  takeDamage: (damage: number) => void;
  resetBattle: (bossHealth: number, playerHealth: number) => void;

  // SM-2 actions
  updateSM2: (questionId: string, quality: 0 | 1 | 2 | 3 | 4 | 5) => void;
  getNextReviewQuestions: (topic?: QuizTopic) => string[];

  // Persistence
  loadQuizData: () => void;
  saveQuizData: () => void;
}

// Quiz pass threshold
export const PASS_THRESHOLD = 0.7; // 70%

// Boss battle constants
export const BASE_BOSS_HEALTH = 100;
export const BASE_PLAYER_HEALTH = 3; // 3 lives/hearts
export const DAMAGE_PER_CORRECT = 20;
export const HINTS_PENALTY_DAMAGE = 5; // Less damage if hint used

// SM-2 Algorithm constants
export const SM2_DEFAULT_EASE = 2.5;
export const SM2_MIN_EASE = 1.3;

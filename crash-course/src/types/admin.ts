// Admin types for Crash Course - Course Builder

import type { Node, Edge } from '@xyflow/react';

// ── Enums ──────────────────────────────────────────────

export type UserRole = 'professor' | 'student';
export type PublishStatus = 'draft' | 'published' | 'archived';
export type MapStatus = 'draft' | 'published' | 'hidden';
export type ContentItemType = 'video' | 'pdf' | 'file' | 'text' | 'quiz';

// ── Auth ───────────────────────────────────────────────

export interface UserProfile {
  id: string;
  role: UserRole;
  displayName: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
}

// ── Course Hierarchy ───────────────────────────────────

export interface Course {
  id: string;
  professorId: string;
  title: string;
  description: string;
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MapData {
  id: string;
  moduleId: string;
  title: string;
  status: MapStatus;
  canvasData: CanvasData | null;
  mapConfig: MapConfig | null;
  createdAt: string;
  updatedAt: string;
}

// ── Content ────────────────────────────────────────────

export interface Chapter {
  id: string;
  mapId: string;
  title: string;
  order: number;
}

export interface Checkpoint {
  id: string;
  chapterId: string;
  title: string;
  description: string;
  order: number;
  createdAt: string;
}

export interface ContentItem {
  id: string;
  checkpointId: string;
  type: ContentItemType;
  title: string;
  description: string;
  fileUrl?: string;
  textContent?: string;
  quizData?: QuizData;
  metadata?: Record<string, unknown>;
  order: number;
  createdAt: string;
}

export interface QuizData {
  questions: QuizQuestion[];
  passingScore: number;
  bossName?: string;
  bossEmoji?: string;
}

// Question types (discriminated union)
// - mcq: 2+ options, one correct (covers True/False when options.length === 2)
// - short_answer: text input graded against an expected answer with optional alternates
// - numeric: number input graded with optional tolerance
export type QuizQuestionType = 'mcq' | 'short_answer' | 'numeric';

export interface BaseQuizQuestion {
  id: string;
  question: string;
  explanation?: string;
  points?: number;
}

export interface MCQQuizQuestion extends BaseQuizQuestion {
  type: 'mcq';
  options: string[];
  correctIndex: number;
}

export interface ShortAnswerQuizQuestion extends BaseQuizQuestion {
  type: 'short_answer';
  expectedAnswer: string;
  acceptableAnswers?: string[];
  caseSensitive?: boolean;
}

export interface NumericQuizQuestion extends BaseQuizQuestion {
  type: 'numeric';
  expectedValue: number;
  tolerance?: number;
  unit?: string;
}

export type QuizQuestion = MCQQuizQuestion | ShortAnswerQuizQuestion | NumericQuizQuestion;

/**
 * Normalize a raw quiz_data row from the DB. Existing rows written before
 * question types existed have no `type` field — treat them as MCQ so the
 * rest of the app can safely use the discriminated union.
 */
export function normalizeQuizQuestion(raw: unknown): QuizQuestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const q = raw as Record<string, unknown>;
  const id = typeof q.id === 'string' ? q.id : `q-${Math.random().toString(36).slice(2, 8)}`;
  const question = typeof q.question === 'string' ? q.question : '';
  const explanation = typeof q.explanation === 'string' ? q.explanation : undefined;
  const points = typeof q.points === 'number' ? q.points : undefined;
  const rawType = typeof q.type === 'string' ? q.type : 'mcq';

  if (rawType === 'short_answer' && typeof q.expectedAnswer === 'string') {
    return {
      id,
      type: 'short_answer',
      question,
      explanation,
      points,
      expectedAnswer: q.expectedAnswer,
      acceptableAnswers: Array.isArray(q.acceptableAnswers)
        ? q.acceptableAnswers.filter((a): a is string => typeof a === 'string')
        : undefined,
      caseSensitive: typeof q.caseSensitive === 'boolean' ? q.caseSensitive : false,
    };
  }

  if (rawType === 'numeric' && typeof q.expectedValue === 'number') {
    return {
      id,
      type: 'numeric',
      question,
      explanation,
      points,
      expectedValue: q.expectedValue,
      tolerance: typeof q.tolerance === 'number' ? q.tolerance : undefined,
      unit: typeof q.unit === 'string' ? q.unit : undefined,
    };
  }

  // Default to MCQ (covers legacy rows without a `type` field)
  if (!Array.isArray(q.options) || q.options.length < 2) return null;
  const options = (q.options as unknown[]).filter((o): o is string => typeof o === 'string');
  if (options.length < 2) return null;
  const correctIndex = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
  return {
    id,
    type: 'mcq',
    question,
    explanation,
    points,
    options,
    correctIndex: Math.max(0, Math.min(options.length - 1, Math.floor(correctIndex))),
  };
}

export function normalizeQuizData(raw: unknown): QuizData {
  if (!raw || typeof raw !== 'object') {
    return { questions: [], passingScore: 70 };
  }
  const d = raw as Record<string, unknown>;
  const questions = Array.isArray(d.questions)
    ? d.questions.map(normalizeQuizQuestion).filter((q): q is QuizQuestion => q !== null)
    : [];
  return {
    questions,
    passingScore: typeof d.passingScore === 'number' ? d.passingScore : 70,
    bossName: typeof d.bossName === 'string' ? d.bossName : undefined,
    bossEmoji: typeof d.bossEmoji === 'string' ? d.bossEmoji : undefined,
  };
}

// ── Canvas (React Flow state) ──────────────────────────

export interface CanvasData {
  nodes: Node<ContentNodeData>[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
}

export interface ContentNodeData {
  checkpointId: string;
  title: string;
  chapterTitle?: string;
  sectionColor?: string;
  isStart?: boolean;
  [key: string]: unknown;
}

// ── Built Map Config (3D output) ───────────────────────

export interface MapConfig {
  nodes: MapConfigNode[];
  edges: MapConfigEdge[];
  startNodeId?: string;
  builtAt: string;
}

export interface MapConfigNode {
  id: string;
  checkpointId: string;
  title: string;
  description: string;
  position: [number, number, number];
  xpReward: number;
  prerequisites: string[];
  groupId?: string;
  groupColor?: string;
}

export interface MapConfigEdge {
  id: string;
  source: string;
  target: string;
}

// ── Student Progress ───────────────────────────────────

export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface StudentProgress {
  id: string;
  studentId: string;
  checkpointId: string;
  mapId: string;
  status: ProgressStatus;
  score?: number;
  completedAt?: string;
}

// ── Store types ────────────────────────────────────────

export interface AuthState {
  user: UserProfile | null;
  session: unknown;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

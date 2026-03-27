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

export interface ContentItem {
  id: string;
  chapterId: string;
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

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

// ── Canvas (React Flow state) ──────────────────────────

export interface CanvasData {
  nodes: Node<ContentNodeData>[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
}

export interface ContentNodeData {
  contentItemId: string;
  title: string;
  type: ContentItemType;
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
  contentItemId: string;
  type: ContentItemType;
  title: string;
  description: string;
  position: [number, number, number]; // 3D position
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
  contentItemId: string;
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

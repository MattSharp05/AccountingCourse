// Content types for educational materials

export interface VideoContent {
  type: 'video';
  videoUrl: string;
  duration: number; // Seconds
  transcript?: string;
  thumbnailUrl?: string;
}

export interface ReadingContent {
  type: 'reading';
  markdown: string;
  estimatedReadTime: number; // Minutes
  images?: string[];
}

export interface ExerciseContent {
  type: 'exercise';
  instructions: string;
  questions: ExerciseQuestion[];
}

export interface ExerciseQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'fill-blank' | 'matching';
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
}

export interface QuizBossContent {
  type: 'quiz-boss';
  bossName: string;
  bossDescription: string;
  bossImageUrl?: string;
  questionCount: number;
  topics: string[];
  passingScore: number;
}

export type ContentData =
  | VideoContent
  | ReadingContent
  | ExerciseContent
  | QuizBossContent;

export interface ContentProgress {
  nodeId: string;
  started: boolean;
  completed: boolean;
  progress: number; // 0-100
  lastAccessedAt: string | null;
  completedAt: string | null;
}

// Chat types for AI tutor
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ChatContext {
  module?: number;
  mapId?: string;
  mapTitle?: string;
  checkpointId?: string;
  checkpointTitle?: string;
  topic?: string | null;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isOpen: boolean;
  error: string | null;

  // Context for AI
  currentModule: number;
  currentTopic: string | null;
  currentMapId: string | null;
  currentMapTitle: string | null;
  currentCheckpointId: string | null;
  currentCheckpointTitle: string | null;
  strugglingTopics: string[];

  // Actions
  sendMessage: (content: string, courseContent?: string) => Promise<void>;
  toggleChat: () => void;
  clearChat: () => void;
  setContext: (context: ChatContext) => void;
  addStrugglingTopic: (topic: string) => void;
}

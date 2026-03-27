// Core game types for Crash Course

export type Vector3 = [number, number, number];

export type ContentType = 'video' | 'reading' | 'exercise' | 'quiz-boss';

export type NodeStatus = 'locked' | 'unlocked' | 'completed';

export interface ContentNode {
  id: string;
  type: ContentType;
  title: string;
  description: string;
  position: Vector3;
  prerequisites: string[];
  xpReward: number;
  moduleId: number;
  groupId?: string;
  groupColor?: string;
}

export interface PlayerProgress {
  currentModule: number;
  completedNodes: string[];
  xp: number;
  level: number;
  badges: string[];
  streak: number;
  lastPlayedAt: string | null;
}

export interface AvatarState {
  position: Vector3;
  rotation: number;
  animation: 'idle' | 'walk' | 'run';
}

export interface GameState {
  // Current state
  currentModule: number;
  currentNodeId: string | null;
  isContentOpen: boolean;
  teleportTarget: Vector3 | null;

  // Player data
  playerProgress: PlayerProgress;
  avatarState: AvatarState;

  // Actions
  setCurrentModule: (module: number) => void;
  setCurrentNode: (nodeId: string | null) => void;
  openContent: () => void;
  closeContent: () => void;
  completeNode: (nodeId: string) => void;
  addXp: (amount: number) => void;
  updateAvatarPosition: (position: Vector3) => void;
  updateAvatarAnimation: (animation: AvatarState['animation']) => void;
  teleportTo: (position: Vector3) => void;
  clearTeleportTarget: () => void;

  // Persistence
  saveProgress: () => void;
  loadProgress: () => void;
  resetProgress: () => void;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

// Level thresholds
export const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  850,    // Level 5
  1300,   // Level 6
  1850,   // Level 7
  2500,   // Level 8
  3250,   // Level 9
  4100,   // Level 10
] as const;

export function calculateLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

export function xpToNextLevel(xp: number): { current: number; required: number; progress: number } {
  const currentLevel = calculateLevel(xp);
  const currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[currentLevel] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];

  const current = xp - currentThreshold;
  const required = nextThreshold - currentThreshold;
  const progress = required > 0 ? (current / required) * 100 : 100;

  return { current, required, progress };
}

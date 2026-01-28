import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { GameState, PlayerProgress, AvatarState, Vector3 } from '../types/game';
import { calculateLevel } from '../types/game';

const STORAGE_KEY = 'crash-course-progress';

const defaultPlayerProgress: PlayerProgress = {
  currentModule: 1,
  completedNodes: [],
  xp: 0,
  level: 1,
  badges: [],
  streak: 0,
  lastPlayedAt: null,
};

const defaultAvatarState: AvatarState = {
  position: [0, 0, 0],
  rotation: 0,
  animation: 'idle',
};

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentModule: 1,
    currentNodeId: null,
    isContentOpen: false,
    playerProgress: defaultPlayerProgress,
    avatarState: defaultAvatarState,

    // Actions
    setCurrentModule: (module) => {
      set({ currentModule: module });
      get().saveProgress();
    },

    setCurrentNode: (nodeId) => {
      set({ currentNodeId: nodeId });
    },

    openContent: () => {
      set({ isContentOpen: true });
    },

    closeContent: () => {
      set({ isContentOpen: false, currentNodeId: null });
    },

    completeNode: (nodeId) => {
      const { playerProgress } = get();
      if (playerProgress.completedNodes.includes(nodeId)) {
        return; // Already completed
      }

      set({
        playerProgress: {
          ...playerProgress,
          completedNodes: [...playerProgress.completedNodes, nodeId],
        },
      });
      get().saveProgress();
    },

    addXp: (amount) => {
      const { playerProgress } = get();
      const newXp = playerProgress.xp + amount;
      const newLevel = calculateLevel(newXp);

      set({
        playerProgress: {
          ...playerProgress,
          xp: newXp,
          level: newLevel,
        },
      });
      get().saveProgress();
    },

    updateAvatarPosition: (position: Vector3) => {
      set((state) => ({
        avatarState: {
          ...state.avatarState,
          position,
        },
      }));
    },

    updateAvatarAnimation: (animation) => {
      set((state) => ({
        avatarState: {
          ...state.avatarState,
          animation,
        },
      }));
    },

    // Persistence
    saveProgress: () => {
      const { playerProgress, currentModule } = get();
      const data = {
        playerProgress: {
          ...playerProgress,
          lastPlayedAt: new Date().toISOString(),
        },
        currentModule,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.error('Failed to save progress:', e);
      }
    },

    loadProgress: () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          set({
            playerProgress: {
              ...defaultPlayerProgress,
              ...data.playerProgress,
            },
            currentModule: data.currentModule || 1,
          });
        }
      } catch (e) {
        console.error('Failed to load progress:', e);
      }
    },

    resetProgress: () => {
      set({
        currentModule: 1,
        currentNodeId: null,
        isContentOpen: false,
        playerProgress: defaultPlayerProgress,
        avatarState: defaultAvatarState,
      });
      localStorage.removeItem(STORAGE_KEY);
    },
  }))
);

// Selector hooks for optimized re-renders
export const useCurrentModule = () => useGameStore((s) => s.currentModule);
export const useCurrentNode = () => useGameStore((s) => s.currentNodeId);
export const useIsContentOpen = () => useGameStore((s) => s.isContentOpen);
export const usePlayerXp = () => useGameStore((s) => s.playerProgress.xp);
export const usePlayerLevel = () => useGameStore((s) => s.playerProgress.level);
export const useCompletedNodes = () => useGameStore((s) => s.playerProgress.completedNodes);
export const useAvatarPosition = () => useGameStore((s) => s.avatarState.position);

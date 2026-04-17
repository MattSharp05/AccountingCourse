import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { GameState, PlayerProgress, AvatarState, Vector3 } from '../types/game';
import { calculateLevel } from '../types/game';

const STORAGE_KEY = 'crash-course-progress';

const defaultPlayerProgress: PlayerProgress = {
  currentModule: 1,
  completedNodes: {},
  xp: 0,
  level: 1,
  badges: [],
  streak: 0,
  lastPlayedAt: null,
};

/** Stable empty array so the per-map selector returns the same reference
 * when a map has no completions yet — otherwise React would re-render on
 * every state change because `[] !== []`. */
const EMPTY_COMPLETED: string[] = [];

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
    teleportTarget: null,
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

    completeNode: (mapId, nodeId) => {
      const { playerProgress } = get();
      const current = playerProgress.completedNodes[mapId] ?? [];
      if (current.includes(nodeId)) {
        console.log('[gameStore] Node already completed:', nodeId, 'in map:', mapId);
        return;
      }

      const next = [...current, nodeId];
      console.log(
        '[gameStore] Completing node:', JSON.stringify(nodeId),
        'in map:', JSON.stringify(mapId),
        'Map completedNodes after:', JSON.stringify(next),
      );
      set({
        playerProgress: {
          ...playerProgress,
          completedNodes: {
            ...playerProgress.completedNodes,
            [mapId]: next,
          },
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

    teleportTo: (position) => {
      set({ teleportTarget: position });
    },

    clearTeleportTarget: () => {
      set({ teleportTarget: null });
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
        if (!saved) return;

        const data = JSON.parse(saved);
        const rawProgress = (data.playerProgress ?? {}) as Partial<PlayerProgress> & {
          completedNodes?: unknown;
        };

        // Migration: previously `completedNodes` was a flat `string[]`
        // shared across all maps. That polluted unlock checks with stale
        // IDs from other maps and from the legacy hardcoded module 1.
        // Drop any non-object value here — the user loses old completion
        // state, but it was already broken (cross-map ID collisions),
        // and the new shape is `Record<mapId, string[]>`.
        let completedNodes: Record<string, string[]> = {};
        if (
          rawProgress.completedNodes &&
          typeof rawProgress.completedNodes === 'object' &&
          !Array.isArray(rawProgress.completedNodes)
        ) {
          // Already in the new shape — copy over, validating each entry.
          for (const [mapId, ids] of Object.entries(rawProgress.completedNodes)) {
            if (Array.isArray(ids) && ids.every((x) => typeof x === 'string')) {
              completedNodes[mapId] = ids;
            }
          }
        } else if (Array.isArray(rawProgress.completedNodes)) {
          console.log(
            '[gameStore] Migrating legacy flat completedNodes array — dropping',
            rawProgress.completedNodes.length,
            'unscoped IDs (cross-map pollution).',
          );
          // Intentionally drop. completedNodes stays {}.
        }

        set({
          playerProgress: {
            ...defaultPlayerProgress,
            ...rawProgress,
            completedNodes,
          },
          currentModule: data.currentModule || 1,
        });
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
export const useCompletedNodes = (mapId: string): string[] =>
  useGameStore((s) => s.playerProgress.completedNodes[mapId] ?? EMPTY_COMPLETED);
export const useAvatarPosition = () => useGameStore((s) => s.avatarState.position);

import type { WorldPreset } from './types';

export const PRESET_SPARSE: WorldPreset = {
  terrain: { amplitude: 0.8, frequency: 0.03, octaves: 2, lacunarity: 2.0, persistence: 0.5 },
  zones: { forestEdgeMinDist: 2.5, meadowMinDist: 4.0, flankingMinDist: 2.5, corridorMinDist: 2.0 },
  path: { completedWidth: 1.6, availableWidth: 1.3, lockedWidth: 0.7 },
  clusters: { count: 4, minDist: 6.0, radiusMin: 3, radiusMax: 6 },
  fog: { near: 35, far: 90, color: '#c8dbb6' },
  mountains: { peaks: 10, heightMin: 6, heightMax: 15, innerRadius: 60, outerRadius: 80 },
  sky: { turbidity: 4, rayleigh: 2.0 },
};

export const PRESET_BALANCED: WorldPreset = {
  terrain: { amplitude: 1.5, frequency: 0.04, octaves: 3, lacunarity: 2.0, persistence: 0.5 },
  zones: { forestEdgeMinDist: 1.8, meadowMinDist: 2.5, flankingMinDist: 2.0, corridorMinDist: 1.5 },
  // Roads are visually emphasized: ~33% wider than before so the path
  // dominates the eyeline. Pairs with the wider corridor exclusion zone
  // in zonePlanner.classifyZone.
  path: { completedWidth: 2.4, availableWidth: 2.0, lockedWidth: 1.0 },
  clusters: { count: 6, minDist: 6.0, radiusMin: 3, radiusMax: 6 },
  fog: { near: 40, far: 110, color: '#c8dbb6' },
  // Mountain ring pushed out to match the larger world (canvas scale
  // bumped from 0.05 → 0.08 in buildMap.ts).
  mountains: { peaks: 14, heightMin: 8, heightMax: 20, innerRadius: 90, outerRadius: 120 },
  sky: { turbidity: 4, rayleigh: 2.0 },
};

export const PRESET_DENSE: WorldPreset = {
  terrain: { amplitude: 2.0, frequency: 0.05, octaves: 4, lacunarity: 2.0, persistence: 0.5 },
  zones: { forestEdgeMinDist: 1.5, meadowMinDist: 2.0, flankingMinDist: 1.8, corridorMinDist: 1.2 },
  path: { completedWidth: 2.0, availableWidth: 1.7, lockedWidth: 0.9 },
  clusters: { count: 8, minDist: 6.0, radiusMin: 3, radiusMax: 6 },
  fog: { near: 25, far: 70, color: '#c8dbb6' },
  mountains: { peaks: 14, heightMin: 10, heightMax: 25, innerRadius: 60, outerRadius: 80 },
  sky: { turbidity: 4, rayleigh: 2.0 },
};

// GLTF model paths for each decoration category + variant
const NK = '/models/environment/nature';

export const ASSET_PATHS = {
  tree: [
    `${NK}/CommonTree_1.gltf`,
    `${NK}/CommonTree_2.gltf`,
    `${NK}/CommonTree_3.gltf`,
    `${NK}/CommonTree_4.gltf`,
    `${NK}/CommonTree_5.gltf`,
    `${NK}/Pine_1.gltf`,
    `${NK}/Pine_2.gltf`,
    `${NK}/Pine_3.gltf`,
    `${NK}/Pine_4.gltf`,
    `${NK}/Pine_5.gltf`,
  ],
  bush: [
    `${NK}/Bush_Common.gltf`,
    `${NK}/Bush_Common_Flowers.gltf`,
  ],
  rockLarge: [
    `${NK}/Rock_Medium_1.gltf`,
    `${NK}/Rock_Medium_2.gltf`,
    `${NK}/Rock_Medium_3.gltf`,
  ],
  rockMedium: [
    `${NK}/Pebble_Round_1.gltf`,
    `${NK}/Pebble_Round_2.gltf`,
    `${NK}/Pebble_Round_3.gltf`,
  ],
  rockSmall: [
    `${NK}/Pebble_Square_1.gltf`,
    `${NK}/Pebble_Square_2.gltf`,
  ],
  grass: [
    `${NK}/Grass_Common_Short.gltf`,
    `${NK}/Grass_Common_Tall.gltf`,
    `${NK}/Grass_Wispy_Short.gltf`,
    `${NK}/Grass_Wispy_Tall.gltf`,
  ],
  flower: [
    `${NK}/Flower_3_Single.gltf`,
    `${NK}/Flower_4_Single.gltf`,
    `${NK}/Flower_3_Group.gltf`,
    `${NK}/Flower_4_Group.gltf`,
  ],
  mushroom: [
    `${NK}/Mushroom_Common.gltf`,
    `${NK}/Mushroom_Laetiporus.gltf`,
  ],
} as const;

export type AssetCategory = keyof typeof ASSET_PATHS;

// Scale correction factors — nature kit models are larger than the world's unit scale.
// These are multiplied into each instance's scale in instancedFoliage.
export const ASSET_BASE_SCALES: Record<AssetCategory, number> = {
  tree: 0.5,
  bush: 0.5,
  rockLarge: 0.45,
  rockMedium: 3.0,
  rockSmall: 2.0,
  grass: 0.3,
  flower: 0.2,
  mushroom: 0.5,
};

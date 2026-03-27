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
  path: { completedWidth: 1.8, availableWidth: 1.5, lockedWidth: 0.8 },
  clusters: { count: 6, minDist: 6.0, radiusMin: 3, radiusMax: 6 },
  fog: { near: 30, far: 80, color: '#c8dbb6' },
  mountains: { peaks: 12, heightMin: 8, heightMax: 20, innerRadius: 60, outerRadius: 80 },
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
const BASE = '/models/environment/gltf';

export const ASSET_PATHS = {
  tree: [
    `${BASE}/Tree_1_A_Color1.gltf`,
    `${BASE}/Tree_2_A_Color1.gltf`,
    `${BASE}/Tree_3_A_Color1.gltf`,
    `${BASE}/Tree_4_A_Color1.gltf`,
    `${BASE}/Tree_1_B_Color1.gltf`,
    `${BASE}/Tree_Bare_1_A_Color1.gltf`,
  ],
  bush: [
    `${BASE}/Bush_1_A_Color1.gltf`,
    `${BASE}/Bush_2_A_Color1.gltf`,
    `${BASE}/Bush_3_A_Color1.gltf`,
    `${BASE}/Bush_4_A_Color1.gltf`,
  ],
  rockLarge: [
    `${BASE}/Rock_3_A_Color1.gltf`,
    `${BASE}/Rock_3_D_Color1.gltf`,
  ],
  rockMedium: [
    `${BASE}/Rock_2_A_Color1.gltf`,
    `${BASE}/Rock_2_D_Color1.gltf`,
  ],
  rockSmall: [
    `${BASE}/Rock_1_A_Color1.gltf`,
    `${BASE}/Rock_1_D_Color1.gltf`,
  ],
  grass: [
    `${BASE}/Grass_1_A_Singlesided_Color1.gltf`,
    `${BASE}/Grass_2_A_Singlesided_Color1.gltf`,
    `${BASE}/Grass_1_C_Singlesided_Color1.gltf`,
  ],
} as const;

export type AssetCategory = keyof typeof ASSET_PATHS;

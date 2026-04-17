import type { ContentNode } from '../../../types/game';

// ── Zone System ─────────────────────────────────────────

export type Zone = 'nodePad' | 'pathCorridor' | 'pathFlanking' | 'openMeadow' | 'forestEdge';

// ── Decoration Types ────────────────────────────────────

export type DecorationCategory = 'tree' | 'bush' | 'rockLarge' | 'rockMedium' | 'rockSmall' | 'grass' | 'flower' | 'mushroom';

export interface DecorationInstance {
  x: number;
  z: number;
  y: number;
  rotation: number;
  scale: number;
  category: DecorationCategory;
  variantIndex: number;
}

// ── Connection ──────────────────────────────────────────

export interface Connection {
  from: ContentNode;
  to: ContentNode;
}

// ── Path Segment for Ribbon Rendering ───────────────────

export interface PathSegment {
  curve: { getPoint: (t: number) => { x: number; y: number; z: number } };
  from: ContentNode;
  to: ContentNode;
  state: 'completed' | 'available' | 'locked';
}

// ── Cluster ─────────────────────────────────────────────

export interface Cluster {
  x: number;
  z: number;
  radius: number;
  type: 'tree' | 'rock' | 'mixed';
}

// ── Distance Grid ───────────────────────────────────────

export interface DistanceGrid {
  pathDist: Float32Array;
  nodeDist: Float32Array;
  width: number;
  height: number;
  offsetX: number;
  offsetZ: number;
  resolution: number;
}

// ── Preset Configuration ────────────────────────────────

export interface WorldPreset {
  terrain: {
    amplitude: number;
    frequency: number;
    octaves: number;
    lacunarity: number;
    persistence: number;
  };
  zones: {
    forestEdgeMinDist: number;
    meadowMinDist: number;
    flankingMinDist: number;
    corridorMinDist: number;
  };
  path: {
    completedWidth: number;
    availableWidth: number;
    lockedWidth: number;
  };
  clusters: {
    count: number;
    minDist: number;
    radiusMin: number;
    radiusMax: number;
  };
  fog: {
    near: number;
    far: number;
    color: string;
  };
  mountains: {
    peaks: number;
    heightMin: number;
    heightMax: number;
    innerRadius: number;
    outerRadius: number;
  };
  sky: {
    turbidity: number;
    rayleigh: number;
  };
}

// ── World Data (computed once per node layout) ──────────

export interface WorldData {
  heightFn: (x: number, z: number) => number;
  heightGrid: Float32Array;
  gridSize: number;
  distanceGrid: DistanceGrid;
  decorations: DecorationInstance[];
  worldBounds: { minX: number; maxX: number; minZ: number; maxZ: number; size: number };
}

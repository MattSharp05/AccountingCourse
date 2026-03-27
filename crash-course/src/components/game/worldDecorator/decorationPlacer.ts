import type { ContentNode } from '../../../types/game';
import type { DecorationInstance, DecorationCategory, Cluster, Connection, WorldPreset, Zone } from './types';
import { buildDistanceGrid, sampleGrid, classifyZone, computeWorldBounds } from './zonePlanner';

// ── Seeded PRNG ─────────────────────────────────────────

function seededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Bridson's Poisson Disk Sampling (2D) ────────────────

function poissonDisk(
  minX: number, maxX: number,
  minZ: number, maxZ: number,
  minDist: number,
  rand: () => number,
  maxPoints = 500,
): [number, number][] {
  const cellSize = minDist / Math.SQRT2;
  const gridW = Math.ceil((maxX - minX) / cellSize);
  const gridH = Math.ceil((maxZ - minZ) / cellSize);
  const grid: (number | null)[] = new Array(gridW * gridH).fill(null);
  const points: [number, number][] = [];
  const active: number[] = [];
  const k = 30; // rejection limit

  const toGrid = (x: number, z: number): [number, number] => [
    Math.floor((x - minX) / cellSize),
    Math.floor((z - minZ) / cellSize),
  ];

  const addPoint = (x: number, z: number) => {
    const idx = points.length;
    points.push([x, z]);
    active.push(idx);
    const [gi, gj] = toGrid(x, z);
    if (gi >= 0 && gi < gridW && gj >= 0 && gj < gridH) {
      grid[gj * gridW + gi] = idx;
    }
  };

  const isValid = (x: number, z: number): boolean => {
    if (x < minX || x > maxX || z < minZ || z > maxZ) return false;
    const [gi, gj] = toGrid(x, z);
    const searchRadius = 2;
    for (let dj = -searchRadius; dj <= searchRadius; dj++) {
      for (let di = -searchRadius; di <= searchRadius; di++) {
        const ni = gi + di;
        const nj = gj + dj;
        if (ni < 0 || ni >= gridW || nj < 0 || nj >= gridH) continue;
        const pidx = grid[nj * gridW + ni];
        if (pidx === null) continue;
        const p = points[pidx];
        const dx = x - p[0];
        const dz = z - p[1];
        if (dx * dx + dz * dz < minDist * minDist) return false;
      }
    }
    return true;
  };

  // Seed point
  addPoint(minX + rand() * (maxX - minX), minZ + rand() * (maxZ - minZ));

  while (active.length > 0 && points.length < maxPoints) {
    const randIdx = Math.floor(rand() * active.length);
    const parentIdx = active[randIdx];
    const parent = points[parentIdx];
    let found = false;

    for (let attempt = 0; attempt < k; attempt++) {
      const angle = rand() * Math.PI * 2;
      const dist = minDist + rand() * minDist;
      const nx = parent[0] + Math.cos(angle) * dist;
      const nz = parent[1] + Math.sin(angle) * dist;
      if (isValid(nx, nz)) {
        addPoint(nx, nz);
        found = true;
        break;
      }
    }

    if (!found) {
      active.splice(randIdx, 1);
    }
  }

  return points;
}

// ── Asset Assignment ────────────────────────────────────

function assignCategory(
  zone: Zone,
  clusterType: 'tree' | 'rock' | 'mixed' | null,
  rand: () => number,
): DecorationCategory | null {
  if (zone === 'nodePad') return null;

  const r = rand();

  if (zone === 'pathCorridor') {
    // Only small rocks and grass
    if (r < 0.35) return 'rockSmall';
    return 'grass';
  }

  if (zone === 'forestEdge') {
    // Dense trees
    if (r < 0.45) return 'tree';
    if (r < 0.65) return 'bush';
    if (r < 0.80) return 'rockSmall';
    return 'grass';
  }

  // pathFlanking + openMeadow: use cluster influence
  if (clusterType === 'tree') {
    if (r < 0.35) return 'tree';
    if (r < 0.55) return 'bush';
    if (r < 0.70) return 'rockMedium';
    if (r < 0.85) return 'grass';
    return 'rockSmall';
  }
  if (clusterType === 'rock') {
    if (r < 0.25) return 'rockLarge';
    if (r < 0.50) return 'rockMedium';
    if (r < 0.65) return 'rockSmall';
    if (r < 0.85) return 'grass';
    return 'bush';
  }

  // Default / mixed
  if (zone === 'pathFlanking') {
    if (r < 0.20) return 'bush';
    if (r < 0.35) return 'rockSmall';
    if (r < 0.50) return 'tree';
    return 'grass';
  }

  // openMeadow
  if (r < 0.25) return 'tree';
  if (r < 0.40) return 'bush';
  if (r < 0.55) return 'rockMedium';
  if (r < 0.70) return 'grass';
  if (r < 0.85) return 'rockSmall';
  return 'rockLarge';
}

// Variant counts per category
const VARIANT_COUNTS: Record<DecorationCategory, number> = {
  tree: 6,
  bush: 4,
  rockLarge: 2,
  rockMedium: 2,
  rockSmall: 2,
  grass: 3,
};

// Scale ranges per category
const SCALE_RANGES: Record<DecorationCategory, [number, number]> = {
  tree: [0.7, 1.3],
  bush: [0.6, 1.1],
  rockLarge: [0.8, 1.4],
  rockMedium: [0.5, 1.0],
  rockSmall: [0.4, 0.8],
  grass: [0.6, 1.2],
};

// ── Main Placement Function ─────────────────────────────

export function placeDecorations(
  nodes: ContentNode[],
  connections: Connection[],
  heightFn: (x: number, z: number) => number,
  preset: WorldPreset,
): DecorationInstance[] {
  const seed = nodes.length * 7919 + 42;
  const rand = seededRandom(seed + 1000);

  const bounds = computeWorldBounds(nodes);
  const distGrid = buildDistanceGrid(nodes, connections, bounds);

  const { minX, maxX, minZ, maxZ, size } = bounds;
  const boundary = size / 2;

  // 1. Generate cluster centers via coarse Poisson disk
  const clusterPoints = poissonDisk(minX + 4, maxX - 4, minZ + 4, maxZ - 4, preset.clusters.minDist, rand, preset.clusters.count * 3);
  const clusters: Cluster[] = clusterPoints.slice(0, preset.clusters.count).map(([cx, cz]) => ({
    x: cx,
    z: cz,
    radius: preset.clusters.radiusMin + rand() * (preset.clusters.radiusMax - preset.clusters.radiusMin),
    type: rand() < 0.7 ? 'tree' : rand() < 0.7 ? 'rock' : 'mixed',
  }));

  // 2. Per-zone Poisson disk sampling
  const allPoints: [number, number][] = [];

  // Forest edge ring: boundary - 6 to boundary
  const edgePoints = poissonDisk(
    minX, maxX, minZ, maxZ,
    preset.zones.forestEdgeMinDist,
    seededRandom(seed + 2000),
    300,
  );
  for (const [px, pz] of edgePoints) {
    const { nodeDist } = sampleGrid(distGrid, px, pz);
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const edgeDist = boundary - Math.max(Math.abs(px - cx), Math.abs(pz - cz));
    if (edgeDist >= 0 && edgeDist < 6 && nodeDist > 3.5) {
      allPoints.push([px, pz]);
    }
  }

  // Interior: flanking + meadow + corridor
  const interiorPoints = poissonDisk(
    minX + 3, maxX - 3, minZ + 3, maxZ - 3,
    preset.zones.meadowMinDist,
    seededRandom(seed + 3000),
    400,
  );
  for (const p of interiorPoints) allPoints.push(p);

  // 3. Filter + classify + assign
  const decorations: DecorationInstance[] = [];
  const rand2 = seededRandom(seed + 4000);

  for (const [px, pz] of allPoints) {
    const { pathDist, nodeDist } = sampleGrid(distGrid, px, pz);
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const edgeDist = boundary - Math.max(Math.abs(px - cx), Math.abs(pz - cz));

    const zone = classifyZone(pathDist, nodeDist, edgeDist);
    if (zone === 'nodePad') continue;

    // Cluster attraction: find nearest cluster
    let nearCluster: Cluster | null = null;
    let nearClusterDist = Infinity;
    for (const c of clusters) {
      const d = Math.sqrt((px - c.x) ** 2 + (pz - c.z) ** 2);
      if (d < c.radius && d < nearClusterDist) {
        nearCluster = c;
        nearClusterDist = d;
      }
    }

    // Acceptance probability based on cluster proximity
    const acceptRate = nearCluster ? 1.0 : 0.6;
    if (rand2() > acceptRate) continue;

    const category = assignCategory(zone, nearCluster?.type ?? null, rand2);
    if (!category) continue;

    // Don't place trees in pathCorridor (extra safety)
    if (zone === 'pathCorridor' && (category === 'tree' || category === 'bush' || category === 'rockLarge' || category === 'rockMedium')) continue;

    const [scaleMin, scaleMax] = SCALE_RANGES[category];
    const scale = scaleMin + rand2() * (scaleMax - scaleMin);
    const rotation = rand2() * Math.PI * 2;
    const variantIndex = Math.floor(rand2() * VARIANT_COUNTS[category]);

    decorations.push({
      x: px,
      z: pz,
      y: heightFn(px, pz),
      rotation,
      scale,
      category,
      variantIndex,
    });
  }

  return decorations;
}

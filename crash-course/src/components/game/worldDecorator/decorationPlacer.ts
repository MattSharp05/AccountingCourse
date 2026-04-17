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
    if (r < 0.25) return 'rockSmall';
    if (r < 0.50) return 'grass';
    if (r < 0.75) return 'flower';
    return 'mushroom';
  }

  if (zone === 'forestEdge') {
    if (r < 0.40) return 'tree';
    if (r < 0.55) return 'bush';
    if (r < 0.65) return 'mushroom';
    if (r < 0.75) return 'rockSmall';
    if (r < 0.85) return 'grass';
    return 'flower';
  }

  // pathFlanking + openMeadow: use cluster influence
  if (clusterType === 'tree') {
    if (r < 0.30) return 'tree';
    if (r < 0.45) return 'bush';
    if (r < 0.55) return 'mushroom';
    if (r < 0.70) return 'rockMedium';
    if (r < 0.85) return 'grass';
    return 'flower';
  }
  if (clusterType === 'rock') {
    if (r < 0.20) return 'rockLarge';
    if (r < 0.40) return 'rockMedium';
    if (r < 0.55) return 'rockSmall';
    if (r < 0.70) return 'grass';
    if (r < 0.85) return 'flower';
    return 'bush';
  }

  // Default / mixed
  if (zone === 'pathFlanking') {
    if (r < 0.15) return 'bush';
    if (r < 0.30) return 'rockSmall';
    if (r < 0.45) return 'flower';
    if (r < 0.55) return 'grass';
    if (r < 0.65) return 'mushroom';
    return 'tree';
  }

  // openMeadow
  if (r < 0.20) return 'tree';
  if (r < 0.30) return 'bush';
  if (r < 0.42) return 'flower';
  if (r < 0.55) return 'grass';
  if (r < 0.65) return 'rockMedium';
  if (r < 0.75) return 'mushroom';
  if (r < 0.88) return 'rockSmall';
  return 'rockLarge';
}

// Variant counts per category
const VARIANT_COUNTS: Record<DecorationCategory, number> = {
  tree: 10,
  bush: 2,
  rockLarge: 3,
  rockMedium: 3,
  rockSmall: 2,
  grass: 4,
  flower: 4,
  mushroom: 2,
};

// Scale ranges per category (applied on top of ASSET_BASE_SCALES)
const SCALE_RANGES: Record<DecorationCategory, [number, number]> = {
  tree: [0.7, 1.3],
  bush: [0.6, 1.1],
  rockLarge: [0.8, 1.4],
  rockMedium: [0.5, 1.0],
  rockSmall: [0.4, 0.8],
  grass: [0.6, 1.2],
  flower: [0.5, 1.0],
  mushroom: [0.6, 1.0],
};

// ── Density Gradient ────────────────────────────────────
// Returns 0 at map center → 1 at map edge, using distance from the
// center of the node bounding box (not the padded world bounds).

function edgeFactor(
  px: number, pz: number,
  cx: number, cz: number,
  boundary: number,
): number {
  const dist = Math.max(Math.abs(px - cx), Math.abs(pz - cz));
  return Math.min(1, dist / boundary);
}

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
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;

  // 1. Generate cluster centers via coarse Poisson disk
  const clusterPoints = poissonDisk(minX + 4, maxX - 4, minZ + 4, maxZ - 4, preset.clusters.minDist, rand, preset.clusters.count * 3);
  const clusters: Cluster[] = clusterPoints.slice(0, preset.clusters.count).map(([ccx, ccz]) => ({
    x: ccx,
    z: ccz,
    radius: preset.clusters.radiusMin + rand() * (preset.clusters.radiusMax - preset.clusters.radiusMin),
    type: rand() < 0.7 ? 'tree' : rand() < 0.7 ? 'rock' : 'mixed',
  }));

  // 2. Multi-pass Poisson disk sampling at different densities
  //    Denser passes fill in the outer regions; sparser pass covers interior.
  const allPoints: [number, number][] = [];

  // Dense outer ring (tight spacing, lots of points)
  const denseEdge = poissonDisk(
    minX, maxX, minZ, maxZ,
    preset.zones.forestEdgeMinDist * 0.7,
    seededRandom(seed + 2000),
    800,
  );
  for (const [px, pz] of denseEdge) {
    const ef = edgeFactor(px, pz, cx, cz, boundary);
    if (ef > 0.55) allPoints.push([px, pz]);
  }

  // Medium density mid-ring
  const midRing = poissonDisk(
    minX + 2, maxX - 2, minZ + 2, maxZ - 2,
    preset.zones.forestEdgeMinDist,
    seededRandom(seed + 2500),
    500,
  );
  for (const [px, pz] of midRing) {
    const ef = edgeFactor(px, pz, cx, cz, boundary);
    if (ef > 0.35 && ef <= 0.7) allPoints.push([px, pz]);
  }

  // Sparse interior (paths, meadows, near nodes)
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
    const edgeDist = boundary - Math.max(Math.abs(px - cx), Math.abs(pz - cz));
    const ef = edgeFactor(px, pz, cx, cz, boundary);

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

    // Acceptance probability: increases toward edges for a "clearing in the
    // woods" feel. Center of map ~40% acceptance, edges ~100%.
    const baseAccept = nearCluster ? 1.0 : 0.6;
    const edgeBoost = 0.4 + 0.6 * ef;
    const acceptRate = Math.min(1.0, baseAccept * edgeBoost);
    if (rand2() > acceptRate) continue;

    // Near the edges, bias heavily toward trees for a dense forest wall
    let category: DecorationCategory | null;
    if (ef > 0.7) {
      const r = rand2();
      if (r < 0.55) category = 'tree';
      else if (r < 0.70) category = 'bush';
      else if (r < 0.80) category = 'mushroom';
      else if (r < 0.90) category = 'grass';
      else category = 'rockSmall';
    } else {
      category = assignCategory(zone, nearCluster?.type ?? null, rand2);
    }
    if (!category) continue;

    // Hard exclusion: keep bulky assets out of the corridor and flanking
    if (zone === 'pathCorridor') {
      if (category !== 'rockSmall' && category !== 'grass' && category !== 'flower' && category !== 'mushroom') continue;
    } else if (zone === 'pathFlanking') {
      if (category === 'tree' || category === 'rockLarge' || category === 'rockMedium') continue;
    }

    const [scaleMin, scaleMax] = SCALE_RANGES[category];
    // Trees near the edge grow a bit larger for a denser canopy feel
    const edgeScaleBoost = (category === 'tree' && ef > 0.5) ? 1.0 + 0.3 * ef : 1.0;
    const scale = (scaleMin + rand2() * (scaleMax - scaleMin)) * edgeScaleBoost;
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

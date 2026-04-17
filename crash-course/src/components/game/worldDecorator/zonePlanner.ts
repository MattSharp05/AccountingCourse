import type { ContentNode } from '../../../types/game';
import type { Zone, Connection, DistanceGrid } from './types';

// ── Point-to-Segment Distance ───────────────────────────

function pointToSegmentDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (pz - az) ** 2);
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nx = ax + t * dx;
  const nz = az + t * dz;
  return Math.sqrt((px - nx) ** 2 + (pz - nz) ** 2);
}

// ── Build Distance Grid ─────────────────────────────────
// 1.0u resolution distance field for fast zone lookups

export function buildDistanceGrid(
  nodes: ContentNode[],
  connections: Connection[],
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  resolution = 1.0,
): DistanceGrid {
  const pad = 2;
  const minX = bounds.minX - pad;
  const minZ = bounds.minZ - pad;
  const maxX = bounds.maxX + pad;
  const maxZ = bounds.maxZ + pad;

  const width = Math.ceil((maxX - minX) / resolution) + 1;
  const height = Math.ceil((maxZ - minZ) / resolution) + 1;

  const pathDist = new Float32Array(width * height);
  const nodeDist = new Float32Array(width * height);

  // Pre-sample path segments at 20 steps per connection
  const pathSegs: [number, number, number, number][] = [];
  for (const conn of connections) {
    const fx = conn.from.position[0], fz = conn.from.position[2];
    const tx = conn.to.position[0], tz = conn.to.position[2];
    const mx = (fx + tx) / 2, mz = (fz + tz) / 2;
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps, t1 = (i + 1) / steps;
      pathSegs.push([
        (1 - t0) ** 2 * fx + 2 * (1 - t0) * t0 * mx + t0 ** 2 * tx,
        (1 - t0) ** 2 * fz + 2 * (1 - t0) * t0 * mz + t0 ** 2 * tz,
        (1 - t1) ** 2 * fx + 2 * (1 - t1) * t1 * mx + t1 ** 2 * tx,
        (1 - t1) ** 2 * fz + 2 * (1 - t1) * t1 * mz + t1 ** 2 * tz,
      ]);
    }
  }

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const x = minX + i * resolution;
      const z = minZ + j * resolution;
      const idx = j * width + i;

      // Min distance to any node center
      let minNodeDist = Infinity;
      for (const node of nodes) {
        const dx = x - node.position[0];
        const dz = z - node.position[2];
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < minNodeDist) minNodeDist = d;
      }
      nodeDist[idx] = minNodeDist;

      // Min distance to any path segment
      let minPathD = Infinity;
      for (const seg of pathSegs) {
        const d = pointToSegmentDist(x, z, seg[0], seg[1], seg[2], seg[3]);
        if (d < minPathD) minPathD = d;
      }
      pathDist[idx] = minPathD;
    }
  }

  return { pathDist, nodeDist, width, height, offsetX: minX, offsetZ: minZ, resolution };
}

// ── Sample Distance Grid ────────────────────────────────

export function sampleGrid(grid: DistanceGrid, x: number, z: number): { pathDist: number; nodeDist: number } {
  const i = Math.round((x - grid.offsetX) / grid.resolution);
  const j = Math.round((z - grid.offsetZ) / grid.resolution);
  const ci = Math.max(0, Math.min(grid.width - 1, i));
  const cj = Math.max(0, Math.min(grid.height - 1, j));
  const idx = cj * grid.width + ci;
  return { pathDist: grid.pathDist[idx], nodeDist: grid.nodeDist[idx] };
}

// ── Classify Zone ───────────────────────────────────────

export function classifyZone(
  pathDist: number,
  nodeDist: number,
  boundaryDist: number,
): Zone {
  // Priority order: nodePad > pathCorridor > pathFlanking > forestEdge > openMeadow
  //
  // Corridor (no trees / no medium or large rocks): 0–4.0u from the road
  // centerline. Flanking (small stuff only): 4.0–7.5u. Beyond that, the
  // open meadow can host anything. The wider corridor + flanking bands
  // emphasize the road by keeping bulky assets visually clear of it.
  if (nodeDist < 3.5) return 'nodePad';
  if (pathDist < 4.0) return 'pathCorridor';
  if (pathDist < 7.5) return 'pathFlanking';
  if (boundaryDist < 12.0) return 'forestEdge';
  return 'openMeadow';
}

// ── Compute World Bounds ────────────────────────────────

export function computeWorldBounds(nodes: ContentNode[]) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const n of nodes) {
    if (n.position[0] < minX) minX = n.position[0];
    if (n.position[0] > maxX) maxX = n.position[0];
    if (n.position[2] < minZ) minZ = n.position[2];
    if (n.position[2] > maxZ) maxZ = n.position[2];
  }
  // Fallback for empty / 1-node maps
  if (!isFinite(minX)) { minX = -10; maxX = 10; minZ = -10; maxZ = 10; }

  // Outdoor padding around the node bounding box. Bumped from 16 to 24
  // so the map "reaches further" past the outermost nodes — gives more
  // forest, meadow, and breathing room before the mountain ring.
  const pad = 24;
  minX -= pad;
  maxX += pad;
  minZ -= pad;
  maxZ += pad;

  const size = Math.max(maxX - minX, maxZ - minZ);
  // Center the square
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const half = size / 2;

  return {
    minX: cx - half,
    maxX: cx + half,
    minZ: cz - half,
    maxZ: cz + half,
    size,
  };
}

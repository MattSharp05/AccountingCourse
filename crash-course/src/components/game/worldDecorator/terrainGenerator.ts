import type { ContentNode } from '../../../types/game';
import type { Connection, WorldPreset } from './types';

// ── Embedded SimplexNoise ───────────────────────────────
// Compact 2D simplex noise — no npm dependency needed.

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

const GRAD2: [number, number][] = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

class SimplexNoise {
  private perm: Uint8Array;

  constructor(seed: number) {
    const p = new Uint8Array(256);
    // Knuth shuffle with LCG seeded PRNG
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = seed | 0;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 0) % 2147483647;
      const j = s % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  noise2D(x: number, y: number): number {
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    let i1: number, j1: number;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      t0 *= t0;
      const g = GRAD2[this.perm[ii + this.perm[jj]] % 8];
      n0 = t0 * t0 * (g[0] * x0 + g[1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      t1 *= t1;
      const g = GRAD2[this.perm[ii + i1 + this.perm[jj + j1]] % 8];
      n1 = t1 * t1 * (g[0] * x1 + g[1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      t2 *= t2;
      const g = GRAD2[this.perm[ii + 1 + this.perm[jj + 1]] % 8];
      n2 = t2 * t2 * (g[0] * x2 + g[1] * y2);
    }

    // Result in [-1, 1]
    return 70 * (n0 + n1 + n2);
  }
}

// ── Smoothstep ──────────────────────────────────────────

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ── Path Distance Helpers ───────────────────────────────

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

// ── Build Height Function ───────────────────────────────

export function createHeightFn(
  nodes: ContentNode[],
  connections: Connection[],
  preset: WorldPreset,
): (x: number, z: number) => number {
  const seed = nodes.length * 7919 + 42;
  const simplex = new SimplexNoise(seed);
  const { amplitude, frequency, octaves, lacunarity, persistence } = preset.terrain;

  // Pre-sample path segments at fine resolution for distance checks
  const pathSegments: [number, number, number, number][] = [];
  for (const conn of connections) {
    const fx = conn.from.position[0], fz = conn.from.position[2];
    const tx = conn.to.position[0], tz = conn.to.position[2];
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      // Simple bezier with slight midpoint lift (matches path curves)
      const mx = (fx + tx) / 2;
      const mz = (fz + tz) / 2;
      const x0 = (1 - t0) * (1 - t0) * fx + 2 * (1 - t0) * t0 * mx + t0 * t0 * tx;
      const z0 = (1 - t0) * (1 - t0) * fz + 2 * (1 - t0) * t0 * mz + t0 * t0 * tz;
      const x1 = (1 - t1) * (1 - t1) * fx + 2 * (1 - t1) * t1 * mx + t1 * t1 * tx;
      const z1 = (1 - t1) * (1 - t1) * fz + 2 * (1 - t1) * t1 * mz + t1 * t1 * tz;
      pathSegments.push([x0, z0, x1, z1]);
    }
  }

  return (x: number, z: number): number => {
    // Multi-octave simplex noise
    let noiseVal = 0;
    let freq = frequency;
    let amp = amplitude;
    for (let o = 0; o < octaves; o++) {
      noiseVal += simplex.noise2D(x * freq, z * freq) * amp;
      freq *= lacunarity;
      amp *= persistence;
    }

    // Flatten near nodes (inner=2.0, outer=4.0)
    let nodeFlatten = 1.0;
    for (const node of nodes) {
      const dx = x - node.position[0];
      const dz = z - node.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      const blend = smoothstep(2.0, 4.0, dist);
      nodeFlatten = Math.min(nodeFlatten, blend);
    }

    // Flatten near paths (inner=1.0, outer=2.0)
    let pathFlatten = 1.0;
    for (const seg of pathSegments) {
      const dist = pointToSegmentDist(x, z, seg[0], seg[1], seg[2], seg[3]);
      const blend = smoothstep(1.0, 2.0, dist);
      pathFlatten = Math.min(pathFlatten, blend);
    }

    return noiseVal * nodeFlatten * pathFlatten;
  };
}

// ── Build Height Grid for HeightfieldCollider ───────────

export function createHeightGrid(
  heightFn: (x: number, z: number) => number,
  worldSize: number,
  gridSize: number,
  centerX = 0,
  centerZ = 0,
): Float32Array {
  const data = new Float32Array(gridSize * gridSize);
  const halfSize = worldSize / 2;
  const step = worldSize / (gridSize - 1);

  for (let j = 0; j < gridSize; j++) {
    for (let i = 0; i < gridSize; i++) {
      const x = centerX - halfSize + i * step;
      const z = centerZ - halfSize + j * step;
      data[j * gridSize + i] = heightFn(x, z);
    }
  }

  // Clamp max slope (adjacent diff <= 0.5u)
  const maxDiff = 0.5;
  for (let pass = 0; pass < 3; pass++) {
    for (let j = 0; j < gridSize; j++) {
      for (let i = 0; i < gridSize; i++) {
        const idx = j * gridSize + i;
        if (i > 0) {
          const left = data[idx - 1];
          if (data[idx] - left > maxDiff) data[idx] = left + maxDiff;
          else if (left - data[idx] > maxDiff) data[idx] = left - maxDiff;
        }
        if (j > 0) {
          const above = data[(j - 1) * gridSize + i];
          if (data[idx] - above > maxDiff) data[idx] = above + maxDiff;
          else if (above - data[idx] > maxDiff) data[idx] = above - maxDiff;
        }
      }
    }
  }

  return data;
}

// ── Vertex Color Computation ────────────────────────────

export interface VertexColorParams {
  heightFn: (x: number, z: number) => number;
  worldSize: number;
  gridRes: number;
  pathSegments: [number, number, number, number][];
}

export function computeVertexColors(
  heightFn: (x: number, z: number) => number,
  worldSize: number,
  gridRes: number,
  connections: Connection[],
): Float32Array {
  const verts = (gridRes + 1) * (gridRes + 1);
  const colors = new Float32Array(verts * 3);
  const halfSize = worldSize / 2;
  const step = worldSize / gridRes;

  // Pre-sample path segments
  const pathSegs: [number, number, number, number][] = [];
  for (const conn of connections) {
    const fx = conn.from.position[0], fz = conn.from.position[2];
    const tx = conn.to.position[0], tz = conn.to.position[2];
    const mx = (fx + tx) / 2, mz = (fz + tz) / 2;
    for (let i = 0; i < 10; i++) {
      const t0 = i / 10, t1 = (i + 1) / 10;
      pathSegs.push([
        (1 - t0) ** 2 * fx + 2 * (1 - t0) * t0 * mx + t0 ** 2 * tx,
        (1 - t0) ** 2 * fz + 2 * (1 - t0) * t0 * mz + t0 ** 2 * tz,
        (1 - t1) ** 2 * fx + 2 * (1 - t1) * t1 * mx + t1 ** 2 * tx,
        (1 - t1) ** 2 * fz + 2 * (1 - t1) * t1 * mz + t1 ** 2 * tz,
      ]);
    }
  }

  // Color palette
  const grassR = 0x38 / 255, grassG = 0xd9 / 255, grassB = 0x75 / 255;
  const darkR = 0x2d / 255, darkG = 0x9e / 255, darkB = 0x5a / 255;
  const sageR = 0x7e / 255, sageG = 0xc8 / 255, sageB = 0x8b / 255;
  const dirtR = 0xb8 / 255, dirtG = 0x97 / 255, dirtB = 0x6a / 255;

  for (let j = 0; j <= gridRes; j++) {
    for (let i = 0; i <= gridRes; i++) {
      const x = -halfSize + i * step;
      const z = -halfSize + j * step;
      const h = heightFn(x, z);
      const idx = (j * (gridRes + 1) + i) * 3;

      // Height-based blend
      const heightNorm = Math.max(0, Math.min(1, (h + 1.5) / 3));

      // Slope estimation
      const hx = heightFn(x + 0.5, z);
      const hz = heightFn(x, z + 0.5);
      const slope = Math.abs(hx - h) + Math.abs(hz - h);
      const slopeBlend = Math.min(1, slope * 2);

      // Path proximity
      let minPathDist = 999;
      for (const seg of pathSegs) {
        const d = pointToSegmentDist(x, z, seg[0], seg[1], seg[2], seg[3]);
        if (d < minPathDist) minPathDist = d;
      }
      const pathBlend = 1 - smoothstep(1.0, 3.0, minPathDist);

      // Mix colors: base grass, darken on slopes, lighten on hilltops, dirt near paths
      let r = grassR * (1 - heightNorm) + sageR * heightNorm;
      let g = grassG * (1 - heightNorm) + sageG * heightNorm;
      let b = grassB * (1 - heightNorm) + sageB * heightNorm;

      // Slope darkening
      r = r * (1 - slopeBlend) + darkR * slopeBlend;
      g = g * (1 - slopeBlend) + darkG * slopeBlend;
      b = b * (1 - slopeBlend) + darkB * slopeBlend;

      // Path dirt blend
      r = r * (1 - pathBlend * 0.5) + dirtR * pathBlend * 0.5;
      g = g * (1 - pathBlend * 0.5) + dirtG * pathBlend * 0.5;
      b = b * (1 - pathBlend * 0.5) + dirtB * pathBlend * 0.5;

      colors[idx] = r;
      colors[idx + 1] = g;
      colors[idx + 2] = b;
    }
  }

  return colors;
}

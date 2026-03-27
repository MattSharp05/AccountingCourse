import * as THREE from 'three';
import type { ContentNode } from '../../../types/game';
import type { Connection } from './types';

// ── Build Ribbon Geometry on Terrain ────────────────────

export interface RibbonPathData {
  geometry: THREE.BufferGeometry;
  state: 'completed' | 'available' | 'locked';
  from: ContentNode;
  to: ContentNode;
  curve: THREE.QuadraticBezierCurve3;
}

export function buildRibbonPath(
  conn: Connection,
  state: 'completed' | 'available' | 'locked',
  heightFn: (x: number, z: number) => number,
  halfWidth: number,
  segments = 32,
): RibbonPathData {
  const from = conn.from;
  const to = conn.to;

  const start = new THREE.Vector3(from.position[0], 0, from.position[2]);
  const end = new THREE.Vector3(to.position[0], 0, to.position[2]);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);

    // Perpendicular in XZ plane
    const perpX = -tangent.z;
    const perpZ = tangent.x;
    const len = Math.sqrt(perpX * perpX + perpZ * perpZ) || 1;
    const nx = perpX / len;
    const nz = perpZ / len;

    // Left vertex
    const lx = point.x - nx * halfWidth;
    const lz = point.z - nz * halfWidth;
    const ly = heightFn(lx, lz) + 0.05;

    // Right vertex
    const rx = point.x + nx * halfWidth;
    const rz = point.z + nz * halfWidth;
    const ry = heightFn(rx, rz) + 0.05;

    positions.push(lx, ly, lz, rx, ry, rz);
    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, t, 1, t);

    if (i < segments) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  return { geometry, state, from, to, curve };
}

// ── Build All Ribbon Paths ──────────────────────────────

export function buildAllRibbonPaths(
  connections: Connection[],
  completedNodeIds: string[],
  heightFn: (x: number, z: number) => number,
  widths: { completed: number; available: number; locked: number },
): RibbonPathData[] {
  return connections.map((conn) => {
    const state = getPathState(conn, completedNodeIds);
    const halfWidth = state === 'completed' ? widths.completed / 2
      : state === 'available' ? widths.available / 2
      : widths.locked / 2;
    return buildRibbonPath(conn, state, heightFn, halfWidth);
  });
}

function getPathState(
  conn: Connection,
  completedNodeIds: string[],
): 'completed' | 'available' | 'locked' {
  const sourceCompleted = completedNodeIds.includes(conn.from.id);
  const targetCompleted = completedNodeIds.includes(conn.to.id);
  const targetUnlocked = conn.to.prerequisites.every((p) =>
    completedNodeIds.includes(p),
  );

  if (sourceCompleted && targetCompleted) return 'completed';
  if (sourceCompleted || targetUnlocked) return 'available';
  return 'locked';
}

// ── Path Colors ─────────────────────────────────────────

export const PATH_COLORS = {
  completed: '#10b981',
  available: '#f59e0b',
  locked: '#374151',
} as const;

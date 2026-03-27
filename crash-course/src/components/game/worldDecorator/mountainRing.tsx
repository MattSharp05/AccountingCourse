import { useMemo } from 'react';
import * as THREE from 'three';
import type { WorldPreset } from './types';

interface MountainRingProps {
  preset: WorldPreset;
  seed: number;
}

export function MountainRing({ preset, seed }: MountainRingProps) {
  const geometry = useMemo(() => {
    const { innerRadius, outerRadius, peaks, heightMin, heightMax } = preset.mountains;
    const angularSegments = 96;

    // Generate peak heights with seeded random
    let s = seed;
    const nextRand = () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };

    const peakHeights: number[] = [];
    for (let i = 0; i < peaks; i++) {
      peakHeights.push(heightMin + nextRand() * (heightMax - heightMin));
    }

    // Cosine-interpolated height for each angular segment
    const getHeight = (angle: number): number => {
      const norm = ((angle / (Math.PI * 2)) * peaks) % peaks;
      const idx0 = Math.floor(norm) % peaks;
      const idx1 = (idx0 + 1) % peaks;
      const frac = norm - Math.floor(norm);
      // Cosine interpolation
      const t = (1 - Math.cos(frac * Math.PI)) / 2;
      return peakHeights[idx0] * (1 - t) + peakHeights[idx1] * t;
    };

    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    // Generate vertices: 2 rings per angular step (inner + outer)
    for (let i = 0; i <= angularSegments; i++) {
      const angle = (i / angularSegments) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const h = getHeight(angle);

      // Inner vertex (at height)
      positions.push(cos * innerRadius, h * 0.3, sin * innerRadius);
      normals.push(0, 1, 0);

      // Outer vertex (at full height, fading out)
      positions.push(cos * outerRadius, h, sin * outerRadius);
      normals.push(0, 1, 0);

      // Bottom inner
      positions.push(cos * innerRadius, -1, sin * innerRadius);
      normals.push(0, 0, -1);

      // Bottom outer
      positions.push(cos * outerRadius, -1, sin * outerRadius);
      normals.push(0, 0, 1);
    }

    // Build faces
    for (let i = 0; i < angularSegments; i++) {
      const base = i * 4;
      const next = (i + 1) * 4;

      // Top face (inner-outer quad)
      indices.push(base, base + 1, next);
      indices.push(next, base + 1, next + 1);

      // Inner wall
      indices.push(base + 2, base, next);
      indices.push(base + 2, next, next + 2);

      // Outer wall
      indices.push(base + 1, base + 3, next + 1);
      indices.push(next + 1, base + 3, next + 3);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }, [preset.mountains, seed]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        color="#4a6741"
        roughness={0.95}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

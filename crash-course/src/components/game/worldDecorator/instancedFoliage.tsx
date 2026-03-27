import { useMemo, useEffect, useRef, Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { DecorationInstance, DecorationCategory } from './types';
import { ASSET_PATHS } from './presets';

// ── Preload all assets ──────────────────────────────────

const ALL_PATHS = Object.values(ASSET_PATHS).flat();
ALL_PATHS.forEach((path) => useGLTF.preload(path));

// ── Merge all geometries from a GLTF scene into one ─────

function extractMergedGeometry(scene: THREE.Object3D): THREE.BufferGeometry | null {
  const geometries: THREE.BufferGeometry[] = [];

  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const geo = mesh.geometry.clone();
      // Apply the mesh's world transform so merged geometry is in model space
      geo.applyMatrix4(mesh.matrixWorld);
      geometries.push(geo);
    }
  });

  if (geometries.length === 0) return null;
  if (geometries.length === 1) return geometries[0];

  // Manual merge: combine position, normal, and index buffers
  return mergeBufferGeometries(geometries);
}

function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVerts = 0;
  let totalIndices = 0;

  for (const geo of geometries) {
    const pos = geo.getAttribute('position');
    totalVerts += pos.count;
    if (geo.index) totalIndices += geo.index.count;
    else totalIndices += pos.count;
  }

  const mergedPos = new Float32Array(totalVerts * 3);
  const mergedNormal = new Float32Array(totalVerts * 3);
  const mergedIndex = new Uint32Array(totalIndices);

  let vertOffset = 0;
  let indexOffset = 0;

  for (const geo of geometries) {
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const normal = geo.getAttribute('normal') as THREE.BufferAttribute | undefined;

    for (let i = 0; i < pos.count; i++) {
      mergedPos[(vertOffset + i) * 3] = pos.getX(i);
      mergedPos[(vertOffset + i) * 3 + 1] = pos.getY(i);
      mergedPos[(vertOffset + i) * 3 + 2] = pos.getZ(i);

      if (normal) {
        mergedNormal[(vertOffset + i) * 3] = normal.getX(i);
        mergedNormal[(vertOffset + i) * 3 + 1] = normal.getY(i);
        mergedNormal[(vertOffset + i) * 3 + 2] = normal.getZ(i);
      }
    }

    if (geo.index) {
      for (let i = 0; i < geo.index.count; i++) {
        mergedIndex[indexOffset + i] = geo.index.getX(i) + vertOffset;
      }
      indexOffset += geo.index.count;
    } else {
      for (let i = 0; i < pos.count; i++) {
        mergedIndex[indexOffset + i] = vertOffset + i;
      }
      indexOffset += pos.count;
    }

    vertOffset += pos.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(mergedNormal, 3));
  merged.setIndex(new THREE.BufferAttribute(mergedIndex, 1));

  return merged;
}

// ── Single Variant InstancedMesh ────────────────────────

interface VariantGroupProps {
  path: string;
  instances: DecorationInstance[];
}

function VariantGroup({ path, instances }: VariantGroupProps) {
  const { scene } = useGLTF(path);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Extract merged geometry and material from the GLTF
  const { geometry, material } = useMemo(() => {
    // Update matrices before merging
    scene.updateMatrixWorld(true);
    const geo = extractMergedGeometry(scene);

    // Extract color from first mesh found
    let mat: THREE.Material = new THREE.MeshStandardMaterial({
      color: '#4ade80',
      roughness: 0.85,
    });

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && mat instanceof THREE.MeshStandardMaterial && mat.color.getHexString() === '4ade80') {
        const meshMat = (child as THREE.Mesh).material;
        if (Array.isArray(meshMat)) {
          mat = meshMat[0].clone();
        } else {
          mat = meshMat.clone();
        }
      }
    });

    return { geometry: geo, material: mat };
  }, [scene]);

  // Set instance transforms
  useEffect(() => {
    if (!meshRef.current || !geometry) return;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.rotation.set(0, inst.rotation, 0);
      dummy.scale.setScalar(inst.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [instances, geometry]);

  if (!geometry || instances.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, instances.length]}
      castShadow
      receiveShadow
      frustumCulled={false}
    />
  );
}

// ── Main Instanced Foliage Component ────────────────────

interface InstancedFoliageProps {
  decorations: DecorationInstance[];
}

export function InstancedFoliage({ decorations }: InstancedFoliageProps) {
  // Group decorations by category + variantIndex → one InstancedMesh per group
  const groups = useMemo(() => {
    const map = new Map<string, { path: string; instances: DecorationInstance[] }>();

    for (const dec of decorations) {
      const paths = ASSET_PATHS[dec.category];
      const varIdx = dec.variantIndex % paths.length;
      const path = paths[varIdx];
      const key = `${dec.category}_${varIdx}`;

      if (!map.has(key)) {
        map.set(key, { path, instances: [] });
      }
      map.get(key)!.instances.push(dec);
    }

    return Array.from(map.entries());
  }, [decorations]);

  return (
    <group>
      {groups.map(([key, { path, instances }]) => (
        <Suspense key={key} fallback={null}>
          <VariantGroup path={path} instances={instances} />
        </Suspense>
      ))}
    </group>
  );
}

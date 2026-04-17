import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { applyToonMaterials } from './applyToonMaterial';

const BASE = '/models/environment/nature';

const TREE_PATHS = [
  `${BASE}/CommonTree_1.gltf`,
  `${BASE}/CommonTree_2.gltf`,
  `${BASE}/Pine_1.gltf`,
  `${BASE}/Pine_2.gltf`,
] as const;

const TREE_BASE_SCALE = 0.5;

// Preload all tree variants
TREE_PATHS.forEach((path) => useGLTF.preload(path));

interface ModelTreeProps {
  position: [number, number, number];
  scale?: number;
  variant?: number;
}

export function ModelTree({ position, scale = 1, variant = 0 }: ModelTreeProps) {
  const path = TREE_PATHS[variant % TREE_PATHS.length];
  const { scene } = useGLTF(path);

  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    applyToonMaterials(clonedScene);
  }, [clonedScene]);

  return (
    <primitive
      object={clonedScene}
      position={position}
      scale={scale * TREE_BASE_SCALE}
    />
  );
}

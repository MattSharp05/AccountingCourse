import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { applyToonMaterials } from './applyToonMaterial';

const BASE = '/models/environment/gltf';

const TREE_PATHS = [
  `${BASE}/Tree_1_A_Color1.gltf`,
  `${BASE}/Tree_2_A_Color1.gltf`,
  `${BASE}/Tree_3_A_Color1.gltf`,
  `${BASE}/Tree_4_A_Color1.gltf`,
] as const;

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
      scale={scale}
    />
  );
}

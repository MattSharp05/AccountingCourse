import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { applyToonMaterials } from './applyToonMaterial';

const BASE = '/models/environment/gltf';

const BUSH_PATHS = [
  `${BASE}/Bush_1_A_Color1.gltf`,
  `${BASE}/Bush_2_A_Color1.gltf`,
  `${BASE}/Bush_3_A_Color1.gltf`,
  `${BASE}/Bush_4_A_Color1.gltf`,
] as const;

// Preload all bush variants
BUSH_PATHS.forEach((path) => useGLTF.preload(path));

interface ModelBushProps {
  position: [number, number, number];
  scale?: number;
  variant?: number;
}

export function ModelBush({ position, scale = 1, variant = 0 }: ModelBushProps) {
  const path = BUSH_PATHS[variant % BUSH_PATHS.length];
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

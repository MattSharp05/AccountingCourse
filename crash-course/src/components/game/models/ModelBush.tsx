import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { applyToonMaterials } from './applyToonMaterial';

const BASE = '/models/environment/nature';

const BUSH_PATHS = [
  `${BASE}/Bush_Common.gltf`,
  `${BASE}/Bush_Common_Flowers.gltf`,
] as const;

const BUSH_BASE_SCALE = 0.5;

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
      scale={scale * BUSH_BASE_SCALE}
    />
  );
}

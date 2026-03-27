import { useEffect, useRef, useMemo } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { applyToonMaterials } from './applyToonMaterial';

const CHARACTER_PATH = '/models/character/adventurer.gltf';

useGLTF.preload(CHARACTER_PATH);

interface ModelCharacterProps {
  animation: 'idle' | 'walk' | 'run';
}

export function ModelCharacter({ animation }: ModelCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(CHARACTER_PATH);

  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  const { actions, names } = useAnimations(animations, groupRef);

  // Apply toon materials once
  useEffect(() => {
    applyToonMaterials(clonedScene);
  }, [clonedScene]);

  // Drive animation based on prop
  useEffect(() => {
    // Try to find matching animation by name (case-insensitive partial match)
    const findAction = (keyword: string) => {
      const name = names.find((n) => n.toLowerCase().includes(keyword.toLowerCase()));
      return name ? actions[name] : null;
    };

    const targetAction = findAction(animation);

    if (targetAction) {
      // Fade out all other actions, fade in the target
      Object.values(actions).forEach((action) => {
        if (action && action !== targetAction) {
          action.fadeOut(0.2);
        }
      });
      targetAction.reset().fadeIn(0.2).play();
    }
  }, [animation, actions, names]);

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} scale={0.5} />
    </group>
  );
}

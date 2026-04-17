import { useEffect, useRef, useMemo } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const BASE_PATH = '/models/character/';

const ANIM_FILES: Record<string, string> = {
  walk: `${BASE_PATH}Walking.fbx`,
  run: `${BASE_PATH}Running.fbx`,
  dance: `${BASE_PATH}Silly Dancing.fbx`,
};

const CHARACTER_SCALE = 0.01;

interface ModelCharacterProps {
  animation: 'idle' | 'walk' | 'run' | 'dance';
}

export function ModelCharacter({ animation }: ModelCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Record<string, THREE.AnimationAction>>({});

  const walkFbx = useLoader(FBXLoader, ANIM_FILES.walk);
  const runFbx = useLoader(FBXLoader, ANIM_FILES.run);
  const danceFbx = useLoader(FBXLoader, ANIM_FILES.dance);

  const character = useMemo(() => {
    const clone = SkeletonUtils.clone(walkFbx) as THREE.Group;

    // SkeletonUtils.clone() can break texture references on cloned materials.
    // Copy the original FBX's materials (with working embedded textures) onto
    // the cloned meshes, then convert Phong → Standard for PBR lighting.
    const originalMaterials = new Map<string, THREE.Material | THREE.Material[]>();
    walkFbx.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        originalMaterials.set(child.name, (child as THREE.Mesh).material);
      }
    });

    clone.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;

      // Restore original material references (with working textures)
      const origMat = originalMaterials.get(mesh.name);
      if (origMat) mesh.material = origMat;

      // Convert Phong → Standard for PBR lighting compatibility
      const wasSingle = !Array.isArray(mesh.material);
      const mats = wasSingle ? [mesh.material as THREE.Material] : (mesh.material as THREE.Material[]);

      const converted = mats.map((mat) => {
        if ((mat as THREE.MeshPhongMaterial).isMeshPhongMaterial) {
          const phong = mat as THREE.MeshPhongMaterial;
          const standard = new THREE.MeshStandardMaterial({
            map: phong.map,
            normalMap: phong.normalMap,
            color: phong.color.clone(),
            roughness: 0.55,
            metalness: 0.0,
            side: phong.side,
            envMapIntensity: 2.5,
            emissive: new THREE.Color(0x444444),
          });
          if (phong.emissiveMap) standard.emissiveMap = phong.emissiveMap;
          return standard;
        }
        return mat;
      });

      mesh.material = wasSingle ? converted[0] : converted;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });

    return clone;
  }, [walkFbx]);

  useEffect(() => {
    const mixer = new THREE.AnimationMixer(character);
    mixerRef.current = mixer;

    const actions: Record<string, THREE.AnimationAction> = {};

    if (walkFbx.animations[0]) {
      actions.walk = mixer.clipAction(walkFbx.animations[0]);
    }
    if (runFbx.animations[0]) {
      actions.run = mixer.clipAction(runFbx.animations[0]);
    }
    if (danceFbx.animations[0]) {
      actions.dance = mixer.clipAction(danceFbx.animations[0]);
    }

    actionsRef.current = actions;

    return () => { mixer.stopAllAction(); };
  }, [character, walkFbx, runFbx, danceFbx]);

  useEffect(() => {
    const actions = actionsRef.current;
    const animName = animation === 'idle' ? 'walk' : animation;
    const target = actions[animName];
    if (!target) return;

    Object.values(actions).forEach((a) => {
      if (a !== target) a.fadeOut(0.2);
    });

    target.reset().fadeIn(0.2).play();

    if (animation === 'idle') {
      target.paused = true;
      target.time = 0;
    } else {
      target.paused = false;
      target.setLoop(THREE.LoopRepeat, Infinity);
    }
  }, [animation]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  return (
    <group ref={groupRef} scale={CHARACTER_SCALE}>
      <primitive object={character} />
    </group>
  );
}

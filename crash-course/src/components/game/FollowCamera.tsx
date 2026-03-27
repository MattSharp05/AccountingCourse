import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useAvatarPosition } from '../../stores';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface FollowCameraProps {
  minDistance?: number;
  maxDistance?: number;
  smoothness?: number;
}

export function FollowCamera({
  minDistance = 8,
  maxDistance = 40,
  smoothness = 0.08,
}: FollowCameraProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const avatarPosition = useAvatarPosition();
  const prevTarget = useRef(new THREE.Vector3());
  const { camera } = useThree();

  // Set initial camera position on mount
  useEffect(() => {
    camera.position.set(0, 12, 18);
  }, [camera]);

  useFrame(() => {
    if (!controlsRef.current || !avatarPosition) return;

    const avatarVec = new THREE.Vector3(
      avatarPosition[0],
      avatarPosition[1] + 1,
      avatarPosition[2]
    );

    // Smoothed target position
    const newTarget = prevTarget.current.clone().lerp(avatarVec, smoothness);

    // Move camera by the same delta so relative orbit offset is preserved
    const delta = newTarget.clone().sub(prevTarget.current);
    camera.position.add(delta);

    // Update orbit target
    controlsRef.current.target.copy(newTarget);
    prevTarget.current.copy(newTarget);
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableDamping
      dampingFactor={0.1}
      minDistance={minDistance}
      maxDistance={maxDistance}
      maxPolarAngle={Math.PI / 2.2}
      minPolarAngle={0.2}
    />
  );
}

export default FollowCamera;

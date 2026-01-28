import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAvatarPosition } from '../../stores';

interface FollowCameraProps {
  offset?: [number, number, number];
  smoothness?: number;
}

export function FollowCamera({
  offset = [0, 8, 12],
  smoothness = 0.05,
}: FollowCameraProps) {
  const { camera } = useThree();
  const avatarPosition = useAvatarPosition();
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!avatarPosition) return;

    // Calculate target camera position
    const targetPos = new THREE.Vector3(
      avatarPosition[0] + offset[0],
      avatarPosition[1] + offset[1],
      avatarPosition[2] + offset[2]
    );

    // Smoothly interpolate camera position
    targetPosition.current.lerp(targetPos, smoothness);
    camera.position.copy(targetPosition.current);

    // Calculate look-at point (slightly ahead of avatar)
    const lookAtPos = new THREE.Vector3(
      avatarPosition[0],
      avatarPosition[1] + 1,
      avatarPosition[2]
    );

    targetLookAt.current.lerp(lookAtPos, smoothness * 2);
    camera.lookAt(targetLookAt.current);
  });

  return null;
}

export default FollowCamera;

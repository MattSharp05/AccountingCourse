import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface MapEnvironmentProps {
  avatarPosition?: [number, number, number] | null;
}

export function MapEnvironment({ avatarPosition }: MapEnvironmentProps) {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  // Shadow camera follows avatar for tight shadow coverage
  useFrame(() => {
    if (!lightRef.current || !avatarPosition) return;
    const [ax, , az] = avatarPosition;
    const shadowRadius = 15;

    // Move light to follow avatar
    lightRef.current.position.set(ax + 15, 25, az + 10);
    lightRef.current.target.position.set(ax, 0, az);
    lightRef.current.target.updateMatrixWorld();

    // Update shadow camera bounds
    const cam = lightRef.current.shadow.camera;
    cam.left = -shadowRadius;
    cam.right = shadowRadius;
    cam.top = shadowRadius;
    cam.bottom = -shadowRadius;
    cam.updateProjectionMatrix();
  });

  return (
    <>
      {/* Environment map for subtle reflections */}
      <Environment preset="park" environmentIntensity={0.3} />

      {/* Ambient light */}
      <ambientLight intensity={0.6} color="#fffaf0" />

      {/* Main directional light (sun) — follows avatar */}
      <directionalLight
        ref={lightRef}
        position={[15, 25, 10]}
        intensity={1.8}
        color="#fff5e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={60}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />

      {/* Fill light from opposite side */}
      <directionalLight
        position={[-10, 10, -10]}
        intensity={0.4}
        color="#b8d4ff"
      />

      {/* Hemisphere light */}
      <hemisphereLight
        args={['#87ceeb', '#4ade80', 0.5]}
        position={[0, 50, 0]}
      />

      {/* Sky — tuned for deeper blue, cleaner */}
      <Sky
        distance={450000}
        sunPosition={[100, 50, 100]}
        inclination={0.5}
        azimuth={0.25}
        turbidity={4}
        rayleigh={2.0}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />

    </>
  );
}

export default MapEnvironment;

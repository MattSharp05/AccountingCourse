import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Cloud, Float } from '@react-three/drei';
import * as THREE from 'three';

export function MapEnvironment() {
  return (
    <>
      {/* Ambient light for overall illumination */}
      <ambientLight intensity={0.6} color="#fffaf0" />

      {/* Main directional light (sun) */}
      <directionalLight
        position={[15, 25, 10]}
        intensity={1.2}
        color="#fff5e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Fill light from opposite side */}
      <directionalLight
        position={[-10, 10, -10]}
        intensity={0.3}
        color="#e6f0ff"
      />

      {/* Hemisphere light for nice gradient */}
      <hemisphereLight
        args={['#87CEEB', '#4ade80', 0.6]}
        position={[0, 50, 0]}
      />

      {/* Sky with warm sunset colors */}
      <Sky
        distance={450000}
        sunPosition={[100, 50, 100]}
        inclination={0.5}
        azimuth={0.25}
        turbidity={8}
        rayleigh={1}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />

      {/* Decorative clouds */}
      <CloudSystem />
    </>
  );
}

function CloudSystem() {
  return (
    <>
      {/* Floating clouds at different positions */}
      <Float speed={0.5} rotationIntensity={0.2} floatIntensity={2}>
        <Cloud
          position={[-15, 12, -20]}
          opacity={0.7}
          speed={0.2}
          segments={20}
        />
      </Float>
      <Float speed={0.3} rotationIntensity={0.1} floatIntensity={1.5}>
        <Cloud
          position={[20, 15, -15]}
          opacity={0.5}
          speed={0.1}
          segments={15}
        />
      </Float>
      <Float speed={0.4} rotationIntensity={0.15} floatIntensity={1.8}>
        <Cloud
          position={[0, 18, -25]}
          opacity={0.6}
          speed={0.15}
          segments={18}
        />
      </Float>
    </>
  );
}

// Decorative floating elements
export function FloatingDecorations() {
  return (
    <>
      {/* Floating books */}
      <FloatingBook position={[-8, 3, -8]} color="#4F46E5" rotation={0.3} />
      <FloatingBook position={[10, 4, -5]} color="#F59E0B" rotation={-0.5} />
      <FloatingBook position={[5, 2.5, 8]} color="#10B981" rotation={0.7} />

      {/* Floating coins/gems for visual interest */}
      <FloatingGem position={[-12, 2, 5]} />
      <FloatingGem position={[8, 3, -10]} />
    </>
  );
}

function FloatingBook({
  position,
  color,
  rotation = 0,
}: {
  position: [number, number, number];
  color: string;
  rotation?: number;
}) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8) * 0.3;
      meshRef.current.rotation.y = rotation + Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Book body */}
      <mesh castShadow>
        <boxGeometry args={[0.8, 1, 0.15]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Pages */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[0.7, 0.9, 0.1]} />
        <meshStandardMaterial color="#fffef0" />
      </mesh>
    </group>
  );
}

function FloatingGem({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.2) * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.4) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <octahedronGeometry args={[0.3]} />
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#f59e0b"
        emissiveIntensity={0.3}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  );
}

export default MapEnvironment;

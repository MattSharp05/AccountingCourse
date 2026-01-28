import { useRef, useMemo } from 'react';
import * as THREE from 'three';

export function MapTerrain() {
  return (
    <group>
      {/* Main grass ground */}
      <Ground />

      {/* Decorative path/road */}
      <Path />

      {/* Border walls/fences */}
      <Boundaries />

      {/* Decorative buildings and props */}
      <Decorations />
    </group>
  );
}

function Ground() {
  // Create a slightly wavy ground
  const groundRef = useRef<THREE.Mesh>(null);

  return (
    <mesh
      ref={groundRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.1, 0]}
      receiveShadow
    >
      <circleGeometry args={[25, 64]} />
      <meshStandardMaterial
        color="#4ade80"
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}

function Path() {
  // Create a winding path through the map
  const pathPoints = useMemo(() => {
    return [
      [-5, -5],
      [-2, -3],
      [2, -4],
      [5, -2],
      [3, 2],
      [-1, 4],
      [-4, 3],
      [0, 7],
    ] as [number, number][];
  }, []);

  return (
    <group position={[0, 0.01, 0]}>
      {pathPoints.map((point, i) => {
        const nextPoint = pathPoints[i + 1];
        if (!nextPoint) return null;

        const midX = (point[0] + nextPoint[0]) / 2;
        const midZ = (point[1] + nextPoint[1]) / 2;
        const length = Math.sqrt(
          Math.pow(nextPoint[0] - point[0], 2) + Math.pow(nextPoint[1] - point[1], 2)
        );
        const angle = Math.atan2(nextPoint[1] - point[1], nextPoint[0] - point[0]);

        return (
          <mesh
            key={i}
            position={[midX, 0, midZ]}
            rotation={[-Math.PI / 2, 0, angle]}
            receiveShadow
          >
            <planeGeometry args={[length, 1.2]} />
            <meshStandardMaterial
              color="#d4a574"
              roughness={0.9}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Boundaries() {
  const radius = 23;
  const segments = 24;

  return (
    <group>
      {/* Create fence posts around the perimeter */}
      {Array.from({ length: segments }).map((_, i) => {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <group key={i} position={[x, 0, z]} rotation={[0, -angle + Math.PI / 2, 0]}>
            {/* Fence post */}
            <mesh position={[0, 0.6, 0]} castShadow>
              <boxGeometry args={[0.2, 1.2, 0.2]} />
              <meshStandardMaterial color="#8b5a2b" />
            </mesh>
            {/* Fence rails */}
            <mesh position={[0, 0.8, 0.6]} castShadow>
              <boxGeometry args={[0.1, 0.1, 1.5]} />
              <meshStandardMaterial color="#a0522d" />
            </mesh>
            <mesh position={[0, 0.4, 0.6]} castShadow>
              <boxGeometry args={[0.1, 0.1, 1.5]} />
              <meshStandardMaterial color="#a0522d" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Decorations() {
  return (
    <group>
      {/* University-style buildings */}
      <Building position={[-18, 0, -15]} scale={1.2} color="#4F46E5" />
      <Building position={[18, 0, -10]} scale={1} color="#6366f1" />
      <Building position={[-15, 0, 12]} scale={0.8} color="#818cf8" />

      {/* Trees */}
      <Tree position={[-10, 0, -12]} scale={1} />
      <Tree position={[12, 0, -8]} scale={1.2} />
      <Tree position={[15, 0, 5]} scale={0.9} />
      <Tree position={[-12, 0, 8]} scale={1.1} />
      <Tree position={[8, 0, 12]} scale={0.8} />

      {/* Bushes */}
      <Bush position={[-6, 0, -7]} />
      <Bush position={[7, 0, -6]} />
      <Bush position={[-5, 0, 6]} />
      <Bush position={[4, 0, 5]} />

      {/* Lamp posts */}
      <LampPost position={[-3, 0, -5]} />
      <LampPost position={[4, 0, -3]} />
      <LampPost position={[2, 0, 3]} />
      <LampPost position={[-2, 0, 5]} />
    </group>
  );
}

function Building({
  position,
  scale = 1,
  color = '#4F46E5',
}: {
  position: [number, number, number];
  scale?: number;
  color?: string;
}) {
  return (
    <group position={position} scale={scale}>
      {/* Main building body */}
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[4, 4, 3]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 4.5, 0]} castShadow>
        <coneGeometry args={[3, 1.5, 4]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.8, 1.51]}>
        <boxGeometry args={[0.8, 1.6, 0.1]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      {/* Windows */}
      <mesh position={[-1, 2.5, 1.51]}>
        <boxGeometry args={[0.6, 0.6, 0.1]} />
        <meshStandardMaterial color="#87CEEB" emissive="#87CEEB" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[1, 2.5, 1.51]}>
        <boxGeometry args={[0.6, 0.6, 0.1]} />
        <meshStandardMaterial color="#87CEEB" emissive="#87CEEB" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

function Tree({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 1.6, 8]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      {/* Foliage layers */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <coneGeometry args={[1.2, 1.5, 8]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
      <mesh position={[0, 3, 0]} castShadow>
        <coneGeometry args={[0.9, 1.2, 8]} />
        <meshStandardMaterial color="#16a34a" />
      </mesh>
      <mesh position={[0, 3.6, 0]} castShadow>
        <coneGeometry args={[0.6, 1, 8]} />
        <meshStandardMaterial color="#15803d" />
      </mesh>
    </group>
  );
}

function Bush({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
      <mesh position={[0.3, 0.3, 0.2]} castShadow>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshStandardMaterial color="#16a34a" />
      </mesh>
      <mesh position={[-0.25, 0.35, -0.15]} castShadow>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="#15803d" />
      </mesh>
    </group>
  );
}

function LampPost({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null);

  return (
    <group position={position}>
      {/* Post */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 2.4, 8]} />
        <meshStandardMaterial color="#4a5568" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Lamp housing */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.3, 8]} />
        <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Light bulb */}
      <mesh position={[0, 2.3, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial
          color="#fff4e6"
          emissive="#ffd93d"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Actual light */}
      <pointLight
        ref={lightRef}
        position={[0, 2.3, 0]}
        intensity={0.5}
        distance={5}
        color="#ffd93d"
      />
    </group>
  );
}

export default MapTerrain;

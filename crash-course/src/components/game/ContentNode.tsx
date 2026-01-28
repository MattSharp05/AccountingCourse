import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import type { ContentNode as ContentNodeType, ContentType } from '../../types/game';
import { useCompletedNodes } from '../../stores';

interface ContentNodeProps {
  node: ContentNodeType;
  isUnlocked: boolean;
  onInteract: () => void;
}

const nodeColors: Record<ContentType, { primary: string; glow: string }> = {
  video: { primary: '#4F46E5', glow: '#818cf8' },     // Indigo
  reading: { primary: '#0891b2', glow: '#22d3ee' },   // Cyan
  exercise: { primary: '#059669', glow: '#34d399' },  // Emerald
  'quiz-boss': { primary: '#dc2626', glow: '#f87171' }, // Red
};

const nodeIcons: Record<ContentType, string> = {
  video: '🎬',
  reading: '📖',
  exercise: '✏️',
  'quiz-boss': '👾',
};

export function ContentNode3D({ node, isUnlocked, onInteract }: ContentNodeProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const completedNodes = useCompletedNodes();
  const isCompleted = completedNodes.includes(node.id);

  const colors = nodeColors[node.type];

  // Animation
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation for unlocked nodes
      if (isUnlocked && !isCompleted) {
        meshRef.current.position.y = node.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      }
      // Rotation for hovered state
      if (hovered) {
        meshRef.current.rotation.y += 0.02;
      }
    }
  });

  const handleClick = () => {
    if (isUnlocked) {
      onInteract();
    }
  };

  const scale = node.type === 'quiz-boss' ? 1.4 : 1;
  const opacity = isUnlocked ? 1 : 0.5;

  return (
    <group
      ref={meshRef}
      position={node.position}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Base platform */}
      <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.6 * scale, 0.7 * scale, 0.2, 16]} />
        <meshStandardMaterial
          color={isUnlocked ? colors.primary : '#6b7280'}
          metalness={0.3}
          roughness={0.7}
          opacity={opacity}
          transparent={!isUnlocked}
        />
      </mesh>

      {/* Glow ring when unlocked */}
      {isUnlocked && !isCompleted && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.65 * scale, 0.85 * scale, 32]} />
          <meshBasicMaterial
            color={colors.glow}
            transparent
            opacity={0.5 + Math.sin(Date.now() * 0.003) * 0.2}
          />
        </mesh>
      )}

      {/* Main node shape */}
      <Float
        speed={isUnlocked ? 2 : 0}
        rotationIntensity={isUnlocked ? 0.2 : 0}
        floatIntensity={isUnlocked ? 0.3 : 0}
      >
        <group position={[0, 0.8 * scale, 0]}>
          {node.type === 'quiz-boss' ? (
            // Boss node - octahedron
            <mesh castShadow>
              <octahedronGeometry args={[0.5 * scale]} />
              <meshStandardMaterial
                color={isUnlocked ? colors.primary : '#6b7280'}
                emissive={isUnlocked ? colors.glow : '#000000'}
                emissiveIntensity={hovered ? 0.5 : 0.2}
                metalness={0.5}
                roughness={0.3}
                opacity={opacity}
                transparent={!isUnlocked}
              />
            </mesh>
          ) : node.type === 'exercise' ? (
            // Exercise node - box
            <mesh castShadow rotation={[0, Math.PI / 4, 0]}>
              <boxGeometry args={[0.5 * scale, 0.5 * scale, 0.5 * scale]} />
              <meshStandardMaterial
                color={isUnlocked ? colors.primary : '#6b7280'}
                emissive={isUnlocked ? colors.glow : '#000000'}
                emissiveIntensity={hovered ? 0.4 : 0.15}
                metalness={0.3}
                roughness={0.5}
                opacity={opacity}
                transparent={!isUnlocked}
              />
            </mesh>
          ) : (
            // Video/Reading node - sphere
            <mesh castShadow>
              <sphereGeometry args={[0.4 * scale, 16, 16]} />
              <meshStandardMaterial
                color={isUnlocked ? colors.primary : '#6b7280'}
                emissive={isUnlocked ? colors.glow : '#000000'}
                emissiveIntensity={hovered ? 0.4 : 0.15}
                metalness={0.3}
                roughness={0.5}
                opacity={opacity}
                transparent={!isUnlocked}
              />
            </mesh>
          )}

          {/* Completion checkmark */}
          {isCompleted && (
            <mesh position={[0, 0.5, 0]}>
              <sphereGeometry args={[0.2]} />
              <meshStandardMaterial
                color="#10b981"
                emissive="#10b981"
                emissiveIntensity={0.5}
              />
            </mesh>
          )}
        </group>
      </Float>

      {/* Locked icon */}
      {!isUnlocked && (
        <Html position={[0, 1.5, 0]} center distanceFactor={10}>
          <div className="text-2xl opacity-70">🔒</div>
        </Html>
      )}

      {/* Hover tooltip */}
      {hovered && isUnlocked && (
        <Html position={[0, 2, 0]} center distanceFactor={8}>
          <div
            className="px-3 py-2 rounded-lg text-white text-sm font-medium whitespace-nowrap"
            style={{
              backgroundColor: colors.primary,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <span className="mr-2">{nodeIcons[node.type]}</span>
            {node.title}
            {isCompleted && <span className="ml-2">✓</span>}
          </div>
        </Html>
      )}

      {/* Interaction hint */}
      {hovered && isUnlocked && !isCompleted && (
        <Html position={[0, -0.5, 0]} center distanceFactor={10}>
          <div className="text-xs text-white bg-black/50 px-2 py-1 rounded">
            Click to open
          </div>
        </Html>
      )}
    </group>
  );
}

export default ContentNode3D;

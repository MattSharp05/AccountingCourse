import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ContentNode } from '../../types/game';

interface PathRendererProps {
  nodes: ContentNode[];
  edges?: { source: string; target: string }[];
  completedNodeIds: string[];
}

interface PathConnection {
  from: ContentNode;
  to: ContentNode;
  isCompleted: boolean;
  isUnlocked: boolean;
  groupColor?: string;
}

export function PathRenderer({ nodes, edges, completedNodeIds }: PathRendererProps) {
  const connections = useMemo(() => {
    const result: PathConnection[] = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    if (edges && edges.length > 0) {
      for (const edge of edges) {
        const fromNode = nodeMap.get(edge.source);
        const toNode = nodeMap.get(edge.target);
        if (fromNode && toNode) {
          const isCompleted = completedNodeIds.includes(edge.source);
          const isUnlocked = toNode.prerequisites.every((p) =>
            completedNodeIds.includes(p)
          );
          // Use group color when both nodes share the same group
          const groupColor =
            fromNode.groupColor && toNode.groupColor && fromNode.groupId === toNode.groupId
              ? fromNode.groupColor
              : undefined;
          result.push({ from: fromNode, to: toNode, isCompleted, isUnlocked, groupColor });
        }
      }
    } else {
      nodes.forEach((node) => {
        node.prerequisites.forEach((prereqId) => {
          const prereqNode = nodeMap.get(prereqId);
          if (prereqNode) {
            const isCompleted = completedNodeIds.includes(prereqId);
            const isUnlocked = node.prerequisites.every((p) =>
              completedNodeIds.includes(p)
            );
            const groupColor =
              prereqNode.groupColor && node.groupColor && prereqNode.groupId === node.groupId
                ? prereqNode.groupColor
                : undefined;
            result.push({ from: prereqNode, to: node, isCompleted, isUnlocked, groupColor });
          }
        });
      });
    }

    return result;
  }, [nodes, edges, completedNodeIds]);

  return (
    <group>
      {connections.map((conn) => (
        <RibbonPath
          key={`${conn.from.id}-${conn.to.id}`}
          from={conn.from.position}
          to={conn.to.position}
          isCompleted={conn.isCompleted}
          isUnlocked={conn.isUnlocked}
          groupColor={conn.groupColor}
        />
      ))}
    </group>
  );
}

// ── Ribbon Path ─────────────────────────────────────────

interface RibbonPathProps {
  from: [number, number, number];
  to: [number, number, number];
  isCompleted: boolean;
  isUnlocked: boolean;
  groupColor?: string;
}

function RibbonPath({ from, to, isCompleted, isUnlocked, groupColor }: RibbonPathProps) {
  const curve = useMemo(() => {
    const start = new THREE.Vector3(from[0], 0.06, from[2]);
    const end = new THREE.Vector3(to[0], 0.06, to[2]);
    const mid = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);
    mid.y = 0.12;
    return new THREE.QuadraticBezierCurve3(start, mid, end);
  }, [from, to]);

  // Thicker tubes when section-colored
  const hasGroup = !!groupColor;
  const tubeRadius = isCompleted
    ? (hasGroup ? 0.35 : 0.28)
    : isUnlocked
      ? (hasGroup ? 0.32 : 0.25)
      : 0.12;

  // Use group color for active paths when available
  const color = isCompleted
    ? (groupColor || '#10b981')
    : isUnlocked
      ? (groupColor || '#f59e0b')
      : '#374151';

  const emissiveColor = isCompleted
    ? (groupColor || '#10b981')
    : isUnlocked
      ? (groupColor || '#f59e0b')
      : '#000000';

  // Stronger emissive when section-colored
  const emissiveIntensity = isCompleted
    ? (hasGroup ? 0.3 : 0.15)
    : isUnlocked
      ? (hasGroup ? 0.25 : 0.1)
      : 0;

  const opacity = isUnlocked || isCompleted ? 1 : 0.25;

  return (
    <group>
      {/* Main tube path */}
      <mesh>
        <tubeGeometry args={[curve, 24, tubeRadius, 8, false]} />
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.6}
          transparent={!isUnlocked && !isCompleted}
          opacity={opacity}
        />
      </mesh>

      {/* Glow outline for available paths — bigger when section-colored */}
      {isUnlocked && !isCompleted && (
        <mesh>
          <tubeGeometry args={[curve, 24, tubeRadius + (hasGroup ? 0.14 : 0.08), 8, false]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={hasGroup ? 0.18 : 0.12}
          />
        </mesh>
      )}

      {/* Animated particles on available paths */}
      {isUnlocked && !isCompleted && (
        <PathParticles curve={curve} color={color} />
      )}

      {/* Direction arrows */}
      {(isUnlocked || isCompleted) && (
        <PathArrows curve={curve} color={color} />
      )}
    </group>
  );
}

// ── Animated Particles ──────────────────────────────────

function PathParticles({ curve, color }: { curve: THREE.QuadraticBezierCurve3; color: string }) {
  const particleCount = 4;
  const refs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    for (let i = 0; i < particleCount; i++) {
      const mesh = refs.current[i];
      if (!mesh) continue;
      const t = ((time * 0.3 + i / particleCount) % 1);
      const pos = curve.getPoint(t);
      mesh.position.copy(pos);
      mesh.position.y += 0.15;
      // Pulse scale
      const pulse = 0.8 + Math.sin(time * 4 + i * 1.5) * 0.2;
      mesh.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      {Array.from({ length: particleCount }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { refs.current[i] = el; }}
        >
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ── Direction Arrows ────────────────────────────────────

function PathArrows({ curve, color }: { curve: THREE.QuadraticBezierCurve3; color: string }) {
  const arrows = useMemo(() => {
    const positions = [0.4, 0.7];
    return positions.map((t) => {
      const pos = curve.getPoint(t);
      const tangent = curve.getTangent(t);
      const angle = Math.atan2(tangent.x, tangent.z);
      return { position: [pos.x, pos.y + 0.2, pos.z] as [number, number, number], rotation: angle };
    });
  }, [curve]);

  return (
    <group>
      {arrows.map((arrow, i) => (
        <mesh
          key={i}
          position={arrow.position}
          rotation={[-Math.PI / 2, 0, arrow.rotation]}
        >
          <coneGeometry args={[0.18, 0.4, 4]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            roughness={0.5}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  );
}

export default PathRenderer;

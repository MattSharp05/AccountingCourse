import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { ContentNode } from '../../types/game';

interface PathRendererProps {
  nodes: ContentNode[];
  completedNodeIds: string[];
}

interface PathConnection {
  from: ContentNode;
  to: ContentNode;
  isCompleted: boolean;
  isUnlocked: boolean;
}

export function PathRenderer({ nodes, completedNodeIds }: PathRendererProps) {
  const connections = useMemo(() => {
    const result: PathConnection[] = [];

    nodes.forEach((node) => {
      node.prerequisites.forEach((prereqId) => {
        const prereqNode = nodes.find((n) => n.id === prereqId);
        if (prereqNode) {
          const isCompleted = completedNodeIds.includes(prereqId);
          const isUnlocked = node.prerequisites.every((p) =>
            completedNodeIds.includes(p)
          );

          result.push({
            from: prereqNode,
            to: node,
            isCompleted,
            isUnlocked,
          });
        }
      });
    });

    return result;
  }, [nodes, completedNodeIds]);

  return (
    <group>
      {connections.map((conn) => (
        <PathLine
          key={`${conn.from.id}-${conn.to.id}`}
          from={conn.from.position}
          to={conn.to.position}
          isCompleted={conn.isCompleted}
          isUnlocked={conn.isUnlocked}
        />
      ))}
    </group>
  );
}

interface PathLineProps {
  from: [number, number, number];
  to: [number, number, number];
  isCompleted: boolean;
  isUnlocked: boolean;
}

function PathLine({ from, to, isCompleted, isUnlocked }: PathLineProps) {
  const points = useMemo(() => {
    // Create a curved path between nodes
    const start = new THREE.Vector3(from[0], 0.15, from[2]);
    const end = new THREE.Vector3(to[0], 0.15, to[2]);

    // Create an arc by adding a control point
    const mid = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);
    mid.y = 0.3; // Slight arc upward

    // Create curve
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(20);
  }, [from, to]);

  const color = isCompleted
    ? '#10b981' // Green for completed
    : isUnlocked
    ? '#f59e0b' // Amber for unlocked
    : '#6b7280'; // Gray for locked

  const lineWidth = isCompleted ? 3 : 2;
  const opacity = isUnlocked ? 1 : 0.4;

  return (
    <group>
      {/* Main line */}
      <Line
        points={points}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={opacity}
      />

      {/* Animated dots for unlocked paths */}
      {isUnlocked && !isCompleted && (
        <AnimatedPathDots points={points} color={color} />
      )}

      {/* Arrows at intervals */}
      <PathArrows
        from={from}
        to={to}
        color={color}
        isUnlocked={isUnlocked}
      />
    </group>
  );
}

function AnimatedPathDots({
  points,
  color,
}: {
  points: THREE.Vector3[];
  color: string;
}) {
  // Create animated dots that travel along the path
  const dotPositions = useMemo(() => {
    const numDots = 3;
    return Array.from({ length: numDots }, (_, i) => {
      const t = (i / numDots + (Date.now() * 0.0003)) % 1;
      const index = Math.floor(t * (points.length - 1));
      const nextIndex = Math.min(index + 1, points.length - 1);
      const localT = (t * (points.length - 1)) % 1;

      return new THREE.Vector3().lerpVectors(
        points[index],
        points[nextIndex],
        localT
      );
    });
  }, [points]);

  return (
    <group>
      {dotPositions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function PathArrows({
  from,
  to,
  color,
  isUnlocked,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  isUnlocked: boolean;
}) {
  const arrowData = useMemo(() => {
    const start = new THREE.Vector3(from[0], 0.15, from[2]);
    const end = new THREE.Vector3(to[0], 0.15, to[2]);
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    // Calculate rotation to point arrow in direction of path
    const angle = Math.atan2(direction.x, direction.z);

    return { position: midPoint, rotation: angle };
  }, [from, to]);

  if (!isUnlocked) return null;

  return (
    <mesh
      position={arrowData.position}
      rotation={[0, arrowData.rotation, 0]}
    >
      <coneGeometry args={[0.1, 0.25, 4]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  );
}

export default PathRenderer;

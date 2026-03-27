import { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAvatarPosition } from '../../stores';
import type { ContentNode } from '../../types/game';
import { ModelTree } from './models/ModelTree';
import { ModelBush } from './models/ModelBush';
import { ModelErrorBoundary } from './models/ModelErrorBoundary';

// ── Props ──────────────────────────────────────────────

interface MapTerrainProps {
  nodes?: ContentNode[];
  edges?: { source: string; target: string }[];
  completedNodeIds?: string[];
}

export function MapTerrain({ nodes = [], edges, completedNodeIds = [] }: MapTerrainProps) {
  return (
    <group>
      <InfiniteGround />
      <SectionGrassPatches nodes={nodes} completedNodeIds={completedNodeIds} />
      {nodes.length > 0 && (
        <ProceduralPaths nodes={nodes} edges={edges} completedNodeIds={completedNodeIds} />
      )}
      <ProceduralDecorations nodes={nodes} edges={edges} completedNodeIds={completedNodeIds} />
      <FogOfWar nodes={nodes} completedNodeIds={completedNodeIds} />
    </group>
  );
}

// ── Seeded random for deterministic placement ──────────

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Blend a hex color toward white by a factor (0–1). */
function blendWithWhite(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * factor));
  const lg = Math.min(255, Math.round(g + (255 - g) * factor));
  const lb = Math.min(255, Math.round(b + (255 - b) * factor));
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

// ── Connection helpers ─────────────────────────────────

interface Connection {
  from: ContentNode;
  to: ContentNode;
}

function getConnections(
  nodes: ContentNode[],
  edges?: { source: string; target: string }[]
): Connection[] {
  const result: Connection[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  if (edges && edges.length > 0) {
    for (const edge of edges) {
      const fromNode = nodeMap.get(edge.source);
      const toNode = nodeMap.get(edge.target);
      if (fromNode && toNode) result.push({ from: fromNode, to: toNode });
    }
  } else {
    for (const node of nodes) {
      for (const prereqId of node.prerequisites) {
        const prereq = nodeMap.get(prereqId);
        if (prereq) result.push({ from: prereq, to: node });
      }
    }
  }
  return result;
}

function getPathState(
  conn: Connection,
  completedNodeIds: string[]
): 'completed' | 'available' | 'locked' {
  const sourceCompleted = completedNodeIds.includes(conn.from.id);
  const targetUnlocked = conn.to.prerequisites.every((p) =>
    completedNodeIds.includes(p)
  );

  if (sourceCompleted && completedNodeIds.includes(conn.to.id)) return 'completed';
  if (sourceCompleted || targetUnlocked) return 'available';
  return 'locked';
}

// ── Section Grass Patches ──────────────────────────────
// Large tinted circles on the ground around each node to show section color

function SectionGrassPatches({
  nodes,
  completedNodeIds,
}: {
  nodes: ContentNode[];
  completedNodeIds: string[];
}) {
  const patches = useMemo(() => {
    return nodes
      .filter((n) => n.groupColor)
      .map((n) => {
        const isUnlocked =
          n.prerequisites.length === 0 ||
          n.prerequisites.every((p) => completedNodeIds.includes(p));
        const isCompleted = completedNodeIds.includes(n.id);
        // Blend section color with green for a natural grass tint
        const tintedColor = blendColors(n.groupColor!, '#38d975', 0.45);
        return {
          id: n.id,
          x: n.position[0],
          z: n.position[2],
          color: tintedColor,
          rawColor: n.groupColor!,
          opacity: isCompleted ? 0.55 : isUnlocked ? 0.45 : 0.15,
        };
      });
  }, [nodes, completedNodeIds]);

  if (patches.length === 0) return null;

  return (
    <group>
      {patches.map((p) => (
        <group key={p.id}>
          {/* Large outer grass tint */}
          <mesh
            position={[p.x, 0.005, p.z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[4, 32]} />
            <meshStandardMaterial
              color={p.color}
              roughness={0.9}
              transparent
              opacity={p.opacity * 0.6}
            />
          </mesh>
          {/* Inner stronger tint */}
          <mesh
            position={[p.x, 0.006, p.z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[2.2, 32]} />
            <meshStandardMaterial
              color={p.color}
              roughness={0.85}
              transparent
              opacity={p.opacity * 0.85}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Blend two hex colors by a factor (0 = color1, 1 = color2). */
function blendColors(hex1: string, hex2: string, factor: number): string {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ── Infinite Ground ────────────────────────────────────

function InfiniteGround() {
  const avatarPosition = useAvatarPosition();
  const chunkSize = 50;
  const chunkGridSize = 5;
  const chunksRef = useRef<THREE.Group>(null);
  const [chunkPositions, setChunkPositions] = useState<Map<string, [number, number]>>(new Map());
  const currentChunkRef = useRef<[number, number]>([0, 0]);

  useEffect(() => {
    const initialPositions = new Map<string, [number, number]>();
    const halfGrid = Math.floor(chunkGridSize / 2);
    for (let x = -halfGrid; x <= halfGrid; x++) {
      for (let z = -halfGrid; z <= halfGrid; z++) {
        initialPositions.set(`${x},${z}`, [x * chunkSize, z * chunkSize]);
      }
    }
    setChunkPositions(initialPositions);
  }, []);

  useFrame(() => {
    if (!avatarPosition || !chunksRef.current) return;
    const currentChunkX = Math.floor((avatarPosition[0] + chunkSize / 2) / chunkSize);
    const currentChunkZ = Math.floor((avatarPosition[2] + chunkSize / 2) / chunkSize);
    const [lastX, lastZ] = currentChunkRef.current;

    if (currentChunkX !== lastX || currentChunkZ !== lastZ) {
      const newPositions = new Map<string, [number, number]>();
      const halfGrid = Math.floor(chunkGridSize / 2);
      for (let x = -halfGrid; x <= halfGrid; x++) {
        for (let z = -halfGrid; z <= halfGrid; z++) {
          newPositions.set(`${x},${z}`, [
            (currentChunkX + x) * chunkSize,
            (currentChunkZ + z) * chunkSize,
          ]);
        }
      }
      setChunkPositions(newPositions);
      currentChunkRef.current = [currentChunkX, currentChunkZ];
    }
  });

  return (
    <group ref={chunksRef}>
      {Array.from(chunkPositions.entries()).map(([key, [x, z]]) => (
        <GroundChunk key={key} position={[x, -0.1, z]} size={chunkSize} />
      ))}
    </group>
  );
}

function GroundChunk({ position, size }: { position: [number, number, number]; size: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <planeGeometry args={[size, size, 1, 1]} />
      <meshStandardMaterial color="#38d975" roughness={0.9} />
    </mesh>
  );
}

// ── State-Aware Procedural Paths ───────────────────────

function ProceduralPaths({
  nodes,
  edges,
  completedNodeIds,
}: {
  nodes: ContentNode[];
  edges?: { source: string; target: string }[];
  completedNodeIds: string[];
}) {
  const connections = useMemo(() => getConnections(nodes, edges), [nodes, edges]);

  const segments = useMemo(() => {
    return connections.map((conn) => {
      const state = getPathState(conn, completedNodeIds);
      const fx = conn.from.position[0];
      const fz = conn.from.position[2];
      const tx = conn.to.position[0];
      const tz = conn.to.position[2];
      const midX = (fx + tx) / 2;
      const midZ = (fz + tz) / 2;
      const dx = tx - fx;
      const dz = tz - fz;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);

      // Resolve group color when both nodes share the same group
      const groupColor =
        conn.from.groupColor && conn.to.groupColor && conn.from.groupId === conn.to.groupId
          ? conn.from.groupColor
          : undefined;

      return { midX, midZ, length, angle, state, groupColor };
    });
  }, [connections, completedNodeIds]);

  return (
    <group position={[0, 0.01, 0]}>
      {segments.map((seg, i) => {
        // Use group color for terrain paths — tinted toward earthy tone but still clearly colored
        const color = seg.state === 'completed'
          ? (seg.groupColor ? blendWithWhite(seg.groupColor, 0.3) : '#e8dcc8')
          : seg.state === 'available'
            ? (seg.groupColor ? blendWithWhite(seg.groupColor, 0.15) : '#d4a574')
            : '#6b7280';

        // Wider paths when section-colored
        const baseWidth = seg.state === 'completed' ? 1.5 : seg.state === 'available' ? 1.2 : 0.7;
        const width = seg.groupColor && seg.state !== 'locked' ? baseWidth * 1.3 : baseWidth;
        const opacity = seg.state === 'locked' ? 0.25 : 1;

        return (
          <mesh
            key={i}
            position={[seg.midX, 0, seg.midZ]}
            rotation={[-Math.PI / 2, 0, seg.angle]}
            receiveShadow
          >
            <planeGeometry args={[seg.length, width]} />
            <meshStandardMaterial
              color={color}
              roughness={0.8}
              transparent={seg.state === 'locked'}
              opacity={opacity}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ── Fog of War ─────────────────────────────────────────

function FogOfWar({
  nodes,
  completedNodeIds,
}: {
  nodes: ContentNode[];
  completedNodeIds: string[];
}) {
  const fogNodes = useMemo(() => {
    return nodes.filter((n) => {
      const isUnlocked = n.prerequisites.length === 0 ||
        n.prerequisites.every((p) => completedNodeIds.includes(p));
      return !isUnlocked && !completedNodeIds.includes(n.id);
    });
  }, [nodes, completedNodeIds]);

  return (
    <group>
      {fogNodes.map((node) => (
        <mesh
          key={node.id}
          position={[node.position[0], 0.3, node.position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[3, 24]} />
          <meshBasicMaterial
            color="#94a3b8"
            transparent
            opacity={0.12}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Procedural Decorations ─────────────────────────────

function ProceduralDecorations({
  nodes,
  edges,
  completedNodeIds,
}: {
  nodes: ContentNode[];
  edges?: { source: string; target: string }[];
  completedNodeIds: string[];
}) {
  const connections = useMemo(() => getConnections(nodes, edges), [nodes, edges]);

  const { trees, bushes, lamps } = useMemo(() => {
    let minX = -10, maxX = 10, minZ = -10, maxZ = 10;
    for (const n of nodes) {
      if (n.position[0] < minX) minX = n.position[0];
      if (n.position[0] > maxX) maxX = n.position[0];
      if (n.position[2] < minZ) minZ = n.position[2];
      if (n.position[2] > maxZ) maxZ = n.position[2];
    }

    const pad = 12;
    minX -= pad;
    maxX += pad;
    minZ -= pad;
    maxZ += pad;

    const occupied: [number, number][] = nodes.map((n) => [n.position[0], n.position[2]]);

    for (const { from, to } of connections) {
      const fx = from.position[0], fz = from.position[2];
      const tx = to.position[0], tz = to.position[2];
      occupied.push([(fx + tx) / 2, (fz + tz) / 2]);
      occupied.push([(fx * 3 + tx) / 4, (fz * 3 + tz) / 4]);
      occupied.push([(fx + tx * 3) / 4, (fz + tz * 3) / 4]);
    }

    const NODE_CLEARANCE = 2.5;
    const PATH_CLEARANCE = 2.0;

    function isClear(x: number, z: number, clearance: number): boolean {
      for (const n of nodes) {
        const dx = x - n.position[0];
        const dz = z - n.position[2];
        if (Math.sqrt(dx * dx + dz * dz) < NODE_CLEARANCE) return false;
      }
      for (const [ox, oz] of occupied) {
        const dx = x - ox;
        const dz = z - oz;
        if (Math.sqrt(dx * dx + dz * dz) < clearance) return false;
      }
      return true;
    }

    const seed = nodes.length * 7919 + 42;
    const rand = seededRandom(seed);

    const treeList: { pos: [number, number, number]; scale: number; variant: number }[] = [];
    for (let i = 0; i < 200 && treeList.length < 30; i++) {
      const x = minX + rand() * (maxX - minX);
      const z = minZ + rand() * (maxZ - minZ);
      if (isClear(x, z, PATH_CLEARANCE)) {
        const variant = Math.floor(rand() * 4);
        treeList.push({ pos: [x, 0, z], scale: 0.8 + rand() * 0.5, variant });
      }
    }

    const bushList: { pos: [number, number, number]; variant: number }[] = [];
    for (let i = 0; i < 200 && bushList.length < 25; i++) {
      const x = minX + rand() * (maxX - minX);
      const z = minZ + rand() * (maxZ - minZ);
      if (isClear(x, z, PATH_CLEARANCE * 0.8)) {
        const variant = Math.floor(rand() * 4);
        bushList.push({ pos: [x, 0, z], variant });
      }
    }

    // Lamp data includes the connection state for lit/unlit
    const lampList: { pos: [number, number, number]; lit: boolean }[] = [];
    for (const conn of connections) {
      const mx = (conn.from.position[0] + conn.to.position[0]) / 2;
      const mz = (conn.from.position[2] + conn.to.position[2]) / 2;
      const dx = conn.to.position[0] - conn.from.position[0];
      const dz = conn.to.position[2] - conn.from.position[2];
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      const offsetX = (-dz / len) * 1.2;
      const offsetZ = (dx / len) * 1.2;

      const state = getPathState(conn, completedNodeIds);
      lampList.push({
        pos: [mx + offsetX, 0, mz + offsetZ],
        lit: state !== 'locked',
      });
    }

    return { trees: treeList, bushes: bushList, lamps: lampList };
  }, [nodes, connections, completedNodeIds]);

  return (
    <group>
      {trees.map((t, i) => (
        <ModelErrorBoundary key={`t${i}`} fallback={<Tree position={t.pos} scale={t.scale} />}>
          <Suspense fallback={<Tree position={t.pos} scale={t.scale} />}>
            <ModelTree position={t.pos} scale={t.scale} variant={t.variant} />
          </Suspense>
        </ModelErrorBoundary>
      ))}
      {bushes.map((b, i) => (
        <ModelErrorBoundary key={`b${i}`} fallback={<Bush position={b.pos} />}>
          <Suspense fallback={<Bush position={b.pos} />}>
            <ModelBush position={b.pos} variant={b.variant} />
          </Suspense>
        </ModelErrorBoundary>
      ))}
      {lamps.map((l, i) => (
        <LampPost key={`l${i}`} position={l.pos} lit={l.lit} />
      ))}
    </group>
  );
}

// ── Primitives ─────────────────────────────────────────

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 1.6, 8]} />
        <meshStandardMaterial color="#8b4513" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.2, 0]} castShadow>
        <coneGeometry args={[1.2, 1.5, 8]} />
        <meshStandardMaterial color="#22c55e" roughness={0.85} />
      </mesh>
      <mesh position={[0, 3, 0]} castShadow>
        <coneGeometry args={[0.9, 1.2, 8]} />
        <meshStandardMaterial color="#16a34a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 3.6, 0]} castShadow>
        <coneGeometry args={[0.6, 1, 8]} />
        <meshStandardMaterial color="#15803d" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Bush({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial color="#22c55e" roughness={0.85} />
      </mesh>
      <mesh position={[0.3, 0.3, 0.2]} castShadow>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshStandardMaterial color="#16a34a" roughness={0.85} />
      </mesh>
      <mesh position={[-0.25, 0.35, -0.15]} castShadow>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="#15803d" roughness={0.85} />
      </mesh>
    </group>
  );
}

function LampPost({ position, lit }: { position: [number, number, number]; lit: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 2.4, 8]} />
        <meshStandardMaterial
          color={lit ? '#4a5568' : '#374151'}
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.3, 8]} />
        <meshStandardMaterial
          color={lit ? '#2d3748' : '#1f2937'}
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0, 2.3, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial
          color={lit ? '#fff4e6' : '#4a5568'}
          emissive={lit ? '#ffd93d' : '#000000'}
          emissiveIntensity={lit ? 0.8 : 0}
          roughness={0.3}
        />
      </mesh>
      {lit && (
        <pointLight position={[0, 2.3, 0]} intensity={0.5} distance={5} color="#ffd93d" />
      )}
    </group>
  );
}

export default MapTerrain;

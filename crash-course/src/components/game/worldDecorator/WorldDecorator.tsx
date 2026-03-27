import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ContentNode } from '../../../types/game';
import type { Connection, WorldPreset } from './types';
import { PRESET_BALANCED } from './presets';
import { createHeightFn, createHeightGrid, computeVertexColors } from './terrainGenerator';
import { computeWorldBounds, buildDistanceGrid } from './zonePlanner';
import { placeDecorations } from './decorationPlacer';
import { InstancedFoliage } from './instancedFoliage';
import { buildAllRibbonPaths, PATH_COLORS, type RibbonPathData } from './pathMeshBuilder';
import { MountainRing } from './mountainRing';

// ── Props ───────────────────────────────────────────────

export interface TerrainData {
  heightFn: (x: number, z: number) => number;
}

interface WorldDecoratorProps {
  nodes: ContentNode[];
  edges?: { source: string; target: string }[];
  completedNodeIds: string[];
  preset?: WorldPreset;
  onTerrainReady?: (data: TerrainData) => void;
}

// ── Connection builder ──────────────────────────────────

function getConnections(
  nodes: ContentNode[],
  edges?: { source: string; target: string }[],
): Connection[] {
  const result: Connection[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  if (edges && edges.length > 0) {
    for (const edge of edges) {
      const from = nodeMap.get(edge.source);
      const to = nodeMap.get(edge.target);
      if (from && to) result.push({ from, to });
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

// ── Path state helper ───────────────────────────────────

function getPathState(
  conn: Connection,
  completedNodeIds: string[],
): 'completed' | 'available' | 'locked' {
  const sourceCompleted = completedNodeIds.includes(conn.from.id);
  const targetCompleted = completedNodeIds.includes(conn.to.id);
  const targetUnlocked = conn.to.prerequisites.every((p) =>
    completedNodeIds.includes(p),
  );
  if (sourceCompleted && targetCompleted) return 'completed';
  if (sourceCompleted || targetUnlocked) return 'available';
  return 'locked';
}

// ── Main Component ──────────────────────────────────────

export function WorldDecorator({
  nodes,
  edges,
  completedNodeIds,
  preset = PRESET_BALANCED,
  onTerrainReady,
}: WorldDecoratorProps) {
  const connections = useMemo(() => getConnections(nodes, edges), [nodes, edges]);
  const seed = nodes.length * 7919 + 42;

  // World bounds
  const bounds = useMemo(() => computeWorldBounds(nodes), [nodes]);

  // Height function
  const heightFn = useMemo(
    () => createHeightFn(nodes, connections, preset),
    [nodes, connections, preset],
  );

  // Height grid for collider (65×65)
  const heightGridSize = 65;
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  const heightGrid = useMemo(
    () => createHeightGrid(heightFn, bounds.size, heightGridSize, cx, cz),
    [heightFn, bounds.size, cx, cz],
  );

  // Notify parent of terrain height function for avatar terrain following
  useEffect(() => {
    if (onTerrainReady) {
      onTerrainReady({ heightFn });
    }
  }, [heightFn, onTerrainReady]);

  // Decorations (computed once per node layout)
  const decorations = useMemo(
    () => placeDecorations(nodes, connections, heightFn, preset),
    [nodes, connections, heightFn, preset],
  );

  // Ribbon paths
  const ribbonPaths = useMemo(
    () => buildAllRibbonPaths(connections, completedNodeIds, heightFn, {
      completed: preset.path.completedWidth,
      available: preset.path.availableWidth,
      locked: preset.path.lockedWidth,
    }),
    [connections, completedNodeIds, heightFn, preset.path],
  );

  // Terrain mesh geometry with height displacement + vertex colors
  const terrainGeo = useMemo(() => {
    const gridRes = 64;
    const geo = new THREE.PlaneGeometry(bounds.size, bounds.size, gridRes, gridRes);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + cx;
      const z = pos.getZ(i) + cz;
      pos.setY(i, heightFn(x, z));
      // Offset to world center
      pos.setX(i, x);
      pos.setZ(i, z);
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();

    // Vertex colors
    const colors = computeVertexColors(heightFn, bounds.size, gridRes, connections);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    return geo;
  }, [heightFn, bounds, connections]);

  // Lamp posts along paths
  const lamps = useMemo(() => {
    const result: { pos: [number, number, number]; lit: boolean }[] = [];
    for (const conn of connections) {
      const mx = (conn.from.position[0] + conn.to.position[0]) / 2;
      const mz = (conn.from.position[2] + conn.to.position[2]) / 2;
      const dx = conn.to.position[0] - conn.from.position[0];
      const dz = conn.to.position[2] - conn.from.position[2];
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      const offsetX = (-dz / len) * 1.2;
      const offsetZ = (dx / len) * 1.2;
      const lx = mx + offsetX;
      const lz = mz + offsetZ;
      const ly = heightFn(lx, lz);
      const state = getPathState(conn, completedNodeIds);
      result.push({ pos: [lx, ly, lz], lit: state !== 'locked' });
    }
    return result;
  }, [connections, completedNodeIds, heightFn]);

  // Node ground pads
  const nodePads = useMemo(() => {
    return nodes.map((node) => ({
      position: [node.position[0], heightFn(node.position[0], node.position[2]) + 0.03, node.position[2]] as [number, number, number],
    }));
  }, [nodes, heightFn]);

  // Fog-of-war overlays for locked nodes
  const fogNodes = useMemo(() => {
    return nodes.filter((n) => {
      const isUnlocked = n.prerequisites.length === 0 ||
        n.prerequisites.every((p) => completedNodeIds.includes(p));
      return !isUnlocked && !completedNodeIds.includes(n.id);
    });
  }, [nodes, completedNodeIds]);

  // Outer ground plane that extends to the mountain ring, so the world doesn't look like a floating island
  const outerGroundRadius = preset.mountains.outerRadius + 10;

  return (
    <group>
      {/* Large ground plane extending to mountains */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]} receiveShadow>
        <circleGeometry args={[outerGroundRadius, 64]} />
        <meshStandardMaterial color="#5a8a4a" roughness={0.95} />
      </mesh>

      {/* Terrain mesh */}
      <mesh geometry={terrainGeo} receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.9}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Ribbon paths */}
      {ribbonPaths.map((rp, i) => (
        <RibbonPathMesh key={`path-${i}`} data={rp} />
      ))}

      {/* Animated particles on available paths */}
      {ribbonPaths
        .filter((rp) => rp.state === 'available')
        .map((rp, i) => (
          <PathParticles key={`particles-${i}`} curve={rp.curve} color={PATH_COLORS.available} />
        ))}

      {/* Direction arrows on unlocked paths */}
      {ribbonPaths
        .filter((rp) => rp.state !== 'locked')
        .map((rp, i) => (
          <PathArrows key={`arrows-${i}`} curve={rp.curve} color={PATH_COLORS[rp.state]} heightFn={heightFn} />
        ))}

      {/* Node ground pads */}
      {nodePads.map((pad, i) => (
        <mesh key={`pad-${i}`} position={pad.position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[2.0, 24]} />
          <meshStandardMaterial color="#c4b499" roughness={0.8} />
        </mesh>
      ))}

      {/* Fog of War overlays */}
      {fogNodes.map((node) => (
        <mesh
          key={`fog-${node.id}`}
          position={[node.position[0], heightFn(node.position[0], node.position[2]) + 0.3, node.position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[3, 24]} />
          <meshBasicMaterial color="#94a3b8" transparent opacity={0.12} />
        </mesh>
      ))}

      {/* Instanced foliage decorations */}
      <InstancedFoliage decorations={decorations} />

      {/* Lamp posts */}
      {lamps.map((l, i) => (
        <LampPost key={`lamp-${i}`} position={l.pos} lit={l.lit} />
      ))}

      {/* Mountain ring */}
      <MountainRing preset={preset} seed={seed} />
    </group>
  );
}

// ── Ribbon Path Mesh ────────────────────────────────────

function RibbonPathMesh({ data }: { data: RibbonPathData }) {
  const color = PATH_COLORS[data.state];
  const emissiveIntensity = data.state === 'completed' ? 0.15 : data.state === 'available' ? 0.1 : 0;
  const opacity = data.state === 'locked' ? 0.25 : 1;

  return (
    <mesh geometry={data.geometry} receiveShadow>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        roughness={0.6}
        transparent={data.state === 'locked'}
        opacity={opacity}
      />
    </mesh>
  );
}

// ── Path Particles (animated) ───────────────────────────

function PathParticles({ curve, color }: { curve: THREE.QuadraticBezierCurve3; color: string }) {
  const count = 4;
  const refs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const mesh = refs.current[i];
      if (!mesh) continue;
      const t = (time * 0.3 + i / count) % 1;
      const pos = curve.getPoint(t);
      mesh.position.set(pos.x, pos.y + 0.3, pos.z);
      const pulse = 0.8 + Math.sin(time * 4 + i * 1.5) * 0.2;
      mesh.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ── Path Arrows ─────────────────────────────────────────

function PathArrows({
  curve,
  color,
  heightFn,
}: {
  curve: THREE.QuadraticBezierCurve3;
  color: string;
  heightFn: (x: number, z: number) => number;
}) {
  const arrows = useMemo(() => {
    return [0.4, 0.7].map((t) => {
      const pos = curve.getPoint(t);
      const tangent = curve.getTangent(t);
      const angle = Math.atan2(tangent.x, tangent.z);
      const y = heightFn(pos.x, pos.z) + 0.3;
      return { position: [pos.x, y, pos.z] as [number, number, number], rotation: angle };
    });
  }, [curve, heightFn]);

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

// ── Lamp Post ───────────────────────────────────────────

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

export default WorldDecorator;

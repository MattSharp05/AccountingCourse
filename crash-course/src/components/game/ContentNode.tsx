import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import type { ContentNode as ContentNodeType, ContentType } from '../../types/game';
import { useCompletedNodes } from '../../stores';

interface ContentNodeProps {
  node: ContentNodeType;
  isUnlocked: boolean;
  isStart?: boolean;
  onInteract: () => void;
  allNodes?: ContentNodeType[];
  edges?: { source: string; target: string }[];
  completedNodeIds?: string[];
}

const nodeColors: Record<ContentType, { primary: string; glow: string }> = {
  video: { primary: '#4F46E5', glow: '#818cf8' },
  reading: { primary: '#0891b2', glow: '#22d3ee' },
  exercise: { primary: '#059669', glow: '#34d399' },
  'quiz-boss': { primary: '#dc2626', glow: '#f87171' },
};

/** Lighten a hex color by a factor (0–1). */
function lightenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * factor));
  const lg = Math.min(255, Math.round(g + (255 - g) * factor));
  const lb = Math.min(255, Math.round(b + (255 - b) * factor));
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

const nodeTypeLabels: Record<ContentType, string> = {
  video: 'Video',
  reading: 'Reading',
  exercise: 'Exercise',
  'quiz-boss': 'Quiz Boss',
};

// ── Mini Graph SVG ──────────────────────────────────────

function MiniGraphSVG({
  allNodes,
  edges,
  completedNodeIds,
  currentNodeId,
  nodeColor,
}: {
  allNodes: ContentNodeType[];
  edges?: { source: string; target: string }[];
  completedNodeIds: string[];
  currentNodeId: string;
  nodeColor: string;
}) {
  const width = 570;
  const height = 360;
  const padding = 15;

  const layout = useMemo(() => {
    if (allNodes.length === 0) return { mapX: () => width / 2, mapZ: () => height / 2 };

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const n of allNodes) {
      if (n.position[0] < minX) minX = n.position[0];
      if (n.position[0] > maxX) maxX = n.position[0];
      if (n.position[2] < minZ) minZ = n.position[2];
      if (n.position[2] > maxZ) maxZ = n.position[2];
    }
    const rangeX = maxX - minX || 1;
    const rangeZ = maxZ - minZ || 1;

    return {
      mapX: (worldX: number) => padding + ((worldX - minX) / rangeX) * (width - padding * 2),
      mapZ: (worldZ: number) => padding + ((worldZ - minZ) / rangeZ) * (height - padding * 2),
    };
  }, [allNodes]);

  // Build edge list
  const edgeList = useMemo(() => {
    if (edges && edges.length > 0) return edges;
    const result: { source: string; target: string }[] = [];
    for (const node of allNodes) {
      for (const prereqId of node.prerequisites) {
        result.push({ source: prereqId, target: node.id });
      }
    }
    return result;
  }, [allNodes, edges]);

  const nodeMap = useMemo(() => new Map(allNodes.map(n => [n.id, n])), [allNodes]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {/* Edges — section-colored when both nodes share a group */}
      {edgeList.map((edge, i) => {
        const from = nodeMap.get(edge.source);
        const to = nodeMap.get(edge.target);
        if (!from || !to) return null;
        const sameGroup = from.groupColor && to.groupColor && from.groupId === to.groupId;
        return (
          <line
            key={i}
            x1={layout.mapX(from.position[0])}
            y1={layout.mapZ(from.position[2])}
            x2={layout.mapX(to.position[0])}
            y2={layout.mapZ(to.position[2])}
            stroke={sameGroup ? from.groupColor! : '#475569'}
            strokeWidth={sameGroup ? 4 : 3}
            strokeOpacity={sameGroup ? 0.7 : 0.6}
          />
        );
      })}

      {/* Nodes — always show section color, checkmark on completed */}
      {allNodes.map(n => {
        const cx = layout.mapX(n.position[0]);
        const cy = layout.mapZ(n.position[2]);
        const isCurrent = n.id === currentNodeId;
        const isCompleted = completedNodeIds.includes(n.id);
        const isAvailable = !isCompleted && (n.prerequisites.length === 0 || n.prerequisites.every(p => completedNodeIds.includes(p)));

        // Always show section color when available; locked nodes are dimmed
        const fill = isCurrent
          ? nodeColor
          : (n.groupColor || (isCompleted ? '#10b981' : isAvailable ? '#ffffff' : '#64748b'));
        const r = isCurrent ? 21 : 12;
        const isLocked = !isCurrent && !isCompleted && !isAvailable;

        return (
          <g key={n.id}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={fill}
              opacity={isLocked ? 0.35 : 1}
            />
            {/* Completed checkmark */}
            {isCompleted && !isCurrent && (
              <>
                <circle cx={cx} cy={cy} r={r + 2} fill="none" stroke="#10b981" strokeWidth={2} />
                <text
                  x={cx}
                  y={cy + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ffffff"
                  fontSize={r * 1.1}
                  fontWeight="bold"
                >
                  ✓
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Holographic Billboard ───────────────────────────────

type BillboardState = 'locked' | 'available' | 'completed';

function HoloBillboard({
  node,
  allNodes,
  edges,
  completedNodeIds,
  state,
  accentColor,
}: {
  node: ContentNodeType;
  allNodes: ContentNodeType[];
  edges?: { source: string; target: string }[];
  completedNodeIds: string[];
  state: BillboardState;
  accentColor?: string;
}) {
  const typeColors = nodeColors[node.type];
  const borderColor = accentColor || typeColors.glow;

  const stateStyles: Record<BillboardState, React.CSSProperties> = {
    locked: {
      opacity: 0.15,
      filter: 'grayscale(1)',
      border: '2px solid rgba(100,116,139,0.2)',
      boxShadow: 'none',
    },
    available: {
      opacity: 1,
      border: `3px solid ${borderColor}`,
      boxShadow: `0 0 20px ${borderColor}55`,
      animation: 'holoPulse 2s ease-in-out infinite',
    },
    completed: {
      opacity: 1,
      border: `3px solid ${borderColor}`,
      boxShadow: `0 0 15px ${borderColor}33`,
    },
  };

  return (
    <Html center distanceFactor={2} occlude={false} position={[0, 3, 0]} transform zIndexRange={[0, 0]}>
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          borderRadius: 36,
          padding: 42,
          width: 900,
          pointerEvents: 'none',
          userSelect: 'none',
          position: 'relative',
          ...stateStyles[state],
        }}
      >
        {/* Inject keyframe animation */}
        <style>{`
          @keyframes holoPulse {
            0%, 100% { box-shadow: 0 0 15px ${borderColor}33; }
            50% { box-shadow: 0 0 25px ${borderColor}66; }
          }
        `}</style>

        {/* Mini Graph */}
        <MiniGraphSVG
          allNodes={allNodes}
          edges={edges}
          completedNodeIds={completedNodeIds}
          currentNodeId={node.id}
          nodeColor={borderColor}
        />

        {/* Title */}
        <div
          style={{
            color: '#ffffff',
            fontSize: 42,
            fontWeight: 700,
            marginTop: 18,
            lineHeight: '1.2',
            textAlign: 'center',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {node.title}
        </div>

        {/* Type badge */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 12,
          }}
        >
          <span
            style={{
              fontSize: 33,
              fontWeight: 600,
              color: borderColor,
              background: `${borderColor}33`,
              padding: '3px 18px',
              borderRadius: 15,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {nodeTypeLabels[node.type]}
          </span>
        </div>

        {/* Completed checkmark badge */}
        {state === 'completed' && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              color: '#fff',
              lineHeight: 1,
            }}
          >
            ✓
          </div>
        )}
      </div>
    </Html>
  );
}

export function ContentNode3D({ node, isUnlocked, isStart, onInteract, allNodes, edges, completedNodeIds }: ContentNodeProps) {
  const meshRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const storeCompletedNodes = useCompletedNodes();
  const completed = completedNodeIds ?? storeCompletedNodes;
  const isCompleted = completed.includes(node.id);

  // Use group color when available, otherwise fall back to type-based colors
  const typeColors = nodeColors[node.type];
  const colors = node.groupColor
    ? { primary: node.groupColor, glow: lightenColor(node.groupColor, 0.3) }
    : typeColors;
  const billboardNodes = allNodes ?? [];
  const billboardCompleted = completed;

  useFrame((state) => {
    if (meshRef.current) {
      if (isUnlocked && !isCompleted) {
        meshRef.current.position.y = node.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.08;
      }
      if (hovered && isUnlocked) {
        meshRef.current.rotation.y += 0.015;
      }
    }
    if (glowRef.current && isUnlocked && !isCompleted) {
      const pulse = 0.35 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
  });

  const handleClick = () => {
    if (isUnlocked) {
      onInteract();
    }
  };

  const scale = node.type === 'quiz-boss' ? 1.4 : 1;

  // Section color ground haze — always visible when groupColor exists
  const sectionHaze = node.groupColor ? (
    <>
      {/* Large colored ground disc */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.8 * scale, 32]} />
        <meshBasicMaterial
          color={node.groupColor}
          transparent
          opacity={isUnlocked ? 0.18 : 0.06}
        />
      </mesh>
      {/* Inner brighter disc */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.6 * scale, 32]} />
        <meshBasicMaterial
          color={node.groupColor}
          transparent
          opacity={isUnlocked ? 0.25 : 0.08}
        />
      </mesh>
      {/* Colored ground point light — only when unlocked */}
      {isUnlocked && (
        <pointLight
          position={[0, 0.5, 0]}
          color={node.groupColor}
          intensity={1.2}
          distance={5}
        />
      )}
    </>
  ) : null;

  // ── Locked state ──────────────────────────────────
  if (!isUnlocked) {
    return (
      <group position={node.position}>
        {/* Section haze (muted) */}
        {sectionHaze}

        {/* Muted base platform */}
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <cylinderGeometry args={[0.5 * scale, 0.55 * scale, 0.1, 16]} />
          <meshStandardMaterial
            color="#4b5563"
            roughness={0.5}
            transparent
            opacity={0.3}
          />
        </mesh>

        {/* Holographic billboard - locked */}
        {billboardNodes.length > 0 && (
          <HoloBillboard
            node={node}
            allNodes={billboardNodes}
            edges={edges}
            completedNodeIds={billboardCompleted}
            state="locked"
            accentColor={colors.primary}
          />
        )}
      </group>
    );
  }

  // ── Completed state ───────────────────────────────
  if (isCompleted) {
    return (
      <group
        position={node.position}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Section haze */}
        {sectionHaze}

        {/* Solid base platform */}
        <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[0.6 * scale, 0.7 * scale, 0.2, 16]} />
          <meshStandardMaterial
            color={colors.primary}
            roughness={0.5}
          />
        </mesh>

        {/* Green completion ring at base */}
        <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.62 * scale, 0.78 * scale, 32]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.7} />
        </mesh>

        {/* Holographic billboard - completed */}
        {billboardNodes.length > 0 && (
          <HoloBillboard
            node={node}
            allNodes={billboardNodes}
            edges={edges}
            completedNodeIds={billboardCompleted}
            state="completed"
            accentColor={colors.primary}
          />
        )}

        {/* Start indicator */}
        {isStart && <StartMarker scale={scale} />}

        {/* Hover tooltip */}
        {hovered && (
          <Html position={[0, 3.2, 0]} center distanceFactor={8}>
            <div
              className="px-3 py-2 rounded-lg text-white text-sm font-medium whitespace-nowrap"
              style={{
                backgroundColor: colors.primary,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {node.title}
              <span className="ml-2 text-xs opacity-75">Completed</span>
            </div>
          </Html>
        )}
      </group>
    );
  }

  // ── Available (unlocked, not completed) state ─────
  return (
    <group
      ref={meshRef}
      position={node.position}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Section haze */}
      {sectionHaze}

      {/* Ground glow light */}
      <pointLight
        position={[0, 0.3, 0]}
        color={colors.glow}
        intensity={0.6}
        distance={3}
      />

      {/* Base platform — slightly raised */}
      <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.6 * scale, 0.7 * scale, 0.2, 16]} />
        <meshStandardMaterial
          color={colors.primary}
          roughness={0.5}
        />
      </mesh>

      {/* Pulsing glow ring */}
      <mesh
        ref={glowRef}
        position={[0, 0.07, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.65 * scale, 0.9 * scale, 32]} />
        <meshBasicMaterial color={colors.glow} transparent opacity={0.4} />
      </mesh>

      {/* Holographic billboard - available (floating) */}
      <Float
        speed={2}
        rotationIntensity={0.2}
        floatIntensity={0.3}
      >
        {billboardNodes.length > 0 && (
          <HoloBillboard
            node={node}
            allNodes={billboardNodes}
            edges={edges}
            completedNodeIds={billboardCompleted}
            state="available"
            accentColor={colors.primary}
          />
        )}
      </Float>

      {/* Start indicator */}
      {isStart && <StartMarker scale={scale} />}

      {/* Hover tooltip */}
      {hovered && (
        <Html position={[0, 3.2, 0]} center distanceFactor={8}>
          <div
            className="px-3 py-2 rounded-lg text-white text-sm font-medium whitespace-nowrap"
            style={{
              backgroundColor: colors.primary,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <span className="text-xs opacity-75 mr-2">{nodeTypeLabels[node.type]}</span>
            {node.title}
          </div>
        </Html>
      )}

      {/* Interaction hint */}
      {hovered && (
        <Html position={[0, -0.5, 0]} center distanceFactor={10}>
          <div className="text-xs text-white bg-black/50 px-2 py-1 rounded">
            Click to open
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Start Marker ────────────────────────────────────────

function StartMarker({ scale }: { scale: number }) {
  return (
    <>
      {/* Large gold ring */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.95 * scale, 1.2 * scale, 32]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={0.3}
          transparent
          opacity={0.7}
          roughness={0.5}
        />
      </mesh>

      {/* Upward cone marker */}
      <mesh position={[0, 2.8, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.2, 0.5, 4]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={0.4}
          roughness={0.5}
        />
      </mesh>
    </>
  );
}

export default ContentNode3D;

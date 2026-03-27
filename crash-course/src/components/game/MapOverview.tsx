import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { ContentNode, ContentType, Vector3 } from '../../types/game';

// ── Shared Types & Helpers ──────────────────────────────

interface Edge {
  source: string;
  target: string;
}

type NodeState = 'locked' | 'available' | 'completed' | 'current';

const NODE_COLORS: Record<ContentType, string> = {
  video: '#4F46E5',
  reading: '#0891b2',
  exercise: '#059669',
  'quiz-boss': '#dc2626',
};

const STATE_RING: Record<NodeState, string> = {
  locked: '#6b7280',
  available: '#f59e0b',
  completed: '#10b981',
  current: '#f59e0b',
};

const STATE_LABELS: Record<NodeState, string> = {
  locked: 'Locked',
  available: 'Available',
  completed: 'Completed',
  current: 'Current',
};

const TYPE_ICONS: Record<ContentType, string> = {
  video: '▶',
  reading: '📄',
  exercise: '✏️',
  'quiz-boss': '⚔️',
};

interface Connection {
  from: ContentNode;
  to: ContentNode;
  state: 'completed' | 'available' | 'locked';
}

function buildConnections(
  nodes: ContentNode[],
  edges: Edge[] | undefined,
  completedNodeIds: string[],
): Connection[] {
  const result: Connection[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const edgeList: { source: string; target: string }[] = [];
  if (edges && edges.length > 0) {
    edgeList.push(...edges);
  } else {
    for (const node of nodes) {
      for (const prereqId of node.prerequisites) {
        edgeList.push({ source: prereqId, target: node.id });
      }
    }
  }

  for (const edge of edgeList) {
    const from = nodeMap.get(edge.source);
    const to = nodeMap.get(edge.target);
    if (!from || !to) continue;

    const srcDone = completedNodeIds.includes(edge.source);
    const tgtDone = completedNodeIds.includes(edge.target);
    const tgtUnlocked = to.prerequisites.every((p) => completedNodeIds.includes(p));

    let state: 'completed' | 'available' | 'locked';
    if (srcDone && tgtDone) state = 'completed';
    else if (srcDone || tgtUnlocked) state = 'available';
    else state = 'locked';

    result.push({ from, to, state });
  }

  return result;
}

function getNodeState(
  node: ContentNode,
  completedNodeIds: string[],
  nearbyNodeId: string | null,
): NodeState {
  if (completedNodeIds.includes(node.id)) return 'completed';
  const unlocked = node.prerequisites.length === 0 ||
    node.prerequisites.every((p) => completedNodeIds.includes(p));
  if (!unlocked) return 'locked';
  if (node.id === nearbyNodeId) return 'current';
  return 'available';
}

// Coordinate mapping: 3D world (X, Z) → 2D SVG (x, y)
function useCoordinateMapper(nodes: ContentNode[], padding: number, width: number, height: number) {
  return useMemo(() => {
    if (nodes.length === 0) return { mapX: () => width / 2, mapZ: () => height / 2, bounds: { minX: 0, maxX: 0, minZ: 0, maxZ: 0 } };

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const n of nodes) {
      if (n.position[0] < minX) minX = n.position[0];
      if (n.position[0] > maxX) maxX = n.position[0];
      if (n.position[2] < minZ) minZ = n.position[2];
      if (n.position[2] > maxZ) maxZ = n.position[2];
    }

    const rangeX = maxX - minX || 1;
    const rangeZ = maxZ - minZ || 1;

    const mapX = (worldX: number) =>
      padding + ((worldX - minX) / rangeX) * (width - padding * 2);
    const mapZ = (worldZ: number) =>
      padding + ((worldZ - minZ) / rangeZ) * (height - padding * 2);

    return { mapX, mapZ, bounds: { minX, maxX, minZ, maxZ } };
  }, [nodes, padding, width, height]);
}

// ── Shared SVG Map Renderer ─────────────────────────────

interface MapSVGProps {
  nodes: ContentNode[];
  edges?: Edge[];
  completedNodeIds: string[];
  nearbyNodeId: string | null;
  avatarPosition: Vector3 | null;
  width: number;
  height: number;
  padding: number;
  nodeRadius: number;
  showLabels?: boolean;
  onNodeClick?: (nodeId: string) => void;
  interactive?: boolean;
}

function MapSVG({
  nodes,
  edges,
  completedNodeIds,
  nearbyNodeId,
  avatarPosition,
  width,
  height,
  padding,
  nodeRadius,
  showLabels = false,
  onNodeClick,
  interactive = false,
}: MapSVGProps) {
  const { mapX, mapZ, bounds } = useCoordinateMapper(nodes, padding, width, height);
  const connections = useMemo(
    () => buildConnections(nodes, edges, completedNodeIds),
    [nodes, edges, completedNodeIds],
  );

  // Map avatar 3D position to 2D
  const avatarSvg = useMemo(() => {
    if (!avatarPosition) return null;
    const rangeX = (bounds.maxX - bounds.minX) || 1;
    const rangeZ = (bounds.maxZ - bounds.minZ) || 1;
    const sx = padding + ((avatarPosition[0] - bounds.minX) / rangeX) * (width - padding * 2);
    const sy = padding + ((avatarPosition[2] - bounds.minZ) / rangeZ) * (height - padding * 2);
    return {
      x: Math.max(padding, Math.min(width - padding, sx)),
      y: Math.max(padding, Math.min(height - padding, sy)),
    };
  }, [avatarPosition, bounds, padding, width, height]);

  const edgeColors: Record<string, string> = {
    completed: '#10b981',
    available: '#f59e0b',
    locked: '#374151',
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      style={{ display: 'block' }}
    >
      {/* Background */}
      <rect x={0} y={0} width={width} height={height} rx={8} fill="#1e293b" />

      {/* Edges */}
      {connections.map((conn, i) => {
        const x1 = mapX(conn.from.position[0]);
        const y1 = mapZ(conn.from.position[2]);
        const x2 = mapX(conn.to.position[0]);
        const y2 = mapZ(conn.to.position[2]);
        const sameGroup = conn.from.groupColor && conn.to.groupColor && conn.from.groupId === conn.to.groupId;
        const edgeColor = conn.state === 'locked'
          ? '#374151'
          : (sameGroup ? conn.from.groupColor! : edgeColors[conn.state]);
        return (
          <line
            key={`e-${i}`}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={edgeColor}
            strokeWidth={conn.state === 'locked' ? 2 : 3.5}
            strokeOpacity={conn.state === 'locked' ? 0.3 : 0.8}
            strokeLinecap="round"
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const state = getNodeState(node, completedNodeIds, nearbyNodeId);
        const cx = mapX(node.position[0]);
        const cy = mapZ(node.position[2]);
        const sectionColor = node.groupColor || NODE_COLORS[node.type];
        const fill = sectionColor;
        const ringColor = STATE_RING[state];
        const opacity = state === 'locked' ? 0.3 : 1;
        const r = state === 'current' ? nodeRadius * 1.3 : nodeRadius;
        const isClickable = interactive && state !== 'locked';

        return (
          <g
            key={node.id}
            style={{ cursor: isClickable ? 'pointer' : 'default' }}
            onClick={() => isClickable && onNodeClick?.(node.id)}
            role={isClickable ? 'button' : undefined}
            aria-label={isClickable ? `${node.title} — ${STATE_LABELS[state]}` : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onNodeClick?.(node.id);
              }
            }}
          >
            {/* State ring */}
            {state !== 'locked' && (
              <circle
                cx={cx} cy={cy} r={r + 4}
                fill="none"
                stroke={ringColor}
                strokeWidth={2.5}
                opacity={state === 'current' ? 1 : 0.7}
              />
            )}
            {/* Pulse ring for current / available */}
            {(state === 'current' || state === 'available') && (
              <circle
                cx={cx} cy={cy} r={r + 6}
                fill="none"
                stroke={ringColor}
                strokeWidth={1.5}
                opacity={0.4}
              >
                <animate attributeName="r" from={r + 4} to={r + 12} dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            {/* Node dot */}
            <circle cx={cx} cy={cy} r={r} fill={fill} opacity={opacity} />
            {/* Completed: green ring + white checkmark */}
            {state === 'completed' && (
              <>
                <circle cx={cx} cy={cy} r={r + 2} fill="none" stroke="#10b981" strokeWidth={3} />
                <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={r * 1.2} fontWeight="bold">✓</text>
              </>
            )}
            {/* Quiz boss icon */}
            {node.type === 'quiz-boss' && state !== 'completed' && state !== 'locked' && (
              <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={r * 1.1}>★</text>
            )}

            {/* Label */}
            {showLabels && (
              <text
                x={cx} y={cy + r + 18}
                textAnchor="middle"
                fill={state === 'locked' ? '#6b7280' : '#e2e8f0'}
                fontSize={13}
                fontWeight={500}
                fontFamily="system-ui, sans-serif"
                opacity={state === 'locked' ? 0.5 : 0.9}
              >
                {node.title.length > 24 ? node.title.slice(0, 22) + '...' : node.title}
              </text>
            )}
          </g>
        );
      })}

      {/* Player position dot */}
      {avatarSvg && (
        <g>
          <circle cx={avatarSvg.x} cy={avatarSvg.y} r={nodeRadius * 0.7} fill="#fbbf24" stroke="#ffffff" strokeWidth={2} />
          <circle cx={avatarSvg.x} cy={avatarSvg.y} r={nodeRadius * 0.7} fill="none" stroke="#fbbf24" strokeWidth={1.5}>
            <animate attributeName="r" from={nodeRadius * 0.7} to={nodeRadius * 1.8} dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
    </svg>
  );
}

// ── Course Navigator (grouped node list) ─────────────────

interface CourseNavProps {
  nodes: ContentNode[];
  completedNodeIds: string[];
  nearbyNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
}

function CourseNavigator({ nodes, completedNodeIds, nearbyNodeId, onNodeClick }: CourseNavProps) {
  const chapters = useMemo(() => {
    const groups = new Map<string, { color: string; nodes: ContentNode[] }>();
    const ungrouped: ContentNode[] = [];

    for (const node of nodes) {
      if (node.groupId && node.groupColor) {
        let group = groups.get(node.groupId);
        if (!group) {
          group = { color: node.groupColor, nodes: [] };
          groups.set(node.groupId, group);
        }
        group.nodes.push(node);
      } else {
        ungrouped.push(node);
      }
    }

    const result: { id: string; color: string; nodes: ContentNode[] }[] = [];
    const seen = new Set<string>();
    for (const node of nodes) {
      if (node.groupId && node.groupColor && !seen.has(node.groupId)) {
        seen.add(node.groupId);
        const group = groups.get(node.groupId)!;
        result.push({ id: node.groupId, color: group.color, nodes: group.nodes });
      }
    }
    if (ungrouped.length > 0) {
      result.push({ id: '__ungrouped__', color: '#6b7280', nodes: ungrouped });
    }
    return result;
  }, [nodes]);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(chapters.map((c) => c.id)));

  const toggleChapter = useCallback((chId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(chId)) next.delete(chId);
      else next.add(chId);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-1">
      {chapters.map((chapter, ci) => {
        const completedCount = chapter.nodes.filter((n) => completedNodeIds.includes(n.id)).length;
        const isOpen = expanded.has(chapter.id);

        return (
          <div key={chapter.id}>
            {/* Chapter header */}
            <button
              onClick={() => toggleChapter(chapter.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left group"
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: chapter.color }}
              />
              <span className="text-sm font-semibold text-gray-200 truncate flex-1">
                {chapter.id === '__ungrouped__' ? 'General' : `Section ${ci + 1}`}
              </span>
              <span className="text-xs text-gray-500 tabular-nums font-medium">
                {completedCount}/{chapter.nodes.length}
              </span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {/* Node list */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="pl-4 pr-1 pb-2 flex flex-col gap-0.5">
                    {chapter.nodes.map((node) => {
                      const state = getNodeState(node, completedNodeIds, nearbyNodeId);
                      const isClickable = state !== 'locked';
                      const isCompleted = state === 'completed';
                      const isCurrent = state === 'current';

                      return (
                        <button
                          key={node.id}
                          onClick={() => isClickable && onNodeClick(node.id)}
                          disabled={!isClickable}
                          className={`
                            w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all
                            ${isClickable
                              ? 'hover:bg-white/8 cursor-pointer'
                              : 'opacity-40 cursor-not-allowed'
                            }
                            ${isCurrent ? 'bg-amber-500/10 ring-1 ring-amber-500/30' : ''}
                          `}
                        >
                          {/* Status icon */}
                          <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                            {isCompleted ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </div>
                            ) : (
                              <div
                                className={`w-5 h-5 rounded-full border-2 ${
                                  isClickable ? 'border-amber-400' : 'border-gray-600'
                                }`}
                                style={isClickable ? { borderColor: chapter.color } : undefined}
                              />
                            )}
                          </div>

                          {/* Type icon */}
                          <span className="shrink-0 text-sm">
                            {TYPE_ICONS[node.type]}
                          </span>

                          {/* Title */}
                          <span
                            className={`truncate flex-1 text-sm ${
                              isCompleted
                                ? 'text-gray-400 line-through decoration-gray-600'
                                : isClickable
                                  ? 'text-gray-100'
                                  : 'text-gray-500'
                            }`}
                          >
                            {node.title}
                          </span>

                          {/* XP badge */}
                          {!isCompleted && isClickable && (
                            <span className="shrink-0 text-xs text-amber-400/70 tabular-nums font-medium">
                              +{node.xpReward}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ── Mini Map (bottom-left thumbnail) ─────────────────────

interface MiniMapProps {
  nodes: ContentNode[];
  edges?: Edge[];
  completedNodeIds: string[];
  nearbyNodeId: string | null;
  avatarPosition: Vector3 | null;
  mapTitle: string;
  progress: number;
  onOpenFullMap: () => void;
  onNodeSelect?: (nodeId: string) => void;
}

export function MiniMap({
  nodes,
  edges,
  completedNodeIds,
  nearbyNodeId,
  avatarPosition,
  mapTitle,
  progress,
  onOpenFullMap,
}: MiniMapProps) {
  return (
    <div className="absolute bottom-16 left-4 z-30" style={{ width: 180, height: 160 }}>
      <button
        onClick={onOpenFullMap}
        className="w-full h-full rounded-xl overflow-hidden border-2 border-white/20
                   shadow-lg shadow-black/30 hover:border-white/40 hover:shadow-xl
                   transition-all duration-200 cursor-pointer group relative"
        aria-label="Open course navigator"
      >
        <MapSVG
          nodes={nodes}
          edges={edges}
          completedNodeIds={completedNodeIds}
          nearbyNodeId={nearbyNodeId}
          avatarPosition={avatarPosition}
          width={180}
          height={130}
          padding={16}
          nodeRadius={5}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm px-2 py-1.5 flex items-center justify-between">
          <span className="text-[10px] text-white/90 font-semibold truncate">
            {mapTitle.length > 18 ? mapTitle.slice(0, 16) + '...' : mapTitle}
          </span>
          <span className="text-[10px] text-emerald-400 font-bold">{progress}%</span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
          <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 px-2 py-1 rounded">
            Course Navigator
          </span>
        </div>
      </button>
    </div>
  );
}

// ── Map Overview Modal (full-screen) ────────────────────

interface MapOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: ContentNode[];
  edges?: Edge[];
  completedNodeIds: string[];
  nearbyNodeId: string | null;
  avatarPosition: Vector3 | null;
  mapTitle: string;
  progress: number;
  onNodeSelect?: (nodeId: string) => void;
}

export function MapOverviewModal({
  isOpen,
  onClose,
  nodes,
  edges,
  completedNodeIds,
  nearbyNodeId,
  avatarPosition,
  mapTitle,
  progress,
  onNodeSelect,
}: MapOverviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  const handleNodeClick = useCallback((nodeId: string) => {
    onNodeSelect?.(nodeId);
  }, [onNodeSelect]);

  const hoveredNodeData = hoveredNode ? nodes.find((n) => n.id === hoveredNode) : null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Map Overview"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal card */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-5xl bg-[#1e293b] rounded-2xl shadow-2xl overflow-hidden border border-white/10 flex"
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            style={{ maxHeight: 'calc(100vh - 80px)' }}
          >
            {/* Left: map visualization */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                      <line x1="9" y1="3" x2="9" y2="18" />
                      <line x1="15" y1="6" x2="15" y2="21" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{mapTitle}</h2>
                    <p className="text-base text-gray-400 mt-0.5">
                      Progress: <span className="text-emerald-400 font-semibold">{progress}%</span>
                      {' '}&middot;{' '}
                      {completedNodeIds.filter(id => nodes.some(n => n.id === id)).length}/{nodes.length} nodes
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Close map overview"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Map area */}
              <div
                className="relative flex-1"
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div
                  className="w-full"
                  style={{ height: 480 }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const svgWidth = 800;
                    const svgHeight = 480;
                    const scaleX = svgWidth / rect.width;
                    const scaleY = svgHeight / rect.height;
                    const mx = (e.clientX - rect.left) * scaleX;
                    const my = (e.clientY - rect.top) * scaleY;

                    let found: string | null = null;
                    const pad = 36;
                    const rangeX = Math.max(1, ...nodes.map(n => n.position[0])) - Math.min(...nodes.map(n => n.position[0])) || 1;
                    const rangeZ = Math.max(1, ...nodes.map(n => n.position[2])) - Math.min(...nodes.map(n => n.position[2])) || 1;
                    const minNX = Math.min(...nodes.map(n => n.position[0]));
                    const minNZ = Math.min(...nodes.map(n => n.position[2]));

                    for (const n of nodes) {
                      const nx = pad + ((n.position[0] - minNX) / rangeX) * (svgWidth - pad * 2);
                      const ny = pad + ((n.position[2] - minNZ) / rangeZ) * (svgHeight - pad * 2);
                      const d = Math.sqrt((mx - nx) ** 2 + (my - ny) ** 2);
                      if (d < 22) { found = n.id; break; }
                    }
                    setHoveredNode(found);
                  }}
                >
                  <MapSVG
                    nodes={nodes}
                    edges={edges}
                    completedNodeIds={completedNodeIds}
                    nearbyNodeId={nearbyNodeId}
                    avatarPosition={avatarPosition}
                    width={800}
                    height={480}
                    padding={36}
                    nodeRadius={12}
                    showLabels
                    interactive
                    onNodeClick={handleNodeClick}
                  />
                </div>

                {/* Tooltip on hover */}
                {hoveredNodeData && (
                  <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-3 pointer-events-none border border-white/10">
                    <div className="text-white font-semibold text-base">{hoveredNodeData.title}</div>
                    <div className="text-gray-400 text-sm mt-1">{hoveredNodeData.type} &middot; +{hoveredNodeData.xpReward} XP</div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: course outline sidebar */}
            <div className="w-[300px] border-l border-white/10 flex flex-col bg-[#0f172a]/50 shrink-0">
              <div className="px-5 py-4 border-b border-white/8">
                <h3 className="text-base font-bold text-white">Course Outline</h3>
                <p className="text-sm text-gray-500 mt-1">Click any available item to open</p>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
                <CourseNavigator
                  nodes={nodes}
                  completedNodeIds={completedNodeIds}
                  nearbyNodeId={nearbyNodeId}
                  onNodeClick={handleNodeClick}
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

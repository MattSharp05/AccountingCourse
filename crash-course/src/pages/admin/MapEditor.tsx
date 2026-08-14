import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  ConnectionMode,
  MarkerType,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';

import { ArrowLeft, Hammer, Flag, Trash2, X, ArrowLeftRight, Lock, Link2, GripVertical } from 'lucide-react';
import { useMap, useUpdateMap, useChaptersForMap } from '../../hooks';
import { useCheckpointsForMap } from '../../hooks/useCheckpoints';
import { nodeTypes } from '../../components/admin/canvas/ContentNode';
import { edgeTypes } from '../../components/admin/canvas/PrerequisiteEdge';
import { EditorSidebar } from '../../components/admin/sidebar/EditorSidebar';
import { BrandButton } from '../../components/ui';
import { buildMapConfig, validateMapConfig, SECTION_COLORS } from '../../utils/buildMap';
import type { ContentNodeData } from '../../types/admin';

// Arrowheads make edge direction obvious — the arrow points from the
// prerequisite toward the checkpoint it unlocks. Reversed drags were a
// major source of "this checkpoint never unlocks" reports.
const PREREQ_MARKER = { type: MarkerType.ArrowClosed, color: '#f59e0b', width: 16, height: 16 };
const PATH_MARKER = { type: MarkerType.ArrowClosed, color: '#9ca3af', width: 14, height: 14 };

// ── Wrapper with ReactFlowProvider ────────────────────────

export function MapEditor() {
  return (
    <ReactFlowProvider>
      <MapEditorInner />
    </ReactFlowProvider>
  );
}

// ── Main editor component ─────────────────────────────────

function MapEditorInner() {
  const { mapId } = useParams<{ mapId: string }>();
  const navigate = useNavigate();
  const reactFlowInstance = useReactFlow();

  // React Query hooks
  const { data: map } = useMap(mapId!);
  // Destructure mutate so we get a stable function reference. The mutation
  // object itself is recreated each render, which would loop any effect that
  // depends on it.
  const { mutate: updateMap } = useUpdateMap();
  const { data: chapters = [] } = useChaptersForMap(mapId!);
  const { data: checkpoints = [] } = useCheckpointsForMap(mapId!);

  // ── React Flow state ──────────────────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ContentNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Sync canvas data from DB into React Flow state on initial load
  const initialLoadRef = useRef(false);
  useEffect(() => {
    if (map && !initialLoadRef.current) {
      initialLoadRef.current = true;
      if (map.canvasData?.nodes) {
        // Enrich nodes with section colors from chapter order
        const sortedCh = [...chapters].sort((a, b) => a.order - b.order);
        const chapterColorMap = new Map<string, string>();
        sortedCh.forEach((ch, i) => {
          chapterColorMap.set(ch.id, SECTION_COLORS[i % SECTION_COLORS.length]);
        });

        const enriched = map.canvasData.nodes.map((node) => {
          const cp = checkpoints.find((c) => c.id === node.data.checkpointId);
          const sectionColor = cp ? chapterColorMap.get(cp.chapterId) : undefined;
          const chapter = cp ? sortedCh.find((ch) => ch.id === cp.chapterId) : undefined;
          // Sync card labels with the current checkpoint/chapter titles — the
          // copies stored in canvas_data go stale after a rename.
          return {
            ...node,
            data: {
              ...node.data,
              sectionColor,
              title: cp?.title ?? node.data.title,
              chapterTitle: chapter?.title ?? node.data.chapterTitle,
            },
          };
        });
        setNodes(enriched);
      }
      if (map.canvasData?.edges) {
        // Ensure all edges have a type (older edges may lack one) and a
        // direction arrowhead (older edges predate markers)
        setEdges(map.canvasData.edges.map((e) => {
          const type = e.type || 'prerequisite';
          return { ...e, type, markerEnd: type === 'prerequisite' ? PREREQ_MARKER : PATH_MARKER };
        }));
      }
    }
  }, [map, chapters, checkpoints, setNodes, setEdges]);

  // ── Title editing ─────────────────────────────────────
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(map?.title ?? '');
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const commitTitle = useCallback(() => {
    if (mapId && titleDraft.trim()) {
      updateMap({ id: mapId!, title: titleDraft.trim() });
    }
    setIsEditingTitle(false);
  }, [mapId, titleDraft, updateMap]);

  // ── Auto-save (debounced) ───────────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Track whether map needs building (canvas changed since last build)
  const [needsBuild, setNeedsBuild] = useState(false);

  useEffect(() => {
    if (!mapId || !initialLoadRef.current) return;

    setNeedsBuild(true);
    // Canvas changed since the last build — those warnings no longer
    // describe the current state, so drop them instead of confusing the
    // professor with stale messages (e.g. "no start set" after they set one).
    setBuildWarnings([]);

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      const viewport = reactFlowInstance.getViewport();
      console.log('[MapEditor] Auto-saving canvas:', { nodeCount: nodesRef.current.length, edgeCount: edgesRef.current.length });
      updateMap({
        id: mapId!,
        canvasData: { nodes: nodesRef.current, edges: edgesRef.current, viewport },
      });
    }, 800);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [nodes, edges, mapId, reactFlowInstance, updateMap]);

  // ── Navigation blocker: warn if leaving without building ──
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      needsBuild && currentLocation.pathname !== nextLocation.pathname
  );

  // Also handle browser close / refresh
  useEffect(() => {
    if (!needsBuild) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [needsBuild]);

  // ── Connection handling ───────────────────────────────
  // Track which node the user started dragging from so we always preserve
  // their intended direction (React Flow swaps source/target when the user
  // starts from a target-type handle).
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source === connection.target) return;

      const duplicate = edges.some(
        (e) => e.source === connection.source && e.target === connection.target
      );
      if (duplicate) return;

      console.log('[MapEditor] New edge:', connection.source, `(${connection.sourceHandle})`, '→', connection.target, `(${connection.targetHandle})`);
      setEdges((eds) =>
        addEdge({ ...connection, type: 'prerequisite', markerEnd: PREREQ_MARKER }, eds)
      );
    },
    [edges, setEdges]
  );

  // ── Drop handling (from sidebar) ──────────────────────
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const dataStr = event.dataTransfer.getData('application/json');
      if (!dataStr) return;

      try {
        const dropData = JSON.parse(dataStr);
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const chapter = chapters.find((c) => c.id === dropData.chapterId);

        // Resolve section color from chapter order
        const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
        const chapterIdx = chapter ? sortedChapters.findIndex((c) => c.id === chapter.id) : -1;
        const sectionColor = chapterIdx >= 0 ? SECTION_COLORS[chapterIdx % SECTION_COLORS.length] : undefined;

        // Auto-set as start if this is the first node on the canvas
        const isFirstNode = nodesRef.current.length === 0;

        const newNode: Node<ContentNodeData> = {
          id: `node-${dropData.checkpointId}`,
          type: 'content',
          position,
          data: {
            checkpointId: dropData.checkpointId,
            title: dropData.title,
            chapterTitle: chapter?.title,
            sectionColor,
            isStart: isFirstNode ? true : undefined,
          },
        };

        setNodes((nds) => [...nds, newNode]);
      } catch (err) {
        console.error('Failed to parse drop data:', err);
      }
    },
    [reactFlowInstance, chapters, setNodes]
  );

  // ── Context menu (right-click on node or edge) ───────
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target:
      | { kind: 'node'; nodeId: string; isStart: boolean }
      | { kind: 'edge'; edgeId: string; edgeType: string };
  } | null>(null);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node<ContentNodeData>) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        target: { kind: 'node', nodeId: node.id, isStart: !!node.data.isStart },
      });
    },
    []
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        target: { kind: 'edge', edgeId: edge.id, edgeType: edge.type || 'prerequisite' },
      });
    },
    []
  );

  useEffect(() => {
    const close = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', close);
      return () => window.removeEventListener('click', close);
    }
  }, [contextMenu]);

  const handleSetStart = useCallback(
    (nodeId: string) => {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: {
            ...n.data,
            isStart: n.id === nodeId ? true : false,
          },
        }))
      );
      setContextMenu(null);
    },
    [setNodes]
  );

  const handleClearStart = useCallback(
    (nodeId: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, isStart: false } }
            : n
        )
      );
      setContextMenu(null);
    },
    [setNodes]
  );

  // Flip an edge's direction (swap source ↔ target)
  const handleFlipEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeId
            ? { ...e, source: e.target, target: e.source, sourceHandle: e.targetHandle, targetHandle: e.sourceHandle }
            : e
        )
      );
      setContextMenu(null);
    },
    [setEdges]
  );

  const handleToggleEdgeType = useCallback(
    (edgeId: string, currentType: string) => {
      const newType = currentType === 'prerequisite' ? 'path' : 'prerequisite';
      setEdges((eds) =>
        eds.map((e) => (e.id === edgeId
          ? { ...e, type: newType, markerEnd: newType === 'prerequisite' ? PREREQ_MARKER : PATH_MARKER }
          : e))
      );
      setContextMenu(null);
    },
    [setEdges]
  );

  // Remove node from canvas (keeps the content item in sidebar)
  const handleRemoveFromCanvas = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setContextMenu(null);
    },
    [setNodes, setEdges]
  );

  // Remove by checkpointId (called from sidebar when deleting a checkpoint)
  const handleRemoveNodeByCheckpointId = useCallback(
    (checkpointId: string) => {
      const rfNodeId = `node-${checkpointId}`;
      setNodes((nds) => nds.filter((n) => n.id !== rfNodeId));
      setEdges((eds) => eds.filter((e) => e.source !== rfNodeId && e.target !== rfNodeId));
    },
    [setNodes, setEdges]
  );

  // Rename by checkpointId (called from sidebar when renaming a checkpoint)
  const handleRenameCheckpoint = useCallback(
    (checkpointId: string, title: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.data.checkpointId === checkpointId
            ? { ...n, data: { ...n.data, title } }
            : n
        )
      );
    },
    [setNodes]
  );

  // Delete an edge
  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      setContextMenu(null);
    },
    [setEdges]
  );

  // Listen for the custom DOM event dispatched by PrerequisiteEdge / PathEdge X buttons
  useEffect(() => {
    const handler = (e: Event) => {
      const edgeId = (e as CustomEvent).detail?.edgeId;
      if (edgeId) setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
    };
    document.addEventListener('prerequisite-edge-delete', handler);
    return () => document.removeEventListener('prerequisite-edge-delete', handler);
  }, [setEdges]);

  // ── Build Map ─────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);
  const [buildWarnings, setBuildWarnings] = useState<string[]>([]);

  const handleBuildMap = useCallback(async () => {
    if (!mapId) return;

    try {
      console.log('[MapEditor] Building map config...');

      const result = buildMapConfig(nodes, edges, checkpoints, chapters);
      updateMap({ id: mapId!, mapConfig: result });

      const warnings = validateMapConfig(result);
      // Cards from the pre-checkpoint editor aren't linked to a checkpoint —
      // the build skips them, so anything set on them (like Start) is lost.
      const legacyCards = nodes.filter((n) => !n.data.checkpointId);
      for (const n of legacyCards) {
        warnings.unshift(
          `"${n.data.title}" is an old-style card not linked to a checkpoint — it was left out of the build. Remove it from the canvas and drag the checkpoint in again from the sidebar${n.data.isStart ? ', then re-set it as the start' : ''}.`,
        );
      }
      setBuildWarnings(warnings);

      setNeedsBuild(false);
      setToast(warnings.length > 0 ? 'Map built — with warnings' : 'Map built successfully!');
      setTimeout(() => setToast(null), 3000);
      console.log('[MapEditor] Build complete:', { nodeCount: result.nodes.length, warnings });
    } catch (err) {
      console.error('[MapEditor] Build failed:', err);
      setToast('Build failed. Check console for details.');
      setTimeout(() => setToast(null), 4000);
    }
  }, [mapId, nodes, edges, checkpoints, chapters, updateMap]);

  // ── Guard: map not found ──────────────────────────────
  if (!map) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-brand-dark text-white">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-3">Not found</p>
          <h2 className="text-xl font-bold text-white mb-2">Map not found</h2>
          <p className="text-[#9ca3af] mb-6">The map you are looking for does not exist.</p>
          <BrandButton variant="outline" onClick={() => navigate(-1)}>
            Go back
          </BrandButton>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-brand-dark text-white">
      {/* ── Top Bar ─────────────────────────────────────── */}
      <div className="h-16 bg-brand-dark-lighter border-b border-white/5 flex items-center justify-between px-5 shrink-0">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[#9ca3af] hover:text-white transition-colors text-sm font-medium px-3 py-1.5 rounded-full hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="w-px h-6 bg-white/10" />

          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand-accent font-semibold leading-none mb-1">
              Map editor
            </p>
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitle();
                  if (e.key === 'Escape') {
                    setTitleDraft(map.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="text-base font-semibold text-white bg-white/5 border border-brand-accent/50 rounded-md outline-none px-2 py-0.5"
              />
            ) : (
              <button
                onClick={() => {
                  setTitleDraft(map.title);
                  setIsEditingTitle(true);
                }}
                className="text-base font-semibold text-white hover:text-brand-accent transition-colors cursor-text"
                title="Click to edit title"
              >
                {map.title}
              </button>
            )}
          </div>
        </div>

        {/* Right: Build button */}
        <div className="flex items-center gap-4">
          {needsBuild && (
            <span className="hidden md:flex items-center gap-1.5 text-xs text-brand-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
              Unbuilt changes
            </span>
          )}
          <BrandButton
            onClick={handleBuildMap}
            variant={needsBuild ? 'primary' : 'outline'}
            size="sm"
            leftIcon={<Hammer className="w-3.5 h-3.5" />}
          >
            Build map
          </BrandButton>
        </div>
      </div>

      {/* ── Build warnings ──────────────────────────────── */}
      {buildWarnings.length > 0 && (
        <div className="shrink-0 mx-5 mt-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <p className="font-semibold uppercase tracking-[0.15em] text-amber-300">Unlock warnings</p>
              {buildWarnings.map((w, i) => (
                <p key={i} className="leading-relaxed">• {w}</p>
              ))}
            </div>
            <button
              onClick={() => setBuildWarnings([])}
              className="shrink-0 text-amber-300/70 hover:text-amber-200"
              aria-label="Dismiss warnings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Main area ───────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeContextMenu={onEdgeContextMenu}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: 'prerequisite' }}
            connectionMode={ConnectionMode.Loose}
            snapToGrid
            snapGrid={[15, 15]}
            fitView
            selectNodesOnDrag
            multiSelectionKeyCode="Shift"
            defaultViewport={map.canvasData?.viewport ?? { x: 0, y: 0, zoom: 1 }}
          >
            <Background gap={15} size={1} />
            <Controls position="bottom-left" />
            <MiniMap
              position="bottom-left"
              style={{ marginBottom: 50 }}
              zoomable
              pannable
            />
          </ReactFlow>

          {/* Context menu */}
          {contextMenu && (
            <div
              className="fixed z-50 bg-brand-dark-card border border-white/10 rounded-xl shadow-2xl shadow-black/60 py-1.5 min-w-[190px] text-sm text-white"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              {contextMenu.target.kind === 'node' && (
                <>
                  {contextMenu.target.isStart ? (
                    <button
                      onClick={() => handleClearStart(contextMenu.target.kind === 'node' ? contextMenu.target.nodeId : '')}
                      className="w-full px-4 py-2 text-left text-[#9ca3af] hover:text-white hover:bg-white/5 flex items-center gap-2.5"
                    >
                      <X className="w-3.5 h-3.5 text-[#6b7280]" />
                      Clear start
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSetStart(contextMenu.target.kind === 'node' ? contextMenu.target.nodeId : '')}
                      className="w-full px-4 py-2 text-left text-[#9ca3af] hover:text-brand-accent hover:bg-brand-accent/10 flex items-center gap-2.5"
                    >
                      <Flag className="w-3.5 h-3.5 text-brand-accent" />
                      Set as start
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveFromCanvas(contextMenu.target.kind === 'node' ? contextMenu.target.nodeId : '')}
                    className="w-full px-4 py-2 text-left text-[#9ca3af] hover:text-white hover:bg-white/5 flex items-center gap-2.5"
                  >
                    <GripVertical className="w-3.5 h-3.5 text-[#6b7280]" />
                    Remove from canvas
                  </button>
                </>
              )}
              {contextMenu.target.kind === 'edge' && (
                <>
                  <button
                    onClick={() => {
                      if (contextMenu.target.kind === 'edge') {
                        handleFlipEdge(contextMenu.target.edgeId);
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-[#9ca3af] hover:text-white hover:bg-white/5 flex items-center gap-2.5"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-[#6b7280]" />
                    Flip direction
                  </button>
                  <button
                    onClick={() => {
                      if (contextMenu.target.kind === 'edge') {
                        handleToggleEdgeType(contextMenu.target.edgeId, contextMenu.target.edgeType);
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-[#9ca3af] hover:text-white hover:bg-white/5 flex items-center gap-2.5"
                  >
                    {contextMenu.target.edgeType === 'prerequisite' ? (
                      <>
                        <Link2 className="w-3.5 h-3.5 text-[#6b7280]" />
                        Change to path
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-brand-accent" />
                        Change to pre-req
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (contextMenu.target.kind === 'edge') {
                        handleDeleteEdge(contextMenu.target.edgeId);
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete connection
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <EditorSidebar
          mapId={mapId!}
          placedCheckpointIds={nodes.map((n) => n.data.checkpointId)}
          onRemoveNode={handleRemoveNodeByCheckpointId}
          onRenameCheckpoint={handleRenameCheckpoint}
        />
      </div>

      {/* ── Toast notification ──────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-brand-dark-card border border-white/10 text-white px-5 py-3 rounded-full shadow-2xl shadow-black/60 text-sm font-medium z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Leave-without-building confirmation modal ──── */}
      <AnimatePresence>
        {blocker.state === 'blocked' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-dark-card border border-white/10 rounded-2xl shadow-2xl shadow-black/60 w-[420px] p-7 text-white"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-2">
                Unsaved
              </p>
              <h3 className="text-lg font-bold text-white mb-2 tracking-tight">
                Unbuilt changes
              </h3>
              <p className="text-sm text-[#9ca3af] mb-6 leading-relaxed">
                You have canvas changes that haven&apos;t been built yet. Would you like to build the map before leaving?
              </p>
              <div className="flex items-center gap-2">
                <BrandButton
                  variant="outline"
                  size="sm"
                  onClick={() => blocker.proceed()}
                  className="flex-1"
                >
                  Leave anyway
                </BrandButton>
                <BrandButton
                  variant="primary"
                  size="sm"
                  onClick={async () => {
                    await handleBuildMap();
                    blocker.proceed();
                  }}
                  className="flex-1"
                >
                  Build &amp; leave
                </BrandButton>
              </div>
              <button
                onClick={() => blocker.reset()}
                className="w-full mt-3 py-2 text-xs uppercase tracking-[0.2em] text-[#6b7280] hover:text-white transition-colors text-center"
              >
                Stay on page
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

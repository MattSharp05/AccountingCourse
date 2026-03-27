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
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';

import { useMap, useUpdateMap, useChaptersForMap, useContentItemsForMap } from '../../hooks';
import { nodeTypes } from '../../components/admin/canvas/ContentNode';
import { edgeTypes } from '../../components/admin/canvas/PrerequisiteEdge';
import { EditorSidebar } from '../../components/admin/sidebar/EditorSidebar';
import { buildMapConfig, SECTION_COLORS } from '../../utils/buildMap';
import type { ContentNodeData } from '../../types/admin';

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
  const updateMapMut = useUpdateMap();
  const { data: chapters = [] } = useChaptersForMap(mapId!);
  const { data: contentItems = [] } = useContentItemsForMap(mapId!);

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
          const item = contentItems.find((ci) => ci.id === node.data.contentItemId);
          const sectionColor = item ? chapterColorMap.get(item.chapterId) : undefined;
          return { ...node, data: { ...node.data, sectionColor } };
        });
        setNodes(enriched);
      }
      if (map.canvasData?.edges) {
        // Ensure all edges have a type (older edges may lack one)
        setEdges(map.canvasData.edges.map((e) => ({ ...e, type: e.type || 'prerequisite' })));
      }
    }
  }, [map, chapters, contentItems, setNodes, setEdges]);

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
      updateMapMut.mutate({ id: mapId!, title: titleDraft.trim() });
    }
    setIsEditingTitle(false);
  }, [mapId, titleDraft, updateMapMut]);

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

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      const viewport = reactFlowInstance.getViewport();
      console.log('[MapEditor] Auto-saving canvas:', { nodeCount: nodesRef.current.length, edgeCount: edgesRef.current.length });
      updateMapMut.mutate({
        id: mapId!,
        canvasData: { nodes: nodesRef.current, edges: edgesRef.current, viewport },
      });
    }, 800);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [nodes, edges, mapId, reactFlowInstance, updateMapMut]);

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
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source === connection.target) return;

      const duplicate = edges.some(
        (e) => e.source === connection.source && e.target === connection.target
      );
      if (duplicate) return;

      setEdges((eds) =>
        addEdge({ ...connection, type: 'prerequisite' }, eds)
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
        const contentItem = JSON.parse(dataStr);
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const chapter = chapters.find((c) => c.id === contentItem.chapterId);

        // Resolve section color from chapter order
        const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
        const chapterIdx = chapter ? sortedChapters.findIndex((c) => c.id === chapter.id) : -1;
        const sectionColor = chapterIdx >= 0 ? SECTION_COLORS[chapterIdx % SECTION_COLORS.length] : undefined;

        // Auto-set as start if this is the first node on the canvas
        const isFirstNode = nodesRef.current.length === 0;

        const newNode: Node<ContentNodeData> = {
          id: `node-${contentItem.contentItemId}`,
          type: 'content',
          position,
          data: {
            contentItemId: contentItem.contentItemId,
            title: contentItem.title,
            type: contentItem.type,
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

  const handleToggleEdgeType = useCallback(
    (edgeId: string, currentType: string) => {
      const newType = currentType === 'prerequisite' ? 'path' : 'prerequisite';
      setEdges((eds) =>
        eds.map((e) => (e.id === edgeId ? { ...e, type: newType } : e))
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

  // Remove by contentItemId (called from sidebar when deleting a content item)
  const handleRemoveNodeByContentItemId = useCallback(
    (contentItemId: string) => {
      const rfNodeId = `node-${contentItemId}`;
      setNodes((nds) => nds.filter((n) => n.id !== rfNodeId));
      setEdges((eds) => eds.filter((e) => e.source !== rfNodeId && e.target !== rfNodeId));
    },
    [setNodes, setEdges]
  );

  // Delete an edge
  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      setContextMenu(null);
    },
    [setEdges]
  );

  // ── Build Map ─────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);

  const handleBuildMap = useCallback(async () => {
    if (!mapId) return;

    try {
      console.log('[MapEditor] Building map config...');
      const mapContentItems = contentItems;

      const result = buildMapConfig(nodes, edges, mapContentItems, chapters);
      updateMapMut.mutate({ id: mapId!, mapConfig: result });

      setNeedsBuild(false);
      setToast('Map built successfully!');
      setTimeout(() => setToast(null), 3000);
      console.log('[MapEditor] Build complete:', { nodeCount: result.nodes.length });
    } catch (err) {
      console.error('[MapEditor] Build failed:', err);
      setToast('Build failed. Check console for details.');
      setTimeout(() => setToast(null), 4000);
    }
  }, [mapId, nodes, edges, contentItems, chapters, updateMapMut]);

  // ── Guard: map not found ──────────────────────────────
  if (!map) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Map not found</h2>
          <p className="text-gray-500 mb-4">
            The map you are looking for does not exist.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      {/* ── Top Bar ─────────────────────────────────────── */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back
          </button>

          <div className="w-px h-6 bg-gray-200" />

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
              className="text-lg font-semibold text-gray-900 bg-transparent border-b-2 border-indigo-500 outline-none px-1 py-0.5"
            />
          ) : (
            <button
              onClick={() => {
                setTitleDraft(map.title);
                setIsEditingTitle(true);
              }}
              className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition-colors cursor-text"
              title="Click to edit title"
            >
              {map.title}
            </button>
          )}
        </div>

        {/* Right: Build button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBuildMap}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
              needsBuild
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
            Build Map
          </button>
        </div>
      </div>

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
              className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[180px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              {contextMenu.target.kind === 'node' && (
                <>
                  {contextMenu.target.isStart ? (
                    <button
                      onClick={() => handleClearStart(contextMenu.target.kind === 'node' ? contextMenu.target.nodeId : '')}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                    >
                      <span className="text-gray-400">✕</span>
                      Clear Start
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSetStart(contextMenu.target.kind === 'node' ? contextMenu.target.nodeId : '')}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-amber-50 flex items-center gap-2"
                    >
                      <span className="text-amber-500">&#9873;</span>
                      Set as Start
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveFromCanvas(contextMenu.target.kind === 'node' ? contextMenu.target.nodeId : '')}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878l4.242 4.242M21 21l-4.879-4.879" />
                    </svg>
                    Remove from canvas
                  </button>
                </>
              )}
              {contextMenu.target.kind === 'edge' && (
                <>
                  <button
                    onClick={() => {
                      if (contextMenu.target.kind === 'edge') {
                        handleToggleEdgeType(contextMenu.target.edgeId, contextMenu.target.edgeType);
                      }
                    }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                  >
                    {contextMenu.target.edgeType === 'prerequisite' ? (
                      <>
                        <span className="text-gray-400">&#8674;</span>
                        Change to Path
                      </>
                    ) : (
                      <>
                        <span className="text-amber-500">&#128274;</span>
                        Change to Pre-req
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (contextMenu.target.kind === 'edge') {
                        handleDeleteEdge(contextMenu.target.edgeId);
                      }
                    }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
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
          placedItemIds={nodes.map((n) => n.data.contentItemId)}
          onRemoveNode={handleRemoveNodeByContentItemId}
        />
      </div>

      {/* ── Toast notification ──────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg text-sm font-medium z-50"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-[380px] p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Unbuilt changes
              </h3>
              <p className="text-sm text-gray-600 mb-5">
                You have canvas changes that haven't been built yet. Would you like to build the map before leaving?
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => blocker.proceed()}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Leave without building
                </button>
                <button
                  onClick={async () => {
                    await handleBuildMap();
                    blocker.proceed();
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  Build & leave
                </button>
              </div>
              <button
                onClick={() => blocker.reset()}
                className="w-full mt-2 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors text-center"
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

import { Suspense, useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { KeyboardControls, useKeyboardControls } from '@react-three/drei';
import { EffectComposer, Bloom, N8AO, Vignette, BrightnessContrast, ToneMapping } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Canvas3DErrorBoundary,
  GameLoading,
  Button,
  BrandButton,
  Modal,
  Loading,
} from '../components/ui';
import {
  MapEnvironment,
  ContentNode3D,
  WorldDecorator,
  Avatar,
  FollowCamera,
  InteractionPrompt,
} from '../components/game';
import { MiniMap, MapOverviewModal } from '../components/game/MapOverview';
import type { TerrainData } from '../components/game/worldDecorator/WorldDecorator';
import { VideoPlayer, ReadingPanel, PdfViewer } from '../components/content';
import { QuizBattle } from '../components/quiz';
import type { BattleQuestion } from '../components/quiz';
import { ChatWidget } from '../components/chat';
import { useChatStore } from '../stores/chatStore';
import { useGameStore, useCompletedNodes, useIsContentOpen, useCurrentNode, useAvatarPosition } from '../stores';
import { usePublicMap, usePublicCheckpointItems } from '../hooks';
import type { ContentNode } from '../types/game';
import type { ContentItem } from '../types/admin';
import { normalizeQuizData } from '../types/admin';
import { mapConfigToGameNodes, isNodeUnlocked, getMapProgress } from '../utils/mapConfigToGameNodes';
import { computeWorldBounds } from '../components/game/worldDecorator/zonePlanner';

// Keyboard control mapping for avatar
const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'leftward', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'rightward', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'interact', keys: ['KeyE'] },
];

export function GameMap() {
  const navigate = useNavigate();
  const { mapId: mapIdParam } = useParams<{ mapId: string }>();
  // The route is `/game/map/:mapId`, so React Router guarantees this is
  // present. The fallback empty string would surface a clean error in the
  // load branch below rather than crashing the hooks.
  const mapId = mapIdParam ?? '';

  const { loadProgress, setCurrentNode, openContent, closeContent } = useGameStore();
  const completedNodes = useCompletedNodes(mapId);
  const isContentOpen = useIsContentOpen();
  const currentNodeId = useCurrentNode();

  // Fetch map from Supabase.
  const { data: mapData, isLoading: mapLoading, error: mapError } = usePublicMap(mapId);

  // Convert map config nodes to game nodes
  const nodes: ContentNode[] = useMemo(() => {
    if (mapData?.mapConfig) {
      return mapConfigToGameNodes(mapData.mapConfig.nodes);
    }
    return [];
  }, [mapData]);

  const mapTitle = mapData?.title || 'Loading...';

  // Track which node the player is near
  const [nearbyNodeId, setNearbyNodeId] = useState<string | null>(null);

  // Mini-map / map overview modal
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const avatarPos = useAvatarPosition();

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Update chat store with map context
  useEffect(() => {
    if (mapData) {
      useChatStore.getState().setContext({
        mapId: mapId,
        mapTitle: mapData.title,
      });
    }
  }, [mapId, mapData]);

  const startNodeId = mapData?.mapConfig?.startNodeId;

  // ── Debug: dump prereq graph at load time ─────────────
  // Confirms that the prereqs persisted in `map_config` actually look like
  // the checkpoint UUIDs we expect (and not stale canvas-node IDs from an
  // older buildMap run, etc).
  useEffect(() => {
    if (!nodes.length) return;
    console.log('[GameMap] Loaded', nodes.length, 'nodes. startNodeId:', JSON.stringify(startNodeId));
    console.table(
      nodes.map((n) => ({
        id: n.id,
        title: n.title,
        prereqs: n.prerequisites.length === 0 ? '(none)' : n.prerequisites.join(', '),
      })),
    );
  }, [nodes, startNodeId]);

  // ── Debug: per-node unlock summary on every completedNodes change ──
  // Lets you see exactly which nodes flipped after a completion. If a node
  // you expected to unlock is still LOCKED here, the issue is data (the
  // prereq IDs in the table above don't match the IDs in completedNodes).
  // If they DO match but the 3D node still looks locked, the issue is
  // a missed re-render — check that ContentNode3D is receiving fresh props.
  useEffect(() => {
    if (!nodes.length) return;
    console.log('[GameMap] completedNodes changed →', JSON.stringify(completedNodes));
    const summary = nodes.map((n) => {
      const isStart = startNodeId && n.id === startNodeId;
      const unlocked = isNodeUnlocked(n.id, nodes, completedNodes, startNodeId);
      const completedFlag = completedNodes.includes(n.id);
      const missingPrereqs = n.prerequisites.filter((p) => !completedNodes.includes(p));
      return {
        id: n.id,
        title: n.title,
        unlocked,
        completed: completedFlag,
        isStart: !!isStart,
        prereqs: n.prerequisites.length === 0 ? '(none)' : n.prerequisites.join(', '),
        missingPrereqs: missingPrereqs.length === 0 ? '' : missingPrereqs.join(', '),
      };
    });
    console.table(summary);
    // Warn loudly for nodes that should unlock but don't
    for (const row of summary) {
      if (row.missingPrereqs) {
        console.warn(`[GameMap] "${row.title}" LOCKED — missing prereqs: ${row.missingPrereqs} (has prereqs: ${row.prereqs})`);
      }
    }
  }, [completedNodes, nodes, startNodeId]);

  // Update chat store when student opens a content node
  useEffect(() => {
    if (currentNodeId) {
      const node = nodes.find((n) => n.id === currentNodeId);
      if (node) {
        useChatStore.getState().setContext({
          checkpointId: node.id,
          checkpointTitle: node.title,
        });
      }
    }
  }, [currentNodeId, nodes]);

  // NOTE: do not log inside this callback. MapScene subscribes to
  // avatarPosition (which updates every frame), so checkUnlocked is called
  // 60×/sec per node. The completedNodes-change effect above already gives
  // us a per-node unlock summary on every real state change, which is the
  // diagnostic we actually want.
  const checkUnlocked = useCallback(
    (nodeId: string) => isNodeUnlocked(nodeId, nodes, completedNodes, startNodeId),
    [nodes, completedNodes, startNodeId],
  );

  const handleNodeInteract = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node && checkUnlocked(nodeId)) {
      setCurrentNode(nodeId);
      openContent();
    }
  }, [nodes, checkUnlocked, setCurrentNode, openContent]);

  const handleNodeProximity = useCallback((nodeId: string | null) => {
    setNearbyNodeId(nodeId);
  }, []);

  const handleProximityInteract = useCallback(() => {
    if (nearbyNodeId) {
      handleNodeInteract(nearbyNodeId);
    }
  }, [nearbyNodeId, handleNodeInteract]);

  const currentNode = nodes.find((n) => n.id === currentNodeId);
  const nearbyNode = nodes.find((n) => n.id === nearbyNodeId);
  const progress = getMapProgress(nodes, completedNodes);

  // Get nearby node title for prompt (only if unlocked)
  const nearbyNodeTitle = nearbyNode && checkUnlocked(nearbyNode.id)
    ? nearbyNode.title
    : null;

  // Loading state
  if (mapLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-brand-dark">
        <GameLoading message="Loading map..." />
      </div>
    );
  }

  // Error state
  if (mapError || !mapData?.mapConfig) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-cinematic">
        <div className="text-center max-w-md px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-3">
            {mapError ? 'Error' : 'Coming soon'}
          </p>
          <h2 className="font-display text-3xl font-bold text-white mb-3 tracking-tight">
            {mapError ? 'Failed to load map' : 'Map not built yet'}
          </h2>
          <p className="text-[#9ca3af] mb-8 leading-relaxed">
            {mapError
              ? 'This map may not exist or is not published.'
              : "The professor hasn't built this map yet."}
          </p>
          <BrandButton onClick={() => navigate('/home')} variant="primary" glow>
            Back to courses
          </BrandButton>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative bg-[#1e293b]">
      {/* 3D Canvas */}
      <Canvas3DErrorBoundary>
        <KeyboardControls map={keyboardMap}>
          <Canvas
            shadows
            camera={{ position: [0, 15, 20], fov: 50 }}
            className="w-full h-full"
          >
            <Suspense fallback={null}>
              <Physics gravity={[0, -20, 0]}>
                <MapScene
                  nodes={nodes}
                  edges={mapData.mapConfig.edges}
                  startNodeId={startNodeId}
                  onNodeInteract={handleNodeInteract}
                  onNodeProximity={handleNodeProximity}
                  completedNodes={completedNodes}
                  checkUnlocked={checkUnlocked}
                />
                {/* Keyboard interaction listener inside Canvas */}
                <InteractionListener
                  nearbyNodeId={nearbyNodeId}
                  checkUnlocked={checkUnlocked}
                  onInteract={handleNodeInteract}
                />
              </Physics>

              {/* Post-processing: Fortnite-style vibrant look */}
              <EffectComposer multisampling={4}>
                <N8AO
                  aoRadius={0.8}
                  intensity={1.2}
                  distanceFalloff={0.8}
                />
                <Bloom
                  luminanceThreshold={0.7}
                  luminanceSmoothing={0.3}
                  intensity={0.5}
                  mipmapBlur
                />
                <BrightnessContrast
                  brightness={0.02}
                  contrast={0.1}
                />
                <Vignette
                  offset={0.35}
                  darkness={0.45}
                  blendFunction={BlendFunction.NORMAL}
                />
                <ToneMapping
                  blendFunction={BlendFunction.NORMAL}
                  adaptive={true}
                />
              </EffectComposer>
            </Suspense>
          </Canvas>
        </KeyboardControls>
      </Canvas3DErrorBoundary>

      {/* Loading overlay for canvas */}
      <Suspense fallback={<GameLoading message="Loading world..." />}>
        <div />
      </Suspense>

      {/* UI Overlay */}
      <div className="canvas-overlay">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start">
          {/* Back button */}
          <button
            onClick={() => navigate('/home')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-dark/85 border border-white/10 text-white/90 hover:text-white hover:bg-brand-dark/95 backdrop-blur-md text-sm font-medium transition-colors"
          >
            ← Back
          </button>

          <div />
        </div>

        {/* Map title indicator */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-brand-dark-card/90 border border-brand-accent/30 text-white px-5 py-2 rounded-full font-semibold backdrop-blur-md shadow-lg flex items-center gap-3">
            <span className="text-sm tracking-tight">{mapTitle}</span>
            <span className="w-px h-4 bg-white/15" />
            <span className="text-sm text-brand-accent font-bold">{progress}%</span>
          </div>
        </div>

        {/* Bottom controls hint */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-brand-dark/85 border border-white/10 text-white/90 px-4 py-2 rounded-full text-xs backdrop-blur-md flex items-center gap-2">
            <span className="text-[#9ca3af]">Move</span>{' '}
            <kbd className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-semibold">WASD</kbd>
            <span className="text-white/20">·</span>
            <span className="text-[#9ca3af]">Run</span>{' '}
            <kbd className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-semibold">Shift</kbd>
            <span className="text-white/20">·</span>
            <span className="text-[#9ca3af]">Interact</span>{' '}
            <kbd className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-semibold">E</kbd>
          </div>
        </div>

      </div>

      {/* Mini-map overlay (bottom-left) */}
      <MiniMap
        nodes={nodes}
        edges={mapData.mapConfig.edges}
        completedNodeIds={completedNodes}
        nearbyNodeId={nearbyNodeId}
        avatarPosition={avatarPos}
        mapTitle={mapTitle}
        progress={progress}
        onOpenFullMap={() => setMapModalOpen(true)}
      />

      {/* Full map overview modal */}
      <MapOverviewModal
        isOpen={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        nodes={nodes}
        edges={mapData.mapConfig.edges}
        completedNodeIds={completedNodes}
        nearbyNodeId={nearbyNodeId}
        avatarPosition={avatarPos}
        mapTitle={mapTitle}
        progress={progress}
        onNodeSelect={(nodeId) => {
          const node = nodes.find(n => n.id === nodeId);
          if (node) {
            useGameStore.getState().teleportTo(node.position);
          }
          handleNodeInteract(nodeId);
          setMapModalOpen(false);
        }}
      />

      {/* Interaction Prompt */}
      <InteractionPrompt
        nodeTitle={nearbyNodeTitle}
        onInteract={handleProximityInteract}
      />

      {/* Content Modal */}
      <Modal
        isOpen={isContentOpen}
        onClose={closeContent}
        title={currentNode?.title}
        size="lg"
      >
        {currentNode && (
          <DataDrivenContentViewer
            node={currentNode}
            onComplete={() => {
              useGameStore.getState().completeNode(mapId, currentNode.id);
              useGameStore.getState().addXp(currentNode.xpReward);
              closeContent();
            }}
          />
        )}
      </Modal>

      {/* AI Tutor Chat Widget */}
      <ChatWidget />
    </div>
  );
}

// ── Interaction Listener (E key inside Canvas) ──────────

function InteractionListener({
  nearbyNodeId,
  checkUnlocked,
  onInteract,
}: {
  nearbyNodeId: string | null;
  checkUnlocked: (nodeId: string) => boolean;
  onInteract: (nodeId: string) => void;
}) {
  const [, getKeys] = useKeyboardControls();
  const [wasPressed, setWasPressed] = useState(false);

  const { interact } = getKeys() as { interact: boolean };

  useEffect(() => {
    if (interact && !wasPressed && nearbyNodeId) {
      if (checkUnlocked(nearbyNodeId)) {
        onInteract(nearbyNodeId);
      }
      setWasPressed(true);
    } else if (!interact && wasPressed) {
      setWasPressed(false);
    }
  }, [interact, wasPressed, nearbyNodeId, checkUnlocked, onInteract]);

  return null;
}

// ── 3D Scene ────────────────────────────────────────────

interface MapSceneProps {
  nodes: ContentNode[];
  edges?: { source: string; target: string }[];
  startNodeId?: string;
  onNodeInteract: (nodeId: string) => void;
  onNodeProximity: (nodeId: string | null) => void;
  completedNodes: string[];
  checkUnlocked: (nodeId: string) => boolean;
}

function MapScene({ nodes, edges, startNodeId, onNodeInteract, onNodeProximity, completedNodes, checkUnlocked }: MapSceneProps) {
  const avatarPosition = useAvatarPosition();
  const [terrainData, setTerrainData] = useState<TerrainData | null>(null);

  // Stable callback ref to avoid re-triggering WorldDecorator effect
  const terrainCbRef = useRef<(data: TerrainData) => void>((data) => setTerrainData(data));

  // Walkable radius must cover the whole node layout, however large the
  // professor's canvas is — a fixed radius walls off outlying checkpoints
  // and strands the avatar at the start node.
  const walkableRadius = useMemo(() => {
    const bounds = computeWorldBounds(nodes);
    return Math.max(60, bounds.size / 2 + 10);
  }, [nodes]);

  // Start node = explicit startNodeId, or fall back to first node with no prerequisites
  const startNode = useMemo(
    () => (startNodeId ? nodes.find((n) => n.id === startNodeId) : null)
      ?? nodes.find((n) => n.prerequisites.length === 0),
    [nodes, startNodeId],
  );
  const spawnPosition = useMemo<[number, number, number]>(
    () => startNode ? [startNode.position[0], startNode.position[1] + 1.5, startNode.position[2] + 2] : [0, 2, 0],
    [startNode],
  );

  return (
    <>
      {/* Scene fog — soft green haze */}
      <fog attach="fog" args={['#c8dbb6', 30, 80]} />

      <MapEnvironment avatarPosition={avatarPosition} />

      {/* World: terrain + decorations + paths + mountains */}
      <WorldDecorator
        nodes={nodes}
        edges={edges}
        completedNodeIds={completedNodes}
        onTerrainReady={terrainCbRef.current}
      />

      {/* Flat ground collider as a last-resort safety net. Kept BELOW the
          deepest terrain valley (~-2.6) so it never fights the avatar's
          terrain pin — the avatar rides heightFn, not this collider. */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[walkableRadius, 0.1, walkableRadius]} position={[0, -5, 0]} />
      </RigidBody>

      <Boundaries radius={walkableRadius} />

      {nodes.map((node) => (
        <ContentNode3D
          key={node.id}
          node={node}
          isUnlocked={checkUnlocked(node.id)}
          isStart={startNode?.id === node.id}
          onInteract={() => onNodeInteract(node.id)}
          allNodes={nodes}
          edges={edges}
          completedNodeIds={completedNodes}
        />
      ))}

      <Avatar
        nodes={nodes.filter(n => checkUnlocked(n.id))}
        onNodeProximity={onNodeProximity}
        spawnPosition={spawnPosition}
        heightFn={terrainData?.heightFn}
      />

      <FollowCamera />
    </>
  );
}

// ── Boundaries ──────────────────────────────────────────

function Boundaries({ radius }: { radius: number }) {
  // Walkable area half-extent, derived from the actual node layout in
  // MapScene so every checkpoint stays inside the walls no matter how
  // large the professor's canvas is.
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[radius, 5, 0.5]} position={[0, 2.5, -radius]} />
        <CuboidCollider args={[radius, 5, 0.5]} position={[0, 2.5, radius]} />
        <CuboidCollider args={[0.5, 5, radius]} position={[-radius, 2.5, 0]} />
        <CuboidCollider args={[0.5, 5, radius]} position={[radius, 2.5, 0]} />
      </RigidBody>
    </group>
  );
}

// ── Data-Driven Content Viewer (Supabase) ───────────────

// ── Tabbed Checkpoint Viewer ─────────────────────────────
// Fetches all content items for a checkpoint and renders them as tabs.
// All items must be viewed/completed before the checkpoint can be marked done.

const TYPE_LABELS: Record<string, string> = {
  video: 'VID', pdf: 'PDF', text: 'TXT', file: 'FILE', quiz: 'QUIZ',
};

function DataDrivenContentViewer({
  node,
  onComplete,
}: {
  node: ContentNode;
  onComplete: () => void;
}) {
  const { data: items = [], isLoading } = usePublicCheckpointItems(node.id);
  const [activeTab, setActiveTab] = useState(0);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  // Reset state when node changes
  useEffect(() => {
    setActiveTab(0);
    setCompletedItems(new Set());
  }, [node.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading text="Loading content..." />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4 text-center py-8">
        <p className="text-gray-500">No content added to this checkpoint yet.</p>
        <Button onClick={onComplete} variant="secondary">
          Mark Complete →
        </Button>
      </div>
    );
  }

  const allCompleted = items.every((item) => completedItems.has(item.id));
  const activeItem = items[activeTab];

  const markItemComplete = (itemId: string) => {
    setCompletedItems((prev) => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
  };

  // Single-item checkpoints skip tabs
  if (items.length === 1) {
    return (
      <div className="space-y-4">
        <ContentItemRenderer
          item={items[0]}
          onItemComplete={() => {
            markItemComplete(items[0].id);
            onComplete();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 overflow-x-auto">
        {items.map((item, i) => {
          const isActive = i === activeTab;
          const isDone = completedItems.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-[#9ca3af] hover:text-white hover:border-white/15'
              }`}
            >
              <span
                className={`text-[10px] font-bold tracking-wider ${
                  isDone ? 'text-brand-accent' : 'text-[#9ca3af]'
                }`}
              >
                {isDone ? 'DONE' : TYPE_LABELS[item.type] || 'ITEM'}
              </span>
              {item.title}
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      {activeItem && (
        <ContentItemRenderer
          item={activeItem}
          onItemComplete={() => markItemComplete(activeItem.id)}
        />
      )}

      {/* Progress + Complete button */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <span className="text-sm text-[#9ca3af]">
          {completedItems.size}/{items.length} items completed
        </span>
        <BrandButton
          onClick={onComplete}
          variant="primary"
          disabled={!allCompleted}
        >
          {allCompleted ? 'Complete checkpoint →' : `${items.length - completedItems.size} remaining`}
        </BrandButton>
      </div>
    </div>
  );
}

// ── Per-item renderer (reuses existing content components) ──

function ContentItemRenderer({
  item,
  onItemComplete,
}: {
  item: ContentItem;
  onItemComplete: () => void;
}) {
  // Video
  if (item.type === 'video') {
    return (
      <VideoPlayer
        title={item.title}
        videoUrl={item.fileUrl}
        onComplete={onItemComplete}
      />
    );
  }

  // PDF
  if (item.type === 'pdf' && item.fileUrl) {
    return (
      <PdfViewer
        fileUrl={item.fileUrl}
        title={item.title}
        onComplete={onItemComplete}
      />
    );
  }

  // Text
  if (item.type === 'text') {
    return (
      <ReadingPanel
        title={item.title}
        content={item.textContent || `# ${item.title}\n\nContent coming soon...`}
        estimatedReadTime={5}
        onComplete={onItemComplete}
      />
    );
  }

  // File (download)
  if (item.type === 'file') {
    return (
      <div className="space-y-4">
        <p className="text-[#9ca3af]">{item.description}</p>
        {item.fileUrl && (
          <a
            href={item.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-accent/10 border border-brand-accent/30 text-brand-accent rounded-full text-sm font-medium hover:bg-brand-accent/15 transition-colors"
          >
            Download file →
          </a>
        )}
        <div className="flex justify-end">
          <BrandButton onClick={onItemComplete} variant="primary">
            Done →
          </BrandButton>
        </div>
      </div>
    );
  }

  // Quiz
  if (item.type === 'quiz' && item.quizData?.questions?.length) {
    // Normalize in case the row pre-dates the typed-question schema.
    const quiz = normalizeQuizData(item.quizData);
    const questions: BattleQuestion[] = quiz.questions.map((q) => ({
      question: q,
      explanation: q.explanation ?? '',
      difficulty: 'medium' as const,
      topic: 'general',
    }));

    // QuizBattle expects passingScore as a percentage (0–100). Earlier
    // versions of the generate-quiz Edge Function emitted it as a 0–1
    // fraction, so legacy rows still in the DB look like `0.7`. Normalize
    // on read so the display and the win comparison are correct without a
    // backfill.
    const rawPassingScore = quiz.passingScore;
    const passingScore =
      rawPassingScore > 0 && rawPassingScore <= 1
        ? rawPassingScore * 100
        : rawPassingScore;

    return (
      <QuizBattle
        bossName={quiz.bossName || 'Quiz Boss'}
        questions={questions}
        passingScore={passingScore}
        onComplete={(result) => {
          if (result.victory) onItemComplete();
          else useGameStore.getState().closeContent();
        }}
      />
    );
  }

  // Fallback
  return (
    <div className="space-y-4">
      <p className="text-gray-600">{item.description || 'No content available.'}</p>
      <div className="flex justify-end">
        <Button onClick={onItemComplete} variant="primary">
          Done →
        </Button>
      </div>
    </div>
  );
}

export default GameMap;

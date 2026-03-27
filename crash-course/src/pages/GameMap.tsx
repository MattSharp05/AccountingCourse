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
import { VideoPlayer, ReadingPanel, ExerciseModal } from '../components/content';
import { QuizBattle } from '../components/quiz';
import type { BattleQuestion } from '../components/quiz';
import { ChatWidget } from '../components/chat';
import { useGameStore, useCompletedNodes, useIsContentOpen, useCurrentNode, useAvatarPosition } from '../stores';
import { usePublicMap, usePublicContentItem } from '../hooks';
import type { ContentNode } from '../types/game';
import { xpToNextLevel } from '../types/game';
import { mapConfigToGameNodes, isNodeUnlocked, getMapProgress } from '../utils/mapConfigToGameNodes';

// Hardcoded fallback for /game route (backward compat)
import { MODULE_1_NODES, isNodeUnlocked as isModule1NodeUnlocked, getModule1Progress } from '../features/module1/nodes';
import { getNodeContent } from '../features/module1/content';
import { getQuizQuestions, getBossConfig } from '../features/module1/quizzes';

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
  const { mapId } = useParams<{ mapId: string }>();
  const { playerProgress, loadProgress, setCurrentNode, openContent, closeContent } = useGameStore();
  const completedNodes = useCompletedNodes();
  const isContentOpen = useIsContentOpen();
  const currentNodeId = useCurrentNode();
  const xpInfo = xpToNextLevel(playerProgress.xp);
  void xpInfo;

  // Fetch map from Supabase if mapId is present
  const { data: mapData, isLoading: mapLoading, error: mapError } = usePublicMap(mapId || '');

  // Determine which mode we're in
  const isDataDriven = !!mapId;

  // Convert map config nodes to game nodes
  const nodes: ContentNode[] = useMemo(() => {
    if (isDataDriven && mapData?.mapConfig) {
      return mapConfigToGameNodes(mapData.mapConfig.nodes);
    }
    if (!isDataDriven) {
      return MODULE_1_NODES;
    }
    return [];
  }, [isDataDriven, mapData]);

  const mapTitle = isDataDriven ? (mapData?.title || 'Loading...') : 'Module 1: Financial Statements Intro';

  // Track which node the player is near
  const [nearbyNodeId, setNearbyNodeId] = useState<string | null>(null);

  // Mini-map / map overview modal
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const avatarPos = useAvatarPosition();

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const startNodeId = isDataDriven ? mapData?.mapConfig?.startNodeId : undefined;

  const checkUnlocked = useCallback((nodeId: string) => {
    if (isDataDriven) {
      const result = isNodeUnlocked(nodeId, nodes, completedNodes, startNodeId);
      const node = nodes.find(n => n.id === nodeId);
      if (node && node.prerequisites.length > 0 && !result) {
        console.log('[checkUnlocked] LOCKED:', nodeId, 'prereqs:', node.prerequisites, 'completed:', completedNodes);
      }
      return result;
    }
    return isModule1NodeUnlocked(nodeId, completedNodes);
  }, [isDataDriven, nodes, completedNodes, startNodeId]);

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
  const progress = isDataDriven
    ? getMapProgress(nodes, completedNodes)
    : getModule1Progress(completedNodes);

  // Get nearby node title for prompt (only if unlocked)
  const nearbyNodeTitle = nearbyNode && checkUnlocked(nearbyNode.id)
    ? nearbyNode.title
    : null;

  // Loading state for data-driven maps
  if (isDataDriven && mapLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#1e293b]">
        <GameLoading message="Loading map..." />
      </div>
    );
  }

  // Error state
  if (isDataDriven && (mapError || !mapData?.mapConfig)) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#1e293b]">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            {mapError ? 'Failed to load map' : 'Map not built yet'}
          </h2>
          <p className="text-gray-400 mb-6">
            {mapError ? 'This map may not exist or is not published.' : 'The professor hasn\'t built this map yet.'}
          </p>
          <Button onClick={() => navigate('/')} variant="primary">
            Go Home
          </Button>
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
                  edges={isDataDriven ? mapData?.mapConfig?.edges : undefined}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="bg-white/90 backdrop-blur-sm"
          >
            ← Back
          </Button>

          {/* Spacer to keep top bar layout balanced */}
          <div />
        </div>

        {/* Map title indicator */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-[#4f46e5] text-white px-6 py-2 rounded-full font-bold shadow-lg">
            {mapTitle}
            <span className="ml-3 text-sm opacity-80">{progress}%</span>
          </div>
        </div>

        {/* Bottom controls hint */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-black/50 text-white px-4 py-2 rounded-lg text-sm backdrop-blur-sm">
            <span className="opacity-75">Move:</span>{' '}
            <kbd className="px-2 py-0.5 bg-white/20 rounded">WASD</kbd>
            <span className="mx-2 opacity-50">|</span>
            <span className="opacity-75">Run:</span>{' '}
            <kbd className="px-2 py-0.5 bg-white/20 rounded">Shift</kbd>
            <span className="mx-2 opacity-50">|</span>
            <span className="opacity-75">Interact:</span>{' '}
            <kbd className="px-2 py-0.5 bg-white/20 rounded">E</kbd>
          </div>
        </div>

      </div>

      {/* Mini-map overlay (bottom-left) */}
      <MiniMap
        nodes={nodes}
        edges={isDataDriven ? mapData?.mapConfig?.edges : undefined}
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
        edges={isDataDriven ? mapData?.mapConfig?.edges : undefined}
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
          isDataDriven ? (
            <DataDrivenContentViewer
              node={currentNode}
              onComplete={() => {
                useGameStore.getState().completeNode(currentNode.id);
                useGameStore.getState().addXp(currentNode.xpReward);
                closeContent();
              }}
            />
          ) : (
            <LegacyContentViewer
              node={currentNode}
              onComplete={() => {
                useGameStore.getState().completeNode(currentNode.id);
                useGameStore.getState().addXp(currentNode.xpReward);
                closeContent();
              }}
            />
          )
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

      {/* Flat ground collider as safety net */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[50, 0.1, 50]} position={[0, -0.5, 0]} />
      </RigidBody>

      <Boundaries />

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

function Boundaries() {
  const radius = 22;

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

function DataDrivenContentViewer({
  node,
  onComplete,
}: {
  node: ContentNode;
  onComplete: () => void;
}) {
  const { data: contentItem, isLoading } = usePublicContentItem(node.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading text="Loading content..." />
      </div>
    );
  }

  if (!contentItem) {
    return (
      <div className="space-y-4 text-center py-8">
        <p className="text-gray-500">Content not available yet.</p>
        <Button onClick={onComplete} variant="secondary">
          Mark Complete →
        </Button>
      </div>
    );
  }

  // Video
  if (node.type === 'video') {
    return (
      <div className="space-y-4">
        <p className="text-gray-600 mb-4">{node.description}</p>
        <VideoPlayer
          title={node.title}
          videoUrl={contentItem.fileUrl}
          onComplete={onComplete}
        />
        <div className="text-sm text-gray-500 text-center">
          Reward: <span className="font-semibold text-amber-600">+{node.xpReward} XP</span>
        </div>
      </div>
    );
  }

  // Reading (pdf or text)
  if (node.type === 'reading') {
    // If the content item has a file URL (PDF), embed it
    if (contentItem.fileUrl) {
      return (
        <div className="space-y-4">
          <iframe
            src={contentItem.fileUrl}
            className="w-full rounded-lg border border-gray-200"
            style={{ height: '70vh' }}
            title={node.title}
          />
          <div className="flex justify-between items-center pt-2 border-t">
            <div className="text-sm text-gray-500">
              Reward: <span className="font-semibold text-amber-600">+{node.xpReward} XP</span>
            </div>
            <Button onClick={onComplete} variant="primary">
              Mark Complete →
            </Button>
          </div>
        </div>
      );
    }
    // Otherwise render as text/markdown
    return (
      <ReadingPanel
        title={node.title}
        content={contentItem.textContent || `# ${node.title}\n\n${node.description}\n\nContent coming soon...`}
        estimatedReadTime={5}
        onComplete={onComplete}
      />
    );
  }

  // Exercise (file)
  if (node.type === 'exercise') {
    return (
      <div className="space-y-4">
        <p className="text-gray-600">{node.description}</p>
        {contentItem.fileUrl && (
          <a
            href={contentItem.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            📎 Download Exercise File
          </a>
        )}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            Reward: <span className="font-semibold text-amber-600">+{node.xpReward} XP</span>
          </div>
          <Button onClick={onComplete} variant="primary">
            Mark Complete →
          </Button>
        </div>
      </div>
    );
  }

  // Quiz boss
  if (node.type === 'quiz-boss') {
    if (!contentItem.quizData || !contentItem.quizData.questions?.length) {
      return (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🔮</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Quiz Coming Soon</h3>
          <p className="text-gray-500 mb-6">Questions are being prepared for this battle.</p>
          <Button onClick={onComplete} variant="secondary">
            Continue →
          </Button>
        </div>
      );
    }

    const questions: BattleQuestion[] = contentItem.quizData.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctIndex,
      explanation: '',
      difficulty: 'medium' as const,
      topic: 'general',
    }));

    return (
      <QuizBattle
        bossName={contentItem.quizData.bossName || 'Quiz Boss'}
        bossEmoji={contentItem.quizData.bossEmoji || '👾'}
        questions={questions}
        passingScore={contentItem.quizData.passingScore}
        onComplete={(result) => {
          if (result.victory) {
            onComplete();
          } else {
            useGameStore.getState().closeContent();
          }
        }}
      />
    );
  }

  // Fallback
  return (
    <div className="space-y-4">
      <p className="text-gray-600">{node.description}</p>
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-gray-500">
          Reward: <span className="font-semibold text-amber-600">+{node.xpReward} XP</span>
        </div>
        <Button onClick={onComplete} variant="primary">
          Mark Complete →
        </Button>
      </div>
    </div>
  );
}

// ── Legacy Content Viewer (hardcoded Module 1) ──────────

function LegacyContentViewer({
  node,
  onComplete,
}: {
  node: ContentNode;
  onComplete: () => void;
}) {
  const nodeContent = getNodeContent(node.id);

  if (node.type === 'video') {
    return (
      <div className="space-y-4">
        <p className="text-gray-600 mb-4">{node.description}</p>
        <VideoPlayer title={node.title} onComplete={onComplete} />
        <div className="text-sm text-gray-500 text-center">
          Reward: <span className="font-semibold text-amber-600">+{node.xpReward} XP</span>
        </div>
      </div>
    );
  }

  if (node.type === 'reading') {
    return (
      <ReadingPanel
        title={node.title}
        content={nodeContent?.readingContent || `# ${node.title}\n\n${node.description}\n\nContent coming soon...`}
        estimatedReadTime={nodeContent?.estimatedReadTime || 3}
        onComplete={onComplete}
      />
    );
  }

  if (node.type === 'exercise' && nodeContent?.exerciseQuestions) {
    return (
      <ExerciseModal
        title={node.title}
        instructions={nodeContent.exerciseInstructions || 'Complete the following questions to test your understanding.'}
        questions={nodeContent.exerciseQuestions}
        onComplete={(score) => {
          console.log(`Exercise completed with score: ${score}%`);
          onComplete();
        }}
      />
    );
  }

  if (node.type === 'quiz-boss') {
    const questions = getQuizQuestions(node.id);
    const bossConfig = getBossConfig(node.id);

    if (questions.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🔮</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Quiz Coming Soon</h3>
          <p className="text-gray-500 mb-6">Questions are being prepared for this battle.</p>
          <Button onClick={onComplete} variant="secondary">
            Continue →
          </Button>
        </div>
      );
    }

    return (
      <QuizBattle
        bossName={bossConfig.name}
        bossEmoji={bossConfig.emoji}
        questions={questions}
        passingScore={bossConfig.passingScore}
        onComplete={(result) => {
          if (result.victory) {
            onComplete();
          } else {
            useGameStore.getState().closeContent();
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-600">{node.description}</p>
      <div className="bg-gray-100 p-6 rounded-lg text-center">
        <div className="text-4xl mb-2">📝</div>
        <p className="text-gray-500">Content placeholder</p>
      </div>
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-gray-500">
          Reward: <span className="font-semibold text-amber-600">+{node.xpReward} XP</span>
        </div>
        <Button onClick={onComplete} variant="primary">
          Mark Complete →
        </Button>
      </div>
    </div>
  );
}

export default GameMap;

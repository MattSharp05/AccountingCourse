import { Suspense, useEffect, useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { KeyboardControls, useKeyboardControls } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import {
  Canvas3DErrorBoundary,
  GameLoading,
  Button,
  XpBar,
  Modal,
} from '../components/ui';
import {
  MapEnvironment,
  FloatingDecorations,
  MapTerrain,
  ContentNode3D,
  PathRenderer,
  Avatar,
  FollowCamera,
  InteractionPrompt,
} from '../components/game';
import { VideoPlayer, ReadingPanel, ExerciseModal } from '../components/content';
import { QuizBattle } from '../components/quiz';
import { ChatWidget } from '../components/chat';
import { useGameStore, useCompletedNodes, useIsContentOpen, useCurrentNode } from '../stores';
import { xpToNextLevel } from '../types/game';
import { MODULE_1_NODES, isNodeUnlocked, getModule1Progress } from '../features/module1/nodes';
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
  const { playerProgress, loadProgress, setCurrentNode, openContent, closeContent } = useGameStore();
  const completedNodes = useCompletedNodes();
  const isContentOpen = useIsContentOpen();
  const currentNodeId = useCurrentNode();
  const xpInfo = xpToNextLevel(playerProgress.xp);

  // Track which node the player is near
  const [nearbyNodeId, setNearbyNodeId] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const handleNodeInteract = useCallback((nodeId: string) => {
    const node = MODULE_1_NODES.find(n => n.id === nodeId);
    if (node && isNodeUnlocked(nodeId, completedNodes)) {
      setCurrentNode(nodeId);
      openContent();
    }
  }, [setCurrentNode, openContent, completedNodes]);

  const handleNodeProximity = useCallback((nodeId: string | null) => {
    setNearbyNodeId(nodeId);
  }, []);

  const handleProximityInteract = useCallback(() => {
    if (nearbyNodeId) {
      handleNodeInteract(nearbyNodeId);
    }
  }, [nearbyNodeId, handleNodeInteract]);

  const currentNode = MODULE_1_NODES.find((n) => n.id === currentNodeId);
  const nearbyNode = MODULE_1_NODES.find((n) => n.id === nearbyNodeId);
  const moduleProgress = getModule1Progress(completedNodes);

  // Get nearby node title for prompt (only if unlocked)
  const nearbyNodeTitle = nearbyNode && isNodeUnlocked(nearbyNode.id, completedNodes)
    ? nearbyNode.title
    : null;

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
                  onNodeInteract={handleNodeInteract}
                  onNodeProximity={handleNodeProximity}
                  completedNodes={completedNodes}
                />
                {/* Keyboard interaction listener inside Canvas */}
                <InteractionListener
                  nearbyNodeId={nearbyNodeId}
                  completedNodes={completedNodes}
                  onInteract={handleNodeInteract}
                />
              </Physics>
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

          {/* XP Bar */}
          <div className="bg-white/90 backdrop-blur-sm rounded-[1rem] p-3 min-w-[200px]">
            <XpBar
              currentXp={xpInfo.current}
              requiredXp={xpInfo.required}
              level={playerProgress.level}
            />
          </div>
        </div>

        {/* Module indicator */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-[#4f46e5] text-white px-6 py-2 rounded-full font-bold shadow-lg">
            Module 1: Financial Statements Intro
            <span className="ml-3 text-sm opacity-80">{moduleProgress}%</span>
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

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 text-sm">
          <div className="font-semibold mb-2">Legend</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-[#4F46E5]" />
            <span>Video</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-[#0891b2]" />
            <span>Reading</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-[#059669]" />
            <span>Exercise</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#dc2626]" />
            <span>Quiz Boss</span>
          </div>
        </div>
      </div>

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
          <ContentViewer
            node={currentNode}
            onComplete={() => {
              useGameStore.getState().completeNode(currentNode.id);
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

// Component to listen for E key press inside the Canvas
function InteractionListener({
  nearbyNodeId,
  completedNodes,
  onInteract,
}: {
  nearbyNodeId: string | null;
  completedNodes: string[];
  onInteract: (nodeId: string) => void;
}) {
  const [, getKeys] = useKeyboardControls();
  const [wasPressed, setWasPressed] = useState(false);

  // Use frame to check for key press
  const { interact } = getKeys() as { interact: boolean };

  useEffect(() => {
    if (interact && !wasPressed && nearbyNodeId) {
      if (isNodeUnlocked(nearbyNodeId, completedNodes)) {
        onInteract(nearbyNodeId);
      }
      setWasPressed(true);
    } else if (!interact && wasPressed) {
      setWasPressed(false);
    }
  }, [interact, wasPressed, nearbyNodeId, completedNodes, onInteract]);

  return null;
}

// The 3D scene with all elements
interface MapSceneProps {
  onNodeInteract: (nodeId: string) => void;
  onNodeProximity: (nodeId: string | null) => void;
  completedNodes: string[];
}

function MapScene({ onNodeInteract, onNodeProximity, completedNodes }: MapSceneProps) {
  return (
    <>
      {/* Environment (lighting, sky, clouds) */}
      <MapEnvironment />

      {/* Floating decorations */}
      <FloatingDecorations />

      {/* Terrain (ground, paths, buildings) */}
      <MapTerrain />

      {/* Physics ground */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[50, 0.1, 50]} position={[0, -0.1, 0]} />
      </RigidBody>

      {/* Invisible boundary walls */}
      <Boundaries />

      {/* Path connections between nodes */}
      <PathRenderer
        nodes={MODULE_1_NODES}
        completedNodeIds={completedNodes}
      />

      {/* Content nodes */}
      {MODULE_1_NODES.map((node) => (
        <ContentNode3D
          key={node.id}
          node={node}
          isUnlocked={isNodeUnlocked(node.id, completedNodes)}
          onInteract={() => onNodeInteract(node.id)}
        />
      ))}

      {/* Player avatar */}
      <Avatar
        nodes={MODULE_1_NODES.filter(n => isNodeUnlocked(n.id, completedNodes))}
        onNodeProximity={onNodeProximity}
      />

      {/* Camera follows avatar */}
      <FollowCamera offset={[0, 10, 15]} smoothness={0.08} />
    </>
  );
}

// Invisible boundary walls to keep player in bounds
function Boundaries() {
  const radius = 22;

  return (
    <group>
      {/* Four walls at the edges */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[radius, 5, 0.5]} position={[0, 2.5, -radius]} />
        <CuboidCollider args={[radius, 5, 0.5]} position={[0, 2.5, radius]} />
        <CuboidCollider args={[0.5, 5, radius]} position={[-radius, 2.5, 0]} />
        <CuboidCollider args={[0.5, 5, radius]} position={[radius, 2.5, 0]} />
      </RigidBody>
    </group>
  );
}

// Content viewer component that uses real content components
function ContentViewer({
  node,
  onComplete,
}: {
  node: (typeof MODULE_1_NODES)[0];
  onComplete: () => void;
}) {
  const nodeContent = getNodeContent(node.id);

  // Video content
  if (node.type === 'video') {
    return (
      <div className="space-y-4">
        <p className="text-gray-600 mb-4">{node.description}</p>
        <VideoPlayer
          title={node.title}
          onComplete={onComplete}
          // videoUrl will be added when we have real video content
        />
        <div className="text-sm text-gray-500 text-center">
          Reward: <span className="font-semibold text-amber-600">+{node.xpReward} XP</span>
        </div>
      </div>
    );
  }

  // Reading content
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

  // Exercise content
  if (node.type === 'exercise' && nodeContent?.exerciseQuestions) {
    return (
      <ExerciseModal
        title={node.title}
        instructions={nodeContent.exerciseInstructions || 'Complete the following questions to test your understanding.'}
        questions={nodeContent.exerciseQuestions}
        onComplete={(score) => {
          // For exercises, we complete even with low scores but could track for analytics
          console.log(`Exercise completed with score: ${score}%`);
          onComplete();
        }}
      />
    );
  }

  // Quiz boss - full battle system
  if (node.type === 'quiz-boss') {
    const questions = getQuizQuestions(node.id);
    const bossConfig = getBossConfig(node.id);

    // If no questions, show placeholder
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
            // On defeat, just close the modal - they can try again
            useGameStore.getState().closeContent();
          }
        }}
      />
    );
  }

  // Fallback for any other content type
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

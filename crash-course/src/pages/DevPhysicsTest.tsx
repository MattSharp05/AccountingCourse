// TEMPORARY dev-only physics test harness — not linked from any UI.
// Mounts the real Avatar + WorldDecorator + physics with synthetic nodes so
// avatar movement can be verified without Supabase data or auth.
import { Suspense, useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { KeyboardControls, useKeyboardControls } from '@react-three/drei';

// Renders drei's live keyboard state so automation can confirm input arrival
function KeysProbe() {
  const forward = useKeyboardControls((s) => s.forward);
  const backward = useKeyboardControls((s) => s.backward);
  return <div id="keys-probe">keys:fwd={String(forward)},back={String(backward)}</div>;
}

// Logs render-loop liveness from inside the Canvas, outside Suspense
function SceneProbe() {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current % 120 === 1) console.log('[test] frame', frames.current);
  });
  useEffect(() => { console.log('[test] SceneProbe mounted'); }, []);
  return null;
}
import { WorldDecorator, Avatar, FollowCamera } from '../components/game';
import type { TerrainData } from '../components/game/worldDecorator/WorldDecorator';
import { useGameStore, useAvatarPosition } from '../stores';
import type { ContentNode } from '../types/game';

const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'leftward', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'rightward', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'interact', keys: ['KeyE'] },
];

const NODES: ContentNode[] = [
  { id: 'n1', type: 'reading', title: 'Node 1', description: '', position: [-25, 0.5, 0], prerequisites: [], xpReward: 100, moduleId: 0 },
  { id: 'n2', type: 'reading', title: 'Node 2', description: '', position: [0, 0.5, 5], prerequisites: ['n1'], xpReward: 100, moduleId: 0 },
  { id: 'n3', type: 'reading', title: 'Node 3', description: '', position: [25, 0.5, -10], prerequisites: ['n2'], xpReward: 100, moduleId: 0 },
];

const EDGES = [
  { source: 'n1', target: 'n2' },
  { source: 'n2', target: 'n3' },
];

export function DevPhysicsTest() {
  const pos = useAvatarPosition();
  const anim = useGameStore((s) => s.avatarState.animation);
  const [terrainData, setTerrainData] = useState<TerrainData | null>(null);
  const terrainCbRef = useRef<(d: TerrainData) => void>((d) => setTerrainData(d));
  const terrainY = terrainData ? terrainData.heightFn(pos[0], pos[2]) : null;

  return (
    <div className="w-full h-screen relative bg-[#1e293b]">
      <KeyboardControls map={keyboardMap}>
        <Canvas shadows camera={{ position: [0, 15, 20], fov: 50 }} onCreated={() => console.log('[test] canvas created')}>
          <SceneProbe />
          <Suspense fallback={null}>
            <Physics gravity={[0, -20, 0]}>
              <fog attach="fog" args={['#c8dbb6', 30, 80]} />
              <ambientLight intensity={0.8} />
              <directionalLight position={[10, 20, 10]} intensity={1.2} />
              <WorldDecorator
                nodes={NODES}
                edges={EDGES}
                completedNodeIds={[]}
                onTerrainReady={terrainCbRef.current}
              />
              <RigidBody type="fixed" colliders={false}>
                <CuboidCollider args={[60, 0.1, 60]} position={[0, -5, 0]} />
              </RigidBody>
              <Avatar
                nodes={NODES}
                onNodeProximity={() => {}}
                spawnPosition={[-25, 2, 2]}
                heightFn={terrainData?.heightFn}
              />
              <FollowCamera />
            </Physics>
          </Suspense>
        </Canvas>

      {/* Machine-readable HUD for automated verification (inside
          KeyboardControls so KeysProbe can read the control state) */}
      <div className="absolute top-2 left-2 bg-black/80 text-white text-xs font-mono p-2 rounded space-y-1 z-50">
        <KeysProbe />
        <div id="avatar-pos">pos:{pos.map((v) => v.toFixed(2)).join(',')}</div>
        <div id="avatar-anim">anim:{anim}</div>
        <div id="terrain-y">terrainY:{terrainY === null ? 'loading' : terrainY.toFixed(2)}</div>
        <button
          id="trigger-dance"
          className="px-2 py-1 bg-amber-500 text-black rounded"
          onClick={() => useGameStore.getState().completeNode('devtest', `n-${Date.now()}`)}
        >
          Trigger dance
        </button>
      </div>
      </KeyboardControls>
    </div>
  );
}

export default DevPhysicsTest;

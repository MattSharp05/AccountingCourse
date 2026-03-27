import { useRef, useState, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../../stores';
import type { ContentNode } from '../../types/game';
import { ModelCharacter } from './models/ModelCharacter';
import { ModelErrorBoundary } from './models/ModelErrorBoundary';

interface AvatarProps {
  nodes: ContentNode[];
  onNodeProximity: (nodeId: string | null) => void;
  spawnPosition?: [number, number, number];
  heightFn?: (x: number, z: number) => number;
}

// Simple capsule-based avatar with keyboard controls
export function Avatar({ nodes, onNodeProximity, spawnPosition = [0, 2, 0], heightFn }: AvatarProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Group>(null);
  const [animation, setAnimation] = useState<'idle' | 'walk' | 'run'>('idle');

  const { updateAvatarPosition, updateAvatarAnimation, teleportTarget, clearTeleportTarget } = useGameStore();

  // Keyboard controls
  const [, getKeys] = useKeyboardControls();

  // Movement parameters
  const walkSpeed = 4;
  const runSpeed = 7;
  const rotationSpeed = 3;

  // Check proximity to nodes
  const checkNodeProximity = (position: THREE.Vector3) => {
    const interactionRadius = 2;

    for (const node of nodes) {
      const nodePos = new THREE.Vector3(...node.position);
      const distance = position.distanceTo(nodePos);

      if (distance < interactionRadius) {
        onNodeProximity(node.id);
        return;
      }
    }
    onNodeProximity(null);
  };

  useFrame((_, delta) => {
    if (!rigidBodyRef.current || !meshRef.current) return;

    // Handle teleport requests from the map overview
    if (teleportTarget) {
      const [tx, ty, tz] = teleportTarget;
      const teleportY = heightFn ? heightFn(tx, tz) + 0.65 : ty + 1.5;
      rigidBodyRef.current.setTranslation({ x: tx, y: teleportY, z: tz }, true);
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      updateAvatarPosition([tx, teleportY, tz]);
      clearTeleportTarget();
    }

    const keys = getKeys();
    const { forward, backward, leftward, rightward, run } = keys as {
      forward: boolean;
      backward: boolean;
      leftward: boolean;
      rightward: boolean;
      run: boolean;
    };

    // Calculate movement direction
    const moveDirection = new THREE.Vector3();
    if (forward) moveDirection.z -= 1;
    if (backward) moveDirection.z += 1;
    if (leftward) moveDirection.x -= 1;
    if (rightward) moveDirection.x += 1;

    const isMoving = moveDirection.length() > 0;
    const speed = run ? runSpeed : walkSpeed;

    // Get current position
    const translation = rigidBodyRef.current.translation();
    const currentPosition = new THREE.Vector3(translation.x, translation.y, translation.z);

    // Update animation state
    const newAnimation = isMoving ? (run ? 'run' : 'walk') : 'idle';
    if (newAnimation !== animation) {
      setAnimation(newAnimation);
      updateAvatarAnimation(newAnimation);
    }

    if (isMoving) {
      // Normalize and apply movement
      moveDirection.normalize();

      // Calculate target rotation based on movement direction
      const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);

      // Smoothly rotate towards movement direction
      const currentRotation = meshRef.current.rotation.y;
      const rotationDiff = targetRotation - currentRotation;

      // Normalize rotation difference
      let normalizedDiff = rotationDiff;
      while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
      while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;

      meshRef.current.rotation.y += normalizedDiff * rotationSpeed * delta;

      // Apply velocity
      const velocity = moveDirection.multiplyScalar(speed);
      rigidBodyRef.current.setLinvel(
        { x: velocity.x, y: rigidBodyRef.current.linvel().y, z: velocity.z },
        true
      );
    } else {
      // Stop horizontal movement when not pressing keys
      rigidBodyRef.current.setLinvel(
        { x: 0, y: rigidBodyRef.current.linvel().y, z: 0 },
        true
      );
    }

    // Terrain following — pin avatar Y to terrain surface
    if (heightFn) {
      const terrainY = heightFn(currentPosition.x, currentPosition.z);
      const targetY = terrainY + 0.65; // capsule half-extent offset
      const currentY = currentPosition.y;

      // If avatar is below or near terrain, snap up; allow small tolerance above
      if (currentY < targetY + 0.1) {
        rigidBodyRef.current.setTranslation(
          { x: currentPosition.x, y: targetY, z: currentPosition.z },
          true,
        );
        // Kill downward velocity so gravity doesn't fight
        const vel = rigidBodyRef.current.linvel();
        if (vel.y < 0) {
          rigidBodyRef.current.setLinvel({ x: vel.x, y: 0, z: vel.z }, true);
        }
      }
    }

    // Update store with current position (re-read after possible correction)
    const finalPos = rigidBodyRef.current.translation();
    updateAvatarPosition([finalPos.x, finalPos.y, finalPos.z]);

    // Check node proximity
    checkNodeProximity(new THREE.Vector3(finalPos.x, finalPos.y, finalPos.z));

    // Keep avatar upright
    rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={spawnPosition}
      enabledRotations={[false, false, false]}
      linearDamping={0.5}
      angularDamping={1}
      lockRotations
    >
      <CapsuleCollider args={[0.35, 0.3]} position={[0, 0.65, 0]} />

      <group ref={meshRef}>
        <ModelErrorBoundary fallback={<StudentCharacter animation={animation} />}>
          <Suspense fallback={<StudentCharacter animation={animation} />}>
            <ModelCharacter animation={animation} />
          </Suspense>
        </ModelErrorBoundary>
      </group>
    </RigidBody>
  );
}

// Simple stylized student character
function StudentCharacter({ animation }: { animation: 'idle' | 'walk' | 'run' }) {
  const bodyRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);

  // Simple procedural animation
  useFrame((state) => {
    if (!bodyRef.current) return;

    const time = state.clock.elapsedTime;
    const speed = animation === 'run' ? 12 : animation === 'walk' ? 6 : 0;
    const amplitude = animation === 'run' ? 0.4 : animation === 'walk' ? 0.25 : 0;

    // Idle bounce
    if (animation === 'idle') {
      bodyRef.current.position.y = Math.sin(time * 2) * 0.03;
    } else {
      bodyRef.current.position.y = Math.abs(Math.sin(time * speed)) * 0.1;
    }

    // Leg animation
    if (leftLegRef.current && rightLegRef.current) {
      leftLegRef.current.rotation.x = Math.sin(time * speed) * amplitude;
      rightLegRef.current.rotation.x = Math.sin(time * speed + Math.PI) * amplitude;
    }

    // Arm animation
    if (leftArmRef.current && rightArmRef.current) {
      leftArmRef.current.rotation.x = Math.sin(time * speed + Math.PI) * amplitude * 0.7;
      rightArmRef.current.rotation.x = Math.sin(time * speed) * amplitude * 0.7;
    }
  });

  return (
    <group ref={bodyRef}>
      {/* Body */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.4, 4, 8]} />
        <meshStandardMaterial color="#4F46E5" roughness={0.8} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#fcd5b8" roughness={0.8}/>
      </mesh>

      {/* Hair */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#4a3728" roughness={0.8}/>
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.08, 1.42, 0.18]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8}/>
      </mesh>
      <mesh position={[0.08, 1.42, 0.18]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8}/>
      </mesh>

      {/* Backpack */}
      <mesh position={[0, 0.85, -0.25]} castShadow>
        <boxGeometry args={[0.35, 0.4, 0.2]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.8}/>
      </mesh>

      {/* Left Arm */}
      <mesh ref={leftArmRef} position={[-0.35, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.3, 4, 8]} />
        <meshStandardMaterial color="#4F46E5" roughness={0.8} />
      </mesh>

      {/* Right Arm */}
      <mesh ref={rightArmRef} position={[0.35, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.3, 4, 8]} />
        <meshStandardMaterial color="#4F46E5" roughness={0.8} />
      </mesh>

      {/* Left Leg */}
      <mesh ref={leftLegRef} position={[-0.12, 0.35, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.25, 4, 8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8}/>
      </mesh>

      {/* Right Leg */}
      <mesh ref={rightLegRef} position={[0.12, 0.35, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.25, 4, 8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8}/>
      </mesh>

      {/* Shoes */}
      <mesh position={[-0.12, 0.08, 0.05]} castShadow>
        <boxGeometry args={[0.12, 0.08, 0.18]} />
        <meshStandardMaterial color="#dc2626" roughness={0.8}/>
      </mesh>
      <mesh position={[0.12, 0.08, 0.05]} castShadow>
        <boxGeometry args={[0.12, 0.08, 0.18]} />
        <meshStandardMaterial color="#dc2626" roughness={0.8}/>
      </mesh>
    </group>
  );
}

export default Avatar;

import * as THREE from 'three';

/**
 * Traverses a loaded GLTF scene and ensures all meshes cast/receive shadows.
 * Keeps the original PBR materials (stylized KayKit gradient atlas textures
 * already look great with standard lighting — no toon override needed).
 * Optionally boosts saturation for a more vibrant Fortnite-like feel.
 */
export function applyToonMaterials(scene: THREE.Group) {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      // Boost material vibrancy if it's a standard material
      if (child.material instanceof THREE.MeshStandardMaterial) {
        child.material.roughness = Math.min(child.material.roughness, 0.85);
        child.material.metalness = Math.max(child.material.metalness, 0.0);
      }
    }
  });
}

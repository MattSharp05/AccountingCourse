import * as THREE from 'three';

/**
 * Creates a DataTexture gradient map for MeshToonMaterial.
 * The texture defines discrete shading bands (cel-shading steps).
 * @param steps - Number of shading bands (3-4 is typical for cartoon look)
 */
function createToonGradient(steps = 4): THREE.DataTexture {
  const size = steps;
  const data = new Uint8Array(size);

  for (let i = 0; i < size; i++) {
    // Remap from 40%-100% brightness so shadows stay light and cartoony
    const t = (i + 0.5) / size;
    data[i] = Math.round((0.4 + t * 0.6) * 255);
  }

  const texture = new THREE.DataTexture(data, size, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;

  return texture;
}

// Shared singleton — reuse across all toon materials
export const toonGradient = createToonGradient(4);

import * as THREE from 'three';
import { POLAROID_PAPER_COLOR } from './polaroid-spec.js';

// Compensate only paper for the existing PBR lighting and ACES presentation.
// Keep separate instances so clipping, fading and disposal remain caller-owned.
export function createPolaroidPaperMaterial() {
  return new THREE.MeshStandardMaterial({
    color: '#FAF9F6', roughness: .8, metalness: 0,
    emissive: POLAROID_PAPER_COLOR, emissiveIntensity: .18,
    opacity: 1, transparent: false, depthTest: true, depthWrite: true,
  });
}

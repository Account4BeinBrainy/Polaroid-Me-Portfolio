import * as THREE from 'three';
import { FILM_BOX_CONFIG } from './film-box-config.js?v=integrated-20260927-3';

// Own resources per call: callers may reuse them, but must coordinate disposal if shared.
export function createFilmBoxMaterials(overrides = {}) {
  const config = { ...FILM_BOX_CONFIG, ...overrides };
  function texture(width, height, draw) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    draw(canvas.getContext('2d'), width, height);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }
  const frameTexture = texture(512, 624, (ctx, w, h) => {
    ctx.fillStyle = config.FRAME_COLOR; ctx.fillRect(0, 0, w, h);
    ctx.clearRect(40, 40, w - 80, w - 80);
  });
  const sideLogoTexture = texture(1024, 240, (ctx, w, h) => {
    ctx.fillStyle = config.FRAME_COLOR; ctx.font = 'bold 180px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Polaroid', w / 2, h / 2, w - 40);
  });
  const boxMaterial = new THREE.MeshStandardMaterial({ color: config.BOX_GREEN,
    roughness: config.PAPER_ROUGHNESS, metalness: 0 });
  const frameMaterial = new THREE.MeshStandardMaterial({ map: frameTexture,
    transparent: true, roughness: config.PAPER_ROUGHNESS, metalness: 0, depthWrite: false });
  const sideLogoMaterial = new THREE.MeshStandardMaterial({ map: sideLogoTexture,
    transparent: true, roughness: config.PAPER_ROUGHNESS, metalness: 0, depthWrite: false });
  return { boxMaterial, frameMaterial, sideLogoMaterial, frameTexture, sideLogoTexture };
}

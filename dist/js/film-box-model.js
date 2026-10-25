import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FILM_BOX_CONFIG } from './film-box-config.js?v=integrated-20260927-3';
import { createFilmBoxMaterials } from './film-box-materials.js?v=integrated-20260927-3';

const modelPromise = new GLTFLoader().loadAsync(new URL('../public/model/film-box.glb', import.meta.url).href);

// Each call owns its object hierarchy, animation and GPU resources. No shared mutable state.
export async function createFilmBox(scene, options = {}) {
  const config = { ...FILM_BOX_CONFIG, ...options.config };
  for (const key of ['FRAME_SCALE', 'SIDE_LOGO_SCALE', 'COVER_LIFT_DISTANCE', 'OPEN_DURATION'])
    if (!Number.isFinite(config[key]) || config[key] < 0) throw new Error(`Invalid ${key}`);
  if (!Number.isFinite(config.PAPER_ROUGHNESS) || config.PAPER_ROUGHNESS < 0 || config.PAPER_ROUGHNESS > 1)
    throw new Error('PAPER_ROUGHNESS must be between 0 and 1');
  const scale = options.scale ?? 1, position = options.position ?? [0, 0, 0], rotation = options.rotation ?? [0, 0, 0];
  if (!Number.isFinite(scale) || scale <= 0 || [position, rotation].some(v => !Array.isArray(v) || v.length !== 3 || !v.every(Number.isFinite)))
    throw new Error('Use a positive scale and finite [x,y,z] position/rotation');
  const instance = (await modelPromise).scene.clone(true);
  const geometries = new Set(), materials = new Set(), textures = new Set();
  function collect(object) {
    object.traverse(node => {
      if (!node.isMesh) return;
      geometries.add(node.geometry);
      for (const m of [node.material].flat()) {
        materials.add(m);
        for (const value of Object.values(m)) if (value?.isTexture) textures.add(value);
      }
    });
  }
  function free() { for (const t of textures) t.dispose(); for (const m of materials) m.dispose(); for (const g of geometries) g.dispose(); }
  const root = instance.getObjectByName('FilmBox_Root');
  const innerTray = root?.getObjectByName('InnerTray'), outerCover = root?.getObjectByName('OuterCover');
  if (!root || !innerTray?.isMesh || !outerCover?.isMesh) {
    free(); throw new Error('Expected FilmBox_Root, InnerTray and OuterCover in film-box.glb');
  }
  const resources = createFilmBoxMaterials(config);
  root.traverse(node => {
    if (!node.isMesh) return;
    node.material = resources.boxMaterial; node.castShadow = true; node.receiveShadow = true;
  });
  outerCover.geometry.computeBoundingBox();
  const bounds = outerCover.geometry.boundingBox, size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const offset = Math.max(size.x, size.y, size.z) * 0.001;
  const frameWidth = size.x * config.FRAME_SCALE;
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(frameWidth, frameWidth / 0.82), resources.frameMaterial);
  frame.name = 'FilmBoxFrame'; frame.position.set(center.x, center.y, bounds.max.z + offset);
  outerCover.add(frame);
  const logoWidth = size.y * config.SIDE_LOGO_SCALE;
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(logoWidth, logoWidth * 240 / 1024), resources.sideLogoMaterial);
  logo.name = 'FilmBoxSideLogo'; logo.rotation.set(0, Math.PI / 2, Math.PI / 2);
  logo.position.set(bounds.max.x + offset, center.y, center.z); outerCover.add(logo);
  geometries.add(frame.geometry); geometries.add(logo.geometry);
  for (const value of Object.values(resources)) {
    if (value?.isMaterial) materials.add(value);
    if (value?.isTexture) textures.add(value);
  }
  root.position.fromArray(position); root.rotation.fromArray(rotation); root.scale.setScalar(scale);
  scene.add(root);
  const closed = outerCover.position.clone();
  let disposed = false, raf = 0, pending = null, finish = null, state = 'closed';
  const changed = () => options.onChange?.();
  function cancel() {
    cancelAnimationFrame(raf); raf = 0;
    finish?.(false); finish = null; pending = null;
  }
  function open() {
    if (disposed) return Promise.resolve(false);
    if (pending) return pending;
    if (state === 'open') return Promise.resolve(true);
    state = 'opening'; const started = performance.now();
    pending = new Promise(resolve => { finish = resolve; });
    function tick(now) {
      const t = config.OPEN_DURATION === 0 ? 1 : Math.min(1, (now - started) / config.OPEN_DURATION);
      outerCover.position.y = closed.y + config.COVER_LIFT_DISTANCE * (1 - (1-t)**3);
      if (t === 1) { state = 'open'; raf = 0; finish(true); finish = null; pending = null; }
      else raf = requestAnimationFrame(tick);
      changed();
    }
    raf = requestAnimationFrame(tick);
    return pending;
  }
  function reset() {
    if (disposed) return;
    cancel(); outerCover.position.copy(closed); state = 'closed'; changed();
  }
  function dispose() {
    if (disposed) return;
    disposed = true; cancel(); root.removeFromParent(); free(); changed();
  }
  changed();
  return { root, innerTray, outerCover, open, reset, dispose, get state() { return state; } };
}

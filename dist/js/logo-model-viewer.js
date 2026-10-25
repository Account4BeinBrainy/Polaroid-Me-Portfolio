import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Returns a centered, meter-scale Group. Rotation is [x,y,z] in radians. */
export async function createLogoModel(scene, { type, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 } = {}) {
  if (!['google', 'preply'].includes(type)) throw new TypeError('type must be google or preply');
  if (![position, rotation].every(v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite)) || !Number.isFinite(scale) || scale <= 0)
    throw new TypeError('Use finite [x,y,z] transforms and a positive scalar scale');
  const { scene: model } = await new GLTFLoader().loadAsync(new URL(`../public/models/${type}-logo-3d.glb${type === 'preply' ? '?v=2' : ''}`, import.meta.url).href);
  model.position.fromArray(position); model.rotation.fromArray(rotation); model.scale.setScalar(scale);
  model.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
  scene.add(model);
  return model;
}

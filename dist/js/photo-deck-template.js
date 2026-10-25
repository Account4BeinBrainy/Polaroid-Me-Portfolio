import { createPolaroidPaperMaterial } from './polaroid-paper-material.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { POLAROID_SPEC } from './polaroid-spec.js?v=integrated-20260927-3';
export const PHOTO_TEMPLATE = POLAROID_SPEC;
const cache = new Map();
async function acquire(url) {
  const key = new URL(url, document.baseURI).href;
  let entry = cache.get(key);
  if (!entry) {
    entry = { refs: 0, promise: new GLTFLoader().loadAsync(key) };
    cache.set(key, entry);
    entry.promise.catch(() => { if (cache.get(key) === entry) cache.delete(key); });
  }
  entry.refs++;
  try { return { key, entry, gltf: await entry.promise }; }
  catch (error) { entry.refs--; throw error; }
}
function release(key, entry) {
  entry.refs--;
  if (entry.refs > 0) return;
  if (cache.get(key) === entry) cache.delete(key);
  entry.promise.then(({ scene }) => {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    scene.traverse(o => {
      if (!o.isMesh) return;
      geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        materials.add(m);
        for (const value of Object.values(m)) if (value?.isTexture) textures.add(value);
      }
    });
    textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose());
  }).catch(() => {});
}

async function createPrintAsset({ url, single, coverUrl = '', index = 0, id = '', anisotropy = 4, solidBack = false, onChange = () => {} }) {
  const { key, entry, gltf } = await acquire(url);
  const root = gltf.scene.clone(true);
  root.name = id || `${single ? 'SinglePhoto' : 'PhotoDeck'}_${index + 1}`;
  const ownMaterials = new Set(), ownTextures = new Set(), ownGeometries = new Set(), clones = new Map();
  let disposed = false, generation = 0;
  root.traverse(o => {
    if (!o.isMesh) return;
    const replace = m => {
      if (!clones.has(m)) { const c = o.name.startsWith('Paper_') ? createPolaroidPaperMaterial() : m.clone(); clones.set(m, c); ownMaterials.add(c); }
      return clones.get(m);
    };
    o.material = Array.isArray(o.material) ? o.material.map(replace) : replace(o.material);
    for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
      if (o.name.startsWith('Image_')) {
        material.color.set(PHOTO_TEMPLATE.imageColor); material.roughness = .35; material.metalness = 0;
      }
      material.transparent = false; material.opacity = 1; if (!o.name.startsWith('Paper_')) material.emissive?.set('#000000'); material.needsUpdate = true;
    }
    o.castShadow = true; o.receiveShadow = true; o.userData.projectId = id;
  });
  const top = root.getObjectByName(single ? 'Sheet_01' : 'Sheet_06');
  const image = root.getObjectByName(single ? 'Image_01' : 'Image_06');
  if (!top || !image) {
    ownMaterials.forEach(m => m.dispose()); release(key, entry);
    throw new Error('Expected template-v2 GLB with named Sheet/Image nodes. Check the model URL.');
  }
  // Keep the photograph color-managed but independent from PBR light and tone mapping.
  image.material = new THREE.MeshBasicMaterial({ color: PHOTO_TEMPLATE.imageColor, toneMapped: false });
  ownMaterials.add(image.material); image.receiveShadow = false;
  // Opt-in backing for Projects; other 3D and DOM presentations stay unchanged.
  if (single && solidBack) {
    const {width:w,height:h,thickness:t,imageSide,imageCenterZ}=PHOTO_TEMPLATE;
    const paper=root.getObjectByName('Paper_01');
    const backArtwork=new THREE.Group();backArtwork.name='backArtwork';top.add(backArtwork);
    // Real spacing keeps the print off its paper backing without slope-dependent
    // depth bias pulling it through the tray at grazing viewing angles.
    const offset=t*.04;
    const addPrint=(name,width,height,x,z,material)=>{
      const geometry=new THREE.PlaneGeometry(width,height);geometry.rotateX(Math.PI/2);ownGeometries.add(geometry);material.polygonOffset=false;ownMaterials.add(material);
      const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,-offset,z);mesh.receiveShadow=false;backArtwork.add(mesh);return mesh;
    };
    addPrint('BackImagingCoating',imageSide,imageSide,0,imageCenterZ,new THREE.MeshStandardMaterial({color:'#202224',roughness:.9,metalness:0}));
    addPrint('BackTopStrip',w*.19,h*.028,0,-h/2+PHOTO_TEMPLATE.topMargin*.48,new THREE.MeshStandardMaterial({color:'#303234',roughness:.88,metalness:0}));
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#b8b6b1';ctx.font='22px Arial';ctx.fillText('INSTANT FILM',8,34);ctx.fillText('BATCH 2026 / 001',8,70);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;ownTextures.add(texture);
    addPrint('BackBatchPrint',w*.23,h*.055,w*.30,h*.40,new THREE.MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,roughness:.8,metalness:0}));
    paper.userData.polaroidRole='frontFrame / sideThickness / backPanel';image.userData.polaroidRole='imagePlane';
  }
  const restY = top.position.y, restRotation = top.rotation.clone();
  const api = {
    root, top, image,
    setHover(amount) {
      if (disposed) return;
      const lift = THREE.MathUtils.clamp(amount, 0, 1);
      top.position.y = restY + lift * PHOTO_TEMPLATE.height * .02;
      top.rotation.set(restRotation.x + lift * THREE.MathUtils.degToRad(1.4), restRotation.y, restRotation.z + lift * THREE.MathUtils.degToRad(.6));
      onChange();
    },
    clearCover() {
      if (disposed) return;
      generation++;
      const old = image.material.map;
      image.material.map = null; image.material.color.set(PHOTO_TEMPLATE.imageColor);
      image.material.needsUpdate = true;
      if (ownTextures.has(old)) { old.dispose(); ownTextures.delete(old); }
      onChange();
    },
    async setCover(imageUrl) {
      if (disposed) throw new Error('This photo has been disposed.');
      if (!imageUrl) { api.clearCover(); return; }
      const ticket = ++generation;
      const texture = await new THREE.TextureLoader().loadAsync(imageUrl);
      if (disposed || generation !== ticket) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
      texture.anisotropy = Math.max(1, Math.min(16, anisotropy));
      const { width, height } = texture.image;
      // Match the square inset without stretching a future photograph.
      if (width > height) { texture.repeat.set(height / width, 1); texture.offset.set((1 - height / width) / 2, 0); }
      else if (height > width) { texture.repeat.set(1, width / height); texture.offset.set(0, (1 - width / height) / 2); }
      const old = image.material.map;
      ownTextures.add(texture); image.material.map = texture; image.material.color.set('#FFFFFF');
      image.material.needsUpdate = true;
      if (ownTextures.has(old)) { old.dispose(); ownTextures.delete(old); }
      onChange();
    },
    dispose() {
      if (disposed) return;
      disposed = true; generation++; root.removeFromParent();
      ownTextures.forEach(t => t.dispose()); ownMaterials.forEach(m => m.dispose()); ownGeometries.forEach(g=>g.dispose()); release(key, entry);
    },
  };
  // No placeholder text, no grey image, no fallback stock photograph.
  try { if (coverUrl) await api.setCover(coverUrl); }
  catch (error) { api.dispose(); throw error; }
  return api;
}

/** Compatible with the earlier createPhotoDeck({ coverUrl, index, id, ... }) API. */
export function createPhotoDeck(options = {}) {
  return createPrintAsset({
    url: new URL('../public/model/photo-deck-template-v2.glb', import.meta.url).href,
    ...options, single: false,
  });
}
export function createSinglePhoto(options = {}) {
  return createPrintAsset({
    url: new URL(PHOTO_TEMPLATE.modelUrl, document.baseURI).href,
    ...options, single: true,
  });
}

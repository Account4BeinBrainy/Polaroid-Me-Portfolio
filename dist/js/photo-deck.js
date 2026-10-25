import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const cache = new Map();
async function acquire(url) {
  const key = new URL(url, document.baseURI).href;
  let item = cache.get(key);
  if (!item) {
    item = { refs: 0, promise: new GLTFLoader().loadAsync(key) };
    cache.set(key, item);
    item.promise.catch(() => { if (cache.get(key) === item) cache.delete(key); });
  }
  item.refs++;
  try { const gltf = await item.promise; return { item, key, gltf }; }
  catch (e) { item.refs--; throw e; }
}
function release(key, item) {
  item.refs--;
  if (item.refs > 0) return;
  if (cache.get(key) === item) cache.delete(key);
  item.promise.then(({ scene }) => {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    scene.traverse(o => { if (!o.isMesh) return;
      geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        materials.add(m); for (const v of Object.values(m)) if (v?.isTexture) textures.add(v);
      }
    });
    geometries.forEach(x => x.dispose()); materials.forEach(x => x.dispose()); textures.forEach(x => x.dispose());
  }).catch(() => {});
}
function placeholderTexture(index = 0) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const ctx = c.getContext('2d');
  const palettes = [['#6d8079','#283e36'],['#a28b73','#5d5143'],['#70838c','#354b58'],['#8d858d','#524651'],['#8e9477','#535b3b']];
  const p = palettes[index % palettes.length];
  const g = ctx.createLinearGradient(0, 0, 460, 512); g.addColorStop(0,p[0]); g.addColorStop(1,p[1]);
  ctx.fillStyle=g; ctx.fillRect(0,0,512,512);
  // Deliberately neutral placeholder, not a fabricated project photograph.
  ctx.fillStyle='rgba(255,255,255,.13)'; ctx.fillRect(52,54,408,1); ctx.fillRect(52,458,408,1);
  ctx.fillStyle='rgba(255,255,255,.55)'; ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText('PROJECT COVER',256,253);ctx.fillText('Replace with your image',256,277);
  const t = new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.flipY=false; return t;
}

/** Returns an independent transform/state instance. Geometry is shared until last dispose. */
export async function createPhotoDeck({ url = new URL('../public/model/photo-deck.glb', import.meta.url).href, coverUrl = '', index = 0, id = '', anisotropy = 4 } = {}) {
  const { item, key, gltf } = await acquire(url);
  const root = gltf.scene.clone(true);
  root.name = id || `PhotoDeck_${index+1}`;
  const ownMaterials = new Set(), ownTextures = new Set(), materialMap = new Map();
  root.traverse(o => {
    if (!o.isMesh) return;
    const replace = original => {
      if (!materialMap.has(original)) { const m=original.clone(); materialMap.set(original,m);ownMaterials.add(m); }
      return materialMap.get(original);
    };
    o.material=Array.isArray(o.material)?o.material.map(replace):replace(o.material);
    o.castShadow=true; o.receiveShadow=true; o.userData.projectId=id;
  });
  const top = root.getObjectByName('Sheet_06'), image = root.getObjectByName('Image_06');
  if (!top || !image) { root.removeFromParent(); ownMaterials.forEach(m=>m.dispose());release(key,item); throw new Error('photo-deck.glb must include Sheet_06 and Image_06'); }
  // Each front-image material can be changed independently from the five lower sheets.
  image.material=image.material.clone(); ownMaterials.add(image.material);
  const topTexture=placeholderTexture(index); topTexture.anisotropy=anisotropy;ownTextures.add(topTexture);
  image.material.map=topTexture;image.material.color.set('#ffffff');image.material.needsUpdate=true;
  const originalY=top.position.y;
  let disposed=false, generation=0;
  const api={root,top,image,
    setHover(t){ if(!disposed) top.position.y=originalY+THREE.MathUtils.clamp(t,0,1)*.0015; },
    async setCover(url){
      const ticket=++generation;if(!url||disposed)return;
      const t=await new THREE.TextureLoader().loadAsync(url);
      if(disposed||ticket!==generation){t.dispose();return;}
      t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;t.anisotropy=anisotropy;
      // Square center crop via UV transform without changing the original image.
      const w=t.image.width,h=t.image.height;
      if(w>h){t.repeat.set(h/w,1);t.offset.set((1-h/w)/2,0);}else if(h>w){t.repeat.set(1,w/h);t.offset.set(0,(1-w/h)/2);}
      const old=image.material.map; image.material.map=t;ownTextures.add(t);image.material.needsUpdate=true;
      if(ownTextures.has(old)){old.dispose();ownTextures.delete(old);}
    },
    dispose(){ if(disposed)return;disposed=true;generation++;root.removeFromParent();ownTextures.forEach(t=>t.dispose());ownMaterials.forEach(m=>m.dispose());release(key,item); }
  };
  try { if(coverUrl) await api.setCover(coverUrl); } catch(e){api.dispose();throw e;}
  return api;
}

import { createPolaroidPaperMaterial } from './js/polaroid-paper-material.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { POLAROID_SPEC } from './js/polaroid-spec.js?v=integrated-20260927-3';
import { runIrisTransition } from './page-transition.js?v=navigation-20261001-1';
const showFilmBoxes = async () => (await import('./film-box-scene.js?v=mobile-history-20261001-1')).show();

import { createCameraIntro } from './camera-intro.js?v=camera-menu-modal-20260930-2';

// Slot in the normalized display group. Paper moves through the mouth, toward the viewer.
export const PHOTO = Object.freeze({
  PHOTO_SLOT_X: 0, PHOTO_SLOT_Y: 0, PHOTO_SLOT_Z: 0, // Offsets from measured opening
  PHOTO_WIDTH_RATIO: 0.96, PHOTO_EJECT_RATIO: 0.70,
  slope: 0.22, inset: 0.14, pressMs: 90, pauseMs: 150, ejectMs: 1960, faceMs: 200,
});
export async function installPhotoPrint({ THREE, host, renderer, camera, model, displayGroup,
  shutterButtonMesh, render, controls, groundY }) {
  // Audited inner slot lip on CameraBotton, not the decorative recess below the rainbow.
  const bottom = model.getObjectByName('CameraBotton');
  const vertices = bottom.geometry.attributes.position, lip = [];
  for (let i=0;i<vertices.count;i++) {
    if (Math.abs(vertices.getX(i)-0.001710)<0.000002 && Math.abs(vertices.getY(i)+0.017816)<0.000002)
      lip.push(bottom.localToWorld(new THREE.Vector3().fromBufferAttribute(vertices,i)));
  }
  if (lip.length < 4) throw new Error('Measured slot lip is missing');
  const bounds = new THREE.Box3().setFromPoints(lip);
  const slotWidth = bounds.max.x - bounds.min.x;
  const width = slotWidth * PHOTO.PHOTO_WIDTH_RATIO, height = width / POLAROID_SPEC.aspect;
  const measuredSlot = bounds.getCenter(new THREE.Vector3());
  measuredSlot.y += 0.0293; // Half the measured opening height, in normalized units.
  measuredSlot.z = new THREE.Box3().setFromObject(bottom).max.z;
  const direction = new THREE.Vector3(0, -PHOTO.slope, 1).normalize();
  const slot = measuredSlot.add(new THREE.Vector3(PHOTO.PHOTO_SLOT_X, PHOTO.PHOTO_SLOT_Y, PHOTO.PHOTO_SLOT_Z));
  const paper = new THREE.Group();
  paper.name = 'PrintedPhoto';
  // Local -Y is the direction of travel; local +Z is the front of the photograph.
  paper.rotation.x = Math.atan2(direction.z, -direction.y) * -1;
  const { scene: canonical } = await new GLTFLoader().loadAsync(POLAROID_SPEC.modelUrl);
  const factor = width / POLAROID_SPEC.width;
  const thickness = POLAROID_SPEC.thickness * factor;
  const geometry = name => canonical.getObjectByName(name).geometry.clone()
    .rotateX(Math.PI / 2).scale(factor, factor, factor).translate(0, 0, -thickness / 2);
  const material = createPolaroidPaperMaterial();
  const card = new THREE.Mesh(geometry('Paper_01'), material);
  card.castShadow = true; card.receiveShadow = true;
  const photoTexture = await new THREE.TextureLoader().loadAsync('/assets/camera/IMG_4101-srgb.png');
  photoTexture.colorSpace = THREE.SRGBColorSpace;
  photoTexture.flipY = false;
  // Cover the canonical square window without stretching or altering source colors.
  const photoAspect = photoTexture.image.width / photoTexture.image.height;
  if (photoAspect > 1) photoTexture.repeat.x = 1 / photoAspect;
  else photoTexture.repeat.y = photoAspect;
  photoTexture.offset.set((1 - photoTexture.repeat.x) / 2, (1 - photoTexture.repeat.y) / 2);
  const picture = new THREE.Mesh(geometry('Image_01'),
    new THREE.MeshBasicMaterial({ color: 0xffffff, map: photoTexture, toneMapped: false, depthTest: true, depthWrite: true }));
  picture.geometry.computeBoundingBox();
  const imageSize = picture.geometry.boundingBox.getSize(new THREE.Vector3());
  canonical.traverse(node => { if (node.isMesh) { node.geometry.dispose(); node.material.dispose(); } });
  const sheet = new THREE.Group();
  sheet.name = 'PhotoSheet';
  sheet.add(card, picture);
  paper.add(sheet);
  // Keep the leading edge inside the slot. A slot-space clip hides unprinted paper.
  const start = slot.clone().addScaledVector(direction, -height / 2 - PHOTO.inset);
  paper.position.copy(start);
  displayGroup.add(paper);
  // The exterior camera model is not a guaranteed watertight film chamber.
  // Do not draw hidden film at rest. During printing, draw only the part that
  // has crossed the mouth. This is a material-local world-space clip plane,
  // not a CSS overlay, black patch, paper recolor, or global depth override.
  const paperMeshes = [card, picture];
  const localExitPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -slot.z);
  const worldExitPlane = localExitPlane.clone();
  for (const mesh of paperMeshes) {
    mesh.renderOrder = 0;
    mesh.material.depthTest = true;
    mesh.material.depthWrite = true;
    mesh.material.clippingPlanes = [worldExitPlane];
    mesh.material.clipShadows = true;
    mesh.material.needsUpdate = true;
  }
  let debugHidden = false;
  function seatPaper() {
    // Recompute after a model rotation, not only when printing advances.
    displayGroup.updateWorldMatrix(true, false);
    worldExitPlane.copy(localExitPlane).applyMatrix4(displayGroup.matrixWorld);
    const leadingEdgeTravel = -sheet.position.y - PHOTO.inset;
    paper.visible = !debugHidden && leadingEdgeTravel > 0.000001;
    host.dataset.paperDepth = JSON.stringify({
      visible: paper.visible, leadingEdgeTravel,
      mode: 'slot-plane-clipping',
      debugHidden,
      localExitPlane: [...localExitPlane.normal.toArray(), localExitPlane.constant],
      worldExitPlane: [...worldExitPlane.normal.toArray(), worldExitPlane.constant],
      depthTest: true, depthWrite: true, renderOrder: 0,
      parent: paper.parent.name, localPosition: paper.position.toArray(),
      sheetLocalPosition: sheet.position.toArray(),
    });
  }
  seatPaper();
  const shutterAudio=new Audio('/assets/audio/polaroid_shutter_print_single.mp3');
  shutterAudio.preload='auto';
  shutterAudio.loop=false;
  shutterAudio.id='camera-shutter-audio';
  host.append(shutterAudio);
  const soundToggle=document.querySelector('#camera-sound-toggle');
  let soundEnabled=true;
  const stopAudio=()=>{shutterAudio.pause();shutterAudio.currentTime=0};
  const positionSoundToggle=()=>{
    if(sessionStorage.getItem('camera-menu-unlocked')!=='1')return;
    const menu=document.querySelector('.global-menu-toggle');if(!menu)return;
    const rect=menu.getBoundingClientRect();
    soundToggle.style.left=`${rect.right+14}px`;
    soundToggle.style.top=`${rect.top+(rect.height-soundToggle.offsetHeight)/2}px`;
  };
  document.addEventListener('camera-menu-unlocked',positionSoundToggle);
  window.addEventListener('resize',positionSoundToggle);
  document.fonts.ready.then(positionSoundToggle);
  positionSoundToggle();
  soundToggle.addEventListener('click',()=>{soundEnabled=!soundEnabled;soundToggle.dataset.sound=soundEnabled?'on':'off';soundToggle.querySelector('img').src=soundEnabled?'./assets/ui/minimal_music_note_button.png':'./assets/ui/muted_music_icon.png';soundToggle.setAttribute('aria-label',soundEnabled?'Turn sound off':'Turn sound on');soundToggle.setAttribute('aria-pressed',String(soundEnabled));if(!soundEnabled)stopAudio()});
  const intro=createCameraIntro(async()=>{
    if(host.dataset.phase!=='intro')return;
    document.body.dataset.cameraFirstExit='transitioning';
    stopAudio();
    host.dataset.phase='transitioning';
    let completed=false;
    try{
      completed=await runIrisTransition(async()=>{
        document.querySelector('#camera-page').hidden=true;
        document.querySelector('#film-box-page').hidden=false;
        await showFilmBoxes();
      });
    }finally{delete document.body.dataset.cameraFirstExit}
    if(completed){
      sessionStorage.setItem('camera-menu-unlocked','1');
      document.dispatchEvent(new Event('camera-menu-unlocked'));
    }
  });
  window.addEventListener('pagehide',event=>{stopAudio();if(!event.persisted)intro.dispose();});
  host.dataset.phase = 'idle';
  host.dataset.photo = JSON.stringify({ width, height, slotWidth, groundY, widthRatio: PHOTO.PHOTO_WIDTH_RATIO,
    ejectRatio: PHOTO.PHOTO_EJECT_RATIO, slot: slot.toArray(), thickness });
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  function hitShutter(event) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX-r.left)/r.width*2-1, 1-(event.clientY-r.top)/r.height*2);
    displayGroup.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const firstVisibleHit = () => raycaster.intersectObject(model, true).find(h => {
      for (let n=h.object; n; n=n.parent) if (!n.visible) return false;
      const m=Array.isArray(h.object.material) ? h.object.material[h.face.materialIndex] : h.object.material;
      return m.visible;
    });
    if(firstVisibleHit()?.object===shutterButtonMesh)return true;
    if(event.pointerType!=='touch')return false;
    const center=new THREE.Box3().setFromObject(shutterButtonMesh).getCenter(new THREE.Vector3()).project(camera);
    const x=r.left+(center.x+1)*r.width/2,y=r.top+(1-center.y)*r.height/2;
    if(Math.hypot(event.clientX-x,event.clientY-y)>22)return false;
    raycaster.setFromCamera(new THREE.Vector2(center.x,center.y),camera);
    return firstVisibleHit()?.object===shutterButtonMesh;
  }
  host.addEventListener('pointermove', e => {
    host.style.cursor = host.dataset.phase !== 'idle' ? 'default'
      : host.classList.contains('is-dragging') ? 'grabbing' : hitShutter(e) ? 'pointer' : 'grab';
  });
  function print() {
    if (host.dataset.phase !== 'idle') return;
    host.dataset.phase = 'printing'; host.style.cursor = 'default'; controls.lock();
    if(soundEnabled){stopAudio();shutterAudio.play().catch(()=>{});}
    const yaw = Math.atan2(Math.sin(displayGroup.rotation.y), Math.cos(displayGroup.rotation.y));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const speed = reduced ? 0.15 : 1;
    const faceMs = PHOTO.faceMs * speed;
    const startTime = performance.now();
    const rest = shutterButtonMesh.position.clone();
    function tick(now) {
      const elapsed = now - startTime;
      displayGroup.rotation.y = yaw * (1 - Math.min(1, elapsed / (faceMs || 1))) ** 3;
      const pressTime = (elapsed - faceMs) / speed;
      if (elapsed >= faceMs) host.dataset.phase = 'printing';
      // Audited button cap lies on local +Y; press into the body along local -Y.
      shutterButtonMesh.position.copy(rest);
      if (pressTime >= 0 && pressTime < PHOTO.pressMs)
        shutterButtonMesh.position.y -= Math.sin(Math.PI * pressTime / PHOTO.pressMs) * 0.0004;
      const t = Math.max(0, Math.min(1, (pressTime - PHOTO.pressMs - PHOTO.pauseMs) / PHOTO.ejectMs));
      // Cubic bezier (0.22, 1, 0.36, 1), invert its X component by bisection.
      let lo=0, hi=1;
      for(let i=0;i<16;i++) { const u=(lo+hi)/2, x=3*(1-u)**2*u*0.22+3*(1-u)*u*u*0.36+u**3; if(x<t)lo=u;else hi=u; }
      const progress = t===0 ? 0 : t===1 ? 1 : 1-(1-(lo+hi)/2)**3;
      // Only local Y moves. The mount and sheet's local X/Z depth stay fixed.
      sheet.position.y = -(height * PHOTO.PHOTO_EJECT_RATIO + PHOTO.inset) * progress;
      seatPaper();
      host.dataset.photoProgress = String(progress);
      if (t === 1) {
        stopAudio();
        host.dataset.phase='ready';
        paper.updateWorldMatrix(true, true);
        const paperBox = new THREE.Box3().setFromObject(paper);
        host.dataset.paperResult = JSON.stringify({
          exposedRatio: (-sheet.position.y - PHOTO.inset) / height,
          groundClearance: paperBox.min.y-groundY,
          pictureSquare: Math.abs(imageSize.x - imageSize.y) < 0.000001,
          yaw: displayGroup.rotation.y,
        });
        document.querySelector('#camera-status').textContent='相纸已吐出。';
        host.dataset.phase='intro';
        intro.open();
      }
      return t < 1;
    }
    controls.animate(tick);
  }
  host.addEventListener('click', e => { if (hitShutter(e)) print(); });
  // A keyboard-only shutter control shares exactly the same print action.
  document.querySelector('#shutter-keyboard').addEventListener('click', print);
  window.addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 'r' || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,textarea,[contenteditable="true"]')) return;
    if(host.dataset.phase!=='idle')return;
    host.dataset.phase='idle'; host.dataset.photoProgress='0'; delete host.dataset.paperResult;
    sheet.position.y = 0; seatPaper(); shutterButtonMesh.position.set(0,0,0);
    host.style.cursor='grab'; controls.reset();
    document.querySelector('#camera-status').textContent='';
  });
  const finalTip = slot.clone().addScaledVector(direction, height * PHOTO.PHOTO_EJECT_RATIO);
  if (finalTip.y - thickness < groundY) throw new Error('Photo path intersects studio ground');
  render();
  return {
    update: seatPaper,
    inspect: () => ({ ...JSON.parse(host.dataset.paperDepth),
      progress: Number(host.dataset.photoProgress || 0),
      photo: JSON.parse(host.dataset.photo),
    }),
    setDebugHidden(hidden) { debugHidden = Boolean(hidden); seatPaper(); },
  };
}

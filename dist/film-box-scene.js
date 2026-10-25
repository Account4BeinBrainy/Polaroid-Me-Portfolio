import {prefetchRoute} from './js/resource-loader.js';
import * as THREE from 'three';
import { createFilmBox } from './js/film-box-model.js?v=integrated-20260927-3';
import { BOX_GREEN } from './js/film-box-config.js?v=integrated-20260927-3';
import { navigateWithIris, revealArrival } from './portfolio-navigation.js?v=mobile-history-20261001-1';
import {enterMobileAccessories} from './mobile-history.js';
import { showIrisFailure } from './page-transition.js?v=navigation-20261001-1';
import { TURN } from './camera-controls.js?v=navigation-20261001-1';
import { responsiveProfile } from './responsive-profile.js';

import { createBoxAccessory } from './js/box-accessories.js?v=loading-20261001-1';

const host = document.querySelector('#film-box-page');
const canvasHost = host.querySelector('.film-box-canvas');
const errorPanel = host.querySelector('.film-box-error');
const slots = [...host.querySelectorAll('.film-box-link')];
const specs = [
  { color:'#008DDF', time:'2022-2026', label:'Professional\u00a0\u00a0Projects' },
  { color:'#FFB200', time:'2024-2026', label:'Certification & Achievement' },
  { color:BOX_GREEN, time:'2014-2026', label:'Life & Journey' },
];

let readyPromise, renderer, scene, camera, boxes = [], visible = false, frame = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

let held=null,hovered=-1,activeTouchIndex=-1,previous=0,blueEntering=false,entering=-1;
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
function screenRect(object) {
 let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;const point=new THREE.Vector3();
 object.updateWorldMatrix(true,true);object.traverse(node=>{if(!node.isMesh)return;node.geometry.computeBoundingBox();const bounds=node.geometry.boundingBox;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){point.set(x,y,z).applyMatrix4(node.matrixWorld).project(camera);const px=(point.x+1)*innerWidth/2,py=(1-point.y)*innerHeight/2;left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py)}});
 return {left,right,top,bottom};
}
function hintVisible(index,active){return index===0 ? blueEntering||active===0 : boxes[index].hintFits!==false&&index===active}
function positionAnnotations(){
 boxes.forEach((box,i)=>{const hitRect=screenRect(box.hitMesh||box.root),rect=box.update?screenRect(box.root):hitRect,label=box.annotation,title=label.querySelector('.film-box-annotation__title');
  const fitKey=`${innerWidth}:${innerHeight}`;if(box.titleFitKey!==fitKey){title.style.fontSize='';const width=title.getBoundingClientRect().width,maxWidth=innerWidth<700?innerWidth-40:Math.min(innerWidth-40,innerWidth/3-28);if(width>maxWidth)title.style.fontSize=`${parseFloat(getComputedStyle(title).fontSize)*maxWidth/width}px`;box.titleFitKey=fitKey}
  const size=label.getBoundingClientRect(),cx=(rect.left+rect.right)/2,y=rect.top-size.height-32;
  box.hintFits=y>=76&&cx-size.width/2>=18&&cx+size.width/2<=innerWidth-18;label.style.left=`${cx}px`;label.style.top=`${y}px`;label.classList.toggle('is-visible',hintVisible(i,held?.index??hovered));
  Object.assign(label.dataset,{centerX:cx.toFixed(2),boxTop:rect.top.toFixed(2),gap:(rect.top-y-size.height).toFixed(2)});
  slots[i].style.cssText=`position:fixed;left:${hitRect.left}px;top:${hitRect.top}px;width:${hitRect.right-hitRect.left}px;height:${hitRect.bottom-hitRect.top}px;`;
  slots[i].dataset.rotation=`0.00000,${box.pivot.rotation.y.toFixed(5)},0.00000`;
  const base=box.pivot.getWorldPosition(new THREE.Vector3());slots[i].dataset.base=`${base.x.toFixed(6)},${base.y.toFixed(6)},${base.z.toFixed(6)}`;slots[i].dataset.bottom=new THREE.Box3().setFromObject(box.root,true).min.y.toFixed(6);
 });
}
function hint(index){if(entering>=0)return;if(boxes[0]&&!blueEntering){if(index===0&&hovered!==0)boxes[0].liftHitRect=screenRect(boxes[0].root);if(index!==0)boxes[0].liftHitRect=null;setBlueLift(index===0?28:0,380)}hovered=index;boxes.forEach((box,i)=>{if(i>0){box.hintTarget=index===i?1:0;box.state=held?.index===i&&held.dragged?'dragging':index===i?'hovered':'idle'}});wake();boxes.forEach((box,i)=>box.annotation.classList.toggle('is-visible',hintVisible(i,held?.index??index)))}
function hit(event){const rect=canvasHost.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const mesh=ray.intersectObjects(boxes.map(b=>b.hitMesh||b.root),true)[0]?.object;if(!mesh){const r=boxes[0]?.liftHitRect;if(hovered===0&&r&&event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom)return 0;return -1;}return boxes.findIndex(b=>{let p=mesh;while(p){if(p===(b.hitMesh||b.root))return true;p=p.parent}return false})}
function wake(){if(visible&&!frame)frame=requestAnimationFrame(animate)}

function render() { if (renderer && !host.hidden) { renderer.render(scene, camera); positionAnnotations(); } }

function resize() {
  if (!renderer || host.hidden) return;
  const width = canvasHost.clientWidth, height = canvasHost.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false); camera.aspect = width / height;
  const profile = responsiveProfile();
  camera.position.z = profile.isMobilePortrait ? 8.8 : 7;
  // Mobile depth buffers must distinguish the cover and its 0.00012-unit print overlay.
  // Move only the clipping plane, not the viewpoint, FOV, composition or lights.
  camera.near = profile.isMobile ? camera.position.length() * .4 : .01;
  camera.updateProjectionMatrix();
  // Keep a real print-to-cover gap on mobile, including lower-precision depth buffers.
  const cover = boxes[0]?.outerCover, print = cover?.getObjectByName('FilmBoxFrame');
  if (print) {
    const surfaceZ = cover.geometry.boundingBox.max.z;
    print.userData.surfaceOffset ??= print.position.z - surfaceZ;
    print.position.z = surfaceZ + print.userData.surfaceOffset * (profile.isMobile ? 4 : 1);
  }
  // Fit the unchanged three-object composition as one unit on narrow screens.
  const fit = profile.isMobilePortrait ? Math.min(.48, width / height * .85) : 1;
  boxes.forEach((box, index) => {
    box.group.position.set((index - 1) * 1.75 * fit, 0, 0);
    box.group.scale.setScalar(9.5 * fit);
  });
  render();wake();
}

function setBlueLift(target,duration){
 const blue=boxes[0];if(!blue||blue.liftTarget===target)return;
 blue.liftFrom=blue.liftPixels;blue.liftTarget=target;blue.liftElapsed=0;blue.liftDuration=duration;wake();
}
// cubic-bezier(.22, 1, .36, 1), without a second animation loop.
function liftEase(progress){
 if(progress<=0||progress>=1)return progress;
 let low=0,high=1;
 for(let i=0;i<12;i++){const t=(low+high)/2,x=3*(1-t)*(1-t)*t*.22+3*(1-t)*t*t*.36+t*t*t;if(x<progress)low=t;else high=t}
 return 1-(1-(low+high)/2)**3;
}
function enter(index){
 if(entering>=0)return;
 if(index>0&&!boxes[index].interiorReady){
  boxes[index].prepareInterior().then(()=>{boxes[index].interiorReady=true;enter(index);}).catch(showIrisFailure);return;
 }
 if(index===0){blueEntering=true;hint(0);setBlueLift(70,750);entering=index;navigateWithIris(slots[index].href);return}
 hint(index);const box=boxes[index];
 if(index===2){
  box.update(1);scene.updateMatrixWorld(true);
  const albumBounds=new THREE.Box3().setFromObject(box.root,true),pouchBounds=new THREE.Box3().setFromObject(boxes[1].root,true);
  const gap=albumBounds.getSize(new THREE.Vector3()).x*.06;
  box.finalShift=Math.max(0,pouchBounds.max.x+gap-albumBounds.min.x)/box.group.getWorldScale(new THREE.Vector3()).x;
  box.update(box.opening,0);
 }
 box.state='activating';box.elapsed=0;box.openingFrom=box.opening;box.targetYaw=box.pivot.rotation.y;entering=index;wake();
}

function animate(now){frame=0;if(!visible)return;const dt=previous?Math.min(64,now-previous):16;previous=now;let moving=false;
 for(const [index,box] of boxes.entries()){
  const motionDt=box.motionTime&&now-box.motionTime<80?dt:16;box.motionTime=now;
  if(!box.update||!['activating','navigating'].includes(box.state)){
   const delta=box.targetYaw-box.pivot.rotation.y;
   if(Math.abs(delta)>.00001){box.pivot.rotation.y+=delta*(reduced.matches?1:1-Math.exp(-(box.update?motionDt:dt)/70));moving=true}else box.pivot.rotation.y=box.targetYaw;
  }
  if(!box.update)continue;
  const hintDelta=box.hintTarget-box.hintProgress;
  if(Math.abs(hintDelta)>.003){box.hintProgress+=hintDelta*(reduced.matches?1:1-Math.exp(-motionDt/55));moving=true}else box.hintProgress=box.hintTarget;
  if(!['activating','navigating'].includes(box.state)){
   const target=box.hintTarget*box.hoverOpening,delta=target-box.opening;
   if(Math.abs(delta)>.0005){box.opening+=delta*(reduced.matches?1:1-Math.exp(-motionDt/100));moving=true}else box.opening=target;
   if(box.lastOpening!==box.opening){box.update(box.opening,0);box.lastOpening=box.opening}
  }
  if(box.state==='activating'){
   box.elapsed+=motionDt;box.progress=Math.min(1,box.elapsed/(reduced.matches?150:box.duration));
   if(box.lastProgress!==box.progress){box.opening=box.openingFrom+(1-box.openingFrom)*liftEase(box.progress);box.update(box.opening,box.progress);if(box.finalShiftGroup)box.finalShiftGroup.position.x=box.finalShift*liftEase(box.progress);box.lastProgress=box.progress}
   moving=true;
   if(box.progress===1&&box.elapsed>=(reduced.matches?150:box.duration)+box.hold){box.state='navigating';navigateWithIris(slots[index].href,index===1?'orbit-ring-20260929-5':undefined)}
  }
  const showHint=box.hintFits!==false&&box.hintProgress>0;
  box.annotation.style.opacity=String(showHint?box.hintProgress:0);box.annotation.style.visibility=showHint?'visible':'hidden';box.annotation.style.transition='none';
  box.annotation.querySelector('.film-box-annotation__content').style.translate=`0 ${(1-box.hintProgress)*5}px`;
  Object.assign(slots[index].dataset,{openProgress:box.progress.toFixed(4),opening:box.opening.toFixed(4),state:box.state,finalShift:(box.finalShiftGroup?.position.x||0).toFixed(6)});
  slots[index].style.cursor=box.state==='dragging'?'grabbing':box.state==='activating'||box.state==='navigating'?'default':'grab';
 }

 const blue=boxes[0];if(blue){
  blue.liftElapsed+=dt;const progress=reduced.matches?1:Math.min(1,blue.liftElapsed/blue.liftDuration);
  blue.liftPixels=blue.liftFrom+(blue.liftTarget-blue.liftFrom)*liftEase(progress);if(progress<1)moving=true;
  const origin=blue.root.getWorldPosition(new THREE.Vector3()),a=origin.clone().project(camera),b=origin.clone().add(new THREE.Vector3(0,1,0)).project(camera);
  const pixelsPerWorld=Math.abs(b.y-a.y)*canvasHost.clientHeight/2,scale=blue.root.getWorldScale(new THREE.Vector3()).y;
  blue.outerCover.position.y=blue.liftBase+blue.liftPixels/Math.max(.001,pixelsPerWorld*scale);
 }
 render();if(moving)wake();
}

async function initialize() {
  const font = await new FontFace('Sound Seekers', 'url(/public/fonts/SoundSeekers-Regular.otf)').load();
  document.fonts.add(font);
  scene = new THREE.Scene(); scene.background = new THREE.Color('#F8F7F3');
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvasHost.append(renderer.domElement);
  camera = new THREE.PerspectiveCamera(28, 1, .01, 100); camera.position.set(0, .25, 7); camera.lookAt(0, .45, 0);
  scene.add(new THREE.HemisphereLight('#ffffff', '#d8d2c8', 2.3));
  const key = new THREE.DirectionalLight('#fff8ed', 3); key.position.set(-4, 6, 5); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); scene.add(key);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.ShadowMaterial({ color: 0x000000, opacity: .12 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.03; ground.receiveShadow = true; scene.add(ground);

  const blueItem=await createFilmBox(scene,{config:{BOX_GREEN:specs[0].color}});
  const footprint=new THREE.Box3().setFromObject(blueItem.root);
  boxes = await Promise.all(specs.map(async (spec, index) => {
    const item = index===0 ? blueItem : await createBoxAccessory(index,footprint);
    const group = new THREE.Group(); group.name = index===0?'FilmBoxYaw1':index===1?'PouchInteractionRoot':'AlbumInteractionRoot';
    scene.add(group); group.add(item.root);if(item.hitMesh)group.add(item.hitMesh);
    // One bottom-center yaw layer; inverse translation preserves the original GLB pose.
    const bounds=new THREE.Box3().setFromObject(item.root,index>0),center=bounds.getCenter(new THREE.Vector3()),pivot=new THREE.Group();center.y=bounds.min.y;pivot.name=index===0?'BoxYaw':index===1?'PouchYawGroup':'AlbumYawGroup';pivot.position.copy(center);group.add(pivot);pivot.add(item.root);item.root.position.sub(center);
    let finalShiftGroup=null;
    if(index===2){finalShiftGroup=new THREE.Group();finalShiftGroup.name='AlbumFinalShiftGroup';group.add(finalShiftGroup);finalShiftGroup.add(pivot);finalShiftGroup.add(item.hitMesh);}
    slots[index].querySelectorAll('.film-box-annotation').forEach(node => node.remove());
    const annotation = document.createElement('span'); annotation.className = 'film-box-annotation BoxHintGroup'; annotation.setAttribute('aria-hidden','true');
    annotation.innerHTML = `<span class="film-box-annotation__content"><span class="film-box-annotation__title">${spec.label}</span><span class="film-box-annotation__time">${spec.time}</span></span>`;
    slots[index].append(annotation);
    return { ...item, group, pivot, finalShiftGroup, finalShift:0, annotation, targetYaw: 0, liftBase:item.outerCover?.position.y||0, liftPixels:0, liftTarget:0, liftFrom:0, liftElapsed:380, liftDuration:380, liftHitRect:null };
  }));
  slots.forEach((slot,index)=>{slot.draggable=false;slot.addEventListener('focus',()=>hint(index));slot.addEventListener('blur',()=>{if(!held)hint(-1)});slot.addEventListener('click',event=>{event.preventDefault();if(event.detail===0)enter(index)})});
  host.addEventListener('pointerdown',event=>{if(!visible||entering>=0||held||!event.isPrimary||event.button!==0||event.target.closest('button,.global-menu-panel'))return;const index=hit(event);if(index<0){if(event.pointerType==='touch'){activeTouchIndex=-1;hint(-1)}return}event.preventDefault();const box=boxes[index];if(index>0)box.targetYaw=box.pivot.rotation.y;held={id:event.pointerId,index,x:event.clientX,y:event.clientY,max:0,dragged:false,startYaw:box.targetYaw};host.setPointerCapture(event.pointerId);hint(index)});
  host.addEventListener('pointermove',event=>{if(!visible||entering>=0)return;if(held){if(event.pointerId!==held.id)return;const dx=event.clientX-held.x,dy=event.clientY-held.y;held.max=Math.max(held.max,Math.hypot(dx,dy));held.dragged||=held.max>6;if(held.dragged){const box=boxes[held.index];box.targetYaw=held.startYaw+dx*TURN.speed;if(box.update)box.state='dragging';wake()}return}if(event.pointerType!=='touch')hint(hit(event))});
  function release(event,cancelled=false){if(!held||event.pointerId!==held.id)return;const state=held;held=null;if(host.hasPointerCapture(state.id))host.releasePointerCapture(state.id);if(cancelled||state.dragged){if(event.pointerType==='touch'){activeTouchIndex=-1;hint(-1)}else hint(hit(event));return}if(event.pointerType==='touch'||responsiveProfile().isMobile){if(activeTouchIndex===state.index)enter(state.index);else{activeTouchIndex=state.index;hint(state.index)}}else enter(state.index)}
  host.addEventListener('pointerup',event=>release(event));host.addEventListener('pointercancel',event=>release(event,true));host.addEventListener('lostpointercapture',event=>release(event,true));host.addEventListener('pointerleave',event=>{if(!held&&event.pointerType!=='touch')hint(-1)});
  window.addEventListener('blur',()=>{if(held){const state=held;held=null;if(host.hasPointerCapture(state.id))host.releasePointerCapture(state.id)}hint(-1)});
  window.addEventListener('resize', resize);
}

export function prepare() {
  if (!readyPromise) readyPromise = initialize().catch(error => {
    console.error('Film box page failed:', error);
    errorPanel.hidden = false; errorPanel.querySelector('[data-error]').textContent = error.message;
    return false;
  });
  return readyPromise;
}

export async function show() {
  const ok = await prepare(); visible = true; resize();
  await new Promise(resolve => requestAnimationFrame(() => { render(); resolve(); }));
  if (ok === false) throw new Error('Film box scene could not be prepared.');
  enterMobileAccessories();
  // Shells are usable now. Prepare hidden interiors afterwards, without blocking reveal.
  prefetchRoute('/professional-projects.html');
  for(const box of boxes.slice(1))if(!box.interiorReady){
    box.prepareInterior().then(()=>{box.interiorReady=true;wake();}).catch(showIrisFailure);
  }
  return ok;
}

function resetBoxes(){held=null;activeTouchIndex=-1;previous=0;blueEntering=false;entering=-1;boxes.forEach(box=>{box.liftPixels=box.liftTarget=box.liftFrom=0;box.liftElapsed=box.liftDuration;if(box.outerCover)box.outerCover.position.y=box.liftBase;if(box.finalShiftGroup){box.finalShiftGroup.position.x=0;box.finalShift=0}if(box.update){box.state='idle';box.elapsed=box.progress=box.opening=box.openingFrom=box.hintProgress=box.hintTarget=0;box.update(0);box.lastProgress=0;box.annotation.style.opacity='0';box.annotation.style.visibility='hidden'}});boxes.forEach(box=>{box.targetYaw=0;box.pivot.rotation.set(0,0,0)});hint(-1)}
export function hide(){visible=false;cancelAnimationFrame(frame);frame=0;if(held&&host.hasPointerCapture(held.id))host.releasePointerCapture(held.id);held=null;hint(-1)}
window.addEventListener('pagehide',hide);
window.addEventListener('pageshow',event=>{if(event.persisted&&!host.hidden){visible=true;previous=0;if(entering>=0)resetBoxes();resize();render();wake();}});

errorPanel.querySelector('[data-retry]').addEventListener('click', async () => {
  errorPanel.hidden = true; readyPromise = null; await show();
});
errorPanel.querySelector('[data-return]').addEventListener('click', () => {
  if(!document.querySelector('#camera-3d canvas')){navigateWithIris('/');return;}
  hide(); host.hidden = true; document.querySelector('#camera-page').hidden = false;
});

prepare();

if (new URLSearchParams(location.search).get('page') === 'boxes') {
  document.querySelector('#camera-page').hidden = true;
  host.hidden = false;
  show().then(() => { resetBoxes(); render(); return revealArrival(); })
    .catch(error => showIrisFailure(error));
}

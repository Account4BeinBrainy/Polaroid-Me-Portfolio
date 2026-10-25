import {loadImage} from './js/resource-loader.js';
import { TURN } from './camera-controls.js';
import { responsiveProfile } from './responsive-profile.js';
import { createCertificationModal } from './js/certification-modal.js?v=navigation-20261001-1';
import * as THREE from 'three';
import { certifications } from './js/certification-data.js?v=cert-modal-crop-20260930-2';
import { createCertificationModels } from './js/certification-model-viewer.js?v=loading-20261001-1';
import { orbitPose, advanceProgress, fitOrbit, chooseDepth } from './js/certification-orbit.js?v=cert-modal-crop-20260930-2';
import { navigateWithIris, revealArrival } from './portfolio-navigation.js?v=mobile-history-20261001-1';
import { showIrisFailure } from './page-transition.js?v=navigation-20261001-1';
const host=document.querySelector('#certificate-stage'),status=document.querySelector('.certificate-status'),back=document.querySelector('.portfolio-back');
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),canHover=matchMedia('(hover:hover) and (pointer:fine)');
const baseAngularVelocity=advanceProgress(0,1,false),maxDragVelocity=baseAngularVelocity*8;
const DESKTOP_LAYOUT={width:1440,height:774},MOBILE_SCENE_SCALE=.62,MOBILE_VIEW_SCALE=.72;
let currentPhase=0,currentAngularVelocity=baseAngularVelocity,dragVelocity=0,frame=0,lastTime=null,active=true,ready=false,paused=false,press=null,suppressClick=false,hoverAfter=0,activeItem=-1;
const pointer=new THREE.Vector2(2,2),raycaster=new THREE.Raycaster();
try{
 const view=await createCertificationModels(certifications,host);let radii={radiusX:0,radiusY:0};
 const modal=createCertificationModal(open=>{stop();pointer.set(2,2);paused=false;currentAngularVelocity=baseAngularVelocity;if(!open)schedule();});
 const hitTargets=view.models.map(item=>item.hit),modelMeshes=[];
 function prepareLayer(layer,model=false){layer.traverse(node=>{
   if(!node.isMesh)return;
   if(model)modelMeshes.push(node);
   node.material=(Array.isArray(node.material)?node.material:[node.material]).map(material=>{
    const copy=material.clone();copy.userData.fadeBase={opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite};return copy;
   });
   if(node.material.length===1)node.material=node.material[0];
  });}
 view.models.forEach(item=>{prepareLayer(item.filterLayer);item.onModelReady=loaded=>prepareLayer(loaded.modelLayer,true);});
 const smooth=(a,b,t)=>{const x=THREE.MathUtils.clamp((t-a)/(b-a),0,1);return x*x*(3-2*x);};
 function fade(layer,opacity){layer.visible=opacity>.002;if(!layer.visible)return;
  layer.traverse(node=>{if(!node.isMesh)return;
   for(const material of Array.isArray(node.material)?node.material:[node.material]){
    const base=material.userData.fadeBase,transparent=opacity<.999||base.transparent;
    if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true;}
    material.opacity=base.opacity*opacity;material.depthWrite=opacity>=.999&&base.depthWrite;
   }
  });
 }
 function updateFlips(dt){for(const item of view.models){
  const step=reduced.matches?1:Math.min(1,dt*2.5);
  const target=item.flipTarget&&item.modelReady?item.flipTarget:0;
  item.flipProgress+=Math.sign(target-item.flipProgress)*Math.min(Math.abs(target-item.flipProgress),step);
  const t=smooth(0,1,item.flipProgress);
  item.flip.rotation.y=t*Math.PI;
  item.hit.scale.setScalar(1+.125*t);
  fade(item.filterLayer,1-smooth(.38,.88,t));
  fade(item.modelLayer,smooth(.58,1,t));
  item.projection.material.opacity=item.projectionOpacity*item.wrapper.scale.x*(1-smooth(.38,.88,t));
  item.projection.visible=item.projection.material.opacity>.002;
 }}
 function updatePositions(){const count=view.models.length;view.models.forEach(({wrapper},index)=>{const p=orbitPose(currentPhase,index,radii.radiusX,radii.radiusY,radii.depthRadius||0,count);wrapper.position.x=p.x;wrapper.position.y=p.y;wrapper.position.z=p.z;wrapper.scale.setScalar(p.scale);});view.scene.updateMatrixWorld(true);}
 function setActiveItem(index){if(index>=0&&index!==activeItem){view.models[index].loadModel(1).catch(showIrisFailure);if(certifications[index].image)loadImage(certifications[index].image,{priority:2}).catch(()=>{});}activeItem=index;paused=index>=0;view.models.forEach((item,i)=>item.flipTarget=i===index?1:0);view.renderer.domElement.style.cursor=press?.dragging?'grabbing':paused?'pointer':'grab';}
 function hover(){if(!canHover.matches){paused=activeItem>=0;return;}if(press?.dragging||performance.now()<hoverAfter){setActiveItem(-1);return;}raycaster.setFromCamera(pointer,view.camera);const hit=raycaster.intersectObjects(hitTargets,false)[0];setActiveItem(hit?view.models.findIndex(item=>item.hit===hit.object):-1);}
 function pointAt(e){const r=host.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);raycaster.setFromCamera(pointer,view.camera);}
 function modelAtPoint(){const hit=raycaster.intersectObjects(modelMeshes,false)[0];if(!hit)return -1;let node=hit.object;while(node&&!view.models.some(m=>m.wrapper===node))node=node.parent;return view.models.findIndex(m=>m.wrapper===node);}
 function openModelModal(index){if(index>=0&&view.models[index].flipTarget===1&&view.models[index].flipProgress>.96)modal.open(certifications[index]);}
 function touchTap(e){pointAt(e);const modelIndex=modelAtPoint();if(modelIndex>=0&&modelIndex===activeItem&&view.models[modelIndex].flipProgress>.96){openModelModal(modelIndex);return;}const hit=raycaster.intersectObjects(hitTargets,false)[0];setActiveItem(hit?view.models.findIndex(item=>item.hit===hit.object):-1);}
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;const mobile=responsiveProfile().isMobile,layout=mobile?DESKTOP_LAYOUT:{width:w,height:h};const bounds=view.resize(w,h,layout.width,layout.height);radii=fitOrbit(layout.width,layout.height,bounds.halfWidth*1.07+.15,bounds.halfHeight*1.07+.15);radii.depthRadius=chooseDepth(radii.radiusX,radii.radiusY,bounds.halves);view.scene.scale.setScalar(mobile?MOBILE_SCENE_SCALE:1);if(mobile){const phi=8*Math.PI/180,xExtent=Math.hypot(radii.radiusX*Math.cos(phi),radii.radiusY*Math.sin(phi));const halfWidth=(xExtent+bounds.halfWidth+.3)*MOBILE_VIEW_SCALE/.9;view.camera.left=-halfWidth;view.camera.right=halfWidth;view.camera.top=halfWidth*h/w;view.camera.bottom=-view.camera.top;}view.camera.zoom=1;view.camera.updateProjectionMatrix();view.camera.position.set(.12,.73,4.8).normalize().multiplyScalar(8+radii.depthRadius);view.camera.lookAt(0,0,0);updatePositions();view.scene.updateMatrixWorld(true);view.fitShadows(radii);view.updateProjections();view.camera.updateMatrixWorld(true);hover();view.render();}
 function schedule(){if(!frame&&active&&ready&&!document.hidden&&!modal.isOpen)frame=requestAnimationFrame(tick);}
 function tick(now){frame=0;if(!active||document.hidden||modal.isOpen)return;const dt=lastTime===null?0:(now-lastTime)/1000;lastTime=now;hover();const accelerating=press?.dragging&&now-press.lastMove<=100,targetVelocity=accelerating?dragVelocity:baseAngularVelocity;currentAngularVelocity+=(targetVelocity-currentAngularVelocity)*(1-Math.exp(-dt/(accelerating ? .07 : TURN.returnMs/3000)));currentAngularVelocity=THREE.MathUtils.clamp(currentAngularVelocity,baseAngularVelocity,maxDragVelocity);if(!paused&&(!reduced.matches||press?.dragging))currentPhase+=currentAngularVelocity*dt;updatePositions();hover();updateFlips(Math.min(dt,.05));view.updateProjections();view.render();schedule();}
 function stop(){cancelAnimationFrame(frame);frame=0;lastTime=null;}
 host.addEventListener('pointerdown',e=>{if(press||!e.isPrimary||e.button!==0)return;suppressClick=false;press={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastTime:e.timeStamp,lastMove:e.timeStamp,maxDistance:0,dragging:false,touch:e.pointerType==='touch'||!canHover.matches};view.renderer.domElement.setPointerCapture(e.pointerId);});
 host.addEventListener('pointermove',e=>{if(press?.id===e.pointerId){press.maxDistance=Math.max(press.maxDistance,Math.hypot(e.clientX-press.x,e.clientY-press.y));if(press.maxDistance>TURN.threshold){press.dragging=true;const dt=Math.max((e.timeStamp-press.lastTime)/1000,.008),deltaX=e.clientX-press.lastX;dragVelocity=baseAngularVelocity+THREE.MathUtils.clamp(Math.abs(deltaX)/dt*TURN.speed/(2*Math.PI)*1.75,0,maxDragVelocity-baseAngularVelocity);press.lastMove=performance.now();pointer.set(2,2);}press.lastX=e.clientX;press.lastTime=e.timeStamp;}if(e.pointerType==='mouse'&&canHover.matches&&!press?.dragging){const r=host.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);}hover();});
 function endDrag(e){if(press?.id!==e.pointerId)return;const dragged=press.dragging||Math.hypot(e.clientX-press.x,e.clientY-press.y)>TURN.threshold,touch=press.touch;suppressClick=dragged||touch;if(dragged){hoverAfter=performance.now()+800;setActiveItem(-1);}else if(touch&&e.type==='pointerup')touchTap(e);press=null;if(view.renderer.domElement.hasPointerCapture(e.pointerId))view.renderer.domElement.releasePointerCapture(e.pointerId);hover();}
 host.addEventListener('pointerup',endDrag);host.addEventListener('pointercancel',endDrag);host.addEventListener('lostpointercapture',endDrag);
 host.addEventListener('click',e=>{if(suppressClick){suppressClick=false;return;}pointAt(e);openModelModal(modelAtPoint());});
 document.addEventListener('pointerup',e=>{if(!canHover.matches&&!host.contains(e.target))setActiveItem(-1);});
 host.addEventListener('pointerleave',()=>{pointer.set(2,2);paused=false;});
 document.addEventListener('visibilitychange',()=>{stop();if(!document.hidden)schedule();});
 addEventListener('pagehide',()=>{active=false;stop();if(press){const id=press.id;press=null;if(view.renderer.domElement.hasPointerCapture(id))view.renderer.domElement.releasePointerCapture(id);}pointer.set(2,2);currentAngularVelocity=baseAngularVelocity;});addEventListener('pageshow',()=>{active=true;lastTime=null;schedule();});
 reduced.addEventListener('change',()=>{lastTime=null;});
 back.addEventListener('click',e=>{e.preventDefault();active=false;stop();navigateWithIris('/?page=boxes');});
 const observer=new ResizeObserver(resize);observer.observe(host);resize();await document.fonts.ready;await view.renderer.compileAsync(view.scene,view.camera);view.render();status.textContent='';await revealArrival();ready=true;schedule();
 const order=[...view.models].sort((a,b)=>b.wrapper.position.z-a.wrapper.position.z);
 order.forEach((item,index)=>item.loadModel(index===0?2:3).catch(showIrisFailure));
}catch(error){console.error(error);status.textContent=`Certifications could not load: ${error.message}`;showIrisFailure(error);}

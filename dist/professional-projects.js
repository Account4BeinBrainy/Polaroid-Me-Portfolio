import {loadImage} from './js/resource-loader.js';
import * as THREE from 'three';
import { TURN } from './camera-controls.js?v=navigation-20261001-1';
import { createFilmBox } from './js/film-box-model.js?v=integrated-20260927-3';
import { createSinglePhoto, PHOTO_TEMPLATE } from '/js/photo-deck-template.js?v=integrated-20260927-3';
import { createProjectModal } from './js/project-modal.js?v=aurora-fixed-back-20260930-1';
import { projects } from './js/projects-data.js?v=aurora-fixed-back-20260930-1';
import { navigateWithIris, revealArrival } from './portfolio-navigation.js?v=mobile-history-20261001-1';
import { showIrisFailure } from './page-transition.js?v=navigation-20261001-1';
import { responsiveProfile } from './responsive-profile.js';

const host = document.querySelector('#deck-stage');
const status = host.querySelector('.deck-status');
const back = document.querySelector('.portfolio-back');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const canHover = matchMedia('(hover: hover) and (pointer: fine)');
const inspectMode=new URLSearchParams(location.search).get('inspect');
const animationRate=inspectMode==='slow'?.15:1, animationNow=()=>performance.now()*animationRate;
const liftDuration = 210, spreadDuration = 360, openStagger = 45, openBounce = .3;
back.addEventListener('click', event => { event.preventDefault(); navigateWithIris('/?page=boxes'); });

try {
  await document.fonts.ready;
  const renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Ten Polaroids in a film box');
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, .01, 10);

  // Same light colors, intensities and direction as Photo Boxes; shadow volume is model-sized.
  scene.add(new THREE.HemisphereLight('#ffffff', '#d8d2c8', 2.3));
  const key = new THREE.DirectionalLight('#fff8ed', 3);
  key.position.set(-4, 6, 5); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 1;
  Object.assign(key.shadow.camera, { left:-.24, right:.24, top:.24, bottom:-.24, near:7, far:10 });
  key.shadow.bias = 0; key.shadow.normalBias = 0; scene.add(key);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShadowMaterial({ color:0x000000, opacity:.12 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0; ground.receiveShadow = true; scene.add(ground);

  const display = new THREE.Group(); display.name = 'assemblyGroup'; display.scale.setScalar(1.25); scene.add(display);
  const box = await createFilmBox(scene, { config:{ BOX_GREEN:'#008DDF' } });
  const coverGroup = new THREE.Group(), trayGroup = new THREE.Group();
  coverGroup.name = 'outerCoverDisplayGroup'; trayGroup.name = 'innerTrayDisplayGroup';
  display.add(coverGroup, trayGroup); coverGroup.add(box.outerCover); trayGroup.add(box.innerTray);
  box.outerCover.position.set(0,0,0); box.innerTray.position.set(0,0,0);
  // Measure the original objects before any presentation rotation. Neither component is scaled.
  box.innerTray.updateMatrixWorld(true); box.outerCover.updateMatrixWorld(true);
  const innerSize = new THREE.Box3().setFromBufferAttribute(box.innerTray.geometry.getAttribute('position')).getSize(new THREE.Vector3());
  const outerSize = new THREE.Box3().setFromBufferAttribute(box.outerCover.geometry.getAttribute('position')).getSize(new THREE.Vector3());
  const modelMeasurements = { inner:innerSize.toArray(), outer:outerSize.toArray(), widthRatio:outerSize.x/innerSize.x, depthRatio:outerSize.z/innerSize.z };
  // Put the cover opening toward +X and the existing logo on the viewer-facing side.
  coverGroup.position.set(.003, 0, .067); coverGroup.rotation.set(-Math.PI/2, THREE.MathUtils.degToRad(75), 0, 'YXZ');
  trayGroup.position.set(.068, 0, .046); trayGroup.rotation.set(0, THREE.MathUtils.degToRad(-5), 0);
  const logo = box.outerCover.getObjectByName('FilmBoxSideLogo');
  logo.position.x *= -1; logo.rotation.y = -Math.PI/2;
  const placeOnGround = group => {
    display.updateMatrixWorld(true);
    group.position.y -= (new THREE.Box3().setFromObject(group, true).min.y - ground.position.y) / display.scale.y;
  };
  placeOnGround(coverGroup); placeOnGround(trayGroup);
  if (new URLSearchParams(location.search).has('inspect')) console.info('Project assembly measurements', JSON.stringify({ ...modelMeasurements, outerPosition:coverGroup.position.toArray(), innerPosition:trayGroup.position.toArray() }));

  // One yaw parent; preserve the existing assembly's world transform.
  const sceneRotationGroup = new THREE.Group(); sceneRotationGroup.name = 'sceneRotationGroup';
  const pivotBounds = new THREE.Box3().setFromObject(display, true);
  const pivotCenter = pivotBounds.getCenter(new THREE.Vector3()); pivotCenter.y = ground.position.y;
  sceneRotationGroup.position.copy(pivotCenter); scene.add(sceneRotationGroup);
  sceneRotationGroup.attach(display); sceneRotationGroup.updateMatrixWorld(true);
  const displayPivotOffset = display.position.clone();
  const placementRoot = new THREE.Group(); placementRoot.name = 'photoBoxPlacementRoot';
  scene.add(placementRoot); placementRoot.attach(sceneRotationGroup);

  const projectPhotos = await Promise.all(projects.map((project, index) => createSinglePhoto({
    index, solidBack:true, id:project.id, coverUrl:project.coverUrl, anisotropy:renderer.capabilities.getMaxAnisotropy()
  })));
  const fillerPhotos = await Promise.all(projects.map((_, index) => createSinglePhoto({
    index:index + projects.length, solidBack:true, id:`filler-${index + 1}`, coverUrl:'', anisotropy:renderer.capabilities.getMaxAnisotropy()
  })));
  const photos = [...projectPhotos, ...fillerPhotos];
  // Canonical Paper_01 already contains the bevel, continuous sides and sealed back.
  const stackSpacing=PHOTO_TEMPLATE.thickness+.00010;
  box.innerTray.geometry.computeBoundingBox();
  const trayGeometryBounds=box.innerTray.geometry.boundingBox;
  const stackGroup=new THREE.Group();stackGroup.name='insertedStackGroup';
  stackGroup.position.set(0,.002+.00010,(trayGeometryBounds.min.z+trayGeometryBounds.max.z)/2);trayGroup.add(stackGroup);
  const slotZ=index=>(photos.length-1)*stackSpacing/2-index*stackSpacing;
  const cards = [], fillers = [], hitboxes = [], hitGeometry = new THREE.BoxGeometry(PHOTO_TEMPLATE.width, PHOTO_TEMPLATE.height, PHOTO_TEMPLATE.thickness);
  const hitMaterial = new THREE.MeshBasicMaterial({ transparent:true, opacity:0, depthWrite:false, colorWrite:false });
  const preparePhoto = photo => {
    photo.root.rotation.x = Math.PI / 2;
  };
  photos.forEach(preparePhoto);
  fillerPhotos.forEach((photo, index) => {
    const group = new THREE.Group(); group.name = `fillerCardGroup_${index + 1}`;
    group.add(photo.root);
    group.position.set(0, PHOTO_TEMPLATE.height/2, slotZ(projects.length+index));
    stackGroup.add(group); fillers.push(group);
  });
  const openCardsGroup = new THREE.Group(); openCardsGroup.name = 'openCardsGroup'; stackGroup.add(openCardsGroup);
  projectPhotos.forEach((photo, index) => {
    const group = new THREE.Group(); group.name = `projectCardGroup_${index + 1}`;
    photo.root.traverse(node => { if (node.isMesh) node.userData.index = index; });
    group.add(photo.root);
    const closedPosition = new THREE.Vector3(0, PHOTO_TEMPLATE.height/2, slotZ(index));
    const openPosition = new THREE.Vector3(-.05 + (index - 2) * .066, closedPosition.y + .065 + (2-Math.abs(index-2))*.004, (2-index)*.004-stackGroup.position.z);
    const openRotation = new THREE.Euler(0, THREE.MathUtils.degToRad((index-2)*.8), THREE.MathUtils.degToRad((index-2)*2));
    group.position.copy(closedPosition); openCardsGroup.add(group);
    const hitbox = new THREE.Mesh(hitGeometry, hitMaterial);
    hitbox.position.copy(openPosition); hitbox.rotation.copy(openRotation);
    hitbox.userData.index = index; openCardsGroup.add(hitbox); hitboxes.push(hitbox);
    group.userData.closedPosition = closedPosition.clone(); group.userData.openPosition = openPosition.clone(); group.userData.openRotation = openRotation.clone();
    cards.push({ group, closedPosition, openPosition, openRotation, hover:0, hoverFrom:0, hoverTarget:0, hoverStarted:0 });
  });
  const boundsIn = (object, space) => {
    display.updateMatrixWorld(true); const result=new THREE.Box3().makeEmpty(), inverse=space.matrixWorld.clone().invert();
    object.traverse(mesh=>{if(!mesh.isMesh || mesh.material.colorWrite===false)return;mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox,m=new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);
      for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])result.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(m));});
    return result;
  };
  const trayBox=boundsIn(box.innerTray,trayGroup), firstCardBox=boundsIn(cards[0].group,openCardsGroup);
  const cardMinOffset=firstCardBox.min.y-cards[0].closedPosition.y, clearanceMargin=PHOTO_TEMPLATE.thickness*2;
  const rimTop=trayBox.max.y, clearanceY=rimTop+clearanceMargin-stackGroup.position.y-cardMinOffset;
  const trayVertices=box.innerTray.geometry.attributes.position;
  let frontRim=0;for(let i=0;i<trayVertices.count;i++)if(Math.abs(trayVertices.getZ(i)-trayGeometryBounds.max.z)<1e-7)frontRim=Math.max(frontRim,trayVertices.getY(i));
  function keepCardClear(card){
    const b=boundsIn(card.group,trayGroup);
    // Side rims slope in the actual GLB; a high rear rim must not create a final snap.
    const outsideSide=responsiveProfile().isMobile && (b.min.x<trayGeometryBounds.min.x || b.max.x>trayGeometryBounds.max.x);
    const rim=outsideSide ? rimTop : THREE.MathUtils.lerp(frontRim,rimTop,THREE.MathUtils.clamp((trayGeometryBounds.max.z-b.min.z)/(trayGeometryBounds.max.z-trayGeometryBounds.min.z),0,1));
    card.group.position.y+=Math.max(0,rim+clearanceMargin-b.min.y)/openCardsGroup.scale.y;
  }
  cards.forEach(card=>{card.clearPosition=card.closedPosition.clone();card.clearPosition.y=clearanceY;});
  const staggerSpan=(cards.length-1)*openStagger, liftEnd=liftDuration+staggerSpan, gatherEnd=spreadDuration+staggerSpan;
  const transitionDuration=liftEnd+spreadDuration+staggerSpan;

  const stackGeometry = new THREE.BoxGeometry(.106, .07, .03);
  const stackHitbox = new THREE.Mesh(stackGeometry, hitMaterial);
  stackHitbox.position.set(0, .092, -.01); trayGroup.add(stackHitbox);

  const arrowMarkup = '<svg viewBox="0 0 508 272" aria-hidden="true"><path d="M32 28C38 222 232 250 476 153M450 133l26 20-22 26"/></svg>';
  const closedAnnotation = document.createElement('div'); closedAnnotation.className = 'project-hover-annotation';
  closedAnnotation.innerHTML = `<span>Click</span>${arrowMarkup}`;
  const foldAnnotation = document.createElement('button'); foldAnnotation.type = 'button'; foldAnnotation.className = 'project-hover-annotation project-fold-annotation';
  foldAnnotation.innerHTML = `<span>Fold</span>${arrowMarkup}`;
  host.append(closedAnnotation, foldAnnotation);

  let running = true, frame = 0, state = 'closed', stackHovered = false, hovered = -1, touchStackActive = false, touchCardActive = -1, pointerDown = null, width = 1, height = 1, yawTarget = 0, previousTime = 0, transitionStarted = 0;
  let inspectionFrames=[];
  let openGroupScale = 1; const openGroupOffset = new THREE.Vector3();
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const setHovered = (index, touch=false) => {
    if (!running || state !== 'open' || (!canHover.matches&&!touch) || index === hovered) return;
    hovered = index; if(index>=0){const first=projects[index].slides?.[0]?.src;if(first)loadImage(first,{priority:2}).catch(()=>{});} const now = animationNow();
    cards.forEach((card, i) => {
      card.hoverFrom = card.hover; card.hoverTarget = i === index ? 1 : 0; card.hoverStarted = now;
      card.group.traverse(node => { if (node.isMesh) node.renderOrder = card.hoverTarget ? 1 : 0; });
    });
  };
  const openStack = () => {
    if (state !== 'closed') return;
    inspectionFrames=[]; state = 'opening'; transitionStarted = animationNow(); stackHovered = false; closedAnnotation.classList.remove('is-visible');
  };
  const closeStack = event => {
    event.stopPropagation();
    if (state !== 'open') return;
    setHovered(-1); inspectionFrames=[]; state = 'closing'; transitionStarted = animationNow(); foldAnnotation.classList.remove('is-visible');
  };
  foldAnnotation.addEventListener('click', closeStack);
  function aim(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((clientX - rect.left) / rect.width * 2 - 1, -((clientY - rect.top) / rect.height * 2 - 1));
    sceneRotationGroup.updateMatrixWorld(true); raycaster.setFromCamera(pointer, camera);
  }
  function hitProject(clientX, clientY) {
    aim(clientX, clientY);
    return raycaster.intersectObjects(hitboxes, false)[0]?.object.userData.index ?? -1;
  }
  function hitStack(clientX, clientY) {
    aim(clientX, clientY);
    return raycaster.intersectObject(stackHitbox, false).length > 0;
  }
  function updateHover(clientX, clientY) {
    if (!running || !canHover.matches || pointerDown?.dragged) return;
    if (state === 'closed') {
      stackHovered = hitStack(clientX, clientY); closedAnnotation.classList.toggle('is-visible', stackHovered);
      renderer.domElement.style.cursor = stackHovered ? 'pointer' : '';
    } else if (state === 'open') {
      const index = hitProject(clientX, clientY); setHovered(index);
      renderer.domElement.style.cursor = index < 0 ? '' : 'pointer';
    } else renderer.domElement.style.cursor = '';
  }
  renderer.domElement.style.touchAction = 'pan-y';
  renderer.domElement.addEventListener('pointermove', event => {
    if (pointerDown?.id === event.pointerId) {
      const dx=event.clientX-pointerDown.x, dy=event.clientY-pointerDown.y;
      pointerDown.max=Math.max(pointerDown.max,Math.hypot(dx,dy));
      pointerDown.dragged ||= pointerDown.max > 6;
      if(pointerDown.dragged) {
        if(event.pointerType==='touch'){touchStackActive=false;touchCardActive=-1}
        yawTarget=pointerDown.yaw+dx*TURN.speed;
        setHovered(-1,event.pointerType==='touch'); stackHovered=false; closedAnnotation.classList.remove('is-visible');
        return;
      }
    }
    updateHover(event.clientX,event.clientY);
  });
  renderer.domElement.addEventListener('pointerleave', event => {
    if(event.pointerType==='touch')return;
    if(pointerDown)return;
    stackHovered=false; closedAnnotation.classList.remove('is-visible'); setHovered(-1); renderer.domElement.style.cursor='';
  });
  renderer.domElement.addEventListener('pointerdown', event => {
    if(!running || pointerDown || event.button!==0 || !event.isPrimary || !['closed','open'].includes(state))return;
    aim(event.clientX,event.clientY);
    if(!raycaster.intersectObjects([box.outerCover,box.innerTray,...photos.map(photo=>photo.root)],true).length && !hitStack(event.clientX,event.clientY)){if(event.pointerType==='touch'){touchStackActive=false;touchCardActive=-1;setHovered(-1,true);stackHovered=false;closedAnnotation.classList.remove('is-visible')}return}
    pointerDown={id:event.pointerId,x:event.clientX,y:event.clientY,max:0,dragged:false,yaw:yawTarget,state,hit:state==='open'?hitProject(event.clientX,event.clientY):hitStack(event.clientX,event.clientY)};
    renderer.domElement.setPointerCapture(event.pointerId); event.preventDefault();
  });
  function finishPointer(event,cancelled=false) {
    if(pointerDown?.id!==event.pointerId)return;
    const held=pointerDown;
    held.max=Math.max(held.max,Math.hypot(event.clientX-held.x,event.clientY-held.y));
    held.dragged ||= held.max>6; pointerDown=null;
    if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId);
    if(!cancelled && !held.dragged && running) {
      if(state==='closed' && held.state==='closed' && held.hit && hitStack(event.clientX,event.clientY)){
        if(event.pointerType==='touch'&&!touchStackActive){touchStackActive=true;stackHovered=true;closedAnnotation.classList.add('is-visible')}
        else {touchStackActive=false;openStack()}
      }
      else if(state==='open' && held.state==='open') {
        const index=hitProject(event.clientX,event.clientY);
        if(index>=0 && index===held.hit){
          if(event.pointerType==='touch'&&touchCardActive!==index){touchCardActive=index;setHovered(index,true)}
          else modal.open(projects[index],renderer.domElement);
        }
      }
    }
    if(!cancelled)updateHover(event.clientX,event.clientY);
  }
  renderer.domElement.addEventListener('pointerup', event=>finishPointer(event));
  renderer.domElement.addEventListener('pointercancel', event=>finishPointer(event,true));
  renderer.domElement.addEventListener('lostpointercapture', event=>finishPointer(event,true));
  const cancelDrag=()=>{if(pointerDown)finishPointer({pointerId:pointerDown.id,clientX:pointerDown.x,clientY:pointerDown.y},true);};
  addEventListener('blur',cancelDrag);
  renderer.domElement.addEventListener('click', event=>event.preventDefault());
  const modal = createProjectModal({ projects, onStateChange(open) {
    running = !open;
    if (open) { cancelAnimationFrame(frame); renderer.render(scene, camera); }
    else { previousTime = 0; frame = requestAnimationFrame(tick); }
  }});

  function screenBounds(object) {
    object.updateMatrixWorld(true);
    const box3 = boundsIn(object,scene), min=box3.min, max=box3.max;
    const points = [
      [min.x,min.y,min.z],[max.x,min.y,min.z],[min.x,max.y,min.z],[max.x,max.y,min.z],
      [min.x,min.y,max.z],[max.x,min.y,max.z],[min.x,max.y,max.z],[max.x,max.y,max.z],
    ].map(([x,y,z]) => new THREE.Vector3(x,y,z).project(camera));
    const xs=points.map(p=>(p.x+1)*width/2), ys=points.map(p=>(1-p.y)*height/2);
    const left=Math.min(...xs), right=Math.max(...xs), top=Math.min(...ys), bottom=Math.max(...ys);
    return { left,right,top,bottom,width:right-left,height:bottom-top };
  }
  function projectTrayPoint(x,y,z) {
    const p=trayGroup.localToWorld(new THREE.Vector3(x,y,z)).project(camera);
    return { x:(p.x+1)*width/2, y:(1-p.y)*height/2 };
  }
  function applyOpenGroupTransform(progress) {
    const t=progress*progress*(3-2*progress);
    openCardsGroup.scale.setScalar(THREE.MathUtils.lerp(1,openGroupScale,t));
    openCardsGroup.position.copy(openGroupOffset).multiplyScalar(t);
  }
  function groupProgress(now=animationNow()) {
    const elapsed=now-transitionStarted;
    if(state==='opening')return THREE.MathUtils.clamp((elapsed-liftEnd)/gatherEnd,0,1);
    if(state==='closing')return 1-THREE.MathUtils.clamp(elapsed/gatherEnd,0,1);
    return state==='open'?1:0;
  }
  function layoutOpenCards() {
    const savedYaw=sceneRotationGroup.rotation.y; sceneRotationGroup.rotation.y=0; sceneRotationGroup.updateMatrixWorld(true);
    const saved = cards.map(card=>({ position:card.group.position.clone(), rotation:card.group.rotation.clone() }));
    const savedPosition=openCardsGroup.position.clone(), savedScale=openCardsGroup.scale.x;
    openCardsGroup.position.set(0,0,0); openCardsGroup.scale.setScalar(1);
    cards.forEach(card=>{ card.group.position.copy(card.openPosition); card.group.rotation.copy(card.openRotation); });
    display.updateMatrixWorld(true);
    const raw=screenBounds(openCardsGroup), tray=screenBounds(box.innerTray);
    const widthScale=width*.72/raw.width;
    const heightScale=(tray.top-Math.max(82,height*.105))/(raw.height*.75);
    openGroupScale=THREE.MathUtils.clamp(Math.min(widthScale,heightScale),.42,.82);
    openCardsGroup.scale.setScalar(openGroupScale); display.updateMatrixWorld(true);
    const p0=projectTrayPoint(0,0,0), px=projectTrayPoint(.01,0,0), py=projectTrayPoint(0,.01,0);
    const ax=(px.x-p0.x)/.01, ay=(px.y-p0.y)/.01, bx=(py.x-p0.x)/.01, by=(py.y-p0.y)/.01, det=ax*by-ay*bx;
    openGroupOffset.set(0,0,0);
    const leftBiasPx=Math.min(24,width*.015);
    for (let pass=0; pass<3; pass++) {
      openCardsGroup.position.copy(openGroupOffset); display.updateMatrixWorld(true);
      const current=screenBounds(openCardsGroup);
      const boxCenterX=(tray.left+tray.right)/2, cardsCenterX=(current.left+current.right)/2;
      const deltaX=boxCenterX-cardsCenterX-leftBiasPx, deltaY=tray.top+current.height*.25-current.bottom;
      openGroupOffset.x+=(deltaX*by-bx*deltaY)/det;
      openGroupOffset.y+=(ax*deltaY-deltaX*ay)/det;
    }
    // Adjust only the five-card parent; closed stack and local fan remain unchanged.
    const floatingHeight=boundsIn(openCardsGroup,stackGroup).getSize(new THREE.Vector3()).y;
    openGroupOffset.y+=floatingHeight*.10;
    openGroupScale*=1.10;
    sceneRotationGroup.rotation.y=savedYaw; sceneRotationGroup.updateMatrixWorld(true);
    cards.forEach((card,index)=>{ card.group.position.copy(saved[index].position); card.group.rotation.copy(saved[index].rotation); });
    openCardsGroup.position.copy(savedPosition); openCardsGroup.scale.setScalar(savedScale);
    if (state === 'closed') applyOpenGroupTransform(0);
    else if (state === 'open') applyOpenGroupTransform(1);
    else {
      applyOpenGroupTransform(groupProgress());
    }
  }
  function updateAnnotations() {
    if (state === 'closed' && stackHovered) {
    trayGroup.updateMatrixWorld(true);
    const p = trayGroup.localToWorld(new THREE.Vector3(-PHOTO_TEMPLATE.width / 2, .125, -.01)).project(camera);
      closedAnnotation.style.left = `${(p.x + 1) * width / 2 - 32}px`;
      closedAnnotation.style.top = `${(1 - p.y) * height / 2 - 18}px`;
      if (responsiveProfile().isMobilePortrait) {
        const tray=screenBounds(box.innerTray), label=closedAnnotation.getBoundingClientRect();
        closedAnnotation.style.left=`${Math.max(label.width+12,tray.left+30)}px`;
        closedAnnotation.style.top=`${tray.top-label.height-12}px`;
      }
    }
    if (foldAnnotation.classList.contains('is-visible')) {
      const bounds=screenBounds(openCardsGroup);
      const mobile=responsiveProfile().isMobilePortrait;
      foldAnnotation.style.left=`${mobile ? Math.max(foldAnnotation.getBoundingClientRect().width+12,bounds.left-14) : bounds.left-14}px`;
      foldAnnotation.style.top=`${mobile ? Math.max(82,bounds.top-foldAnnotation.getBoundingClientRect().height-10) : Math.max(82,height*.105,bounds.top+12)}px`;
    }
  }
  function resize() {
    width = host.clientWidth || 1; height = host.clientHeight || 1;
    renderer.setSize(width, height, false); camera.aspect = width / height;
    const mobile = responsiveProfile().isMobile;
    placementRoot.scale.setScalar(1);
    placementRoot.position.x = 0;
    sceneRotationGroup.position.copy(pivotCenter);
    display.position.copy(displayPivotOffset);
    const distance = Math.max(1, 1.25 / camera.aspect);
    const target = new THREE.Vector3(0, .095, .025);
    camera.position.copy(target).add(new THREE.Vector3(.11, .21, .59).multiplyScalar(distance));
    camera.lookAt(target);
    // Keep paper/back-print depth distinct from the tray on lower-precision mobile GPUs.
    // Every assembly angle stays well beyond this plane; desktop projection is unchanged.
    camera.near = mobile ? camera.position.distanceTo(target) * .4 : .01;
    camera.updateProjectionMatrix(); layoutOpenCards();
    const mobilePivotOffset = mobile ? .053 : 0;
    sceneRotationGroup.position.x = pivotCenter.x + mobilePivotOffset;
    display.position.x = displayPivotOffset.x - mobilePivotOffset;
    placementRoot.scale.setScalar(mobile ? .72 : 1);
    placementRoot.position.x = mobile ? -.018 : 0;
    renderer.render(scene, camera); updateAnnotations();
    if (new URLSearchParams(location.search).has('inspect')) {
      display.updateMatrixWorld(true);
      console.info('Project hit points', JSON.stringify(hitboxes.map((mesh,index) => {
        const point = mesh.localToWorld(new THREE.Vector3(0, 0, 0)).project(camera);
        const bounds=host.getBoundingClientRect();
        return { index, x:bounds.left+(point.x+1)*width/2, y:bounds.top+(1-point.y)*height/2 };
      })));
      console.assert(coverGroup.scale.equals(trayGroup.scale) && trayGroup.scale.equals(new THREE.Vector3(1,1,1)), 'Component scales must remain 1');
      console.assert(Math.abs(new THREE.Box3().setFromObject(box.innerTray,true).min.y-ground.position.y)<1e-8 && Math.abs(new THREE.Box3().setFromObject(box.outerCover,true).min.y-ground.position.y)<1e-8, 'Both components must contact ground');
    }


  }
  function tick(now) {
    now*=animationRate;
    if (!running) return;
    const dt = Math.min(.05, (now - (previousTime || now))/1000); previousTime = now;
    sceneRotationGroup.rotation.y = reduced.matches ? yawTarget : THREE.MathUtils.damp(sceneRotationGroup.rotation.y, yawTarget, 1000/70, dt);
    if (Math.abs(sceneRotationGroup.rotation.y-yawTarget)<.00001) sceneRotationGroup.rotation.y=yawTarget;
    sceneRotationGroup.updateMatrixWorld(true);
    host.dataset.sceneYaw=sceneRotationGroup.rotation.y.toFixed(6);
    host.dataset.scenePivot=sceneRotationGroup.position.toArray().join(',');
    const openGroupProgress=groupProgress(now); applyOpenGroupTransform(openGroupProgress);
    foldAnnotation.classList.toggle('is-visible', state === 'open' || (state === 'opening' && openGroupProgress >= .68));
    cards.forEach((card,index) => {
      if (state === 'opening') {
        const liftT=reduced.matches?1:THREE.MathUtils.clamp((now-transitionStarted-index*openStagger)/liftDuration,0,1),liftEase=liftT*liftT*(3-2*liftT);
        card.group.position.lerpVectors(card.closedPosition,card.clearPosition,liftEase);card.group.rotation.set(0,0,0);
        const spreadT=reduced.matches?1:THREE.MathUtils.clamp((now-transitionStarted-liftEnd-index*openStagger)/spreadDuration,0,1);
        if(spreadT>0){const overshoot=1.70158*openBounce,eased=1+(overshoot+1)*(spreadT-1)**3+overshoot*(spreadT-1)**2;
          card.group.position.lerpVectors(card.clearPosition,card.openPosition,eased);card.group.rotation.set(card.openRotation.x*eased,card.openRotation.y*eased,card.openRotation.z*eased);
          keepCardClear(card);
        }
      } else if (state === 'closing') {
        const reverseIndex=cards.length-1-index;
        const gatherT=reduced.matches?1:THREE.MathUtils.clamp((now-transitionStarted-reverseIndex*openStagger)/spreadDuration,0,1),gatherEase=gatherT*gatherT*(3-2*gatherT);
        card.group.position.lerpVectors(card.openPosition,card.clearPosition,gatherEase);card.group.rotation.set(card.openRotation.x*(1-gatherEase),card.openRotation.y*(1-gatherEase),card.openRotation.z*(1-gatherEase));
        keepCardClear(card);
        const insertT=reduced.matches?1:THREE.MathUtils.clamp((now-transitionStarted-gatherEnd-reverseIndex*openStagger)/liftDuration,0,1);
        if(insertT>0){const insertEase=insertT*insertT*(3-2*insertT);card.group.position.lerpVectors(card.clearPosition,card.closedPosition,insertEase);card.group.rotation.set(0,0,0);}
      } else if (state === 'open') {
        const t = reduced.matches ? 1 : Math.min(1, (now-card.hoverStarted)/180);
        card.hover = THREE.MathUtils.lerp(card.hoverFrom, card.hoverTarget, t*t*(3-2*t));
        card.group.position.copy(card.openPosition); card.group.position.z += card.hover * .006;
        card.group.rotation.copy(card.openRotation);
        if (responsiveProfile().isMobile) keepCardClear(card);
      }
    });
    if (state === 'opening' && (reduced.matches || now >= transitionStarted + transitionDuration)) {
      state = 'open'; applyOpenGroupTransform(1); foldAnnotation.classList.add('is-visible');
      cards.forEach(card => { card.group.position.copy(card.openPosition); card.group.rotation.copy(card.openRotation); if (responsiveProfile().isMobile) keepCardClear(card); });
    }
    if (state === 'closing' && (reduced.matches || now >= transitionStarted + transitionDuration)) {
      state='closed';applyOpenGroupTransform(0);hovered=-1;
      cards.forEach(card=>{card.hover=card.hoverTarget=0;card.group.position.copy(card.closedPosition);card.group.rotation.set(0,0,0);});
    }
    if (new URLSearchParams(location.search).has('inspect')) { const stackPoint=stackHitbox.localToWorld(new THREE.Vector3()).project(camera); host.dataset.hoverState = JSON.stringify({state, stackHovered, hovered, structure:{stackSpacing,thickness:PHOTO_TEMPLATE.thickness,stackPivot:stackGroup.position.toArray(),cards:photos.map(p=>({id:p.root.name,meshes:(()=>{const names=[];p.root.traverse(o=>{if(o.isMesh)names.push(o.name);});return names;})()})),cardBounds:cards.map(c=>{const b=boundsIn(c.group,trayGroup);return{min:b.min.toArray(),max:b.max.toArray()};}),fillerBounds:fillers.map(c=>{const b=boundsIn(c,trayGroup);return{min:b.min.toArray(),max:b.max.toArray()};})},yaw:sceneRotationGroup.rotation.y,pivot:sceneRotationGroup.position.toArray(),boxBottoms:[box.outerCover,box.innerTray].map(object=>new THREE.Box3().setFromObject(object,true).min.y),projectPoints:hitboxes.map(mesh=>{const p=mesh.localToWorld(new THREE.Vector3()).project(camera);return [(p.x+1)*width/2,(1-p.y)*height/2];}), phase:{rimTop,clearanceY,clearanceMargin,elapsed:now-transitionStarted,groupProgress:openGroupProgress},stackPoint:[(stackPoint.x+1)*width/2,(1-stackPoint.y)*height/2],openGroup:{scale:openCardsGroup.scale.x,position:openCardsGroup.position.toArray(),bounds:screenBounds(openCardsGroup),trayBounds:screenBounds(box.innerTray)}, projects:cards.map(card=>({position:card.group.position.toArray(),rotation:card.group.rotation.toArray().slice(0,3)})), fillers:fillers.map(group=>group.position.toArray())}); }
    if(inspectMode==='slow'){if(['opening','closing'].includes(state))inspectionFrames.push(JSON.parse(host.dataset.hoverState));else if(inspectionFrames.length){inspectionFrames.push(JSON.parse(host.dataset.hoverState));host.dataset.motionFrames=JSON.stringify(inspectionFrames);inspectionFrames=[];}}
    updateAnnotations(); renderer.render(scene, camera); frame = requestAnimationFrame(tick);
  }

  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  await new Promise(requestAnimationFrame); renderer.render(scene, camera); status.textContent = ''; frame = requestAnimationFrame(tick);
  await revealArrival();
  let suspendedAt=0, resumeRunning=false;
  addEventListener('pageshow',event=>{if(!event.persisted)return;transitionStarted+=animationNow()-suspendedAt;previousTime=0;running=resumeRunning;cancelAnimationFrame(frame);if(running)frame=requestAnimationFrame(tick);});
  addEventListener('pagehide', event => {
    cancelDrag();
    if(event.persisted){suspendedAt=animationNow();resumeRunning=running;running=false;cancelAnimationFrame(frame);return;}
    removeEventListener('blur',cancelDrag); running=false; cancelAnimationFrame(frame); observer.disconnect(); modal.dispose(); photos.forEach(photo=>photo.dispose()); box.dispose();
    stackGeometry.dispose(); hitGeometry.dispose(); hitMaterial.dispose(); ground.geometry.dispose(); ground.material.dispose(); renderer.dispose(); closedAnnotation.remove(); foldAnnotation.remove();
  });
} catch (error) {
  console.error(error); status.textContent = `Projects could not load: ${error.message}`; showIrisFailure(error);
}

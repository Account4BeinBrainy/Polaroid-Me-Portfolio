const ANNOTATION_Z_OFFSET = 0.035;
export async function createAnnotation(THREE, displayGroup, shutterButtonMesh, host, camera, model) {
  const font = new FontFace('SoundSeekers', 'url(/public/fonts/SoundSeekers-Regular.otf)');
  document.fonts.add(await font.load());
  const annotationGroup = new THREE.Group();
  annotationGroup.name = 'annotationGroup';
  displayGroup.add(annotationGroup);
  displayGroup.updateMatrixWorld(true);
  // The extracted button retains source vertices, so its origin is not its cap center.
  const geometry = shutterButtonMesh.geometry, points = [];
  for (const i of new Set(geometry.index.array))
    points.push(new THREE.Vector3().fromBufferAttribute(geometry.attributes.position, i));
  const box = new THREE.Box3().setFromPoints(points);
  const centerOffset = box.getCenter(new THREE.Vector3())
    .applyMatrix3(new THREE.Matrix3().setFromMatrix4(shutterButtonMesh.matrixWorld));
  const target = shutterButtonMesh.getWorldPosition(new THREE.Vector3()).add(centerOffset);
  const buttonBox = new THREE.Box3().setFromPoints(points.map(p => shutterButtonMesh.localToWorld(p)));
  const diameter = buttonBox.max.x - buttonBox.min.x;
  displayGroup.worldToLocal(target);
  annotationGroup.position.copy(target).add(new THREE.Vector3(-diameter * 0.56, diameter * 0.1, ANNOTATION_Z_OFFSET));
  annotationGroup.updateWorldMatrix(true, false);
  const tip = annotationGroup.worldToLocal(displayGroup.localToWorld(annotationGroup.position.clone()));
  const canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');
  ctx.font = '480px SoundSeekers';
  // Preserve the original texture bounds and glyph scale when shortening the label.
  canvas.width = 1721; canvas.height = 720;
  ctx = canvas.getContext('2d'); ctx.font = '480px SoundSeekers';
  ctx.fillStyle = '#171717'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('Press', canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const textMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false, side: THREE.DoubleSide, toneMapped: false });
  const textWidth = diameter * 1.85 * 3;
  const text = new THREE.Mesh(new THREE.PlaneGeometry(textWidth, textWidth * canvas.height / canvas.width), textMaterial);
  text.position.set(-diameter * 3.8, diameter * 2.2, 0);
  annotationGroup.add(text);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512" viewBox="0 0 512 256"><path d="M 32 28 C 38 222 232 250 476 153 M 450 133 L 476 153 L 454 179" fill="none" stroke="#171717" stroke-width="6.43" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const bitmap = new Image();
  bitmap.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await bitmap.decode();
  const arrowTexture = new THREE.Texture(bitmap); arrowTexture.colorSpace = THREE.SRGBColorSpace; arrowTexture.needsUpdate = true;
  const arrowMaterial = new THREE.MeshBasicMaterial({ map: arrowTexture, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false, side: THREE.DoubleSide, toneMapped: false });
  const w = diameter * 2.65 * 1.4, h = w / 2;
  const arrow = new THREE.Mesh(new THREE.PlaneGeometry(w, h), arrowMaterial);
  // SVG endpoint (476,153) is exactly the target, not the plane's center.
  arrow.position.set(tip.x - (476/512 - 0.5)*w, tip.y - (0.5 - 153/256)*h, 0);
  annotationGroup.add(arrow);
  // Only these annotation planes overlay depth; camera/Glass retain normal depth testing.
  for (const mesh of [text, arrow]) { mesh.raycast = () => {}; mesh.renderOrder = 10; }
  const anchor = annotationGroup.position.clone();
  const mobile = matchMedia('(max-width: 600px)');
  // Screen-space mobile label: the 3D version remains unchanged on desktop.
  const mobileLabel = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  mobileLabel.setAttribute('aria-hidden', 'true');
  mobileLabel.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;overflow:visible;display:none';
  mobileLabel.innerHTML = '<text fill="#171717" font-family="SoundSeekers" dominant-baseline="hanging">Press</text><path fill="none" stroke="#171717" stroke-linecap="round" stroke-linejoin="round"/>';
  host.closest("#camera-page").append(mobileLabel);
  const mobileText = mobileLabel.querySelector('text'), mobileArrow = mobileLabel.querySelector('path');
  const modelPoints = [], seen = new Set();
  model.updateWorldMatrix(true, true);
  model.traverse(mesh => {
    if (!mesh.isMesh) return;
    const positions = mesh.geometry.attributes.position;
    const indices = mesh.geometry.index?.array ?? Array.from({length:positions.count}, (_, i) => i);
    for (const index of indices) {
      const p = displayGroup.worldToLocal(mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(positions, index)));
      const key = p.toArray().map(v => v.toFixed(6)).join(',');
      if (!seen.has(key)) { seen.add(key); modelPoints.push(p); }
    }
  });
  function updateMobile(rect, shutter, opacity) {
    const points = modelPoints.map(p => displayGroup.localToWorld(p.clone()).project(camera));
    const xs = points.map(p => rect.left + (p.x + 1) * rect.width / 2);
    const ys = points.map(p => rect.top + (1 - p.y) * rect.height / 2);
    const bounds = {left:Math.min(...xs), right:Math.max(...xs), top:Math.min(...ys), bottom:Math.max(...ys)};
    const scale = Math.max(.65, Math.min(1, (bounds.right - bounds.left) / 340));
    const gap = Math.max(12, 20 * scale), inset = 8;
    ctx.font = '100px SoundSeekers';
    const emWidth = ctx.measureText('Press').width / 100;
    const available = bounds.left - gap - inset;
    const fontSize = Math.max(16, Math.min(30 * scale, available / emWidth));
    const textWidth = fontSize * emWidth;
    const left = Math.max(inset, Math.min(innerWidth - textWidth - inset, bounds.left - gap - textWidth));
    const shutterY = rect.top + (1 - shutter.y) * rect.height / 2;
    const fitsBeside = left + textWidth <= bounds.left - gap + .1;
    const top = Math.max(inset, fitsBeside ? shutterY - fontSize - 32 * scale : bounds.top - gap - fontSize);
    mobileText.setAttribute('x', left); mobileText.setAttribute('y', top);
    mobileText.setAttribute('font-size', fontSize);
    // The arrow stays outside the model silhouette and points horizontally toward the shutter.
    const tipX = Math.max(inset + 8 * scale, bounds.left - gap);
    const tipY = rect.top + (1 - shutter.y) * rect.height / 2;
    const startX = left + textWidth / 2, startY = top + fontSize + 5 * scale;
    const corridor = Math.max(inset, tipX - 18 * scale), head = 6 * scale;
    mobileArrow.setAttribute('d', `M ${startX} ${startY} C ${corridor} ${startY + 28 * scale}, ${corridor} ${tipY}, ${tipX} ${tipY} M ${tipX-head} ${tipY-head*.65} L ${tipX} ${tipY} L ${tipX-head} ${tipY+head*.65}`);
    mobileArrow.setAttribute('stroke-width', 1.4 * scale);
    mobileLabel.style.opacity = opacity;
    host.dataset.mobileAnnotation = JSON.stringify({bounds,scale,gap,label:{left,top,width:textWidth,height:fontSize},tip:{x:tipX,y:tipY},shutter:{x:rect.left+(shutter.x+1)*rect.width/2,y:tipY}});
  }
  window.addEventListener('pagehide', event => {if(!event.persisted)mobileLabel.remove();});
  function update() {
    // Apply the final CSS-pixel offset after the display group's animated transform.
    const rect = host.querySelector('canvas').getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const projectedShutter = displayGroup.localToWorld(target.clone()).project(camera);
    const projectedAnchor = displayGroup.localToWorld(anchor.clone()).project(camera);
    const annotationOffsetX = -56;
    projectedAnchor.x = projectedShutter.x + annotationOffsetX * 2 / rect.width;
    annotationGroup.position.copy(displayGroup.worldToLocal(projectedAnchor.clone().unproject(camera)));
    const screenX = rect.left + (projectedAnchor.x + 1) * rect.width / 2;
    const screenY = rect.top + (1 - projectedAnchor.y) * rect.height / 2;
    annotationGroup.scale.setScalar(1);
    annotationGroup.visible = !mobile.matches;
    mobileLabel.style.display = mobile.matches && !host.closest("[hidden]") ? "block" : "none";
    const angle = Math.abs(Math.atan2(Math.sin(displayGroup.rotation.y), Math.cos(displayGroup.rotation.y))) * 180 / Math.PI;
    // Continuous opacity only; no visibility toggle and no billboard.
    const t = Math.max(0, Math.min(1, (135-angle)/30));
    textMaterial.opacity = arrowMaterial.opacity = 0.9 * t*t*(3-2*t);
    if (mobile.matches) updateMobile(rect, projectedShutter, textMaterial.opacity);

    host.dataset.annotation = JSON.stringify({screenX,screenY,annotationOffsetX,position:annotationGroup.position.toArray(), scale:annotationGroup.scale.x,
      opacity:textMaterial.opacity, parent:annotationGroup.parent.name, font:font.status, angle, textWidth, textScale:3, arrowScale:1.4, textureSize:[canvas.width,canvas.height], doubleSided:true,
      visible:annotationGroup.visible,
      target:target.toArray(), tip:annotationGroup.position.toArray()});
  }
  update();
  return update;
}

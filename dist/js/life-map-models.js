import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const files = {
  edmonton: 'snowflakes', montreal: 'biosphere', dallas: 'cowboy',
  colombia: 'blue-butterfly', england: 'big-ben', italy: 'cathedral',
  china: 'great-wall', japan: 'tokyo-tower',
};
const canvasBleed = 180;

export async function mountMapModels(map, locations) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera();
  camera.position.z = 1000;
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0, 0);
  renderer.domElement.className = 'journey-map__models';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.style.left = `${-canvasBleed}px`;
  renderer.domElement.style.top = `${-canvasBleed}px`;
  map.append(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 1.35));
  const key = new THREE.DirectionalLight(0xfff8ed, 1.8);
  key.castShadow = true;
  key.position.set(-125, 175, 350);
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.bias = -0.00008;
  key.shadow.normalBias = 0.001;
  key.shadow.radius = 5;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xeef2f5, 0.36);
  fill.position.set(125, 85, 300);
  scene.add(fill);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShadowMaterial({color: 0x494039, opacity: 0.08}),
  );
  ground.receiveShadow = true;
  scene.add(ground);

  const loader = new GLTFLoader();
  const models = new Map();
  await Promise.all(Object.entries(files).map(async ([id, file]) => {
    const gltf = await loader.loadAsync(`/assets/life-journey/models/${file}.glb`);
    const model = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -bounds.min.y, -center.z);
    model.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    const group = new THREE.Group();
    group.name = `Journey_${id}`;
    group.add(model);
    scene.add(group);
    models.set(id, {group, size, hoverStarted: 0, hovering: false, lift: 0});
  }));

  let frame = 0;
  let paused = false;
  let disposed = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize() {
    const {width, height} = map.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width + canvasBleed * 2, height + canvasBleed * 2, false);
    renderer.domElement.style.width = `${width + canvasBleed * 2}px`;
    renderer.domElement.style.height = `${height + canvasBleed * 2}px`;
    camera.left = -width / 2 - canvasBleed;
    camera.right = width / 2 + canvasBleed;
    camera.top = height / 2 + canvasBleed;
    camera.bottom = -height / 2 - canvasBleed;
    camera.updateProjectionMatrix();
    ground.scale.set(width + canvasBleed * 2, height + canvasBleed * 2, 1);
    const shadowCamera = key.shadow.camera;
    shadowCamera.left = -width / 2 - canvasBleed;
    shadowCamera.right = width / 2 + canvasBleed;
    shadowCamera.top = height / 2 + canvasBleed;
    shadowCamera.bottom = -height / 2 - canvasBleed;
    shadowCamera.updateProjectionMatrix();
    const modelHeight = Math.min(150, Math.max(72, width * 0.129));
    for (const [id, item] of models) {
      const place = locations[id];
      const scale = modelHeight / Math.max(item.size.x, item.size.y, item.size.z);
      item.group.scale.setScalar(scale);
      item.baseX = (place.x / 100 - 0.5) * width;
      item.baseY = (0.5 - place.y / 100) * height + 7;
      item.group.position.set(item.baseX, item.baseY + item.lift, 12 + item.size.z * scale / 2);
      const projectedWidth = item.size.x * scale;
      const projectedHeight = item.size.y * scale;
      item.projectedWidth = projectedWidth;
      item.projectedHeight = projectedHeight;
      const nearest = Math.min(...Object.entries(locations).filter(([other]) => other !== id).map(([, other]) =>
        Math.hypot((other.x - place.x) * width / 100, (other.y - place.y) * height / 100)));
      const button = map.querySelector(`.map-pin[data-location="${id}"]`);
      button.style.width = `${Math.max(34, Math.min(projectedWidth, nearest * 0.78))}px`;
      button.style.height = `${projectedHeight + 9}px`;
      button.style.setProperty('--model-height', `${projectedHeight}px`);
      button.style.setProperty('--model-half-height', `${projectedHeight / 2}px`);
      button.style.setProperty('--model-half-width', `${projectedWidth / 2}px`);
    }
    if (paused) renderer.render(scene, camera);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(map);
  resize();

  function render(now) {
    if (paused || disposed) return;
    for (const item of models.values()) {
      const elapsed = now - item.hoverStarted;
      const target = item.hovering && !reduced
        ? 9 * Math.sin(Math.PI * Math.min(1, elapsed / 650))
        : 0;
      item.lift += (target - item.lift) * 0.22;
      item.group.position.y = item.baseY + item.lift;
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  }
  frame = requestAnimationFrame(render);
  return {
    pick(clientX, clientY) {
      const rect = map.getBoundingClientRect();
      const x = clientX - rect.left - rect.width / 2;
      const y = rect.top + rect.height / 2 - clientY;
      let best = null;
      for (const [id, item] of models) {
        const dx = (x - item.baseX) / (item.projectedWidth / 2 + 4);
        const dy = (y - item.baseY - item.projectedHeight / 2) / (item.projectedHeight / 2 + 4);
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
          const score = dx * dx + dy * dy;
          if (!best || score < best.score) best = {id, score};
        }
      }
      return best?.id || null;
    },
    hover(id, hovering) {
      const item = models.get(id);
      if (!item) return;
      item.hovering = hovering;
      if (hovering) item.hoverStarted = performance.now();
    },
    pause(value) {
      paused = value;
      cancelAnimationFrame(frame);
      if (value) renderer.render(scene, camera);
      else frame = requestAnimationFrame(render);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse(child => {
        if (!child.isMesh) return;
        child.geometry?.dispose();
        for (const material of [child.material].flat()) {
          for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
          material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

import {prefetchRoute} from './js/resource-loader.js';
import { createAnnotation } from './annotation.js?v=navigation-20261001-1';
import { installPhotoPrint } from './photo-print.js?v=camera-menu-20261005-1';
import { installCameraControls } from './camera-controls.js?v=navigation-20261001-1';
import { revealIrisArrival, showIrisFailure } from './page-transition.js?v=navigation-20261001-1';
// Three.js core and addons are pinned together to 0.180.0 in index.html.
// Static product study: embedded PBR maps, studio reflection, and ground shadows.
const MODEL_URL = '/public/model/polaroid-camera-master.glb';
const MODEL_ROTATION = Object.freeze({ x: 0, y: 0, z: 0 });
const VIEW = Object.freeze({ fov: 30, near: 0.01, far: 100, normalizedSize: 2, fitPadding: 1.12 });
const STUDIO = Object.freeze({
  exposure: 1.0,
  cameraEnvironment: 1.0,
  key: { color: 0xfff8ed, intensity: 1.8, position: [-4, 6, 5] },
  fill: { color: 0xeef2f5, intensity: 0.36, position: [4, 2.5, 4] },
  shadow: { opacity: 0.12, mapSize: 2048, bias: -0.0002, normalBias: 0.02 },
  contactWidth: 0.56,
});
// Thin optical covers: the detailed optics already exist on the source atlas.
// Avoid washing that image out with a 10% white, double-sided clearcoat overlay.
// No refraction framebuffer, blur pass, or replacement blue texture is used.
const GLASS = Object.freeze({
  color: '#ffffff', metalness: 0, roughness: 0.015,
  transmission: 0, transparent: true, opacity: 0.025,
  clearcoat: 0.15, clearcoatRoughness: 0.015, envMapIntensity: 0.8,
  depthTest: true, depthWrite: false,
});
const REPAIR_VERSION = 'repair-20260915-2';

const host = document.querySelector('#camera-3d');

function reportFailure(error) {
  console.error('Polaroid GLB loading failed:', error);
  host.dataset.loadState = 'error';
  host.replaceChildren();
  host.parentElement.style.setProperty('--camera-contact-width', '0px');
}

async function initialize() {
  // Keep loading failures visible in the console, without reverting to a bitmap.
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  THREE.ColorManagement.enabled = true;

  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = STUDIO.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);
  // Clip ONLY the paper material, never the camera or annotations.
  renderer.localClippingEnabled = true;
  host.dataset.repairVersion = REPAIR_VERSION;

  const camera = new THREE.PerspectiveCamera(VIEW.fov, 1, VIEW.near, VIEW.far);
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnvironment = new RoomEnvironment();
  // A neutral studio card adds a restrained reflection to flat glass.
  // It exists only in the reflection environment, never in the visible scene.
  const reflectionCard = new THREE.Mesh(
    new THREE.CircleGeometry(1, 64),
    new THREE.MeshBasicMaterial({ color: 0xa3b5c6 }),
  );
  reflectionCard.position.set(-0.15, 0.28, 4);
  reflectionCard.scale.set(0.35, 0.12, 1);
  reflectionCard.lookAt(0, 0, 0);
  roomEnvironment.add(reflectionCard);
  const environmentTarget = pmremGenerator.fromScene(roomEnvironment);
  scene.environment = environmentTarget.texture;
  roomEnvironment.dispose();
  pmremGenerator.dispose();

  const keyLight = new THREE.DirectionalLight(STUDIO.key.color, STUDIO.key.intensity);
  keyLight.position.set(...STUDIO.key.position);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(STUDIO.shadow.mapSize, STUDIO.shadow.mapSize);
  keyLight.shadow.bias = STUDIO.shadow.bias;
  keyLight.shadow.normalBias = STUDIO.shadow.normalBias;
  const fillLight = new THREE.DirectionalLight(STUDIO.fill.color, STUDIO.fill.intensity);
  fillLight.position.set(...STUDIO.fill.position);
  scene.add(keyLight, fillLight);

  let normalizedSize;
  let diagnostics;
  let resizeObserver;
  let model;
  let finalBox;
  let updateAnnotation = () => {};
  let updatePaper = () => {};
  let photoController;

  function alignContactShadow(width, height) {
    if (!model) return;
    camera.updateMatrixWorld();
    // Project the real mesh vertices rather than the old image or a guessed bbox.
    const vertex = new THREE.Vector3();
    let left = Infinity, right = -Infinity, bottom = -Infinity;
    model.traverse((node) => {
      if (!node.isMesh) return;
      const positions = node.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld).project(camera);
        left = Math.min(left, vertex.x);
        right = Math.max(right, vertex.x);
        bottom = Math.max(bottom, -vertex.y);
      }
    });
    const visualWidth = (right - left) * width;
    const bottomPixels = (bottom + 1) * height - height / 2;
    host.parentElement.style.setProperty('--camera-contact-width', `${visualWidth * STUDIO.contactWidth}px`);
    host.parentElement.style.setProperty('--camera-visual-bottom', `${bottomPixels}px`);
    if (diagnostics) diagnostics.contact = { visualWidth, bottomPixels, width: visualWidth * STUDIO.contactWidth };
  }

  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // Overscan adds shadow room without changing the original model projection.
    renderer.setSize(width * 2, height * 2, false);
    camera.aspect = width / height;

    if (normalizedSize) {
      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
      const verticalDistance = normalizedSize.y / (2 * Math.tan(verticalFov / 2));
      const horizontalDistance = normalizedSize.x / (2 * Math.tan(horizontalFov / 2));
      // Fit the closest bounding-box face, including the model's full depth.
      const distance = (Math.max(verticalDistance, horizontalDistance) + normalizedSize.z / 2) * VIEW.fitPadding;
      // Raise the viewpoint by 2 degrees; tilting the object lifts its front feet.
      camera.position.set(0, distance * Math.tan(2 * Math.PI / 180), distance);
      camera.lookAt(0, 0, 0);
    }
    camera.setViewOffset(width, height, -width / 2, -height / 2, width * 2, height * 2);
    camera.updateProjectionMatrix();
    alignContactShadow(width, height);
    updateAnnotation();
    updatePaper();
    renderer.render(scene, camera);
    if (diagnostics) {
      diagnostics.cameraPosition = camera.position.toArray();
      diagnostics.viewport = [width, height];
      host.dataset.diagnostics = JSON.stringify(diagnostics);
    }
  }

  try {
    resize();
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
    model = gltf.scene;
    model.rotation.set(MODEL_ROTATION.x, MODEL_ROTATION.y, MODEL_ROTATION.z);
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
      throw new Error('The GLB has empty or invalid model bounds.');
    }

    // Scale both root translation and geometry; do not depend on the FBX pivot.
    const scale = VIEW.normalizedSize / maxDimension;
    model.position.sub(center).multiplyScalar(scale);
    model.scale.multiplyScalar(scale);
    const displayGroup = new THREE.Group();
    displayGroup.name = 'CameraDisplay';
    displayGroup.add(model);
    scene.add(displayGroup);
    model.updateMatrixWorld(true);
    finalBox = new THREE.Box3().setFromObject(model);
    normalizedSize = finalBox.getSize(new THREE.Vector3());

    const shadowRadius = normalizedSize.length() * 0.6;
    const lightDistance = keyLight.position.length();
    Object.assign(keyLight.shadow.camera, {
      left: -shadowRadius, right: shadowRadius,
      top: shadowRadius, bottom: -shadowRadius,
      near: Math.max(0.01, lightDistance - shadowRadius * 2),
      far: lightDistance + shadowRadius * 2,
    });
    keyLight.shadow.camera.updateProjectionMatrix();
    const groundMaterial = new THREE.ShadowMaterial({ color: 0x000000, opacity: STUDIO.shadow.opacity });
    // A small Gaussian kernel softens only the ground's real PCF shadow.
    // The pinned r180 shader signature takes a projected shadow coordinate.
    groundMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <shadowmask_pars_fragment>', `
        float getShadowMask() {
          #if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0
            DirectionalLightShadow light = directionalLightShadows[0];
            float shadow = 0.0;
            float totalWeight = 0.0;
            for (int x = -2; x <= 2; x++) {
              for (int y = -2; y <= 2; y++) {
                float weight = exp(-float(x*x + y*y) / 2.0);
                vec4 coord = vDirectionalShadowCoord[0];
                coord.xy += vec2(float(x), float(y)) * 0.006 * coord.w;
                shadow += weight * getShadow(directionalShadowMap[0], light.shadowMapSize,
                  light.shadowIntensity, light.shadowBias, light.shadowRadius, coord);
                totalWeight += weight;
              }
            }
            return shadow / totalWeight;
          #else
            return 1.0;
          #endif
        }
      `);
    };
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(normalizedSize.x * 10, normalizedSize.z * 10),
      groundMaterial,
    );
    ground.name = 'StudioShadowGround';
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = finalBox.min.y - normalizedSize.y * 0.008;
    ground.receiveShadow = true;
    ground.castShadow = false;
    scene.add(ground);

    let meshCount = 0;
    const materials = new Set();
    const textures = new Set();
    const materialAudit = [];
    let lensMaterial;
    model.traverse((node) => {
      if (!node.isMesh) return;
      meshCount++;
      node.castShadow = true;
      node.receiveShadow = false;
      const originalMaterials = Array.isArray(node.material) ? node.material : [node.material];
      const adjustedMaterials = originalMaterials.map((material) => {
        materialAudit.push({ mesh: node.name, material: material.name, type: material.type,
          map: material.map?.name ?? null, normalMap: material.normalMap?.name ?? null,
          roughnessMap: material.roughnessMap?.name ?? null, metalnessMap: material.metalnessMap?.name ?? null,
          normalScale: material.normalScale?.toArray() ?? null });
        if (material.name.includes('Camera')) {
          if (material.map) {
            material.map.colorSpace = THREE.SRGBColorSpace;
            // Keep the full original atlas; improve oblique texture sampling.
            material.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
            material.map.needsUpdate = true;
          }
          for (const map of [material.normalMap, material.metalnessMap, material.roughnessMap]) {
            if (map) map.colorSpace = THREE.NoColorSpace;
          }
          material.envMapIntensity = STUDIO.cameraEnvironment;
          material.needsUpdate = true;
        } else if (material.name === 'Glass') {
          lensMaterial ??= new THREE.MeshPhysicalMaterial({
            ...GLASS, color: new THREE.Color(GLASS.color), name: 'Glass',
            side: THREE.FrontSide,
          });
          // Transparent cover sheets must not cast opaque ground shadows.
          node.castShadow = false;
          material = lensMaterial;
        }
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        return material;
      });
      node.material = Array.isArray(node.material) ? adjustedMaterials : adjustedMaterials[0];
    });

    // The top switch is one disconnected island inside Buttons+, not a whole button mesh.
    // Mask only its 694 triangles on a geometry copy; retain all original indices and transforms.
    const buttons = model.getObjectByName('Buttons+');
    const geometry = buttons.geometry.clone();
    const positions = geometry.attributes.position;
    const index = geometry.index;
    const isSwitch = i => positions.getX(i) < -0.0239 && positions.getY(i) < -0.0105
      && positions.getZ(i) > 0.006 && positions.getZ(i) < 0.032;
    const ranges = [];
    const shutterIndices = [];
    const isShutter = i => positions.getX(i) > 0.0012 && positions.getX(i) < 0.0125
      && positions.getY(i) > -0.0054 && positions.getY(i) < -0.0034
      && positions.getZ(i) > 0.0574 && positions.getZ(i) < 0.0688;
    let masked = 0;
    for (let i = 0; i < index.count; i += 3) {
      const shutter = [0, 1, 2].every(k => isShutter(index.getX(i + k)));
      if (shutter) shutterIndices.push(...[0, 1, 2].map(k => index.getX(i + k)));
      const materialIndex = shutter ? 2 : [0, 1, 2].every(k => isSwitch(index.getX(i + k))) ? 1 : 0;
      if (materialIndex === 1) masked += 3;
      const last = ranges.at(-1);
      if (last?.materialIndex === materialIndex) last.count += 3;
      else ranges.push({ start: i, count: 3, materialIndex });
    }
    if (masked !== 2082) throw new Error('Top switch geometry no longer matches the supplied GLB');
    const hiddenSwitch = buttons.material.clone();
    hiddenSwitch.visible = false;
    geometry.clearGroups();
    for (const r of ranges) geometry.addGroup(r.start, r.count, r.materialIndex);
    buttons.geometry = geometry;
    buttons.material = [buttons.material, hiddenSwitch, hiddenSwitch];
    if (shutterIndices.length !== 1344) throw new Error('Shutter geometry does not match audited Buttons+ island');
    const shutterGeometry = geometry.clone();
    shutterGeometry.clearGroups();
    shutterGeometry.setIndex(shutterIndices);
    const shutterButtonMesh = new THREE.Mesh(shutterGeometry, buttons.material[0]);
    shutterButtonMesh.name = 'ShutterButton';
    shutterButtonMesh.castShadow = true;
    buttons.add(shutterButtonMesh);
    host.dataset.shutterSource = 'Buttons+ / Camera';
    host.dataset.topSwitchHidden = 'true';

    diagnostics = {
      threeVersion: THREE.REVISION,
      cameraFov: camera.fov,
      box: { min: box.min.toArray(), max: box.max.toArray() },
      size: size.toArray(), center: center.toArray(),
      modelRotation: { ...MODEL_ROTATION }, modelScale: scale,
      normalizedSize: normalizedSize.toArray(),
      meshCount, materialCount: materials.size, textureCount: textures.size,
      canvasTransparent: renderer.getClearAlpha() === 0,
      environment: 'RoomEnvironment / PMREM', environmentReady: !!scene.environment,
      environmentRotation: scene.environmentRotation.toArray().slice(0, 3),
      cameraEnvironment: STUDIO.cameraEnvironment, glass: GLASS,
      key: STUDIO.key, fill: STUDIO.fill, rim: false, exposure: STUDIO.exposure,
      shadow: STUDIO.shadow, groundY: ground.position.y,
      shadowCamera: { extent: shadowRadius, near: keyLight.shadow.camera.near, far: keyLight.shadow.camera.far },
      materialAudit,
      cameraMaps: [...materials].filter(m => m.name === 'Camera').map(m => ({
        baseColor: m.map?.name, normal: m.normalMap?.name,
        metallic: m.metalnessMap?.name, roughness: m.roughnessMap?.name,
        colorSpace: m.map?.colorSpace, normalColorSpace: m.normalMap?.colorSpace,
        metallicColorSpace: m.metalnessMap?.colorSpace, roughnessColorSpace: m.roughnessMap?.colorSpace,
        normalScale: m.normalScale.toArray(),
      })),
    };
    resize();
    host.dataset.loadState = 'loaded';

    const glassMesh = model.getObjectByName('Glass');
    if (!glassMesh?.isMesh) throw new Error('Expected Glass mesh is missing');
    glassMesh.visible = true;
    for (const material of [glassMesh.material].flat()) material.visible = true;
    for (let parent = glassMesh.parent; parent; parent = parent.parent) {
      if (!parent.visible) throw new Error(`Glass parent is hidden: ${parent.name}`);
    }
    host.dataset.glassVisible = 'true';
    const render = () => {
      displayGroup.updateMatrixWorld(true);
      updateAnnotation();
      updatePaper();
      renderer.render(scene, camera);
    };
    updateAnnotation = await createAnnotation(THREE, displayGroup, shutterButtonMesh, host, camera, model);
    const controls = installCameraControls(host, displayGroup, render);
    render();
    await new Promise(resolve => requestAnimationFrame(resolve));
    render();
    if (new URLSearchParams(location.search).get('page') !== 'boxes') {
      sessionStorage.removeItem('iris-arrival');
      await revealIrisArrival();
    }
    photoController = await installPhotoPrint({ THREE, host, renderer, camera, model, displayGroup,
      shutterButtonMesh, render, controls, groundY: ground.position.y });
    updatePaper = photoController.update;
    render();
    prefetchRoute('/?page=boxes');

    // Opt-in verification only; no debug controls on the normal landing page.
    if (new URLSearchParams(location.search).get('debugRepairs') === '1') {
      window.polaroidRepair = {
        version: REPAIR_VERSION,
        inspect: () => ({ glass: { ...GLASS, visible: glassMesh.visible },
          phase: host.dataset.phase, paper: photoController.inspect() }),
        setGlassVisible(visible) { glassMesh.visible = Boolean(visible); render(); },
        setAngle(degrees) {
          controls.lock();
          displayGroup.rotation.y = THREE.MathUtils.degToRad(degrees);
          render();
        },
        // To identify a white mark: if it remains with all paper hidden,
        // it cannot be caused by this print mesh. Restore with null.
        hidePaper(hidden = true) { photoController.setDebugHidden(hidden); render(); },
      };
    }

    window.addEventListener('resize', resize);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
  } catch (error) {
    window.removeEventListener('resize', resize);
    resizeObserver?.disconnect();
    environmentTarget.dispose();
    renderer.dispose();
    throw error;
  }
}

if(new URLSearchParams(location.search).get('page')==='boxes'){
  document.querySelector('#camera-page').hidden=true;
  document.querySelector('#film-box-page').hidden=false;
  import('./film-box-scene.js?v=mobile-history-20261001-1').catch(showIrisFailure);
}else initialize().catch(error => { reportFailure(error); showIrisFailure(error); });

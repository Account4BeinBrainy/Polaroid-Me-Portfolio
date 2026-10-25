import {scheduleResource} from './resource-loader.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createLogoModel } from './logo-model-viewer.js?v=certification-rollback-20260930-1';

const FILTER_MODEL_MAP={
 uofa:['blue','Green'],hec:['blue','Blue'],google:['red','Red'],
 preply:['white_effect','WhiteEffect'],france:['yellow','Yellow'],heart:['orange','Orange'],
};
const FILTER_DIAMETER=1.6;
const TRANSMISSION={
 uofa:[0x66af7a,.18],hec:[0x6ab9d8,.18],google:[0xd87474,.18],
 preply:[0xc8cdd0,.045],france:[0xe4ca72,.18],heart:[0xe4a76f,.18],
};
const FRAME_PROFILE=[
 [0.0297,-0.0042],[0.0335,-0.0042],[0.034,-0.0038],
 [0.034,0.0038],[0.0335,0.0042],[0.0297,0.0042],[0.0297,-0.0042],
];
const frameGeometry=new THREE.LatheGeometry(FRAME_PROFILE.map(([r,z])=>new THREE.Vector2(r,z)),96).rotateX(Math.PI/2);
let grain;
let feather;
function projectionFeather(){
 if(feather)return feather;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,0,64,64,64);
 gradient.addColorStop(0,'rgba(255,255,255,.85)');gradient.addColorStop(.48,'rgba(255,255,255,.55)');
 gradient.addColorStop(.8,'rgba(255,255,255,.12)');gradient.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);feather=new THREE.CanvasTexture(canvas);return feather;
}
function frameGrain(){
 if(grain)return grain;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(64,64);
 for(let i=0;i<4096;i++){
  const n=112+((i*73+i*i*19)%37);pixels.data.set([n,n,n,255],i*4);
 }
 ctx.putImageData(pixels,0,0);grain=new THREE.CanvasTexture(canvas);
 grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(12,12);return grain;
}
async function createFilter(modelId){
 const [file,name]=FILTER_MODEL_MAP[modelId];
 const {scene}=await new GLTFLoader().loadAsync(new URL(`../public/model/filter_${file}.glb`,import.meta.url).href);
 const root=scene.getObjectByName(`Filter_${name==='Green'?'Blue':name}_ROOT`);
 if(!root)throw Error(`Missing ${name} filter`);
 root.removeFromParent();root.name=`Filter_${name}_ROOT`;
 const oldFrame=root.getObjectByName(`Filter_${name==='Green'?'Blue':name}_Frame`);
 const material=new THREE.MeshStandardMaterial({color:0x111416,metalness:0,roughness:.72,flatShading:true,bumpMap:frameGrain(),bumpScale:.000055});
 const frame=new THREE.Mesh(frameGeometry,material);frame.name=`Filter_${name}_Frame`;
 oldFrame.parent.add(frame);oldFrame.parent.remove(oldFrame);
 root.traverse(node=>{
  if(!node.isMesh)return;
  node.material=node.material.clone();node.castShadow=true;node.receiveShadow=true;
  node.material.depthTest=true;node.material.depthWrite=true;
  if(node.name.includes('OpticalElement')){
   node.castShadow=false;
   if(name==='Green')node.material.color.set('#43bd77');
   node.material.transparent=false;node.material.opacity=1;node.material.transmission=.92;
   node.material.ior=1.46;node.material.roughness=name==='WhiteEffect'?.055:.08;
   node.material.clearcoat=.45;node.material.clearcoatRoughness=.06;
  }else if(node.name.includes('RetainingRim')){
   node.material.roughness=.68;node.material.metalness=0;
  }
 });
 root.updateMatrixWorld(true);
 const size=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
 const actualDiameter=Math.max(size.x,size.y);
 if(!actualDiameter)throw Error(`Invalid ${name} filter diameter`);
 root.scale.multiplyScalar(FILTER_DIAMETER/actualDiameter);
 return root;
}

// Loads the existing GLB entries without changing their geometry or hierarchy.
async function createGltfModel(scene,url){
 const {scene:model}=await new GLTFLoader().loadAsync(url);scene.add(model);return model;
}
export async function createCertificationModels(items,host){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.setClearColor(0,0);renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-5,5,3,-3,.01,30);camera.position.set(.12,.73,4.8);camera.lookAt(0,0,0);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room);scene.environment=env.texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
 const key=new THREE.DirectionalLight(0xfff8ed,1.8);key.position.set(-4,12,7);key.castShadow=true;key.shadow.mapSize.set(4096,4096);key.shadow.bias=-.00008;key.shadow.normalBias=.001;scene.add(key,key.target);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShadowMaterial({color:0x494039,opacity:.10}));ground.name='Certification_Ground';ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.castShadow=false;scene.add(ground);
 let modelHalves=[];
 // Fit once on resize to the entire orbit, never to a moving frame (no shadow shimmer).
 function fitShadows({radiusX,radiusY,depthRadius}){
  const phi=8*Math.PI/180;
  const half=new THREE.Vector3(Math.hypot(radiusX*Math.cos(phi),radiusY*Math.sin(phi)),Math.hypot(radiusX*Math.sin(phi),radiusY*Math.cos(phi)),depthRadius);
  for(let axis=0;axis<3;axis++)half.setComponent(axis,half.getComponent(axis)+Math.max(...modelHalves.map((h,i)=>h.getComponent(axis)*models[i].visualScale*1.07)));
  ground.position.y=-half.y-.08;
  key.target.position.set(0,ground.position.y/2,0);key.position.copy(key.target.position).add(new THREE.Vector3(-4,12,7).normalize().multiplyScalar(half.length()+10));
  key.target.updateMatrixWorld(true);key.updateMatrixWorld(true);key.shadow.updateMatrices(key);
  const lightBounds=new THREE.Box3(),floorBounds=new THREE.Box3(),direction=key.target.position.clone().sub(key.position).normalize();
  for(const x of [-half.x,half.x])for(const y of [-half.y,half.y])for(const z of [-half.z,half.z]){
   const point=new THREE.Vector3(x,y,z),shadow=point.clone().addScaledVector(direction,(ground.position.y-y)/direction.y);
   floorBounds.expandByPoint(shadow);lightBounds.expandByPoint(point.applyMatrix4(key.shadow.camera.matrixWorldInverse));lightBounds.expandByPoint(shadow.applyMatrix4(key.shadow.camera.matrixWorldInverse));
  }
  const center=floorBounds.getCenter(new THREE.Vector3()),size=floorBounds.getSize(new THREE.Vector3());ground.position.x=center.x;ground.position.z=center.z;ground.scale.set(size.x+2,size.z+2,1);
  Object.assign(key.shadow.camera,{left:lightBounds.min.x-.2,right:lightBounds.max.x+.2,bottom:lightBounds.min.y-.2,top:lightBounds.max.y+.2,near:Math.max(.01,-lightBounds.max.z-.2),far:-lightBounds.min.z+.2});key.shadow.camera.updateProjectionMatrix();
 }
 const fill=new THREE.DirectionalLight(0xeef2f5,.36);fill.position.set(4,2.5,4);scene.add(fill);
 // These are the original fitted bounds at factor 190/180, divided by that
 // factor. They keep the orbit and shadow fit identical while hidden models load.
 const BASE_HALVES=[[.558,.3259414106656816,.558],[.524173047728179,.3061822627408077,.524173047728179],[.524173047728179,.286720012896047,.04192127239880685],[.558,.3048573562258386,.05570637727897173],[.3947485761126726,.393451179557443,.05697607972062],[.3947485761126726,.3399703893832232,.05698259826835595]];
 let currentFactor=1;
 const models=items.map((item,index)=>{
  const wrapper=new THREE.Group();wrapper.name=item.id;scene.add(wrapper);
  const [projectionColor,projectionOpacity]=TRANSMISSION[item.id];
  const projection=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:projectionColor,map:projectionFeather(),transparent:true,opacity:projectionOpacity,depthTest:true,depthWrite:false,toneMapped:false}));
  projection.rotation.x=-Math.PI/2;projection.renderOrder=1;projection.castShadow=false;projection.receiveShadow=false;scene.add(projection);
  const flip=new THREE.Group(),modelLayer=new THREE.Group(),filterLayer=new THREE.Group();
  flip.name=`${item.id}_FlipWrapper`;modelLayer.rotation.y=Math.PI;modelLayer.visible=false;flip.add(filterLayer,modelLayer);wrapper.add(flip);
  const hit=new THREE.Mesh(new THREE.CircleGeometry(FILTER_DIAMETER/2,64),new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,depthTest:false,side:THREE.DoubleSide}));
  hit.name=`${item.id}_HoverTarget`;wrapper.add(hit);
  const result={wrapper,model:null,modelLayer,filterLayer,flip,hit,projection,projectionOpacity,flipProgress:0,flipTarget:0,visualScale:item.visualScale||1,modelReady:false,onModelReady:null};
  let installed=false,requestedPriority=Infinity,loadPromise;
  result.loadModel=(priority=3)=>{
    if(installed)return Promise.resolve(result.model);
    if(loadPromise&&priority>=requestedPriority)return loadPromise;
    requestedPriority=priority;
    const run=async()=>['google','preply'].includes(item.id)?createLogoModel(scene,{type:item.id}):createGltfModel(scene,item.modelUrl);
    loadPromise=scheduleResource({url:item.modelUrl,type:'model',priority,run}).then(model=>{
      if(!model||installed)return result.model;
      installed=true;
      if(item.modelRotation)model.rotation.fromArray(item.modelRotation);else model.rotation.y=item.id==='uofa'||item.id==='hec'?-.2:.06;
      model.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());model.scale.setScalar(1.8/Math.max(size.x,size.y,size.z));model.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(model);const c=box.getCenter(new THREE.Vector3());model.position.set(-c.x,-c.y,-c.z);
      model.scale.multiplyScalar(currentFactor);model.position.multiplyScalar(currentFactor);model.userData.fitFactor=currentFactor;
      model.traverse(o=>{if(o.isMesh){const materials=Array.isArray(o.material)?o.material:[o.material];let visible=true;for(let parent=o;parent;parent=parent.parent)visible&&=parent.visible;
       o.castShadow=visible&&o.name!=='EmbroideryDecal'&&o.name!=='Logo_Front'&&materials.every(m=>m.visible&&m.opacity>0&&(!m.transparent||m.alphaTest>0));o.receiveShadow=true;
      }});
      modelLayer.add(model);result.model=model;result.modelReady=true;result.onModelReady?.(result);return model;
    });
    return loadPromise;
  };
  result.baseHalf=BASE_HALVES[index];return result;
 });
 await Promise.all(models.map(async item=>item.filterLayer.add(await createFilter(item.wrapper.name))));
 function updateProjections(){
  const direction=key.target.position.clone().sub(key.position).normalize();
  for(const {wrapper,projection} of models){
   const distance=(ground.position.y-wrapper.position.y)/direction.y;
   projection.position.set(wrapper.position.x+direction.x*distance,ground.position.y+.004,wrapper.position.z+direction.z*distance);
   projection.scale.set(FILTER_DIAMETER*.95*wrapper.scale.x,FILTER_DIAMETER*.73*wrapper.scale.x,1);
  }
 }
 function resize(width,height,layoutWidth=width,layoutHeight=height){
  models.forEach(({wrapper,modelLayer})=>{wrapper.position.set(0,0,0);wrapper.scale.setScalar(1);modelLayer.scale.setScalar(1);});
  renderer.setSize(width,height,false);camera.left=-width*.005;camera.right=width*.005;camera.top=height*.005;camera.bottom=-height*.005;camera.updateProjectionMatrix();
  const pixels=Math.min(190,layoutWidth*.22,layoutHeight*.38),factor=pixels/180;
  currentFactor=factor;
  models.forEach(({model})=>{if(!model)return;const ratio=factor/(model.userData.fitFactor||1);model.scale.multiplyScalar(ratio);model.position.multiplyScalar(ratio);model.userData.fitFactor=factor;});
  const bounds=models.map(({baseHalf})=>new THREE.Vector3(...baseHalf).multiplyScalar(factor*2));
  modelHalves=bounds.map(b=>b.clone().multiplyScalar(.5));
  models.forEach(({modelLayer,visualScale})=>modelLayer.scale.setScalar(visualScale));
  return {halves:bounds.map(b=>[b.x/2,b.y/2,b.z/2]),halfWidth:Math.max(...bounds.map(b=>b.x))/2,halfHeight:Math.max(...bounds.map(b=>b.y))/2};
 }
 return {renderer,scene,camera,models,resize,fitShadows,updateProjections,render:()=>renderer.render(scene,camera)};
}

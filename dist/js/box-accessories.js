import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createSinglePhoto } from './photo-deck-template.js?v=integrated-20260927-3';
import { locations } from './life-journey-data.js?v=integrated-20260927-3';
import { POLAROID_SPEC as PAPER } from './polaroid-spec.js';

const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};

export function pouchRig(asset,{spread=.008}={}){
 const deform=[],travel=[];asset.updateMatrixWorld(true);
 const inverse=asset.matrixWorld.clone().invert();
 asset.traverse(node=>{
  if(!node.isMesh)return;
  if(/Pouch_ZipperSlider|Pouch_ZipperPull_Red|Pouch_PullHinge/.test(node.name)){
   // Pull cut-out children are already parented to the moving pull.
   if(!/Pouch_ZipperPull_Red/.test(node.parent?.name||''))travel.push({node,rest:node.position.clone()});return;
  }
  if(!/Pouch_MainBody|Pouch_ZipperTape|Pouch_ZipperTeeth|Pouch_TapeStitch/.test(node.name))return;
  node.geometry=node.geometry.clone();const attr=node.geometry.attributes.position;
  const matrix=inverse.clone().multiply(node.matrixWorld),back=matrix.clone().invert(),base=new Float32Array(attr.count*3),v=new THREE.Vector3();
  for(let i=0;i<attr.count;i++){v.fromBufferAttribute(attr,i).applyMatrix4(matrix);v.toArray(base,i*3)}
  const side=/Tape_-1|Stitch_-1/.test(node.name)?1:/Tape_1|Stitch_1/.test(node.name)?-1:0;
  deform.push({node,attr,base,back,side});node.frustumCulled=false;
 });
 const v=new THREE.Vector3();
 return progress=>{
  const slider=-.063+.126*progress;
  for(const {node,rest} of travel)node.position.copy(rest).add(new THREE.Vector3(.126*progress,0,0));
  for(const {node,attr,base,back,side} of deform){
   for(let i=0;i<attr.count;i++){
    const x=base[i*3],y=base[i*3+1],z=base[i*3+2];
    // Only fabric behind the slider separates. End seams and the bottom stay planted.
    const passed=1-smooth(slider-.020,slider,x),ends=smooth(-.076,-.055,x)*(1-smooth(.056,.077,x));
    const upper=smooth(.038,.080,y),amount=spread*passed*ends*upper*smooth(0,.045,progress);
    v.set(x,y-amount*.13,z+(side||Math.sign(z)||1)*amount).applyMatrix4(back);attr.setXYZ(i,v.x,v.y,v.z);
   }
   attr.needsUpdate=true;node.geometry.computeVertexNormals();node.geometry.computeBoundingSphere();
  }
 };
}

// Six optical inserts share the original arc endpoints and reveal timing.
async function filterReveal(asset){
 const definitions=[['blue','Blue'],['blue','Green'],['yellow','Yellow'],['orange','Orange'],['red','Red'],['white_effect','WhiteEffect']];

 const sample=(values,i)=>{const t=i*4/(definitions.length-1),a=Math.floor(t);return THREE.MathUtils.lerp(values[a],values[Math.min(a+1,4)],t-a)};
 const filters=await Promise.all(definitions.map(async([file,name],i)=>{
  const loaded=await new GLTFLoader().loadAsync(new URL(`../public/model/filter_${file}.glb`,import.meta.url).href);
  const filter=loaded.scene.getObjectByName(`Filter_${name==='Green'?'Blue':name}_ROOT`);
  if(name==='Green'){filter.name='Filter_Green_ROOT';filter.traverse(n=>{if(n.isMesh&&/OpticalElement/.test(n.name)){n.material=n.material.clone();n.material.color.set('#43bd77')}})}if(!filter)throw Error('Missing filter '+name);
  filter.removeFromParent();filter.scale.setScalar(.75);
  const diameter=new THREE.Box3().setFromObject(filter,true).getSize(new THREE.Vector3()).x,theta=THREE.MathUtils.degToRad(i*60/(definitions.length-1)),radius=3.2*diameter;
  const end=new THREE.Vector3(-.15*diameter+radius*(1-Math.cos(theta)),.082+diameter*.32+radius*Math.sin(theta),sample([.05,-.03,.08,-.08,.04],i)*diameter);
  filter.userData.arc={diameter,radius,theta};filter.position.set(0,.021+i*.0078*4/(definitions.length-1),0);filter.rotation.set(Math.PI/2,0,0);asset.add(filter);
  filter.traverse(n=>{if(!n.isMesh)return;n.castShadow=true;n.receiveShadow=true;
   for(const m of Array.isArray(n.material)?n.material:[n.material]){
    m.opacity=1;m.transparent=false;m.depthWrite=true;m.depthTest=true;
    if(/OpticalElement/.test(n.name)){m.transmission=.92;m.roughness=.05;m.ior=1.46;
     // Thin optical inserts need sharp transmission, while normal MSAA and surface roughness stay intact.
     m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <transmission_pars_fragment>',THREE.ShaderChunk.transmission_pars_fragment.replace('return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );','return textureLod( transmissionSamplerMap, fragCoord.xy, 0.0 );'))};m.customProgramCacheKey=()=>'optical-sharp-transmission-1';}
    if(/PrismLine/.test(n.name))m.roughness=.05;
    m.needsUpdate=true;
   }
  });
  return {filter,start:filter.position.clone(),end,delay:450-i*200/(definitions.length-1),i};
 }));
 return ms=>{for(const {filter,start,end,delay,i} of filters){
  const t=smooth(delay,delay+650,ms),turn=smooth(0,.22,t),rise=smooth(.22,1,t);
  // Turn edge-on below the zipper before rising through the narrow opening.
  filter.position.copy(start).lerp(new THREE.Vector3(0,.047,0),turn).lerp(end,rise);
  // Keep each insert edge-on within the narrow mouth; pose it after its rim clears.
  const clear=smooth(.100,.112,filter.position.y);
  filter.position.z=end.z*clear;
  filter.rotation.set((1-turn)*Math.PI/2+sample([-.08,.08,-.12,.12,-.06],i)*clear,sample([.12,-.16,.10,-.20,.24],i)*clear,sample([.04,-.07,.07,-.10,.05],i)*clear);
 }};
}

// Derive the baked page plane from its largest face, rather than guessing its source Euler.
function pageSurface(node,side){
 const g=node.geometry,p=g.attributes.position,indices=g.index,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();let best=0,normal=new THREE.Vector3(),distance=0;
 for(let i=0;i<(indices?indices.count:p.count);i+=3){a.fromBufferAttribute(p,indices?indices.getX(i):i);b.fromBufferAttribute(p,indices?indices.getX(i+1):i+1);c.fromBufferAttribute(p,indices?indices.getX(i+2):i+2);
  const n=b.sub(a).cross(c.sub(a)),area=n.length();if(area>best&&n.z*side>0&&Math.abs(n.y)<area*.01){best=area;normal.copy(n).normalize();distance=normal.dot(a)}
 }
 if(!best)throw Error('Cannot locate album page surface');
 const up=new THREE.Vector3(0,1,0),right=up.clone().cross(normal).normalize(),matrix=new THREE.Matrix4().makeBasis(right,up,normal),surface=new THREE.Group();
 surface.name='PhotoSlots_2x2';surface.quaternion.setFromRotationMatrix(matrix);
 const bounds=new THREE.Box3().setFromBufferAttribute(p),centre=bounds.getCenter(new THREE.Vector3());
 surface.position.copy(centre).addScaledVector(normal,distance-normal.dot(centre)+.00022);node.add(surface);return surface;
}

async function albumPhotos(asset){
 // Same dataset as Photo Wall; instantiate only the 12 prints on visible/fanned page faces.
 const photos=Object.values(locations).flatMap(place=>place.photos).slice(0,12);
 const templates=await Promise.all(photos.map((photo,i)=>createSinglePhoto({id:`album-photo-${i}`,coverUrl:photo.image}))); 
 const surfaces=[['PageGroup_01',-1],['PageGroup_04',-1],['PageGroup_05',1]];
 surfaces.forEach(([name,side],i)=>{
  const surface=pageSurface(asset.getObjectByName(name),side);surface.name='PhotoSlots_2x2';
  for(let slot=0;slot<4;slot++){
   const source=templates[(i*4+slot)%templates.length],print=source.root.clone(true);
   print.name='AlbumPrint';print.userData.image=photos[i*4+slot].image;
   print.userData.model=PAPER.modelUrl;print.scale.setScalar(.090/PAPER.height);
   // Canonical face +Y / top -Z -> page face +Z / top +Y; back rests on page surface.
   print.rotation.x=Math.PI/2;print.position.set(slot%2===0?-.042:.042,slot<2?.050:-.050,0);
   surface.add(print);
  }
 });
}

function albumRig(asset){
 const parts=[{node:asset.getObjectByName('Album_FrontCover'),angle:116},...Array.from({length:8},(_,i)=>({node:asset.getObjectByName(`PageGroup_${String(i+1).padStart(2,'0')}`),angle:[114,110,105,95,8,6,4,2][i]}))];
 for(const p of parts){if(!p.node)throw new Error('Album hinge missing');p.rest=p.node.quaternion.clone()}
 const turn=new THREE.Quaternion(),axis=new THREE.Vector3(0,1,0);
 return progress=>{for(const p of parts)p.node.quaternion.copy(p.rest).multiply(turn.setFromAxisAngle(axis,-THREE.MathUtils.degToRad(p.angle)*progress))};
}

export async function createBoxAccessory(index,footprint){
 const file=index===1?'filter-pouch-hover.glb':'photo-album-black.glb';
 const loaded=(await new GLTFLoader().loadAsync(new URL(`../public/model/${file}?v=accessories-1`,import.meta.url).href)).scene;
 const asset=loaded.getObjectByName(index===1?'FilterPouch_ROOT':'PhotoAlbum_ROOT');
 if(!asset)throw new Error('Accessory root missing');
 asset.removeFromParent();asset.position.set(0,0,0); // Remove only the source review-assembly placement.
 const deform=index===1?pouchRig(asset):albumRig(asset);
 let reveal=null, interiorPromise;
 const prepareInterior=()=>interiorPromise??=(index===2?albumPhotos(asset):filterReveal(asset).then(value=>{reveal=value}));
 const duration=index===1?1200:1050;
 const update=(opening,revealProgress=0)=>{deform(opening);reveal?.(revealProgress*duration)};
 update(0);
 const root=new THREE.Group();root.name=index===1?'PouchAnimationGroup':'AlbumAnimationGroup';root.add(asset);
 asset.rotation.order='YXZ';
 asset.rotation.y=index===1?-.18:-.62;
 if(index===1)asset.rotation.x=.40;
 asset.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true}});
 let bounds=new THREE.Box3().setFromObject(root,true),size=bounds.getSize(new THREE.Vector3()),target=footprint.getSize(new THREE.Vector3());
 asset.scale.setScalar(Math.min(target.x*.98/size.x,target.y*.98/size.y));
 bounds.setFromObject(root,true);const center=bounds.getCenter(new THREE.Vector3()),anchor=footprint.getCenter(new THREE.Vector3());
 asset.position.set(anchor.x-center.x,footprint.min.y-bounds.min.y,anchor.z-center.z);
 bounds.setFromObject(root,true);size=bounds.getSize(new THREE.Vector3());
 const hitMesh=new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(size.x,size.z)*1.08,size.y*1.12,Math.hypot(size.x,size.z)*1.08),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
 hitMesh.name='FixedAccessoryHitArea';hitMesh.position.copy(bounds.getCenter(new THREE.Vector3()));
 return {root,hitMesh,update,prepareInterior,duration,hold:150,progress:0,opening:0,openingFrom:0,hoverOpening:index===1?1:.42,hintProgress:0,hintTarget:0,state:'idle',elapsed:0,outerCover:null};
}

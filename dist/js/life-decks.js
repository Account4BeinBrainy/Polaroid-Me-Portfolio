import * as THREE from 'three';
import {createPhotoDeck,PHOTO_TEMPLATE} from './photo-deck-template.js?v=integrated-20260927-3';
import {locations} from './life-journey-data.js?v=integrated-20260927-3';
import {createLifeAlbum} from './life-album.js?v=loading-20261001-1';
export async function mountLifeDecks(host){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-4,4,3,-3,.1,40);camera.position.set(0,9,9);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xffffff,0xc5c6c3,2));const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-4,8,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:25});key.shadow.normalBias=.015;key.shadow.bias=-.0002;key.shadow.radius=4;scene.add(key);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.16}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),groups=[],assets=[],owned=[];const album=createLifeAlbum();let active=-1,raf,dead=false,down=null,last=null;
 const enabled=()=>!host.hidden&&document.body.dataset.lifeOverlay==='none'&&!document.querySelector('.global-menu-toggle[aria-expanded="true"]');const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const entries=Object.entries(locations);
 function projected(g){const box=new THREE.Box3().setFromObject(g),points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));const xs=points.map(p=>(p.x*.5+.5)*host.clientWidth),ys=points.map(p=>(-p.y*.5+.5)*host.clientHeight);return {left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)}}
 function layout(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);const narrow=w<650,cols=narrow?2:3,rows=narrow?4:3,aspect=w/h,viewH=narrow?Math.max(9,4.5/aspect):7.5;
  camera.left=-viewH*aspect/2;camera.right=viewH*aspect/2;camera.top=viewH/2;camera.bottom=-viewH/2;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  groups.forEach(g=>{g.scale.setScalar(1);g.position.set(0,.04,0);g.rotation.x=0});scene.updateMatrixWorld(true);if(!groups.length)return;
  const base=groups.map(projected),bw=Math.max(...base.map(r=>r.right-r.left)),bh=Math.max(...base.map(r=>r.bottom-r.top)),labelSpace=narrow?36:42,gap=18,pad=14;
  const scale=Math.min((w-2*pad-(cols-1)*24)/cols/bw,(h-2*pad-rows*labelSpace-(rows-1)*gap)/rows/bh),cardH=bh*scale,pitch=cardH+labelSpace+gap,pp=h/viewH;
  groups.forEach((g,i)=>{g.scale.setScalar(scale);const row=narrow?Math.floor(i/2):i<3?0:i<5?1:2,count=narrow?2:row===1?2:3,col=narrow?i%2:row===0?i:row===1?i-3:i-5;
   scene.updateMatrixWorld(true);const r=projected(g),targetX=count===2?w/2+(col-.5)*(w/3):pad+bw*scale/2+col*(w-2*pad-bw*scale)/(count-1),targetY=pad+cardH/2+row*pitch;
   g.position.x+=(targetX-(r.left+r.right)/2)/pp;g.position.z+=(targetY-(r.top+r.bottom)/2)/(pp*Math.SQRT1_2);
  });scene.updateMatrixWorld(true);
  groups.forEach(g=>{const r=projected(g),button=g.userData.button;if(button){button.style.left=`${r.left-8}px`;button.style.top=`${r.top-12}px`;button.style.width=`${r.right-r.left+16}px`;button.style.height=`${r.bottom-r.top+20}px`;button.dataset.projectedWidth=(r.right-r.left).toFixed(2);button.dataset.projectedHeight=(r.bottom-r.top).toFixed(2);button.dataset.modelScale=scale.toFixed(4)}})
 }
 const observer=new ResizeObserver(layout);observer.observe(host);
 for(const [i,[id,place]] of entries.entries()){
  const asset=await createPhotoDeck({id,coverUrl:place.photos[0]?.image});if(dead){asset.dispose();continue}assets.push(asset);asset.top.visible=false;
  const group=new THREE.Group(),box=new THREE.Box3().setFromObject(asset.root),size=box.getSize(new THREE.Vector3());asset.root.scale.setScalar(1.35/PHOTO_TEMPLATE.width);for(let j=0;j<5;j++){const sheet=asset.root.getObjectByName(`Sheet_0${j+1}`);sheet.position.x=(j-2)*.0015;sheet.position.z=(4-j)*.0018;sheet.rotation.y=(j-2)*.025}box.setFromObject(asset.root);asset.root.position.y-=box.min.y;group.add(asset.root);
  const texture=await new THREE.TextureLoader().loadAsync(`/assets/life-journey/black-cards/remade/${id}.png`);texture.colorSpace=THREE.SRGBColorSpace;owned.push(texture);
  const w=1.35,h=w/PHOTO_TEMPLATE.aspect,ear=w*texture.image.height/texture.image.width-h;
  const shape=new THREE.Shape();shape.moveTo(-w/2,-h/2);shape.lineTo(w/2,-h/2);shape.lineTo(w/2,h/2);shape.lineTo(-w*.33,h/2);shape.lineTo(-w*.33,h/2+ear);shape.lineTo(-w/2,h/2+ear);shape.closePath();
  const body=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.006,bevelEnabled:true,bevelSize:.001,bevelThickness:.001,bevelSegments:2,steps:1}),new THREE.MeshStandardMaterial({color:'#171717',roughness:.95}));body.rotation.x=-Math.PI/2;body.position.y=box.max.y-box.min.y+.009;body.castShadow=true;body.receiveShadow=true;group.add(body);owned.push(body.geometry,body.material);
  const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h+ear),new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.1,toneMapped:false}));face.rotation.x=-Math.PI/2;face.position.y=body.position.y+.008;face.position.z=-ear/2;group.add(face);owned.push(face.geometry,face.material);
  group.position.y=.04;group.userData={id,index:i};scene.add(group);groups.push(group);
  const button=document.createElement('button');button.type='button';button.className='life-deck-target';button.ariaLabel=`Open ${place.label} album`;button.innerHTML=`<span>${place.label}</span>`;host.append(button);group.userData.button=button;
  button.onpointerenter=()=>{if(enabled())active=i};button.onpointerleave=()=>{active=-1};button.onfocus=()=>{if(enabled())active=i};button.onkeydown=()=>{down=null};button.onblur=()=>{active=-1};button.onpointerdown=e=>{down={x:e.clientX,y:e.clientY,moved:false}};button.onpointermove=e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>8)down.moved=true};button.onclick=()=>{if(!down?.moved&&enabled())album.open(id,place,button)};
 }
 layout();
 function hit(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);let o=ray.intersectObjects(groups,true)[0]?.object;while(o&&!groups.includes(o))o=o.parent;return o}
 function move(e){if(!enabled())return;if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>8)down.moved=true;active=hit(e)?.userData.index??-1}
 function click(e){if(!enabled()||down?.moved)return;const g=hit(e);if(g)album.open(g.userData.id,locations[g.userData.id],g.userData.button)}
 const onDown=e=>{down={x:e.clientX,y:e.clientY,moved:false}},leave=()=>{active=-1};renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerdown',onDown);renderer.domElement.addEventListener('pointerleave',leave);renderer.domElement.addEventListener('click',click);
 function animate(ts){const dt=last===null?0:Math.min(.05,(ts-last)/1000);last=ts;const visible=!document.hidden&&!host.hidden;
  if(visible){const interactive=enabled();groups.forEach((g,i)=>{const hover=interactive&&!reduced&&i===active,d=1-Math.exp(-dt/.16);g.position.y+=((hover?.16:.04)-g.position.y)*d;g.rotation.x+=((hover?-.045:0)-g.rotation.x)*d;g.userData.button.disabled=!interactive});renderer.render(scene,camera)}raf=requestAnimationFrame(animate)
 }raf=requestAnimationFrame(animate);
 return ()=>{dead=true;cancelAnimationFrame(raf);observer.disconnect();album.dispose();renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerdown',onDown);renderer.domElement.removeEventListener('pointerleave',leave);renderer.domElement.removeEventListener('click',click);assets.forEach(a=>a.dispose());owned.forEach(o=>o.dispose());ground.geometry.dispose();ground.material.dispose();renderer.dispose();host.replaceChildren()};
}

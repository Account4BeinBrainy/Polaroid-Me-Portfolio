export function orbitPoint(progress,index,radiusX,radiusY,count=4){
 const angle=(progress+index/count)*Math.PI*2,phi=-8*Math.PI/180;
 const x=Math.cos(angle)*radiusX,y=Math.sin(angle)*radiusY;
 return {x:x*Math.cos(phi)-y*Math.sin(phi),y:x*Math.sin(phi)+y*Math.cos(phi)};
}
export function advanceProgress(progress,seconds,paused){return paused?progress:(progress+seconds/30)%1;}
export function fitOrbit(width,height,halfWidth,halfHeight){
 let radiusX=width*.0032,radiusY=height*.001;
 const phi=8*Math.PI/180,margin=.15;
 const xExtent=Math.hypot(radiusX*Math.cos(phi),radiusY*Math.sin(phi));
 const yExtent=Math.hypot(radiusX*Math.sin(phi),radiusY*Math.cos(phi));
 const fit=Math.max(0,Math.min(1,(width*.005-halfWidth-margin)/xExtent,(height*.005-halfHeight-margin)/yExtent));
 return {radiusX:radiusX*fit,radiusY:radiusY*fit};
}
export function orbitPose(progress,index,radiusX,radiusY,depthRadius,count=4){
 const p=orbitPoint(progress,index,radiusX,radiusY,count),frontness=-Math.sin((progress+index/count)*Math.PI*2);
 return {...p,z:frontness*depthRadius,scale:1+frontness*.07};
}
export function boxesOverlap(a,b,halfA,halfB,pad=0){return ['x','y','z'].every((axis,i)=>Math.abs(a[axis]-b[axis])<halfA[i]*a.scale+halfB[i]*b.scale+pad);}
// Padded sampled envelopes bound motion between samples, not just the sampled poses.
export function chooseDepth(radiusX,radiusY,halves){
 const count=halves.length;let depth=Math.max(...halves.map(h=>h[2]))*2+.1;const steps=1024;
 for(let attempt=0;attempt<60;attempt++){
  let collision=false;const pad=.025+Math.PI*4*Math.max(radiusX,radiusY,depth)/steps;
  for(let j=0;j<steps&&!collision;j++){
   const poses=halves.map((_,i)=>orbitPose(j/steps,i,radiusX,radiusY,depth,count));
   for(let a=0;a<count;a++)for(let b=a+1;b<count;b++)if(boxesOverlap(poses[a],poses[b],halves[a],halves[b],pad))collision=true;
  }
  if(!collision)return depth;depth*=1.15;
 }
 throw new Error('Certification orbit cannot safely fit these model bounds');
}

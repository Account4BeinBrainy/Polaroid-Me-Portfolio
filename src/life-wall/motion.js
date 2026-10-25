export function fitTileWidth(width,height,count,{tilt,turn,parallax,perspective,depth,lift}){
  // Fit the projected plane, including worst-case parallax and lifted paper, not just its CSS width.
  const extent=tile=>{
    let largest=0;
    for(const pitch of [tilt-parallax*4,tilt+parallax*4])for(const yaw of [turn-parallax*4,turn+parallax*4]){
      const a=pitch*Math.PI/180,b=yaw*Math.PI/180,points=[];
      // Only cards crossing the viewport matter; the track extends far beyond it.
      for(const x of [-1,1])for(const y of [-height*.58,height*.58])for(const z of [-depth,lift-depth]){
        const px=x*count*(tile+18)/2;
        const rx=Math.cos(b)*px+Math.sin(b)*z,rz=-Math.sin(b)*px+Math.cos(b)*z;
        const zz=1.18*(Math.sin(a)*y+Math.cos(a)*rz);
        points.push(1.18*rx/(1-zz/perspective));
      }
      largest=Math.max(largest,Math.max(...points)-Math.min(...points));
    }
    return largest;
  };
  let low=40,high=240;
  const overscan=55+Math.max(0,width-1050)*.5;
  for(let i=0;i<18;i++){const mid=(low+high)/2;if(extent(mid)<=width+overscan)low=mid;else high=mid}
  return Math.floor(low*10)/10;
}
export function wheelPixels(event,height){
  if(event.ctrlKey||event.metaKey||!Number.isFinite(event.deltaY)||Math.abs(event.deltaY)<=Math.abs(event.deltaX))return 0;
  return Math.abs(event.deltaY)*(event.deltaMode===1?16:event.deltaMode===2?height:1);
}
export const addBoost=(boost,pixels)=>Math.min(4,boost+Math.min(pixels,600)/160);
export const decayBoost=(boost,dt)=>1+(boost-1)*Math.exp(-dt/.22);

// Keep simulation positions unwrapped; only the rendered track uses modulo.
export function advanceColumn(state,base,dt,{paused=false,boost=1,frozen=false}={}){
  if(frozen)return {...state,velocity:0};
  if(!dt||!base)return state;
  const direction=Math.sign(base),speed=Math.abs(base)*boost;
  const ideal=state.ideal+base*boost*dt;
  const gap=Math.max(0,direction*(ideal-state.actual));
  const target=paused?0:direction*(speed+Math.min(gap/1.2,Math.abs(base)*2));
  let velocity=state.velocity+(target-state.velocity)*(1-Math.exp(-dt/(paused?.16:.28)));
  if(paused&&Math.abs(velocity)<.08)velocity=0;
  let step=Math.max(0,direction*velocity*dt);
  if(!paused&&step>gap){step=gap;velocity=direction*step/dt}
  return {actual:state.actual+direction*step,ideal,velocity};
}

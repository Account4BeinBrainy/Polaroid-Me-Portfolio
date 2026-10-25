import {useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import CircularCarousel from './CircularCarousel.jsx';
import {certifications} from '/js/certification-data.js?v=orbit-ring-20260929-5';
import {createCertificationModal} from '/js/certification-modal.js?v=navigation-20261001-1';
import {createFilterItem,FILTERS} from '/js/certification-model-viewer.js?v=circular-filter-20260930-2';
import {navigateWithIris,revealArrival} from '/portfolio-navigation.js?v=navigation-20261001-1';
import './filters.css';
const handlers=[],status=document.querySelector('.certificate-status');
let modalOpen=false,loaded=0;
const modal=createCertificationModal(open=>{modalOpen=open;if(!open)handlers.forEach(h=>h?.restore());});
function FilterCard({item,index}){
 const root=useRef(),flip=useRef(),front=useRef(),back=useRef();
 useEffect(()=>{
  let view,cancelled=false,frame=0,angle=0,target=0,last=0,backVisible=false,hover=false;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  function tick(now){frame=0;const dt=last?Math.min((now-last)/1000,.05):1/60;last=now;angle+= (target-angle)*(1-Math.exp(-dt*12));if(Math.abs(target-angle)<.1)angle=target;
   flip.current.style.transform=`rotateY(${angle}deg)`;
   const face=angle>=90;if(view&&face!==backVisible){backVisible=face;(face?back:front).current.append(view.canvas);view.show(face);}
   root.current.dataset.face=backVisible?'model':'filter';root.current.dataset.angle=angle.toFixed(2);
   if(angle!==target)frame=requestAnimationFrame(tick);else last=0;
  }
  function aim(value){target=value;if(reduced.matches)angle=target;if(!frame)frame=requestAnimationFrame(tick);}
  const enter=e=>{if(e.pointerType==='touch'||modalOpen)return;hover=true;aim(180);};
  const leave=()=>{hover=false;if(!modalOpen)aim(0);};
  const element=root.current;
  const outside=e=>{if(e.pointerType==='mouse'&&!modalOpen&&target===180&&!element.contains(e.target))aim(0);};
  document.addEventListener('pointermove',outside);
  element.addEventListener('pointerenter',enter);element.addEventListener('pointerleave',leave);
  element.addEventListener('focus',enter);element.addEventListener('blur',leave);
  handlers[index]={activate(){if(modalOpen)return;if(angle>=170)modal.open(item);else aim(180);},restore(){hover=element.matches(':hover');if(!hover&&document.activeElement!==element)aim(0);}};
  createFilterItem(item,index).then(v=>{if(cancelled){v.dispose();return;}view=v;front.current.append(v.canvas);if(++loaded===6){status.textContent='';revealArrival();}}).catch(e=>{console.error(e);status.textContent='The models could not load. Please reload.';});
  return()=>{cancelled=true;document.removeEventListener('pointermove',outside);cancelAnimationFrame(frame);view?.dispose();handlers[index]=null;element.removeEventListener('pointerenter',enter);element.removeEventListener('pointerleave',leave);element.removeEventListener('focus',enter);element.removeEventListener('blur',leave);};
 },[item,index]);
 return <div ref={root} className="filter-hit" tabIndex={0} role="button" aria-label={`${FILTERS[index]} filter: reveal ${item.title}`} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();handlers[index]?.activate();}}}>
  <div ref={flip} className="filter-flip"><div ref={front} className="filter-front"/><div ref={back} className="filter-back"/></div>
 </div>;
}
const items=certifications.map((item,i)=>({...item,src:'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',alt:FILTERS[i]}));
function App(){return <CircularCarousel items={items} preset="orbit" renderItem={(item,i)=><FilterCard item={item} index={i}/>} onItemClick={(_,i)=>handlers[i]?.activate()}/>;}
const root=createRoot(document.querySelector('#certificate-stage'));root.render(<App/>);
document.querySelector('.portfolio-back').addEventListener('click',e=>{e.preventDefault();navigateWithIris('/?page=boxes');});
addEventListener('pagehide',e=>{if(!e.persisted)root.unmount();});

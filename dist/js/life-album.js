import { loadImage, cancelDeferred } from './resource-loader.js';
import { mountIrisLoading } from '../page-transition.js?v=navigation-20261001-1';
import {photoContentStyle} from './life-journey-data.js?v=dog-rotation-20261005-1';
const CONFIG={depth:220,spread:90,tilt:22,visibleCards:4,falloff:.2,blur:6,duration:700,autoplayDelay:3200};
export function createLifeAlbum(){
 let dialog=null,backdrop=null,disposeCarousel=null,trigger=null,loadingCover=null,loader=null,loadingTimer=null,openingTimeout=null;
 function close(){if(!dialog)return;clearTimeout(loadingTimer);clearTimeout(openingTimeout);loader?.remove();loadingCover?.remove();loader=loadingCover=null;disposeCarousel?.();if(dialog.open)dialog.close();dialog.remove();backdrop.remove();dialog=null;backdrop=null;document.body.dataset.lifeOverlay='none';document.dispatchEvent(new Event('life-album-close'));trigger?.focus({preventScroll:true})}
 return {open(id,place,button){
  if(dialog)return;
  document.dispatchEvent(new Event('life-album-open'));trigger=button;document.body.dataset.lifeOverlay='album';
  dialog=document.createElement('dialog');dialog.className='pd-modal life-modal';dialog.setAttribute('closedby','none');
  dialog.innerHTML=`<div class="pd-modal__content"><button class="pd-back" type="button" aria-label="Back to Life and Journey"><svg viewBox="0 0 120 76" aria-hidden="true" focusable="false"><use href="/assets/ui/back-arrow.svg?v=integrated-20260927-3#back-arrow"/></svg><span>Back</span></button><div class="depth-carousel" aria-label="${place.label} photographs"></div></div>`;
  dialog.addEventListener('cancel',e=>e.preventDefault());dialog.querySelector('.pd-back').onclick=close;
  backdrop=document.createElement('div');backdrop.className='life-modal-backdrop';document.body.append(backdrop,dialog);
  const items=[{type:'blackCard',image:`/assets/life-journey/black-cards/remade/${id}.png`,alt:place.label},...place.photos];
  const thisDialog=dialog;
  disposeCarousel=mountCarousel(dialog.querySelector('.depth-carousel'),items);
  let loaderAt=0;
  loadingTimer=setTimeout(()=>{
   if(dialog!==thisDialog)return;
   loadingCover=document.createElement('div');loadingCover.style.cssText='position:fixed;inset:0;background:#000;z-index:99999';document.body.append(loadingCover);
   loader=mountIrisLoading({guard:false});loaderAt=performance.now();
  },200);
  Promise.race([disposeCarousel.firstView,new Promise(resolve=>{openingTimeout=setTimeout(()=>{console.error('Album first view timed out:',id);resolve()},10000)})]).then(async()=>{
   clearTimeout(openingTimeout);
   if(dialog!==thisDialog)return;
   clearTimeout(loadingTimer);
   if(loaderAt)await new Promise(resolve=>setTimeout(resolve,Math.max(0,400-(performance.now()-loaderAt))));
   if(dialog!==thisDialog)return;
   dialog.show();await new Promise(resolve=>requestAnimationFrame(resolve));
   loader?.remove();loadingCover?.remove();loader=loadingCover=null;
  });
 },dispose:close};
}
function mountCarousel(host,photos){
  photos=photos.filter(item=>item.image);
  host.innerHTML=`<button class="depth-carousel__control prev" type="button" aria-label="Previous photo">‹</button><div class="depth-carousel__stage" tabindex="0"></div><button class="depth-carousel__control next" type="button" aria-label="Next photo">›</button>`;
  const progressive=matchMedia('(max-width:768px), (pointer:coarse)').matches;
  const stage=host.querySelector('.depth-carousel__stage'),cards=photos.map((photo,index)=>{const card=document.createElement('article');card.className='depth-card'+(photo.type==='blackCard'?' is-black-card':'');card.ariaLabel=`Photo ${index+1} of ${photos.length}`;card.innerHTML=photo.type==='blackCard'?`<img data-photo-src="${photo.image}" alt="${photo.alt||''}" draggable="false">`:`<div class="depth-card__edge"></div><div class="depth-card__paper"><div class="depth-card__image">${photo.image?`<img data-photo-src="${photo.albumImage||photo.image}" alt="${photo.alt||''}" style="object-position:${photo.objectPosition||'50% 50%'}">`:''}</div><div class="depth-card__caption"><span>${photo.caption||''}</span></div></div>`;if(photo.frameColor)card.style.setProperty('--album-paper',photo.frameColor);const image=card.querySelector('.depth-card__image img');if(image){Object.assign(image.style,photoContentStyle(photo));image.loading='lazy';image.decoding='async';image.addEventListener('error',()=>{if(image.currentSrc!==new URL(photo.image,location.href).href)image.src=photo.image});}stage.append(card);return card});
  let disposed=false;
  const taskRoute=`${location.pathname}:album`;
  const requested=new Map();
  const previewCover=progressive?photos[0].image.replace('/black-cards/remade/','/black-cards/preview/').replace(/\.png$/,'.webp'):photos[0].image;
  const loadCard=(index,priority=3)=>{
    const image=cards[index]?.querySelector('img');
    if(!image)return Promise.resolve();
    if(requested.has(index))return requested.get(index);
    const source=index===0?previewCover:photos[index].albumImage||photos[index].image;
    const task=loadImage(source,{element:image,priority,route:taskRoute}).catch(()=>source===photos[index].image?image:loadImage(photos[index].image,{element:image,priority,route:taskRoute}).catch(()=>image));
    requested.set(index,task);
    return task;
  };
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;let current=0,position=0,animationFrame=0,loopFrame=0,lastAuto=performance.now(),paused=false,downX=null,dragStart=0,wheelTimer=0;
  const wrap=value=>((value%photos.length)+photos.length)%photos.length;
  function prepareAdjacent(){for(const [index,priority] of [[wrap(current-1),2],[wrap(current+1),1],[wrap(current+2),3]])loadCard(index,priority)}
  function render(){cards.forEach((card,index)=>{let d=wrap(index-position);if(d>photos.length/2)d-=photos.length;const back=Math.max(0,d),shown=Math.abs(d)<=CONFIG.visibleCards+.5,opacity=shown?(d<0?Math.max(0,1+d):1):0,brightness=Math.max(.15,1-back*CONFIG.falloff),blur=CONFIG.blur>0?Math.min(CONFIG.blur,back/Math.max(1,CONFIG.visibleCards)*CONFIG.blur):0;card.style.opacity=String(opacity);card.style.visibility=opacity>0?'visible':'hidden';card.style.pointerEvents='none';card.style.zIndex=String(100-Math.round(back*10));card.style.transform=`translate(-50%,-50%) translateX(${CONFIG.spread*d}px) translateZ(${-CONFIG.depth*d}px) rotateY(${CONFIG.tilt*Math.min(1,back)}deg)`;card.style.filter=`brightness(${brightness}) blur(${blur}px)`})}
  function setFocus(to){cancelAnimationFrame(animationFrame);const from=position,start=performance.now(),duration=reduced?1:CONFIG.duration;const tick=now=>{if(disposed)return;const t=Math.min(1,(now-start)/duration),e=1-(1-t)**3;position=from+(to-from)*e;render();if(t<1)animationFrame=requestAnimationFrame(tick);else{animationFrame=0;current=wrap(Math.round(to));position=wrap(to);render();lastAuto=now;prepareAdjacent()}};animationFrame=requestAnimationFrame(tick)}
  function navigateBy(step){if(photos.length<2||disposed)return;clearTimeout(wheelTimer);loadCard(wrap(Math.round(position)+step),0);setFocus(Math.round(position)+step)}
  host.querySelector('.prev').onclick=()=>navigateBy(-1);host.querySelector('.next').onclick=()=>navigateBy(1);
  stage.addEventListener('pointerdown',event=>{if(downX!==null)return;cancelAnimationFrame(animationFrame);animationFrame=0;downX=event.clientX;dragStart=position;paused=true;stage.setPointerCapture(event.pointerId);stage.classList.add('is-dragging')});
  stage.addEventListener('pointermove',event=>{if(downX===null)return;position=dragStart-(event.clientX-downX)/CONFIG.spread;loadCard(wrap(Math.round(position)),0);render()});
  const end=event=>{if(downX===null)return;downX=null;stage.classList.remove('is-dragging');if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);setFocus(event.type==='pointercancel'?Math.round(dragStart):Math.round(position));paused=false};stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);
  stage.addEventListener('wheel',event=>{if(event.ctrlKey||event.metaKey||(!event.deltaX&&!event.deltaY))return;event.preventDefault();cancelAnimationFrame(animationFrame);animationFrame=0;const horizontal=Math.abs(event.deltaX)>Math.abs(event.deltaY);position+=(horizontal?event.deltaX:event.deltaY)/CONFIG.spread;loadCard(wrap(Math.round(position)),0);render();clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>setFocus(Math.round(position)),120)},{passive:false});stage.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();navigateBy(-1)}if(event.key==='ArrowRight'){event.preventDefault();navigateBy(1)}});
  host.addEventListener('pointerenter',()=>paused=true);host.addEventListener('pointerleave',()=>{if(downX===null){paused=false;lastAuto=performance.now()}});host.addEventListener('focusin',()=>paused=true);host.addEventListener('focusout',()=>{paused=false;lastAuto=performance.now()});
  function loop(now){if(!animationFrame&&!paused&&!reduced&&now-lastAuto>=CONFIG.autoplayDelay){lastAuto=now;navigateBy(1)}loopFrame=requestAnimationFrame(loop)}
  const firstView=Promise.all([loadCard(0,0),loadCard(wrap(1),1)]).then(()=>{if(!disposed){prepareAdjacent();if(progressive)loadImage(photos[0].image,{priority:3,route:taskRoute}).then(()=>{const cover=cards[0]?.querySelector('img');if(!disposed&&cover)cover.src=photos[0].image}).catch(()=>{})}});
  render();loopFrame=requestAnimationFrame(loop);
  const dispose=()=>{disposed=true;cancelDeferred(taskRoute);cancelAnimationFrame(animationFrame);cancelAnimationFrame(loopFrame);clearTimeout(wheelTimer)};
  dispose.firstView=firstView;return dispose;
}

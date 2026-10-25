import {loadImage,prefetchRoute} from './js/resource-loader.js';
import {navigateWithIris,revealArrival} from './portfolio-navigation.js?v=mobile-history-20261001-1';
import {showIrisFailure} from './page-transition.js?v=navigation-20261001-1';
import {mountLifeWall} from './js/life-wall.js?v=dog-rotation-20261005-1';
import {locations} from './js/life-journey-data.js?v=dog-rotation-20261005-1';
import {createLifeAlbum} from './js/life-album.js?v=dog-rotation-20261005-1';
const host=document.querySelector('#journey-wall'),toggle=document.querySelector('.life-view-toggle'),menu=document.querySelector('.life-album-menu'),panel=document.querySelector('#life-album-panel');
let dispose=mountLifeWall(host),album=createLifeAlbum(),hideTimer;
document.body.dataset.lifeView='wall';document.body.dataset.lifeOverlay='none';
for(const [id,place] of Object.entries(locations)){
 const link=document.createElement('a');link.href='#';link.textContent=place.label;link.dataset.albumId=id;
 let cover;const prepareCover=()=>{if(cover)return;cover=loadImage(`/assets/life-journey/black-cards/preview/${id}.webp`,{priority:1}).catch(()=>{});};
 link.addEventListener('pointerenter',prepareCover);link.addEventListener('pointerdown',prepareCover);link.addEventListener('focus',prepareCover);
 link.addEventListener('click',event=>{event.preventDefault();setOpen(false);panel.querySelectorAll('a').forEach(item=>{if(item===link)item.setAttribute('aria-current','true');else item.removeAttribute('aria-current')});album.open(id,place,toggle)});panel.append(link);
}
function setOpen(open){clearTimeout(hideTimer);toggle.setAttribute('aria-expanded',String(open));if(open){panel.hidden=false;requestAnimationFrame(()=>panel.classList.add('is-open'))}else{panel.classList.remove('is-open');hideTimer=setTimeout(()=>panel.hidden=true,300)}}
const outside=event=>{if(!menu.contains(event.target))setOpen(false)},escape=event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){setOpen(false);toggle.focus()}};
toggle.addEventListener('click',()=>{setOpen(toggle.getAttribute('aria-expanded')!=='true')});
document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
document.querySelector('.portfolio-back').addEventListener('click',event=>{event.preventDefault();navigateWithIris('/?page=boxes')});
const wallFirstView = new Promise(resolve => {
 let fallback;
 const finish=()=>{observer.disconnect();clearTimeout(fallback);document.removeEventListener('life-wall-first-view-ready',finish);resolve()};
 const mounted=()=>{
  const wall=host.querySelector('.drift-wall'),rect=wall?.getBoundingClientRect();
  if(!wall||wall.querySelectorAll('.drift-wall__col').length!==4||!rect.width||!rect.height)return;
  observer.disconnect();
  if(wall.dataset.firstViewReady==='true')finish();
  else fallback=setTimeout(finish,1000);
 };
 const observer=new MutationObserver(mounted);
 document.addEventListener('life-wall-first-view-ready',finish);
 observer.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});
 mounted();
});
Promise.all([document.fonts.ready,wallFirstView]).then(()=>revealArrival()).then(()=>prefetchRoute('/?page=boxes')).catch(showIrisFailure);
window.addEventListener('pagehide',event=>{if(event.persisted){setOpen(false);return;}setOpen(false);clearTimeout(hideTimer);panel.hidden=true;dispose?.();dispose=null;album.dispose();document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)});
window.addEventListener('pageshow',()=>{if(!dispose){dispose=mountLifeWall(host);document.body.dataset.lifeView='wall';document.body.dataset.lifeOverlay='none';document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape)}});

// The layout wrapper never touches DriftWall's animated plane transform or its measured width.
const wallLayout=document.querySelector('.journey-wall-layout');
function fitWallLayout(){
 if(matchMedia("(max-width:768px), (pointer:coarse), (orientation:landscape) and (max-height:500px)").matches){wallLayout.style.setProperty("--wall-shift","0px");wallLayout.dataset.shift="0";return;}
 const previous=Number(wallLayout.dataset.shift||0),controls=[document.querySelector('.global-menu-toggle'),toggle].filter(Boolean).map(e=>e.getBoundingClientRect()),back=document.querySelector('.portfolio-back').getBoundingClientRect();
 const cards=[...host.querySelectorAll('.drift-wall__inner')].map(e=>e.getBoundingClientRect()).filter(r=>r.width>40&&r.width<innerWidth&&r.height<innerHeight*2&&r.bottom>0&&r.top<innerHeight);
 if(!cards.length)return;
 const leftCards=cards.filter(r=>controls.some(c=>r.top<c.bottom&&r.bottom>c.top)),rightCards=cards.filter(r=>r.top<back.bottom&&r.bottom>back.top);
 if(!leftCards.length)return;
 const needed=Math.max(0,Math.max(...controls.map(c=>c.right))+28-Math.min(...leftCards.map(r=>r.left-previous-12))),rightLimit=Math.min(innerWidth-12-Math.max(...cards.map(r=>r.right-previous)),rightCards.length?back.left-8-Math.max(...rightCards.map(r=>r.right-previous+12)):Infinity);
 const shift=Math.max(0,Math.min(needed,rightLimit));wallLayout.style.setProperty('--wall-shift',`${shift}px`);wallLayout.dataset.shift=shift.toFixed(2);wallLayout.dataset.conflict=String(needed-rightLimit>4);wallLayout.dataset.requiredShift=needed.toFixed(2);
}
let layoutTimer;const scheduleWallLayout=()=>{clearTimeout(layoutTimer);layoutTimer=setTimeout(fitWallLayout,450)};
window.addEventListener('resize',scheduleWallLayout);document.fonts.ready.then(scheduleWallLayout);scheduleWallLayout();
window.addEventListener('pagehide',()=>{clearTimeout(layoutTimer);window.removeEventListener('resize',scheduleWallLayout)});

window.addEventListener('pageshow',()=>{window.addEventListener('resize',scheduleWallLayout);scheduleWallLayout()});

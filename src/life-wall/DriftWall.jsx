import {photoContentStyle} from '../../dist/js/life-journey-data.js';
// Adapted from https://reactbits.dev/r/DriftWall-JS-CSS.json; original retained in upstream/.
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { POLAROID_SPEC } from '../../dist/js/polaroid-spec.js';
import './DriftWall.css';
import {fitTileWidth,wheelPixels,addBoost,decayBoost,advanceColumn} from './motion.js';

export const columnFactor = (index, variance) => 1 + variance * (((index * 0.6180339887 + 0.35) % 1) * 2 - 1);
export const wrap = (n, length) => ((n % length) + length) % length;
export default function DriftWall({items = [], columns = 4, gap = 18, tilt = 16, turn = -14,
  perspective = 1200, depth = 120, speed = 42, direction = 'up', variance = .45,
  parallax = .6, lift = 64, roll = 0, pauseOnHover = true}) {
  const containerRef = useRef(null), planeRef = useRef(null), trackRefs = useRef([]);
  const offsetsRef = useRef([]), idealRef = useRef([]), velocitiesRef = useRef([]), previousMeta = useRef([]);
  const pointerRef = useRef({x:0,y:0}), pointerDampedRef = useRef({x:0,y:0});
  const hitRef = useRef(null), centerRef = useRef(0);
  const wheelRef=useRef({boost:1,last:0,browsing:false,point:null});
  const downRef=useRef(null);
  const previewRef=useRef(false), previewDialogRef=useRef(null), previewTriggerRef=useRef(null), previewPointRef=useRef(null), previewTimerRef=useRef(null);
  const activeRef = useRef(null), modeRef = useRef(null), hiddenRef = useRef(document.hidden);
  const [activeId,setActiveId] = useState(null), [size,setSize] = useState({width:0,height:0});
  const [previewId,setPreviewId] = useState(null);
  const [reduced,setReduced] = useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const count = Math.min(columns,4);
  const tileWidth = fitTileWidth(size.width||320,size.height||720,count,{tilt,turn,parallax,perspective,depth,lift});
  const tileHeight = tileWidth / POLAROID_SPEC.aspect;
  const columnItems = useMemo(() => {const cols=Array.from({length:count},()=>[]);items.forEach((item,i)=>cols[i%count].push(item));return cols},[items,count]);
  const photos=useMemo(()=>new Map(items.filter(item=>item.type==='photo').map(item=>[item.id,item])),[items]);
  const columnMeta = useMemo(()=>columnItems.map(col=>{
    const copyHeight=Math.max(tileHeight+gap,col.length*(tileHeight+gap));
    return {copyHeight,copies:Math.max(2,Math.ceil(size.height*2.4/copyHeight)+1)};
  }),[columnItems,tileHeight,gap,size.height]);
  const baseVelocities=useMemo(()=>columnItems.map((_,c)=>speed*columnFactor(c,variance)*(direction==='up'?1:-1)*(c%2===0?1:-1)),[columnItems,speed,variance,direction]);
  useEffect(()=>{if(reduced||!size.width)return;let disposed=false,cleanup=()=>{};import('/js/viewport-images.js'+'?v=life-images-20261003').then(({loadViewportImages})=>{if(!disposed)cleanup=loadViewportImages(containerRef.current,baseVelocities)});return()=>{disposed=true;cleanup()};},[reduced,size.width,size.height,items,baseVelocities]);
  const release=useCallback(()=>{
    const el=activeRef.current;
    if(el){el.style.removeProperty('--dw-safe-x');el.style.removeProperty('--dw-safe-y')}
    activeRef.current=null;hitRef.current=null;modeRef.current=null;setActiveId(null);
  },[]);
  const openPreview=useCallback((tile,point)=>{
    const photo=photos.get(tile?.dataset.itemId);
    if(!photo?.image||previewRef.current)return;
    previewRef.current=true;document.body.dataset.lifeOverlay='photoPreview';previewTriggerRef.current=tile;previewPointRef.current=point;
    Object.assign(wheelRef.current,{boost:1,browsing:false,point:null});velocitiesRef.current.fill(0);
    release();setPreviewId(photo.id);
  },[photos,release]);
  const activate=useCallback((tile,mode)=>{
    if(!tile||tile.dataset.type!=='photo'){release();return}
    if(previewRef.current || !containerRef.current?.contains(tile)||wheelRef.current.browsing)return;
    if(activeRef.current===tile){modeRef.current=mode;return}
    release();activeRef.current=tile;hitRef.current=tile.querySelector('.drift-wall__inner').getBoundingClientRect();modeRef.current=mode;setActiveId(tile.dataset.tileId);
    if(mode==='focus'&&!reduced){
      const c=Number(tile.dataset.col),i=Number(tile.dataset.index);
      offsetsRef.current[c]=Math.max(0,i*(tileHeight+gap)-size.height*.45);
      idealRef.current[c]=offsetsRef.current[c];
      containerRef.current.scrollTop=0;containerRef.current.scrollLeft=0;
      trackRefs.current[c].style.transform=`translate3d(0,${-offsetsRef.current[c]}px,0)`;
    }
  },[release,reduced,tileHeight,gap,size.height,columnMeta]);
  const closePreview=useCallback(()=>{
    const dialog=previewDialogRef.current;if(!dialog?.open||previewTimerRef.current)return;
    dialog.classList.remove('is-open');
    previewTimerRef.current=setTimeout(()=>{
      dialog.close();previewTriggerRef.current?.focus({preventScroll:true});
      previewRef.current=false;document.body.dataset.lifeOverlay='none';Object.assign(wheelRef.current,{boost:1,browsing:false});velocitiesRef.current.fill(0);setPreviewId(null);previewTimerRef.current=null;
      const point=previewPointRef.current;
      const tile=point&&document.elementFromPoint(point.x,point.y)?.closest('.drift-wall__inner')?.closest('[data-tile-id]');
      if(tile&&containerRef.current?.contains(tile))activate(tile,'pointer');
    },matchMedia('(prefers-reduced-motion: reduce)').matches?0:210);
  },[activate]);
  useEffect(()=>{
    if(!previewId)return;
    const dialog=previewDialogRef.current;dialog.showModal();
    const raf=requestAnimationFrame(()=>dialog.classList.add('is-open'));
    return()=>cancelAnimationFrame(raf);
  },[previewId]);
  useEffect(()=>()=>{clearTimeout(previewTimerRef.current);if(previewDialogRef.current?.open)previewDialogRef.current.close()},[]);
  useLayoutEffect(()=>{
    const ro=new ResizeObserver(([entry])=>{release();setSize({width:entry.contentRect.width,height:entry.contentRect.height})});
    ro.observe(containerRef.current);return()=>ro.disconnect();
  },[release]);
  useLayoutEffect(()=>{
    offsetsRef.current=columnMeta.map((meta,c)=>previousMeta.current[c]?((offsetsRef.current[c]||0)/previousMeta.current[c].copyHeight)*meta.copyHeight:meta.copyHeight*((c*.37)%1));
    idealRef.current=columnMeta.map((meta,c)=>previousMeta.current[c]?((idealRef.current[c]||0)/previousMeta.current[c].copyHeight)*meta.copyHeight:offsetsRef.current[c]);
    velocitiesRef.current=columnMeta.map((_,c)=>velocitiesRef.current[c]||0);previousMeta.current=columnMeta;
  },[columnMeta]);
  useLayoutEffect(()=>{
    if(!size.width||!size.height)return;
    const frame=requestAnimationFrame(()=>{
      const root=containerRef.current,rect=root?.getBoundingClientRect();
      if(root?.querySelectorAll('.drift-wall__col').length===4&&rect.width>0&&rect.height>0){
        root.dataset.firstViewReady='true';
        document.dispatchEvent(new Event('life-wall-first-view-ready'));
      }
    });
    return()=>cancelAnimationFrame(frame);
  },[size.width,size.height]);
  useEffect(()=>{
    const mq=matchMedia('(prefers-reduced-motion: reduce)');
    const change=e=>{release();setReduced(e.matches)};
    const visibility=()=>{hiddenRef.current=document.hidden;if(document.hidden){Object.assign(wheelRef.current,{boost:1,browsing:false,point:null});velocitiesRef.current.fill(0);release()}};
    const pageShow=()=>{hiddenRef.current=document.hidden};
    const outside=e=>{if(e.target.closest('.global-menu,.life-album-menu')||!containerRef.current?.contains(e.target))release()};
    const navigation=e=>{if(e.target.closest('.global-menu,.life-album-menu')){
      // Discard the old photo position so wheel recovery cannot reactivate it later.
      wheelRef.current.point=null;release();
    }};
    const albumOpening=()=>{wheelRef.current.point=null;release()};
    document.addEventListener('life-album-open',albumOpening);
    document.addEventListener('pointerdown',outside);document.addEventListener('pointermove',navigation);document.addEventListener('focusin',navigation);document.addEventListener('click',navigation,true);
    mq.addEventListener('change',change);document.addEventListener('visibilitychange',visibility);window.addEventListener('pageshow',pageShow);
    return()=>{document.removeEventListener('life-album-open',albumOpening);document.removeEventListener('pointerdown',outside);document.removeEventListener('pointermove',navigation);document.removeEventListener('focusin',navigation);document.removeEventListener('click',navigation,true);mq.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pageshow',pageShow)};
  },[release]);
  useEffect(()=>{
    const root=containerRef.current;
    const wheel=e=>{
      if(reduced||previewRef.current)return;
      const pixels=wheelPixels(e,size.height);if(!pixels)return;
      e.preventDefault();release();
      Object.assign(wheelRef.current,{boost:addBoost(wheelRef.current.boost,pixels),last:performance.now(),browsing:true,point:{x:e.clientX,y:e.clientY}});
    };
    root.addEventListener('wheel',wheel,{passive:false});
    return()=>{root.removeEventListener('wheel',wheel);Object.assign(wheelRef.current,{boost:1,browsing:false,point:null})};
  },[reduced,release,size.height]);
  useEffect(()=>{
    if(reduced||!items.length)return;
    let raf,last=null;
    const animate=ts=>{
      const dt=last===null?0:Math.min(.05,(ts-last)/1000);last=ts;
      if(!hiddenRef.current){
        const wheel=wheelRef.current;
        // Validate actual hit targets, never dropdown open state.
        const point=wheel.point;
        if(modeRef.current==='pointer'&&activeRef.current&&(!point||document.elementFromPoint(point.x,point.y)?.closest('.global-menu,.life-album-menu')))release();
        if(wheel.browsing){
          if(ts-wheel.last>80)wheel.boost=decayBoost(wheel.boost,dt);
          if(ts-wheel.last>1200){
            wheel.boost=1;wheel.browsing=false;
            const point=wheel.point,tile=point&&document.elementFromPoint(point.x,point.y)?.closest('.drift-wall__inner')?.closest('[data-tile-id]');
            if(tile&&containerRef.current.contains(tile))activate(tile,'pointer');
          }
        }
        const frozen=previewRef.current;
        const hoverColumn=!wheel.browsing&&pauseOnHover&&activeRef.current?Number(activeRef.current.dataset.col):-1;
        const paused=frozen||hoverColumn!==-1;
        const p=pointerDampedRef.current;
        // Freeze the plane immediately while selecting; offsets retain original eased stopping.
        if(!paused){const damp=1-Math.exp(-dt/.12);p.x+=(pointerRef.current.x*parallax*8-p.x)*damp;p.y+=(-pointerRef.current.y*parallax*8-p.y)*damp}
        planeRef.current.style.transform=`translate(calc(-50% + ${centerRef.current}px), -50%) scale(1.18) rotateX(${tilt+p.y}deg) rotateY(${turn+p.x}deg) rotateZ(${roll}deg) translateZ(${-depth}px)`;
        const planeRect=planeRef.current.getBoundingClientRect(),rootRect=containerRef.current.getBoundingClientRect();
        const centerError=(rootRect.left+rootRect.right-planeRect.left-planeRect.right)/2;
        if(Math.abs(centerError)>.05)centerRef.current+=centerError*.7;
        columnMeta.forEach((meta,c)=>{
          const next=advanceColumn({actual:offsetsRef.current[c],ideal:idealRef.current[c],velocity:velocitiesRef.current[c]},baseVelocities[c],dt,{paused:c===hoverColumn,boost:wheel.boost,frozen});
          offsetsRef.current[c]=next.actual;idealRef.current[c]=next.ideal;velocitiesRef.current[c]=next.velocity;
          if(trackRefs.current[c])trackRefs.current[c].style.transform=`translate3d(0,${-wrap(next.actual,meta.copyHeight)}px,0)`;
        });
        const tile=activeRef.current;
        if(tile){
          if(modeRef.current==='focus'){containerRef.current.scrollTop=0;containerRef.current.scrollLeft=0}
          const inner=tile.querySelector('.drift-wall__inner'),label=null;
          const r=inner.getBoundingClientRect(),l=label?.getBoundingClientRect(),bounds=containerRef.current.getBoundingClientRect();
          const bottom=l?Math.max(l.bottom,r.bottom):r.bottom;
          const left=l?Math.min(l.left,r.left):r.left,right=l?Math.max(l.right,r.right):r.right;
          const safeEdge=18;
          const dx=Math.max(0,bounds.left+safeEdge-left)-Math.max(0,right-bounds.right+safeEdge);
          const navBottom=Math.max(...[...document.querySelectorAll('.portfolio-back,.global-menu-toggle')].map(el=>{const n=el.getBoundingClientRect();return r.right>n.left-12&&r.left<n.right+12?n.bottom+18:0}));
          const dy=Math.max(0,Math.max(bounds.top+32,navBottom)-r.top)-Math.max(0,bottom-bounds.bottom+32);
          if(Math.abs(dx)>1||Math.abs(dy)>1){
            const currentTransform=new DOMMatrixReadOnly(getComputedStyle(inner).transform);
            const sx=currentTransform.m41,sy=currentTransform.m42;
            tile.style.setProperty('--dw-safe-x',`${sx+dx*.35}px`);tile.style.setProperty('--dw-safe-y',`${sy+dy*.35}px`);
          }
        }
      }
      raf=requestAnimationFrame(animate);
    };
    raf=requestAnimationFrame(animate);return()=>cancelAnimationFrame(raf);
  },[reduced,items.length,columnMeta,baseVelocities,pauseOnHover,parallax,tilt,turn,roll,depth,size.width,activate,release]);
  const pointerMove=e=>{
    if(downRef.current&&Math.hypot(e.clientX-downRef.current.x,e.clientY-downRef.current.y)>8)downRef.current.moved=true;
    if(previewRef.current)return;
    wheelRef.current.point={x:e.clientX,y:e.clientY};
    if(wheelRef.current.browsing||e.pointerType==='touch'||modeRef.current==='touch'||modeRef.current==='focus')return;
    const root=containerRef.current,r=root.getBoundingClientRect();
    if(e.clientX<r.left+8||e.clientX>r.right-8||e.clientY<r.top+8||e.clientY>r.bottom-8){release();return}
    if(!activeRef.current)pointerRef.current={x:(e.clientX-r.left)/r.width-.5,y:(e.clientY-r.top)/r.height-.5};
    const current=activeRef.current;
    if(current){
      // Stable slot plus the lifted paper/label remain one hit region; never select a card behind it.
      const regions=[hitRef.current,...[current.querySelector('.drift-wall__inner'),current.querySelector('.drift-wall__caption')].filter(Boolean).map(el=>el.getBoundingClientRect())].filter(Boolean);
      if(regions.some(b=>{return e.clientX>=b.left&&e.clientX<=b.right&&e.clientY>=b.top&&e.clientY<=b.bottom}))return;
    }
    const tile=e.target.closest('.drift-wall__inner')?.closest('[data-tile-id]');
    if(tile&&tile.dataset.type==='photo'&&root.contains(tile))activate(tile,'pointer');else release();
  };
  const renderTile=(item,id,c,i,copy=0)=> <div key={id} data-tile-id={id} data-item-id={item.id} data-col={c} data-index={i}
    data-type={item.type} className={`drift-wall__tile${activeId===id?' is-active':''}`}
    tabIndex={copy===0?0:-1} aria-label={item.locationLabel} role="group"
    onPointerEnter={e=>{if(e.pointerType!=='touch')activate(e.currentTarget,'pointer')}}
    onPointerLeave={e=>{if(modeRef.current==='pointer'&&activeRef.current===e.currentTarget)release()}}
    onFocus={e=>{if(!previewRef.current&&e.currentTarget.matches(':focus-visible'))activate(e.currentTarget,'focus')}} onBlur={()=>{if(modeRef.current==='focus')release()}}
    onClick={e=>{if(item.type==='photo'&&!downRef.current?.moved){e.stopPropagation();openPreview(e.currentTarget,{x:e.clientX,y:e.clientY})}}}
    onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&item.type==='photo'){e.preventDefault();openPreview(e.currentTarget,previewPointRef.current)}else if(e.key==='Escape'){e.currentTarget.blur();release()}}}>
      <span className={`drift-wall__inner ${item.type==='blackCard'?'is-black-card':'is-photo'}`}>
        {item.type==='photo'?<><span className="drift-wall__paper" style={item.frameColor?{'--polaroid-paper':item.frameColor}:undefined}><span className="drift-wall__image"><img src={reduced?item.wallImage||item.image:undefined} data-photo-src={item.wallImage||item.image} data-photo-fallback={item.image} onError={e=>{if(e.currentTarget.src!==new URL(item.image,location.href).href)e.currentTarget.src=item.image}} alt={item.alt||item.locationLabel} style={{objectPosition:item.objectPosition||'50% 50%',...photoContentStyle(item)}} loading="lazy" decoding="async" draggable={false}/></span><span className="drift-wall__caption" aria-hidden={activeId!==id}><span>{item.caption}</span></span></span></>:<img src={reduced?item.image:undefined} data-photo-src={item.image} alt={`${item.locationLabel} remade darkslide`} loading="lazy" decoding="async" draggable={false}/>}
      </span>
  </div>;
  return <div ref={containerRef} className={`drift-wall${reduced?' drift-wall--reduced':''}`} role="group" aria-label="Life and Journey photographs"
    style={{'--dw-tile-w':`${tileWidth}px`,'--dw-tile-h':`${tileHeight}px`,'--dw-gap':`${gap}px`,'--dw-perspective':`${perspective}px`,'--dw-lift':`${lift}px`,'--dw-plane-h':`${size.height*2}px`,'--dw-plane-w':`${count*(tileWidth+gap)}px`,'--dw-caption-size':`${tileWidth*.079}px`}}
    onPointerMove={pointerMove} onPointerLeave={()=>{wheelRef.current.point=null;if(modeRef.current==='pointer'){release();pointerRef.current={x:0,y:0}}}}
    onPointerDown={e=>{downRef.current={x:e.clientX,y:e.clientY,moved:false};if(e.pointerType==='touch'){const tile=e.target.closest('.drift-wall__inner')?.closest('[data-tile-id]');if(tile&&containerRef.current.contains(tile)){activate(tile,'touch')}else release()}else if(!e.target.closest('[data-tile-id]')){document.activeElement?.blur();release()}}}>
    {reduced?<div className="drift-wall__static">{items.map((item,i)=>renderTile(item,item.id,0,i))}</div>:<div ref={planeRef} className="drift-wall__plane">{columnItems.map((col,c)=><div className="drift-wall__col" key={c}><div className="drift-wall__track" ref={el=>trackRefs.current[c]=el}>{Array.from({length:columnMeta[c].copies},(_,copy)=>col.map((item,i)=>renderTile(item,`${c}-${copy}-${item.id}`,c,i,copy)))}</div></div>)}</div>}
    {previewId&&createPortal(<dialog ref={previewDialogRef} className="pd-image-preview life-image-preview" closedby="none"
      onPointerMove={e=>{previewPointRef.current={x:e.clientX,y:e.clientY}}}
      onClick={e=>{e.stopPropagation();previewPointRef.current={x:e.clientX,y:e.clientY};closePreview()}}
      onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closePreview()}}}
      onCancel={e=>{e.preventDefault();closePreview()}}>
      <img src={photos.get(previewId)?.fullImage||photos.get(previewId)?.image} alt={photos.get(previewId)?.alt||''} data-content-rotation={photos.get(previewId)?.contentRotation||undefined}/>
    </dialog>,document.body)}
  </div>;
}

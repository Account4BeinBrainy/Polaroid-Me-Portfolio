// Circular iris transition — no dependencies

import {beginPageTransition, transitionSignal, guardInitialLoading, resetPageTransitionState} from './navigation-lifecycle.js';
export {resetPageTransitionState} from './navigation-lifecycle.js';
const wait = (ms, signal = transitionSignal()) => new Promise(resolve => {
  let timer;
  const done = () => {clearTimeout(timer);signal.removeEventListener('abort',done);resolve();};
  if(signal.aborted)return done();
  signal.addEventListener('abort',done,{once:true});timer=setTimeout(done,ms);
});

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInCubic = t => t * t * t;

const LOADER_VISUAL = Object.freeze({
  desktopWidth: 93.38, mobileWidth: 73.37, mobileBreakpoint: 600,
  baseWidth: 1.05, trailWidth: 1.15, highlightWidth: 1.3, coreWidth: 1,
  baseOpacity: 0.055, glowBlur: 1.2, glowAlpha: 0.42,
});

const LOADER_ICON = '/assets/loading/polaroid-loader-icon-exact-thick.png';

function cameraLoaderMarkup() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mask = `-webkit-mask-image:url(${LOADER_ICON});mask-image:url(${LOADER_ICON});-webkit-mask-size:contain;mask-size:contain;-webkit-mask-position:center;mask-position:center;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat`;
  const animation = reduced ? 'background-position:50% 50%' : 'animation:camera-loader-sweep 2.8s linear infinite';
  return `<div class="camera-loader-icon" aria-hidden="true" style="position:relative;width:100%;height:auto;aspect-ratio:1.229">
    <style>@keyframes camera-loader-sweep{from{background-position:135% 50%}to{background-position:-35% 50%}}</style>
    <i style="position:absolute;inset:0;${mask};background:rgba(255,255,255,${LOADER_VISUAL.baseOpacity})"></i>
    <i style="position:absolute;inset:0;${mask};background:linear-gradient(90deg,transparent 8%,rgba(255,255,255,.08) 34%,rgba(255,255,255,.95) 50%,rgba(255,255,255,.18) 63%,transparent 88%);background-size:250% 100%;${animation}"></i>
    <i style="position:absolute;inset:0;${mask};background:linear-gradient(90deg,transparent 25%,rgba(255,255,255,${LOADER_VISUAL.glowAlpha}) 50%,transparent 75%);background-size:250% 100%;filter:blur(${LOADER_VISUAL.glowBlur}px);${animation}"></i>
  </div>`;
}

export function mountIrisLoading({guard=true} = {}) {
  if(guard)guardInitialLoading();
  document.querySelector('#iris-camera-loading')?.remove();
  const loader = document.createElement('div');
  loader.id = 'iris-camera-loading'; loader.role = 'status'; loader.ariaLabel = 'Loading';
  loader.style.cssText = 'position:fixed;inset:0;z-index:100000;display:grid;place-items:center;pointer-events:auto;background:transparent';
  const width = matchMedia(`(max-width:${LOADER_VISUAL.mobileBreakpoint}px)`).matches
    ? LOADER_VISUAL.mobileWidth : LOADER_VISUAL.desktopWidth;
  loader.innerHTML = `<div style="width:${width}px;max-width:76vw;background:#000">${cameraLoaderMarkup()}</div>`;
  document.documentElement.appendChild(loader);
  return loader;
}

export function finishInitialLoading() { resetPageTransitionState(); }

export function showIrisFailure(error, retry = () => location.reload(), back = () => location.assign('/')) {
  document.querySelector('#iris-camera-loading')?.remove();
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;inset:0;z-index:100001;display:grid;place-content:center;gap:14px;text-align:center;background:#000;color:#fff;font:16px system-ui';
  panel.innerHTML = `<p>Loading failed: ${String(error?.message || error)}</p><div><button data-retry>Retry</button> <button data-back>Return</button></div>`;
  panel.querySelectorAll('button').forEach(button => button.style.cssText = 'margin:4px;padding:8px 14px;border:1px solid #fff;background:transparent;color:#fff;cursor:pointer');
  panel.querySelector('[data-retry]').onclick = retry;
  panel.querySelector('[data-back]').onclick = back;
  document.documentElement.appendChild(panel);
}

function tweenRadius(circle, from, to, duration, easing, signal = transitionSignal()) {
  return new Promise(resolve => {
    const start = performance.now();
    let raf;
    const done = () => {cancelAnimationFrame(raf);signal.removeEventListener('abort',done);resolve();};
    if(signal.aborted)return done();
    signal.addEventListener('abort',done,{once:true});

    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const value = from + (to - from) * easing(t);

      circle.setAttribute("r", Math.max(0, value));

      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        done();
      }
    }

    raf = requestAnimationFrame(frame);
  });
}

export async function runIrisTransition(onBlack) {
  const signal = beginPageTransition();
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Slightly below mathematical center, matching reference video
  const cx = width * 0.5;
  const cy = height * 0.495;

  // Enough radius to cover all four viewport corners
  const maxRadius =
    Math.max(
      Math.hypot(cx, cy),
      Math.hypot(width - cx, cy),
      Math.hypot(cx, height - cy),
      Math.hypot(width - cx, height - cy)
    ) * 1.03;

  const id = `iris-${Date.now()}`;

  const svg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );

  Object.assign(svg.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    zIndex: "99999",
    pointerEvents: "none"
  });

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "none");

  svg.innerHTML = `
    <defs>
      <mask id="${id}" maskUnits="userSpaceOnUse">
        <rect
          x="0"
          y="0"
          width="${width}"
          height="${height}"
          fill="white"
        />
        <circle
          id="${id}-hole"
          cx="${cx}"
          cy="${cy}"
          r="${maxRadius}"
          fill="black"
        />
      </mask>
    </defs>

    <rect
      x="0"
      y="0"
      width="${width}"
      height="${height}"
      fill="#000"
      mask="url(#${id})"
    />
  `;

  svg.dataset.irisTransition = "";
  document.body.appendChild(svg);

  const circle = svg.querySelector(`#${id}-hole`);

  // 1. Current page closes into black
  await tweenRadius(
    circle,
    maxRadius,
    0,
    850,
    easeOutCubic
  );

  if(signal.aborted)return false;
  let loader, loaderAt = 0;
  const loaderTimer = setTimeout(() => {
    if (!signal.aborted) { loader = mountIrisLoading(); loaderAt = performance.now(); }
  }, 200);

  // 2. Screen is now completely black.
  // Switch from camera page to film-box page HERE.
  if (onBlack) {
    try { await Promise.race([onBlack(), new Promise(resolve=>signal.addEventListener("abort",resolve,{once:true}))]); }
    catch (error) { clearTimeout(loaderTimer); showIrisFailure(error); return false; }
  }

  clearTimeout(loaderTimer);
  if(signal.aborted)return false;
  if(loaderAt) await wait(Math.max(0, 400 - (performance.now() - loaderAt)),signal);
  if(signal.aborted)return false;
  loader?.remove();

  // 3. Reveal second page
  await tweenRadius(
    circle,
    0,
    maxRadius,
    700,
    easeInCubic
  );

  if(signal.aborted)return false;
  svg.remove();
  resetPageTransitionState();
  return true;
}

export async function revealIrisArrival() {
  const cover = document.querySelector('#iris-arrival-cover');
  if (!cover) return false;
  const firstView = window.__firstViewLoading;
  if (firstView) {
    firstView.ready = true;
    clearTimeout(firstView.timer);
    clearTimeout(firstView.timeout);
    if (firstView.loaderAt) await wait(Math.max(0, 400 - (performance.now() - firstView.loaderAt)));
  }
  if (!cover.isConnected) return false;
  const signal = transitionSignal();
  document.querySelector('#iris-camera-loading')?.remove();
  if (cover.dataset.arrival === 'direct') {
    cover.remove();
    resetPageTransitionState();
    return true;
  }
  const width = window.innerWidth, height = window.innerHeight;
  const cx = width * 0.5, cy = height * 0.495;
  const maxRadius = Math.max(
    Math.hypot(cx, cy), Math.hypot(width - cx, cy),
    Math.hypot(cx, height - cy), Math.hypot(width - cx, height - cy)
  ) * 1.03;
  const id = `iris-arrival-${Date.now()}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  Object.assign(svg.style, { position:'fixed', inset:'0', width:'100vw', height:'100vh', zIndex:'99999', pointerEvents:'none' });
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.innerHTML = `<defs><mask id="${id}" maskUnits="userSpaceOnUse"><rect width="${width}" height="${height}" fill="white"/><circle id="${id}-hole" cx="${cx}" cy="${cy}" r="0" fill="black"/></mask></defs><rect width="${width}" height="${height}" fill="#000" mask="url(#${id})"/>`;
  svg.dataset.irisTransition = "";
  document.body.appendChild(svg); cover.remove();
  await tweenRadius(svg.querySelector(`#${id}-hole`), 0, maxRadius, 700, easeInCubic);
  if(signal.aborted)return false;
  svg.remove();
  resetPageTransitionState();
  return true;
}

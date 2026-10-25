/* Motion controls: milliseconds, pixels, degrees. No animation dependencies. */
const MOTION = Object.freeze({
  pressDuration: 120,
  releaseDuration: 100,
  mechanicalPause: 160,
  ejectDuration: 780,
  holdDuration: 300,
  reducedDuration: 200,
  pressY: 2,
  pressScale: 0.995,
  hoverX: 0.5,
  hoverY: 1.2,
  hoverZ: 0.6,
  hoverLift: -2,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
});

const stage = document.querySelector('.camera-stage');
const object = document.querySelector('.camera-object');
const trigger = document.querySelector('.camera-trigger');
const paper = document.querySelector('.photo-card');
const status = document.querySelector('#camera-status');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const animations = new Set();
let phase = 'idle';
let runId = 0;

function setPhase(next) {
  phase = next;
  stage.dataset.phase = next;
  stage.dataset.state = next === 'ready' ? 'ready-for-transition' : next;
  const busy = !['idle', 'hover', 'ready'].includes(next);
  trigger.setAttribute('aria-disabled', String(!['idle', 'hover'].includes(next)));
  stage.setAttribute('aria-busy', String(busy));
}

function rest() {
  object.style.setProperty('--tilt-x', '0deg');
  object.style.setProperty('--tilt-y', '0deg');
  object.style.setProperty('--tilt-z', '0deg');
  object.style.setProperty('--lift', '0px');
}

function followPointer(event) {
  if (!finePointer.matches || reducedMotion.matches || !['idle', 'hover'].includes(phase)) return;
  if (event.pointerType !== 'mouse') return;
  const bounds = stage.getBoundingClientRect();
  const clamp = (value) => Math.max(-1, Math.min(1, value));
  const x = clamp(((event.clientX - bounds.left) / bounds.width - 0.5) * 2);
  const y = clamp(((event.clientY - bounds.top) / bounds.height - 0.5) * 2);
  setPhase('hover');
  object.style.setProperty('--tilt-x', `${-y * MOTION.hoverX}deg`);
  object.style.setProperty('--tilt-y', `${x * MOTION.hoverY}deg`);
  object.style.setProperty('--tilt-z', `${x * MOTION.hoverZ}deg`);
  object.style.setProperty('--lift', `${MOTION.hoverLift}px`);
}

async function animate(element, keyframes, options, token) {
  const animation = element.animate(keyframes, { fill: 'forwards', ...options });
  animations.add(animation);
  try {
    await animation.finished;
    if (token !== runId) throw new DOMException('Sequence reset', 'AbortError');
    return animation;
  } catch (error) {
    animations.delete(animation);
    animation.cancel();
    throw error;
  }
}

function clearAnimation(animation) {
  animation.cancel();
  animations.delete(animation);
}

async function printPhoto() {
  // Hover is the idle object's visual substate; settle it before locking the run.
  if (phase === 'hover') setPhase('idle');
  if (phase !== 'idle') return;
  const token = ++runId;
  const startingPose = getComputedStyle(object).transform;
  const startPaper = getComputedStyle(paper).transform;
  setPhase('pressing');
  rest();
  status.textContent = '正在打印照片。';

  try {
    if (!reducedMotion.matches) {
      const total = MOTION.pressDuration + MOTION.releaseDuration;
      const pressing = await animate(object, [
        { transform: startingPose, offset: 0, easing: MOTION.easing },
        { transform: `translateY(${MOTION.pressY}px) scale(${MOTION.pressScale})`, offset: MOTION.pressDuration / total, easing: MOTION.easing },
        { transform: 'none', offset: 1 },
      ], { duration: total, easing: 'linear' }, token);
      clearAnimation(pressing);
      // A constant-value animation supplies the mechanical pause without timers.
      const pause = await animate(object, [{ opacity: 1 }, { opacity: 1 }], {
        duration: MOTION.mechanicalPause,
      }, token);
      clearAnimation(pause);
    }

    setPhase('ejecting');
    const destination = 'translateY(var(--photo-final-offset))';
    const eject = await animate(paper, [
      { transform: startPaper },
      { transform: destination },
    ], {
      duration: reducedMotion.matches ? MOTION.reducedDuration : MOTION.ejectDuration,
      easing: reducedMotion.matches ? 'linear' : MOTION.easing,
    }, token);
    // CSS percentage remains responsive after resize; release WAAPI's pixel snapshot.
    paper.style.transform = destination;
    clearAnimation(eject);

    const hold = await animate(paper, [{ opacity: 1 }, { opacity: 1 }], {
      duration: reducedMotion.matches ? 0 : MOTION.holdDuration,
    }, token);
    clearAnimation(hold);
    setPhase('ready');
    status.textContent = '照片已打印，停留在出片口。';
    // Future page transitions can subscribe here; this prototype never navigates.
    stage.dispatchEvent(new CustomEvent('polaroid:ready', { bubbles: true }));
  } catch (error) {
    if (error.name !== 'AbortError') {
      reset();
      console.error('Polaroid interaction failed:', error);
      status.textContent = '照片未能打印，请再试一次。';
    }
  }
}

function reset() {
  runId += 1;
  for (const animation of animations) animation.cancel();
  animations.clear();
  paper.style.removeProperty('transform');
  rest();
  setPhase('idle');
  status.textContent = '';
}

trigger.addEventListener('pointerenter', followPointer);
trigger.addEventListener('pointermove', followPointer);
trigger.addEventListener('pointerleave', () => {
  rest();
  if (phase === 'hover') setPhase('idle');
});
trigger.addEventListener('blur', () => {
  rest();
  if (phase === 'hover') setPhase('idle');
});
trigger.addEventListener('click', printPhoto);
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  if (event.key === 'Escape' || event.key.toLowerCase() === 'r') reset();
});
reducedMotion.addEventListener('change', rest);
finePointer.addEventListener('change', rest);
setPhase('idle');

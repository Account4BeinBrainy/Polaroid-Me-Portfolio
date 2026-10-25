// Degrees per CSS pixel; only the outer display group's Y rotation changes.
export const TURN = Object.freeze({ speed: 0.4 * Math.PI / 180, threshold: 5, hover: 5 * Math.PI / 180, returnMs: 600 });
export function installCameraControls(host, group, render) {
  let pointer = null, held = false, suppressClick = false, returning = null;
  const locked = () => ['centering', 'printing', 'ready'].includes(host.dataset.phase);
  let animation = null;
  let target = 0, frame = 0, previous = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  function draw() {
    host.dataset.yaw = String(group.rotation.y);
    host.dataset.interaction = pointer?.dragged ? 'dragging' : returning ? 'returning' : held ? 'held' : 'hover';
    render();
  }
  function tick(now) {
    frame = 0;
    if (animation) {
      const active = animation(now);
      if (!active) animation = null;
      draw();
      if (active) wake();
      return;
    }
    if (returning) {
      const t = Math.min(1, (now - returning.start) / TURN.returnMs);
      group.rotation.y = returning.from * (1 - t) ** 3;
      if (t === 1) { group.rotation.y = 0; returning = null; held = false; }
    } else if (!pointer && !held) {
      group.rotation.y += (target - group.rotation.y) * (1 - Math.exp(-Math.min(now - previous, 64) / 70));
      if (Math.abs(target - group.rotation.y) < 0.00001) group.rotation.y = target;
    }
    previous = now;
    draw();
    if (returning || (!pointer && !held && group.rotation.y !== target)) wake();
  }
  function wake() { if (!frame) frame = requestAnimationFrame(tick); }
  function release() {
    const id = pointer?.id;
    pointer = null;
    host.classList.remove('is-dragging');
    if (id !== undefined && host.hasPointerCapture(id)) host.releasePointerCapture(id);
  }
  function reset() {
    if (locked()) return;
    release(); target = 0;
    const from = Math.atan2(Math.sin(group.rotation.y), Math.cos(group.rotation.y));
    group.rotation.y = from;
    returning = { from, start: performance.now() };
    if (reduced.matches) { returning = null; held = false; group.rotation.y = 0; }
    wake();
  }
  host.addEventListener('pointerdown', e => {
    if (locked() || pointer || !e.isPrimary || e.button !== 0) return;
    returning = null; suppressClick = false;
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, angle: group.rotation.y, dragged: false };
    host.setPointerCapture(e.pointerId);
    host.classList.add('pointer-focus');
    host.focus({ preventScroll: true });
  });
  host.addEventListener('pointermove', e => {
    if (locked()) return;
    if (pointer) {
      if (e.pointerId !== pointer.id) return;
      const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
      if (!pointer.dragged && Math.hypot(dx, dy) > TURN.threshold) {
        suppressClick = true;
        if (e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx)) { release(); return; }
        pointer.dragged = true; held = true;
        host.classList.add('is-dragging');
      }
      if (pointer.dragged) { group.rotation.y = pointer.angle + dx * TURN.speed; draw(); }
    } else if (!held && !returning && e.pointerType === 'mouse' && fine.matches && !reduced.matches) {
      const rect = host.getBoundingClientRect();
      target = Math.max(-1, Math.min(1, 2 * (e.clientX - rect.left) / rect.width - 1)) * TURN.hover;
      wake();
    }
  });
  host.addEventListener('pointerup', e => {
    if (e.pointerId !== pointer?.id) return;
    release(); draw();
    const r = host.getBoundingClientRect();
    if (e.pointerType === 'mouse' && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) reset();
  });
  host.addEventListener('pointercancel', e => { if (e.pointerId === pointer?.id) reset(); });
  host.addEventListener('lostpointercapture', e => { if (e.pointerId === pointer?.id) reset(); });
  host.addEventListener('pointerleave', e => { if (!pointer && e.pointerType === 'mouse') reset(); });
  host.addEventListener('click', e => { if (suppressClick) { e.preventDefault(); e.stopImmediatePropagation(); suppressClick = false; } }, true);
  host.addEventListener('keydown', e => {
    host.classList.remove('pointer-focus');
    if (locked()) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault(); returning = null; held = true;
      group.rotation.y += (e.key === 'ArrowLeft' ? -1 : 1) * Math.PI / 12; draw();
    }
  });
  window.addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest('input,textarea,[contenteditable="true"]')) reset();
  });
  window.addEventListener('blur', reset);
  window.addEventListener('pagehide',release);
  window.addEventListener('pageshow',event=>{if(event.persisted){previous=performance.now();wake();}});
  reduced.addEventListener('change', reset);
  draw();
  function lock() { release(); held = true; returning = null; target = group.rotation.y; }
  return { lock, animate(callback) { lock(); animation = callback; wake(); },
    reset() { animation = null; held = false; returning = null; target = 0; group.rotation.y = 0; release(); draw(); } };

}

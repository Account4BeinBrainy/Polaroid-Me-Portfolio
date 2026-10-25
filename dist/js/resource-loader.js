// One queue for page media. The browser still owns HTTP and decoded-image caches.
const tasks = new Map();
let active = 0, deferredActive = 0, sequence = 0;
const limit = matchMedia('(max-width:768px), (pointer:coarse)').matches ? 4 : 6;
const slow = navigator.connection?.saveData || /^(slow-2g|2g)$/.test(navigator.connection?.effectiveType || '');
let routeOpen = true;

function pump() {
  while (active < limit) {
    const next = [...tasks.values()].filter(task => task.state === 'queued' && (!slow || task.priority < 3)
      && (task.priority <= 1 || active < limit - 1))
      .sort((a, b) => a.priority - b.priority || a.order - b.order)[0];
    if (!next || (next.priority >= 3 && deferredActive)) break;
    if (next.priority >= 3) deferredActive++;
    next.state = 'running'; active++;
    Promise.resolve().then(next.run).then(value => {
      next.state = 'done'; next.resolve(value);
    }, error => {
      tasks.delete(next.key); next.reject(error);
    }).finally(() => { active--; if (next.priority >= 3) deferredActive--; pump(); });
  }
}

export function scheduleResource({ url, type = 'image', route = location.pathname, priority = 3, run }) {
  const key = `${type}:${new URL(url, location.href).href}`;
  let task = tasks.get(key);
  if (task) {
    task.routes.add(route);
    task.priority = Math.min(task.priority, priority);
    if (task.state === 'queued') task.run = run || task.run;
    pump(); return task.promise;
  }
  task = { key, routes: new Set([route]), priority, run, state: 'queued', order: sequence++ };
  task.promise = new Promise((resolve, reject) => Object.assign(task, { resolve, reject }));
  tasks.set(key, task); pump(); return task.promise;
}

export function loadImage(url, { element, priority = 3, route = location.pathname } = {}) {
  const run = () => new Promise((resolve, reject) => {
    const image = element || new Image();
    image.fetchPriority = priority <= 1 ? 'high' : priority === 2 ? 'auto' : 'low';
    image.loading = 'eager'; image.decoding = 'async';
    image.addEventListener('load', () => Promise.resolve(image.decode?.()).then(() => resolve(image), reject), { once: true });
    image.addEventListener('error', reject, { once: true });
    image.src = url;
    if (image.complete && image.naturalWidth) Promise.resolve(image.decode?.()).then(() => resolve(image), reject);
  });
  return scheduleResource({ url, route, priority, run }).then(async result => {
    if (!result) return null;
    if (element && !(element.complete && element.naturalWidth)) {
      if (element.complete && !element.naturalWidth) element.removeAttribute('src');
      element.src = url;
      await element.decode?.();
      if (!element.naturalWidth) throw new Error(`Image unavailable: ${url}`);
    }
    return element;
  });
}

export function cancelDeferred(route = location.pathname) {
  for (const task of tasks.values()) {
    if (route === null) task.routes.clear();
    else task.routes.delete(route);
    if (task.routes.size || task.state !== 'queued' || task.priority < 3) continue;
    tasks.delete(task.key); task.state = 'cancelled'; task.resolve(null);
  }
}

addEventListener('pagehide', () => { routeOpen = false; cancelDeferred(null); });
addEventListener('pageshow', () => { routeOpen = true; });

export function prefetchRoute(url) {
  if (slow) return;
  const currentRoute = location.pathname;
  const idle = window.requestIdleCallback || (callback => setTimeout(callback, 1500));
  idle(() => { if (!routeOpen || location.pathname !== currentRoute) return; scheduleResource({ url, type: 'route', priority: 4,
    run: () => fetch(url, { credentials: 'same-origin' }).then(response => {
      if (!response.ok) throw new Error(`Route ${url}: ${response.status}`);
    }) }).catch(() => {}); });
}

import {cancelDeferred} from './resource-loader.js';

// Moving columns repeat tiles. Keep one download/decode state for each URL.
export function loadViewportImages(root, velocities = []) {
  const columns = [...root.querySelectorAll('.drift-wall__col')].map(col => [...col.querySelectorAll('img[data-photo-src]')]);
  const assets = new Map();
  for (const image of columns.flat()) {
    const url = image.dataset.photoSrc;
    if (!assets.has(url)) assets.set(url, {url, fallback:image.dataset.photoFallback, images:new Set(), state:'idle', priority:3, retries:0});
    assets.get(url).images.add(image);
  }
  const mobile = matchMedia('(max-width:768px), (pointer:coarse)').matches;
  const networkLimit = mobile ? 5 : 7, decodeLimit = mobile ? 2 : 3;
  const decodeQueue = [];
  let disposed = false, suspended = false, networkActive = 0, decodeActive = 0, generation = 0;
  const apply = asset => {
    if (asset.state !== 'ready') return;
    for (const image of asset.images) if (image.src !== asset.objectUrl) image.src = asset.objectUrl;
  };

  function fail(asset) {
    if (asset.objectUrl) URL.revokeObjectURL(asset.objectUrl);
    asset.objectUrl = null;
    if (!asset.usingFallback && asset.fallback && asset.fallback !== asset.url) {
      asset.usingFallback = true; asset.state = 'queued'; pump(); return;
    }
    asset.retries++;
    asset.state = asset.retries <= 2 ? 'failed' : 'cancelled';
    if (asset.retries <= 2) setTimeout(() => {
      if (disposed || suspended || asset.state !== 'failed') return;
      asset.state = 'idle'; asset.usingFallback = false; scan();
    }, asset.retries === 1 ? 500 : 1500);
  }

  function pumpDecode() {
    if (disposed || suspended) return;
    while (decodeActive < decodeLimit && decodeQueue.length) {
      decodeQueue.sort((a,b) => a.priority - b.priority);
      const asset = decodeQueue.shift();
      if (asset.state !== 'downloaded') continue;
      asset.state = 'decoding'; decodeActive++;
      const decoder = new Image(), epoch = generation; decoder.src = asset.objectUrl;
      decoder.decode().then(() => {
        if (disposed || suspended || epoch !== generation) return;
        asset.state = 'ready'; apply(asset);
      }, () => { if (!disposed && !suspended && epoch === generation) fail(asset); })
        .finally(() => { decodeActive--; pumpDecode(); pump(); });
    }
  }

  function pump() {
    if (disposed || suspended || document.hidden) return;
    while (networkActive < networkLimit) {
      const asset = [...assets.values()].filter(item => item.state === 'queued').sort((a,b) => a.priority - b.priority)[0];
      if (!asset) break;
      const controller = new AbortController(), epoch = generation;
      asset.controller = controller; asset.state = 'loading'; networkActive++;
      fetch(asset.usingFallback ? asset.fallback : asset.url, {signal:controller.signal})
        .then(response => {
          if (!response.ok) throw new Error(`Image ${response.status}: ${asset.url}`);
          return response.blob();
        }).then(blob => {
          if (disposed || suspended || epoch !== generation) return;
          asset.objectUrl = URL.createObjectURL(blob);
          asset.state = 'downloaded'; decodeQueue.push(asset); pumpDecode();
        }).catch(error => {
          if (!disposed && !suspended && epoch === generation && error.name !== 'AbortError') fail(asset);
        }).finally(() => { networkActive--; pump(); });
    }
    pumpDecode();
  }

  function enqueue(image, priority) {
    const asset = assets.get(image.dataset.photoSrc);
    if (!asset) return;
    asset.priority = Math.min(asset.priority, priority);
    if (asset.state === 'ready') { apply(asset); return; }
    if (asset.state === 'idle') asset.state = 'queued';
  }

  function scan() {
    if (disposed || suspended || document.hidden) return;
    const view = root.getBoundingClientRect();
    columns.forEach((images, column) => {
      const forward = Math.sign(velocities[column] || (column % 2 ? -1 : 1));
      const ahead = [];
      for (const image of images) {
        const rect = image.getBoundingClientRect();
        if (rect.bottom > view.top && rect.top < view.bottom && rect.right > view.left && rect.left < view.right) enqueue(image, 1);
        else {
          const distance = forward > 0 ? rect.top - view.bottom : view.top - rect.bottom;
          if (distance >= 0 && distance < view.height * 2) ahead.push({image, distance});
        }
      }
      ahead.sort((a,b) => a.distance - b.distance).slice(0,3).forEach(({image}) => enqueue(image, 2));
    });
    pump();
    if (new URLSearchParams(location.search).get('debug') === 'loading') {
      root.dataset.loading = JSON.stringify([...assets.values()].reduce((counts, asset) => {
        counts[asset.state] = (counts[asset.state] || 0) + 1; return counts;
      }, {generation, networkActive, decodeActive}));
    }
  }

  function resume() {
    if (!suspended) { scan(); return; }
    suspended = false; generation++;
    for (const asset of assets.values()) {
      if (['loading','downloaded','decoding'].includes(asset.state)) {
        if (asset.objectUrl) URL.revokeObjectURL(asset.objectUrl);
        asset.objectUrl = null; asset.state = 'idle';
      }
      else apply(asset);
    }
    decodeQueue.length = 0; scan();
  }
  const onShow = () => resume();
  const onAlbumClose = () => { cancelDeferred(`${location.pathname}:album`); resume(); };
  const onHide = () => {
    suspended = true; generation++;
    for (const asset of assets.values()) asset.controller?.abort();
    decodeQueue.length = 0;
  };
  addEventListener('pageshow', onShow);
  addEventListener('pagehide', onHide);
  document.addEventListener('life-album-close', onAlbumClose);
  const timer = setInterval(scan, 250);
  scan();
  return () => {
    disposed = true; onHide(); clearInterval(timer);
    for (const asset of assets.values()) if (asset.objectUrl) URL.revokeObjectURL(asset.objectUrl);
    removeEventListener('pageshow', onShow); removeEventListener('pagehide', onHide);
    document.removeEventListener('life-album-close', onAlbumClose);
  };
}

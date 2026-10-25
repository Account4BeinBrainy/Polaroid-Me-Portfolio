// Installed in the head, before any page can paint. BFCache restores do not rerun it.
const cover = document.createElement('div');
cover.id = 'iris-arrival-cover';
cover.dataset.arrival = sessionStorage.getItem('iris-arrival') === '1' ? 'iris' : 'direct';
cover.style.cssText = 'position:fixed;inset:0;background:#000;z-index:99999;pointer-events:auto';
document.documentElement.appendChild(cover);
const firstView = window.__firstViewLoading = {ready:false,loaderAt:0};
firstView.timer = setTimeout(() => {
  if (firstView.ready || !cover.isConnected) return;
  import('./page-transition.js?v=navigation-20261001-1').then(({mountIrisLoading}) => {
    if (!firstView.ready && cover.isConnected) { mountIrisLoading(); firstView.loaderAt = performance.now(); }
  });
}, 200);
firstView.timeout = setTimeout(() => {
  if (firstView.ready || !cover.isConnected) return;
  console.error('First view timed out:', location.href);
  firstView.ready = true;
  clearTimeout(firstView.timer);
  document.querySelector('#iris-camera-loading')?.remove();
  cover.remove();
}, 10000);

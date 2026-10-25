import { navigateWithIris } from './portfolio-navigation.js?v=mobile-history-20261001-1';

export const MENU_ITEMS = Object.freeze([
  { label: 'Camera', target: '/' },
  { label: 'Accessories', target: '/?page=boxes' },
  { label: 'Professional Projects', target: '/professional-projects.html' },
  { label: 'Certification & Achievement', target: '/certification-achievement.html' },
  { label: 'Life & Journey', target: '/life-journey.html' },
]);

const currentTarget = () => {
  const path = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  if (path === '/' && (new URLSearchParams(location.search).get('page') === 'boxes' || document.querySelector('#film-box-page')?.hidden === false)) return '/?page=boxes';
  return path === '/' ? '/' : `${path}.html`;
};

export function createGlobalMenu() {
  const root = document.createElement('div');
  root.className = 'global-menu';
  root.innerHTML = `<button class="global-menu-toggle" type="button" aria-expanded="false" aria-controls="global-menu-panel">Menu</button><nav class="global-menu-panel" id="global-menu-panel" aria-label="Main navigation" hidden>${MENU_ITEMS.map(({ label, target }) => `<a href="${target}">${label}</a>`).join('')}</nav>`;
  (document.querySelector('.journey-top-controls')||document.body).append(root);
  const toggle = root.querySelector('.global-menu-toggle');
  const panel = root.querySelector('.global-menu-panel');
  let open = false, hideTimer;
  const syncCameraGate = () => {
    const hidden = document.body.dataset.cameraFirstExit === 'transitioning' || location.pathname.replace(/\/index\.html$/, '/') === '/'
      && new URLSearchParams(location.search).get('page') !== 'boxes'
      && document.querySelector('#camera-page')?.hidden === false
      && document.querySelector('#film-box-page')?.hidden === true
      && sessionStorage.getItem('camera-menu-unlocked') !== '1';
    if (root.hidden !== hidden) root.hidden = hidden;
  };
  syncCameraGate();
  document.addEventListener('camera-menu-unlocked',syncCameraGate);
  const setOpen = next => {
    clearTimeout(hideTimer); open = next;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      const entering = panel.hidden;
      panel.hidden = false;
      if (entering) panel.style.cssText = 'opacity:0;transform:translateY(-12px) scale(.96)';
      requestAnimationFrame(() => { panel.style.cssText = ''; panel.classList.add('is-open'); });
    } else {
      panel.classList.remove('is-open');
      hideTimer = setTimeout(() => { if (!open) panel.hidden = true; }, 380);
    }
  };
  const syncModal = () => {
    const blocked = !!document.querySelector('dialog[open]');
    if (blocked) setOpen(false);
    root.inert = blocked;
  };
  const modalObserver = new MutationObserver(() => { syncModal();syncCameraGate(); });
  modalObserver.observe(document.body, {subtree:true, attributes:true, attributeFilter:['open','hidden'], childList:true});
  syncModal();
  toggle.addEventListener('click', () => setOpen(!open));
  panel.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    event.preventDefault(); setOpen(false);
    if (link.getAttribute('href') !== currentTarget()) navigateWithIris(link.href);
  });
  const outside = event => { if (!root.contains(event.target)) setOpen(false); };
  const escape = event => { if (event.key === 'Escape' && open) setOpen(false); };
  document.addEventListener('pointerdown', outside);
  document.addEventListener('keydown', escape);
  addEventListener('pagehide', event => { setOpen(false);clearTimeout(hideTimer);panel.hidden=true;if(!event.persisted){modalObserver.disconnect();document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape);} });
  addEventListener('pageshow', () => { syncModal();syncCameraGate(); });
  return root;
}

createGlobalMenu();

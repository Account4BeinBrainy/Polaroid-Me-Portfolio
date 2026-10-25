// Shared across versioned entry modules: one transition owner per document.
let controller = new AbortController(), fallback;
export const isHistoryRestore = () => performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
export function resetPageTransitionState() {
  clearTimeout(fallback); fallback=undefined;
  controller.abort(); controller = new AbortController();
  document.querySelectorAll('[data-iris-transition],#iris-camera-loading,#iris-arrival-cover').forEach(node => node.remove());
  for (const node of [document.documentElement, document.body].filter(Boolean)) {
    if (node.classList.contains('is-loading') || node.classList.contains('is-transitioning')) {
      node.style.removeProperty('pointer-events'); node.style.removeProperty('overflow');
    }
    node.classList.remove('is-loading', 'is-transitioning');
  }
  window.dispatchEvent(new Event('page-transition-reset'));
}
export function beginPageTransition() {
  resetPageTransitionState();
  fallback = setTimeout(resetPageTransitionState, 15000);
  return controller.signal;
}
export function transitionSignal() { return controller.signal; }
export function guardInitialLoading() {
  if(fallback===undefined)fallback = setTimeout(resetPageTransitionState, 30000);
}
addEventListener('pagehide', resetPageTransitionState);
addEventListener('pageshow', event => {
  if (event.persisted || (isHistoryRestore() && !document.querySelector('#iris-arrival-cover'))) {
    resetPageTransitionState(); sessionStorage.removeItem('iris-arrival');
  }
});

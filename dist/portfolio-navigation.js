import { runIrisTransition, revealIrisArrival } from './page-transition.js?v=navigation-20261001-1';
import {installMobileParentBack,mobileParentFor,disarmMobileParentBack} from './mobile-history.js';

installMobileParentBack();

let navigating = false, generation=0;
addEventListener("page-transition-reset",()=>{navigating=false;generation++;});

export async function navigateWithIris(target, previewVersion) {
  if (navigating) return;
  const mobileParent=mobileParentFor(target);
  const transition = runIrisTransition(async () => {
    navigating = true;
    sessionStorage.setItem('iris-arrival', '1');
    const url = new URL(target, location.href);
    url.searchParams.set('v', previewVersion || 'release-20261001');
    if(mobileParent){disarmMobileParentBack();location.replace(url.href)}
    else location.assign(url.href);
    await new Promise(() => {});
  });
  navigating = true;
  const token=generation;
  try { await transition; } finally { if(token===generation)navigating = false; }
}

export async function revealArrival() {
  if (!document.querySelector('#iris-arrival-cover')) return false;
  sessionStorage.removeItem('iris-arrival');
  await document.fonts.ready;
  return revealIrisArrival();
}

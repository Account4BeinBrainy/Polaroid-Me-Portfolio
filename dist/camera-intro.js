export const INTRO_TITLE = 'About\u00a0\u00a0Me';
export function createCameraIntro(onContinue) {
  document.querySelector('#camera-intro')?.remove();
  const dialog=document.createElement('dialog');
  dialog.id='camera-intro';dialog.className='pd-modal camera-intro';dialog.setAttribute('aria-labelledby','intro-title');dialog.setAttribute('closedby','none');
  dialog.innerHTML=`<div class="camera-intro__content"><img src="/assets/camera/IMG_0007.JPG" alt="Alison with her camera"><h2 id="intro-title"></h2>
<p>Hi, I’m Alison, a marketing and arts management professional with an international background across Canada, Europe, and China. I’m curious, adventurous, and always drawn to new ideas, new places, and new ways of creating meaningful connections between people, brands, and culture.</p>
<p>I’m also an avid instant camera enthusiast. I love the way an instant photograph captures a moment exactly as it is — imperfect, personal, and impossible to recreate. That idea became part of the inspiration behind this website: a digital collection of the projects, experiences, memories, and ideas I’ve gathered along the way.</p>
<p>This website is a digital space where I’ve brought together the projects, experiences, and ideas that have shaped my journey so far.</p>
<button class="camera-intro__cta" type="button"><span>Step inside and explore my world</span><svg viewBox="0 0 120 76" aria-hidden="true"><g transform="translate(120 0) scale(-1 1)"><use href="/assets/ui/back-arrow.svg?v=integrated-20260927-3#back-arrow"/></g></svg></button></div>`;
  dialog.querySelector('h2').textContent=INTRO_TITLE;
  const backdrop=document.createElement('div');backdrop.className='camera-intro-backdrop';backdrop.hidden=true;
  document.body.append(backdrop,dialog);
  const button=dialog.querySelector('button');let opened=false,locked=false;
  dialog.addEventListener('cancel',e=>e.preventDefault());
  dialog.addEventListener('close',()=>backdrop.remove());
  button.addEventListener('click',async()=>{
    if(locked)return;locked=true;button.disabled=true;dialog.classList.add('is-closing');
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)await Promise.all(dialog.getAnimations().map(animation=>animation.finished.catch(()=>{})));
    dialog.close();await onContinue();
  });
  return {open(){if(opened)return;opened=true;backdrop.hidden=false;dialog.show();dialog.querySelector('.camera-intro__content').scrollTop=0;dialog.focus();},dispose(){dialog.remove();backdrop.remove();}};
}

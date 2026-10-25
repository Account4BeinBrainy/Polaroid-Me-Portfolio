// Projects' existing image-only dialog and animation; no glass panel.
export function createImagePreview(mount=document.body){
 const preview=document.createElement('dialog');preview.className='pd-image-preview';preview.setAttribute('closedby','none');preview.setAttribute('aria-label','Full image preview');preview.innerHTML='<img alt="">';mount.append(preview);
 const image=preview.querySelector('img'),reduced=matchMedia('(prefers-reduced-motion: reduce)');let timer=null,trigger=null,closing=false;
 function close(){
  if(!preview.open||closing)return;closing=true;preview.classList.remove('is-open');preview.classList.add('is-closing');
  timer=setTimeout(()=>{preview.close();image.removeAttribute('src');closing=false;trigger?.focus({preventScroll:true});},reduced.matches?0:210);
 }
 preview.addEventListener('click',event=>{event.stopPropagation();close();});
 preview.addEventListener('cancel',event=>{event.preventDefault();event.stopPropagation();close();});
 preview.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}});
 return {open(photo,source=document.activeElement){
  if(!photo?.src||preview.open)return;clearTimeout(timer);closing=false;preview.classList.remove('is-closing');trigger=source;image.src=photo.full||photo.src;image.alt=photo.alt||'';preview.showModal();
  requestAnimationFrame(()=>{if(preview.open&&!closing)preview.classList.add('is-open');});
 },dispose(){clearTimeout(timer);if(preview.open)preview.close();preview.remove();}};
}

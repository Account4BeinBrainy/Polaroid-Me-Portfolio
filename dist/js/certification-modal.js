import { createImagePreview } from './image-preview.js?v=integrated-20260927-3';
import { openGlassDialog } from './mobile-glass-dialog.js';
// Certification-only variant of the Projects glass dialog. No slideshow/gallery.
export function createCertificationModal(onStateChange){
 const dialog=document.createElement('dialog');dialog.className='certification-details';dialog.setAttribute('closedby','none');dialog.setAttribute('aria-labelledby','certification-detail-title');
 dialog.innerHTML=`<button class="certification-details-back" type="button" autofocus aria-label="Back to certifications"><svg viewBox="0 0 120 76" aria-hidden="true" focusable="false"><use href="/assets/ui/back-arrow.svg?v=integrated-20260927-3#back-arrow"/></svg><span>Back</span></button><div class="certification-details-content"><figure class="certification-polaroid"><div class="certification-polaroid-image"><img hidden alt=""></div></figure><section class="certification-details-copy"><h2 id="certification-detail-title"></h2><p></p></section></div>`;
 document.body.append(dialog);const preview=createImagePreview();let trigger,currentItem,cleanupGlass=()=>{};
 dialog.addEventListener('cancel',e=>e.preventDefault());
 dialog.querySelector('button').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{cleanupGlass();cleanupGlass=()=>{};trigger?.focus({preventScroll:true});onStateChange(false);});
 const image=dialog.querySelector('img'),imageSurface=dialog.querySelector('.certification-polaroid-image');image.addEventListener('error',()=>{image.hidden=true;});
 image.tabIndex=0;image.setAttribute('role','button');image.setAttribute('aria-label','View full image');
 const openImage=event=>{event.preventDefault();event.stopPropagation();if(!image.hidden&&currentItem?.image)preview.open({src:currentItem.image,full:currentItem.fullImage||currentItem.image,alt:currentItem.title},image);};
 image.addEventListener('click',openImage);image.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')openImage(event);});
 addEventListener('pagehide',event=>{if(!event.persisted)preview.dispose();});
 return {get isOpen(){return dialog.open;},open(item){if(dialog.open)return;currentItem=item;dialog.dataset.image=item.id;trigger=document.activeElement;dialog.querySelector('h2').textContent=item.title;const copy=dialog.querySelector('p');copy.textContent=item.description||'';if(item.website){const link=document.createElement('a');link.href=item.website;link.textContent=item.website;link.target='_blank';link.rel='noopener noreferrer';copy.append(document.createTextNode(copy.textContent?'\n\n':''),link);}image.hidden=!item.image;image.alt=item.title;image.style.objectFit=item.mediaFit||'contain';image.style.objectPosition=item.mediaPosition||'center';imageSurface.style.background=item.mediaBackground||'#fdfdfc';if(item.image)image.src=item.image;else image.removeAttribute('src');onStateChange(true);cleanupGlass=openGlassDialog(dialog);}};
}

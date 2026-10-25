let sequence = 0;
import { openGlassDialog } from './mobile-glass-dialog.js';

export function createProjectModal({ mount = document.body, projects = [], onStateChange = () => {} } = {}) {
  const id = `project-details-${++sequence}`;
  const dialog = document.createElement('dialog');
  dialog.className = 'pd-modal'; dialog.setAttribute('aria-labelledby', `${id}-title`); dialog.setAttribute('closedby', 'none');
  dialog.innerHTML = `
    <button class="pd-project-nav pd-project-nav--prev" type="button" data-project-prev aria-label="Previous project"><span aria-hidden="true">‹</span></button>
    <button class="pd-project-nav pd-project-nav--next" type="button" data-project-next aria-label="Next project"><span aria-hidden="true">›</span></button>
      <button class="pd-back" type="button" data-close aria-label="Back to project photo stacks" autofocus>
        <svg viewBox="0 0 120 76" aria-hidden="true" focusable="false"><use href="/assets/ui/back-arrow.svg?v=integrated-20260927-3#back-arrow"/></svg><span>Back</span>
      </button>
    <div class="pd-modal__content">
      <div class="pd-project-body">
        <div class="pd-project-top">
          <section class="pd-slideshow" aria-label="Project slideshow">
            <div class="pd-slide-stage"><img alt="" hidden><span class="pd-placeholder">项目幻灯片</span></div>
            <div class="pd-slide-controls"><button type="button" data-prev aria-label="Previous slide">←</button><span data-count aria-live="polite"></span><button type="button" data-next aria-label="Next slide">→</button></div>
          </section>
          <section class="pd-project-copy"><h2 id="${id}-title"></h2><p></p></section>
        </div>
        <section class="pd-pdf-region" aria-label="Project document" hidden><iframe title="Project PDF" loading="lazy"></iframe></section>
        <section class="pd-photo-grid" aria-label="Project instant photos"></section>
      </div>
    </div>`;
  mount.appendChild(dialog);
  const preview=document.createElement('dialog');preview.className='pd-image-preview';preview.setAttribute('closedby','none');preview.innerHTML='<img alt="">';mount.appendChild(preview);
  const content=dialog.querySelector('.pd-modal__content'), body=dialog.querySelector('.pd-project-body');
  const photoGrid=dialog.querySelector('.pd-photo-grid'), slideshow=dialog.querySelector('.pd-slideshow'), copy=dialog.querySelector('.pd-project-copy');
  const slideImg=dialog.querySelector('.pd-slide-stage img'), placeholder=dialog.querySelector('.pd-placeholder');
  const controls=dialog.querySelector('.pd-slide-controls'), count=dialog.querySelector('[data-count]');
  const pdfRegion=dialog.querySelector('.pd-pdf-region'), pdfFrame=pdfRegion.querySelector('iframe');
  const previewImg=preview.querySelector('img');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let slides=[], active=0, currentProjectIndex=0, focusTarget=null, previousOverflow='', closing=false, timer=null, disposed=false, switchTimer=null, cleanupGlass=()=>{};
  function renderSlide(){
    const s=slides[active]; slideImg.hidden=!s?.src; placeholder.hidden=!!s?.src;
    if(s?.src){slideImg.alt=s.alt||'';slideImg.src=s.src;}else{slideImg.removeAttribute('src');}
    controls.hidden=slides.length<2;count.textContent=slides.length?`${active+1} / ${slides.length}`:'';
  }
  slideImg.addEventListener('error',()=>{slideImg.hidden=true;placeholder.hidden=false;placeholder.textContent='图片未能加载';});
  function next(offset){if(!slides.length)return;active=(active+offset+slides.length)%slides.length;renderSlide();}
  function closePreview(){if(!preview.open)return;preview.classList.remove('is-open');setTimeout(()=>{if(!preview.classList.contains('is-open')){preview.close();previewImg.removeAttribute('src');}},reduced.matches?0:210);}
  function openPreview(photo){if(!photo?.src)return;previewImg.src=photo.full||photo.src;previewImg.alt=photo.alt||'';preview.showModal();requestAnimationFrame(()=>preview.classList.add('is-open'));}
  function renderProject(project){
    slides=(project.slides||[]).filter(s=>s&&s.src);active=0;
    dialog.querySelector('h2').textContent=project.title||'Project';dialog.querySelector('.pd-project-copy p').textContent=project.description||'';
    if(project.website){const link=document.createElement('a');link.href=project.website;link.textContent=project.website;link.target='_blank';link.rel='noopener noreferrer';copy.querySelector('p').append(document.createTextNode('\n\n'),link);}
    pdfRegion.hidden=!project.pdf;
    if(project.pdf){pdfFrame.title=project.pdf.title;pdfFrame.src='/project-pdf-viewer.html?file='+encodeURIComponent(project.pdf.src)+'#page=1';}else pdfFrame.removeAttribute('src');
    placeholder.textContent='项目幻灯片';renderSlide();photoGrid.replaceChildren();photoGrid.hidden=!(project.photos||[]).some(photo=>photo.src);
    for(const p of (project.photos||[])){
      if(!p.src)continue;
      const figure=document.createElement('figure');figure.className='pd-single-photo photo-template pd-photo-preview-trigger';figure.tabIndex=0;figure.setAttribute('role','button');figure.setAttribute('aria-label','View full image');
      const surface=document.createElement('div');surface.className='pd-single-photo__image photo-template__image';
      const img=document.createElement('img');img.src=p.src;img.alt=p.alt||'';img.loading='lazy';if(p.fit)img.style.objectFit=p.fit;if(p.position)img.style.objectPosition=p.position;surface.appendChild(img);
      figure.appendChild(surface);figure.addEventListener('click',event=>{event.stopPropagation();openPreview(p);});figure.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();openPreview(p);}});
      const cap=document.createElement('figcaption');cap.textContent=p.caption||'';figure.appendChild(cap);photoGrid.appendChild(figure);
    }
    content.scrollTop=0;copy.style.height=`${slideshow.offsetHeight}px`;
  }
  function switchProject(offset){
    if(projects.length<2)return;closePreview();clearTimeout(switchTimer);body.classList.add('is-switching');
    const apply=()=>{currentProjectIndex=(currentProjectIndex+offset+projects.length)%projects.length;renderProject(projects[currentProjectIndex]);requestAnimationFrame(()=>body.classList.remove('is-switching'));};
    if(reduced.matches)apply();else switchTimer=setTimeout(apply,100);
  }
  function close(){if(!dialog.open||closing)return;closePreview();closing=true;dialog.classList.add('is-closing');timer=setTimeout(()=>dialog.close(),reduced.matches?0:170);}
  function finishClose(){clearTimeout(timer);cleanupGlass();cleanupGlass=()=>{};closing=false;dialog.classList.remove('is-closing');document.body.style.overflow=previousOverflow;onStateChange(false);if(focusTarget?.isConnected)focusTarget.focus({preventScroll:true});}
  dialog.querySelector('[data-close]').addEventListener('click',close);
  dialog.querySelector('[data-prev]').addEventListener('click',()=>next(-1));dialog.querySelector('[data-next]').addEventListener('click',()=>next(1));
  dialog.querySelector('[data-project-prev]').addEventListener('click',event=>{event.stopPropagation();switchProject(-1);});
  dialog.querySelector('[data-project-next]').addEventListener('click',event=>{event.stopPropagation();switchProject(1);});
  preview.addEventListener('click',event=>{event.stopPropagation();closePreview();});
  dialog.addEventListener('cancel',e=>e.preventDefault());dialog.addEventListener('close',finishClose);
  preview.addEventListener('cancel',e=>e.preventDefault());
  dialog.addEventListener('keydown',e=>{if(e.target.closest('.pd-pdf-region')||preview.open||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(e.key==='ArrowLeft')next(-1);if(e.key==='ArrowRight')next(1);});
  return {
    element:dialog,get isOpen(){return dialog.open;},get currentProjectIndex(){return currentProjectIndex;},
    open(project,trigger=document.activeElement){
      if(disposed||dialog.open)return;currentProjectIndex=Math.max(0,projects.indexOf(project));focusTarget=trigger;renderProject(projects[currentProjectIndex]||project);
      previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';cleanupGlass=openGlassDialog(dialog);content.scrollTop=0;copy.style.height=`${slideshow.offsetHeight}px`;onStateChange(true);
    },close,
    dispose(){if(disposed)return;disposed=true;clearTimeout(timer);clearTimeout(switchTimer);if(preview.open)preview.close();if(dialog.open)dialog.close();cleanupGlass();preview.remove();dialog.remove();}
  };
}

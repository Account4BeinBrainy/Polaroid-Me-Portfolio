import {responsiveProfile} from './responsive-profile.js';
import {resetPageTransitionState} from './navigation-lifecycle.js';

export const MOBILE_PARENT_ROUTES=Object.freeze({
  accessories:'/',
  professionalProjects:'/?page=boxes',
  certificationAchievement:'/?page=boxes',
  lifeJourney:'/?page=boxes',
});

const BASE='__mobileParentBase',GUARD='__mobileParentGuard';
let installed=false,leaving=false;
const mobile=()=>responsiveProfile().isMobile;
const state=()=>history.state && typeof history.state==='object'?history.state:{};

function pageFromLocation(){
  const path=location.pathname.replace(/\/index\.html$/,'/');
  if(path==='/professional-projects.html')return 'professionalProjects';
  if(path==='/certification-achievement.html')return 'certificationAchievement';
  if(path==='/life-journey.html')return 'lifeJourney';
  if(path==='/'&&new URLSearchParams(location.search).get('page')==='boxes')return 'accessories';
  return null;
}

function arm(pageId,{fromCamera=false}={}){
  if(!mobile()||!MOBILE_PARENT_ROUTES[pageId]||leaving)return;
  const current=state();
  if(current[GUARD]&&current.logicalPage===pageId)return;
  const url=pageId==='accessories'&&fromCamera?'/?page=boxes':location.href;
  if(fromCamera){
    // Preserve the Camera entry when its in-document print transition opens boxes.
    history.pushState({...current,[BASE]:true,[GUARD]:false,logicalPage:pageId},'',url);
  }else{
    history.replaceState({...current,[BASE]:true,[GUARD]:false,logicalPage:pageId},'',url);
  }
  history.pushState({...history.state,[BASE]:false,[GUARD]:true,logicalPage:pageId},'',url);
}

export function installMobileParentBack(){
  if(installed)return;
  installed=true;
  const pageId=pageFromLocation();
  if(pageId)arm(pageId);
  addEventListener('popstate',event=>{
    const page=pageFromLocation();
    if(!mobile()||leaving||!page||!event.state?.[BASE]||event.state.logicalPage!==page)return;
    leaving=true;
    resetPageTransitionState();
    sessionStorage.removeItem('iris-arrival');
    location.replace(MOBILE_PARENT_ROUTES[page]);
  });
  addEventListener('pageshow',event=>{
    if(event.persisted){leaving=false;resetPageTransitionState();}
    if(!leaving){
      const routedPage=pageFromLocation();
      const page=routedPage||(document.querySelector('#film-box-page')?.hidden===false?'accessories':null);
      if(page)arm(page,{fromCamera:page==='accessories'&&!routedPage});
    }
  });
  addEventListener('resize',()=>{
    const page=pageFromLocation();
    if(page)arm(page);
  });
}

export function enterMobileAccessories(){
  if(!mobile()||leaving)return;
  arm('accessories',{fromCamera:pageFromLocation()!=='accessories'});
}

export function mobileParentFor(target){
  if(!mobile())return null;
  const page=pageFromLocation()||(document.querySelector('#film-box-page')?.hidden===false?'accessories':null);
  const parent=MOBILE_PARENT_ROUTES[page];
  return parent&&new URL(target,location.href).pathname===new URL(parent,location.href).pathname
    &&new URL(target,location.href).searchParams.get('page')===new URL(parent,location.href).searchParams.get('page')?parent:null;
}

export function disarmMobileParentBack(){
  if(!mobile())return;
  leaving=true;
  const current=state();
  if(current[GUARD])history.replaceState({...current,[GUARD]:false},'',location.href);
}

installMobileParentBack();

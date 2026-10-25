console.log('LIFE_WALL_RUNTIME_AUDIT_7');
import React from 'react';
import {createRoot} from 'react-dom/client';
import DriftWall from './DriftWall.jsx';
import {locations} from '../../dist/js/life-journey-data.js';
const items=Object.entries(locations).flatMap(([locationId,place])=>[
  {id:`${locationId}-black-card`,type:'blackCard',locationId,locationLabel:place.label,image:`/assets/life-journey/black-cards/preview/${locationId}.webp`},
  ...place.photos.map((photo,i)=>({...photo,id:photo.id||`${locationId}-photo-${i}`,type:'photo',locationId,locationLabel:place.label}))
]);
export function mountLifeWall(host){const root=createRoot(host);root.render(<DriftWall columns={4} items={items} pauseOnHover={true}/>);return()=>root.unmount()}

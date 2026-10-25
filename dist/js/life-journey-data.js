const variants=photo=>{
 const relative=photo.image.replace('/assets/life-journey/photos/','').replace(/\.[^.]+$/,'.webp');
 return {...photo,wallImage:`/assets/life-journey/wall/${relative}`,albumImage:`/assets/life-journey/album/${relative}`,fullImage:photo.image};
};
const fillPhotos=items=>items.map(item=>variants({image:item[0],caption:item[1],alt:item[1],objectPosition:item[2]}));
const galleries={
  edmonton:[["/assets/life-journey/photos/edmonton/01-aurora-in-the-city.webp","Aurora in the city","50% 50%"],["/assets/life-journey/photos/edmonton/02-campus-autumn.webp","Campus, Autumn","50% 65%"],["/assets/life-journey/photos/edmonton/03-fka-agency.webp","FKA Agency","50% 65%"],["/assets/life-journey/photos/edmonton/04-lake-louise.webp","Lake Louise","50% 50%"],["/assets/life-journey/photos/edmonton/05-snowman-in-the-campus.webp","Snowman in the campus","50% 50%"],["/assets/life-journey/photos/edmonton/06-uniqlo-part-time-wem.webp","Uniqlo Part-Time, WEM","50% 65%"],["/assets/life-journey/photos/edmonton/07-uofa-campus-2014.webp","UofA Campus, 2014","50% 50%"]],
  england:[["/assets/life-journey/photos/england/01-angle-lights-london.webp","Angle Lights, London","50% 50%"],["/assets/life-journey/photos/england/02-birmingham-museum-and-art-gallery.webp","Birmingham Museum and Art Gallery","50% 65%"],["/assets/life-journey/photos/england/03-borough-market.webp","Borough Market","50% 50%"],["/assets/life-journey/photos/england/04-london-metro.webp","London Metro","50% 65%"],["/assets/life-journey/photos/england/05-saint-martin-church-birmingham.webp","Saint Martin Church, Birmingham","50% 65%"],["/assets/life-journey/photos/england/06-soho-london.webp","Soho, London","50% 65%"],["/assets/life-journey/photos/england/07-street-in-birmingham.webp","Street in Birmingham","50% 65%"],["/assets/life-journey/photos/england/08-tower-bridge.webp","Tower Bridge","50% 50%"]],
  dallas:[["/assets/life-journey/photos/dallas/01-2024-dallas-symphony-ochestra.webp","2024 Dallas Symphony Ochestra","50% 50%"],["/assets/life-journey/photos/dallas/02-2024-dso-gala.webp","2024 DSO Gala","50% 50%"],["/assets/life-journey/photos/dallas/03-aurora-dallas-studio.webp","Aurora Dallas Studio","50% 50%"],["/assets/life-journey/photos/dallas/04-bishop-arts-district.webp","Bishop Arts District","50% 65%"],["/assets/life-journey/photos/dallas/05-dallas-museum-of-art.webp","Dallas Museum of Art","50% 65%"],["/assets/life-journey/photos/dallas/06-deep-ellum.webp","Deep Ellum","50% 50%"],["/assets/life-journey/photos/dallas/07-downtown-arts-district.webp","Downtown Arts District","50% 50%"],["/assets/life-journey/photos/dallas/08-smu-campus.webp","SMU Campus","50% 65%"],["/assets/life-journey/photos/dallas/09-smu-meadow-school.webp","SMU Meadow School","50% 50%"],["/assets/life-journey/photos/dallas/10-state-fair-of-texas.webp","State Fair of Texas","50% 65%"]],
  japan:[["/assets/life-journey/photos/japan/01-fireworks-in-shizuoka.webp","Fireworks in Shizuoka","50% 50%"],["/assets/life-journey/photos/japan/02-hakone.webp","Hakone","50% 50%"],["/assets/life-journey/photos/japan/03-mountain-omuro.webp","Mountain Omuro","50% 50%"],["/assets/life-journey/photos/japan/04-team-lab-tokyo.webp","Team Lab Tokyo","50% 65%"],["/assets/life-journey/photos/japan/05-tokyo-tower.webp","Tokyo Tower","50% 65%"],["/assets/life-journey/photos/japan/06-walking-in-shinjuku.webp","Walking in Shinjuku","50% 65%"]],
  colombia:[["/assets/life-journey/photos/colombia/01-el-mirador.webp","El Mirador","50% 50%"],["/assets/life-journey/photos/colombia/02-img-7357.webp","Downtown Bogota","50% 65%"],["/assets/life-journey/photos/colombia/03-local-houses.webp","Local Houses","50% 65%"],["/assets/life-journey/photos/colombia/04-panorama-of-el-mirador.webp","Panorama of El Mirador","50% 65%"],["/assets/life-journey/photos/colombia/05-plaza-del-chorro.webp","Plaza Del Chorro","50% 65%"],["/assets/life-journey/photos/colombia/06-universidad-de-los-andes.webp","Universidad de Los Andes","50% 65%"],["/assets/life-journey/photos/colombia/07-villa-de-leyva.webp","Villa de Leyva","50% 65%"]],
  china:[["/assets/life-journey/photos/china/01-going-to-arts-exhibitions.webp","Going to arts exhibitions","50% 50%"],["/assets/life-journey/photos/china/02-going-to-seaside.webp","Going to seaside","50% 65%"],["/assets/life-journey/photos/china/03-hiking.webp","Hiking","50% 65%"],["/assets/life-journey/photos/china/04-petting-dogs.webp","Petting dogs","50% 65%"],["/assets/life-journey/photos/china/05-visiting-temples.webp","Visiting temples","50% 65%"],["/assets/life-journey/photos/china/06-working-full-time.webp","Working full-time","50% 65%"]],
  montreal:[["/assets/life-journey/photos/montreal/01-basilique-notre-dame-de-montreal.webp","Basilique Notre-Dame de Montréal","50% 65%"],["/assets/life-journey/photos/montreal/02-celebrating-chinese-new-year.webp","Celebrating Chinese New Year","50% 65%"],["/assets/life-journey/photos/montreal/03-cirque-du-soleil-back-stage.webp","Cirque du Soleil Back Stage","50% 65%"],["/assets/life-journey/photos/montreal/04-cirque-du-soleil.webp","Cirque du Soleil","50% 65%"],["/assets/life-journey/photos/montreal/05-downtown.webp","Downtown","50% 65%"],["/assets/life-journey/photos/montreal/06-enjoy-life-with-friend.webp","Enjoy life with friend","50% 50%"],["/assets/life-journey/photos/montreal/07-hec-montreal.webp","HEC Montréal","50% 65%"],["/assets/life-journey/photos/montreal/08-ice-skating.webp","Ice Skating","50% 65%"],["/assets/life-journey/photos/montreal/09-market-jean-talon.webp","Market Jean-Talon","50% 50%"],["/assets/life-journey/photos/montreal/10-metro-station.webp","Metro Station","50% 65%"],["/assets/life-journey/photos/montreal/11-place-des-arts.webp","Place des Arts","50% 65%"]],
  italy:[["/assets/life-journey/photos/italy/01-84f82ce0f96c5e84712500405f933f04.webp","Summer in Rome","50% 65%"],["/assets/life-journey/photos/italy/02-capri-island.webp","Capri Island","50% 65%"],["/assets/life-journey/photos/italy/03-castello-di-potentino.webp","Castello di Potentino","50% 50%"],["/assets/life-journey/photos/italy/04-castle-night-with-friends.webp","Castle night with friends","50% 65%"],["/assets/life-journey/photos/italy/05-duomo-di-milano.webp","Duomo di Milano","50% 50%"],["/assets/life-journey/photos/italy/06-duomo-di-napoli.webp","Duomo di Napoli","50% 65%"],["/assets/life-journey/photos/italy/07-img-8429.webp","Duomo di Napoli","50% 50%"],["/assets/life-journey/photos/italy/08-navigli.webp","Navigli","50% 65%"],["/assets/life-journey/photos/italy/09-night-view-napoli.webp","Night view Napoli","50% 65%"],["/assets/life-journey/photos/italy/10-palazzo-farnese-rome.webp","Palazzo Farnese, Rome","50% 65%"],["/assets/life-journey/photos/italy/11-sda-bocconi.webp","SDA Bocconi","50% 65%"],["/assets/life-journey/photos/italy/12-the-mural-of-last-supper.webp","The Mural of Last Supper","50% 50%"]],
};
export const locations={
  edmonton:{label:'Alberta',side:'top',x:11.86,y:14.5,photos:fillPhotos(galleries.edmonton)},montreal:{label:'Montréal',side:'top',x:20.92,y:19.91,photos:fillPhotos(galleries.montreal)},
  dallas:{label:'Dallas, TX',side:'left',x:16.45,y:31.03,photos:fillPhotos(galleries.dallas)},colombia:{label:'Colombia',side:'left',x:23.23,y:61.89,photos:fillPhotos(galleries.colombia)},
  england:{label:'England',side:'top',x:44.29,y:18.46,photos:fillPhotos(galleries.england)},italy:{label:'Italy',side:'right',x:49.25,y:26.9,photos:fillPhotos(galleries.italy)},
  china:{label:'China',side:'top',x:78.62,y:25.08,photos:fillPhotos(galleries.china)},japan:{label:'Japan',side:'right',x:86.41,y:55.29,photos:fillPhotos(galleries.japan)},
};

// Uploaded originals stay intact; both views share the same aperture crop and frame.
export const addedPhotos=[
  {
    "id": "new-colombia-colombia1",
    "albumKey": "colombia",
    "image": "/assets/life-journey/photos/colombia/colombia1.jpg",
    "caption": "Museo National Bogota",
    "alt": "Museo National Bogota",
    "frameColor": "#7a902b",
    "contentBounds": [
      93,
      96,
      1449,
      1479
    ],
    "imageSize": [
      1524,
      1853
    ]
  },
  {
    "id": "new-dallas-dallas",
    "albumKey": "dallas",
    "image": "/assets/life-journey/photos/dallas/dallas.jpg",
    "caption": "Southern Methodist University",
    "alt": "Southern Methodist University",
    "frameColor": null,
    "contentBounds": [
      74,
      82,
      1277,
      1314
    ],
    "imageSize": [
      1353,
      1645
    ]
  },
  {
    "id": "new-japan-japan",
    "albumKey": "japan",
    "image": "/assets/life-journey/photos/japan/Japan.jpg",
    "caption": "",
    "alt": "",
    "frameColor": "#071219",
    "contentBounds": [
      86,
      95,
      1223,
      1251
    ],
    "imageSize": [
      1301,
      1582
    ]
  },
  {
    "id": "new-italy-italy3",
    "albumKey": "italy",
    "image": "/assets/life-journey/photos/italy/italy3.JPG",
    "caption": "",
    "alt": "",
    "frameColor": null,
    "contentBounds": [
      90,
      103,
      1211,
      1244
    ],
    "imageSize": [
      1299,
      1579
    ]
  },
  {
    "id": "new-england-england",
    "albumKey": "england",
    "image": "/assets/life-journey/photos/england/England.png",
    "caption": "Christmas in Birmingham",
    "alt": "Christmas in Birmingham",
    "frameColor": "#d1b567",
    "contentBounds": [
      105,
      118,
      1327,
      1366
    ],
    "imageSize": [
      1424,
      1731
    ]
  },
  {
    "id": "new-italy-img_8965",
    "albumKey": "italy",
    "image": "/assets/life-journey/photos/italy/IMG_8965.JPG",
    "caption": "",
    "alt": "",
    "frameColor": "#b08404",
    "contentBounds": [
      94,
      95,
      1261,
      1284
    ],
    "imageSize": [
      1343,
      1633
    ]
  },
  {
    "id": "new-italy-img_8966",
    "albumKey": "italy",
    "image": "/assets/life-journey/photos/italy/IMG_8966.JPG",
    "caption": "",
    "alt": "",
    "frameColor": "#aa4703",
    "contentBounds": [
      90,
      93,
      1222,
      1246
    ],
    "imageSize": [
      1299,
      1579
    ]
  },
  {
    "id": "new-japan-japan1",
    "albumKey": "japan",
    "image": "/assets/life-journey/photos/japan/Japan1.png",
    "caption": "",
    "alt": "",
    "frameColor": "#0d0f0e",
    "contentBounds": [
      91,
      82,
      1350,
      1362
    ],
    "imageSize": [
      1424,
      1709
    ]
  },
  {
    "id": "new-montreal-montreal",
    "albumKey": "montreal",
    "image": "/assets/life-journey/photos/montreal/Montreal.png",
    "caption": "",
    "alt": "",
    "frameColor": "#ff6d8d",
    "contentBounds": [
      108,
      99,
      1358,
      1403
    ],
    "imageSize": [
      1454,
      1767
    ]
  }
];
for(const photo of addedPhotos) locations[photo.albumKey].photos.push(variants(photo));
// New photos are registered once; Album and Photo Wall both read locations.
export const photoWallAdditions = [
  {
    "id": "batch-20260930-edmonton-1",
    "albumKey": "edmonton",
    "image": "/assets/life-journey/photos/alberta/Banff.jpg",
    "caption": "Banff",
    "alt": "Banff",
    "objectPosition": "50% 50%"
  },
  {
    "id": "batch-20260930-edmonton-2",
    "albumKey": "edmonton",
    "image": "/assets/life-journey/photos/alberta/Moose.jpg",
    "caption": "Moose",
    "alt": "Moose",
    "objectPosition": "50% 50%"
  },
  {
    "id": "batch-20260930-england-3",
    "albumKey": "england",
    "image": "/assets/life-journey/photos/england/Church in Birmingham.jpg",
    "caption": "Church in Birmingham",
    "alt": "Church in Birmingham",
    "objectPosition": "50% 50%"
  },
  {
    "id": "batch-20260930-england-4",
    "albumKey": "england",
    "image": "/assets/life-journey/photos/england/London street.jpg",
    "caption": "London street",
    "alt": "London street",
    "objectPosition": "50% 50%"
  },
  {
    "id": "batch-20260930-montreal-5",
    "albumKey": "montreal",
    "image": "/assets/life-journey/photos/montreal/An afternoon in Montréal.jpg",
    "caption": "An afternoon in Montréal",
    "alt": "An afternoon in Montréal",
    "objectPosition": "50% 50%"
  },
  {
    "id": "batch-20260930-montreal-6",
    "albumKey": "montreal",
    "image": "/assets/life-journey/photos/montreal/Enjoying snow.jpg",
    "caption": "Enjoying snow",
    "alt": "Enjoying snow",
    "objectPosition": "50% 50%"
  },
  {
    "id": "batch-20260930-montreal-7",
    "albumKey": "montreal",
    "image": "/assets/life-journey/photos/montreal/Montreal Downtown.jpg",
    "caption": "Montreal Downtown",
    "alt": "Montreal Downtown",
    "objectPosition": "50% 50%"
  },
  {
    "id": "batch-20260930-montreal-8",
    "albumKey": "montreal",
    "image": "/assets/life-journey/photos/montreal/Montréal with cohort.jpg",
    "caption": "Montréal with cohort",
    "alt": "Montréal with cohort",
    "objectPosition": "50% 50%"
  },
  {
    "id": "batch-20260930-montreal-9",
    "albumKey": "montreal",
    "image": "/assets/life-journey/photos/montreal/Snow in Montréal.jpg",
    "caption": "Snow in Montréal",
    "alt": "Snow in Montréal",
    "objectPosition": "50% 50%"
  },
  {
    "id": "batch-20260930-montreal-10",
    "albumKey": "montreal",
    "image": "/assets/life-journey/photos/montreal/St. Joseph Church.jpg",
    "caption": "St. Joseph Church",
    "alt": "St. Joseph Church",
    "objectPosition": "50% 50%"
  },
  {
    "id": "batch-20260930-montreal-11",
    "albumKey": "montreal",
    "image": "/assets/life-journey/photos/montreal/With friend in Montréal.jpg",
    "caption": "With friend in Montréal",
    "alt": "With friend in Montréal",
    "objectPosition": "50% 50%",
    "frameType": "colored",
    "frameColor": "#b6beb4",
    "contentBounds": [93, 86, 1462, 1498],
    "imageSize": [1537, 1867]
  },
  {
    "id": "batch-20260930-japan-12",
    "albumKey": "japan",
    "image": "/assets/life-journey/photos/japan/Disneyland.jpg",
    "caption": "Disneyland",
    "alt": "Disneyland",
    "objectPosition": "50% 50%"
  },
  {
    "id": "batch-20260930-colombia-13",
    "albumKey": "colombia",
    "image": "/assets/life-journey/photos/colombia/Bogota cute dog.jpg",
    "caption": "Bogota cute dog",
    "alt": "Bogota cute dog",
    "contentRotation": 90,
    "objectPosition": "50% 50%"
  },
  {
    "id": "batch-20260930-colombia-14",
    "albumKey": "colombia",
    "image": "/assets/life-journey/photos/colombia/Bogota market.jpg",
    "caption": "Bogota market",
    "alt": "Bogota market",
    "objectPosition": "50% 50%"
  },
  {
    "id": "batch-20260930-colombia-15",
    "albumKey": "colombia",
    "image": "/assets/life-journey/photos/colombia/El Mirador.jpg",
    "caption": "El Mirador",
    "alt": "El Mirador",
    "objectPosition": "50% 50%"
  },
  {
    "id": "batch-20260930-china-16",
    "albumKey": "china",
    "image": "/assets/life-journey/photos/china/Dailuo Summit.jpg",
    "caption": "Dailuo Summit",
    "alt": "Dailuo Summit",
    "objectPosition": "50% 50%"
  },
  {
    "id": "batch-20260930-italy-17",
    "albumKey": "italy",
    "image": "/assets/life-journey/photos/italy/Capri Island.jpg",
    "caption": "Capri Island",
    "alt": "Capri Island",
    "objectPosition": "50% 50%"
  },
  {
    "id": "batch-20260930-italy-18",
    "albumKey": "italy",
    "image": "/assets/life-journey/photos/italy/Capri chilling.jpg",
    "caption": "Capri chilling",
    "alt": "Capri chilling",
    "objectPosition": "50% 50%"
  },
  {
    "id": "batch-20260930-italy-19",
    "albumKey": "italy",
    "image": "/assets/life-journey/photos/italy/Milano nightfall.jpg",
    "caption": "Milano nightfall",
    "alt": "Milano nightfall",
    "objectPosition": "50% 50%",
    "frameType": "white",
    "contentBounds": [72, 86, 1207, 1246],
    "imageSize": [1274, 1549]
  }
];
for(const photo of photoWallAdditions) locations[photo.albumKey].photos.push(variants(photo));
export function photoContentStyle(photo){
 if(!photo.contentBounds)return photo.contentRotation?{transform:`rotate(${photo.contentRotation}deg)`}:{};
 const [x,y,right,bottom]=photo.contentBounds,[w,h]=photo.imageSize,side=Math.min(right-x,bottom-y);
 return {position:"absolute",maxWidth:"none",width:`${w/side*100}%`,height:`${h/side*100}%`,left:`${50-(x+right)/2/side*100}%`,top:`${50-(y+bottom)/2/side*100}%`};
}

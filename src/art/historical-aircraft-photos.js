/* Six real historical aircraft photographs from Wikimedia Commons, each
   identified on its source page as public domain. Fallback stays as the
   locally painted hangar canvas if a photograph cannot be loaded. */
(()=>{
 'use strict';
 const photos={
  fighter:{file:'Supermarine Spitfire Mk IX flying past.jpg',credit:'Pseudopanax · Public domain'},
  heavy:{file:'Bristol Beaufighter.jpg',credit:'UK Government photograph · Public domain'},
  bomber:{file:'Avro Lancaster flying.jpg',credit:'Jan Arkesteijn · Public domain'},
  bf109:{file:'Bf109 messerschmitt.JPG',credit:'Museum photograph · Public domain'},
  bf110:{file:'German Messerschmitt Bf 110C of ZG 26 in flight, circa 1940 (Lot-2787-14).jpg',credit:'U.S. Navy archival photograph · Public domain'},
  he111:{file:'German Heinkel He 111s in flight during the Battle of Britain, in 1940 (342-FH-3A06233-81282AC).jpg',credit:'U.S. Army Air Forces archive · Public domain'}
 };
 const base='https://commons.wikimedia.org/wiki/Special:FilePath/';
 function apply(canvas,type){
  const item=photos[type];if(!canvas||!item)return;
  const parent=canvas.parentElement;if(!parent)return;
  parent.classList.add('aircraft-photo-frame');
  const key=canvas.id==='wm-featured-plane'?'hero':'tile';
  let image=parent.querySelector('img[data-aircraft-photo="'+key+'"]');
  if(!image){
   image=document.createElement('img');
   image.className='hangar-real-photo '+(key==='hero'?'hangar-real-hero':'hangar-real-tile');
   image.dataset.aircraftPhoto=key;
   image.alt=type.toUpperCase()+' historical aircraft photograph';
   image.loading='eager';image.decoding='async';
   parent.insertBefore(image,canvas.nextSibling);
  }
  if(image.dataset.photoPlane===type)return;
  image.dataset.photoPlane=type;
  image.classList.remove('ready');
  image.title='Historical aircraft photograph · '+item.credit;
  image.onload=()=>{if(image.dataset.photoPlane===type&&image.naturalWidth>0)image.classList.add('ready');};
  image.onerror=()=>image.classList.remove('ready');
  image.src=base+encodeURIComponent(item.file)+'?width='+(key==='hero'?1100:450);
 }
 window.WingmanAircraftPhotos={photos,apply};
})();
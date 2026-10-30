/* Approved Wingman static WWII theatre backgrounds. All fixed; never scroll.
 * Assets should be placed under assets/backgrounds/ in the same repository. */
(()=>{'use strict';
 const base='./assets/backgrounds/';
 const names=['alpine-front','english-channel','north-africa','storm-front'];
 const images=names.map(name=>{
   const picture=new Image();picture.decoding='async';
   picture.src=base+name+'.webp';
   return picture;
 });
 window.WingmanStaticBackgrounds={images,names};
})();
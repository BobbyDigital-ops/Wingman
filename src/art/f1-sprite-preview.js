/* Wingman F — six compact, shaded 2.5D WWII aircraft miniatures.
 * Two approved F1 side profiles + four individually matted, accurate side-profile multi-engine replacements.
 * Images are drawn at the aircraft transform; no physics, bounds or control changes.
 * If an image is still loading the older Canvas silhouette is the safe fallback.
 */
(()=>{'use strict';
const config={
 fighter:{src:'f1-spitfire.webp',width:35.6,height:10.5,prop:true},
 bf109:{src:'f1-bf109.webp',width:35.6,height:10.5,prop:true},
 heavy:{src:'f2-beaufighter.webp',width:41.0,height:null},
 bf110:{src:'f2-bf110.webp',width:41.0,height:null},
 bomber:{src:'f2-lancaster.webp',width:46.0,height:null},
 he111:{src:'f2-he111.webp',width:46.0,height:null}
};
const images={};
for(const [type,spec] of Object.entries(config)){
 const img=new Image();img.decoding='async';
 img.src='./assets/aircraft/'+spec.src+'?v=20261030F4side';
 images[type]=img;
}
function draw(ctx,type,variant){
 const spec=config[type],img=images[type];
 if(!spec||!img?.complete||!img.naturalWidth)return false;
 ctx.save();
 const smoothing=ctx.imageSmoothingEnabled;
 ctx.imageSmoothingEnabled=true;
 // All artwork points left; mirror into the game's rightward forward axis.
 ctx.scale(-1,1);
 // Use each multi-engine aircraft's native aspect ratio instead of stretching
 // an oblique image into a side-view slot. The two approved F1 fighters remain
 // pixel-for-pixel unchanged.
 const h=spec.height??(spec.width*img.naturalHeight/img.naturalWidth);
 ctx.drawImage(img,-spec.width*.5,-h*.5,spec.width,h);
 ctx.imageSmoothingEnabled=smoothing;
 ctx.restore();
 // F1 singles have a separate soft propeller disc at the nose. The multi-
 // engine models already have correctly placed props inside the sprite.
 if(spec.prop){
  ctx.save();ctx.globalAlpha=.36;ctx.lineWidth=.44;
  ctx.strokeStyle='#dce8e3';ctx.beginPath();
  ctx.ellipse(spec.width*.5+.15,0,.65,4.35,0,0,Math.PI*2);ctx.stroke();
  ctx.restore();
 }
 if(variant==='worn'||variant==='damaged'){
  ctx.save();ctx.globalAlpha=variant==='damaged'?.55:.28;
  ctx.strokeStyle='#2b2520';ctx.lineWidth=.4;
  ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(-3.3,2);
  ctx.moveTo(5,-1);ctx.lineTo(8.5,1.35);ctx.stroke();
  ctx.restore();
 }
 return true;
}
window.WingmanAircraftHD={draw,images,types:Object.keys(config)};
})();
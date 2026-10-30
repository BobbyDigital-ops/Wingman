/* F1 prototype — genuinely alpha-matted, pre-rendered 2.5D side profiles.
 * Enabled ONLY with ?f1=1. All non-prototype aircraft use the original art.
 * A single side sprite is used in F1; banking/damage variants are later phases.
 */
(()=>{'use strict';
  const specs={
    fighter:'./assets/aircraft/f1-spitfire.webp',
    bf109:'./assets/aircraft/f1-bf109.webp'
  };
  const images={};
  for(const [type,url] of Object.entries(specs)){
    const image=new Image();
    image.decoding='async';
    image.src=url;
    images[type]=image;
  }
  function draw(ctx,type,variant){
    const image=images[type];
    if(!image?.complete||!image.naturalWidth)return false;
    ctx.save();
    const smoothing=ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled=true;
    // Source models face left, game forward faces right. Mirror once here,
    // without changing game coordinates, flight direction or collision bounds.
    ctx.scale(-1,1);
    ctx.drawImage(image,-18.1,-5.35,36.2,10.7);
    ctx.imageSmoothingEnabled=smoothing;
    ctx.restore();
    // Propeller is drawn in the game, not burned into the photo sprite.
    ctx.save();
    ctx.globalAlpha=.45;
    ctx.lineWidth=.48;
    ctx.strokeStyle='#dce6e8';
    ctx.beginPath();ctx.ellipse(18.15,0,.7,4.5,0,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=.18;
    ctx.fillStyle='#c8dade';
    ctx.beginPath();ctx.ellipse(18.2,0,.9,3.7,0,0,Math.PI*2);ctx.fill();
    if(variant==='worn'||variant==='damaged'){
      ctx.globalAlpha=variant==='damaged'?.78:.38;
      ctx.strokeStyle='#342c29';ctx.lineWidth=.55;
      ctx.beginPath();
      ctx.moveTo(-5.5,-1.8);ctx.lineTo(1,2.2);
      ctx.moveTo(5.5,-2.3);ctx.lineTo(10,1.6);
      ctx.stroke();
    }
    ctx.restore();
    return true;
  }
  window.WingmanF1Preview={draw,images,types:Object.keys(specs)};
})();
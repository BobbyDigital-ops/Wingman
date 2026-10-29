/* Wingman hangar gallery: illustrated promotional scenes for selection only.
   Uses aircraft silhouettes but an independent, atmospheric large-format
   composition; does not alter in-flight sprites, physics or hitboxes. */
(()=>{'use strict';
 const THEMES={
  fighter:{sky:['#4f7186','#819b9d','#dcb78c'],glow:'#f6e7b5',horizon:'#244d62',low:'#203d48',nation:'R.A.F.',weather:'COASTAL DAWN',sun:[.83,.22]},
  heavy:{sky:['#253b50','#587382','#c3b4a2'],glow:'#e4d9b3',horizon:'#3a5966',low:'#1b343f',nation:'R.A.F.',weather:'NIGHT PATROL',sun:[.22,.24]},
  bomber:{sky:['#617887','#a3a7a1','#dec5a2'],glow:'#f2dfb9',horizon:'#546d6a',low:'#2c4850',nation:'R.A.F.',weather:'BOMBER COMMAND',sun:[.76,.29]},
  bf109:{sky:['#425365','#73848b','#b8a69a'],glow:'#e9c99b',horizon:'#4d616b',low:'#24373f',nation:'LUFTWAFFE',weather:'ALPINE INTERCEPT',sun:[.18,.25]},
  bf110:{sky:['#2b4553','#5e7b7b','#b4aa8c'],glow:'#f2d8ab',horizon:'#45585b',low:'#22363e',nation:'LUFTWAFFE',weather:'ESCORT FIGHTER',sun:[.77,.27]},
  he111:{sky:['#354861','#747688','#c9a4a0'],glow:'#f2cbaf',horizon:'#464d65',low:'#202f44',nation:'LUFTWAFFE',weather:'TWILIGHT RAID',sun:[.23,.24]}
 };
 function cloud(ctx,x,y,w,h,alpha=1){
  ctx.save();ctx.globalAlpha=alpha;
  const grad=ctx.createLinearGradient(x,y-h,x,y+h);
  grad.addColorStop(0,'#dce9dccc');grad.addColorStop(.6,'#d0dad5aa');grad.addColorStop(1,'#d1dcdf00');
  ctx.fillStyle=grad;
  ctx.beginPath();
  ctx.ellipse(x,y,w*.40,h*.48,0,0,Math.PI*2);
  ctx.ellipse(x-w*.26,y+h*.04,w*.24,h*.33,0,0,Math.PI*2);
  ctx.ellipse(x+w*.19,y-h*.08,w*.27,h*.44,0,0,Math.PI*2);
  ctx.fill();ctx.restore();
 }
 function paint(canvas,type,large=false){
  const spec=THEMES[type]||THEMES.fighter;
  if(!canvas||!window.WingmanSprites)return;
  const g=canvas.getContext('2d');if(!g)return;
  const w=canvas.width,h=canvas.height;
  g.clearRect(0,0,w,h);
  // Multilayer colour grading and haze, specific to each squadron.
  let sky=g.createLinearGradient(0,0,0,h);
  sky.addColorStop(0,spec.sky[0]);sky.addColorStop(.56,spec.sky[1]);sky.addColorStop(1,spec.sky[2]);g.fillStyle=sky;g.fillRect(0,0,w,h);
  let sun=g.createRadialGradient(spec.sun[0]*w,spec.sun[1]*h,2,spec.sun[0]*w,spec.sun[1]*h,h*.9);
  sun.addColorStop(0,spec.glow+'c0');sun.addColorStop(.23,spec.glow+'68');sun.addColorStop(1,spec.glow+'00');
  g.fillStyle=sun;g.fillRect(0,0,w,h);
  // Painted mountain ridges and receding ground.
  g.fillStyle=spec.horizon+'5d';
  g.beginPath();g.moveTo(0,h*.87);
  for(let i=0;i<=12;i++){const x=i*w/12,y=h*(.61+.06*Math.sin(i*1.37+type.length));g.lineTo(x,y);}
  g.lineTo(w,h);g.lineTo(0,h);g.fill();
  g.fillStyle=spec.low+'a6';g.beginPath();g.moveTo(0,h);
  for(let i=0;i<=10;i++)g.lineTo(i*w/10,h*(.77+.045*Math.sin(i*1.53+type.length*2)));
  g.lineTo(w,h);g.fill();
  // Broken sunlit cloud banks and condensation trails.
  cloud(g,w*.16,h*.57,w*.50,h*.20,.31);
  cloud(g,w*.78,h*.67,w*.52,h*.23,.28);
  cloud(g,w*.45,h*.24,w*.28,h*.08,.22);
  g.save();g.strokeStyle='#e9e4d870';g.lineWidth=Math.max(1,w/210);g.setLineDash([w*.09,w*.014]);
  g.beginPath();g.moveTo(-w*.02,h*.74);g.bezierCurveTo(w*.14,h*.77,w*.28,h*.55,w*.48,h*.36);g.stroke();g.restore();
  // Airframe is centered with generous negative space. Unlike the original
  // loadout card rendering, no nose/wing/propeller is enlarged beyond frame.
  const spriteScale=large?Math.min(w/58,h/15.4):Math.min(w/53,h/18);
  const cx=w*.51,cy=h*(large?.56:.51);
  g.save();g.translate(cx,cy);g.rotate(-.044);
  g.shadowColor='#081922c9';g.shadowBlur=large?21:8;g.shadowOffsetY=large?13:5;
  g.scale(spriteScale,spriteScale);
  window.WingmanSprites.draw(g,type,'level');
  g.restore();
  // Soft propeller motion ring for a living illustrated hangar portrait.
  const px=cx+spriteScale*(type==='bomber'||type==='he111'?17.5:18);
  g.save();g.strokeStyle='#f1eee1a6';g.lineWidth=large?2.6:1.4;
  g.beginPath();g.ellipse(px,cy-1,spriteScale*.20,spriteScale*4.9,0,0,Math.PI*2);g.stroke();
  g.strokeStyle='#dae5e385';g.lineWidth=large?1.3:.8;g.beginPath();g.ellipse(px,cy-1,spriteScale*.45,spriteScale*3.5,0,0,Math.PI*2);g.stroke();
  g.restore();
  // Lens bloom and softly brushed frame patina.
  g.fillStyle='#e7ce9d33';g.fillRect(0,0,w,Math.max(2,h*.012));
  const vignette=g.createRadialGradient(w*.54,h*.48,h*.2,w*.54,h*.48,w*.77);
  vignette.addColorStop(0,'#07172100');vignette.addColorStop(1,'#0717217b');g.fillStyle=vignette;g.fillRect(0,0,w,h);
  g.save();g.strokeStyle='#f3e1bd64';g.lineWidth=Math.max(1,w/600);g.strokeRect(5,5,w-10,h-10);
  if(large){
   g.font='bold 14px Georgia,serif';g.fillStyle='#f9e7c4ce';g.textAlign='left';
   g.fillText(spec.nation,w*.032,h*.13);
   g.font='bold 10px monospace';g.fillStyle='#f9e7c4b7';g.fillText(spec.weather,w*.032,h*.20);
   g.textAlign='right';g.font='bold 12px monospace';g.fillStyle='#fff0d6ac';g.fillText('✦  1940',w*.965,h*.13);
  }
  g.restore();
 }
 window.WingmanHangarArt={paint,themes:Object.keys(THEMES)};
})();
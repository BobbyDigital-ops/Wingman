/* Wingman: compact, bespoke WWII side-profile silhouettes (320/520 logical canvas).
   These models keep the Phase 1 proportions; no stretched/elongated sprites. */
(function(){
'use strict';
const types=['fighter','heavy','bomber','bf109','bf110','he111'];
// Each type has a distinct 1940s-inspired squadron livery. These pigments
// alter only fill/shading/markings, never the established airframe silhouette.
const palettes={
 fighter:{base:'#6d7b5d',light:'#d4c3a0',dark:'#34483c',glass:'#9fcfda',nation:'raf',camouflage:['#345849','#958362'],trim:'#ead7b2',serial:'DW-K'},
 heavy:{base:'#51717a',light:'#b0c6bb',dark:'#29464c',glass:'#9fd0d8',nation:'raf',camouflage:['#365e69','#708d81'],trim:'#dae0bc',serial:'NE-O'},
 bomber:{base:'#746c50',light:'#c0ac85',dark:'#34493e',glass:'#a5cad0',nation:'raf',camouflage:['#365548','#887d58'],trim:'#dccf9e',serial:'VN-A'},
 bf109:{base:'#91a9b1',light:'#d9dbd4',dark:'#566c70',glass:'#a9d5df',nation:'german',camouflage:['#53665d','#9baca5'],trim:'#e8e6db',serial:'Y-1'},
 bf110:{base:'#4f657a',light:'#9cabb4',dark:'#2b3d51',glass:'#91c4d1',nation:'german',camouflage:['#314a60','#657786'],trim:'#becbcc',serial:'S-2'},
 he111:{base:'#918767',light:'#d6c9a2',dark:'#586650',glass:'#b2d1cd',nation:'german',camouflage:['#697852','#a18c65'],trim:'#ddd5b5',serial:'K-3'}
};
function litPalette(g,type){
 const p=palettes[type];
 // Local-space gradients follow the existing 2D drawing without changing the
 // physical outline, collision shape, sprite scale or angular response.
 const grad=(stops,x1=-11,y1=-6,x2=10,y2=7)=>{
  const v=g.createLinearGradient(x1,y1,x2,y2);
  for(const [at,c] of stops)v.addColorStop(at,c);
  return v;
 };
 return {...p,
  base:grad([[0,p.light],[.28,p.base],[.62,p.base],[1,p.dark]]),
  light:grad([[0,p.trim],[.3,p.light],[1,p.base]],-10,-5,12,6),
  dark:grad([[0,p.camouflage[0]],[.6,p.dark],[1,'#172e38']],-6,-7,12,7),
  glass:grad([[0,'#e0eff0'],[.4,p.glass],[1,'#417580']],-4,-6,7,1)
 };
}
// Painted wing camouflage is clipped to the actual old outline. This is
// intentional: the new illustration cannot expand or distort any aircraft.
function wingSkin(g,p,kind){
 g.save();g.beginPath();
 if(kind==='single'){
  g.moveTo(-4,1.15);g.lineTo(2.2,.6);g.lineTo(9.4,4.3);
  g.quadraticCurveTo(9.5,5.15,8.2,5.2);g.lineTo(-2.7,3.4);
 }else if(kind==='twin'){
  g.moveTo(-5,1.4);g.lineTo(3,.8);g.lineTo(10.2,4.6);
  g.quadraticCurveTo(9.8,5.45,8.2,5.25);g.lineTo(-3.5,3.7);
 }else{
  g.moveTo(-7,1.3);g.lineTo(5,.85);g.lineTo(14,5.5);
  g.quadraticCurveTo(13.7,6.45,11.7,6.2);g.lineTo(-5,3.75);
 }
 g.closePath();g.clip();
 const isBomber=kind==='bomber';
 const segments=isBomber?[[0,1.2,5.5,3],[9,3.2,4.2,1.9],[-5,2.1,4.1,2.1]]:
   [[-2.3,2.1,4.6,2.1],[5.7,3.5,3.2,1.7],[2.1,1.5,2.2,1.1]];
 g.globalAlpha=.76;
 for(let i=0;i<segments.length;i++){
  const [x,y,rx,ry]=segments[i];
  g.fillStyle=p.camouflage[(i+(p.nation==='german'?1:0))%2];
  g.beginPath();g.ellipse(x,y,rx,ry,-.20+i*.31,0,Math.PI*2);g.fill();
 }
 g.globalAlpha=.22;g.strokeStyle='#f5eed6';g.lineWidth=.17;
 for(const dy of [1.9,2.8,3.75,4.9]){
  g.beginPath();g.moveTo(-8,dy);g.lineTo(16,dy+1.2);g.stroke();
 }
 g.restore();
}
function fuselageSkin(g,p,kind){
 g.save();g.beginPath();
 // Only a narrow, in-bounds upper fuselage band is touched, so this cannot
 // alter edge shape even for the smallest fighter aircraft.
 const w=kind==='single'?10:kind==='twin'?11:14;
 g.moveTo(-w,-.75);g.quadraticCurveTo(-4,-1.7,0,-1.8);
 g.lineTo(w-1,-1.45);g.lineTo(w-1,-.6);
 g.lineTo(-w,-.15);g.closePath();g.clip();
 g.globalAlpha=p.nation==='german'?.60:.71;
 for(const [i,x] of [-8,-3,2,7,12].entries()){
  g.fillStyle=p.camouflage[i%2];g.beginPath();
  g.ellipse(x,-.7,i%2?2.5:3.7,.8,i*.18,0,Math.PI*2);g.fill();
 }
 g.restore();
}
function finishDetail(g,p,kind){
 // Light airframe panels, restrained rivets and engine soot. Aircraft
 // markings are hand-drawn on top of them by the existing code.
 g.save();
 g.lineCap='round';g.strokeStyle=p.trim;g.globalAlpha=.34;g.lineWidth=.20;
 const span=kind==='bomber'?12:kind==='twin'?9:7;
 for(let x=-span;x<span;x+=3.1){
  g.beginPath();g.moveTo(x,-.7);g.lineTo(x+.5,.35);g.stroke();
 }
 g.globalAlpha=.23;g.fillStyle='#f4efdc';
 for(let x=-span;x<span;x+=2.2){
  g.beginPath();g.arc(x,1.04,.12,0,Math.PI*2);g.fill();
 }
 g.globalAlpha=.22;g.fillStyle='#0a2430';
 g.beginPath();g.ellipse(kind==='single'?6:3,1.4,kind==='bomber'?5:3,.46,-.08,0,Math.PI*2);g.fill();
 g.restore();
}
function path(g,paint,trace,draw){
 g.beginPath();draw(g);g.closePath();g.fillStyle=paint;g.fill();
 if(trace){g.lineWidth=.55;g.strokeStyle=trace;g.stroke();}
}
function line(g,x1,y1,x2,y2,col,w=.48){
 g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.lineWidth=w;g.strokeStyle=col;g.stroke();
}
function roundel(g,x,y,nation,scale=1){
 g.save();g.translate(x,y);g.scale(scale,scale);
 if(nation==='raf'){
  for(const [rad,col] of [[2.1,'#31577c'],[1.42,'#e8eadc'],[.7,'#b75046']]){
   g.beginPath();g.arc(0,0,rad,0,Math.PI*2);g.fillStyle=col;g.fill();
  }
 }else{
  g.fillStyle='#e9e8dc';g.fillRect(-1.45,-.43,2.9,.86);g.fillRect(-.43,-1.45,.86,2.9);
  g.fillStyle='#353e3c';g.fillRect(-1.1,-.24,2.2,.48);g.fillRect(-.24,-1.1,.48,2.2);
 }
 g.restore();
}
function prop(g,x,top,bottom){
 line(g,x,top,x,bottom,'#7d8d8c',.95);
 line(g,x+.4,top+.7,x+.4,bottom-.7,'#dbe3dd',.32);
}
function tail(g,x,fin,p,angular){
 path(g,p.base,p.dark,c=>{
  c.moveTo(x-1.4,1.5);c.lineTo(x-.9,-1.2);
  if(angular){c.lineTo(x-1,-5.7);c.lineTo(x+1,-5.6);c.lineTo(x+3,-1.35);}
  else {c.quadraticCurveTo(x-1.7,-5.8,x+.3,-5.65);c.quadraticCurveTo(x+1.5,-5.2,x+3,-1.4);}
  c.lineTo(x+5,1.5);
 });
 path(g,p.dark,null,c=>{c.moveTo(x-1.2,1);c.lineTo(x+5.2,1.3);c.lineTo(x+7,2.3);c.lineTo(x-1,2.4);});
 line(g,x+1,-4,x+1,-1.3,p.light,.45);
}
function fighter(g,p,is109){
 const tailX=is109?-11.7:-12.2,noseX=is109?13.3:12.5;
 tail(g,tailX,5,p,is109);
 // Far-side wing, viewed edge-on.
 path(g,p.dark,null,c=>{c.moveTo(-4,-.5);c.lineTo(5,-1.2);c.lineTo(8,-2);c.lineTo(1,-1.2);});
 // Single clean, tapered fuselage: curved rather than a stretched box.
 path(g,p.base,'#273d3c',c=>{
  c.moveTo(tailX-1,0);c.quadraticCurveTo(-8,-1.6,-4.1,-1.6);
  c.lineTo(5,-2);c.quadraticCurveTo(9.2,-2.3,noseX-1.8,-1.4);
  c.quadraticCurveTo(noseX+.3,-.9,noseX,.15);
  c.quadraticCurveTo(noseX-.3,1.4,noseX-2.8,2);
  c.lineTo(-2.3,2.2);c.quadraticCurveTo(-9,2.1,tailX-1,0);
 });
 path(g,p.light,null,c=>{c.moveTo(-8,-1.4);c.lineTo(4,-1.8);c.quadraticCurveTo(9,-2,11,-1.1);c.lineTo(3,-.95);c.lineTo(-8,-.45);});
 path(g,p.dark,null,c=>{c.moveTo(-5,1.75);c.lineTo(9,1.45);c.lineTo(7.6,2.05);c.lineTo(-3.5,2.2);});
 fuselageSkin(g,p,'single');
 // Wing root is a strong shoulder, not a floating rectangle.
 path(g,p.dark,'#33423c',c=>{
  c.moveTo(-4,1.15);c.lineTo(2.2,.6);c.lineTo(9.4,4.3);
  c.quadraticCurveTo(9.5,5.15,8.2,5.2);c.lineTo(-2.7,3.4);
 });
 path(g,p.light,null,c=>{c.moveTo(-2.7,1.45);c.lineTo(2,1.15);c.lineTo(8.8,4.45);c.lineTo(-1.7,3);});
 wingSkin(g,p,'single');finishDetail(g,p,'single');
 roundel(g,3.8,3.3,p.nation,.75);
 if(is109){
  // Emil's yellow theatre identification nose and narrow fuselage band stay inside the legacy silhouette.
  g.save();g.globalAlpha=.91;g.fillStyle='#e6c64f';
  path(g,'#e6c64f',null,c=>{c.moveTo(9.25,-1.75);c.lineTo(11.45,-1.58);c.lineTo(12.9,-.7);c.lineTo(13.3,.15);c.lineTo(12.7,.85);c.lineTo(10.5,1.6);c.lineTo(9.25,1.63);});
  g.fillRect(-8.2,-.82,.65,2.15);g.restore();
 }
 // Different cockpit lines make the Spitfire and Bf 109 recognisable.
 if(is109){
  path(g,p.glass,p.dark,c=>{c.moveTo(-3.5,-1.7);c.lineTo(-2.1,-4.25);c.lineTo(1,-4.6);c.lineTo(2.7,-1.7);});
  line(g,-.7,-4.3,-.3,-1.75,p.dark,.5);
  path(g,p.dark,null,c=>{c.moveTo(6.1,1.8);c.lineTo(9.1,1.75);c.lineTo(8.8,3.1);c.lineTo(6.5,2.8);});
 }else{
  path(g,p.glass,p.dark,c=>{
   c.moveTo(-4.7,-1.6);c.quadraticCurveTo(-2.9,-5.1,0,-5.1);
   c.quadraticCurveTo(2,-4.8,3,-1.8);
  });
  line(g,-.5,-4.8,-.1,-1.7,p.dark,.52);
 }
 for(let i=0;i<3;i++)line(g,5+i*1.2,-1.3,5.4+i*1.2,-.25,p.dark,.52);
 // Nose spinner and restrained blurred propeller.
 path(g,p.dark,null,c=>{c.moveTo(noseX-2,-1.15);c.lineTo(noseX+.6,-.4);c.lineTo(noseX+.6,.5);c.lineTo(noseX-2,1.2);});
 prop(g,noseX+1.1,-4.6,4.7);
 roundel(g,tailX+5.2,.15,p.nation,.55);
}
function twin(g,p,is110){
 const tx=is110?-13.2:-13.8,nx=is110?14.3:13.8;
 tail(g,tx,5,p,is110);
 path(g,p.dark,null,c=>{c.moveTo(-5,-.8);c.lineTo(5,-1.2);c.lineTo(9,-2);c.lineTo(1,-1.3);});
 path(g,p.base,'#2e3e3b',c=>{
  c.moveTo(tx-1,0);c.quadraticCurveTo(-9,-1.7,-3,-2.05);
  c.lineTo(6,-2.25);c.quadraticCurveTo(11,-2,nx,-1.45);
  c.quadraticCurveTo(nx+1,.1,nx,1.15);
  c.quadraticCurveTo(11.2,2.65,6,2.9);c.lineTo(-5,2.4);
  c.quadraticCurveTo(-11,1.9,tx-1,0);
 });
 path(g,p.light,null,c=>{c.moveTo(-8.3,-1.45);c.lineTo(6.5,-2);c.lineTo(11.2,-1);c.lineTo(-7.8,-.3);});
 fuselageSkin(g,p,'twin');
 path(g,p.dark,'#32413c',c=>{c.moveTo(-5,1.4);c.lineTo(3,.8);c.lineTo(10.2,4.6);c.quadraticCurveTo(9.8,5.45,8.2,5.25);c.lineTo(-3.5,3.7);});
 path(g,p.light,null,c=>{c.moveTo(-3.8,1.65);c.lineTo(2.9,1.3);c.lineTo(9.5,4.75);c.lineTo(-3.1,3.2);});
 wingSkin(g,p,'twin');finishDetail(g,p,'twin');
 // Visible nacelles belong to the wing, with the far engine offset.
 for(const [xx,yy,far] of [[-1,1.35,true],[5.2,2.9,false]]){
  path(g,far?p.dark:p.base,'#33443e',c=>{
   c.moveTo(xx-4,yy-.85);c.quadraticCurveTo(xx-2,yy-1.4,xx+.4,yy-1.25);
   c.lineTo(xx+3.9,yy-.6);c.lineTo(xx+3.9,yy+.85);
   c.quadraticCurveTo(xx,yy+1.65,xx-3.6,yy+.8);
  });
  prop(g,xx+4.4,yy-3.3,yy+3.6);
 }
 roundel(g,2.1,3.25,p.nation,.85);
 if(is110){g.save();g.fillStyle='#d6c55d';g.globalAlpha=.75;g.fillRect(-9,-1.4,.7,2.55);g.restore();}
 if(is110){
  path(g,p.glass,p.dark,c=>{c.moveTo(-6,-2);c.lineTo(-3.6,-5.1);c.lineTo(1.6,-5.05);c.lineTo(4.4,-2.1);});
  line(g,-1.4,-5,-1.4,-2.05,p.dark,.55);line(g,1.2,-5,1.2,-2.05,p.dark,.55);
 }else{
  path(g,p.glass,p.dark,c=>{c.moveTo(-4.8,-2);c.quadraticCurveTo(-2,-5.25,1,-5.1);c.quadraticCurveTo(3,-4.85,4,-2.15);});
  line(g,-.25,-5,-.2,-2.1,p.dark,.55);
 }
 line(g,nx-1,.55,nx+1,.55,p.dark,.8);
 roundel(g,tx+5,.35,p.nation,.55);
}
function bomber(g,p,is111){
 const tx=-17.4,nx=is111?17.7:17.1;
 tail(g,tx,6,p,is111);
 path(g,p.dark,null,c=>{c.moveTo(-5,-1.5);c.lineTo(8,-1.7);c.lineTo(11,-2.4);c.lineTo(-2,-1.7);});
 path(g,p.base,'#2b3c38',c=>{
  c.moveTo(tx-1,0);c.quadraticCurveTo(-11,-2.4,-3,-2.65);
  c.lineTo(8,-2.65);c.quadraticCurveTo(14,-2.4,nx,-1.7);
  c.quadraticCurveTo(nx+1.4,-.2,nx,.9);
  c.quadraticCurveTo(14,3.25,8,3.2);c.lineTo(-3,3);
  c.quadraticCurveTo(-13,2.25,tx-1,0);
 });
 path(g,p.light,null,c=>{c.moveTo(-12,-1.9);c.lineTo(8.5,-2.35);c.lineTo(14,-1.7);c.lineTo(12,-.65);c.lineTo(-12,-.55);});
 fuselageSkin(g,p,'bomber');
 path(g,p.dark,null,c=>{c.moveTo(-12,2.1);c.lineTo(12,2.3);c.lineTo(8,3.2);c.lineTo(-7,2.85);});
 // Deep wing root, tapered tip, visually connected to the fuselage.
 path(g,p.dark,'#364540',c=>{c.moveTo(-7,1.3);c.lineTo(5,.85);c.lineTo(14,5.5);c.quadraticCurveTo(13.7,6.45,11.7,6.2);c.lineTo(-5,3.75);});
 path(g,p.light,null,c=>{c.moveTo(-5,1.6);c.lineTo(4,1.4);c.lineTo(13,5.6);c.lineTo(-4.8,3.2);});
 wingSkin(g,p,'bomber');finishDetail(g,p,'bomber');
 for(const [xx,yy,far] of [[-2.8,1.25,true],[4.5,3.15,false]]){
  path(g,far?p.dark:p.base,'#344640',c=>{
   c.moveTo(xx-3.2,yy-.7);c.lineTo(xx+2.7,yy-1);
   c.quadraticCurveTo(xx+4.1,yy,xx+2.8,yy+1.4);c.lineTo(xx-3,yy+1.2);
  });
  prop(g,xx+3.2,yy-3.7,yy+3.8);
 }
 roundel(g,2.2,3.65,p.nation,.9);
 if(is111){
  // The He 111's unmistakable continuous glazed nose.
  path(g,p.glass,p.dark,c=>{
   c.moveTo(7.5,-2.5);c.lineTo(12,-2.7);c.lineTo(nx,-1.55);
   c.quadraticCurveTo(nx+1,.1,nx,1.15);c.lineTo(12.5,2.4);c.lineTo(7.7,-1.8);
  });
  for(let i=0;i<3;i++)line(g,10+i*2,-2.4,11.7+i*1.6,1.3,p.dark,.4);
 }else{
  // Lancaster raised cockpit, glazing and discrete nose turret.
  path(g,p.glass,p.dark,c=>{
   c.moveTo(1,-2.65);c.quadraticCurveTo(3,-6.35,6.6,-6);
   c.quadraticCurveTo(8,-5.35,9,-2.7);
  });
  line(g,5,-6,5,-2.6,p.dark,.53);
  path(g,p.dark,null,c=>{c.moveTo(nx-1.8,-1.1);c.quadraticCurveTo(nx+1,-1.6,nx+1.4,0);c.lineTo(nx-.3,.75);});
  line(g,nx+.7,-.2,nx+2.2,-.5,'#3b4341',.65);
 }
 roundel(g,tx+6,.4,p.nation,.5);
 // Tiny but readable defensive glazing and rear-facing dorsal turret.
 // Four-engine bombers must visually communicate the risk of tailing them.
 path(g,p.dark,'#26383a',c=>{
  c.moveTo(-7.8,-2.5);c.lineTo(-6.9,-5.8);
  c.quadraticCurveTo(-5.2,-7.2,-3.8,-5.8);c.lineTo(-3.2,-2.4);
 });
 path(g,p.glass,null,c=>{
  c.moveTo(-6.9,-3.3);c.lineTo(-6.3,-5.5);
  c.quadraticCurveTo(-5.3,-6.2,-4.6,-5.3);c.lineTo(-4.3,-3.2);
 });
 line(g,-6.7,-5.3,-10.2,-6.7,'#2b3c41',.8);
 // Sparse fuselage panels and unlit observation windows.
 for(const x of [-11,-8,0,3,11])line(g,x,1.9,x+1.4,2.05,p.dark,.37);
 for(const x of [-9,-6]){g.fillStyle='#aac8bd';g.fillRect(x,-.8,1.15,.75);}
 // Wing panel highlight and non-cartoon engine exhaust staining.
 strokeDetails(g,p);
}
function strokeDetails(g,p){
 line(g,-2.5,3.8,6.1,4.3,'#dae2ce59',.33);
 line(g,1.8,-1,11.7,-1.35,'#293b3d5c',.32);
 g.fillStyle='#252f2e55';
 for(const x of [-1.1,4.2])g.fillRect(x+2,3.2,3,.75);
}
function draw(g,type,variant){
 if(!palettes[type])return;
 const p=litPalette(g,type);
 g.save();g.lineCap='round';g.lineJoin='round';
 if(type==='fighter'||type==='bf109')fighter(g,p,type==='bf109');
 else if(type==='heavy'||type==='bf110')twin(g,p,type==='bf110');
 else bomber(g,p,type==='he111');
 if(variant==='worn'||variant==='damaged'){
  // Paint chips and restrained exhaust staining follow the existing wing
  // and fuselage. These details never affect sprite scale or hit geometry.
  g.save();
  g.globalAlpha=variant==='damaged'?.86:.47;
  g.fillStyle='#2b302a';
  g.beginPath();g.ellipse(-5.4,-1.65,3.4,.65,-.08,0,Math.PI*2);g.fill();
  g.strokeStyle='#d1d4c17c';g.lineWidth=.34;
  g.beginPath();g.moveTo(-8,1.85);g.lineTo(-5.9,2.15);g.lineTo(-4.1,1.95);
  g.moveTo(5,-1.5);g.lineTo(7.7,-1.85);
  g.moveTo(-1.5,3.7);g.lineTo(1.25,4.2);g.stroke();
  g.fillStyle='#4a3c32';
  for(const [x,y] of [[-7,2],[-1,2.9],[4,1.45]])g.fillRect(x,y,1.1,.46);
  if(variant==='damaged'){
   g.strokeStyle='#35332bd1';g.lineWidth=1.05;
   g.beginPath();g.moveTo(-9,-1.2);g.lineTo(-4.7,-.9);g.lineTo(-2,.4);
   g.moveTo(1,2.3);g.lineTo(7,2.65);g.stroke();
   g.fillStyle='#e1bc88aa';g.fillRect(6.6,2.1,.75,.5);
  }
  g.restore();
 }
 g.restore();
}
window.WingmanSprites={draw,types,liveries:Object.fromEntries(types.map(t=>[t,{nation:palettes[t].nation,camouflage:palettes[t].camouflage,serial:palettes[t].serial}]))};
})();
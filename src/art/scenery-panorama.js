/* Wingman Batch D1+D2 — hand-painted procedural panoramas with cached parallax.
 * Four independent, high-resolution layers. Only four blits per frame.
 * Physics, hitboxes, winds and touch steering remain unchanged. */
(function(){
'use strict';
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const SCENES=['ALPINE','COAST','DESERT','STORM'];
const PALS=[
 {sky:['#213d58','#7894a8','#d4c7ac'],ground:['#a6b8bd','#698593','#344c56'],mist:'#e5d8be',sun:'#ffe9b8'},
 {sky:['#28506b','#82aec0','#e6d5b5'],ground:['#a2c3bb','#6f9e9b','#3a6272'],mist:'#e7e6d5',sun:'#fff2c7'},
 {sky:['#45667e','#c2b19a','#efd1a2'],ground:['#d8c39c','#b4936b','#77604d'],mist:'#f4d3a4',sun:'#ffe5a9'},
 {sky:['#182b3c','#4d6677','#88969a'],ground:['#788d8b','#4f696c','#273f48'],mist:'#b6c3bb',sun:'#cedce1'}
];
function random(seed){return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
function gradient(c,x,y,x2,y2,stops){
 const v=c.createLinearGradient(x,y,x2,y2);for(const [p,k] of stops)v.addColorStop(p,k);return v;
}
function path(c,arr,fill){if(arr.length<2)return;c.beginPath();c.moveTo(arr[0][0],arr[0][1]);for(let i=1;i<arr.length;i++)c.lineTo(arr[i][0],arr[i][1]);c.closePath();c.fillStyle=fill;c.fill();}
function line(c,a,b,col,width=1){c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.strokeStyle=col;c.lineWidth=width;c.stroke();}
function arc(c,x,y,rx,ry,col){c.fillStyle=col;c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);c.fill();}
function ink(c,r,w,h,col,count,minY=105,maxY=240){
 for(let i=0;i<count;i++){const x=r()*w,y=minY+r()*(maxY-minY);
 line(c,[x,y],[x+2+r()*13,y+(r()-.5)*3],col,.25+r()*.55);}
}
function ridge(c,r,w,h,top,depth,fill,edge,rough=.18){
 const pts=[[0,h]],heights=[];
 for(let x=-12;x<=w+18;x+=5){const xN=x/w;
 const y=top+Math.sin(xN*8+depth)*10+Math.sin(xN*21+depth*2.1)*4+(r()-.5)*rough*36;
 heights.push([x,y]);pts.push([x,y]);}
 pts.push([w,h]);path(c,pts,fill);
 for(let i=1;i<heights.length;i++)if(i%3===0)
   line(c,heights[i-1],heights[i],edge,.45);
 return heights;
}
function cloud(c,x,y,w,r,dark=false){
 const height=w*(.12+r()*.06);
 c.save();c.globalAlpha=dark?.77:.57;
 const g=gradient(c,x,y-height,x,y+height*.75,
  [[0,dark?'#b2c3c3':'#fff5df'],[.62,dark?'#647a89':'#e0e8e1'],[1,dark?'#405a68':'#9bbac5']]);
 c.beginPath();c.moveTo(x-w*.54,y+height*.3);
 c.bezierCurveTo(x-w*.60,y-height*.38,x-w*.45,y-height*.46,x-w*.29,y-height*.30);
 c.bezierCurveTo(x-w*.32,y-height*1.26,x-w*.10,y-height*1.55,x+w*.03,y-height*.94);
 c.bezierCurveTo(x+w*.14,y-height*1.65,x+w*.32,y-height*.95,x+w*.34,y-height*.34);
 c.bezierCurveTo(x+w*.51,y-height*.56,x+w*.59,y+height*.1,x+w*.52,y+height*.40);
 c.bezierCurveTo(x+w*.35,y+height*.68,x-w*.25,y+height*.67,x-w*.54,y+height*.3);
 c.closePath();c.fillStyle=g;c.fill();
 c.strokeStyle=dark?'#d5e0dd25':'#fffefa88';c.lineWidth=.75;
 c.beginPath();c.moveTo(x-w*.28,y-height*.57);c.quadraticCurveTo(x-w*.06,y-height*1.38,x+w*.1,y-height*.88);c.stroke();
 c.restore();
}
function fir(c,x,y,h,color){
 path(c,[[x,y-h],[x-h*.27,y-h*.34],[x-h*.15,y-h*.34],[x-h*.37,y],[x+h*.37,y],[x+h*.16,y-h*.34],[x+h*.27,y-h*.34]],color);
}
function peak(c,x,top,bottom,size,r,near=false){
 const b=x-size*.65,e=x+size*.60;
 const contour=[[b,bottom],[x-size*.48,top+size*.55],[x-size*.33,top+size*.38],
 [x-size*.22,top+size*.32],[x-size*.13,top+size*.12],[x-size*.06,top+size*.19],
 [x,top],[x+size*.08,top+size*.17],[x+size*.18,top+size*.23],
 [x+size*.26,top+size*.13],[x+size*.37,top+size*.43],[e,bottom],[b,bottom]];
 path(c,contour,near?'#506a73':'#889faa');
 path(c,[[x,top],[x+size*.08,top+size*.17],[x+size*.18,top+size*.23],[x+size*.26,top+size*.13],[x+size*.37,top+size*.43],[e,bottom],[x+size*.04,bottom]],near?'#364f5c':'#657f90');
 path(c,[[x-size*.13,top+size*.12],[x-size*.06,top+size*.19],[x,top],[x+size*.08,top+size*.17],
 [x+size*.15,top+size*.19],[x+size*.12,top+size*.27],[x+size*.045,top+size*.24],
 [x-size*.017,top+size*.33],[x-size*.06,top+size*.20]],'#f7f5eb');
 for(let k=0;k<22;k++){
  const px=x+(r()-.5)*size*.72,py=top+size*.30+r()*(bottom-top-size*.30);
  line(c,[px,py],[px+3+r()*8,py+5+r()*15],near?'#1b3e4c67':'#50647455',.36);
 }
 for(let k=0;k<6;k++){
  const px=x+(r()-.5)*size*.32,py=top+size*.19+r()*size*.37;
  line(c,[px,py],[px+(r()-.5)*8,py+12+r()*21],'#e5eee49c',.8);
 }
}
function ship(c,x,y,w){
 path(c,[[x-w*.55,y],[x+w*.52,y],[x+w*.35,y+5],[x-w*.4,y+5]],'#304957');
 c.fillStyle='#5b7580';c.fillRect(x-w*.10,y-9,w*.25,9);c.fillRect(x+w*.13,y-6,w*.19,6);
 line(c,[x+w*.04,y-17],[x+w*.04,y-9],'#425a65',.9);
 line(c,[x-w*.55,y+6],[x+w*.50,y+6],'#d8e9dd9b',1.1);
}
function hangar(c,x,y,w,scene){
 const base=scene===2?'#8c7c62':'#4a6166';
 path(c,[[x,y-10],[x+w*.21,y-19],[x+w*.80,y-19],[x+w,y-10]],scene===2?'#b7a083':'#829394');
 c.fillStyle=base;c.fillRect(x,y-10,w,10);
 c.fillStyle='#233d44';c.fillRect(x+w*.18,y-10,w*.66,10);
 for(let k=1;k<4;k++)line(c,[x+k*w/4,y-10],[x+k*w/4,y],'#6f8588',.5);
}
function lighthouse(c,x,y){
 c.fillStyle='#dfdccc';c.fillRect(x,y-22,7,22);path(c,[[x-2,y-23],[x+3.5,y-29],[x+10,y-23]],'#4a5658');
 c.fillStyle='#f6e9be';c.fillRect(x+1,y-24,5,3);line(c,[x+3,y-31],[x+3,y-28],'#43505b');
}
function tower(c,x,y,scene){
 line(c,[x,y],[x,y-22],scene===2?'#675945':'#455b62',1);
 for(let k=0;k<3;k++)line(c,[x-5+k*5,y],[x+k*2,y-22],scene===2?'#89785c':'#536971',.65);
 line(c,[x-8,y-22],[x+8,y-22],scene===2?'#9c8666':'#a1a9a5',1);
}
function dune(c,w,h,y,amp,col,phase){
 c.beginPath();c.moveTo(0,h);
 for(let x=0;x<=w+10;x+=5){const yy=y+Math.sin(x/w*11+phase)*amp+Math.sin(x/w*24+phase)*amp*.22;c.lineTo(x,yy);}
 c.lineTo(w,h);c.closePath();c.fillStyle=col;c.fill();
}
function mesa(c,x,y,w,height,r,dark=false){
 const left=x-w*.5,right=x+w*.5;
 const contour=[[left,y+height],[left+w*.1,y+height*.52],[left+w*.17,y+height*.23],
 [left+w*.23,y+height*.24],[left+w*.27,y+height*.08],[left+w*.70,y+height*.08],
 [left+w*.76,y+height*.22],[left+w*.84,y+height*.22],[right,y+height],[left,y+height]];
 path(c,contour,dark?'#806d60':'#b4967c');
 path(c,[[x+w*.16,y+height*.08],[x+w*.27,y+height*.08],[x+w*.35,y+height*.93],[x+w*.27,y+height]],dark?'#65564f':'#987d6b');
 line(c,[left+w*.27,y+height*.08],[left+w*.70,y+height*.08],'#ead0a577',1.1);
 for(let j=0;j<19;j++){
  const px=x+(r()-.5)*w*.63,py=y+height*(.28+r()*.7);
  line(c,[px,py],[px+(r()-.5)*11,py+2],dark?'#473b3555':'#5d4e4a54',.6);
 }
}
function sky(c,w,h,s,r){
 const p=PALS[s],g=gradient(c,0,0,0,h,[[0,p.sky[0]],[.42,p.sky[1]],[.90,p.sky[2]],[1,p.mist]]);
 c.fillStyle=g;c.fillRect(0,0,w,h);
 const sunx=w*(s===2?.74:s===3?.51:.28),suny=s===3?94:77;
 const glow=c.createRadialGradient(sunx,suny,2,sunx,suny,s===3?92:165);
 glow.addColorStop(0,s===3?'#dfe6dd50':'#fff4d4bb');glow.addColorStop(.34,s===3?'#d7e0db2b':'#fff3ce4b');glow.addColorStop(1,'#e5e2cf00');
 c.fillStyle=glow;c.fillRect(0,0,w,h);
 for(let i=0;i<(s===3?9:6);i++){
  cloud(c,w*(.04+i*.175)+(r()-.5)*21,40+r()*93,65+r()*79,r,s===3);
 }
 const haze=gradient(c,0,118,0,h,[[0,'#ffffff00'],[1,p.mist+'a2']]);
 c.fillStyle=haze;c.fillRect(0,118,w,h-118);
 // Fine sky painter strokes: subdued so fighters stay readable.
 ink(c,r,w,h,s===3?'#c4d4d216':'#fff6db22',65,33,151);
}
function horizon(c,w,h,s,r){
 const p=PALS[s];
 if(s===0){
  ridge(c,r,w,h,159,.9,'#b3c4c6bd','#e3e7dd78',.08);
  for(const m of [[.04,152,123],[.30,123,163],[.60,136,129],[.87,149,155],[1.04,151,108]])
   peak(c,w*m[0],m[1],224,m[2],r,false);
  c.fillStyle=gradient(c,0,160,0,219,[[0,'#d1ddd69e'],[1,'#a0adb38a']]);c.fillRect(0,160,w,59);
 }else if(s===1){
  ridge(c,r,w,h,173,1.7,'#b1c3b9a6','#d2e9db7d',.06);
  c.fillStyle=gradient(c,0,181,0,h,[[0,'#7da9b4'],[1,'#4d788a']]);c.fillRect(0,181,w,h-181);
  for(let k=0;k<90;k++){const x=r()*w,y=183+r()*65;line(c,[x,y],[x+3+r()*12,y],r()<.5?'#e5f0d570':'#294e6649',.5);}
  for(const a of [.28,.43,.61,.75])ship(c,w*a,193+r()*20,12+r()*15);
 }else if(s===2){
  ridge(c,r,w,h,165,1.6,'#d8bea0bb','#fff1cc66',.08);
  for(const m of [[.19,125,115,62],[.53,138,145,71],[.88,119,128,57]])
   mesa(c,w*m[0],m[1],m[2],m[3],r,false);
  c.fillStyle='#ead3ae3d';c.fillRect(0,174,w,45);
 }else{
  ridge(c,r,w,h,169,.2,'#71888aaa','#b9ceca47',.08);
  for(let k=0;k<19;k++){
   const x=k*w/18+r()*8,y=181+r()*8;
   c.fillStyle='#4b647063';c.fillRect(x,y-6-r()*11,6+r()*8,13+r()*14);
  }
  for(let k=0;k<3;k++){const x=(k+.38)*w/3,y=185;
   line(c,[x,y],[x,y-18-r()*18],'#506775',.8);
   arc(c,x,y-22,12,4,'#b0bfbc7e');
  }
 }
 ink(c,r,w,h,s===2?'#fbdbac38':'#e9f2e02a',85,163,236);
}
function middle(c,w,h,s,r){
 if(s===0){
  ridge(c,r,w,h,192,3.1,'#5b7885e8','#b5c5c388',.11);
  for(const m of [[.20,162,105],[.56,151,125],[.90,164,123]])
   peak(c,w*m[0],m[1],237,m[2],r,true);
  c.fillStyle='#d9e5e150';c.fillRect(0,208,w,16);
 }else if(s===1){
  // Broad chalk headlands, cut vertically into the Channel.
  path(c,[[0,176],[w*.08,172],[w*.15,184],[w*.20,205],[w*.21,229],[w*.15,232],[0,218]],'#d9dbd0');
  path(c,[[0,168],[w*.08,167],[w*.14,174],[w*.15,184],[0,186]],'#637c65');
  path(c,[[w*.78,232],[w*.84,204],[w*.91,182],[w,177],[w,218],[w*.92,248]],'#d8d9c9');
  path(c,[[w*.84,200],[w*.91,177],[w,174],[w,188]],'#64816b');
  for(const x of [w*.05,w*.12,w*.85,w*.94])
    line(c,[x,191],[x+3,214],'#fff7e7b0',1.4);
  line(c,[0,183],[w,185],'#dcece0a0',.8);
  lighthouse(c,w*.925,175);
 }else if(s===2){
  dune(c,w,h,205,10,'#c6a47e',1.5);
  mesa(c,w*.23,153,w*.30,73,r,true);
  mesa(c,w*.80,150,w*.38,78,r,true);
  for(let k=0;k<60;k++){const x=r()*w,y=202+r()*30;line(c,[x,y],[x+2+r()*8,y],'#e8cd9f42',.6);}
 }else{
  ridge(c,r,w,h,194,2.7,'#526f72','#a8bec070',.12);
  for(let k=0;k<36;k++){
   const x=k*w/35,y=199+r()*10;
   c.fillStyle=k%3?'#425c62':'#567078';c.fillRect(x,y-3-r()*15,7+r()*8,16+r()*14);
   if(k%7===0)line(c,[x+3,y-16],[x+4,y-33],'#344d58',1.1);
  }
  for(let k=0;k<4;k++){const x=(k+.5)*w/4,y=205;
   line(c,[x,y],[x,y-41-r()*17],'#8fa29c77',.8);
  }
 }
}
function foreground(c,w,h,s,r){
 const floor=h;
 if(s===0){
  ridge(c,r,w,h,218,4.2,'#3e5b63','#7f9b9670',.10);
  for(let i=0;i<125;i++){
   const x=r()*w,y=222+r()*23,height=2+r()*13;
   if(y-height>208)fir(c,x,y,height,r()<.55?'#294b4d':'#355b59');
  }
  path(c,[[w*.17,241],[w*.27,231],[w*.78,231],[w*.92,246]],'#798786');
  hangar(c,w*.20,237,33,0);hangar(c,w*.75,237,46,0);tower(c,w*.68,231,0);
  for(let k=0;k<16;k++)line(c,[w*.31+k*13,235],[w*.34+k*13,235],'#d9d5bd84',.7);
 }else if(s===1){
  c.fillStyle=gradient(c,0,221,0,floor,[[0,'#5e8b94a8'],[1,'#2b5368']]);c.fillRect(0,221,w,h-221);
  path(c,[[0,223],[w*.09,219],[w*.18,231],[w*.22,250],[0,250]],'#a4b19b');
  for(let k=0;k<72;k++){const x=r()*w,y=219+r()*31;line(c,[x,y],[x+3+r()*20,y],r()<.5?'#eef0d37a':'#254c5f55',.5);}
  ship(c,w*.38,223,42);ship(c,w*.67,228,32);
  for(let k=0;k<5;k++){const x=w*(.12+k*.16);arc(c,x,230,3,1,'#dcead1a2');}
 }else if(s===2){
  dune(c,w,h,219,10,'#a98e6f',3);
  dune(c,w,h,237,5,'#826e5d',1);
  hangar(c,w*.12,231,49,2);hangar(c,w*.72,230,45,2);tower(c,w*.62,231,2);
  for(let i=0;i<75;i++){const x=r()*w,y=226+r()*24;line(c,[x,y],[x+2+r()*7,y],r()<.5?'#d3bc90':'#564e447b',.45);}
  // Canvas tents, drums and a parked supply truck.
  for(const x of [w*.31,w*.41]){
   path(c,[[x-11,241],[x,227],[x+11,241]],'#d0b48a');
   path(c,[[x,227],[x+11,241],[x,241]],'#8f765e');
  }
  c.fillStyle='#49554d';c.fillRect(w*.84,234,25,7);
  arc(c,w*.86,242,3,3,'#303d3d');arc(c,w*.91,242,3,3,'#303d3d');
 }else{
  ridge(c,r,w,h,220,4.1,'#304f55','#6885838f',.1);
  for(let i=0;i<65;i++){
   const x=r()*w,y=228+r()*19;
   c.fillStyle=r()<.5?'#273f45':'#405b58';c.fillRect(x,y-2-r()*9,3+r()*7,8+r()*7);
  }
  hangar(c,w*.09,237,44,3);hangar(c,w*.73,238,45,3);
  tower(c,w*.35,227,3);tower(c,w*.60,231,3);
  for(const x of [w*.15,w*.54,w*.87]){
   line(c,[x,227],[x,145+r()*15],'#637b8088',.6);
   arc(c,x,137+r()*18,10,4,'#91a7a8be');
  }
 }
 // A faint atmospheric darkening below the flight lane, not a flat gradient over the planes.
 c.fillStyle=gradient(c,0,218,0,h,[[0,'#0b233000'],[1,'#10232973']]);c.fillRect(0,218,w,h-218);
 ink(c,r,w,h,s===2?'#ead1ad55':'#d8e2ce39',95,215,249);
}
function create(W,H,scene,scale){
 const s=clamp(Math.round(Number(scene)||0),0,3);
 const ratio=clamp(Number(scale)||2,1,2.5),margin=Math.max(56,Math.min(125,W*.20));
 const width=W+2*margin;
 const paintFns=[sky,horizon,middle,foreground];
 const images=[];
 for(let k=0;k<4;k++){
  const cv=document.createElement('canvas');
  cv.width=Math.round(width*ratio);cv.height=Math.round(H*ratio);
  const c=cv.getContext('2d',{alpha:k!==0});
  c.setTransform(cv.width/width,0,0,cv.height/H,0,0);
  c.imageSmoothingEnabled=true;
  const rnd=random(1841+s*811+k*2197);
  paintFns[k](c,width,H,s,rnd);
  images.push({canvas:cv,depth:[.09,.24,.53,.84][k]});
 }
 return {images,margin,width,W,H,scale:ratio,scene:s,version:'D1D2'};
}
function draw(c,landscape,W,H,distance,time,wind){
 if(!landscape?.images)return false;
 const speed=clamp(Number(distance)||0,-1e8,1e8);
 const windDrift=wind?.active?(Number(wind.current)||0):0;
 for(const layer of landscape.images){
  const drift=Math.sin((speed*layer.depth+time*(.35+layer.depth*1.8)+windDrift*.8)/170)*landscape.margin*.83;
  const sx=clamp((landscape.margin+drift)*landscape.scale,0,layer.canvas.width-W*landscape.scale);
  c.drawImage(layer.canvas,sx,0,W*landscape.scale,layer.canvas.height,0,0,W,H);
 }
 return true;
}
if(window.WingmanScenery){
 window.WingmanScenery.createPanorama=create;
 window.WingmanScenery.drawPanorama=draw;
 window.WingmanScenery.version='D1D2';
}
})();
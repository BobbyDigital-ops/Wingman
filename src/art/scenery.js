/* Wingman Phase 8: cached, painterly WWII skies and theatre-specific terrain.
   All detailed paths, gradients and scenery are drawn ONCE per round/resize.
   No network images, external assets or runtime texture generation. */
(function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rng(seed){return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
function grad(c,x,y,x2,y2,stops,fallback){
  const g=c.createLinearGradient?.(x,y,x2,y2);
  if(!g?.addColorStop)return fallback||stops[0][1];
  for(const [t,col] of stops)g.addColorStop(t,col);
  return g;
}
function radial(c,x,y,r,stops,fallback){
  const g=c.createRadialGradient?.(x,y,0,x,y,r);
  if(!g?.addColorStop)return fallback||stops[0][1];
  for(const [t,col] of stops)g.addColorStop(t,col);
  return g;
}
function polygon(c,pts,fill){
  c.beginPath();c.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);
  c.closePath();c.fillStyle=fill;c.fill();
}
function stroke(c,pts,col,width=1){
  c.beginPath();c.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);
  c.lineWidth=width;c.strokeStyle=col;c.stroke();
}
function ellipse(c,x,y,rx,ry,color){
  c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();
}
function mountain(c,x,tip,w,base,palette,snow,r){
  // Irregular serrated ridges with broken shoulders, never an identical
  // triangle + oversized triangular snowcap on every mountain.
  const left=x-w*(.60+r()*.12),right=x+w*(.56+r()*.13);
  const shoulderL=x-w*(.22+r()*.09),shoulderR=x+w*(.22+r()*.09);
  const ridge=[
    [left,base],[left+w*.08,base-13],[left+w*.21,tip+55+r()*15],
    [shoulderL,tip+35+r()*6],[x-w*.16,tip+31],
    [x-w*.11,tip+12+r()*8],[x-w*.055,tip+18],
    [x,tip],[x+w*.055,tip+15],[x+w*.095,tip+10+r()*10],
    [shoulderR,tip+38],[right-w*.17,base-38-r()*8],
    [right-w*.06,base-11],[right,base]];
  polygon(c,ridge,palette);
  polygon(c,[[x,tip],[x+w*.055,tip+15],[x+w*.095,tip+10],
    [shoulderR,tip+38],[right-w*.17,base-38],
    [right,base],[x+w*.03,base-5],[x-w*.03,tip+45]],'#24445590');
  // Snow lives in cracked gullies instead of a solid white cone.
  if(snow){
    polygon(c,[[x-w*.055,tip+16],[x,tip],[x+w*.055,tip+15],
      [x+w*.095,tip+10],[x+w*.085,tip+23],
      [x+w*.018,tip+26],[x-w*.005,tip+38],
      [x-w*.055,tip+27],[x-w*.10,tip+40]],snow);
    polygon(c,[[x-w*.17,tip+38],[x-w*.12,tip+31],[x-w*.10,tip+46],
      [x-w*.18,tip+60]],'#e2e9e3a1');
    polygon(c,[[x+w*.16,tip+47],[x+w*.23,tip+40],[x+w*.19,tip+57],
      [x+w*.10,tip+68]],'#dae3dea2');
  }
  // Shale striations and interrupted rock faces add scale.
  for(let j=0;j<13;j++){
    const xx=x+(r()-.5)*w*.66,yy=tip+39+r()*(base-tip-55);
    stroke(c,[[xx,yy],[xx+2+r()*7,yy+2+r()*9]],'#243a4971',.4+r()*.2);
  }
}
function cloud(c,x,y,w,r,storm=false){
  // One continuous, ragged cloud silhouette per bank. The previous version
  // stacked translucent ellipses, creating the giant white-circle problem.
  const h=w*(.18+r()*.035),shade=storm?'#506475':'#9bb6c3';
  const light=storm?'#a3b2b7':'#f4eee0';
  const left=x-w*.53,right=x+w*.51;
  c.save();
  c.globalAlpha=storm?.73:.58;
  c.beginPath();
  c.moveTo(left,y+h*.36);
  c.bezierCurveTo(left-w*.04,y+h*.10,x-w*.43,y-h*.15,x-w*.32,y-h*.06);
  c.bezierCurveTo(x-w*.28,y-h*.72,x-w*.14,y-h*.82,x-w*.05,y-h*.52);
  c.bezierCurveTo(x+w*.07,y-h*1.32,x+w*.24,y-h*.96,x+w*.30,y-h*.33);
  c.bezierCurveTo(x+w*.42,y-h*.52,x+w*.55,y-h*.03,right,y+h*.36);
  c.bezierCurveTo(x+w*.39,y+h*.56,x+w*.15,y+h*.48,x+w*.06,y+h*.55);
  c.bezierCurveTo(x-w*.14,y+h*.48,x-w*.36,y+h*.61,left,y+h*.36);
  c.closePath();
  c.fillStyle=grad(c,x,y-h*1.0,x,y+h*.60,
    [[0,light+'ae'],[.52,light+'84'],[1,shade+'55']],shade+'80');
  c.fill();
  // A single diffuse lower rim and loose internal shadow, no round discs.
  c.beginPath();c.moveTo(left+w*.07,y+h*.29);
  c.bezierCurveTo(x-w*.19,y+h*.48,x+w*.14,y+h*.56,right-w*.08,y+h*.31);
  c.strokeStyle=storm?'#2b4c6262':'#6b8b9e45';c.lineWidth=1.2;c.stroke();
  c.beginPath();c.moveTo(x-w*.31,y-h*.06);
  c.bezierCurveTo(x-w*.18,y-h*.54,x-w*.12,y-h*.56,x-w*.02,y-h*.36);
  c.strokeStyle=storm?'#d0d7d72d':'#fff9ef6c';c.lineWidth=.8;c.stroke();
  c.restore();
}
function aircraftHangar(c,x,y,w,col='#4b5b5a'){
  polygon(c,[[x-2,y-11],[x+w*.22,y-20],[x+w*.77,y-20],[x+w+2,y-11]],'#7e8885');
  c.fillStyle=col;c.fillRect(x,y-11,w,12);
  polygon(c,[[x+w*.25,y-10],[x+w*.75,y-10],[x+w*.75,y],[x+w*.25,y]],'#1b333b');
  stroke(c,[[x+w*.5,y-11],[x+w*.5,y]],'#53686d',.7);
  stroke(c,[[x-3,y-11],[x+w+3,y-11]],'#b4b0a2',.7);
}
function radar(c,x,y,h){
  stroke(c,[[x,y],[x,y-h]],'#304750',1.3);
  stroke(c,[[x-9,y],[x,y-h+9],[x+9,y]],'#738b92',.7);
  stroke(c,[[x-11,y-h],[x+11,y-h]],'#c3c3b5',1.2);
  stroke(c,[[x-11,y-h],[x-9,y-h-8],[x+9,y-h-8],[x+11,y-h]],'#b5c0b6',.85);
  for(let i=-8;i<=8;i+=4)stroke(c,[[x+i,y-h-7],[x+i+1,y-h]],'#7d9399',.4);
}
function ship(c,x,y,w){
  polygon(c,[[x,y],[x+w,y],[x+w-8,y+7],[x+9,y+7]],'#273c49');
  c.fillStyle='#50616a';c.fillRect(x+w*.26,y-9,w*.35,9);
  c.fillStyle='#75868d';c.fillRect(x+w*.40,y-13,w*.17,4);
  stroke(c,[[x+w*.55,y-19],[x+w*.55,y-9]],'#354954',1);
  stroke(c,[[x-3,y+8],[x+w+7,y+8]],'#b0cfce96',1.2);
  ellipse(c,x+w*.35,y+9,w*.5,1.1,'#dce8dc4c');
}
function balloon(c,x,y,ground){
  ellipse(c,x,y,11,5,'#889a99');
  ellipse(c,x-2,y-1.5,7,2.4,'#cad2c9');
  polygon(c,[[x+10,y-2],[x+17,y-5],[x+15,y+4]],'#70858c');
  stroke(c,[[x,y+5],[x+3,ground]],'#6a7f8690',.6);
}
function paint(c,W,H,sceneIndex){
  const scenes=['ALPINE','COAST','DESERT','STORM'];
  const scene=scenes[sceneIndex]||'ALPINE',r=rng(1944+sceneIndex*721);
  const pal={
    ALPINE:{top:'#304e69',middle:'#7599ad',low:'#d8c9a8',haze:'#cfdbe0'},
    COAST:{top:'#3b657d',middle:'#86b3c0',low:'#dfd6b6',haze:'#bcd9da'},
    DESERT:{top:'#587787',middle:'#b7b6a4',low:'#e8c89a',haze:'#d6c4a4'},
    STORM:{top:'#263545',middle:'#566b75',low:'#96a2a0',haze:'#829ba2'}
  }[scene];
  c.fillStyle=grad(c,0,0,0,H,[[0,pal.top],[.43,pal.middle],[.76,pal.low],[1,pal.haze]],pal.middle);
  c.fillRect(0,0,W,H);
  // High-altitude sunlight, haze band and a softly lit horizon.
  const sx=W*(scene==='DESERT'?.76:.19),sy=scene==='STORM'?95:79;
  c.fillStyle=radial(c,sx,sy,scene==='STORM'?90:180,
    [[0,scene==='STORM'?'#d1d9cf30':'#fff3d89c'],[.4,'#f7e3c83d'],[1,'#e9e0d000']],'#ffffff16');
  c.fillRect(0,30,W,170);
  c.fillStyle=grad(c,0,125,0,207,[[0,'#e8e7df00'],[1,pal.haze+'8a']],pal.haze+'40');
  c.fillRect(0,125,W,82);
  for(let i=0;i<10;i++){
    const x=r()*W,y=40+r()*90,len=35+r()*100;
    stroke(c,[[x,y],[x+len,y+(r()-.5)*2]],scene==='STORM'?'#c4cbd01b':'#fff7dc24',.35+r()*.5);
  }
  // Fewer, more varied cloud banks with open flying lanes between them.
  // Don't tile large bright clouds over the entire arena.
  const count=scene==='STORM'?7:scene==='DESERT'?3:4;
  for(let i=0;i<count;i++){
    const x=(i+.17+r()*.65)*W/count-25;
    const y=scene==='STORM'?70+r()*82:67+r()*65;
    const w=scene==='STORM'?49+r()*58:38+r()*45;
    cloud(c,x,y,w,r,scene==='STORM');
  }
  if(scene==='ALPINE'){
    // A receding pale massif and three irregular, overlapping rocky ridges.
    // Avoid the regularly spaced, matching five-point mountain wallpaper.
    polygon(c,[[0,194],[W*.11,176],[W*.19,185],[W*.32,158],
      [W*.47,183],[W*.61,165],[W*.78,179],[W*.88,168],[W,188],
      [W,224],[0,224]],'#8199a4a8');
    const peaks=[
      {x:W*.08,tip:160,w:W*.39},
      {x:W*.37,tip:136,w:W*.50},
      {x:W*.75,tip:151,w:W*.55}
    ];
    for(let i=0;i<peaks.length;i++){
      const m=peaks[i];
      mountain(c,m.x,m.tip+(r()-.5)*8,m.w,226,
        ['#6c8594','#526d7e','#728b94'][i],
        i===1?'#e2e6df':'#d5dedb',r);
    }
    polygon(c,[[0,208],[W*.12,205],[W*.25,196],[W*.42,209],[W*.61,191],[W*.78,201],[W,194],[W,H],[0,H]],'#536e70');
    // Rolling hills, scattered tall fir trees and a rocky airstrip.
    polygon(c,[[0,230],[W*.20,221],[W*.40,230],[W*.67,214],[W,H-22],[W,H],[0,H]],'#344d55');
    for(let i=0;i<Math.ceil(W/9);i++){
      const x=i*9+r()*4,y=214+r()*17,h=4+r()*9;
      if(i%4!==1)polygon(c,[[x-2,y],[x,y-h],[x+2,y]],'#2b4a4baa');
    }
    c.fillStyle='#7d8d87';c.fillRect(W*.24,230,W*.51,4);
    stroke(c,[[W*.24,228],[W*.75,228]],'#c0c2ac',.7);
    for(let i=0;i<10;i++)c.fillRect(W*(.27+i*.045),231,7,1);
    aircraftHangar(c,W*.08,224,31);aircraftHangar(c,W*.82,221,43);
    radar(c,W*.72,215,16);
  }else if(scene==='COAST'){
    // The English Channel is recognisable: green rolling chalk headlands,
    // layered slate-blue sea, convoy vessels, distant white surf and cliffs.
    c.fillStyle=grad(c,0,186,0,H,[[0,'#6d9eac'],[1,'#34586b']],'#527989');
    c.fillRect(0,185,W,H-185);
    polygon(c,[[0,178],[W*.09,170],[W*.18,179],[W*.25,197],[W*.22,224],[0,229]],'#d6d4c3');
    polygon(c,[[0,165],[W*.08,164],[W*.17,172],[W*.18,182],[0,182]],'#637c65');
    polygon(c,[[W*.78,223],[W*.86,196],[W*.94,183],[W,181],[W,H],[W*.80,H]],'#c9cabc');
    polygon(c,[[W*.85,191],[W*.91,174],[W,177],[W,188]],'#6c866c');
    stroke(c,[[W*.17,181],[W*.24,200],[W*.22,218]],'#f0e8d0',2);
    for(let i=0;i<88;i++){
      const x=r()*W,y=187+r()*56,len=2+r()*16;
      stroke(c,[[x,y],[x+len,y]],r()>.45?'#d6e7df60':'#244f6b39',.5);
    }
    ship(c,W*.34,205,43);ship(c,W*.61,212,34);ship(c,W*.71,209,25);
    radar(c,W*.13,166,23);balloon(c,W*.49,137,202);
    stroke(c,[[0,186],[W,187]],'#c6d9d1a3',.8);
  }else if(scene==='DESERT'){
    // North Africa: hazy horizon, asymmetrical escarpment and sandy scrub.
    polygon(c,[[0,177],[W*.1,171],[W*.23,183],[W*.44,158],[W*.58,179],[W*.77,164],[W,179],[W,H],[0,H]],'#cdb891');
    polygon(c,[[0,205],[W*.16,193],[W*.29,201],[W*.49,189],[W*.65,202],[W*.82,186],[W,191],[W,H],[0,H]],'#b49770');
    polygon(c,[[0,226],[W*.21,214],[W*.42,231],[W*.68,211],[W,H-26],[W,H],[0,H]],'#826f59');
    c.fillStyle='#c8b38f';c.fillRect(W*.19,223,W*.58,3);
    for(let i=0;i<95;i++){
      const x=r()*W,y=189+r()*60,sz=.4+r()*1.7;
      c.fillStyle=r()>.5?'#e3cba058':'#4c57484c';c.fillRect(x,y,sz,sz*.55);
    }
    for(const x of [W*.08,W*.83]){
      polygon(c,[[x,216],[x+14,197],[x+31,216]],'#c5b696');
      polygon(c,[[x+14,197],[x+31,216],[x+14,216]],'#837d64');
      stroke(c,[[x,216],[x+31,216]],'#6f6856');
    }
    // Raised watch-post, fuel drums and a low supply truck.
    radar(c,W*.42,212,25);
    c.fillStyle='#4a554b';c.fillRect(W*.57,214,25,8);
    c.fillStyle='#68725d';c.fillRect(W*.73,217,9,6);
    ellipse(c,W*.60,223,3,3,'#303e40');ellipse(c,W*.62,223,3,3,'#303e40');
  }else{
    // British home-front storm: receding farmland, industrial works,
    // barrage balloons and enormous layered banks of rain cloud.
    polygon(c,[[0,192],[W*.17,184],[W*.35,194],[W*.59,187],[W*.78,193],[W,178],[W,H],[0,H]],'#677d77');
    polygon(c,[[0,220],[W*.16,205],[W*.30,215],[W*.51,199],[W*.71,218],[W,205],[W,H],[0,H]],'#3c5757');
    for(let i=0;i<40;i++){
      const x=i*W/40,y=206+(i*11)%10;
      c.fillStyle=i%3?'#334e50':'#405456';c.fillRect(x,y,4+r()*6,6+r()*9);
      if(i%5===0){c.fillStyle='#c6a077';c.fillRect(x+2,y+3,1,2);}
    }
    aircraftHangar(c,W*.10,222,46,'#374d50');
    aircraftHangar(c,W*.66,223,50,'#3b5155');
    radar(c,W*.29,203,28);radar(c,W*.50,201,31);
    balloon(c,W*.19,145,203);balloon(c,W*.81,132,194);
    for(let i=0;i<55;i++){
      const x=r()*W,y=47+r()*165;
      stroke(c,[[x,y],[x-2,y+9]],'#c9d5d52a',.6);
    }
  }
  // Cinematic darkening near the bottom and at screen edges.
  c.fillStyle=grad(c,0,166,0,H,[[0,'#0b1c2600'],[1,'#071a2d66']],'#172f3640');
  c.fillRect(0,166,W,H-166);
  c.fillStyle=grad(c,0,0,W,0,[[0,'#10233247'],[.19,'#10233200'],[.81,'#10233200'],[1,'#10233245']],'#10233210');
  c.fillRect(0,35,W,H-35);
  // Subtle reproducible film grain near the ground, never in the HUD.
  for(let i=0;i<160;i++){
    const x=r()*W,y=165+r()*(H-165);
    c.fillStyle=r()>.5?'#edf0da20':'#122a3423';c.fillRect(x,y,.6+r()*1.2,.6);
  }
}
function weather(c,W,H,sceneIndex,time,wind){
  // Deliberately bounded to <20 strokes/ellipses per frame on mobile.
  const strength=wind?.active?wind.current:0,dir=Math.sign(strength)||1;
  c.save();
  const drift=time*(.7+Math.abs(strength)*.10);
  for(let i=0;i<5;i++){
    const x=((i*133+drift*dir)%(W+100)+(W+100))%(W+100)-50;
    const y=68+i*24;
    ellipse(c,x,y,23+i%2*9,2.3,sceneIndex===3?'#c6ced212':'#f7f5e51a');
  }
  if(sceneIndex===3){
    c.strokeStyle='#cbd7dc2e';c.lineWidth=.48;
    for(let i=0;i<12;i++){
      const x=((i*71-time*18)%(W+40)+(W+40))%(W+40);
      const y=57+(i*29+time*22)%(H-65);
      c.beginPath();c.moveTo(x,y);c.lineTo(x-2.5,y+10);c.stroke();
    }
  }else if(sceneIndex===2){
    c.fillStyle='#e1c49b0e';c.fillRect(0,176+Math.sin(time*.38)*2,W,18);
  }
  c.restore();
}
window.WingmanScenery={paint,weather,version:'8.1'};
})();

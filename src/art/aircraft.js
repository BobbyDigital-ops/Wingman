/* Wingman v0.5: six ORIGINAL side-on miniature aircraft.
 * Drawn in vector/pixel hybrid on the game's high-DPI overlay.
 * Based on the user's side-profile Spitfire reference, but less cartoonish.
 * All six have separate fuselage, wing, tail and cockpit geometries.
 */
(function(){
'use strict';
const models={
 fighter:{n:12,tail:12,fin:6,wing:10,canopy:5,engines:1,c:'#536e48',light:'#a9bb87',dark:'#324c3b',glass:'#9ad3e1',mark:'raf'},
 heavy:{n:13,tail:14,fin:5.3,wing:12,canopy:6,engines:2,c:'#677550',light:'#b2b797',dark:'#3b5144',glass:'#a0d2da',mark:'raf'},
 bomber:{n:17,tail:18,fin:6,wing:16,canopy:10,engines:4,c:'#626f51',light:'#afb497',dark:'#384d3b',glass:'#98c7d4',mark:'raf'},
 bf109:{n:13,tail:13,fin:5,wing:10,canopy:5,engines:1,c:'#85978d',light:'#c2c9bb',dark:'#536760',glass:'#9ecdda',mark:'german'},
 bf110:{n:14,tail:14,fin:5.5,wing:12,canopy:8,engines:2,c:'#7f9187',light:'#b9c7b6',dark:'#536a64',glass:'#9bc9d0',mark:'german'},
 he111:{n:17,tail:18,fin:6,wing:16,canopy:11,engines:2,c:'#819587',light:'#becbb8',dark:'#546b60',glass:'#a5d3dd',mark:'german'}
};
function poly(g,pts,col,line='#26383d'){
 g.beginPath();g.moveTo(pts[0][0],pts[0][1]);
 for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);
 g.closePath();g.fillStyle=col;g.fill();
 if(line){g.strokeStyle=line;g.lineWidth=.58;g.stroke();}
}
function seg(g,a,b,color,w=.5){
 g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);
 g.strokeStyle=color;g.lineWidth=w;g.stroke();
}
function mark(g,x,y,nation){
 if(nation==='raf'){
  g.fillStyle='#315da3';g.beginPath();g.arc(x,y,1.65,0,7);g.fill();
  g.fillStyle='#f4eee3';g.beginPath();g.arc(x,y,1.1,0,7);g.fill();
  g.fillStyle='#c64c42';g.fillRect(x-.45,y-.45,.9,.9);
 }else{
  g.fillStyle='#f0eddf';g.fillRect(x-1.5,y-.4,3,.8);
  g.fillRect(x-.4,y-1.5,.8,3);
  g.fillStyle='#333b3b';g.fillRect(x-1,y-.25,2,.5);
  g.fillRect(x-.25,y-1,.5,2);
 }
}
function draw(g,type,variant,detached={}){
 const p=models[type];if(!p)return;
 const tail=-p.tail,nose=p.n,wide=p.engines>1;
 g.save();g.lineCap='round';g.lineJoin='round';
 // Vertical stabiliser and horizontal tail, seen SIDE-ON.
 poly(g,[[tail-2,1],[tail,-p.fin],[tail+2,-p.fin+.7],[tail+6,-1],[tail+8,2]],p.c);
 poly(g,[[tail-2,1],[tail,-p.fin],[tail+1,-p.fin+1],[tail+2,1]],p.dark,null);
 poly(g,[[tail-1,2],[tail+7,2],[tail+10,3],[tail+1,4]],p.dark);
 // Fuselage with subtly shaded underside; long RAF bomber and slab-sided He 111.
 const top=wide?-2.55:-2.05,bottom=wide?3.35:2.5;
 poly(g,[[tail,0],[tail+4,top],[nose-6,top-.2],[nose-1,top+1],
         [nose,0],[nose-1,bottom-1],[nose-5,bottom],[tail+3,bottom-.4]],p.c);
 poly(g,[[tail+4,top+.2],[nose-7,top-.3],[nose-3,top+.7],[tail+5,top+1]],p.light,null);
 poly(g,[[tail+3,bottom-1],[nose-3,bottom-1],[nose-5,bottom],[tail+4,bottom-.2]],p.dark,null);
 // Leading wing appears angled down and toward viewer — not overhead.
 const span=p.wing;
 poly(g,[[-4,1],[4,1],[span*.64,3.3],[span*.37,5.3],[-2,4.5]],p.dark);
 poly(g,[[-3,1.6],[3,1.6],[span*.57,3.2],[span*.36,4.75],[-1.6,4.1]],p.light,null);
 mark(g,span*.23,4.05,p.mark);
 mark(g,tail+7,.5,p.mark);
 // Individual glasshouse and canopy profiles.
 const cx=type==='fighter'||type==='bf109'?-1:wide?-4:-2;
 const cw=p.canopy,ch=wide?3.7:3.25;
 poly(g,[[cx-cw/2,-2.6],[cx-cw*.32,-ch-2],[cx+cw*.18,-ch-2.3],
          [cx+cw/2,-3.4],[cx+cw/2,-2.5]],p.glass);
 seg(g,[cx-.2,-ch-1.8],[cx,-2.6],p.dark,.52);
 if(cw>7)seg(g,[cx+2.3,-ch-1.6],[cx+2.4,-2.6],p.dark,.47);
 seg(g,[cx-cw*.2,-ch-1.7],[cx+cw*.18,-ch-1.9],'#e8f6f3',.45);
 // Distinct engine positions and propeller disc.
 if(p.engines===1){
  poly(g,[[nose-6,-2.5],[nose-2,-2],[nose,0],[nose-1,2],[nose-5,2.7]],p.dark);
  poly(g,[[nose-5,-2.2],[nose-2,-1.8],[nose-.5,-.4],[nose-4,-.2]],p.light,null);
  seg(g,[nose+.5,-4],[nose+.5,4],'#637276',.85);
  seg(g,[nose+1,-3.3],[nose+1,3.3],'#c6d3d0',.35);
 }else{
  const pods=p.engines===4?[0,9]:[2];
  for(const x of pods){
   poly(g,[[x-4,1],[x+2,1],[x+4,2.5],[x+3,4.2],[x-4,4.2]],p.dark);
   poly(g,[[x-3,1.2],[x+1,1.2],[x+3,2.6],[x-3,2.6]],p.light,null);
   seg(g,[x+4,-1.1],[x+4,6.3],'#758386',.75);
  }
  if(type==='heavy'||type==='bf110'){
   seg(g,[nose-4,1],[nose+2,1],'#2c393b',.85);
   seg(g,[nose-4,2.4],[nose+2,2.4],'#3b4142',.65);
  }else{
   poly(g,[[nose-5,-2.6],[nose,-1.9],[nose+2,0],[nose+1,3],[nose-5,3]],p.glass);
   seg(g,[nose-2,-2],[nose-2,2.6],p.dark,.4);
  }
 }
 // Flashes and airframe damage do not require a separate asset pack.
 if(variant==='damaged'){g.fillStyle='#343936';g.fillRect(-4,-1.8,2.6,1.5);}
 g.restore();
}
window.WingmanSprites={draw,types:Object.keys(models)};
})();
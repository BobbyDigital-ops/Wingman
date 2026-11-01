/* Wingman Phase 11A — cinematic weather, meaningful hazards and 2.5D aircraft banking.
 * Render-only atmospheric passes; no aircraft art, collision, flight or weapon overrides.
 * Ground hazards are neutral, telegraphed, range-limited and obey spawn protection.
 */
(function(root){
 'use strict';
 const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const quality=()=>root.matchMedia?.('(pointer: coarse)')?.matches?'mobile':'desktop';
 const labels={
  clear:'CLEAR SKIES',clouds:'CLOUD BANKS',fog:'LOW VISIBILITY',
  rain:'DRIVING RAIN',storm:'STORM FRONT',glare:'LOW SUN GLARE',
  flak:'FLAK BATTERY',searchlight:'SEARCHLIGHT SWEEP'
 };
 function forEncounter(enc,arena=0){
  if(!enc){
   const weather=['clouds','clouds','glare','storm'][clamp(Math.floor(arena)||0,0,3)];
   return {weather,hazard:null,label:labels[weather],detail:'Local theatre conditions. Airframe and weapon stats are unchanged.'};
  }
  const rank=clamp(Math.floor(Number(enc.rank)||1),1,12);
  const lane=clamp(Math.floor(Number(enc.lane)||0),0,2);
  let weather='clear',hazard=null;
  if(rank===12)weather='storm'; // Final boss: visual pressure only; no surprise ground damage.
  else if(rank>=10&&lane===2){weather='clouds';hazard='flak';}
  else if(rank>=11&&lane===1){weather='fog';hazard='searchlight';}
  else if(rank===9&&lane===1)weather='glare';
  else if(rank>=7&&lane===2)weather='storm';
  else if(rank>=6&&lane===1)weather='rain';
  else if(rank>=5&&lane===0)weather='fog';
  else if(rank>=3&&lane===2)weather='clouds';
  else if(rank>=2)weather='clouds';
  const headline=hazard?labels[hazard]+' · '+labels[weather]:labels[weather];
  const detail=hazard==='flak'?
   'Neutral ground flak bursts at marked locations after a visible warning. All aircraft are vulnerable.':
   hazard==='searchlight'?
   'Sweeping beams can expose low-flying aircraft to light neutral flak after a sustained lock.':
   weather==='glare'?'Sunlight reduces visual contrast in one part of the sky; aircraft remain targetable.':
   weather==='storm'?'Heavy rain, clouds and occasional lightning; flight physics remain unchanged.':
   weather==='fog'?'Passing fog banks soften distant scenery and silhouettes without changing hit detection.':
   weather==='rain'?'Rain and passing clouds; existing wind rules remain authoritative.':
   weather==='clouds'?'Moving cloud cover with no invisible collision or target penalties.':
   'No additional environmental hazards.';
  return {weather,hazard,label:headline,detail};
 }
 // 2.5D illusion. Sign follows actual turn rate, not player input: AI banks too.
 // Only the rendered silhouette is sheared/foreshortened; hitboxes stay put.
 function bankTarget(p){
  if(!p?.alive)return 0;
  const turn=Number(p.turnVelocity)||0;
  const typical=p.role==='bomber'?1.30:p.role==='heavy'?1.70:2.05;
  const swoop=p.swoop?.direction?clamp(p.swoop.direction,-1,1)*.94:0;
  return clamp(swoop||turn/typical,-1,1);
 }
 function advanceBank(p,dt){
  if(!p)return 0;
  const target=bankTarget(p);
  const rate=p.role==='bomber'?3.7:p.role==='heavy'?5.0:7.0;
  p.visualBank=clamp((p.visualBank||0)+
    (target-(p.visualBank||0))*(1-Math.exp(-clamp(dt||0,0,.15)*rate)),-1,1);
  return p.visualBank;
 }
 function bankMatrix(p){
  const bank=clamp(Number(p?.visualBank)||0,-1,1),strength=Math.abs(bank);
  return {bank,shearX:bank*.16,shearY:bank*.095,height:1-strength*.38,depth:strength*.50};
 }
 function create(spec){
  const src=spec||forEncounter(null,0);
  return {...src,time:0,flakCount:0,flakMarker:null,flakBursts:[],
    searchlightLocks:Object.create(null),searchlightCooldowns:Object.create(null),
    lastExposure:null,damageEvents:0};
 }
 const flakPoint=(index,W,H)=>({
  x:W*(.24+((index*7+3)%10)*.052),
  y:H-136-((index*3+2)%4)*15
 });
 function searchlightX(time,W){return W*(.5+.36*Math.sin(time*.34));}
 function advance(env,dt,W,worldH,planes=[],onHit=()=>{}){
  if(!env||!(dt>0))return;
  const before=env.time;env.time+=dt;
  env.flakBursts=env.flakBursts.filter(b=>(b.age+=dt)<.8);
  if(env.hazard==='flak'){
   const period=10,warningStart=7.3,detonateAt=9.2;
   const phase=env.time%period,cycle=Math.floor(env.time/period);
   env.flakMarker=phase>=warningStart&&phase<detonateAt?
    {...flakPoint(cycle,W,worldH),remaining:detonateAt-phase}:null;
   if(Math.floor((before-detonateAt)/period)!==Math.floor((env.time-detonateAt)/period)){
    const point=flakPoint(Math.floor((env.time-detonateAt)/period),W,worldH);
    env.flakCount++;
    env.flakBursts.push({...point,age:0,radius:25});
    for(const p of planes)if(p?.alive&&p.spawnSafe<=0&&Math.hypot(p.x-point.x,p.y-point.y)<25+(p.d?.radius||6)){
     onHit(p,7,point.x,point.y,'FLAK');env.damageEvents++;
    }
   }
  }else env.flakMarker=null;
  if(env.hazard==='searchlight'){
   const x=searchlightX(env.time,W);
   for(const p of planes){
    if(!p?.alive)continue;
    const id=String(p.id),lowEnough=p.y>worldH-208;
    const inBeam=lowEnough&&Math.abs(p.x-x)<32;
    env.searchlightLocks[id]=inBeam?(env.searchlightLocks[id]||0)+dt:
      Math.max(0,(env.searchlightLocks[id]||0)-dt*2);
    env.searchlightCooldowns[id]=Math.max(0,(env.searchlightCooldowns[id]||0)-dt);
    if(env.searchlightLocks[id]>=1.8&&env.searchlightCooldowns[id]<=0){
     env.searchlightCooldowns[id]=10;
     env.searchlightLocks[id]=0;
     env.lastExposure={x:p.x,y:p.y,age:0};
     env.flakBursts.push({x:p.x,y:p.y,age:0,radius:18});
     // One exposed-aircraft hit; not a random homing attack and not
     // repeated each frame. Both teams are subject to the exact same rule.
     if(p.spawnSafe<=0){onHit(p,5,p.x,p.y,'FLAK');env.damageEvents++;}
    }
   }
  }
  if(env.lastExposure)env.lastExposure.age+=dt;
 }
 function ellipse(g,x,y,rx,ry,opacity){
  g.globalAlpha=opacity;g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);g.fill();
 }
 function drawBack(g,env,W,H){
  if(!env||env.weather==='clear')return;
  const t=env.time,storm=env.weather==='storm',fog=env.weather==='fog';
  g.save();
  g.fillStyle=storm?'#b9c2c5':fog?'#e3ebdd':'#f5f0dc';
  const count=quality()==='mobile'?4:6;
  for(let i=0;i<count;i++){
   const x=((i*151+t*(storm?6.2:3.3))%(W+190))-95;
   const y=53+(i*59)%Math.max(90,H-107);
   const size=storm?40:28+(i%3)*9;
   ellipse(g,x,y,size,6+i%3*2,storm?.22:fog?.25:.21);
   ellipse(g,x+size*.45,y-5,size*.83,7+i%2*3,storm?.19:fog?.22:.16);
  }
  if(fog){g.globalAlpha=.17;g.fillStyle='#d3ddda';g.fillRect(0,34,W,H-34);}
  if(storm){
   const flash=Math.pow(Math.max(0,Math.sin(t*.64-1.25)),24);
   if(flash>.03){g.globalAlpha=flash*.10;g.fillStyle='#d4e2eb';g.fillRect(0,30,W,H-30);}
  }
  g.restore();
 }
 function drawFront(g,env,W,H,cameraY=0){
  if(!env)return;
  const t=env.time,rain=env.weather==='rain'||env.weather==='storm';
  g.save();g.beginPath();g.rect(0,31,W,H-31);g.clip();
  if(env.hazard==='searchlight'){
   const at=searchlightX(t,W),spread=48;
   g.globalAlpha=.15;g.fillStyle='#fbe6af';
   g.beginPath();g.moveTo(at,H+4);g.lineTo(at-spread,42);
   g.lineTo(at+spread,42);g.closePath();g.fill();
   g.globalAlpha=.65;g.strokeStyle='#f6d9a0';g.lineWidth=.85;
   g.beginPath();g.moveTo(at,H);g.lineTo(at+7,40);g.stroke();
  }
  if(env.weather==='glare'){
   const x=W*.78,y=58;
   const rad=g.createRadialGradient(x,y,2,x,y,Math.min(135,W*.28));
   rad.addColorStop(0,'rgba(255,239,180,.34)');
   rad.addColorStop(.35,'rgba(255,222,155,.13)');
   rad.addColorStop(1,'rgba(255,227,181,0)');
   g.globalAlpha=1;g.fillStyle=rad;g.fillRect(0,31,W,H-31);
   g.globalAlpha=.58;g.fillStyle='#fff1cb';g.beginPath();g.arc(x,y,6,0,TAU);g.fill();
  }
  if(env.weather==='fog'){
   const fogFlow=.10+.055*Math.sin(t*.4);
   g.globalAlpha=fogFlow;g.fillStyle='#d4dddd';g.fillRect(0,32,W,H-32);
  }
  if(rain){
   g.globalAlpha=env.weather==='storm'?.35:.24;
   g.strokeStyle=env.weather==='storm'?'#cbdfea':'#eff6eb';
   g.lineWidth=.65;g.beginPath();
   const count=quality()==='mobile'?28:46;
   const fall=t*(env.weather==='storm'?105:78);
   for(let i=0;i<count;i++){
    const x=((i*41.71-fall*.18)%(W+20)+(W+20))%(W+20)-10;
    const y=((i*29.3+fall)%(H+30)+(H+30))%(H+30)-15;
    g.moveTo(x,y);g.lineTo(x-4,y+11);
   }
   g.stroke();
  }
  if(env.flakMarker){
   const x=env.flakMarker.x,y=env.flakMarker.y-cameraY;
   if(y>32&&y<H+8){
    g.globalAlpha=.55+.30*Math.sin(t*11);
    g.strokeStyle='#ffce97';g.lineWidth=1.2;g.beginPath();
    g.arc(x,y,20-env.flakMarker.remaining*2,0,TAU);g.stroke();
    g.fillStyle='#ffbb86';g.font='bold 7px monospace';g.textAlign='center';
    g.fillText('FLAK '+Math.ceil(env.flakMarker.remaining)+'s',x,y-24);
   }
  }
  for(const b of env.flakBursts){
   const progress=clamp(b.age/.8,0,1),y=b.y-cameraY;
   if(y<28||y>H+25)continue;
   g.globalAlpha=(1-progress)*.65;
   g.fillStyle='#f8c388';g.beginPath();
   g.arc(b.x,y,b.radius*(.18+progress*.85),0,TAU);g.fill();
   g.globalAlpha=(1-progress)*.58;g.strokeStyle='#b65941';g.lineWidth=2;
   g.beginPath();g.arc(b.x,y,b.radius*(.55+progress*.65),0,TAU);g.stroke();
  }
  g.restore();
 }
 const api={forEncounter,advanceBank,bankTarget,bankMatrix,create,advance,
  drawBack,drawFront,flakPoint,searchlightX,labels};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.WingmanFlightAtmosphere=api;
})(typeof window!=='undefined'?window:globalThis);

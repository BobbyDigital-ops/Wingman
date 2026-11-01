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
  flak:'FLAK BATTERY'
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
  else if(rank>=11&&lane===1)weather='fog';
  else if(rank===9&&lane===1)weather='glare';
  else if(rank>=7&&lane===2)weather='storm';
  else if(rank>=6&&lane===1)weather='rain';
  else if(rank>=5&&lane===0)weather='fog';
  else if(rank>=3&&lane===2)weather='clouds';
  else if(rank>=2)weather='clouds';
  const headline=hazard?labels[hazard]+' · '+labels[weather]:labels[weather];
  const detail=hazard==='flak'?
   'Neutral ground flak bursts at marked locations after a visible warning. All aircraft are vulnerable.':
   weather==='glare'?'Sunlight reduces visual contrast in one part of the sky; aircraft remain targetable.':
   weather==='storm'?'Heavy rain, clouds and occasional lightning; flight physics remain unchanged.':
   weather==='fog'?'Passing fog banks soften distant scenery and silhouettes without changing hit detection.':
   weather==='rain'?'Rain and passing clouds; existing wind rules remain authoritative.':
   weather==='clouds'?'Moving cloud cover with no invisible collision or target penalties.':
   'No additional environmental hazards.';
  return {weather,hazard,label:headline,detail};
 }
 // Optional Skirmish flight-condition presets make every effect testable
 // without grinding to rank ten. Never change a campaign's declared hazard.
 const PRESETS=Object.freeze(['auto','clear','clouds','fog','rain','storm','glare','flak']);
 function forPreset(id,arena=0){
  if(id==='auto'||!PRESETS.includes(id))return forEncounter(null,arena);
  const hazard=id==='flak'?'flak':null;
  const weather=id==='flak'?'clouds':id;
  const description=forEncounter({rank:10,lane:2},arena);
  return {weather,hazard,label:hazard?labels[hazard]+' · '+labels[weather]:labels[weather],
   detail:hazard?description.detail:'Selected Skirmish flight conditions; all pilots face the same sky.'};
 }
 // 2.5D illusion. Sign follows actual turn rate, not player input: AI banks too.
 // Only the rendered silhouette is sheared/foreshortened; hitboxes stay put.
 function bankTarget(p){
  if(!p?.alive)return 0;
  const turn=Number(p.turnVelocity)||0;
  const typical=p.role==='bomber'?.88:p.role==='heavy'?1.08:1.22;
  const swoop=p.swoop?.direction?clamp(p.swoop.direction,-1,1)*.94:0;
  return clamp(swoop||turn/typical,-1,1);
 }
 function advanceBank(p,dt){
  if(!p)return 0;
  const target=bankTarget(p);
  const rate=p.role==='bomber'?4.2:p.role==='heavy'?6.2:9.5;
  p.visualBank=clamp((p.visualBank||0)+
    (target-(p.visualBank||0))*(1-Math.exp(-clamp(dt||0,0,.15)*rate)),-1,1);
  return p.visualBank;
 }
 function bankMatrix(p){
  const bank=clamp(Number(p?.visualBank)||0,-1,1),strength=Math.abs(bank);
  return {bank,shearX:bank*.49,shearY:bank*.19,height:1-strength*.55,depth:strength*.80};
 }
 // Always-visible cockpit windsock: cloth droop in calm conditions,
 // stretched striped fabric when a real shared wind field is active.
 function drawWindsock(g,wind,x,y,t=0){
  const strength=clamp(Math.abs(Number(wind?.current)||0)/37,0,1);
  const dir=(Number(wind?.current)||0)<0?-1:1;
  const active=!!wind?.active&&strength>.025;
  const reach=active?7+20*strength:6;
  const tipY=active?-1.5-Math.sin(t*4.4)*1.05*strength:8;
  g.save();g.translate(x,y);
  g.fillStyle='#0c2330cc';g.fillRect(-10,-12,99,23);
  g.strokeStyle='#b7a88688';g.lineWidth=.65;g.strokeRect(-10,-12,99,23);
  // A compact mast and two tapered cloth segments, rendered from the
  // very wind values moving the planes rather than a cosmetic random flag.
  g.strokeStyle='#c7cec9';g.lineWidth=1.1;g.beginPath();g.moveTo(0,-5);
  g.lineTo(0,7);g.stroke();
  g.fillStyle='#afc1bd';g.fillRect(-2,6,4,1.6);
  g.save();g.translate(0,-4);if(dir<0)g.scale(-1,1);
  const midY=tipY*.50;
  g.fillStyle='#be6546';g.beginPath();g.moveTo(0,-3.1);
  g.lineTo(reach*.47,midY-2.35);g.lineTo(reach*.47,midY+2.35);
  g.lineTo(0,3.1);g.closePath();g.fill();
  g.fillStyle='#eee5cf';g.beginPath();g.moveTo(reach*.47,midY-2.35);
  g.lineTo(reach,tipY-1.1);g.lineTo(reach,tipY+1.1);
  g.lineTo(reach*.47,midY+2.35);g.closePath();g.fill();
  g.restore();
  g.font='bold 7px monospace';g.textAlign='left';g.textBaseline='middle';
  g.fillStyle=active?'#f5d6a0':'#c1c9c2';
  g.fillText(active?((dir>0?'→':'←')+' '+Math.round(Math.abs(wind.current))+' WIND'):'CALM',30,0,56);
  g.restore();
 }
 function create(spec){
  const src=spec||forEncounter(null,0);
  // A saved run from the older preview may still carry searchlight data.
  // Retire it safely without touching the campaign save schema.
  const safe=src.hazard==='searchlight'?{...src,
   hazard:null,weather:'fog',label:labels.fog,
   detail:'Fog and low visibility. Searchlights have been retired.'}:src;
  return {...safe,time:0,flakCount:0,flakMarker:null,flakBursts:[],damageEvents:0};
 }
 const flakPoint=(index,W,H)=>({
  x:W*(.24+((index*7+3)%10)*.052),
  y:H-136-((index*3+2)%4)*15
 });
 function advance(env,dt,W,worldH,planes=[],onHit=()=>{}){
  if(!env||!(dt>0))return;
  const before=env.time;env.time+=dt;
  env.flakBursts=env.flakBursts.filter(b=>(b.age+=dt)<1.35);
  if(env.hazard==='flak'){
   const period=10,warningStart=7.3,detonateAt=9.2;
   const phase=env.time%period,cycle=Math.floor(env.time/period);
   env.flakMarker=phase>=warningStart&&phase<detonateAt?
    {...flakPoint(cycle,W,worldH),remaining:detonateAt-phase}:null;
   if(Math.floor((before-detonateAt)/period)!==Math.floor((env.time-detonateAt)/period)){
    const point=flakPoint(Math.floor((env.time-detonateAt)/period),W,worldH);
    env.flakCount++;
    // One physical hit region but a complete anti-aircraft salvo:
    // dark expanding smoke, orange flashes and secondary visual puffs.
    env.flakBursts.push({...point,age:0,radius:36,primary:true});
    for(const [dx,dy,delay,size] of [[-29,-17,.13,22],[32,16,.23,19],[9,-35,.34,16]])
     env.flakBursts.push({x:point.x+dx,y:point.y+dy,age:-delay,radius:size,primary:false});
    for(const p of planes)if(p?.alive&&p.spawnSafe<=0&&Math.hypot(p.x-point.x,p.y-point.y)<25+(p.d?.radius||6)){
     onHit(p,7,point.x,point.y,'FLAK');env.damageEvents++;
    }
   }
  }else env.flakMarker=null;
 }
 // Tapered, irregular cloud banks replace the old white oval/circle marks.
 // Layered ragged silhouettes and broken grey undersides sit over the original
 // sky painting without using radial ellipses or bright opaque white discs.
 function cloudBand(g,x,y,w,h,shade,opacity){
  g.save();g.globalAlpha=opacity;g.fillStyle=shade;
  g.beginPath();g.moveTo(x-w*.57,y+h*.28);
  g.bezierCurveTo(x-w*.45,y+h*.12,x-w*.42,y-h*.38,x-w*.26,y-h*.29);
  g.bezierCurveTo(x-w*.13,y-h*.70,x-w*.06,y-h*.52,x+w*.04,y-h*.28);
  g.bezierCurveTo(x+w*.17,y-h*.58,x+w*.28,y-h*.40,x+w*.34,y-h*.09);
  g.bezierCurveTo(x+w*.46,y-h*.17,x+w*.56,y+h*.18,x+w*.65,y+h*.22);
  g.lineTo(x+w*.30,y+h*.48);g.lineTo(x-w*.25,y+h*.52);
  g.closePath();g.fill();
  g.globalAlpha=opacity*.52;g.strokeStyle=shade;g.lineWidth=.85;
  g.beginPath();g.moveTo(x-w*.65,y+h*.67);
  g.bezierCurveTo(x-w*.28,y+h*.58,x+w*.07,y+h*.74,x+w*.58,y+h*.52);g.stroke();
  g.restore();
 }
 function drawBack(g,env,W,H){
  if(!env||env.weather==='clear')return;
  const t=env.time,storm=env.weather==='storm',fog=env.weather==='fog';
  g.save();g.beginPath();g.rect(0,31,W,H-31);g.clip();
  const bankCount=quality()==='mobile'?3:4;
  const windShift=storm?6.4:3.6;
  for(let i=0;i<bankCount;i++){
   const span=101+(i%3)*31;
   const x=((i*197+t*windShift)%(W+2*span))-span;
   const y=59+(i*41)%Math.max(74,H-107);
   const opacity=storm?.20:fog?.17:.14;
   cloudBand(g,x,y,span,14+(i%2)*7,
    storm?'#657782':fog?'#98a8a7':'#a9b8bb',opacity);
   if(i%2===0)cloudBand(g,x+span*.43,y+10,span*.7,9,
    storm?'#526771':'#879ca0',opacity*.55);
  }
  if(fog){g.globalAlpha=.15;g.fillStyle='#d3ddda';g.fillRect(0,34,W,H-34);}
  if(storm){
   const flash=Math.pow(Math.max(0,Math.sin(t*.64-1.25)),24);
   if(flash>.03){g.globalAlpha=flash*.10;g.fillStyle='#d4e2eb';g.fillRect(0,30,W,H-30);}
  }
  g.restore();
 }
 // Short wing-planform glimpse when the fuselage rolls. It is deliberately
 // painted BEHIND the approved aircraft art and shares the rendered transform.
 function drawBankWing(g,p){
  const bank=clamp(Number(p?.visualBank)||0,-1,1),amount=Math.abs(bank);
  if(amount<.13)return;
  const factor=(amount-.13)/.87;
  const span=p.role==='bomber'?29:p.role==='heavy'?24:18;
  const direction=bank<0?-1:1;
  const axis=direction*span*factor;
  const axisMinor=-axis*.40;
  const german=p.type?.startsWith('bf')||p.type==='he111';
  g.save();g.globalAlpha=.35+.44*factor;
  g.fillStyle=german?'#66736c':'#718279';
  g.strokeStyle=german?'#344644':'#405b52';g.lineWidth=.65;
  g.beginPath();g.moveTo(-4,-1.8);
  g.lineTo(-9.5,axis);g.lineTo(1.0,axis+direction*3.4*factor);
  g.lineTo(8,1.1);g.closePath();g.fill();g.stroke();
  g.globalAlpha=.40*factor;
  g.fillStyle='#bec6a9';g.beginPath();
  g.moveTo(-3,-1.5);g.lineTo(-7,axisMinor);g.lineTo(1.5,axisMinor+2*factor);
  g.lineTo(5,0);g.closePath();g.fill();
  g.restore();
 }
 function drawFront(g,env,W,H,cameraY=0){
  if(!env)return;
  const t=env.time,rain=env.weather==='rain'||env.weather==='storm';
  g.save();g.beginPath();g.rect(0,31,W,H-31);g.clip();
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
   if(b.age<0)continue;
   const progress=clamp(b.age/1.35,0,1),y=b.y-cameraY;
   if(y<20||y>H+42)continue;
   const grow=b.radius*(.35+progress*.93);
   const fade=Math.pow(1-progress,1.25);
   // Smoky, asymmetrical explosion: no bright white expanding circles.
   g.fillStyle='#303a3a';
   for(let i=0;i<7;i++){
    const a=(i*TAU/7)+b.x*.013;
    const r=grow*(.29+(i%3)*.11);
    g.globalAlpha=fade*(b.primary?.65:.49);
    g.beginPath();
    g.ellipse(b.x+Math.cos(a)*grow*.38,y+Math.sin(a)*grow*.31,
     r,r*(.62+(i%2)*.15),a*.21,0,TAU);g.fill();
   }
   if(progress<.27){
    const flash=(1-progress/.27)*(b.primary?.92:.62);
    g.globalAlpha=flash;g.fillStyle='#f6ae61';
    g.beginPath();g.arc(b.x,y,2+grow*.40,0,TAU);g.fill();
    g.fillStyle='#ffe4b0';g.globalAlpha=flash*.75;
    g.beginPath();g.arc(b.x,y,1.2+grow*.18,0,TAU);g.fill();
   }
   g.strokeStyle='#dda577';g.lineWidth=b.primary?1.2:.8;
   g.globalAlpha=fade*.72;
   g.beginPath();g.arc(b.x,y,grow*.78,.6,TAU-1.3);g.stroke();
   g.strokeStyle='#e4b37d';g.lineWidth=.9;g.globalAlpha=fade*(b.primary?.65:.40);
   g.beginPath();
   for(let j=0;j<11;j++){
    const a=j*TAU/11+b.x*.024,len=grow*(.58+(j%3)*.22);
    g.moveTo(b.x+Math.cos(a)*len*.72,y+Math.sin(a)*len*.72);
    g.lineTo(b.x+Math.cos(a)*len*1.08,y+Math.sin(a)*len*1.08);
   }
   g.stroke();
  }
  g.restore();
 }
 const api={forEncounter,forPreset,PRESETS,advanceBank,bankTarget,bankMatrix,drawBankWing,drawWindsock,
  create,advance,drawBack,drawFront,flakPoint,labels};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.WingmanFlightAtmosphere=api;
})(typeof window!=='undefined'?window:globalThis);

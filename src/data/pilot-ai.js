/* Wingman Phase 3 — predefined rival psychology and progressive combat proficiency.
   No randomness, no mutable roster identities, no stat advantage outside career. */
(()=>{'use strict';
 const TACTICS=Object.freeze({
  hunter:{label:'RELENTLESS HUNTER',style:'hunter',aggression:.85,evasion:.42,patience:.38,altitude:-10,ideal:85},
  duellist:{label:'CLOSE DOGFIGHTER',style:'duellist',aggression:.76,evasion:.55,patience:.62,altitude:0,ideal:72},
  sniper:{label:'PATIENT MARKSMAN',style:'sniper',aggression:.51,evasion:.43,patience:.95,altitude:-5,ideal:128},
  interceptor:{label:'HIGH-ALTITUDE INTERCEPTOR',style:'interceptor',aggression:.70,evasion:.58,patience:.80,altitude:-30,ideal:132},
  trickster:{label:'DECEPTIVE FLYER',style:'trickster',aggression:.60,evasion:.90,patience:.55,altitude:15,ideal:98},
  guardian:{label:'DEFENSIVE VETERAN',style:'guardian',aggression:.40,evasion:.87,patience:.72,altitude:0,ideal:104},
  survivor:{label:'ESCAPE ARTIST',style:'survivor',aggression:.48,evasion:.98,patience:.66,altitude:16,ideal:115},
  brawler:{label:'AGGRESSIVE BRAWLER',style:'brawler',aggression:.93,evasion:.36,patience:.30,altitude:8,ideal:68}
 });
 const MAP={
  daring:'duellist',stalwart:'guardian',scrappy:'brawler',evasive:'survivor',
  sharpshooter:'sniper',daredevil:'interceptor',trickster:'trickster',reckless:'brawler',
  tank:'guardian',balanced:'duellist',veteran:'guardian',endurance:'guardian',
  speedster:'interceptor',engineer:'survivor',defender:'guardian',acrobat:'duellist',
  hunter:'hunter',support:'guardian',precision:'sniper',brawler:'brawler',
  ironclad:'guardian',fox:'trickster',interceptor:'interceptor','escape artist':'survivor',
  bulwark:'guardian',ambusher:'trickster','night owl':'sniper',shadow:'survivor',
  thunder:'brawler',aristocrat:'duellist',ghost:'trickster',bombardier:'sniper',
  ambush:'trickster',mosquito:'survivor','dive queen':'interceptor','wild card':'brawler'
 };
 const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
 function resolvePilot(p){
  if(!p)return null;
  const registered=(window.WingmanRoster||[]).find(r=>r.id===p.id||r.id===p.rosterId);
  return registered||p;
 }
 function identity(p){
  const candidate=resolvePilot(p);
  if(!candidate)return null;
  const archetype=String(candidate.archetype||'Balanced');
  const tactic=MAP[archetype.toLowerCase()]||'duellist';
  const base=TACTICS[tactic];
  const a=candidate.attributes||{manoeuvrability:65,gunnery:65,engine:65};
  // Every pilot has a stable, distinct blend within their archetype:
  // aggressive brawlers are not interchangeable with equally aggressive aces.
  const aggression=clamp(base.aggression+(Number(a.engine||65)-65)*.002-(Number(a.gunnery||65)-65)*.001, .20,.98);
  const evasion=clamp(base.evasion+(Number(a.manoeuvrability||65)-65)*.002, .25,.99);
  const patience=clamp(base.patience+(Number(a.gunnery||65)-65)*.002, .20,.99);
  return {id:candidate.id,name:candidate.name,plane:candidate.plane,archetype,
   signature:candidate.signature||candidate.pilotSkill||'roll',
   attributes:{manoeuvrability:Number(a.manoeuvrability)||65,
    gunnery:Number(a.gunnery)||65,engine:Number(a.engine)||65},
   tactic,style:base.style,label:base.label,aggression,evasion,patience,
   altitude:base.altitude+(65-Number(a.engine||65))*.14,
   ideal:base.ideal+(65-Number(a.manoeuvrability||65))*.12};
 }
 function level(p,rank){
  const base=identity(p);
  if(!base)return null;
  const rung=clamp(Math.floor(Number(rank)||1),1,8);
  const progress=(rung-1)/7;
  // First rung: -13; final ace: +4; preserve all three relative strengths.
  const offset=-13+17*progress;
  const attributes=Object.fromEntries(Object.entries(base.attributes).map(([k,v])=>
    [k,Math.round(clamp(v+offset,35,95))]));
  return {...base,rank:rung,progress,attributes,
   reaction:clamp(.90-(progress*.75),.15,.90),
   lead:.20+progress*.72,
   skillChance:.24+progress*.70,
   aimTolerance:.11+progress*.14};
 }
 function describe(p,rank){
  const x=level(p,rank);
  return x?x.label+' · '+(x.rank>=7?'ELITE':x.rank>=4?'VETERAN':'ROOKIE'):'UNKNOWN';
 }
 window.WingmanPilotAI={identity,level,describe,TACTICS};
})();
/* Wingman v0.8 — King of the Skies mission variety and reward balancing.
   Pure data and deterministic route/reward logic. Existing save key and
   historical records remain authoritative in career.js. */
(function(root){
'use strict';
const MAX_SUPPLIES=12,MAX_EFFECTS=14,MAX_RANK=12;
const REGIONS=['CHANNEL DEFENCE','CONTINENTAL FRONT','THE FINAL PUSH'];
const UPGRADES=[
 {id:'reinforced-spars',name:'REINFORCED SPARS',detail:'+8% hull for the rest of this run',mods:{hull:.08}},
 {id:'armour-plates',name:'EXTRA ARMOUR',detail:'+10% armour for the rest of this run',mods:{armour:.10}},
 {id:'gunsmith',name:'GUNSMITH',detail:'+7% gun damage for the rest of this run',mods:{damage:.07}},
 {id:'supercharger',name:'SUPERCHARGER',detail:'+5% airspeed for the rest of this run',mods:{speed:.05}},
 {id:'control-rigging',name:'CONTROL RIGGING',detail:'+6% steering response for the rest of this run',mods:{turn:.06}},
 {id:'field-dressing',name:'FIELD DRESSING',detail:'Recover 35 aircraft condition now',condition:35},
 {id:'supply-cache',name:'SUPPLY CACHE',detail:'Collect 3 additional repair supplies',supplies:3}
];
// Premium modifications are only offered after successful HIGH-risk sorties.
const ELITE_UPGRADES=[
 {id:'ace-weapon-sights',name:'ACE WEAPON SIGHTS',detail:'+12% gun damage for the rest of the run',mods:{damage:.12},elite:true},
 {id:'combat-throttle',name:'COMBAT THROTTLE',detail:'+9% airspeed for the rest of the run',mods:{speed:.09},elite:true},
 {id:'reinforced-frame',name:'REINFORCED AIRFRAME',detail:'+14% hull for the rest of the run',mods:{hull:.14},elite:true},
 {id:'ace-control-cables',name:'ACE CONTROL CABLES',detail:'+11% handling for the rest of the run',mods:{turn:.11},elite:true},
 {id:'flak-armouring',name:'FLAK ARMOURING',detail:'+17% armour for the rest of the run',mods:{armour:.17},elite:true},
 {id:'ace-war-chest',name:'ACE WAR CHEST',detail:'Restore 20 aircraft condition and collect 5 repair supplies',condition:20,supplies:5,elite:true}
];
const SETBACKS=[
 {id:'engine-wear',name:'ENGINE WEAR',detail:'-5% speed until repaired',mods:{speed:-.05}},
 {id:'wing-strain',name:'WING STRAIN',detail:'-6% handling until repaired',mods:{turn:-.06}},
 {id:'sights-damaged',name:'DAMAGED SIGHTS',detail:'-6% gun damage until repaired',mods:{damage:-.06}}
];

// Each row is an encounter, not necessarily a fight. Four rungs per theatre.
// Rungs 4 and 8 include regional elite battles; 12 always ends in combat.
const NODE_LAYOUT=[
 ['combat','combat','combat'],['supply','combat','intel'],['combat','event','combat'],
 ['elite','elite','elite'],['shop','combat','dice'],['combat','intel','combat'],
 ['supply','combat','event'],['elite','elite','elite'],['shop','combat','intel'],
 ['combat','event','combat'],['supply','combat','dice'],['boss','boss','boss']
];
const EVENT_DESCRIPTIONS={
 supply:{mission:'FIELD SUPPLIES',label:'GROUND CREW',briefing:'The engineers have spare parts, fuel and a battered crate of equipment. Make the best of the stop.'},
 intel:{mission:'INTELLIGENCE BRIEFING',label:'OPERATIONS OFFICER',briefing:'Fresh reconnaissance reports reveal enemy activity. Choose how to use the intelligence.'},
 event:{mission:'MESS HALL EVENT',label:'SQUADRON MESS',briefing:'An unexpected decision awaits in the squadron mess. Fortune can favour the prepared.'},
 shop:{mission:'THE QUARTERMASTER',label:'AIRFIELD STORES',briefing:'Spend repair supplies for practical support, or keep what you have.'},
 dice:{mission:'DICE IN THE HANGAR',label:'HANGAR GAMBLERS',briefing:'The mechanics invite you to roll the bones. You can walk away or take a small gamble.'}
};
function regionForRank(rank){return REGIONS[Math.min(2,Math.floor((Math.max(1,rank)-1)/4))];}
function nodeTypeFor(rank,lane){return NODE_LAYOUT[Math.min(MAX_RANK,Math.max(1,rank))-1][Math.max(0,Math.min(2,lane))];}
function eventOptions(kind){
 switch(kind){
 case 'supply':return [
  {id:'patch',name:'REPAIR THE AIRFRAME',detail:'Restore 25% aircraft condition.'},
  {id:'crate',name:'COLLECT SPARE PARTS',detail:'Gain 3 repair supplies.'}];
 case 'intel':return [
  {id:'scout',name:'SCOUT THE FRONT',detail:'Collect 2 repair supplies from the reconnaissance cache.'},
  {id:'prepare',name:'PREPARE AN AMBUSH',detail:'Gain an upgraded gunsight for this run, or supplies if already fitted.'}];
 case 'shop':return [
  {id:'service',name:'FULL SERVICE · 2 SUPPLIES',detail:'Spend 2 supplies to restore 50% condition.'},
  {id:'guns',name:'GUNSMITH · 3 SUPPLIES',detail:'Spend 3 supplies to install +7% gun damage.'},
  {id:'leave',name:'LEAVE STORES',detail:'Keep your supplies and move on.'}];
 case 'dice':return [
  {id:'safe',name:'PASS THE DICE',detail:'Keep your supplies and continue.'},
  {id:'roll',name:'ROLL FOR A CRATE',detail:'Stake 1 supply: win 4 supplies, or lose the stake.'}];
 default:return [
  {id:'help',name:'HELP THE GROUND CREW',detail:'Earn 2 repair supplies.'},
  {id:'risk',name:'TEST A NEW ENGINE',detail:'Gain speed tuning, but the engine may suffer wear.'}];
 }
}
function resolveEvent(run,enc,optionId){
 normalizeRun(run);
 if(!enc?.isNonCombat||run.pendingReward||run.rank!==enc.rank)return null;
 const available=eventOptions(enc.nodeType);
 if(!available.some(x=>x.id===optionId))return null;
 const before={condition:run.condition,supplies:run.supplies,effects:[...run.effects]};
 const gain=(amount)=>{run.supplies=n(run.supplies+amount,0,MAX_SUPPLIES);};
 const repair=(amount)=>{run.condition=n(run.condition+amount,15,100);};
 const addEffect=(id)=>{if(byId[id]&&!run.effects.includes(id))run.effects.push(id);run.effects=run.effects.slice(-MAX_EFFECTS);};
 const kind=enc.nodeType;
 const gamble=hash(run.seed,run.rank,enc.lane,run.visits,optionId)%2===0;
 if(kind==='supply'){if(optionId==='patch')repair(25);else gain(3);}
 else if(kind==='intel'){if(optionId==='scout')gain(2);else if(!run.effects.includes('ace-weapon-sights'))addEffect('ace-weapon-sights');else gain(2);}
 else if(kind==='shop'){
  const cost=optionId==='service'?2:optionId==='guns'?3:0;
  if(run.supplies<cost)return null;
  if(cost)gain(-cost);
  if(optionId==='service')repair(50);
  if(optionId==='guns')addEffect('gunsmith');
 }else if(kind==='dice'){
  if(optionId==='roll'){if(run.supplies<1)return null;gain(gamble?4:-1);}
 }else if(kind==='event'){
  if(optionId==='help')gain(2);
  else {addEffect('supercharger');if(!gamble)addEffect('engine-wear');}
 }
 const result={
  rank:run.rank,kind,choice:optionId,mission:enc.mission,
  label:enc.label,description:available.find(o=>o.id===optionId)?.name||'EVENT COMPLETED',
  suppliesDelta:run.supplies-before.supplies,conditionDelta:run.condition-before.condition,
  newEffects:run.effects.filter(id=>!before.effects.includes(id))
 };
 run.lastEvent=result;
 run.eventHistory=Array.isArray(run.eventHistory)?run.eventHistory.slice(-23):[];
 run.eventHistory.push(result);
 return result;
}

const n=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const pick=(arr,seed)=>arr[(Math.abs(seed)>>>0)%arr.length];
const hash=(...v)=>{let x=2166136261;for(const value of v.join('|'))x=Math.imul(x^value.charCodeAt(0),16777619)>>>0;return x;};
const byId=Object.fromEntries([...UPGRADES,...ELITE_UPGRADES,...SETBACKS].map(v=>[v.id,v]));
function normalizeRun(run){
 if(!run)return null;
 run.supplies=n(run.supplies,0,MAX_SUPPLIES);
 run.condition=run.condition===undefined?100:n(run.condition,15,100);
 run.effects=Array.isArray(run.effects)?[...new Set(run.effects.filter(id=>typeof id==='string'&&byId[id]))].slice(-MAX_EFFECTS):[];
 if(run.pendingReward&&!Array.isArray(run.pendingReward.offers))run.pendingReward=null;
 return run;
}
function decorateEncounter(enc,run,lane,{pool=[],profile}={}){
 const rank=n(run.rank,1,MAX_RANK),final=rank===MAX_RANK;
 const kind=nodeTypeFor(rank,lane);
 const risk=lane===0?'LOW':lane===1?'MEDIUM':'HIGH';
 // Each row offers three genuinely distinct engagements. Every route still
 // uses the existing pilots and real flight physics, never decorative labels.
 if(!['combat','elite','boss'].includes(kind)){
  const e=EVENT_DESCRIPTIONS[kind];
  return Object.assign(enc,{rank,lane,nodeType:kind,isNonCombat:true,
   id:'event-'+rank+'-'+lane,label:e.label,mission:e.mission,briefing:e.briefing,
   objective:'event',risk:'EVENT',types:[],opponents:[],wingmen:[],timeLimit:0,
   eventOptions:eventOptions(kind),suppliesAward:0,rewardTier:0,threat:0,finalBoss:false,
   region:regionForRank(rank)});
 }
 const encounters=[
  ['patrol','duel','ace-hunt'],['intercept','duel','ace-hunt'],
  ['recon','ace-hunt','outnumbered'],['intercept','escort','outnumbered'],
  ['recon','duel','ace-hunt'],['intercept','ace-hunt','outnumbered'],
  ['recon','escort','outnumbered'],['intercept','ace-hunt','outnumbered'],
  ['recon','duel','ace-hunt'],['intercept','ace-hunt','outnumbered'],
  ['recon','escort','outnumbered'],['final','final','final']
 ];
 const objective=kind==='elite'?(lane===2?'outnumbered':'ace-hunt'):encounters[rank-1][lane];
 // Maintain the known real roster; don't create artificial pilots or replace art.
 if(objective==='intercept'){
   const type=run.faction==='Allies'?'he111':'bomber';
   const bomber=pool.find(p=>p.plane===type);
   if(bomber&&profile){
     const rival=profile(bomber);
     Object.assign(enc,{id:bomber.id,label:bomber.name,types:[type],
       opponents:[rival],wingman:null,wingmen:[],
       attributes:rival.attributes,signature:rival.signature,
       archetype:rival.archetype,personality:rival.personality});
   }
 }
 if(objective==='ace-hunt'){
   const fighter=pool.find(p=>p.plane===(run.faction==='Allies'?'bf109':'fighter'));
   if(fighter&&profile){
     const rival=profile(fighter);
     Object.assign(enc,{id:rival.id,label:rival.name,types:[rival.plane],
       opponents:[rival],wingman:null,wingmen:[],attributes:rival.attributes,
       signature:rival.signature,archetype:rival.archetype,personality:rival.personality});
   }
 }
 if(objective==='recon'){
   // A real defensive sortie against one pursuing fighter. Survive until
   // reconnaissance finishes, or shoot down the pursuer early.
   const pursuer=pool.find(p=>p.plane===(run.faction==='Allies'?'bf109':'fighter'));
   if(pursuer&&profile){
     const rival=profile(pursuer);
     Object.assign(enc,{id:rival.id,label:rival.name,types:[rival.plane],
       opponents:[rival],wingman:null,wingmen:[],attributes:rival.attributes,
       signature:rival.signature,archetype:rival.archetype,personality:rival.personality});
   }
 }
 if(objective==='outnumbered'&&enc.opponents.length===1&&profile){
   const spare=pool.find(p=>p.id!==enc.id&&p.plane!==enc.types[0]);
   if(spare){enc.opponents.push(profile(spare));enc.types=enc.opponents.map(p=>p.plane);enc.wingman=enc.opponents[1];}
 }
 if(objective==='escort'){
   const enemyFighter=pool.find(p=>p.plane===(run.faction==='Allies'?'bf109':'fighter'));
   const second=pool.find(p=>p.id!==enemyFighter?.id&&p.plane===(run.faction==='Allies'?'bf110':'heavy'));
   if(enemyFighter&&second&&profile){
     enc.opponents=[profile(enemyFighter),profile(second)];
     enc.types=enc.opponents.map(p=>p.plane);enc.id=enemyFighter.id;enc.label=enemyFighter.name;
   }
 }
 enc.lane=lane;enc.risk=risk;enc.objective=objective;enc.nodeType=kind;
 enc.region=regionForRank(rank);
 enc.mission=final?'FINAL SQUADRON':
   objective==='escort'?'BOMBER ESCORT':
   objective==='intercept'?'BOMBER INTERCEPTION':
   objective==='recon'?'RECONNAISSANCE RUN':
   objective==='ace-hunt'?'ACE HUNT':
   objective==='outnumbered'?'OUTNUMBERED PATROL':
   lane===1?'ACE DUEL':'SCOUT PATROL';
 enc.briefing=final?'Defeat both escorts and the named final ace before time expires.':
   objective==='escort'?'Protect your bomber until relief arrives, or defeat both attackers.':
   objective==='intercept'?'Destroy the enemy bomber before it escapes into cloud cover.':
   objective==='recon'?'Protect the reconnaissance aircraft: survive until the photographs are complete, or destroy the pursuer.':
   objective==='ace-hunt'?'Bring down a veteran fighter before the short intercept window closes.':
   objective==='outnumbered'?'Survive against two skilled pilots. Both must be defeated.':
   lane===1?'Win a determined one-on-one duel.':
   'Complete a lower-risk patrol. Rewards are modest and field setbacks are possible.';
 enc.timeLimit=final?(lane===2?145:lane===1?160:175):
   objective==='escort'?Math.max(65,79-rank*2):
   objective==='intercept'?Math.max(54,96-rank*4):
   objective==='recon'?Math.max(49,63-rank*2):
   objective==='ace-hunt'?Math.max(60,87-rank*3):
   objective==='outnumbered'?Math.max(97,126-rank*3):115;
 enc.escortType=objective==='escort'?(run.faction==='Allies'?'bomber':'he111'):null;
 enc.aiRank=n(Math.ceil(rank*8/MAX_RANK)+(lane===2?2:lane===1?1:0),1,8);
 enc.difficulty=enc.aiRank<=2?'rookie':enc.aiRank<=4?'standard':'ace';
 enc.suppliesAward=final?3:lane+1;
 enc.rewardTier=lane;
 enc.threat=threatRating(enc);
 return enc;
}
function threatRating(enc){
 // Planning estimate only, NOT a measured win probability.
 const opponents=enc.types?.length||1,rank=enc.aiRank||enc.rank||1;
 const task=enc.objective==='escort'?13:enc.objective==='ace-hunt'?14:
   enc.objective==='outnumbered'?10:enc.objective==='final'?17:
   enc.objective==='intercept'?5:enc.objective==='recon'?-13:0;
 return Math.max(10,Math.min(100,Math.round(9+rank*8.5+
   Math.max(0,opponents-1)*13+task+(enc.timeLimit<75&&enc.objective!=='recon'?7:0))));
}
function offerReward(run,encounter){
 normalizeRun(run);
 const lane=n(encounter?.lane,0,2);
 const seed=hash(run.seed,run.rank,run.visits,encounter?.id,lane);
 const available=UPGRADES.filter(u=>!run.effects.includes(u.id)||!u.mods);
 const premium=ELITE_UPGRADES.filter(u=>u.mods&&!run.effects.includes(u.id));
 const offers=[];
 if(lane===2)offers.push(premium.length?pick(premium,seed>>>2).id:'ace-war-chest');
 const target=lane===0?2:3;
 for(let i=0;i<target*3&&offers.length<target;i++){
  const pool=available.filter(u=>!offers.includes(u.id));
  if(!pool.length)break;
  offers.push(pick(pool,seed+i*1789+Math.imul(i,91)).id);
 }
 // Low risk still guarantees a useful choice; in 1/4 of easy sorties
 // the workshop uncovers a repairable mechanical problem on claiming it.
 const setback=lane===0&&seed%4===0?pick(SETBACKS,seed>>>5).id:null;
 return {rank:run.rank,encounterId:encounter?.id||'',risk:encounter?.risk||'LOW',
  offers,setback,claimed:false};
}
function claim(run,id){
 normalizeRun(run);
 const pending=run.pendingReward;
 if(!pending||!pending.offers.includes(id))return false;
 const reward=byId[id];if(!reward)return false;
 if(reward.mods){
   run.effects=run.effects.filter(e=>e!==id&&byId[e]?.mods);
   run.effects.push(id);
 }else{
   if(reward.condition)run.condition=n(run.condition+reward.condition,15,100);
   if(reward.supplies)run.supplies=n(run.supplies+reward.supplies,0,MAX_SUPPLIES);
 }
 // Easy-route drawback lasts until a repair; never silently overwrite perks.
 if(pending.setback&&!run.effects.includes(pending.setback))run.effects.push(pending.setback);
 run.effects=run.effects.slice(-MAX_EFFECTS);
 run.pendingReward=null;
 return true;
}
function repair(run){
 normalizeRun(run);
 if(run.pendingReward||run.supplies<2||run.condition>=100&&!run.effects.some(id=>SETBACKS.some(x=>x.id===id)))return false;
 run.supplies-=2;run.condition=n(run.condition+40,15,100);
 run.effects=run.effects.filter(id=>!SETBACKS.some(x=>x.id===id));
 return true;
}
function sortieBonuses(run,plane,preferred){
 normalizeRun(run);
 const m={hull:preferred?1.1:1,armour:preferred?1.1:1,damage:preferred?1.1:1,speed:1,turn:1};
 for(const id of run.effects){
  const perk=byId[id];if(!perk?.mods)continue;
  for(const [key,amount] of Object.entries(perk.mods))m[key]=(m[key]||1)+amount;
 }
 const condition=(100-run.condition)/100;
 m.hull-=condition*.17;m.armour-=condition*.22;
 for(const key of Object.keys(m))m[key]=n(m[key],key==='armour'?.68:.78,1.30);
 return m;
}
// Performance grade reflects the completed sortie, not a promise about
// difficulty. Tactical threat is a separate planning estimate.
function sortieGrade(won,encounter,summary={}){
 if(!won)return 'F';
 const integrity=n(summary.integrity??1,0,1);
 const remaining=n(summary.remainingSeconds??0,0,Math.max(1,encounter?.timeLimit||120));
 const pace=remaining/Math.max(1,encounter?.timeLimit||120);
 const quality=integrity*.72+pace*.28;
 return quality>=.85?'S':quality>=.68?'A':quality>=.48?'B':'C';
}
function settle(run,encounter,won,remaining=1){
 normalizeRun(run);
 const integrity=n(remaining,0,1);
 if(won){
  run.supplies=n(run.supplies+(encounter.suppliesAward||1),0,MAX_SUPPLIES);
  run.condition=n(run.condition-(integrity<.6?14:integrity<.85?7:3),15,100);
  run.pendingReward=offerReward(run,encounter);
 }else{
  run.condition=n(run.condition-22,15,100);
  run.pendingReward=null;
 }
 return run;
}
const api={MAX_RANK,REGIONS,NODE_LAYOUT,nodeTypeFor,regionForRank,eventOptions,resolveEvent,UPGRADES,ELITE_UPGRADES,SETBACKS,normalizeRun,decorateEncounter,threatRating,sortieGrade,offerReward,claim,repair,sortieBonuses,settle};
root.WingmanCampaign=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

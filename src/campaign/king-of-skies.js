/* Wingman v0.8 — King of the Skies mission variety and reward balancing.
   Pure data and deterministic route/reward logic. Existing save key and
   historical records remain authoritative in career.js. */
(function(root){
'use strict';
const MAX_SUPPLIES=12,MAX_EFFECTS=14;
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
 const rank=n(run.rank,1,8),final=rank===8;
 const risk=lane===0?'LOW':lane===1?'MEDIUM':'HIGH';
 // Each row offers three genuinely distinct engagements. Every route still
 // uses the existing pilots and real flight physics, never decorative labels.
 const encounters=[
  ['patrol','duel','ace-hunt'],
  ['intercept','duel','ace-hunt'],
  ['recon','ace-hunt','outnumbered'],
  ['intercept','escort','outnumbered'],
  ['recon','ace-hunt','outnumbered'],
  ['intercept','ace-hunt','outnumbered'],
  ['recon','escort','outnumbered'],
  ['final','final','final']
 ];
 const objective=encounters[rank-1][lane];
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
 enc.lane=lane;enc.risk=risk;enc.objective=objective;
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
 enc.aiRank=n(rank+(lane===2?2:lane===1?1:0),1,8);
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
const api={UPGRADES,ELITE_UPGRADES,SETBACKS,normalizeRun,decorateEncounter,threatRating,sortieGrade,offerReward,claim,repair,sortieBonuses,settle};
root.WingmanCampaign=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

/* Wingman v0.7 — King of the Skies campaign rules.
   Pure data and deterministic route/reward logic. Existing save key and
   historical records remain authoritative in career.js. */
(function(root){
'use strict';
const MAX_SUPPLIES=12;
const UPGRADES=[
 {id:'reinforced-spars',name:'REINFORCED SPARS',detail:'+8% hull for the rest of this run',mods:{hull:.08}},
 {id:'armour-plates',name:'EXTRA ARMOUR',detail:'+10% armour for the rest of this run',mods:{armour:.10}},
 {id:'gunsmith',name:'GUNSMITH',detail:'+7% gun damage for the rest of this run',mods:{damage:.07}},
 {id:'supercharger',name:'SUPERCHARGER',detail:'+5% airspeed for the rest of this run',mods:{speed:.05}},
 {id:'control-rigging',name:'CONTROL RIGGING',detail:'+6% steering response for the rest of this run',mods:{turn:.06}},
 {id:'field-dressing',name:'FIELD DRESSING',detail:'Recover 35 aircraft condition now',condition:35},
 {id:'supply-cache',name:'SUPPLY CACHE',detail:'Collect 3 additional repair supplies',supplies:3}
];
const SETBACKS=[
 {id:'engine-wear',name:'ENGINE WEAR',detail:'-5% speed until repaired',mods:{speed:-.05}},
 {id:'wing-strain',name:'WING STRAIN',detail:'-6% handling until repaired',mods:{turn:-.06}},
 {id:'sights-damaged',name:'DAMAGED SIGHTS',detail:'-6% gun damage until repaired',mods:{damage:-.06}}
];
const n=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const pick=(arr,seed)=>arr[(Math.abs(seed)>>>0)%arr.length];
const hash=(...v)=>{let x=2166136261;for(const value of v.join('|'))x=Math.imul(x^value.charCodeAt(0),16777619)>>>0;return x;};
const byId=Object.fromEntries([...UPGRADES,...SETBACKS].map(v=>[v.id,v]));
function normalizeRun(run){
 if(!run)return null;
 run.supplies=n(run.supplies,0,MAX_SUPPLIES);
 run.condition=run.condition===undefined?100:n(run.condition,15,100);
 run.effects=Array.isArray(run.effects)?run.effects.filter(id=>typeof id==='string'&&byId[id]).slice(-7):[];
 if(run.pendingReward&&!Array.isArray(run.pendingReward.offers))run.pendingReward=null;
 return run;
}
function decorateEncounter(enc,run,lane,{pool=[],profile}={}){
 const rank=n(run.rank,1,8),final=rank===8;
 const risk=lane===0?'LOW':lane===1?'MEDIUM':'HIGH';
 const objective=final?'final':lane===1&&rank>=4&&rank%3===1?'escort':
   lane===0&&rank>=2?'intercept':
   lane===2&&rank>=3?'outnumbered':'duel';
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
   objective==='outnumbered'?'OUTNUMBERED PATROL':
   lane===1?'ACE DUEL':'SCOUT PATROL';
 enc.briefing=final?'Destroy the escort fighters and the final named ace.':
   objective==='escort'?'Protect your allied bomber until relief arrives, or eliminate its attackers.':
   objective==='intercept'?'Shoot down the enemy bomber before it escapes.':
   objective==='outnumbered'?'Survive an outnumbered engagement and defeat both enemy pilots.':
   lane===1?'Win an aggressive duel against a skilled rival.':
   'Complete a cautious scouting engagement with uncertain rewards.';
 enc.timeLimit=final?165:objective==='escort'?65:
   objective==='intercept'?Math.max(54,91-rank*3):
   objective==='outnumbered'?112:115;
 enc.escortType=objective==='escort'?(run.faction==='Allies'?'bomber':'he111'):null;
 enc.aiRank=n(rank+(lane===2?2:lane===1?1:0),1,8);
 enc.difficulty=enc.aiRank<=2?'rookie':enc.aiRank<=4?'standard':'ace';
 enc.suppliesAward=final?3:lane+1;
 enc.rewardTier=lane;
 return enc;
}
function offerReward(run,encounter){
 normalizeRun(run);
 const lane=n(encounter?.lane,0,2);
 const seed=hash(run.seed,run.rank,run.visits,encounter?.id,lane);
 const available=UPGRADES.filter(u=>!run.effects.includes(u.id)||!u.mods);
 const picks=[];
 for(let i=0;i<3;i++){
  const pool=available.filter(u=>!picks.includes(u.id));
  if(!pool.length)break;
  picks.push(pick(pool,seed+i*1789+Math.imul(i,91)).id);
 }
 // Easy routes can surprise with a minor buff or a temporary mechanical
 // setback. Medium/hard routes always provide a beneficial choice.
 const setback=lane===0&&seed%4===0?pick(SETBACKS,seed>>>5).id:null;
 const guaranteed=picks.filter(id=>!SETBACKS.find(x=>x.id===id));
 return {rank:run.rank,encounterId:encounter?.id||'',risk:encounter?.risk||'LOW',
  offers:guaranteed.slice(0,lane===0?2:3),setback,claimed:false};
}
function claim(run,id){
 normalizeRun(run);
 const pending=run.pendingReward;
 if(!pending||!pending.offers.includes(id))return false;
 const reward=byId[id];if(!reward)return false;
 if(reward.mods){
   run.effects=run.effects.filter(e=>e!==id&&byId[e]?.mods);
   run.effects.push(id);
 }else if(reward.condition)run.condition=n(run.condition+reward.condition,15,100);
 else if(reward.supplies)run.supplies=n(run.supplies+reward.supplies,0,MAX_SUPPLIES);
 // Easy-route drawback lasts until a repair; never silently overwrite perks.
 if(pending.setback&&!run.effects.includes(pending.setback))run.effects.push(pending.setback);
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
const api={UPGRADES,SETBACKS,normalizeRun,decorateEncounter,offerReward,claim,repair,sortieBonuses,settle};
root.WingmanCampaign=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

/* Wingman Phase 10D — returning rivals and telegraphed multi-stage ace encounters.
   Pure campaign helpers. No aircraft, weapon, collision or flight-stat overrides. */
(function(root){
'use strict';
const n=value=>Math.max(0,Math.floor(Number(value)||0));
const played=record=>n(record?.wins)+n(record?.losses);
function selectReturningRival(pool,records={},rank=1,seed=0){
 if(!Array.isArray(pool)||rank<4)return null;
 const candidates=pool.filter(p=>played(records?.[p.id])>0).map(p=>{
  const r=records[p.id];
  // A pilot who actually beat us is a stronger nemesis than a repeat victim.
  const score=n(r.losses)*8+n(r.wins)*2+(r.lastResult==='LOSS'?4:0)+
    (r.lastRank&&r.lastRank<rank?1:0);
  return {p,score};
 });
 candidates.sort((a,b)=>b.score-a.score||
  ((String(a.p.id).length+seed)%7)-((String(b.p.id).length+seed)%7)||
  String(a.p.id).localeCompare(String(b.p.id)));
 return candidates[0]?.p||null;
}
function rivalryDetail(record){
 const wins=n(record?.wins),losses=n(record?.losses),total=wins+losses;
 if(!total)return null;
 return {encounters:total,wins,losses,
  title:losses>wins?'UNFINISHED BUSINESS':wins>losses?'REVENGE INBOUND':'OLD ADVERSARY',
  text:'Previous meetings: '+wins+(wins===1?' victory':' victories')+
    ', '+losses+' defeat'+(losses===1?'':'s')+'.'};
}
function bossPlanFor(enc){
 if(!enc||enc.isNonCombat||(!enc.eliteEncounter&&!enc.finalBoss))return null;
 if(enc.finalBoss)return {
  name:'FINAL ACE COMMANDER',pilotIndex:2,
  stages:[
   {id:1,name:'ESCORT SCREEN',hint:'Two escorts launch first. Survive the screen and prepare for their commander.'},
   {id:2,name:'COMMANDER ENGAGED',hint:'The named ace enters after the countdown or the loss of an escort.'},
   {id:3,name:'LAST STAND',hint:'Below half hull, the commander presses into closer, aggressive attacks.'}
  ]
 };
 if(enc.rank<=4)return{
  name:'CHANNEL ACE',pilotIndex:0,
  stages:[
   {id:1,name:'DOGFIGHT',hint:'The regional ace opens with balanced pursuit and defensive manoeuvres.'},
   {id:2,name:'SCISSOR COUNTER',hint:'Below 55% hull, the ace switches to tighter duelling tactics.'}
  ]
 };
 return {
  name:'CONTINENTAL ACE',pilotIndex:0,
  stages:[
   {id:1,name:'HIGH-ALTITUDE HUNT',hint:'Expect committed pursuit and vertical manoeuvres.'},
   {id:2,name:'CROSSING ATTACK',hint:'Below 55% hull, the ace adopts an intercept-focused tactic.'}
  ]
 };
}
function decorateEncounter(enc,records={}){
 if(!enc||enc.isNonCombat)return enc;
 const rival=rivalryDetail(records?.[enc.finalBoss?(enc.bossId||enc.id):enc.id]);
 if(rival){
  enc.returningRival=true;
  enc.rivalry=rival;
  if(enc.eliteEncounter||enc.finalBoss)
   enc.briefing+=' '+rival.title+': '+rival.text;
 }
 const plan=bossPlanFor(enc);
 if(plan){
  enc.bossPlan=plan;
  enc.tacticalMission=enc.finalBoss?'THREE-STAGE FINAL SHOWDOWN':'TWO-STAGE REGIONAL ACE';
  enc.missionGoal=enc.finalBoss?
    'Defeat the two escorts, then down the returning ace commander':
    enc.missionGoal;
 }
 return enc;
}
function phaseFor(enc,fliers=[]){
 const plan=enc?.bossPlan||bossPlanFor(enc);
 if(!plan||!Array.isArray(fliers))return null;
 const boss=fliers[plan.pilotIndex+1]; // index 0 is the player
 if(!boss)return {stage:1,pilotIndex:plan.pilotIndex,label:plan.stages[0].name};
 let stage=1;
 if(enc.finalBoss){
  if(boss.alive&&!boss.queued)stage=boss.health<=boss.d.hull*.45?3:2;
 }else if(boss.alive&&boss.health<=boss.d.hull*.55)stage=2;
 return {stage,pilotIndex:plan.pilotIndex,label:plan.stages[stage-1].name,
  hint:plan.stages[stage-1].hint};
}
function tacticFor(enc,stage){
 if(!enc||stage<2)return null;
 return enc.finalBoss?'brawler':enc.rank<=4?'duellist':'interceptor';
}
function recordResult(record,won,rank){
 if(!record||typeof record!=='object')return null;
 record.encounters=played(record); // Win/loss totals have already been updated.
 record.lastResult=won?'WIN':'LOSS';record.lastRank=n(rank);
 record.streak=won?Math.max(0,Number(record.streak)||0)+1:0;
 return {...rivalryDetail(record),lastResult:record.lastResult,rank:record.lastRank};
}
const api={selectReturningRival,rivalryDetail,bossPlanFor,decorateEncounter,phaseFor,tacticFor,recordResult};
root.WingmanBossRivalry=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

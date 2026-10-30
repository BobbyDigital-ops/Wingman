/* v0.8.0 King of the Skies — route and reward regression tests. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/campaign/king-of-skies.js');
const pool=Array.from({length:48},(_,i)=>{
 const type=['bf109','bf110','he111','fighter','heavy','bomber'][i%6];
 return {id:'rival-'+i,name:'Pilot '+i,plane:type,
  attributes:{manoeuvrability:75,gunnery:74,engine:76}};
});
const profile=p=>({...p,attributes:{...p.attributes}});
function mission(rank,lane,faction='Allies'){
 const enemies=pool.filter(p=>faction==='Allies'?
   ['bf109','bf110','he111'].includes(p.plane):
   ['fighter','heavy','bomber'].includes(p.plane));
 const lead=enemies[(rank+lane)%enemies.length];
 const final=rank===8;
 const raw={rank,id:lead.id,label:lead.name,types:[lead.plane],
  opponents:final?[profile(enemies[0]),profile(enemies[1]),profile(lead)]:[profile(lead)],
  finalBoss:final,wingmen:[],attributes:lead.attributes};
 const run=C.normalizeRun({faction,rank,visits:0,seed:8120,condition:100,supplies:0,effects:[]});
 return {run,enc:C.decorateEncounter(raw,run,lane,{pool:enemies,profile})};
}
test('each rank has three risk-ordered routes and meaningful objective variation',()=>{
 const low=['patrol','intercept','recon','intercept','recon','intercept','recon','final'];
 const med=['duel','duel','ace-hunt','escort','ace-hunt','ace-hunt','escort','final'];
 const high=['ace-hunt','ace-hunt','outnumbered','outnumbered','outnumbered','outnumbered','outnumbered','final'];
 for(let rank=1;rank<=8;rank++){
  const cases=[0,1,2].map(lane=>mission(rank,lane).enc);
  assert.deepEqual(cases.map(e=>e.objective),[low[rank-1],med[rank-1],high[rank-1]]);
  assert.deepEqual(cases.map(e=>e.risk),['LOW','MEDIUM','HIGH']);
  for(const enc of cases){
   assert.ok(enc.timeLimit>=49&&enc.timeLimit<=175);
   assert.ok(enc.aiRank>=rank&&enc.aiRank<=8);
   assert.ok(enc.threat>=10&&enc.threat<=100);
   assert.ok(enc.types.length>=1&&enc.types.length<=3);
  }
  if(rank!==8)assert.ok(cases[2].aiRank>=cases[0].aiRank);
 }
});
test('mission variants for both factions use real expected aircraft',()=>{
 for(const faction of ['Allies','Axis']){
  const bomber=mission(4,0,faction).enc;
  assert.equal(bomber.objective,'intercept');
  assert.equal(bomber.types[0],faction==='Allies'?'he111':'bomber');
  const escort=mission(4,1,faction).enc;
  assert.equal(escort.objective,'escort');
  assert.equal(escort.escortType,faction==='Allies'?'bomber':'he111');
  assert.equal(escort.types.length,2);
  const recon=mission(5,0,faction).enc;
  assert.equal(recon.objective,'recon');
  assert.equal(recon.types[0],faction==='Allies'?'bf109':'fighter');
  const hunt=mission(5,1,faction).enc;
  assert.equal(hunt.objective,'ace-hunt');
  assert.equal(hunt.types[0],faction==='Allies'?'bf109':'fighter');
  const two=mission(6,2,faction).enc;
  assert.equal(two.objective,'outnumbered');
  assert.equal(two.types.length,2);
 }
});
test('high-risk wins offer exclusive elite modifications; low routes do not',()=>{
 const owned=new Set(C.ELITE_UPGRADES.map(x=>x.id));
 assert.equal(owned.size,6);
 for(let rank=1;rank<=7;rank++){
  for(let lane=0;lane<3;lane++){
   const {run,enc}=mission(rank,lane);
   C.settle(run,enc,true,.68);
   const prize=run.pendingReward;
   assert.ok(prize?.offers?.length>=2);
   assert.equal(prize.offers.some(x=>owned.has(x)),lane===2);
   assert.equal(prize.offers.length,lane===0?2:3);
   const id=prize.offers[0];
   assert.ok(C.claim(run,id));
   assert.equal(C.claim(run,id),false);
   const simulatedSave=JSON.parse(JSON.stringify(run));
   assert.equal(simulatedSave.pendingReward,null);
  }
 }
});
test('performance grades reflect surviving health and speed, not mission risk',()=>{
 const enc=mission(4,1).enc;
 assert.equal(C.sortieGrade(false,enc,{integrity:1,remainingSeconds:enc.timeLimit}),'F');
 assert.equal(C.sortieGrade(true,enc,{integrity:1,remainingSeconds:enc.timeLimit}),'S');
 assert.equal(C.sortieGrade(true,enc,{integrity:.5,remainingSeconds:0}),'C');
});
test('all saved elite perks survive migration, remain bounded, and repair setbacks',()=>{
 const run=C.normalizeRun({rank:7,supplies:6,condition:68,
  effects:[...C.ELITE_UPGRADES.filter(x=>x.mods).map(x=>x.id),'engine-wear','wing-strain']});
 assert.equal(run.effects.length,7);
 const m=C.sortieBonuses(run,'fighter',true);
 for(const [key,value] of Object.entries(m))assert.ok(value>=.68&&value<=1.3,key);
 assert.equal(C.repair(run),true);
 assert.equal(run.condition,100);
 assert.equal(run.supplies,4);
 assert.ok(!run.effects.includes('wing-strain')&&!run.effects.includes('engine-wear'));
 assert.equal(run.effects.filter(x=>C.ELITE_UPGRADES.some(y=>y.id===x&&y.mods)).length,5);
});
test('after every elite upgrade is owned the war chest remains useful',()=>{
 const run=C.normalizeRun({rank:7,visits:17,seed:8,supplies:1,condition:53,
  effects:C.ELITE_UPGRADES.filter(x=>x.mods).map(x=>x.id)});
 const encounter=mission(7,2).enc;
 const pending=C.offerReward(run,encounter);
 assert.equal(pending.offers[0],'ace-war-chest');
 run.pendingReward=pending;
 assert.equal(C.claim(run,'ace-war-chest'),true);
 assert.equal(run.supplies,6);
 assert.equal(run.condition,73);
 assert.equal(run.effects.filter(id=>C.ELITE_UPGRADES.some(x=>x.id===id&&x.mods)).length,5);
});

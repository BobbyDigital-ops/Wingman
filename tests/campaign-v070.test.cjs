/* Wingman v0.7 — campaign regression suite. Run with node --test. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const C=require('../src/campaign/king-of-skies.js');
const roster=Array.from({length:30},(_,i)=>{
 const type=['bf109','bf110','he111','fighter','heavy','bomber'][i%6];
 return {id:'pilot-'+i,name:'Pilot '+i,plane:type,attributes:{gunnery:70,manoeuvrability:68,engine:67}};
});
const profile=p=>({...p});
function mission(rank,lane,faction='Allies'){
 const enemy=roster.filter(p=>faction==='Allies'?p.plane.startsWith('bf')||p.plane==='he111':!p.plane.startsWith('bf')&&p.plane!=='he111');
 const rival=enemy[lane];
 const run=C.normalizeRun({rank,seed:1471,visits:rank,faction});
 const q={id:rival.id,label:rival.name,rank,types:[rival.plane],opponents:[profile(rival)],
  finalBoss:rank===8,wingmen:[],mission:'DOGFIGHT',attributes:rival.attributes};
 return {run,enc:C.decorateEncounter(q,run,lane,{pool:enemy,profile})};
}
test('24 deterministic branching encounters across all eight ranks',()=>{
 const kinds=new Set(),risks=new Set();
 for(let rank=1;rank<=8;rank++)for(let lane=0;lane<3;lane++){
  const {enc}=mission(rank,lane);
  assert.equal(enc.rank,rank);
  assert.ok(['LOW','MEDIUM','HIGH'].includes(enc.risk));
  assert.ok(enc.aiRank>=rank&&enc.aiRank<=8);
  assert.ok(enc.timeLimit>=54);
  assert.ok(enc.types.length>=1&&enc.types.length<=3);
  assert.equal(enc.suppliesAward,rank===8?3:lane+1);
  assert.equal(enc.objective==='final',rank===8);
  kinds.add(enc.objective);risks.add(enc.risk);
 }
 assert.deepEqual([...risks].sort(),['HIGH','LOW','MEDIUM']);
 for(const name of ['duel','intercept','outnumbered','escort','final'])assert.ok(kinds.has(name));
});
test('real bomber interception and escort compositions exist for both factions',()=>{
 for(const faction of ['Allies','Axis']){
  const b=mission(3,0,faction).enc;
  assert.equal(b.objective,'intercept');
  assert.equal(b.types[0],faction==='Allies'?'he111':'bomber');
  const e=mission(4,1,faction).enc;
  assert.equal(e.objective,'escort');
  assert.equal(e.types.length,2);
  assert.equal(e.escortType,faction==='Allies'?'bomber':'he111');
 }
});
test('old runs migrate without losing rank/lives and rewards are claimed once',()=>{
 const run={rank:3,lives:2,seed:111,visits:2};
 C.normalizeRun(run);
 assert.equal(run.rank,3);assert.equal(run.lives,2);
 assert.equal(run.condition,100);assert.equal(run.supplies,0);
 C.settle(run,{lane:2,risk:'HIGH',id:'pilot-1',suppliesAward:3},true,.54);
 assert.equal(run.supplies,3);
 assert.equal(run.condition,86);
 assert.equal(run.pendingReward.offers.length,3);
 const reward=run.pendingReward.offers[0];
 assert.equal(C.claim(run,reward),true);
 assert.equal(C.claim(run,reward),false);
 assert.equal(run.pendingReward,null);
 const bonuses=C.sortieBonuses(run,'fighter',true);
 for(const prop of ['hull','armour','damage','speed','turn']){
  assert.ok(bonuses[prop]>=.68&&bonuses[prop]<=1.30);
 }
 assert.equal(C.repair(run),true);
 assert.equal(run.condition,100);
 assert.equal(run.supplies,1);
 assert.equal(C.repair(run),false);
});
test('losses damage aircraft condition without deleting permanent run upgrades',()=>{
 const run=C.normalizeRun({condition:90,supplies:0,effects:['gunsmith'],rank:5,seed:123});
 C.settle(run,{lane:0,id:'pilot-2'},false,.3);
 assert.equal(run.condition,68);
 assert.deepEqual(run.effects,['gunsmith']);
 assert.equal(run.pendingReward,null);
 assert.equal(C.claim(run,'gunsmith'),false);
});
test('campaign escort and bomber deadline objectives run in real game engine',()=>{
 const root=path.resolve(__dirname,'..'),load=p=>fs.readFileSync(path.join(root,p),'utf8');
 const {runAI}=require('./ai-behaviour.cjs');
 const report=runAI({game:load('game.js'),physics:load('src/physics/swoop-flight.js'),
  aircraft:load('src/art/aircraft.js'),scenery:load('src/art/scenery.js')},
  {seconds:1,reps:1,scenarios:['duel'],difficulty:'standard',campaignCheck:true});
 assert.deepEqual(report.campaignChecks,{escortPresent:true,escortSurvived:true,escortLost:true,interceptionDeadline:true,campaignBonusesApplied:true,noFriendlyFire:true});
 assert.equal(report.groundCrashes,0);
});

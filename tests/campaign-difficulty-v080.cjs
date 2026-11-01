/* Wingman Phase 10E — real-engine campaign audit (both nations, all airframes).
 * npm run campaign:benchmark
 * This is a reproducible AI test pilot, NOT a human win-rate prediction.
 * Uses approved physics, campaign mission doctrine, pilot skills and boss
 * stage transitions with identical seeded trials for each airframe.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const rosterRoot={};
new Function('window',read('src/data/pilot-roster.js'))(rosterRoot);
const balance=require('../src/campaign/combat-balance.js');
const C=require('../src/campaign/king-of-skies.js');
const B=require('../src/campaign/boss-rivalry.js');
const {runAI}=require('./ai-behaviour.cjs');
const roster=rosterRoot.WingmanRoster;
const profile=p=>({...p,attributes:{...p.attributes},personality:'hunter'});
const scenarios=[];
for(const faction of ['Allies','Axis']){
 const pool=roster.filter(p=>p.faction!==faction);
 const crafts=faction==='Allies'?['fighter','heavy','bomber']:['bf109','bf110','he111'];
 for(let rank=1;rank<=12;rank++)for(let lane=0;lane<3;lane++){
  const run={faction,rank,visits:0,seed:13071,condition:100,supplies:0,effects:[]};
  const p=pool[(rank*3+lane)%pool.length],lead=profile(p),final=rank===12;
  const duo=!final&&rank>=3&&lane===2&&rank%2===1;
  const opponents=final?[
    profile(pool[(rank+lane*3+1)%pool.length]),
    profile(pool[(rank+lane*3+6)%pool.length]),lead
  ]:duo?[lead,profile(pool[(rank+lane+5)%pool.length])]:[lead];
  const raw={id:p.id,label:p.name,rank,types:opponents.map(x=>x.plane),
    opponents,finalBoss:final,wingmen:final?opponents.slice(0,2):[],
    wingman:duo?opponents[1]:null,attributes:lead.attributes,
    signature:lead.signature,archetype:lead.archetype,
    personality:'hunter',arena:rank%4};
  const enc=C.decorateEncounter(raw,run,lane,{pool,profile});
  if(enc.isNonCombat)continue;
  B.decorateEncounter(enc,{});
  for(const playerType of crafts)scenarios.push({
   ...enc,playerType,playerFaction:faction,
   // Fresh input structure every time; the live simulation owns mutation.
   opponents:enc.opponents.map(p=>({...p})),
   types:[...enc.types],
   reinforcements:enc.reinforcements.map(w=>({...w}))
  });
 }
}
const result=runAI({
 game:read('game.js'),
 physics:read('src/physics/swoop-flight.js'),
 aircraft:read('src/art/aircraft.js'),
 scenery:read('src/art/scenery.js'),
 roster:read('src/data/pilot-roster.js'),
 pilotAI:read('src/data/pilot-ai.js'),
 missionDoctrine:read('src/ai/mission-doctrine.js'),
 bossRivalry:read('src/campaign/boss-rivalry.js'),
 combatBalance:read('src/campaign/combat-balance.js')
},{reps:1,seconds:1,scenarios:['duel'],difficulty:'standard',
 campaignCheck:true,campaignScenarios:scenarios});
const rows=result.campaignBenchmark;
const round=n=>Math.round(n*100)/100;
const summary=entries=>({
 missions:entries.length,
 scriptedPilotWinPct:entries.length?Math.round(entries.reduce((n,x)=>n+x.winRate,0)/entries.length):null,
 averageRemainingIntegrity:entries.length?round(entries.reduce((n,x)=>n+x.avgIntegrity,0)/entries.length):null,
 groundCrashes:entries.reduce((n,x)=>n+x.crashes,0),
 commanderArrivalPct:entries.some(x=>x.bossStages===3)?
  Math.round(entries.flatMap(x=>x.samples).filter(s=>s.commanderEntered).length/
   entries.flatMap(x=>x.samples).length*100):null
});
const byRisk=Object.fromEntries(['LOW','MEDIUM','HIGH'].map(k=>[k,summary(rows.filter(x=>x.risk===k))]));
const byRegion=Object.fromEntries(C.REGIONS.map(k=>[k,summary(rows.filter(x=>C.regionForRank(x.rank)===k))]));
const byRank=Object.fromEntries(Array.from({length:12},(_,i)=>[i+1,summary(rows.filter(x=>x.rank===i+1))]));
const byAircraft=Object.fromEntries(['fighter','heavy','bomber','bf109','bf110','he111']
 .map(k=>[k,summary(rows.filter(x=>x.playerType===k))]));
const milestones=[4,8,12].map(rank=>({
 rank,byLane:Object.fromEntries([0,1,2].map(lane=>[lane,summary(rows.filter(x=>x.rank===rank&&x.lane===lane))])),
 phaseVisits:Object.fromEntries([1,2,3].map(stage=>[stage,rows.filter(x=>x.rank===rank)
  .flatMap(x=>x.samples).filter(s=>s.maxBossStage>=stage).length]))
}));
const audit={
 description:'Identical scripted AI pilot (no campaign upgrades) across both factions and all six aircraft. Two deterministic trials per COMBAT mission. NOT a human win-rate estimate.',
 phase:'10E',totalRungs:12,combatRoutes:rows.length,nonCombatRoutesPerFaction:10,
 trials:rows.reduce((n,x)=>n+x.samples.length,0),
 byRisk,byRegion,byRank,byAircraft,milestones,
 objectiveChecks:result.campaignChecks,
 missions:rows
};
console.log(JSON.stringify(audit,null,2));
if(rows.length!==156||audit.trials!==312||rows.some(x=>x.crashes>0)||
 Object.values(result.campaignChecks).some(x=>!x)||
 rows.some(x=>x.samples.length!==2)||
 scenarios.some(x=>(x.eliteEncounter||x.finalBoss)&&!x.bossPlan))process.exitCode=1;

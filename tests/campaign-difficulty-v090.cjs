#!/usr/bin/env node
/* Phase 9B: production-engine campaign benchmark, not a human difficulty rating.
   Examples:
     node tests/campaign-difficulty-v090.cjs --aircraft=fighter
     node tests/campaign-difficulty-v090.cjs --aircraft=all --faction=all --output=/tmp/wingman-balance.json
*/
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const window={};
new Function('window',read('src/data/pilot-roster.js'))(window);
new Function('window',read('src/data/pilot-ai.js'))(window);
const C=require('../src/campaign/king-of-skies.js');
const {runAI}=require('./ai-behaviour.cjs');
const opts=Object.fromEntries(process.argv.slice(2).map(s=>s.replace(/^--/,'').split('=')));
const factions=opts.faction==='all'?['Allies','Axis']:[opts.faction==='Axis'?'Axis':'Allies'];
const aircraft={
 Allies:['fighter','heavy','bomber'],Axis:['bf109','bf110','he111']
};
const planes=opts.aircraft==='all'?null:(opts.aircraft||'fighter').split(',');
const selectedRanks=opts.ranks?opts.ranks.split(',').map(Number):Array.from({length:C.MAX_RANK},(_,i)=>i+1);
const scenarios=[],nonCombat=[];
for(const faction of factions){
 const pool=window.WingmanRoster.filter(p=>p.faction===(faction==='Allies'?'Axis':'Allies'));
 const profile=(p,rank)=>{
  const scaled=window.WingmanPilotAI.level(p,rank);
  return {...p,attributes:scaled.attributes,signature:scaled.signature,personality:scaled.tactic};
 };
 for(const rank of selectedRanks)for(let lane=0;lane<3;lane++){
  assert.ok(rank>=1&&rank<=C.MAX_RANK,'Invalid rank');
  const run={faction,rank,seed:13071,visits:rank*2,condition:100,supplies:3,effects:[]};
  const lead=pool[(rank*3+lane)%pool.length];
  const final=rank===C.MAX_RANK;
  const duo=!final&&rank>=3&&lane===2&&rank%2===1;
  const available=pool.filter(p=>p.id!==lead.id);
  const second=available.find(p=>p.plane!==lead.plane)||available[0];
  const third=available.find(p=>p.id!==second.id&&p.plane!==second.plane)||available[1];
  const opponents=final?[profile(second,rank),profile(third,rank),profile(lead,rank)]:
    duo?[profile(lead,rank),profile(second,rank)]:[profile(lead,rank)];
  const raw={id:lead.id,label:lead.name,rank,types:opponents.map(p=>p.plane),
   opponents,finalBoss:final,wingman:duo?opponents[1]:null,
   wingmen:final?opponents.slice(0,2):[],attributes:opponents[0].attributes,
   signature:opponents[0].signature,personality:opponents[0].personality};
  const enc=C.decorateEncounter(raw,run,lane,{pool,profile:p=>profile(p,rank)});
  if(enc.isNonCombat){nonCombat.push({rank,lane,type:enc.nodeType,faction});continue;}
  for(const type of aircraft[faction].filter(p=>!planes||planes.includes(p))){
   scenarios.push({...enc,playerType:type,faction});
  }
 }
}
assert.ok(scenarios.length,'No combat scenarios selected');
const result=runAI({
 game:read('game.js'),physics:read('src/physics/swoop-flight.js'),
 aircraft:read('src/art/aircraft.js'),scenery:read('src/art/scenery.js'),
 roster:read('src/data/pilot-roster.js'),pilotAI:read('src/data/pilot-ai.js')
},{reps:1,seconds:1,scenarios:['duel'],difficulty:'standard',
  campaignCheck:true,campaignScenarios:scenarios});
const battles=result.campaignBenchmark;
const group=(key)=>{
 const names=[...new Set(battles.map(key))];
 return Object.fromEntries(names.map(name=>{
  const sub=battles.filter(b=>key(b)===name);
  return [name,{missions:sub.length,attempts:sub.reduce((n,b)=>n+b.samples.length,0),
   scriptedWinPct:Math.round(sub.reduce((n,b)=>n+b.winRate,0)/sub.length),
   avgIntegrity:+(sub.reduce((n,b)=>n+b.avgIntegrity,0)/sub.length).toFixed(2),
   avgTimeSeconds:+(sub.reduce((n,b)=>n+b.avgSeconds,0)/sub.length).toFixed(1),
   crashes:sub.reduce((n,b)=>n+b.crashes,0)
  }];
 }));
};
const report={
 disclaimer:'Scripted AI test pilot using the real Wingman engine, not a human win probability or automatic balance pass.',
 metadata:{factions,ranks:selectedRanks,aircraft:opts.aircraft||'fighter',
  combatMissions:battles.length,nonCombatNodes:nonCombat.length,attempts:battles.length*2},
 byRegion:group(x=>x.region),byRisk:group(x=>x.risk),
 byAircraft:group(x=>x.playerType),byRank:group(x=>x.rank),
 objectiveChecks:result.campaignChecks,
 skippedNonCombat:nonCombat,missions:battles
};
if(opts.output)fs.writeFileSync(opts.output,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
assert.equal(battles.length,scenarios.length);
assert.ok(battles.every(b=>b.samples.length===2&&Number.isFinite(b.avgIntegrity)));
assert.ok(Object.values(result.campaignChecks).every(Boolean),'Campaign objectives failed');
if(battles.some(b=>b.crashes>0))console.warn('AI ground crashes observed; inspect mission breakdown.');

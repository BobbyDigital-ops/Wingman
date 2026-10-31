/* v0.8: deterministic campaign difficulty benchmark using the real engine.
 * Command: npm run campaign:benchmark
 * Estimates how an identical scripted test pilot fares on each route.
 * These results are NOT human win probabilities or difficulty guarantees.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const window={};
new Function('window',read('src/data/pilot-roster.js'))(window);
const C=require('../src/campaign/king-of-skies.js');
const {runAI}=require('./ai-behaviour.cjs');
const roster=window.WingmanRoster,pool=roster.filter(p=>p.faction==='Axis');
const profile=p=>({...p,attributes:{...p.attributes},personality:'hunter'});
const scenarios=[];
for(let rank=1;rank<=12;rank++)for(let lane=0;lane<3;lane++){
 const run={faction:'Allies',rank,visits:0,seed:13071,condition:100,supplies:0,effects:[]};
 const p=pool[(rank*3+lane)%pool.length],lead=profile(p),final=rank===12;
 const duo=!final&&rank>=3&&lane===2&&rank%2===1;
 const opponents=final?[
   profile(pool[(rank+lane*3+1)%pool.length]),
   profile(pool[(rank+lane*3+6)%pool.length]),lead
 ]:duo?[lead,profile(pool[(rank+lane+5)%pool.length])]:[lead];
 const raw={id:p.id,label:p.name,rank,types:opponents.map(x=>x.plane),
   opponents,finalBoss:final,wingmen:final?opponents.slice(0,2):[],
   wingman:duo?opponents[1]:null,attributes:lead.attributes,signature:lead.signature,
   archetype:lead.archetype,personality:'hunter',arena:rank%4};
 const enc=C.decorateEncounter(raw,run,lane,{pool,profile});
 if(!enc.isNonCombat)scenarios.push(enc);
}
const result=runAI({
 game:read('game.js'),
 physics:read('src/physics/swoop-flight.js'),
 aircraft:read('src/art/aircraft.js'),
 scenery:read('src/art/scenery.js'),
 roster:read('src/data/pilot-roster.js'),
 pilotAI:read('src/data/pilot-ai.js')
},{reps:1,seconds:1,scenarios:['duel'],difficulty:'standard',
   campaignCheck:true,campaignScenarios:scenarios});
const byRisk=Object.fromEntries(['LOW','MEDIUM','HIGH'].map(risk=>{
 const entries=result.campaignBenchmark.filter(x=>x.risk===risk);
 return [risk,{
  missions:entries.length,
  scriptedPilotWinPct:Math.round(entries.reduce((n,x)=>n+x.winRate,0)/entries.length),
  averageRemainingIntegrity:Number((entries.reduce((n,x)=>n+x.avgIntegrity,0)/entries.length).toFixed(2)),
  crashes:entries.reduce((n,x)=>n+x.crashes,0)
 }];
}));
const byRegion=Object.fromEntries(C.REGIONS.map(region=>{
 const entries=result.campaignBenchmark.filter(x=>C.regionForRank(x.rank)===region);
 return [region,{missions:entries.length,scriptedPilotWinPct:entries.length?Math.round(entries.reduce((a,m)=>a+m.winRate,0)/entries.length):null}];
}));
const report={description:'Identical scripted AI pilot with no campaign upgrades; two deterministic attempts per COMBAT mission. NOT human win probability.',
 totalRungs:12,nonCombatRoutes:36-scenarios.length,byRisk,byRegion,missions:result.campaignBenchmark,objectiveChecks:result.campaignChecks};
console.log(JSON.stringify(report,null,2));
if(!result.campaignBenchmark.length||
 result.campaignBenchmark.some(x=>x.samples.length!==2)||
 result.campaignBenchmark.some(x=>x.crashes>0)||
 Object.values(result.campaignChecks).some(x=>!x))process.exitCode=1;

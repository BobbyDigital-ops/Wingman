/* Phase 10A/B — tactical roles, protected objectives and mission variety. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const tactics=require('../src/ai/mission-doctrine.js');
const campaign=require('../src/campaign/king-of-skies.js');
const rosterWin={};
new Function('window',read('src/data/pilot-roster.js'))(rosterWin);
const pool=rosterWin.WingmanRoster.filter(p=>p.faction==='Axis');
function mission(rank,lane){
 const p=pool[(rank+lane)%pool.length],run={rank,faction:'Allies',seed:83,visits:0,condition:100,supplies:3,effects:[]};
 const fighter={...p,attributes:{...p.attributes}};
 return campaign.decorateEncounter(
  {id:p.id,label:p.name,rank,types:[p.plane],opponents:[fighter]},
  run,lane,{pool,profile:q=>({...q,attributes:{...q.attributes}})});
}
test('three themed regions retain the single final boss and valid mission counts',()=>{
 assert.equal(campaign.MAX_RANK,12);
 assert.deepEqual(campaign.reachableLanes(2,12),[1]);
 for(let rank=1;rank<=12;rank++)for(let lane=0;lane<=2;lane++){
  const enc=mission(rank,lane);
  assert.equal(enc.rank,rank);
  assert.equal(enc.region,campaign.REGIONS[Math.floor((rank-1)/4)]);
  if(!enc.isNonCombat)assert.ok(enc.types.length>=1&&enc.types.length<=3);
 }
});
test('formation and escape encounters have genuine marked targets and clear orders',()=>{
 const early=mission(3,1),formation=mission(9,1),late=mission(10,1);
 assert.equal(early.objective,'escape-artist');
 assert.equal(early.types.length,2);
 assert.equal(formation.objective,'formation-break');
 assert.equal(formation.types.length,3);
 assert.equal(late.objective,'escape-artist');
 assert.equal(late.types.length,2);
 for(const enc of [early,formation,late]){
  assert.equal(enc.priorityTargetIndex,0);
  assert.match(enc.missionGoal,/marked|leader|ace/i);
  assert.match(enc.briefing,/escort|wingmen|marked/i);
  assert.ok(enc.timeLimit>50);
 }
 assert.equal(late.reinforcements[0].at,42);
});
test('tactical doctrine assigns different aircraft roles without stat cheats',()=>{
 assert.deepEqual([0,1,2].map(i=>tactics.roleFor('formation-break',i)),['leader','guard','guard']);
 assert.deepEqual([0,1].map(i=>tactics.roleFor('escape-artist',i)),['escapeAce','screen']);
 assert.deepEqual([0,1].map(i=>tactics.roleFor('intel-hunt',i)),['runner','screen']);
 assert.deepEqual([0,1].map(i=>tactics.roleFor('escort',i)),['interceptor','hunter']);
 assert.equal(tactics.roleFor('final',2,{finalBoss:true}),'boss');
});
test('only the marked target ends the mission; failing the deadline costs a life',()=>{
 const enc=mission(9,1),hero={id:0,team:0,alive:true};
 const lead={id:1,team:1,alive:true,priorityObjective:true},guards=[
  {id:2,team:1,alive:true},{id:3,team:1,alive:true}];
 assert.equal(tactics.priorityDecision(enc,[hero,lead,...guards],42),null);
 guards.forEach(q=>q.alive=false);
 assert.equal(tactics.priorityDecision(enc,[hero,lead,...guards],42),null);
 lead.alive=false;
 assert.equal(tactics.priorityDecision(enc,[hero,lead,...guards],42),0);
 lead.alive=true;
 assert.equal(tactics.priorityDecision(enc,[hero,lead,...guards],0),1);
 hero.alive=false;
 assert.equal(tactics.priorityDecision(enc,[hero,lead,...guards],22),1);
});
test('enemy screens guard key aircraft while escort interceptors hunt the friendly bomber',()=>{
 const attacker={id:1,team:1,alive:true,aiRole:'interceptor',x:0,y:0};
 const hero={id:0,team:0,alive:true,x:10,y:10};
 const bomber={id:90,team:0,alive:true,escortProtected:true,x:80,y:40};
 const selected=tactics.pickTarget(attacker,[hero,bomber],{objective:'escort',player:hero});
 assert.equal(selected,bomber);
 const guard={id:2,team:1,alive:true,aiRole:'guard',x:0,y:0};
 assert.equal(tactics.pickTarget(guard,[hero],{objective:'formation-break',player:hero}),hero);
 const leader={id:1,team:1,alive:true,priorityObjective:true};
 assert.equal(tactics.formationAnchor(guard,[leader,guard]),leader);
});
test('production combat engine passes formation, escape, legacy escort and deadline checks',()=>{
 const {runAI}=require('./ai-behaviour.cjs');
 const report=runAI({
  game:read('game.js'),physics:read('src/physics/swoop-flight.js'),
  aircraft:read('src/art/aircraft.js'),scenery:read('src/art/scenery.js'),
  roster:read('src/data/pilot-roster.js'),pilotAI:read('src/data/pilot-ai.js'),
  missionDoctrine:read('src/ai/mission-doctrine.js')
 },{reps:1,seconds:1,scenarios:['duel'],difficulty:'standard',campaignCheck:true});
 for(const [name,value] of Object.entries(report.campaignChecks))assert.equal(value,true,name);
 assert.equal(report.groundCrashes,0);
});
test('new mission code loads before gameplay and leaves art/menus intact',()=>{
 const index=read('index.html'),ui=read('wingman-ui/ui.js'),career=read('career.js');
 assert.ok(index.indexOf('mission-doctrine.js')<index.indexOf('game.js?v='));
 assert.match(index,/20261101phase10AB/);
 assert.match(ui,/wm-v100-special-objective/);
 assert.match(ui,/FORMATION LEADER/);
 assert.match(ui,/ESCAPING ACE/);
 assert.match(career,/campaignSchema=13/);
 assert.match(ui,/S\.choice=null/);
});

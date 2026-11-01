/* Wingman Phase 10E — combat calibration and complete campaign QA coverage. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const balance=require('../src/campaign/combat-balance.js');
const C=require('../src/campaign/king-of-skies.js');
const B=require('../src/campaign/boss-rivalry.js');
test('12-rung skill curve is staged rather than becoming perfect at rank six',()=>{
 assert.equal(balance.BASE_SKILL.length,12);
 const low=[1,2,3,4,5,6,7,8,9,10,11,12].map(rank=>balance.skillFor({rank,lane:0}));
 assert.equal(low[0],0);
 assert.ok(low[2]<low[5]&&low[5]<low[7]&&low[7]<low[11]);
 assert.ok(low[11]<1,'final baseline pilot still has exploitable weaknesses');
 assert.ok(low[4]<balance.skillFor({rank:4,lane:0,eliteEncounter:true}),
  'brief recovery after the regional boss is deliberate');
 assert.ok(low[8]<low[9]&&low[9]<low[10],'end-game pressure increases');
});
test('lane risks are ordered early AND late without premature saturation',()=>{
 for(const rank of [1,3,4,5,6,8,10,12]){
  const opts=[0,1,2].map(lane=>balance.skillFor({rank,lane}));
  assert.ok(opts[0]<opts[1]&&opts[1]<=opts[2],rank+' distinct paths');
 }
 const rankSixHigh=balance.skillFor({rank:6,lane:2});
 assert.ok(rankSixHigh<.70,'high risk must remain humanly reactable before regional ace 8');
});
test('elite and final command tactics gain experience, not physical stat multipliers',()=>{
 const ordinary=balance.skillFor({rank:8,lane:1});
 assert.ok(balance.skillFor({rank:8,lane:1,eliteEncounter:true})>ordinary);
 assert.ok(balance.skillFor({rank:12,lane:0,finalBoss:true})>.85);
 assert.equal(balance.skillFor({rank:12,lane:2,finalBoss:true}),1);
 assert.equal(balance.skillFor({rank:8,lane:1,eliteEncounter:true,fieldOrders:{ambush:1}}),
  Math.round((balance.skillFor({rank:8,lane:1,eliteEncounter:true})-.13)*1000)/1000);
 assert.ok(!('hull' in balance)&&!('damage' in balance));
});
test('first three opponents have physically separate and legible flight approaches',()=>{
 const [lead,flank,third]=[0,1,2].map(balance.startingPosition);
 assert.ok(lead[0]>.70&&lead[0]<.85);
 assert.ok(flank[0]>lead[0]&&flank[1]<lead[1],'secondary starts farther away and higher');
 assert.ok(third[0]>lead[0]&&third[1]>lead[1],'third lane is visibly separated');
 for(const [x,y,heading] of [lead,flank,third]){
  assert.ok(x>0&&x<1&&y>0&&y<1);
  assert.ok(Number.isFinite(heading));
 }
});
test('threat estimates no longer mark all late-game routes as 100',()=>{
 const mk=(rank,lane)=>({rank,lane,objective:'ace-hunt',types:['bf109'],timeLimit:80,eliteEncounter:rank===4||rank===8});
 const low=balance.calibratedThreat(mk(4,0)),high=balance.calibratedThreat(mk(4,2));
 assert.ok(high>low);
 assert.ok(balance.calibratedThreat(mk(8,0))>low);
 assert.ok(balance.calibratedThreat(mk(10,1))<100);
 assert.deepEqual([0,1,2].map(lane=>balance.calibratedThreat({finalBoss:true,lane})),[86,92,98]);
});
test('real route planner reads current calibration for declared sortie danger',()=>{
 const w={};new Function('window',read('src/data/pilot-roster.js'))(w);
 const pool=w.WingmanRoster.filter(x=>x.faction==='Axis');
 const lead=pool.find(x=>x.plane==='bf109');
 const prev=globalThis.WingmanCombatBalance;
 try{
  globalThis.WingmanCombatBalance=balance;
  const rank8=[0,1,2].map(lane=>{
   const run={rank:8,faction:'Allies',seed:8,supplies:0,effects:[],visits:0};
   return C.decorateEncounter({id:lead.id,label:lead.name,types:['bf109'],opponents:[lead]},
    run,lane,{pool,profile:p=>({...p})});
  });
  assert.ok(rank8[0].threat<rank8[1].threat&&rank8[1].threat<rank8[2].threat);
  assert.ok(rank8.every(x=>x.threat<100));
  B.decorateEncounter(rank8[0],{});
  assert.equal(rank8[0].bossPlan.stages.length,2);
 }finally{globalThis.WingmanCombatBalance=prev;}
});
test('campaign combat and browser load calibration before the existing flight engine',()=>{
 const game=read('game.js'),page=read('index.html');
 assert.match(game,/WingmanCombatBalance\?\.skillFor\(encounter\)/);
 assert.match(game,/WingmanCombatBalance\?\.startingPosition\(i\)/);
 assert.match(game,/GAME_VERSION='v1\.0\.4'/);
 assert.ok(page.indexOf('combat-balance.js')>=0);
 assert.ok(page.indexOf('combat-balance.js')<page.indexOf('<script src="./game.js'));
 assert.match(page,/boss-rivalry\.js/);
 assert.match(read('src/campaign/king-of-skies.js'),/WingmanCombatBalance\?\.calibratedThreat/);
});
test('continental elite retains a viable pursuit window for both boss stages',()=>{
 const w={};new Function('window',read('src/data/pilot-roster.js'))(w);
 const pool=w.WingmanRoster.filter(p=>p.faction==='Axis');
 const leader=pool.find(p=>p.plane==='bf109');
 for(const lane of [0,1,2]){
  const run={rank:8,faction:'Allies',seed:10,visits:0};
  const enc=C.decorateEncounter({id:leader.id,label:leader.name,
   types:[leader.plane],opponents:[leader]},run,lane,{pool,profile:p=>({...p})});
  assert.ok(enc.eliteEncounter);
  assert.ok(enc.timeLimit>=112,'boss must not expire before phase two can be contested');
  assert.equal(B.bossPlanFor(enc).stages.length,2);
 }
});
test('escort doctrine splits enemies between the bomber and its defender',()=>{
 const D=require('../src/ai/mission-doctrine.js');
 const hero={id:0,team:0,alive:true};
 const bomber={id:90,team:0,escortProtected:true,alive:true};
 const targets=[hero,bomber];
 const primary={id:1,team:1,aiRole:'interceptor'};
 const screen={id:2,team:1,aiRole:'hunter'};
 const backup={id:200,team:1,aiRole:'hunter'};
 assert.equal(D.pickTarget(primary,targets,{objective:'escort',player:hero}),bomber);
 assert.equal(D.pickTarget(screen,targets,{objective:'escort',player:hero}),hero);
 assert.equal(D.pickTarget(backup,targets,{objective:'escort',player:hero}),hero);
 bomber.alive=false;
 assert.equal(D.pickTarget(primary,targets.filter(p=>p.alive),{objective:'escort',player:hero}),hero);
});
test('benchmark exercises every combat mission, six aircraft and both sides',()=>{
 const source=read('tests/campaign-difficulty-v080.cjs');
 assert.match(source,/for\(const faction of \['Allies','Axis'\]\)/);
 assert.match(source,/\['fighter','heavy','bomber'\]/);
 assert.match(source,/\['bf109','bf110','he111'\]/);
 assert.match(source,/B\.decorateEncounter\(enc,\{\}\)/);
 assert.match(source,/rows\.length!==156\|\|audit\.trials!==312/);
 assert.match(source,/bossStages/);
});
test('save schema and approved physics files are untouched by balancing',()=>{
 const c=read('career.js'),game=read('game.js');
 assert.match(c,/campaignSchema=14/);
 assert.match(game,/const swoopPhysics=/);
 assert.match(game,/window\.WingmanFlightPhysics/);
 assert.doesNotMatch(read('src/campaign/combat-balance.js'),/health\s*=|damage\s*=|d\.hull\s*=/);
});

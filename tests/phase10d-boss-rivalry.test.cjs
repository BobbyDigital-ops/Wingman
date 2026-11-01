/* Phase 10D regression: multi-stage combat and persistent returning rivals. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const B=require('../src/campaign/boss-rivalry.js');
const C=require('../src/campaign/king-of-skies.js');
test('nemesis selection uses actual losses, not a new random boss identity',()=>{
 const pool=[{id:'a',plane:'bf109'},{id:'b',plane:'bf109'},{id:'c',plane:'he111'}];
 const records={a:{wins:3,losses:0},b:{wins:0,losses:2,lastResult:'LOSS'}};
 assert.equal(B.selectReturningRival(pool,records,4,19).id,'b');
 assert.equal(B.selectReturningRival(pool,records,3,19),null);
 assert.equal(B.selectReturningRival(pool,{},12,19),null);
});
test('regional and final encounters have explicit stages and no stat patches',()=>{
 for(const rank of [4,8,12]){
  const enc={rank,eliteEncounter:rank!==12,finalBoss:rank===12,id:'a',bossId:'a',
   briefing:'Dogfight',missionGoal:'Defeat rivals'};
  B.decorateEncounter(enc,{a:{wins:1,losses:2}});
  assert.equal(enc.bossPlan.stages.length,rank===12?3:2);
  assert.equal(enc.returningRival,true);
  assert.match(enc.briefing,/UNFINISHED BUSINESS/);
  assert.equal(Object.hasOwn(enc,'hullMultiplier'),false);
  assert.equal(Object.hasOwn(enc,'damageMultiplier'),false);
 }
});
test('a defeated rival appears on retry without duplicated mission briefing',()=>{
 const enc={rank:4,id:'a',label:'ACE',eliteEncounter:true,
  briefing:'Original objective.',missionGoal:'Defeat ace'};
 B.decorateEncounter(enc,{});
 assert.equal(enc.returningRival,false);
 const losses={a:{wins:0,losses:1}};
 B.decorateEncounter(enc,losses);
 assert.equal(enc.returningRival,true);
 assert.match(enc.briefing,/UNFINISHED BUSINESS/);
 const one=enc.briefing;
 B.decorateEncounter(enc,losses);
 assert.equal(enc.briefing,one);
 assert.equal(enc.bossPlan.stages.length,2);
});
test('regional ace changes tactic at 55% actual hull, without healing',()=>{
 const enc={rank:4,eliteEncounter:true,bossPlan:B.bossPlanFor({rank:4,eliteEncounter:true})};
 const hero={alive:true},ace={id:1,alive:true,health:100,d:{hull:100},queued:false};
 assert.equal(B.phaseFor(enc,[hero,ace]).stage,1);
 ace.health=55;
 assert.equal(B.phaseFor(enc,[hero,ace]).stage,2);
 assert.equal(B.tacticFor(enc,2),'duellist');
 assert.equal(ace.health,55);
 const late={rank:8,eliteEncounter:true};
 assert.equal(B.tacticFor(late,2),'interceptor');
});
test('final showdown only escalates after the commander actually enters',()=>{
 const enc={rank:12,finalBoss:true,bossPlan:B.bossPlanFor({rank:12,finalBoss:true})};
 const hero={alive:true},wing1={alive:true},wing2={alive:true};
 const ace={id:3,alive:false,queued:true,health:100,d:{hull:100}};
 assert.equal(B.phaseFor(enc,[hero,wing1,wing2,ace]).stage,1);
 ace.alive=true;ace.queued=false;
 assert.equal(B.phaseFor(enc,[hero,wing1,wing2,ace]).stage,2);
 ace.health=44;
 assert.equal(B.phaseFor(enc,[hero,wing1,wing2,ace]).stage,3);
 assert.equal(B.tacticFor(enc,3),'brawler');
 assert.equal(ace.health,44);
});
test('completed rivalry updates preserved wins/losses and last result',()=>{
 const r={wins:1,losses:2},report=B.recordResult(r,true,8);
 assert.equal(r.encounters,3);
 assert.equal(r.lastResult,'WIN');
 assert.equal(r.lastRank,8);
 assert.equal(report.wins,1);
 assert.equal(report.losses,2);
});
test('schema 13 save migrates to 14 without losing the rematch or the campaign',()=>{
 const w={WingmanCampaign:C,WingmanBossRivalry:B,
  WingmanGame:{startCampaignFight(){},showMenu(){}}};
 new Function('window',read('src/data/pilot-roster.js'))(w);
 new Function('window',read('src/data/pilot-ai.js'))(w);
 const hero=w.WingmanRoster.find(p=>p.faction==='Allies'&&p.plane==='fighter');
 const enemy=w.WingmanRoster.find(p=>p.faction==='Axis'&&p.plane==='bf109');
 const saved={profile:{rosterId:hero.id,name:hero.name,plane:'fighter',
  faction:'Allies',characterConfirmed:true},wins:2,losses:2,kills:5,
  completed:0,best:4,medals:[],service:[],records:{[enemy.id]:{wins:0,losses:2}},
  run:{rank:4,lastLane:1,lives:2,visits:2,seed:1908,campaignSchema:13,
   condition:81,supplies:5,effects:['supercharger'],faction:'Allies',
   aircraft:'fighter',choices:[],pathHistory:[{rank:1,lane:1},{rank:2,lane:1},{rank:3,lane:1}],
   operations:{radio:1,ambush:1,favour:0}}};
 const db={'wingman-road-to-ace-v1':JSON.stringify(saved)};
 const storage={getItem:k=>db[k]??null,setItem:(k,v)=>db[k]=v};
 const mk=id=>({id,hidden:false,innerHTML:'',querySelector(){return null},
  querySelectorAll(){return []},classList:{add(){},remove(){}},addEventListener(){}});
 const document={getElementById(id){this.nodes??={};return this.nodes[id]??=mk(id)}};
 new Function('window','document','localStorage','sessionStorage',read('career.js'))(
  w,document,storage,{getItem(){return null}});
 const after=JSON.parse(db['wingman-road-to-ace-v1']);
 assert.equal(after.run.campaignSchema,14);
 assert.equal(after.run.rank,4);assert.equal(after.run.lives,2);
 assert.equal(after.run.operations.radio,1);assert.equal(after.run.effects[0],'supercharger');
 assert.equal(after.records[enemy.id].losses,2);
 assert.equal(after.run.choices[0].id,enemy.id);
 assert.equal(after.run.choices[0].returningRival,true);
 assert.equal(after.run.choices[0].bossPlan.stages.length,2);
});
test('boss phase HUD, stage dossier and debrief are integrated',()=>{
 const game=read('game.js'),ui=read('wingman-ui/ui.js'),html=read('index.html');
 assert.match(game,/advanceCampaignBossPhase\(\)/);
 assert.match(game,/tacticFor\(state\.campaignEncounter,p\.bossStage\)/);
 assert.match(ui,/wm-v102-boss-dossier/);
 assert.match(ui,/wm-v102-rivalry-dossier/);
 assert.match(ui,/wm-v102-rivalry-debrief/);
 assert.match(html,/boss-rivalry\.js/);
});

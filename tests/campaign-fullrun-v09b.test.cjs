/* Wingman Phase 9B — actual career controller + full mixed twelve-rung run.
   Fight outcomes are scripted; this checks game state, not fight win probability. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const C=require('../src/campaign/king-of-skies.js');
function make(faction){
 const w={WingmanCampaign:C};
 for(const script of ['src/data/pilot-roster.js','src/data/pilot-ai.js'])
  new Function('window',read(script))(w);
 const pilot=w.WingmanRoster.find(p=>p.faction===faction);
 assert.ok(pilot);
 const initial={profile:{name:pilot.name,faction,plane:pilot.plane,rosterId:pilot.id,
  skill:pilot.signature,characterConfirmed:true,attributes:pilot.attributes,style:{}},
  records:{},service:[],medals:[],streak:0,bestStreak:0,
  run:{faction,aircraft:pilot.plane,rank:1,lives:3,visits:0,seed:123,choices:null,
    campaignSchema:8,supplies:2,condition:100,effects:[]},
  wins:0,losses:0,kills:0,completed:0,best:1};
 let storage=JSON.stringify(initial);
 const store={getItem:key=>key==='wingman-road-to-ace-v1'?storage:null,
   setItem:(key,v)=>{if(key==='wingman-road-to-ace-v1')storage=v}};
 const callbacks={},el={};
 const mk=id=>({hidden:false,classList:{add(){},remove(){}},
  addEventListener:(name,cb)=>callbacks[id+'.'+name]=cb,
  querySelector(){return null},querySelectorAll(){return []},innerHTML:''});
 const document={getElementById:id=>el[id]??=mk(id),querySelector(){return null}};
 let launched=null;
 w.WingmanGame={startCampaignFight(enc,aircraft){launched={enc,aircraft}},showMenu(){}};
 new Function('window','document','localStorage','sessionStorage',read('career.js'))(
  w,document,store,{getItem(){return null}});
 const snapshot=()=>JSON.parse(storage);
 const click=dataset=>callbacks['career-screen.click']({target:{closest:()=>({dataset})}});
 return {w,pilot,snapshot,click,takeFlight:()=>{
  const flight=launched;launched=null;return flight;
 }};
}
function finishRun(faction,choiceMode){
 const t=make(faction),steps=[];
 for(let rank=1;rank<=12;rank++){
  const before=t.snapshot(),run=before.run;
  assert.ok(run,'Active run should survive until the final rung');
  assert.equal(run.rank,rank);
  assert.equal(run.campaignSchema,9);
  const eventIdx=run.choices.findIndex(c=>c.isNonCombat);
  const combatIdx=run.choices.findIndex(c=>!c.isNonCombat);
  const idx=choiceMode==='events'&&eventIdx>=0?eventIdx:combatIdx;
  assert.ok(idx>=0&&idx<3);
  const node=run.choices[idx];
  if(node.isNonCombat){
   const safe={supply:'crate',intel:'scout',shop:'leave',event:'help',dice:'safe'};
   const option=safe[node.nodeType];
   assert.ok(node.eventOptions.some(x=>x.id===option));
   const result=t.w.WingmanCareer.resolveCampaignEvent(idx,option);
   assert.ok(result,'Event must resolve exactly once');
   steps.push({rank,kind:'event',type:node.nodeType});
  }else{
   t.click({choice:String(idx)});
   t.click({sortiePlane:t.pilot.plane});
   t.click({action:'confirm-sortie-aircraft'});
   const flight=t.takeFlight();
   assert.ok(flight,'Combat must reach the existing flight engine');
   assert.equal(flight.enc.isNonCombat,true?undefined:false);
   assert.equal(flight.enc.rank,rank);
   t.w.WingmanCareer.finishEncounter(true,flight.enc,{
    integrity:.85,kills:flight.enc.types.length,remainingSeconds:20
   });
   const after=t.snapshot();
   if(after.run?.pendingReward)
    assert.ok(t.w.WingmanCareer.claimReward(after.run.pendingReward.offers[0]));
   steps.push({rank,kind:'combat',mission:node.mission});
  }
 }
 const final=t.snapshot();
 assert.equal(final.completed,1);
 assert.equal(final.run,null);
 assert.equal(final.lastCompleted.rank,12);
 assert.equal(final.best,12);
 assert.equal(final.service.length,12);
 assert.equal(final.losses,0);
 assert.ok(final.medals.includes('wingman-legend'));
 assert.equal(final.wins,steps.filter(s=>s.kind==='combat').length);
 assert.equal(final.service.filter(s=>s.kind==='event').length,
  steps.filter(s=>s.kind==='event').length);
 return steps;
}
test('RAF mixed run completes 12 rungs and records eight ground events',()=>{
 const steps=finishRun('Allies','events');
 assert.equal(steps.filter(s=>s.kind==='event').length,8);
 assert.equal(steps.filter(s=>s.kind==='combat').length,4);
});
test('Luftwaffe mixed run also completes 12 rungs with independent records',()=>{
 const steps=finishRun('Axis','events');
 assert.equal(steps.length,12);
 assert.equal(steps.at(-1).mission,'FINAL SQUADRON');
});
test('all-combat route remains playable for twelve consecutive encounters',()=>{
 const steps=finishRun('Allies','combat');
 assert.equal(steps.filter(s=>s.kind==='combat').length,12);
});

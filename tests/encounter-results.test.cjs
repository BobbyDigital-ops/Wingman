/* Phase 9: post-event reports and deterministic hangar dice outcomes. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const C=require('../src/campaign/king-of-skies.js');
const src=fs.readFileSync(path.join(root,'wingman-ui/ui.js'),'utf8');
function encounter(rank,lane,supplies=4,seed=66){
 const run={rank,faction:'Allies',seed,visits:0,condition:73,supplies,effects:[]};
 const enc=C.decorateEncounter({rank,id:'axis-pilot',label:'Test pilot',types:['bf109'],opponents:[]},run,lane);
 return {run,enc};
}
test('Hangar dice records the exact die, win or loss, resources and persistent history',()=>{
 for(let seed=1;seed<=20;seed++){
  const {run,enc}=encounter(5,2,4,seed);
  assert.equal(enc.nodeType,'dice');
  const outcome=C.resolveEvent(run,enc,'roll');
  assert.ok(outcome.diceRoll>=1&&outcome.diceRoll<=6);
  assert.equal(outcome.diceWon,outcome.diceRoll>=4);
  assert.equal(outcome.suppliesBefore,4);
  assert.equal(outcome.suppliesAfter,outcome.diceWon?8:3);
  assert.equal(outcome.suppliesDelta,outcome.diceWon?4:-1);
  assert.match(outcome.headline,/YOU (WON|LOST) THE DICE/);
  assert.equal(run.eventHistory[0].diceRoll,outcome.diceRoll);
  assert.equal(JSON.parse(JSON.stringify(run)).lastEvent.diceRoll,outcome.diceRoll);
 }
});
test('Every event type provides an auditable after-action outcome',()=>{
 for(const [rank,lane,action] of [[2,0,'patch'],[2,2,'scout'],[7,2,'help'],
   [5,0,'service'],[5,2,'safe']]){
  const {run,enc}=encounter(rank,lane,6);
  const outcome=C.resolveEvent(run,enc,action);
  assert.ok(outcome,enc.nodeType);
  assert.equal(outcome.kind,enc.nodeType);
  assert.ok(outcome.headline.length>3);
  assert.equal(outcome.suppliesBefore,6);
  assert.equal(outcome.suppliesAfter,run.supplies);
  assert.equal(outcome.conditionAfter,run.condition);
  assert.deepEqual(outcome.newEffects,[]);
 }
});
test('A purchased gunsmith upgrade cannot be charged for twice',()=>{
 const {run,enc}=encounter(5,0,6);
 assert.ok(C.resolveEvent(run,enc,'guns'));
 const first=run.supplies;
 assert.equal(first,3);
 assert.equal(C.resolveEvent(run,enc,'guns'),null);
 assert.equal(run.supplies,first);
});
test('The illustrated UI opens a report and waits for explicit return to the ladder',()=>{
 const {run,enc}=encounter(5,2);
 const save={profile:{name:'RAF Tester',faction:'Allies',rosterId:'raf',plane:'fighter',characterConfirmed:true},
  run:{...run,choices:[enc,enc,enc]},wins:0,losses:0,kills:0,records:{}};
 const store={'wingman-road-to-ace-v1':JSON.stringify(save)},handles={};
 const mk=()=>({hidden:false,innerHTML:'',scrollTop:0,scrollHeight:1000,clientHeight:400,dataset:{},textContent:'',
  style:{setProperty(){}},setAttribute(){},getBoundingClientRect(){return {top:0}},
  closest(){return null},querySelector(){return null},querySelectorAll(){return[]},classList:{add(){},remove(){}}});
 const stage=mk(),other={};
 const document={documentElement:{style:{setProperty(){}}},
  querySelector:q=>q==='#stage'?stage:(other[q]??=mk()),addEventListener:(k,f)=>handles[k]=f};
 const bridge={resolveCampaignEvent:(i,id)=>{
  const result=C.resolveEvent(save.run,save.run.choices[i],id);if(!result)return null;
  save.run.rank++;save.run.visits++;
  save.run.choices=[0,1,2].map(l=>C.decorateEncounter(
   {id:'axis-pilot',label:'Test pilot',rank:save.run.rank,types:['bf109'],opponents:[]},save.run,l));
  store['wingman-road-to-ace-v1']=JSON.stringify(save);return result;
 },getAudioSettings:()=>({muted:false,volume:1})};
 const window={WMART:{},parent:{WingmanRoster:[{id:'raf',name:'RAF Tester',faction:'Allies',plane:'fighter',portrait:0}],
  WingmanUIBridge:bridge,WingmanCampaign:C},addEventListener(){}};
 new Function('window','document','localStorage','sessionStorage','location','confirm',src)(window,document,
  {getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v},{getItem(){return null}},
  {origin:'https://wingman.test'},()=>true);
 const api=window.WingmanLiveUI;
 api.state.screen='career';api.state.choice=2;api.state.campaignPanel='sortie';api.show();
 assert.match(stage.innerHTML,/data-event-option="roll"/);
 const click=dataset=>handles.click({target:{closest:()=>({dataset})}});
 click({eventOption:'roll'});
 const report=save.run.lastEvent;
 assert.equal(api.state.screen,'event-result');
 assert.match(stage.innerHTML,/wm-v10-event-result/);
 assert.ok(stage.innerHTML.includes(report.headline));
 assert.match(stage.innerHTML,/ACTUAL DIE RESULT/);
 assert.match(stage.innerHTML,/REPAIR SUPPLIES/);
 assert.match(stage.innerHTML,/data-action="continue-event"/);
 assert.equal(save.run.rank,6);
 click({action:'continue-event'});
 assert.equal(api.state.screen,'career');
 assert.match(stage.innerHTML,/campaign-map-canvas/);
 assert.equal(save.run.lastEvent.diceRoll,report.diceRoll);
});

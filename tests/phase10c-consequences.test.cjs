/* Phase 10C regression: real campaign consequences, not cosmetic rewards. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const C=require('../src/campaign/king-of-skies.js');
function run(rank=5){return {rank,faction:'Allies',visits:0,seed:72,supplies:4,condition:86,effects:[]};}
function event(r,kind='intel'){return {rank:r.rank,lane:1,isNonCombat:true,nodeType:kind,mission:'OPS',label:'Officer'};}
test('radio interception grants a resource choice that survives saving',()=>{
 const r=run(),out=C.resolveEvent(r,event(r),'scout');
 assert.equal(r.supplies,6);assert.equal(r.operations.radio,1);
 assert.deepEqual(out.newOrders,{radio:1,ambush:0,favour:0});
 assert.equal(JSON.parse(JSON.stringify(r)).operations.radio,1);
});
test('ambush plan changes next engagement and gives fitted sights only once',()=>{
 const r=run();const first=C.resolveEvent(r,event(r),'prepare');
 assert.equal(r.operations.ambush,1);assert.ok(r.effects.includes('ace-weapon-sights'));
 assert.equal(first.newOrders.ambush,1);
 const second=C.resolveEvent(r,event(r),'prepare');
 assert.equal(r.operations.ambush,2);
 assert.equal(second.suppliesDelta,2);
 assert.equal(C.resolveEvent(r,event(r),'prepare').newOrders.ambush,0);
});
test('helping the ground crew adds a real wingman benefit',()=>{
 const r=run();const outcome=C.resolveEvent(r,event(r,'event'),'help');
 assert.equal(outcome.suppliesDelta,2);
 assert.equal(outcome.newOrders.favour,1);
});
test('preflight supply spending enforces cost, ceiling and validates order names',()=>{
 const r=run();assert.equal(C.buyFieldOrder(r,'radio'),true);
 assert.equal(r.supplies,2);assert.equal(r.operations.radio,1);
 assert.equal(C.buyFieldOrder(r,'radio'),true);
 assert.equal(r.supplies,0);assert.equal(r.operations.radio,2);
 assert.equal(C.buyFieldOrder(r,'radio'),false);
 assert.equal(C.buyFieldOrder(r,'ambush'),false);
 assert.equal(C.buyFieldOrder(r,'__proto__'),false);
 assert.equal(r.supplies,0);
});
test('field orders apply once at take-off and do not persist on retry',()=>{
 const r=run();r.operations={radio:1,ambush:1,favour:1};
 const battle={rank:5,isNonCombat:false,mission:'ESCORT',objective:'escort',timeLimit:100,
  reinforcements:[{at:30,count:1,type:'bf109'},{at:53,count:1,type:'bf109'}]};
 const first=C.deployFieldOrders(r,battle);
 assert.deepEqual(first,{radio:1,ambush:1,favour:1});
 assert.deepEqual(battle.reinforcements.map(w=>w.at),[45,68]);
 assert.deepEqual(r.operations,{radio:0,ambush:0,favour:0});
 const retry=C.deployFieldOrders(r,battle);
 assert.deepEqual(retry,{radio:0,ambush:0,favour:0});
 assert.deepEqual(battle.reinforcements.map(w=>w.at),[30,53]);
});
test('radio plans wait for a combat sortie that actually has reinforcements',()=>{
 const r=run();r.operations={radio:1,ambush:0,favour:0};
 const duel={rank:5,isNonCombat:false,mission:'DUEL',timeLimit:90,reinforcements:[]};
 assert.equal(C.deployFieldOrders(r,duel).radio,0);assert.equal(r.operations.radio,1);
 const next={rank:6,isNonCombat:false,mission:'PATROL',timeLimit:90,
  reinforcements:[{at:30,count:1,type:'fighter'}]};
 assert.equal(C.deployFieldOrders(r,next).radio,1);assert.equal(r.operations.radio,0);
 assert.equal(next.reinforcements[0].at,45);
});
test('old saves normalize operations without losing rank, lives or equipment',()=>{
 const r=run(9);r.lives=2;r.effects=['ace-weapon-sights'];
 C.normalizeRun(r);
 assert.equal(r.rank,9);assert.equal(r.lives,2);
 assert.deepEqual(r.operations,{radio:0,ambush:0,favour:0});
 assert.deepEqual(r.effects,['ace-weapon-sights']);
});
test('field order roles and gameplay effects are verified in the real combat engine',()=>{
 const {runAI}=require('./ai-behaviour.cjs');
 const report=runAI({game:read('game.js'),physics:read('src/physics/swoop-flight.js'),
  aircraft:read('src/art/aircraft.js'),scenery:read('src/art/scenery.js'),
  roster:read('src/data/pilot-roster.js'),pilotAI:read('src/data/pilot-ai.js'),
  missionDoctrine:read('src/ai/mission-doctrine.js')},
  {reps:1,seconds:1,scenarios:['duel'],difficulty:'standard',campaignCheck:true});
 assert.deepEqual(report.fieldOrderChecks,{support:true,ambush:true,radio:true});
 assert.ok(Object.values(report.campaignChecks).every(Boolean));
 assert.equal(report.groundCrashes,0);
});
test('real career flow carries earned operations across events, sortie, debrief and reward',()=>{
 const rootWin={WingmanCampaign:C,WingmanGame:{startCampaignFight(enc){this.last=enc},showMenu(){}},
  addEventListener(){}};
 new Function('window',read('src/data/pilot-roster.js'))(rootWin);
 new Function('window',read('src/data/pilot-ai.js'))(rootWin);
 const pilot=rootWin.WingmanRoster.find(p=>p.faction==='Allies'&&p.plane==='fighter');
 const saved={profile:{rosterId:pilot.id,name:pilot.name,plane:'fighter',
  faction:'Allies',characterConfirmed:true},wins:1,losses:0,kills:2,
  completed:0,best:2,medals:[],records:{},service:[],
  run:{rank:2,lastLane:2,lives:3,visits:1,seed:2901,campaignSchema:12,
   condition:92,supplies:4,effects:[],faction:'Allies',aircraft:'fighter',
   choices:[],pathHistory:[{rank:1,lane:2}]}};
 const db={'wingman-road-to-ace-v1':JSON.stringify(saved)};
 const storage={getItem:key=>db[key]??null,setItem:(key,value)=>db[key]=value};
 const eventHandlers={},mk=id=>({id,hidden:false,innerHTML:'',
  querySelector(){return null},querySelectorAll(){return[]},
  classList:{add(){},remove(){}},addEventListener:(name,cb)=>eventHandlers[id+'.'+name]=cb,
  getAttribute(){return null}});
 const document={getElementById(id){this.nodes??={};return this.nodes[id]??=mk(id)}};
 new Function('window','document','localStorage','sessionStorage',read('career.js'))(
  rootWin,document,storage,{getItem(){return null}});
 const load=()=>JSON.parse(db['wingman-road-to-ace-v1']);
 assert.equal(load().run.campaignSchema,13);
 const event=rootWin.WingmanCareer.resolveCampaignEvent(2,'scout');
 assert.equal(event.newOrders.radio,1);
 assert.equal(load().run.rank,3);
 assert.equal(rootWin.WingmanCareer.buyCampaignOrder('favour'),true);
 assert.equal(load().run.operations.favour,1);
 const click=dataset=>eventHandlers['career-screen.click'](
  {target:{closest:()=>({dataset})}});
 click({choice:'2'});click({sortiePlane:'fighter'});click({action:'confirm-sortie-aircraft'});
 const flight=rootWin.WingmanGame.last;
 assert.equal(flight.fieldOrders.favour,1);
 assert.equal(flight.fieldOrders.radio,0);
 assert.equal(load().run.operations.radio,1);
 assert.equal(load().run.operations.favour,0);
 rootWin.WingmanCareer.finishEncounter(true,flight,
  {kills:2,integrity:.84,shots:150,hits:35,damageDealt:230,damageTaken:45,elapsedSeconds:97});
 const reward=load().run.pendingReward;
 assert.ok(reward);
 assert.equal(load().lastOutcome.fieldOrders.favour,1);
 assert.equal(rootWin.WingmanCareer.claimReward(reward.offers[0]),true);
 assert.equal(load().run.rank,4);
 assert.equal(load().run.operations.radio,1);
 assert.equal(load().run.lives,3);
});

test('menu reports the actual event reward, held tactical orders and consumed sortie orders',()=>{
 const ui=read('wingman-ui/ui.js'),bridge=read('src/ui/wingman-bridge.js'),career=read('career.js');
 assert.match(ui,/wm-v101-field-orders/);
 assert.match(ui,/wm-v101-event-order/);
 assert.match(ui,/wm-v101-debrief-orders/);
 assert.match(ui,/data-buy-order="radio"/);
 assert.match(bridge,/buyCampaignOrder\(key\)/);
 assert.match(career,/deployFieldOrders/);
 assert.match(career,/campaignSchema=13/);
});

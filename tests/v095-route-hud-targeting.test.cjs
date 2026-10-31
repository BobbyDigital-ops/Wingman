/* v0.9.5 acceptance: Slay-the-Spire routes, no autoplay, multi-aircraft targeting. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const C=require('../src/campaign/king-of-skies.js'),game=read('game.js'),ui=read('wingman-ui/ui.js');
function part(start,end){
 const i=game.indexOf(start),j=game.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,'Function anchors: '+start);
 return game.slice(i,j);
}
test('route choices only allow connections and converge on one boss',()=>{
 assert.deepEqual(C.reachableLanes(null,1),[0,1,2]);
 assert.deepEqual(C.reachableLanes(0,2),[0,1]);
 assert.deepEqual(C.reachableLanes(2,2),[1,2]);
 assert.deepEqual(C.reachableLanes(1,2),[0,1,2]);
 for(let prev=0;prev<3;prev++)assert.deepEqual(C.reachableLanes(prev,12),[1]);
});
test('legacy campaign wins and events record their real selected path',()=>{
 const c=read('career.js');
 assert.match(c,/run\.pathHistory\.push\(\{rank:atRank,lane:rival\.lane/);
 assert.match(c,/run\.pathHistory\.push\(\{rank:atRank,lane:index/);
 assert.match(c,/data\.run\.pathHistory=.*data\.service/);
});
test('menu shows the selected travelled route and disables inaccessible nodes',()=>{
 const handlers={},stage={innerHTML:'',hidden:false,scrollTop:0,scrollHeight:1200,clientHeight:400,
   style:{setProperty(){}},querySelector(){return null},querySelectorAll(){return[]}};
 const other={};
 const document={documentElement:{style:{setProperty(){}}},querySelector:q=>q==='#stage'?stage:
   (other[q]??={hidden:false,innerHTML:'',querySelector(){return null},querySelectorAll(){return[]}}),
   addEventListener:(k,fn)=>handlers[k]=fn};
 const pilot={id:'raf',name:'RAF Tester',faction:'Allies',plane:'fighter',portrait:0};
 const enemy={id:'axis',name:'Enemy Ace',faction:'Axis',plane:'bf109',portrait:1};
 const run={rank:2,lastLane:2,pathHistory:[{rank:1,lane:2,nodeType:'combat'}],
  lives:3,seed:55,visits:1,faction:'Allies',aircraft:'fighter',condition:86,supplies:2,effects:[]};
 run.choices=[0,1,2].map(lane=>C.decorateEncounter(
  {id:enemy.id,rank:2,label:enemy.name,types:['bf109'],opponents:[enemy]},
  run,lane,{pool:[enemy],profile:p=>p}));
 const saved={profile:{name:pilot.name,rosterId:'raf',plane:'fighter',faction:'Allies'},
  run,wins:1,losses:0,kills:2,service:[],records:{}};
 const store={'wingman-road-to-ace-v1':JSON.stringify(saved)},storage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;}};
 const bridge={getAudioSettings(){return{muted:false,volume:1}}};
 const window={WMART:{},parent:{WingmanRoster:[pilot,enemy],WingmanCampaign:C,WingmanUIBridge:bridge,WingmanGame:{}},
  addEventListener(){}};
 new Function('window','document','localStorage','sessionStorage','location','confirm',ui)(
  window,document,storage,{getItem(){return null}},{origin:'https://test'},()=>true);
 const live=window.WingmanLiveUI;
 live.state.screen='career';live.state.campaignPanel='ladder';live.state.choice=null;live.show();
 assert.equal((stage.innerHTML.match(/class="route-map-row /g)||[]).length,12);
 assert.equal((stage.innerHTML.match(/class="route-map-node is-available"/g)||[]).length,2);
 assert.equal((stage.innerHTML.match(/class="route-map-node is-locked"/g)||[]).length,1);
 assert.equal((stage.innerHTML.match(/class="route-map-node is-complete"/g)||[]).length,1);
 assert.match(stage.innerHTML,/viewBox="0 0 1000 1200"/);
 assert.match(stage.innerHTML,/SELECT ONE OF THE CONNECTED NODES ABOVE/);
 assert.doesNotMatch(stage.innerHTML,/data-action="campaign-sortie"/);
 handlers.click({target:{closest:()=>({dataset:{choice:'0'}})}});
 assert.equal(live.state.choice,null,'left lane is disconnected from previously selected right lane');
 handlers.click({target:{closest:()=>({dataset:{choice:'1'}})}});
 assert.equal(live.state.choice,1);
 assert.equal(live.state.campaignPanel,'sortie');
 assert.match(stage.innerHTML,/PRIMARY OBJECTIVE/);
});
test('after a reward the next mission is not automatically selected',()=>{
 assert.match(ui,/S\.campaignPanel='ladder';S\.choice=null;S\.screen='career'/);
 assert.match(ui,/S\.choice=null;S\.screen='career';S\.lastCareer=false/);
 assert.match(ui,/if\(v==='campaign-sortie'\)\{if\(S\.choice===null\)/);
});
test('2v2 enemies actively target the player when unattended',()=>{
 const state={mode:'duel',recordMode:'teams',teams:true,humanIdleSeconds:8,
   fliers:[{id:0,team:0,alive:true,x:0},{id:1,team:1,alive:true,x:70},
      {id:2,team:0,alive:true,x:50},{id:3,team:1,alive:true,x:80}]};
 const opponents=new Function('state',part('function opponents(p){','  // Career-only tactical reserve.')+
    '\nreturn opponents;')(state);
 const nearest=new Function('state','opponents','combatDistance',
   part('function nearestEnemy(p){','  function triggerSpecial(p){')+'\nreturn nearestEnemy;')(
     state,opponents,(a,b)=>Math.abs(a.x-b.x));
 assert.equal(nearest(state.fliers[1]).id,0);
 assert.equal(nearest(state.fliers[3]).id,0);
});
test('1v2 pilots target the player and cannot shoot their own side',()=>{
 const state={mode:'duel',recordMode:'triple',teams:false,
   fliers:[{id:0,team:0,alive:true},{id:1,team:1,alive:true},{id:2,team:2,alive:true}]};
 const opponents=new Function('state',part('function opponents(p){','  // Career-only tactical reserve.')+
   '\nreturn opponents;')(state);
 assert.deepEqual(opponents(state.fliers[0]).map(p=>p.id),[1,2]);
 assert.deepEqual(opponents(state.fliers[1]).map(p=>p.id),[0]);
 assert.deepEqual(opponents(state.fliers[2]).map(p=>p.id),[0]);
 assert.match(game,/state\.recordMode==='triple'&&state\.mode!=='campaign'\?/);
});
test('squadron HUD draws multiple aircraft and their current armour/hull',()=>{
 assert.match(game,/const squadMode=state\.mode==='campaign'/);
 assert.match(game,/hostile\.forEach\(\(q,i\)=>contact\(q,i,true,10\)\)/);
 assert.match(game,/friendly\.forEach\(\(q,i\)=>contact\(q,i,false,41\)\)/);
 assert.match(game,/q\.health\)\+Math\.max\(0,q\.armour\)/);
});

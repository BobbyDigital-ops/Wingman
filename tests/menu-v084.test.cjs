/* Wingman v0.8.4 — direct scramble, results theme and HUD visibility regression. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const script=read('wingman-ui/ui.js');
function harness(campaign=false, startOk=true){
 const save={profile:{name:'RAF Test Pilot',faction:'Allies',rosterId:'raf-1',plane:'fighter',skill:'roll'},
  wins:1,losses:0,kills:1,records:{},run:campaign?{rank:2,lives:3,condition:100,supplies:1,effects:[],
   choices:[{id:'ax-1',label:'Axis Rival',mission:'ACE HUNT',risk:'MEDIUM',briefing:'Intercept the rival'}]}:null};
 const store={'wingman-road-to-ace-v1':JSON.stringify(save)},events={},logs=[];
 const mk=()=>({hidden:false,innerHTML:'',scrollTop:0,textContent:'',style:{setProperty(){}},
  querySelector(){return null},querySelectorAll(){return[]},setAttribute(){}});
 const stage=mk(),el={};
 const document={documentElement:{style:{setProperty(){}}},querySelector(q){return q==='#stage'?stage:(el[q]??=mk());},
  addEventListener(e,f){events[e]=f}};
 const parent={WingmanRoster:[{id:'raf-1',name:'RAF Test Pilot',faction:'Allies',plane:'fighter',portrait:0}],
  WingmanCampaign:{UPGRADES:[],ELITE_UPGRADES:[],SETBACKS:[]},
  WingmanUIBridge:{startArcade:opts=>(logs.push(['arcade',opts]),startOk),
   startCareer:(choice,plane)=>(logs.push(['career',choice,plane]),startOk),
   hide:()=>logs.push(['hide'])}};
 const window={WMART:Object.fromEntries(Array.from({length:6},(_,i)=>['aircraft-art-'+i,'plane-'+i+'.jpg'])),
  parent,addEventListener(){}};
 new Function('window','document','localStorage','sessionStorage','location','confirm',script)(
  window,document,{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v)},
  {getItem(){return null},removeItem(){}},{origin:'https://wingman.test'},()=>true);
 return {window,stage,logs,store,save,action:name=>events.click({target:{closest:()=>({dataset:{action:name}})}})};
}
test('Skirmish launches from aircraft selection without final briefing',()=>{
 const t=harness();t.window.WingmanLiveUI.go('aircraft');
 assert.match(t.stage.innerHTML,/data-action="launch-arcade"/);
 assert.match(t.stage.innerHTML,/SCRAMBLE/);
 assert.doesNotMatch(t.stage.innerHTML,/FINAL BRIEFING|data-action="mission-review"/);
 t.action('launch-arcade');assert.equal(t.logs[0][0],'arcade');assert.equal(t.logs[0][1].aircraft,'fighter');
 assert.equal(t.logs[1][0],'hide');
});
test('Campaign launches selected sortie directly and retains campaign state',()=>{
 const t=harness(true);t.window.WingmanLiveUI.state.career=true;t.window.WingmanLiveUI.go('aircraft');
 assert.match(t.stage.innerHTML,/data-action="launch-career"/);
 assert.match(t.stage.innerHTML,/ACE HUNT/);
 t.action('launch-career');assert.deepEqual(t.logs[0],['career',0,'fighter']);
 assert.equal(t.logs[1][0],'hide');
});
test('Failed launch keeps aircraft view and displays clear feedback',()=>{
 const t=harness(false,false);t.window.WingmanLiveUI.go('aircraft');
 t.action('launch-arcade');
 assert.equal(t.window.WingmanLiveUI.state.screen,'aircraft');
 assert.match(t.stage.innerHTML,/UNABLE TO LAUNCH/);
 assert.equal(t.logs.length,1);
});
test('Arcade victory is a parchment RAF report with original result controls',()=>{
 const t=harness();t.window.WingmanLiveUI.state.screen='outcome';
 t.window.WingmanLiveUI.state.lastResult='VICTORY!';
 t.window.WingmanLiveUI.show();
 for(const token of ['wm-v084-debrief-paper','VICTORY','FORM 09','RAF Test Pilot',
  'data-action="fly-again"','data-action="change-aircraft"','data-action="return-home"'])
  assert.ok(t.stage.innerHTML.includes(token),token);
 assert.doesNotMatch(t.stage.innerHTML,/career-intro-layout|FINAL BRIEFING/);
});
test('Reticle is 39% bigger and only display stroke widths change',()=>{
 const game=read('game.js');
 assert.match(game,/c\.scale\(\.32,\.32\)/);
 assert.doesNotMatch(game,/c\.scale\(\.23,\.23\)/);
 assert.match(game,/c\.lineWidth=locked\?1\.40:1\.14/);
 assert.match(game,/function drawHud\(/);
});
test('v11 report CSS loads last while original aircraft and pilot assets are retained',()=>{
 const markup=read('wingman-ui/index.html');
 const theme=read('wingman-ui/menu-v15-debrief.css');
 assert.ok(markup.indexOf('menu-v15-debrief.css')>markup.indexOf('menu-v14-v11-art.css'));
 assert.match(theme,/v11-art\/operations\.jpg/);
 assert.match(theme,/var\(--art-raf-hangar-scene/);
 assert.match(script,/function atlas\(p\)/);
 assert.match(script,/photo\('aircraft-art-'\+S\.plane\)/);
});

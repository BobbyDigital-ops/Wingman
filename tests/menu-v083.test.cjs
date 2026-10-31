/* Wingman v0.8.3 visual integration regression.
   The actual menu script is executed with a minimal DOM, without modifying the game. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const uiSource=fs.readFileSync(path.join(root,'wingman-ui/ui.js'),'utf8');
function harness(){
 const session={};
 const save={
  profile:{name:'Test Pilot',faction:'Allies',rosterId:'pilot-a',plane:'fighter',skill:'roll'},
  wins:2,losses:1,kills:4,records:{},run:{
   rank:3,lives:2,condition:89,supplies:3,effects:[],
   choices:[
    {id:'pilot-axis',mission:'BOMBER INTERCEPT',risk:'LOW',label:'Axis Pilot',threat:30,briefing:'Intercept the bomber'},
    {id:'pilot-axis',mission:'ACE HUNT',risk:'MEDIUM',label:'Axis Ace',threat:45,briefing:'Hunt the ace'},
    {id:'pilot-axis',mission:'BOMBER ESCORT',risk:'HIGH',label:'Axis Wing',threat:65,briefing:'Escort the bombers'}
   ]}
 };
 const storage={'wingman-road-to-ace-v1':JSON.stringify(save)};
 const localStorage={getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=String(v)};
 const sessionStorage={getItem:k=>session[k]??null,setItem:(k,v)=>session[k]=String(v),removeItem:k=>delete session[k]};
 const mk=()=>({hidden:false,innerHTML:'',style:{setProperty(){}},textContent:'',scrollTop:0,
  querySelector:()=>null,querySelectorAll:()=>[],setAttribute(){}});
 const stage=mk(),events={},nav=mk();
 const controls={'.utility-home':mk(),'.utility-settings':mk(),'.career-settings-popup':mk(),'#squadron strong':mk()};
 const document={documentElement:{style:{setProperty(){}}},querySelector:q=>q==='#stage'?stage:q==='.nav'?nav:controls[q]||mk(),
  addEventListener:(name,handler)=>events[name]=handler};
 const parent={WingmanRoster:[{id:'pilot-a',name:'Test Pilot',faction:'Allies',plane:'fighter',portrait:0,archetype:'Fighter'}],
  WingmanCampaign:{UPGRADES:[],ELITE_UPGRADES:[],SETBACKS:[]},WingmanUIBridge:{}};
 const window={parent,WMART:{},addEventListener(){}};
 new Function('window','document','localStorage','sessionStorage','location',uiSource)(
  window,document,localStorage,sessionStorage,{origin:'https://wingman.test'});
 const click=dataset=>events.click({target:{closest:()=>({dataset})}});
 const change=(key,value)=>events.change({target:{matches:()=>true,dataset:{setting:key},value}});
 return {window,stage,click,change,storage};
}
test('approved v11 supplementary backgrounds and last-loaded stylesheet are present',()=>{
 const html=fs.readFileSync(path.join(root,'wingman-ui/index.html'),'utf8');
 const css=fs.readFileSync(path.join(root,'wingman-ui/menu-v14-v11-art.css'),'utf8');
 assert.match(html,/menu-v14-v11-art\.css/);
 assert.ok(html.indexOf('menu-v14-v11-art.css')>html.indexOf('menu-v13-mobile-flow.css'));
 for(const name of ['title.jpg','personnel.jpg','operations.jpg','campaign.jpg','hangar.webp']){
  const file=path.join(root,'wingman-ui/v11-art',name);
  assert.ok(fs.statSync(file).size>30000, name);
  assert.ok(css.includes('v11-art/'+name),name);
 }
});
test('options cockpit, functional tabs and persistent difficulty/theatre',()=>{
 const t=harness();t.window.WingmanLiveUI.go('options');
 assert.match(t.stage.innerHTML,/wm-v14-console/);
 assert.match(t.stage.innerHTML,/FLIGHT CONFIGURATION/);
 assert.match(t.stage.innerHTML,/data-setting="difficulty"/);
 t.change('difficulty','ace');t.change('theatre','2');
 assert.deepEqual(JSON.parse(t.storage['wingman-ui-flight-presets-v1']),{difficulty:'ace',theatre:'2'});
 t.click({optionTab:'AUDIO'});assert.match(t.stage.innerHTML,/WIRELESS \/ SOUND/);
 assert.match(t.stage.innerHTML,/data-action="sound"/);
 t.click({optionTab:'GRAPHICS'});assert.match(t.stage.innerHTML,/data-action="fullscreen"/);
 t.click({optionTab:'CONTROLS'});assert.match(t.stage.innerHTML,/SPACE — FIRE WEAPONS/);
 t.click({action:'options-reset'});
 assert.equal(t.window.WingmanLiveUI.state.difficulty,'standard');
 assert.equal(t.window.WingmanLiveUI.state.theatre,'0');
});
test('live twelve-rung campaign ladder, selected mission and pilot remain intact',()=>{
 const t=harness();t.window.WingmanLiveUI.go('career');
 assert.match(t.stage.innerHTML,/wm-v13-campaign/);
 assert.equal((t.stage.innerHTML.match(/class="route-map-row /g)||[]).length,12);
 assert.match(t.stage.innerHTML,/campaign-ladder-scroll/);
 assert.match(t.stage.innerHTML,/Test Pilot/);
 t.click({choice:'1'});
 assert.match(t.stage.innerHTML,/ACE HUNT/);
 assert.match(t.stage.innerHTML,/wm-v13-sortie/);
});
test('home navigation keeps existing game actions, rather than prototype simulations',()=>{
 const t=harness();t.window.WingmanLiveUI.go('home');
 assert.match(t.stage.innerHTML,/CHOOSE YOUR/);
 assert.match(t.stage.innerHTML,/data-action="operations"/);
 assert.match(t.stage.innerHTML,/data-action="career"/);
 assert.match(t.stage.innerHTML,/data-action="switch-profile"/);
});

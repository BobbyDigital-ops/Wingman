/* Wingman v0.8.5 — one mission dossier after campaign node selection. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'wingman-ui/ui.js'),'utf8');
function ui(){
 const save={profile:{name:'RAF Test',faction:'Allies',rosterId:'raf-1',plane:'fighter',skill:'roll'},
  wins:2,losses:0,kills:3,records:{},run:{
   rank:2,lives:3,supplies:4,condition:100,effects:[],
   choices:[{id:'enemy-1',label:'Scout',mission:'SCOUT PATROL',risk:'LOW',briefing:'Low route intel',threat:18,timeLimit:115,suppliesAward:1},
    {id:'enemy-2',label:'Ace',mission:'ACE DUEL',risk:'MEDIUM',briefing:'Medium route intel',threat:41,timeLimit:90,suppliesAward:2},
    {id:'enemy-3',label:'Hunter',mission:'ACE HUNT',risk:'HIGH',briefing:'High route intel',threat:78,timeLimit:72,suppliesAward:3}]
  }};
 const events={};const mk=()=>({hidden:false,innerHTML:'',scrollTop:0,textContent:'',style:{setProperty(){}},querySelector(){return null},querySelectorAll(){return []},setAttribute(){}});
 const stage=mk(),elements={};
 const document={documentElement:{style:{setProperty(){}}},querySelector(q){return q==='#stage'?stage:(elements[q]??=mk())},addEventListener:(k,f)=>events[k]=f};
 const parent={WingmanRoster:[{id:'raf-1',name:'RAF Test',faction:'Allies',plane:'fighter',portrait:0}],
  WingmanCampaign:{UPGRADES:[],ELITE_UPGRADES:[],SETBACKS:[]},WingmanUIBridge:{}};
 const window={parent,WMART:{},addEventListener(){}};
 new Function('window','document','localStorage','sessionStorage','location','confirm',src)(window,document,
  {getItem:k=>k==='wingman-road-to-ace-v1'?JSON.stringify(save):null,setItem(){}},{getItem(){return null}},
  {origin:'https://wingman.test'},()=>true);
 return {window,stage,click:dataset=>events.click({target:{closest:()=>({dataset})}}),action:a=>events.click({target:{closest:()=>({dataset:{action:a}})}})};
}
test('selecting a branch node shows only that mission and one opponent dossier',()=>{
 const t=ui();t.window.WingmanLiveUI.go('career');
 assert.equal((t.stage.innerHTML.match(/class="route-map-row /g)||[]).length,12);
 t.click({choice:'2'});
 assert.match(t.stage.innerHTML,/wm-v13-sortie/);
 assert.equal((t.stage.innerHTML.match(/class="wm-v085-sortie-brief"/g)||[]).length,1);
 assert.equal((t.stage.innerHTML.match(/class="compact-rival /g)||[]).length,0);
 for(const expected of ['YOUR SELECTED SORTIE','ACE HUNT','High route intel','HIGH RISK',
  '3 REPAIR SUPPLIES','SELECT AIRCRAFT','VIEW FULL LADDER'])assert.ok(t.stage.innerHTML.includes(expected),expected);
 assert.doesNotMatch(t.stage.innerHTML,/THREE ROUTES · YOUR DECISION|Medium route intel|Low route intel/);
 assert.equal(t.window.WingmanLiveUI.state.choice,2);
});
test('returning to the ladder allows selecting a different mission',()=>{
 const t=ui();t.window.WingmanLiveUI.go('career');t.click({choice:'2'});
 t.action('campaign-map');assert.match(t.stage.innerHTML,/wm-v13-ladder/);
 t.click({choice:'0'});assert.match(t.stage.innerHTML,/SCOUT PATROL/);
 assert.match(t.stage.innerHTML,/Low route intel/);
 assert.equal(t.window.WingmanLiveUI.state.choice,0);
 assert.equal((t.stage.innerHTML.match(/class="wm-v085-sortie-brief"/g)||[]).length,1);
});
test('latest campaign dossier stylesheet is present after v0.8.4 styling',()=>{
 const html=fs.readFileSync(path.join(root,'wingman-ui/index.html'),'utf8');
 const css=fs.readFileSync(path.join(root,'wingman-ui/menu-v16-selected-sortie.css'),'utf8');
 assert.ok(html.indexOf('menu-v16-selected-sortie.css')>html.indexOf('menu-v15-debrief.css'));
 assert.match(css,/wm-v085-sortie-brief/);
 assert.match(css,/service-brief\{display:none!important\}/);
 assert.match(html,/ui\.js\?v=90/);
});

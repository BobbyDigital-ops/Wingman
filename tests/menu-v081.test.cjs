/* Wingman v0.8.1 menu redesign integration regression.
   Uses the real UI script with a minimal DOM and canonical pilot/aircraft IDs. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const raw=fs.readFileSync(path.join(__dirname,'../wingman-ui/ui.js'),'utf8');
function make(save){
 const logs=[],storage={'wingman-road-to-ace-v1':JSON.stringify(save)};
 const mk=()=>({hidden:false,innerHTML:'',style:{setProperty(){}},classList:{add(){},remove(){},contains(){return false}},
  textContent:'',dataset:{},scrollTop:0,clientHeight:640,scrollHeight:640,
  querySelector:()=>null,querySelectorAll:()=>[],getBoundingClientRect:()=>({top:0,height:640}),setAttribute(){}});
 const elements={};for(const id of ['#stage','.nav','.utility-home','.utility-settings','.career-settings-popup','#squadron strong'])elements[id]=mk();
 const events={},document={documentElement:{style:{setProperty(){}}},querySelector:id=>elements[id]||(elements[id]=mk()),
  addEventListener:(name,cb)=>events[name]=cb};
 const roster=[
 {id:'ace-01',name:'Pilot RAF',faction:'Allies',plane:'fighter',portrait:0,signature:'roll',archetype:'Daring',attributes:{}},
 {id:'ace-21',name:'Pilot Axis',faction:'Axis',plane:'bf109',portrait:0,signature:'roll',archetype:'Hunter',attributes:{}}
 ];
 const parent={WingmanRoster:roster,WingmanCampaign:{UPGRADES:[],ELITE_UPGRADES:[],SETBACKS:[]},
  WingmanGame:{aircraftSpecs:()=>({fighter:{speed:83,turn:3.16,armour:40,damage:11},
   bf110:{speed:77,turn:1.90,armour:75,damage:17}})},
  WingmanUIBridge:{
   startArcade:opts=>(logs.push({action:'arcade',opts}),true),
   startCareer:(choice,plane)=>(logs.push({action:'career',choice,plane}),true),
   hide:()=>logs.push({action:'hide'}),
   continueCareer:()=>{},repairCampaignAircraft:()=>false,
   choosePilot:()=>true}};
 const window={parent,WMART:Object.fromEntries(Array.from({length:6},(_,i)=>['aircraft-art-'+i,'asset-'+i+'.jpg'])),
  location:{origin:'https://wingman.test'},addEventListener(){}};
 new Function('window','document','localStorage','location','confirm',raw)(window,document,{
   getItem:key=>storage[key]||null,setItem:(key,value)=>storage[key]=value
 },{origin:'https://wingman.test'},()=>true);
 const click=dataset=>events.click({target:{closest:()=>({dataset})}}),action=name=>click({action:name});
 const change=(setting,value)=>events.change({target:{matches:()=>true,dataset:{setting},value}});
 return {window,elements,logs,storage,click,action,change,body:()=>elements['#stage'].innerHTML};
}
const save={profile:{name:'Pilot RAF',faction:'Allies',rosterId:'ace-01',plane:'fighter',skill:'roll'},
 wins:2,losses:1,kills:2,records:{},service:[],run:null};
test('reference main menu presents Skirmish and King of the Skies',()=>{
 const t=make(save);t.action('opening-start');
 assert.match(t.body(),/CHOOSE YOUR ADVENTURE/);
 assert.match(t.body(),/KING OF/);
 assert.match(t.body(),/data-action="operations"/);
 assert.match(t.body(),/data-action="career"/);
 assert.match(t.body(),/data-action="pilots"/);
});
test('Skirmish operations, RAF/Luftwaffe switching, back and launch preserve settings',()=>{
 const t=make(save);t.action('opening-start');t.action('operations');
 assert.match(t.body(),/01 · MISSION TYPE/);
 t.click({op:'0'});t.change('difficulty','ace');t.change('theatre','2');
 t.action('operations-next');assert.equal(t.window.WingmanLiveUI.state.screen,'aircraft');
 for(let i=0;i<3;i++)assert.ok(t.body().includes('asset-'+i+'.jpg'));
 for(let i=3;i<6;i++)assert.ok(!t.body().includes('asset-'+i+'.jpg'));
 t.click({faction:'Axis'});t.click({plane:'4'});
 for(let i=3;i<6;i++)assert.ok(t.body().includes('asset-'+i+'.jpg'));
 for(let i=0;i<3;i++)assert.ok(!t.body().includes('asset-'+i+'.jpg'));
 assert.match(t.body(),/77/);
 assert.match(t.body(),/1.90/);
 t.action('mission-review');assert.match(t.body(),/BF 110/);
 t.action('back');assert.equal(t.window.WingmanLiveUI.state.plane,4);
 t.action('mission-review');t.action('launch-arcade');
 assert.deepEqual(t.logs[0],{action:'arcade',opts:{mode:'duel',aircraft:'bf110',
  opponent:'random',difficulty:'ace',arena:'2'}});
});
test('campaign locked faction, pilot specialism and handoff remain intact',()=>{
 const data=JSON.parse(JSON.stringify(save));
 data.run={rank:5,lives:2,faction:'Allies',aircraft:'fighter',condition:88,supplies:4,
  effects:[],choices:[{id:'ace-21',mission:'ACE HUNT',label:'Pilot Axis',risk:'HIGH',timeLimit:78,
   types:['bf109'],objective:'ace-hunt',briefing:'Intercept a rival'}]};
 const t=make(data);t.action('opening-start');t.action('career');t.window.WingmanLiveUI.state.choice=0;
 t.action('career-aircraft');assert.equal(t.window.WingmanLiveUI.state.screen,'aircraft');
 assert.match(t.body(),/YOUR ACTIVE SQUADRON/);
 assert.doesNotMatch(t.body(),/data-faction="Axis"/);
 assert.match(t.body(),/SPECIALIST/);
 t.click({plane:'1'});t.action('mission-review');assert.match(t.body(),/ACE HUNT/);
 t.action('launch-career');assert.deepEqual(t.logs[0],{action:'career',choice:0,plane:'heavy'});
});
test('no model art files or canonical aircraft identifiers were replaced',()=>{
 const src=raw;
 assert.match(src,/const TYPES=\['fighter','heavy','bomber','bf109','bf110','he111'\]/);
 assert.match(src,/photo\('aircraft-art-'\+i\)/);
 assert.match(src,/photo\('aircraft-art-'\+S\.plane\)/);
 assert.match(src,/function atlas\(p\)/);
});

/* Phase 9B-E integrated regression: twelve-rung completion, balance, hazards and audio. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const C=require('../src/campaign/king-of-skies.js');
function loaded(){
 const window={WingmanCampaign:C,WingmanGame:{startCampaignFight(enc,plane){this.flight={enc,plane};},showMenu(){}},addEventListener(){}};
 new Function('window',read('src/data/pilot-roster.js'))(window);
 new Function('window',read('src/data/pilot-ai.js'))(window);
 return window;
}
function careerHarness(){
 const window=loaded(),pilot=window.WingmanRoster[0],events={};
 const save={profile:{name:pilot.name,faction:pilot.faction,plane:pilot.plane,rosterId:pilot.id,skill:pilot.signature,characterConfirmed:true},
  wins:0,losses:0,kills:0,completed:0,best:1,medals:[],records:{},service:[],
  run:{faction:pilot.faction,aircraft:pilot.plane,rank:1,lives:3,visits:0,seed:2345,campaignSchema:8,
   choices:null,supplies:2,condition:100,effects:[]}};
 const store={'wingman-road-to-ace-v1':JSON.stringify(save)};
 const storage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;}};
 const mk=id=>({id,hidden:false,classList:{add(){},remove(){}},addEventListener:(n,cb)=>events[id+':'+n]=cb,
  querySelectorAll(){return[]},querySelector(){return null},innerHTML:'',value:''});
 const document={elements:{},getElementById(id){return this.elements[id]??=(mk(id));}};
 new Function('window','document','localStorage','sessionStorage',read('career.js'))(
  window,document,storage,{getItem(){return null}});
 return {window,pilot,readSave:()=>JSON.parse(store['wingman-road-to-ace-v1']),
  click:dataset=>events['career-screen:click']({target:{closest:()=>({dataset})}})};
}
test('twelve campaign rungs finish with a boss and preserve the permanent service record',()=>{
 const t=careerHarness(),lanes=[0,0,1,0,0,0,0,0,0,1,0,0];
 let fights=0,events=0;
 for(let rung=1;rung<=12;rung++){
  const saved=t.readSave(),run=saved.run;assert.equal(run?.rank,rung);
  const lane=lanes[rung-1],enc=run.choices[lane];
  if(enc.isNonCombat){
   const choice=enc.eventOptions.find(opt=>['leave','safe'].includes(opt.id))||enc.eventOptions[0];
   assert.ok(t.window.WingmanCareer.resolveCampaignEvent(lane,choice.id));
   events++;
  }else{
   t.click({choice:String(lane)});
   t.click({sortiePlane:t.pilot.plane});
   t.click({action:'confirm-sortie-aircraft'});
   assert.equal(t.window.WingmanGame.flight?.enc.rank,rung);
   t.window.WingmanCareer.finishEncounter(true,enc,{
    kills:enc.types.length,integrity:.87,remainingSeconds:30
   });
   const after=t.readSave();
   if(after.run?.pendingReward){
    assert.ok(t.window.WingmanCareer.claimReward(after.run.pendingReward.offers[0]));
   }
   t.window.WingmanGame.flight=null;
   fights++;
  }
 }
 const saved=t.readSave();
 assert.equal(saved.completed,1);
 assert.equal(saved.lastCompleted?.rank,12);
 assert.equal(saved.run,null);
 assert.equal(saved.wins,fights);
 assert.equal(saved.service.length,12);
 assert.equal(fights+events,12);
 assert.ok(events>=4);
 assert.equal(saved.profile.rosterId,t.pilot.id);
});
test('regional elites guarantee premium rewards and end in a named twelve-rung boss',()=>{
 const pool=loaded().WingmanRoster.filter(p=>p.faction==='Axis');
 for(const rung of [4,8]){
  for(let lane=0;lane<3;lane++){
   const raw={id:pool[0].id,label:pool[0].name,types:[pool[0].plane],
    opponents:[pool[0]],rank:rung};
   const run={rank:rung,faction:'Allies',seed:7,visits:0,effects:[],supplies:0,condition:100};
   const enc=C.decorateEncounter(raw,run,lane,{pool,profile:p=>({...p})});
   assert.equal(enc.eliteEncounter,true);
   assert.equal(enc.nodeType,'elite');
   C.settle(run,enc,true,1);
   assert.equal(run.pendingReward.setback,null);
   assert.ok(run.pendingReward.offers.some(id=>C.ELITE_UPGRADES.some(perk=>perk.id===id)));
  }
 }
 for(let lane=0;lane<3;lane++){
  const run={rank:12,faction:'Allies',seed:7,visits:0};
  assert.equal(C.nodeTypeFor(run.rank,lane),'boss');
 }
});
test('pilot stat growth is twelve-rung and does not double-apply at launch',()=>{
 const w=loaded(),p=w.WingmanRoster[0];
 const first=w.WingmanPilotAI.level(p,1),last=w.WingmanPilotAI.level(p,12);
 assert.ok(last.attributes.gunnery>=first.attributes.gunnery);
 assert.equal(last.rank,12);
 const reused=w.WingmanPilotAI.level({...p,attributes:last.attributes,scaledForRank:12},12);
 assert.deepEqual(reused.attributes,last.attributes);
});
test('weather modifiers are symmetric and announced, not arbitrary hidden stat boosts',()=>{
 const pool=loaded().WingmanRoster.filter(p=>p.faction==='Axis'),lead=pool[0];
 const mission=(rank,lane)=>C.decorateEncounter(
  {id:lead.id,label:lead.name,rank,types:[lead.plane],opponents:[lead]},
  {rank,seed:2026,faction:'Allies',visits:0},lane,{pool,profile:p=>p});
 assert.equal(mission(9,2).hazard,'crosswind');
 assert.equal(mission(6,0).hazard,'haze');
 const game=read('game.js');
 assert.match(game,/state\.campaignEncounter\?\.hazard==='crosswind'/);
 assert.match(game,/state\.campaignEncounter\?\.hazard==='haze'/);
 assert.match(game,/state\.wind=\{active:true,base:gust,current:gust,elapsed:0\}/);
});
test('volume defaults to unmuted full level, persists changes and respects mute',()=>{
 const w={location:{search:''}},store={};
 const document={getElementById(){return null;}};
 const storage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;}};
 new Function('window','document','localStorage',read('src/audio/soundscape.js'))(w,document,storage);
 assert.equal(w.WingmanAudio.volume,1);
 assert.equal(w.WingmanAudio.setVolume(.35),.35);
 assert.equal(store['wingman-audio-volume'],'0.35');
 w.WingmanAudio.setMuted(true);
 assert.equal(w.WingmanAudio.muted,true);
 assert.equal(w.WingmanAudio.setVolume(1.5),1);
 assert.equal(w.WingmanAudio.setVolume(-2),0);
});
test('audio and visual settings connect to existing interfaces without replacing art',()=>{
 const ui=read('wingman-ui/ui.js'),bridge=read('src/ui/wingman-bridge.js'),
  html=read('wingman-ui/index.html'),source=read('index.html');
 for(const key of ['data-audio-volume','wm-v9-volume','data-action="sound"','data-action="fullscreen"'])
  assert.ok(ui.includes(key),key);
 assert.match(bridge,/setAudioVolume\(v\)/);
 assert.match(bridge,/getAudioSettings\(\)/);
 assert.match(html,/menu-v18-phase9\.css/);
 assert.match(source,/wingman-bridge\.js/);
 assert.match(ui,/photo\('aircraft-art-'\+S\.plane\)/);
});

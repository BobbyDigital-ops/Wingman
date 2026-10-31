/* Phase 9A: twelve-rung campaign, mixed encounters, resources and UI guards. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const C=require('../src/campaign/king-of-skies.js');
const choice=(rank,lane,faction='Allies')=>{
 const run={rank,seed:2026,visits:0,faction,condition:73,supplies:4,effects:[]};
 const foe={id:'foe',name:'Enemy',plane:faction==='Allies'?'bf109':'fighter',attributes:{manoeuvrability:75,gunnery:75,engine:75}};
 const enc={id:foe.id,label:foe.name,rank,types:[foe.plane],opponents:[foe],finalBoss:rank===12,wingmen:[]};
 return {run,enc:C.decorateEncounter(enc,run,lane,{pool:[foe],profile:p=>p})};
};
test('12 nodes span three regions; bosses remain combat and other tiers offer alternatives',()=>{
 assert.equal(C.MAX_RANK,12);
 assert.equal(C.REGIONS.length,3);
 for(let rank=1;rank<=12;rank++){
  for(let lane=0;lane<3;lane++){
   const {enc}=choice(rank,lane);
   assert.equal(enc.nodeType,C.nodeTypeFor(rank,lane));
   assert.equal(enc.region,C.REGIONS[Math.floor((rank-1)/4)]);
   assert.equal(enc.isNonCombat===true,!!C.EVENT_DESCRIPTIONS?.[enc.nodeType]||
    ['supply','intel','event','shop','dice'].includes(enc.nodeType));
  }
 }
 for(const rank of [4,8,12]){
  for(let lane=0;lane<3;lane++){
   const {enc}=choice(rank,lane);
   assert.equal(enc.isNonCombat,true?undefined:false);
   assert.ok(enc.types.length>=1);
  }
 }
});
test('supplies and repairs resolve without a flight, and cannot be replayed with an invalid action',()=>{
 const {run,enc}=choice(2,0);assert.equal(enc.isNonCombat,true);
 const next=C.resolveEvent(run,enc,'crate');
 assert.equal(next.suppliesDelta,3);assert.equal(run.supplies,7);
 assert.equal(C.resolveEvent(run,enc,'nonsense'),null);
 assert.equal(run.eventHistory.length,1);
});
test('quartermaster purchases respect supplies and cannot run negative',()=>{
 const {run,enc}=choice(5,0);
 run.supplies=1;assert.equal(C.resolveEvent(run,enc,'guns'),null);
 assert.equal(run.supplies,1);
 assert.ok(C.resolveEvent(run,enc,'leave'));
 assert.equal(run.supplies,1);
});
test('event gamble is deterministic for a given run and never exceeds supply cap',()=>{
 const a=choice(5,2),b=choice(5,2);
 const ra=C.resolveEvent(a.run,a.enc,'roll'),rb=C.resolveEvent(b.run,b.enc,'roll');
 assert.deepEqual(ra,rb);assert.ok(a.run.supplies>=0&&a.run.supplies<=12);
});
test('older pilots and source art remain compatible; the selected event is never a combat launch',()=>{
 const career=fs.readFileSync(path.join(root,'career.js'),'utf8');
 const ui=fs.readFileSync(path.join(root,'wingman-ui/ui.js'),'utf8');
 const bridge=fs.readFileSync(path.join(root,'src/ui/wingman-bridge.js'),'utf8');
 assert.match(career,/MAX_RANK=12/);
 assert.match(career,/campaignSchema=9/);
 assert.match(career,/resolveCampaignEvent/);
 assert.match(bridge,/resolveCampaignEvent/);
 assert.match(ui,/data-event-option/);
 assert.match(ui,/if\(v==='career-aircraft'\)\{if\(!playerSave\(\)\?\.run\|\|playerSave\(\)\.run\.choices\?\.\[S\.choice\]\?\.isNonCombat\)return/);
 assert.match(ui,/function atlas\(p\)/);
 assert.match(ui,/const TYPES=\['fighter','heavy','bomber','bf109','bf110','he111'\]/);
});

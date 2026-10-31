/* Phase 9F: connected missions, reinforcements, bomber defence and visible debriefs. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const C=require('../src/campaign/king-of-skies.js');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const enemy=[
 {id:'bf109-ace',name:'Enemy Fighter',plane:'bf109',attributes:{engine:76,manoeuvrability:76,gunnery:76}},
 {id:'bf110-ace',name:'Enemy Heavy',plane:'bf110',attributes:{engine:73,manoeuvrability:73,gunnery:76}},
 {id:'he111-ace',name:'Enemy Bomber',plane:'he111',attributes:{engine:66,manoeuvrability:61,gunnery:64}}
];
function mission(rank,lane){
 const run={rank,faction:'Allies',seed:778,visits:0,condition:100,supplies:3,effects:[]};
 const final=rank===12,foes=final?enemy:[enemy[0]];
 const raw={rank,id:foes[0].id,label:foes[0].name,types:foes.map(p=>p.plane),
  opponents:foes,wingmen:final?foes.slice(0,2):[],finalBoss:final};
 return C.decorateEncounter(raw,run,lane,{pool:enemy,profile:p=>({...p,attributes:{...p.attributes}})});
}
test('Routes depend on the previous lane and all three paths reach one final boss',()=>{
 assert.deepEqual(C.reachableLanes(null,1),[0,1,2]);
 assert.deepEqual(C.reachableLanes(0,3),[0,1]);
 assert.deepEqual(C.reachableLanes(1,3),[0,1,2]);
 assert.deepEqual(C.reachableLanes(2,3),[1,2]);
 for(let lane=0;lane<3;lane++)assert.deepEqual(C.reachableLanes(lane,12),[1]);
 for(let lane=0;lane<3;lane++)assert.equal(mission(12,lane).finalBoss,true);
});
test('Mandatory fight rungs cannot be bypassed by picking a noncombat lane',()=>{
 for(const rank of [1,3,4,6,8,10,12]){
  assert.ok([0,1,2].every(l=>!mission(rank,l).isNonCombat),String(rank));
 }
 const easy=mission(1,0),hard=mission(1,2);
 assert.equal(easy.types.length,1);
 assert.equal(hard.types.length,2);
 assert.ok(hard.threat>easy.threat);
 assert.equal(hard.risk,'HIGH');
 assert.equal(hard.rewardTier,2);
});
test('Escort explicitly protects the bomber, with successive thirty/fifty-three second waves',()=>{
 const enc=mission(7,1);
 assert.equal(enc.objective,'escort');
 assert.equal(enc.escortType,'bomber');
 assert.equal(enc.types.length,2);
 assert.deepEqual(enc.reinforcements.map(w=>w.at),[30,53]);
 assert.equal(enc.totalEnemyThreat,4);
 assert.match(enc.missionGoal,/Keep the damaged bomber alive/);
});
test('Intelligence carrier is the marked bomber, escorted by fighter and timed backup',()=>{
 for(const [rank,lane] of [[6,2],[11,1]]){
  const enc=mission(rank,lane);
  assert.equal(enc.objective,'intel-hunt');
  assert.equal(enc.priorityTargetIndex,0);
  assert.equal(enc.types[0],'he111');
  assert.equal(enc.types[1],'bf109');
  assert.equal(enc.reinforcements[0].at,30);
  assert.match(enc.missionGoal,/escorts are optional/);
 }
});
test('Four-round enhanced rear-gunner burst still uses physical bullets and a cooldown',()=>{
 const s=read('game.js');
 assert.match(s,/p\.rearShots=4/);
 assert.match(s,/p\.rearCooldown=2\.30/);
 assert.match(s,/owner:p\.id,damage:3\.5,life:1\.08,age:0,rearGun:true/);
 assert.match(s,/range<158/);
 assert.match(s,/rearTarget/);
});
test('Combat code uses timed waves, bomber-focused pursuit and objective-based completion',()=>{
 const s=read('game.js');
 assert.match(s,/function summonCampaignBackup\(dt\)/);
 assert.match(s,/summonCampaignBackup\(dt\);/);
 assert.match(s,/Math\.max\(0,3-living\)/);
 assert.match(s,/targets\.find\(q=>q\.escortProtected&&q\.alive\)/);
 assert.match(s,/p\.priorityCarrier&&state\.fliers\[0\]\?\.alive/);
 assert.match(s,/campaignBackupPending\(\)/);
 assert.match(s,/p\.aiManeuver='HIGH YO-YO'/);
 assert.match(s,/p\.aiManeuver='LAG PURSUIT'/);
 assert.match(s,/contactRows\(friendly,false\);contactRows\(hostile,true\);/);
});
test('Debrief contains real per-sortie statistics before the reward step',()=>{
 const career=read('career.js'),ui=read('wingman-ui/ui.js');
 for(const field of ['damageDealt','damageTaken','reinforcements','alliesLost','shots','hits','secondsElapsed'])
  assert.ok(career.includes(field),'missing saved '+field);
 assert.match(ui,/outcomeStep==='reward'/);
 assert.match(ui,/data-action="review-rewards"/);
 assert.match(ui,/wm-v9f-sortie-stats/);
 assert.match(ui,/AIRCRAFT BUILD/);
 assert.match(ui,/if\(v==='back-to-ladder'\)/);
});

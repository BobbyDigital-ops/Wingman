const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function init(){
 const window={};
 for(const f of ['src/data/pilot-roster.js','src/data/pilot-ai.js'])
  vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),{window,console},{filename:f,timeout:3000});
 return window;
}
test('all 40 defined pilots have stable combat identities and individual attribute combinations',()=>{
 const w=init(),roster=w.WingmanRoster,profiles=roster.map(p=>w.WingmanPilotAI.identity(p));
 assert.equal(roster.length,40);
 assert.equal(roster.filter(p=>p.faction==='Allies').length,20);
 assert.equal(roster.filter(p=>p.faction==='Axis').length,20);
 assert.equal(new Set(profiles.map(p=>p.id)).size,40);
 assert.equal(new Set(profiles.map(p=>p.aggression+','+p.evasion+','+p.patience+','+p.signature)).size,40);
 assert.equal(new Set(profiles.map(p=>p.tactic)).size,8);
 for(const p of profiles){
  const again=w.WingmanPilotAI.identity({id:p.id});
  assert.equal(p.tactic,again.tactic);
  assert.equal(p.signature,again.signature);
  assert.equal(p.name,again.name);
  assert.ok(p.aggression>=.2&&p.aggression<=.98);
 }
});
test('the same pilot grows each stat monotonically from rank one to eight without changing their identity',()=>{
 const w=init();
 for(const pilot of w.WingmanRoster){
  let previous=w.WingmanPilotAI.level(pilot,1);
  for(let rank=2;rank<=8;rank++){
   const next=w.WingmanPilotAI.level(pilot,rank);
   for(const k of ['manoeuvrability','gunnery','engine']){
    assert.ok(next.attributes[k]>=previous.attributes[k],pilot.name+' '+k+' dropped on rank '+rank);
    assert.ok(next.attributes[k]>=35&&next.attributes[k]<=95);
   }
   assert.equal(next.id,previous.id);
   assert.equal(next.name,previous.name);
   assert.equal(next.tactic,previous.tactic);
   assert.equal(next.signature,previous.signature);
   assert.ok(next.reaction<=previous.reaction);
   assert.ok(next.lead>=previous.lead);
   previous=next;
  }
 }
});
test('same rank never erases a pilot’s signature strengths; three personality contrasts remain',()=>{
 const w=init(),list=w.WingmanRoster;
 const ace=list.find(p=>p.archetype==='Sharpshooter');
 const survivor=list.find(p=>p.archetype==='Evasive');
 const brawler=list.find(p=>p.archetype==='Brawler');
 assert.equal(w.WingmanPilotAI.level(ace,6).tactic,'sniper');
 assert.equal(w.WingmanPilotAI.level(survivor,6).tactic,'survivor');
 assert.equal(w.WingmanPilotAI.level(brawler,6).tactic,'brawler');
 assert.ok(w.WingmanPilotAI.level(ace,6).patience>w.WingmanPilotAI.level(brawler,6).patience);
 assert.ok(w.WingmanPilotAI.level(survivor,6).evasion>w.WingmanPilotAI.level(ace,6).evasion);
});

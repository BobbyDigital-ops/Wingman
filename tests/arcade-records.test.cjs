const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/data/arcade-records.js'),'utf8');
function launch(store=new Map()){
 const view={innerHTML:''};
 const document={readyState:'complete',getElementById:id=>id==='arcade-records'?view:null};
 const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))};
 const window={};
 vm.runInNewContext(source,{document,window,localStorage,console},{timeout:3000});
 return {api:window.WingmanArcade,store,view};
}
function sortie(mode,won=true,extra={}){
 return {mode,won,score:1000,kills:3,waves:0,seconds:80,shots:30,hits:9,damageTaken:25,
  aircraft:'fighter',difficulty:'standard',...extra};
}
test('Phase 6 arcade high scores and achievements survive a full page reload',()=>{
 const a=launch();
 let result=a.api.finish(sortie('duel',true,{score:750,damageTaken:0}));
 assert.ok(result.awards.includes('FIRST SORTIE'));
 assert.ok(result.awards.includes('ACE IN THE HOLE'));
 assert.ok(result.awards.includes('NOT A SCRATCH'));
 a.api.finish(sortie('duel',false,{score:300}));
 a.api.finish(sortie('duel',true,{score:1200}));
 assert.equal(a.api.data.total,3);
 assert.equal(a.api.data.wins,2);
 assert.equal(a.api.data.losses,1);
 assert.equal(a.api.top('duel'),1200);
 assert.equal(a.api.board('duel').length,3);
 assert.ok(a.view.innerHTML.includes('FIRST SORTIE'));
 const b=launch(a.store);
 assert.equal(b.api.data.total,3);
 assert.equal(b.api.top('duel'),1200);
 assert.equal(b.api.data.unlocks.length,3);
});
test('Phase 6 Survival earns threshold honours at exact cleared-wave boundaries',()=>{
 const a=launch();
 a.api.finish(sortie('survival',false,{waves:2,score:550}));
 assert.ok(!a.api.data.unlocks.includes('survive-3'));
 a.api.finish(sortie('survival',false,{waves:3,score:860}));
 assert.ok(a.api.data.unlocks.includes('survive-3'));
 a.api.finish(sortie('survival',false,{waves:5,score:1800}));
 assert.ok(a.api.data.unlocks.includes('survive-5'));
 a.api.finish(sortie('survival',false,{waves:10,score:4000}));
 assert.ok(a.api.data.unlocks.includes('survive-10'));
 assert.equal(a.api.data.bestSurvival,10);
});
test('Phase 6 special challenges only award medals for actual wins',()=>{
 const a=launch();
 for(const [id,award] of [['intercept','challenge-ace'],['crosswind','challenge-wind'],
 ['noarmour','challenge-armour'],['heavy','challenge-heavy']]){
  a.api.finish(sortie('challenge',false,{challenge:id,score:0}));
  assert.ok(!a.api.data.unlocks.includes(award));
  a.api.finish(sortie('challenge',true,{challenge:id,score:850}));
  assert.ok(a.api.data.unlocks.includes(award));
 }
 assert.equal(a.api.top('challenge'),850);
 assert.equal(a.api.data.records.length,8);
});
test('Phase 6 score input is bounded, never submitted remotely and safely handles corrupted saved data',()=>{
 const store=new Map([['wingman-arcade-v1','{not-json}']]);
 const a=launch(store);
 assert.equal(a.api.data.total,0);
 const outcome=a.api.finish(sortie('teams',true,{score:Infinity,kills:-5,shots:99999999}));
 assert.equal(outcome.record.score,0);
 assert.equal(outcome.record.kills,0);
 assert.equal(outcome.record.shots,999999);
 assert.equal(a.api.data.total,1);
 assert.ok(a.api.data.unlocks.includes('true-wingman'));
 assert.equal(a.api.board('teams').length,1);
 assert.ok(!a.view.innerHTML.includes('<script>'));
});

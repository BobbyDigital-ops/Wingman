const test=require('node:test');
const assert=require('node:assert/strict');
const {tournament,types}=require('./balance-tournament.cjs');

// Intentionally short: full 720-fixture tournaments are a manual balance gate,
// while this regression gate ensures determinism and real-engine telemetry.
test('mirrored 6-aircraft tournament runs actual projectile/AI physics deterministically',()=>{
 const opts={reps:1,seconds:12,wind:'off',arenaFilter:'alpine',difficultyFilter:'standard'};
 const first=tournament(opts),second=tournament(opts);
 assert.equal(first.meta.games,30);
 assert.equal(JSON.stringify(first.matches),JSON.stringify(second.matches),'identical seeded fixtures must yield identical flight results');
 assert.equal(Object.keys(first.pairs).length,15);
 assert.ok(first.matches.every(x=>!x.bad&&Number.isFinite(x.seconds)&&x.seconds>0));
 assert.ok(first.matches.some(x=>x.hits[0]+x.hits[1]>0),'real bullets must strike at least one aircraft');
 assert.ok(first.matches.some(x=>x.shots[0]+x.shots[1]>0),'both AI sides must fire their actual guns');
 for(const kind of types){
  const row=first.summary[kind];
  assert.equal(row.played,10,'every aircraft must face each of the other five in both positions');
  assert.equal(row.wins+row.losses+row.draws,row.played);
  assert.ok(row.accuracyPct>=0&&row.accuracyPct<=100);
  assert.ok(Number.isFinite(row.avgDamage));
 }
});
test('wind-on flight benchmark can run without nonfinite physics',()=>{
 const result=tournament({reps:1,seconds:9,wind:'on',arenaFilter:'coast',difficultyFilter:'ace'});
 assert.equal(result.matches.length,30);
 assert.ok(result.matches.every(x=>!x.bad && x.wind));
});

test('G3A: bomber cruise avoids suicidal dives without disabling bomb runs',()=>{
 const result=tournament({reps:1,seconds:55,wind:'off',arenaFilter:'alpine',difficultyFilter:'standard'});
 assert.equal(result.meta.games,30);
 assert.ok(result.matches.every(x=>!x.bad),'no nonfinite flight states');
 for(const type of ['bomber','he111']){
   const bomber=result.summary[type];
   assert.ok(bomber.groundPct<=10, type+' must not repeatedly crash under normal combat');
   assert.ok(bomber.bombs>0, type+' must still perform real bomb runs');
 }
});
test('G3A: severe crosswind remains physically stable',()=>{
 const result=tournament({reps:1,seconds:45,wind:'on',arenaFilter:'storm',difficultyFilter:'ace'});
 assert.equal(result.meta.games,30);
 assert.ok(result.matches.every(x=>!x.bad),'wind caused invalid physics');
 assert.ok(result.summary.bomber.groundPct<=15);
 assert.ok(result.summary.he111.groundPct<=15);
});

test('G3A.1 bomber pilots perform real evasive flight without losing bomb runs',()=>{
 const result=tournament({reps:1,seconds:55,wind:'off',arenaFilter:'alpine',difficultyFilter:'standard'});
 assert.equal(result.meta.games,30);
 assert.ok(result.matches.every(x=>!x.bad),'evasive steering must remain physically stable');
 for(const type of ['bomber','he111']){
   const rows=result.matches.filter(m=>m.a===type||m.b===type);
   const frames=rows.reduce((sum,m)=>sum+(m.a===type?m.evadeFrames[0]:m.evadeFrames[1]),0);
   assert.ok(frames>90,type+' must visibly evade fighters rather than cruise straight');
   assert.equal(result.summary[type].ground,0,type+' must not reintroduce routine crashes');
   assert.ok(result.summary[type].bombs>=10,type+' must still execute actual bombing runs');
 }
});

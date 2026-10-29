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

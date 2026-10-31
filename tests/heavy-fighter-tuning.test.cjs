/* Heavy fighter handling regression — keep a lively but distinct two-engine aircraft. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
const physics=fs.readFileSync(path.join(root,'src/physics/swoop-flight.js'),'utf8');
function craft(name){
 const found=game.match(new RegExp(name+':\\{name:[^\\n]+?speed:(\\d+),turn:([\\d.]+),hull:(\\d+),armour:(\\d+)'));
 assert.ok(found,'Missing '+name+' from production balance table');
 return {speed:+found[1],turn:+found[2],hull:+found[3],armour:+found[4]};
}
const w={};new Function('window',physics)(w);
const model=w.WingmanFlightPhysics;
test('Beaufighter and Bf 110 run faster but remain less agile than light fighters',()=>{
 const spit=craft('fighter'),beau=craft('heavy'),emil=craft('bf109'),bf110=craft('bf110');
 assert.equal(beau.speed,83);
 assert.equal(beau.turn,2.42);
 assert.equal(bf110.speed,85);
 assert.equal(bf110.turn,2.35);
 assert.ok(beau.turn<spit.turn,'Spitfire must retain agility advantage');
 assert.ok(bf110.turn<emil.turn,'Bf109 must retain agility advantage');
 for(const name of ['heavy','bf110']){
  const c=craft(name);
  assert.ok(c.hull>=150&&c.armour>=70,'Heavy fighter protection preserved');
 }
});
test('Heavy fighter roll response is faster than bomber but slower than single-engine fighter',()=>{
 const h=model.profiles.heavy,f=model.profiles.fighter,b=model.profiles.bomber;
 assert.equal(h.rollResponse,6.4);assert.equal(h.flightTurn,1.77);
 assert.equal(h.velocityResponse,2.85);
 assert.ok(h.rollResponse<f.rollResponse&&h.rollResponse>b.rollResponse);
 assert.ok(h.flightTurn<f.flightTurn&&h.flightTurn>b.flightTurn);
 assert.ok(model.turnBlend({role:'heavy'},1/60)>model.turnBlend({role:'bomber'},1/60));
});
test('Fast heavy-fighter cruise keeps smooth finite momentum through a turning arc',()=>{
 const beau=craft('heavy');
 const p={type:'heavy',role:'heavy',d:{speed:beau.speed},speed:beau.speed,angle:1.2,vx:beau.speed,vy:0};
 const initial=Math.atan2(p.vy,p.vx);
 const turning=model.desiredTurn(p,beau.turn);
 assert.ok(turning>1.3&&turning<2.2,'Heavy nose turn must be useful without instant pivots');
 for(let n=0;n<45;n++)model.advanceVelocity(p,1/60,false);
 const newDirection=Math.atan2(p.vy,p.vx);
 assert.ok(Number.isFinite(p.vx)&&Number.isFinite(p.vy));
 assert.ok(newDirection>initial+.5,'Velocity follows the nose through a real turning arc');
 assert.ok(newDirection<p.angle,'Aircraft retains reasonable inertial slip');
 assert.ok(Math.abs(Math.hypot(p.vx,p.vy)-beau.speed)<.01,'Speed remains stable while changing direction');
});

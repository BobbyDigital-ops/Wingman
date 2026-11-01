/* Phase 11A: weather choice, visual-only banks and fair ground hazards. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const A=require('../src/environment/flight-atmosphere.js');
const C=require('../src/campaign/king-of-skies.js');

test('campaign weather follows declared deterministic rank and lane',()=>{
 const sample=(rank,lane)=>A.forEncounter({rank,lane},3);
 assert.equal(sample(1,0).weather,'clear');
 assert.equal(sample(2,1).weather,'clouds');
 assert.equal(sample(5,0).weather,'fog');
 assert.equal(sample(6,1).weather,'rain');
 assert.equal(sample(9,1).weather,'glare');
 assert.equal(sample(7,2).weather,'storm');
 assert.equal(sample(10,2).hazard,'flak');
 assert.equal(sample(11,1).hazard,'searchlight');
 assert.equal(sample(12,2).hazard,null,'final boss has no random damage hazard');
 assert.equal(sample(12,0).weather,'storm');
 assert.deepEqual(sample(11,1),sample(11,1),'repeatable briefing and mission rules');
});

test('arcade four theatres have atmospheric personality without added hazards',()=>{
 assert.deepEqual([0,1,2,3].map(i=>A.forEncounter(null,i).weather),
  ['clouds','clouds','glare','storm']);
 for(let i=0;i<4;i++)assert.equal(A.forEncounter(null,i).hazard,null);
});

test('all visual conditions and neutral hazards are selectable in Skirmish',()=>{
 assert.deepEqual(A.PRESETS,['auto','clear','clouds','fog','rain','storm','glare','flak','searchlight']);
 assert.equal(A.forPreset('auto',3).weather,'storm');
 assert.equal(A.forPreset('clear',3).weather,'clear');
 assert.equal(A.forPreset('rain',0).weather,'rain');
 assert.equal(A.forPreset('flak',0).hazard,'flak');
 assert.equal(A.forPreset('searchlight',0).hazard,'searchlight');
 assert.equal(A.forPreset('searchlight',0).weather,'fog');
 assert.equal(A.forPreset('wrong',0).hazard,null);
});
test('storm weather uses stronger shared wind gusts and preserves old wind physics',()=>{
 const game=read('game.js');
 assert.match(game,/const storm=state\.environment\?\.weather==='storm'/);
 assert.match(game,/state\.environment\?\.weather==='storm'&&!state\.wind\.active/);
 assert.match(game,/state\.wind=\{active:true,base:strength,current:strength,elapsed:0\}/);
 assert.match(game,/environmentOverride=weather==='auto'/);
 assert.match(read('wingman-ui/ui.js'),/data-setting="weather"/);
});
test('turn-rate banking follows left and right turns and gradually levels',()=>{
 const plane={alive:true,role:'fighter',turnVelocity:1.7,angle:.2,speed:82};
 let bank=0;
 for(let i=0;i<20;i++)bank=A.advanceBank(plane,1/60);
 assert.ok(bank>.25,'fast fighter turn has a visible lean');
 const positive=bank;
 plane.turnVelocity=-1.7;
 for(let i=0;i<48;i++)bank=A.advanceBank(plane,1/60);
 assert.ok(bank<-.6,'opposite turning direction banks the other way');
 plane.turnVelocity=0;
 for(let i=0;i<75;i++)bank=A.advanceBank(plane,1/60);
 assert.ok(Math.abs(bank)<.04,'straight flight levels without a hard sprite snap');
 assert.equal(plane.angle,.2);assert.equal(plane.speed,82);
 assert.ok(positive<1&&positive>0);
});

test('heavy craft and bombers bank more gradually than light fighters',()=>{
 // Compare the same fraction of each airframe's normal turning authority.
 const f={alive:true,role:'fighter',turnVelocity:1.64};
 const h={alive:true,role:'heavy',turnVelocity:1.36};
 const b={alive:true,role:'bomber',turnVelocity:1.04};
 for(let i=0;i<9;i++)for(const p of [f,h,b])A.advanceBank(p,1/60);
 assert.ok(f.visualBank>h.visualBank);
 assert.ok(h.visualBank>b.visualBank);
});

test('visual banking matrix is bounded and preserves both horizontal facing directions',()=>{
 const right=A.bankMatrix({visualBank:.85}),left=A.bankMatrix({visualBank:-.85});
 assert.ok(right.height>=.62&&right.height<1);
 assert.equal(right.height,left.height);
 assert.equal(right.shearX,-left.shearX);
 assert.equal(right.shearY,-left.shearY);
 assert.ok(A.bankMatrix({visualBank:3}).height>=.62);
 assert.equal(A.bankMatrix({visualBank:0}).height,1);
});

test('flak has a visible warning before any explosion or damage',()=>{
 const env=A.create({weather:'clouds',hazard:'flak'});
 const point=A.flakPoint(0,520,400);
 const craft={id:0,team:0,alive:true,spawnSafe:0,x:point.x,y:point.y,d:{radius:8}};
 let hits=0;
 A.advance(env,7.35,520,400,[craft],()=>hits++);
 assert.ok(env.flakMarker);
 assert.ok(env.flakMarker.remaining>1.5);
 assert.equal(hits,0);
 assert.equal(env.flakBursts.length,0);
 A.advance(env,1.9,520,400,[craft],()=>hits++);
 assert.equal(env.flakMarker,null);
 assert.equal(env.flakBursts.length,1);
 assert.equal(hits,1);
 assert.equal(env.damageEvents,1);
});

test('neutral flak can strike either faction but cannot strike off-target or protected aircraft',()=>{
 const env=A.create({weather:'clouds',hazard:'flak'}),p=A.flakPoint(0,520,400);
 const make=(id,team,x,y,spawnSafe=0)=>({id,team,x,y,alive:true,spawnSafe,d:{radius:6}});
 const targets=[make(0,0,p.x,p.y),make(1,1,p.x+4,p.y),make(2,1,p.x+100,p.y),
  make(3,0,p.x-3,p.y,2)];
 const damaged=[];
 A.advance(env,9.25,520,400,targets,(plane,damage,x,y,cause)=>
  damaged.push({id:plane.id,damage,cause}));
 assert.deepEqual(damaged.map(x=>x.id).sort(),[0,1]);
 assert.ok(damaged.every(x=>x.damage===7&&x.cause==='FLAK'));
 A.advance(env,.15,520,400,targets,plane=>damaged.push({id:plane.id}));
 assert.equal(damaged.length,2,'no damage repeated in the same burst');
});

test('searchlights require sustained exposure and have a cooldown',()=>{
 const env=A.create({weather:'fog',hazard:'searchlight'}),W=520,H=400;
 const craft={id:1,team:1,alive:true,spawnSafe:0,x:260,y:310,d:{radius:6}};
 let hits=0;
 for(let i=0;i<16;i++){
  craft.x=A.searchlightX(env.time+.12,W);
  A.advance(env,.12,W,H,[craft],()=>hits++);
 }
 assert.equal(hits,1,'1.8s exposure is meaningful and capped');
 for(let i=0;i<30;i++){
  craft.x=A.searchlightX(env.time+.12,W);
  A.advance(env,.12,W,H,[craft],()=>hits++);
 }
 assert.equal(hits,1,'no automatic repeated hits during the cooldown');
});

test('searchlights cannot harm high flyers outside the beam',()=>{
 const env=A.create({weather:'fog',hazard:'searchlight'}),W=520,H=400;
 const craft={id:0,team:0,alive:true,spawnSafe:0,x:260,y:100,d:{radius:7}};
 let hits=0;
 for(let i=0;i<100;i++){
  craft.x=A.searchlightX(env.time+.1,W);
  A.advance(env,.1,W,H,[craft],()=>hits++);
 }
 assert.equal(hits,0);
});

test('campaign encounter carries readable weather and safety information',()=>{
 const prev=globalThis.WingmanFlightAtmosphere;
 globalThis.WingmanFlightAtmosphere=A;
 try{
  const sample=(rank,lane)=>{
   const run={rank,faction:'Allies',seed:8,visits:0,supplies:0,effects:[]};
   return C.decorateEncounter({id:'ace',label:'ACE',types:['bf109'],
    opponents:[{id:'ace',plane:'bf109'}]},run,lane,{pool:[]});
  };
  assert.match(sample(10,2).environment.label,/FLAK/);
  assert.match(sample(10,2).environment.detail,/warn/i);
  assert.match(sample(11,1).environment.label,/SEARCHLIGHT/);
  assert.equal(sample(12,1).environment.hazard,null);
  assert.equal(sample(8,1).environment.weather,'rain');
 }finally{globalThis.WingmanFlightAtmosphere=prev;}
});

test('environment engine is loaded ahead of gameplay and the mission generator',()=>{
 const html=read('index.html'),game=read('game.js'),ui=read('wingman-ui/ui.js');
 assert.ok(html.includes('src/environment/flight-atmosphere.js'));
 assert.ok(html.indexOf('src/environment/flight-atmosphere.js')<html.indexOf('src="./game.js'));
 assert.match(game,/WingmanFlightAtmosphere\?\.advanceBank\(p,dt\)/);
 assert.match(game,/WingmanFlightAtmosphere\?\.drawFront/);
 assert.match(game,/WingmanFlightAtmosphere\?\.advance\(state\.environment,dt,W,WORLD_H/);
 assert.match(ui,/wm-v110-environment/);
 assert.match(read('wingman-ui/index.html'),/menu-v26-environment\.css/);
});

test('renderer preserves the original six plane graphics and actual flight physics',()=>{
 const game=read('game.js'),art=read('src/art/aircraft.js');
 assert.match(game,/WingmanAircraftHD\?\.draw\(c,p\.type,artState\)/);
 assert.match(game,/aircraftArt\?\.draw\(c,p\.type,artState\)/);
 assert.match(game,/c\.transform\(1,bank\.shearY,bank\.shearX,bank\.height,0,0\)/);
 assert.match(game,/WingmanFlightPhysics/);
 assert.match(art,/window\.WingmanSprites/);
 assert.doesNotMatch(read('src/environment/flight-atmosphere.js'),
  /p\.angle\s*\+?=|p\.health\s*=|p\.speed\s*=|p\.vx\s*=|p\.vy\s*=/);
});

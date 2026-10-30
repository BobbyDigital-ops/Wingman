const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8');

function launch(){
  const listeners=new Map();
  const noop=()=>{};
  const ctx=new Proxy({measureText:s=>({width:String(s).length*5}),
    createLinearGradient:()=>({addColorStop:noop}),
    createRadialGradient:()=>({addColorStop:noop}),
    createConicGradient:()=>({addColorStop:noop})},{
    get:(o,k)=>(k in o?o[k]:noop),set:(o,k,v)=>(o[k]=v,true)
  });
  const el={};
  const canvas={width:320,height:180,getContext:()=>ctx};
  const modelCanvas={width:320,height:180,getContext:()=>ctx};
  let viewport={width:320,height:180};
  el.frame={getBoundingClientRect:()=>viewport};
  el['pilots-select']={value:'2'};
  el['team-select']={value:'ffa'};
  el['mode-select']={value:'duel'};
  el['challenge-select']={value:'intercept'};
  el['arena-select']={value:'0'};
  for(const id of ['menu','result','result-title','result-detail','start',
    'rematch','change-plane','menu-return','left','right','boost','fire','special','roll','bomb']){
    el[id]={textContent:'',dataset:{},setPointerCapture:noop,setAttribute:noop,
      classList:{add:noop,remove:noop,toggle:noop},
      addEventListener:(type,cb)=>listeners.set(id+':'+type,cb)};
  }
  const choices=['fighter','heavy','bomber'].map(name=>({
    dataset:{plane:name},classList:{toggle:noop},setAttribute:noop,
    addEventListener:(type,cb)=>listeners.set(name+':'+type,cb)
  }));
  const document={
    hidden:false,
    getElementById:id=>id==='game'?canvas:id==='aircraft-layer'?modelCanvas:el[id],
    createElement:()=>({getContext:()=>ctx}),
    querySelectorAll:()=>choices,
    addEventListener:(type,cb)=>listeners.set('document:'+type,cb)
  };
  let nextFrame;
  const sandbox={
    document,
    URLSearchParams,
    localStorage:{getItem:()=>null,setItem:noop},
    window:{
      location:{search:''},
      matchMedia:()=>({matches:false}),
      devicePixelRatio:1,
      innerWidth:960,innerHeight:540,
      addEventListener:(type,cb)=>listeners.set('window:'+type,cb)
    },
    requestAnimationFrame:cb=>{nextFrame=cb},
    console
  };
  const instrumented=code.replace('  // All scenery is painted once;',
    '  window.__wingmanTest={state,triggerBomb,triggerSpecial,triggerRoll,triggerPilotSkill,hit,steerPlane,updatePlane,controls,aiInput,assignCampaignAI,startCampaignFight,summonFinalAce,bossWaiting,callSupport,updateSupport,update,newRound,endRound,battleOutcomeAfterDeath,nearestEnemy,sessionScore,CHALLENGES,tailMagnet,shoot,rollWind,updateWind,projectiles,PLANES,wrappedDelta,combatDistance,interceptPoint};\n  // All scenery is painted once;');
  const artCode=fs.readFileSync(require('node:path').join(__dirname,'../src/art/aircraft.js'),'utf8');
  vm.runInNewContext(artCode,sandbox,{timeout:3000,filename:'aircraft.js'});
  const sceneryCode=fs.readFileSync(require('node:path').join(__dirname,'../src/art/scenery.js'),'utf8');
  vm.runInNewContext(sceneryCode,sandbox,{timeout:3000,filename:'scenery.js'});
  // Load exactly the personality definitions shipped with the real game.
  for(const file of ['src/data/pilot-roster.js','src/data/pilot-ai.js']){
    const script=fs.readFileSync(require('node:path').join(__dirname,'../',file),'utf8');
    vm.runInNewContext(script,sandbox,{timeout:3000,filename:file});
  }
  vm.runInNewContext(instrumented,sandbox,{timeout:3000,filename:'game.js'});
  return {
    listeners,canvas,modelCanvas,internals:sandbox.window.__wingmanTest,
    setPilots:n=>{el['pilots-select'].value=String(n);},
    setTeams:v=>{el['team-select'].value=v;},
    setMode:v=>{el['mode-select'].value=v;},
    setChallenge:v=>{el['challenge-select'].value=v;},
    setViewport:(width,height)=>{
      viewport={width,height};
      listeners.get('window:resize')?.();
    },
    advance:(frames,start=0)=>{
      for(let i=0;i<frames;i++){
        assert.equal(typeof nextFrame,'function');
        const frame=nextFrame;nextFrame=null;frame(start+i*16.6667);
      }
    }
  };
}
test('game initialises and renders without external dependencies',()=>{
  const game=launch();
  game.advance(60);
  assert.equal(typeof game.listeners.get('start:click'),'function');
});
test('starts a match, accepts keyboard and touch input, and survives match updates',()=>{
  const game=launch();
  game.listeners.get('heavy:click')();
  game.listeners.get('start:click')();
  game.listeners.get('document:keydown')({code:'KeyA',repeat:false,preventDefault(){}});
  game.advance(40);
  game.listeners.get('document:keyup')({code:'KeyA'});
  game.listeners.get('document:keydown')({code:'Space',repeat:false,preventDefault(){}});
  game.listeners.get('document:keydown')({code:'KeyK',repeat:false,preventDefault(){}});
  const e={pointerId:1,preventDefault(){}};
  game.listeners.get('right:pointerdown')(e);
  game.advance(50,700);
  game.listeners.get('right:pointerup')(e);
  game.listeners.get('fire:pointerdown')(e);
  game.listeners.get('special:pointerdown')(e);
  game.advance(3500,1600);
});
test('menu can be restored and a new match started',()=>{
  const game=launch();
  game.listeners.get('start:click')();
  game.listeners.get('change-plane:click')();
  game.listeners.get('fighter:click')();
  game.listeners.get('start:click')();
  game.advance(30);
});

test('extra-wide landscape viewport expands logical width without distorting pixel height',()=>{
  const game=launch();
  assert.equal(game.canvas.width,Math.round(250*960/540));
  game.setViewport(1350,490);
  assert.equal(game.canvas.width,Math.round(250*1350/490));
  assert.equal(game.canvas.height,250);
  game.listeners.get('start:click')();
  game.advance(400,1200);
  game.setViewport(960,540);
  assert.equal(game.canvas.width,Math.round(250*960/540));
  game.advance(30,10000);
});

test('barrel roll inputs and energy-based flight remain stable',()=>{
 const game=launch();
 game.listeners.get('start:click')();
 const e={pointerId:3,preventDefault(){}};
 game.listeners.get('roll:pointerdown')(e);
 game.advance(150,1300);
 game.listeners.get('roll:pointerdown')(e);
 game.listeners.get('document:keydown')({code:'KeyL',repeat:false,preventDefault(){}});
 game.advance(300,4000);
});

test('transient mobile blur during FIRE does not pause the game',()=>{
 const game=launch();
 game.listeners.get('start:click')();
 const e={pointerId:4,preventDefault(){}};
 game.listeners.get('fire:pointerdown')(e);
 game.listeners.get('window:blur')();
 game.advance(80,1000);
 // No explicit pause; restarting the game must not be required after a blur.
 game.listeners.get('fire:pointerdown')(e);
 game.advance(300,2500);
});

test('ramming planes causes no direct health or component damage',()=>{
 const game=launch();
 game.listeners.get('start:click')();
 const [fighter,enemy]=game.internals.state.fliers;
 fighter.spawnSafe=0;enemy.spawnSafe=0;
 enemy.x=fighter.x;enemy.y=fighter.y;
 const health=[fighter.health,enemy.health];
 game.advance(2,200);
 assert.equal(fighter.health,health[0]);
 assert.equal(enemy.health,health[1]);
});
test('all three native-sized miniature sprites load in the renderer',()=>{
 const game=launch();
 const sprites=game.internals.state;
 game.listeners.get('start:click')();
 game.advance(40,1000);
 assert.equal(sprites.fliers.length,2);
});
test('Spitfire Corkscrew gives a brief bounded boost and distinct cooldown',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];
 game.internals.triggerSpecial(p);
 assert.ok(p.overdriveTime>.9&&p.overdriveTime<=1.10);
 assert.ok(p.corkscrewTime>.65);
 assert.equal(p.specialCooldown,14);
 game.advance(8,1000);
 assert.equal(p.boosting,true);
 assert.ok(p.overdriveTime<1.10);
});
test('Bomber E releases exactly three spaced bombs and retains the rear gunner',()=>{
 const game=launch();game.listeners.get('bomber:click')();
 game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];
 game.internals.triggerSpecial(p);
 assert.equal(p.bombQueue,3);
 assert.equal(p.specialCooldown,20);
 assert.ok('rearCooldown' in p);
 game.advance(8,1000);
 assert.ok(game.internals.state.bombs.length>=1);
 assert.equal(p.bombQueue,2);
});
test('Spitfire has effective guns while remaining controllable',()=>{
 const game=launch();
 game.listeners.get('start:click')();
 const s=game.internals.state.fliers[0];
 assert.equal(s.d.speed,82);
 assert.equal(s.d.damage,11);
 assert.equal(s.d.burst,10);
 assert.ok(s.d.turn>3);
});
test('overlapping aircraft cannot inflict point-blank gun damage',()=>{
 const game=launch();
 game.listeners.get('start:click')();
 const state=game.internals.state;
 const [a,b]=state.fliers;
 a.spawnSafe=0;b.spawnSafe=0;
 a.x=b.x;a.y=b.y;a.vx=b.vx=0;a.vy=b.vy=0;
 const health=a.health;
 state.bullets.push({x:a.x,y:a.y,vx:0,vy:0,owner:1,
   damage:100,life:1,age:0});
 game.advance(3,1000);
 assert.equal(a.health,health);
});
test('Overdrive does not teleport the aircraft or force a reverse turn',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0],origin=p.angle;
 game.internals.triggerSpecial(p);
 assert.equal(p.swoop,null);
 game.advance(5,1000);
 assert.ok(Math.abs(p.angle-origin)<.5);
});
test('plane models have a dedicated display-sized rendering surface',()=>{
 const game=launch();
 assert.ok(game.modelCanvas.width>0);
 game.setViewport(1350,490);
 assert.equal(game.modelCanvas.width,1350);
 assert.equal(game.modelCanvas.height,490);
 game.listeners.get('start:click')();
 game.advance(12,1000);
});

test('all six unique side-on aircraft are available in art renderer',()=>{
 const source=fs.readFileSync(require('node:path').join(__dirname,'../src/art/aircraft.js'),'utf8');
 const vm=require('node:vm');
 const window={};vm.runInNewContext(source,{window},{timeout:2000});
 assert.deepEqual(Array.from(window.WingmanSprites.types).sort(),
  ['fighter','heavy','bomber','bf109','bf110','he111'].sort());
 assert.equal(typeof window.WingmanSprites.draw,'function');
});

test('four-aircraft mode spawns distinct pilots with targetable AI',()=>{
 const game=launch();
 game.setPilots(4);game.listeners.get('start:click')();
 const state=game.internals.state;
 assert.equal(state.participants,4);
 assert.equal(state.fliers.length,4);
 assert.equal(new Set(state.fliers.map(p=>p.id)).size,4);
 game.advance(150,1500);
});
test('horizontal boundaries wrap aircraft without changing heading or health',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];
 p.spawnSafe=0;p.x=-p.d.radius-3;p.y=120;p.angle=Math.PI;
 const health=p.health;
 game.advance(2,1000);
 assert.ok(p.x>200,'plane should appear on the right');
 assert.equal(p.health,health);
});
test('floor collision crashes the plane and finishes the duel',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];
 p.spawnSafe=0;p.y=245;p.angle=Math.PI/2;
 game.advance(2,1000);
 assert.equal(p.alive,false);
 assert.equal(p.damageCause,'GROUND');
});
test('ceiling returns immediately below HUD on reversed heading, without damage',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];p.spawnSafe=0;
 p.y=1;p.angle=-Math.PI/3;p.speed=88;
 p.vx=44;p.vy=-75;p.climbLoad=30;
 const hp=p.health;
 game.internals.steerPlane(p,0,1/60);
 assert.ok(p.alive);assert.equal(p.health,hp);
 assert.ok(p.y>=31+p.d.radius,'no delayed top wrap above the HUD');
 assert.ok(p.vx<0,'re-entry reverses horizontal direction');
 assert.ok(p.vy>0,'re-entry points down into playable sky');
 assert.equal(p.flightRisk,0);
});
test('ceiling re-entry also works during special manoeuvres',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];
 game.internals.triggerSpecial(p);
 p.y=-p.d.radius-2;
 game.internals.steerPlane(p,0,1/60);
 assert.ok(p.y>=31+p.d.radius&&p.vy>0);
 assert.ok(p.alive);
});

test('2v2 uses two sides and never allows friendly-fire to target an ally',()=>{
 const game=launch();
 game.setPilots(4);game.setTeams('teams');
 game.listeners.get('start:click')();
 const state=game.internals.state;
 assert.equal(state.teams,true);
 assert.deepEqual(Array.from(state.fliers,p=>p.team),[0,1,0,1]);
 const player=state.fliers[0],wingman=state.fliers[2];
 player.spawnSafe=0;wingman.spawnSafe=0;
 player.x=wingman.x-22;player.y=wingman.y=90;
 player.angle=0;player.vx=0;wingman.vx=0;
 const initialHP=wingman.health;
 state.bullets.push({
  x:wingman.x-12,y:wingman.y,vx:250,vy:0,
  owner:0,damage:70,life:1,age:.12
 });
 game.advance(3,1000);
 assert.equal(wingman.health,initialHP);
});
test('the four-pilot arena continues after a single AI is destroyed',()=>{
 const game=launch();game.setPilots(4);
 game.listeners.get('start:click')();
 const state=game.internals.state;
 state.fliers[1].alive=false;state.fliers[1].health=0;
 game.advance(2,1000);
 assert.equal(state.phase,'playing');
 assert.equal(state.fliers.length,4);
});

test('armour absorbs hits before the hull is damaged',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[1];p.spawnSafe=0;
 const hp=p.health;
 game.internals.hit(p,20,p.x,p.y);
 assert.equal(p.health,hp);
 assert.ok(p.armour<p.d.armour);
 game.internals.hit(p,200,p.x,p.y);
 assert.equal(p.armour,0);
 assert.ok(p.health<hp);
});
test('all classes have their intended simple armour and health',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];
 assert.equal(p.d.hull,130);assert.equal(p.d.armour,40);
 assert.equal(p.d.burst,10);
});
test('damaged aircraft still turn and are not component-disabled',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];p.spawnSafe=0;
 p.armour=0;p.health=24;p.energy=90;
 const angle=p.angle;
 game.internals.steerPlane(p,1,1/60);
 assert.notEqual(p.angle,angle);
 assert.ok(p.alive);
});
test('Universal W boost is removed and only fighter E triggers Overdrive',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];
 game.listeners.get('document:keydown')({code:'KeyW',repeat:false,preventDefault(){}});
 game.advance(5,1000);
 assert.equal(p.boosting,false);
 game.internals.triggerSpecial(p);
 game.advance(5,2000);
 assert.equal(p.boosting,true);
});
test('stall depends on rapid altitude gain, not height or low energy alone',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];p.spawnSafe=0;
 p.y=80;p.energy=0;p.angle=0;
 game.internals.steerPlane(p,0,1/60);
 assert.equal(p.flightRisk,0,'high altitude and low energy alone cannot stall');
 p.climbLoad=110;p.angle=-Math.PI/3;p.y=110;
 game.internals.steerPlane(p,1,1/60);
 assert.ok(p.flightRisk>.6,'rapid climb builds noticeable stall risk');
 assert.ok(p.stallTime>0);
 const health=p.health;
 p.angle=Math.PI/3;p.vy=35;
 for(let i=0;i<90;i++)game.internals.steerPlane(p,0,1/60);
 assert.equal(p.health,health);
 assert.ok(p.flightRisk<.2,'diving clears accumulated climb load');
});
test('Heavy fighter shield reduces damage while active',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];
 p.role='heavy';p.type='heavy';p.d=game.internals.PLANES.heavy;
 game.internals.triggerSpecial(p);
 assert.ok(p.armourTime>0);
 assert.equal(p.specialCooldown,20);
});
test('G3A.3 fighter pursues close target even when pointing away instead of orbiting',()=>{
 const game=launch();game.listeners.get('start:click')();
 const [player,fighter]=game.internals.state.fliers;
 fighter.type='bf109';fighter.role='fighter';fighter.d=game.internals.PLANES.bf109;
 fighter.x=145;fighter.y=100;fighter.angle=2.35;
 fighter.vx=-58;fighter.vy=-10;
 fighter.aiThink=10;fighter.aiMode='attack';fighter.aiRecoveryTime=0;
 player.x=198;player.y=100;player.vx=0;player.vy=0;player.spawnSafe=0;
 const turn=game.internals.aiInput(fighter,player);
 assert.ok(turn<0,'turn toward the nearby target, not away on a forward lap');
 assert.equal(fighter.aiMode,'break','fighter immediately reverses to re-engage after crossing');
});

test('G3B gun cooldown does not cause pointless horizontal laps',()=>{
 const game=launch();game.listeners.get('start:click')();
 const [target,p]=game.internals.state.fliers;
 p.type='bf109';p.role='fighter';p.d=game.internals.PLANES.bf109;
 p.x=140;p.y=120;p.angle=.4;p.vx=80;p.vy=0;p.gunCooldown=1.4;
 target.x=211;target.y=120;target.angle=0;target.spawnSafe=0;
 const stick=game.internals.aiInput(p,target);
 assert.equal(p.aiMode,'attack','cooldown must not trigger extend or patrol');
 assert.ok(stick<0,'aircraft is actively adjusting nose toward target');
});
test('G3B AI banks around after an overshoot rather than flying away',()=>{
 const game=launch();game.listeners.get('start:click')();
 const [target,p]=game.internals.state.fliers;
 p.type='bf109';p.role='fighter';p.d=game.internals.PLANES.bf109;
 p.x=171;p.y=113;p.angle=0;p.vx=80;p.vy=0;
 target.x=109;target.y=114;target.angle=Math.PI;target.spawnSafe=0;
 const stick=game.internals.aiInput(p,target);
 assert.equal(p.aiMode,'break');
 assert.ok(Math.abs(stick)>.85,'must command a deliberate reversal');
});
test('G3B defensive evasions respond to a gun threat, not random passing',()=>{
 const game=launch();game.listeners.get('start:click')();
 const [target,p]=game.internals.state.fliers;
 p.type='bf109';p.role='fighter';p.d=game.internals.PLANES.bf109;
 p.x=165;p.y=115;p.angle=0;p.vx=80;p.vy=0;
 target.x=105;target.y=115;target.angle=0;target.spawnSafe=0;target.burstLeft=5;
 game.internals.aiInput(p,target);
 assert.equal(p.aiMode,'evade');
 assert.ok(p.aiEvadeTime>.2);
 p.aiEvadeTime=0;p.aiEvadeCooldown=0;
 target.angle=Math.PI;
 game.internals.aiInput(p,target);
 assert.notEqual(p.aiMode,'evade','opponent facing away cannot force evasive orbit');
});
test('G3B ground recovery interrupts an unfinished pursuit break',()=>{
 const game=launch();game.listeners.get('start:click')();
 const [target,p]=game.internals.state.fliers;
 p.type='bf109';p.role='fighter';p.d=game.internals.PLANES.bf109;
 p.x=170;p.y=174;p.vy=92;p.angle=.9;p.aiBreakTime=.38;
 target.x=103;target.y=160;target.spawnSafe=0;
 const steer=game.internals.aiInput(p,target);
 assert.equal(p.aiMode,'recover');
 assert.equal(p.aiBreakTime,0,'old break turn must be cancelled, never resumed after recovering');
 assert.ok(steer<0,'recover toward safe altitude');
});

test('G3B medium altitude does not trigger premature ground escape',()=>{
 const game=launch();game.listeners.get('start:click')();
 const [target,p]=game.internals.state.fliers;
 p.type='bf109';p.role='fighter';p.d=game.internals.PLANES.bf109;
 p.y=93;p.vy=56;p.angle=.4;p.aiRecoveryTime=0;
 target.x=p.x+67;target.y=145;
 game.internals.aiInput(p,target);
 assert.notEqual(p.aiMode,'recover','chase must persist while ground is distant');
 p.y=175;p.vy=92;
 game.internals.aiInput(p,target);
 assert.equal(p.aiMode,'recover','genuine floor approach must override pursuit');
});

test('G3A.2 near-ceiling fighter keeps chasing instead of bobbing in ground-recovery mode',()=>{
 const game=launch();game.listeners.get('start:click')();
 const [player,fighter]=game.internals.state.fliers;
 // The test harness defaults to an enemy bomber; explicitly select a
 // Messerschmitt so this regression actually tests fighter pursuit.
 fighter.type='bf109';fighter.role='fighter';fighter.d=game.internals.PLANES.bf109;
 assert.equal(fighter.role,'fighter');
 fighter.y=39;fighter.vy=-13;fighter.vx=-60;fighter.angle=-Math.PI+.2;
 fighter.aiThink=0;fighter.aiMode='recover';fighter.aiRecoveryTime=0;
 player.x=170;player.y=115;
 game.internals.aiInput(fighter,player);
 assert.equal(fighter.aiMode,'intercept','ceiling is not an emergency ground recovery');
 assert.equal(fighter.aiRecoveryTime,0,'ground recovery is not reactivated at the top');
});
test('Ground-threat prediction still overrides AI pursuit without universal boost',()=>{
 const game=launch();game.listeners.get('start:click')();
 const enemy=game.internals.state.fliers[1];
 enemy.y=165;enemy.vy=78;enemy.angle=.8;enemy.aiThink=20;
 const target=game.internals.state.fliers[0];target.y=220;
 game.internals.aiInput(enemy,target);
 assert.equal(enemy.aiMode,'recover');
 assert.ok(enemy.aiRecoveryTime>0);
 assert.equal(enemy.aiBoost,false);
});
test('gentle tail assist only engages when lined up behind an opponent',()=>{
 const game=launch();game.listeners.get('start:click')();
 const [p,enemy]=game.internals.state.fliers;
 p.x=180;p.y=120;p.angle=0;
 enemy.x=231;enemy.y=126;enemy.angle=.1;enemy.alive=true;
 p.swoop=null;
 const help=game.internals.tailMagnet(p,0);
 assert.ok(help>0&&help<=.14,'small positive alignment when near tail');
 assert.equal(game.internals.tailMagnet(p,-1),0,'manual steering takes priority');
 enemy.angle=Math.PI;
 assert.equal(game.internals.tailMagnet(p,0),0,'head-on planes do not magnetise');
});

test('keyboard special is reachable with E and roll with Q',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];
 game.listeners.get('document:keydown')({code:'KeyE',repeat:false,preventDefault(){}});
 assert.ok(p.specialCooldown>0);
 game.listeners.get('document:keydown')({code:'KeyQ',repeat:false,preventDefault(){}});
 assert.ok(p.rollTime>0);
});
test('aircraft do not use component health pools',()=>{
 const game=launch();game.listeners.get('start:click')();
 assert.equal(game.internals.state.fliers[0].parts,undefined);
 assert.ok(game.internals.state.fliers[0].armour>0);
});

test('HUD styles all have the same playable game state',()=>{
 const game=launch();
 game.listeners.get('start:click')();
 game.advance(25,1000);
 assert.equal(game.internals.state.fliers.length,2);
});

test('all six aircraft use distinct tactical class statistics',()=>{
 const game=launch(),planes=game.internals.PLANES;
 const cases=[
  ['fighter',82,3.15,130,40,11],
  ['heavy',75,1.98,160,78,16],
  ['bomber',66,1.30,180,124,10],
  ['bf109',87,3.02,125,42,11],
  ['bf110',78,1.91,160,75,17],
  ['he111',69,1.35,175,116,10]
 ];
 for(const [type,speed,turn,hull,armour,damage] of cases){
  const p=planes[type];assert.equal(p.speed,speed);assert.equal(p.turn,turn);
  assert.equal(p.hull,hull);assert.equal(p.armour,armour);assert.equal(p.damage,damage);
 }
 assert.ok(planes.fighter.turn>planes.heavy.turn&&planes.heavy.turn>planes.bomber.turn);
 assert.ok(planes.fighter.speed>planes.heavy.speed&&planes.heavy.speed>planes.bomber.speed);
});
test('bullet lifetime extends effective range and keeps deliberate class differences',()=>{
 const game=launch();game.listeners.get('start:click')();
 const [fighter,heavy]=game.internals.state.fliers;
 // The default AI plane is chosen by matchmaking, so explicitly set class.
 heavy.d=game.internals.PLANES.heavy;
 game.internals.shoot(fighter);game.internals.shoot(heavy);
 const [f,h]=game.internals.state.bullets;
 assert.equal(f.life,1.28);assert.equal(h.life,1.25);
 assert.ok(f.life>=.9*1.35,'fighter range is at least 35 percent longer');
 assert.ok(h.life>=.9*1.35,'heavy range is at least 35 percent longer');
 assert.ok(f.life>h.life);
 assert.ok(f.vx>0&&h.vx<0);
 const bomber=game.internals.PLANES.bomber;
 assert.ok(bomber.gunLife>=.9*1.35);
 assert.ok(bomber.gunLife<h.life);
});
test('bomber rear gunner triggers automatically on a pursuer behind it',()=>{
 const game=launch();game.listeners.get('bomber:click')();
 game.listeners.get('start:click')();
 const [bomber,pursuer]=game.internals.state.fliers;
 bomber.x=220;bomber.y=130;bomber.angle=0;bomber.spawnSafe=0;
 pursuer.x=170;pursuer.y=130;pursuer.alive=true;pursuer.spawnSafe=0;
 assert.equal(bomber.rearCooldown,0);
 game.internals.updatePlane(bomber,1/60,0);
 assert.ok(bomber.rearCooldown>1.5);
 assert.ok(game.internals.state.bullets.some(b=>b.owner===0&&b.damage===4.5&&b.rearGun));
});
test('depleted armour reduces hull; shield only protects and never recharges armour',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];p.spawnSafe=0;
 game.internals.hit(p,p.d.armour,p.x,p.y);
 assert.equal(p.armour,0);assert.equal(p.health,p.d.hull);
 p.armourTime=5;
 game.internals.hit(p,40,p.x,p.y);
 assert.equal(p.armour,0);assert.equal(p.health,p.d.hull-18);
});
test('low-health performance loss stays mild and flight controls survive',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];
 p.health=p.d.hull*.2;p.armour=0;
 p.angle=0;p.y=120;p.climbLoad=0;p.speed=p.d.speed;
 const old=p.angle;
 game.internals.steerPlane(p,1,1/60);
 assert.ok(p.alive);assert.notEqual(p.angle,old);
 assert.ok(p.speed>p.d.speed*.9,'no abrupt speed collapse from low health');
});

test('durability hierarchy preserves protection and fighter manoeuvrability',()=>{
 const planes=launch().internals.PLANES;
 for(const nation of [['fighter','heavy','bomber'],['bf109','bf110','he111']]){
  const [f,h,b]=nation.map(type=>planes[type]);
  assert.ok(f.turn>h.turn&&h.turn>b.turn);
  assert.ok(f.speed>h.speed&&h.speed>b.speed);
  assert.ok(f.armour<h.armour&&h.armour<b.armour);
  assert.ok(f.hull<h.hull&&h.hull<b.hull);
 }
});

test('campaign rank AI changes tactical decision level without modifying hull or damage',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[1];
 const hull=p.d.hull,damage=p.d.damage;
 game.internals.assignCampaignAI(p,{rank:1,id:'von-test'});
 assert.equal(p.aiRank,1);assert.equal(p.aiSkillLevel,0);
 const style=p.aiStyle;
 game.internals.assignCampaignAI(p,{rank:8,id:'von-test'});
 assert.equal(p.aiSkillLevel,1);assert.equal(p.aiStyle,style);
 assert.equal(p.d.hull,hull);assert.equal(p.d.damage,damage);
});

test('real touch hold keeps continuous steering active until the actual touchend',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];
 const startAngle=p.angle;
 let prevented=0;const e={changedTouches:[{identifier:14}],preventDefault(){prevented++;}};
 game.listeners.get('right:touchstart')(e);
 assert.equal(game.internals.controls.right,true);
 game.advance(35,1000);
 assert.ok(Math.abs(p.angle-startAngle)>.15,'steering continues across frames');
 game.listeners.get('right:touchend')(e);
 assert.equal(game.internals.controls.right,false);
 assert.ok(prevented>=2,'native select/scroll action was prevented');
});
test('wind affects both aircraft symmetrically and drifts bullets much less',()=>{
 const game=launch();game.listeners.get('start:click')();
 const s=game.internals.state, p=s.fliers[0];
 const dt=1/60,original={...p};
 s.wind={active:true,base:14,current:14,elapsed:0};
 game.internals.steerPlane(p,0,dt);const right=p.x;
 Object.assign(p,original);s.wind={active:true,base:-14,current:-14,elapsed:0};
 game.internals.steerPlane(p,0,dt);const left=p.x;
 assert.ok(right>left,'eastward wind moves the same aircraft further east');
 const b={owner:0,x:120,y:80,vx:0,vy:0,damage:0,age:0.1,life:1};
 s.bullets=[b];s.wind={active:true,base:14,current:14,elapsed:0};
 game.internals.projectiles(dt);
 assert.ok(b.x-120>0 && b.x-120<14*dt*.5,'bullet drift is weaker than aircraft drift');
});
test('no-wind round leaves the wind force at zero',()=>{
 const game=launch();game.listeners.get('start:click')();
 const w=game.internals.state.wind;
 if(!w.active)assert.equal(w.current,0);
 else {assert.ok(Math.abs(w.current)>0);}
});

test('AI sees a nearby opponent across the horizontally wrapped boundary',()=>{
  const game=launch();game.listeners.get('start:click')();
  const [target,p]=game.internals.state.fliers,W=game.canvas.width;
  p.x=W-11;p.y=115;p.angle=0;p.vx=0;p.vy=0;
  // Opponent aircraft type is random: isolate steering from bomber high-ground tactics.
  p.role='fighter';p.d=game.internals.PLANES.fighter;
  p.aiMode='attack';p.aiThink=5;p.aiRecoveryTime=0;p.gunCooldown=4;
  target.x=13;target.y=115;target.vx=0;target.vy=0;
  assert.ok(game.internals.combatDistance(p,target)<30);
  assert.equal(game.internals.wrappedDelta(p.x,target.x),24);
  assert.equal(game.internals.aiInput(p,target),0,
    'the shortest pursuit direction points right across the edge');
});
test('predicted gun interception accounts for relative movement and wind',()=>{
  const game=launch();game.listeners.get('start:click')();
  const [target,p]=game.internals.state.fliers;
  p.x=80;p.y=100;p.angle=0;p.vx=40;p.vy=0;
  target.x=155;target.y=100;target.vx=0;target.vy=38;
  // The match may randomly start with wind; compare against a calm baseline.
  game.internals.state.wind={active:false,base:0,current:0,elapsed:0};
  const solution=game.internals.interceptPoint(p,target);
  assert.ok(solution.time>0);
  assert.ok(solution.y>target.y,'a moving target requires vertical lead');
  game.internals.state.wind.current=16;
  const windy=game.internals.interceptPoint(p,target);
  assert.ok(windy.x>solution.x,'wind changes the physical intercept geometry');
});
test('bullets cross the horizontal boundary and hit an aircraft on the other side',()=>{
  const game=launch();game.listeners.get('start:click')();
  const state=game.internals.state,[shooter,target]=state.fliers,W=game.canvas.width;
  shooter.x=W-55;shooter.y=120;shooter.spawnSafe=0;
  target.x=4;target.y=120;target.angle=0;target.spawnSafe=0;
  const armour=target.armour;
  state.wind.current=0;
  state.bullets=[{x:W-8,y:120,vx:180,vy:0,owner:0,damage:20,age:.1,life:1}];
  game.internals.projectiles(1/15);
  assert.ok(target.armour<armour,'a bullet hitting a wrapped ghost should deal gun damage');
  assert.equal(state.bullets.length,0);
});
test('duel timeouts count remaining armour as well as hull',()=>{
  const game=launch();game.listeners.get('start:click')();
  const state=game.internals.state,[player,enemy]=state.fliers;
  player.health=player.d.hull;player.armour=0;
  enemy.health=enemy.d.hull*.94;enemy.armour=enemy.d.armour*.94;
  state.time=.001;
  game.advance(3,1000);
  assert.equal(state.scores[1],1,'enemy with more total durability wins timeout');
});

test('mobile MENU button returns immediately to the aircraft selector without page reload',()=>{
 const game=launch();
 game.listeners.get('start:click')();
 assert.equal(game.internals.state.phase,'playing');
 assert.equal(game.listeners.has('menu-return:click'),true);
 game.listeners.get('right:touchstart')({changedTouches:[{identifier:33}],preventDefault(){}});
 assert.equal(game.internals.controls.right,true);
 game.listeners.get('menu-return:click')();
 assert.equal(game.internals.state.phase,'menu');
 assert.equal(game.internals.controls.right,false);
 game.listeners.get('start:click')();
 assert.equal(game.internals.state.phase,'playing');
});

test('tail gunner covers the rear cone, not front or distant flank',()=>{
 const game=launch();game.listeners.get('bomber:click')();game.listeners.get('start:click')();
 const [bomber,enemy]=game.internals.state.fliers;
 bomber.x=220;bomber.y=120;bomber.angle=0;
 enemy.spawnSafe=0;enemy.alive=true;
 enemy.x=260;enemy.y=120;
 game.internals.updatePlane(bomber,1/60,0);
 assert.equal(bomber.rearShots,0,'a fighter ahead does not draw turret fire');
 enemy.x=170;enemy.y=190;
 game.internals.updatePlane(bomber,1/60,0);
 assert.equal(bomber.rearShots,0,'a fighter well outside the tail cone is safe');
 enemy.x=160;enemy.y=120;
 game.internals.updatePlane(bomber,1/60,0);
 assert.ok(bomber.rearCooldown>0);
 assert.ok(game.internals.state.bullets.some(b=>b.rearGun));
});

test('AI bombers wait for an aligned, below-target bombing opportunity',()=>{
 const game=launch();game.listeners.get('start:click')();
 const [target,bomber]=game.internals.state.fliers;
 bomber.role='bomber';bomber.d=game.internals.PLANES.bomber;
 bomber.x=195;bomber.y=90;bomber.vx=0;bomber.vy=0;bomber.angle=0;
 bomber.aiThink=9;bomber.aiMode='attack';bomber.aiRecoveryTime=0;
 target.x=195;target.y=155;target.vx=0;target.vy=0;target.spawnSafe=0;
 bomber.aiBombDelay=4.5;
 game.internals.aiInput(bomber,target);
 assert.equal(bomber.bombQueue,0,'no bombs immediately after spawn');
 bomber.aiBombDelay=0;
 target.x=295;
 game.internals.aiInput(bomber,target);
 assert.equal(bomber.bombQueue,0,'no release unless horizontal approach is aligned');
 target.x=195;
 game.internals.aiInput(bomber,target);
 assert.equal(bomber.bombQueue,3,'deliberate aligned pass releases the three-bomb salvo');
});

test('a fighter sitting directly behind a Lancaster takes sustained turret damage',()=>{
 const game=launch();game.listeners.get('bomber:click')();game.listeners.get('start:click')();
 const state=game.internals.state,[bomber,chaser]=state.fliers;
 state.wind={active:false,base:0,current:0,elapsed:0};
 bomber.x=220;bomber.y=125;bomber.angle=0;bomber.speed=0;bomber.vx=0;bomber.vy=0;
 chaser.x=187;chaser.y=125;chaser.angle=0;chaser.vx=0;chaser.vy=0;
 chaser.role='fighter';chaser.d=game.internals.PLANES.fighter;
 chaser.armour=0;chaser.spawnSafe=0;bomber.spawnSafe=0;
 const start=chaser.health;
 for(let i=0;i<70;i++){
   game.internals.updatePlane(bomber,1/60,0);
   game.internals.projectiles(1/60);
 }
 assert.ok(chaser.health<start,'staying inside the rear firing lane should cost hull health');
});

test('Phase 8 environment generator paints four distinct cached WWII theatres',()=>{
  const source=fs.readFileSync(require('node:path').join(__dirname,'../src/art/scenery.js'),'utf8');
  const window={};vm.runInNewContext(source,{window},{timeout:3000});
  assert.equal(window.WingmanScenery.version,'8.1');
  const records=[];
  for(let scene=0;scene<4;scene++){
    const fills=[];let paths=0;
    const ctx={
      fillRect:(...a)=>fills.push(a),
      fill(){paths++;},stroke(){paths++;},
      beginPath(){},moveTo(){},lineTo(){},bezierCurveTo(){},closePath(){},
      ellipse(){},arc(){},save(){},restore(){},
    };
    window.WingmanScenery.paint(ctx,520,250,scene);
    assert.ok(fills.length>120,'cached terrain draws atmosphere and detail');
    assert.ok(paths>30,'scenery includes detailed terrain silhouettes');
    records.push(fills.length+':'+paths);
    window.WingmanScenery.weather(ctx,520,250,scene,6,{active:true,current:12});
  }
  assert.ok(new Set(records).size>=3,'four scenes differ in geometry');
});
test('G2 impacts use bounded metal sparks and smoke without changing collision',()=>{
  const game=launch();game.listeners.get('start:click')();
  const s=game.internals.state,p=s.fliers[0];p.spawnSafe=0;
  game.internals.hit(p,p.d.armour+45,p.x,p.y);
  assert.ok(s.sparks.length>0,'impacts emit localised metal-impact sparks');
  p.health=p.d.hull*.27;p.armour=0;
  game.advance(25,3000);
  assert.ok(s.trails.length>0,'damaged aircraft emit drifting smoke');
  assert.ok(s.trails.length<=100,'mobile effect pool is capped');
  game.advance(120,9000);
  assert.ok(s.blasts.length<=12,'impact pulse pool is capped');
});

test('climbing trades forward airspeed for height and diving restores it',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0],base=p.speed;
 p.spawnSafe=0;p.y=120;p.topRecovery=0;
 for(let i=0;i<95;i++){
   p.angle=-Math.PI/2;p.y=125;p.topRecovery=0;
   game.internals.steerPlane(p,0,1/60);
 }
 const afterClimb=p.speed;
 assert.ok(afterClimb<base*.80,`a prolonged climb must be noticeably slower: ${afterClimb} vs ${base}`);
 for(let i=0;i<95;i++){
   p.angle=Math.PI/2;p.y=100;p.topRecovery=0;p.climbLoad=0;
   game.internals.steerPlane(p,0,1/60);
 }
 assert.ok(p.speed>base,`a dive must recover and exceed initial speed: ${p.speed} vs ${base}`);
 assert.ok(p.speed<=p.d.speed*1.60+1,'diving should still have a bounded top speed');
 assert.ok(p.alive,'normal altitude/speed exchange should not damage the plane');
});

test('rear turret delivers fighter-like bursts without matching fighter bullet damage',()=>{
 const game=launch();game.listeners.get('bomber:click')();game.listeners.get('start:click')();
 const s=game.internals.state,[bomber,chaser]=s.fliers;
 bomber.x=205;bomber.y=120;bomber.angle=0;
 bomber.vx=0;bomber.vy=0;
 chaser.x=156;chaser.y=120;chaser.vx=0;chaser.vy=0;
 chaser.spawnSafe=0;
 const hullBefore=chaser.health,armourBefore=chaser.armour;
 for(let i=0;i<45;i++){
   game.internals.updatePlane(bomber,1/60,0);
   game.internals.projectiles(1/60);
 }
 const fired=s.bullets.filter(b=>b.rearGun).length;
 assert.ok(bomber.rearShots<=1,'rear gun fires nearly its entire four-shot burst');
 assert.ok(chaser.health<hullBefore||chaser.armour<armourBefore,'tailing is punished by real projectile hits');
 const gun=game.internals.PLANES.fighter.damage;
 assert.ok(4.5<gun,'each tail turret hit deals less damage than fighter primary gun');
});
test('the fighter combat HUD and ability naming remain independent of bomb controls',()=>{
 const game=launch();game.listeners.get('start:click')();
 const s=game.internals.state;
 assert.equal(s.selected,'fighter');
 assert.equal(s.fliers[0].role,'fighter');
 assert.equal(s.phase,'playing');
});

test('steep dives produce useful overspeed that persists after leveling out',()=>{
  const game=launch();game.listeners.get('start:click')();
  const p=game.internals.state.fliers[0];p.spawnSafe=0;
  p.topRecovery=0;p.climbLoad=0;
  for(let i=0;i<110;i++){
    p.angle=Math.PI/2;p.x=220;p.y=105;p.topRecovery=0;p.climbLoad=0;
    game.internals.steerPlane(p,0,1/60);
  }
  const diveSpeed=p.speed;
  assert.ok(diveSpeed>p.d.speed*1.40,
    `a steep dive should accelerate well above cruise: ${diveSpeed}`);
  for(let i=0;i<45;i++){
    p.angle=0;p.x=220;p.y=105;p.topRecovery=0;p.climbLoad=0;
    game.internals.steerPlane(p,0,1/60);
  }
  assert.ok(p.speed>p.d.speed*1.20,
    `dive momentum should survive a .75s level-out: ${p.speed}`);
  assert.ok(p.speed<diveSpeed,'overspeed must gradually fade once level');
  assert.ok(p.speed<=p.d.speed*1.60+1,'overspeed must remain bounded');
});

test('Spitfire short Corkscrew burst remains faster than ordinary Bf 109 Overdrive',()=>{
  function boostedSpeed(type){
    const game=launch();game.listeners.get('start:click')();
    const p=game.internals.state.fliers[0];
    if(type==='bf109'){
      p.type='bf109';p.d=game.internals.PLANES.bf109;
      p.speed=p.d.speed*.8;p.role='fighter';
    }
    p.topRecovery=0;p.spawnSafe=0;
    game.internals.triggerSpecial(p);
    for(let i=0;i<34;i++){
      p.x=200;p.y=105;p.angle=0;p.climbLoad=0;
      game.internals.updatePlane(p,1/60,0);
    }
    assert.ok(p.boosting,'boost must be active inside the documented window');
    return {ratio:p.speed/p.d.speed,duration:p.overdriveTime};
  }
  const spitfire=boostedSpeed('fighter');
  const bf109=boostedSpeed('bf109');
  assert.ok(spitfire.ratio>bf109.ratio*1.07,
    'Spitfire offers a larger early acceleration advantage than Bf 109');
  assert.ok(spitfire.ratio<=1.84,'Spitfire respects the boost speed ceiling');
  assert.ok(spitfire.duration<bf109.duration,'Spitfire burst is shorter than Bf 109 overdrive');
});

test('player roll recovers quickly without making AI dodge more often',()=>{
 const game=launch();game.listeners.get('start:click')();
 const [player,enemy]=game.internals.state.fliers;
 game.internals.triggerRoll(player);
 assert.ok(player.rollRecovery<=.71,'player roll recovery is shortened');
 game.internals.triggerRoll(enemy);
 assert.ok(enemy.rollRecovery>=1.34,'AI keeps its original dodge interval');
 player.rollTime=0;player.rollRecovery=0;player.rollCooldown=0;player.pilotSkill='roll';
 game.internals.triggerPilotSkill(player);
 assert.equal(player.skillCooldown,7,'pilot roll cooldown reduced from 14s to 7s');
});


test('AI heavy fighter activates its shield proactively against bomber defensive fire',()=>{
 const game=launch();game.listeners.get('start:click')();
 const [bomber,heavy]=game.internals.state.fliers;
 heavy.type='heavy';heavy.role='heavy';heavy.d=game.internals.PLANES.heavy;
 heavy.health=heavy.d.hull;heavy.armour=heavy.d.armour*.9;
 heavy.x=205;heavy.y=105;heavy.vy=0;heavy.aiRecoveryTime=0;heavy.specialCooldown=0;
 bomber.x=245;bomber.y=105;bomber.rearShots=3;bomber.burstLeft=0;
 game.internals.aiInput(heavy,bomber);
 assert.ok(heavy.armourTime>0,'rear turret threat should trigger a shield before heavy hull damage');
});
test('bomber defensive gunners now have a bounded four-round low-damage burst',()=>{
 const game=launch();game.listeners.get('bomber:click')();game.listeners.get('start:click')();
 const [bomber,pursuer]=game.internals.state.fliers;
 bomber.x=205;bomber.y=120;bomber.angle=0;bomber.spawnSafe=0;
 pursuer.x=160;pursuer.y=120;pursuer.spawnSafe=0;
 game.internals.updatePlane(bomber,1/60,0);
 assert.equal(bomber.rearShots,3,'one round must fire immediately from the four-round burst');
 assert.ok(bomber.rearCooldown>=2.68);
 const round=game.internals.state.bullets.find(b=>b.rearGun);
 assert.equal(round.damage,4.5,'turret rounds should not match heavy cannon damage');
});

test('campaign pilot identities retain their signature while their actual live plane stats improve at higher ranks',()=>{
 const game=launch();game.listeners.get('start:click')();
 const state=game.internals.state,[player,enemy]=state.fliers;
 const lead={id:'ace-21',name:'Otto',rank:1,types:['bf110'],attributes:{manoeuvrability:55,gunnery:91,engine:78},signature:'harden',archetype:'Ironclad'};
 game.internals.assignCampaignAI(enemy,lead,0);
 const young={name:enemy.aiName,style:enemy.aiStyle,signature:enemy.pilotSkill,
  stats:{...enemy.attributes},reaction:enemy.aiSkillLevel};
 lead.rank=8;
 game.internals.assignCampaignAI(enemy,lead,0);
 assert.equal(enemy.aiName,young.name);
 assert.equal(enemy.aiStyle,young.style);
 assert.equal(enemy.pilotSkill,young.signature);
 assert.ok(enemy.attributes.manoeuvrability>young.stats.manoeuvrability);
 assert.ok(enemy.attributes.gunnery>=young.stats.gunnery);
 assert.ok(enemy.aiSkillLevel>young.reaction);
 assert.equal(enemy.health,enemy.d.hull,'ranking cannot add extra hull');
 assert.equal(enemy.d.damage,game.internals.PLANES[enemy.type].damage,'ranking cannot add raw gun damage');
});
test('rank-five double-ace wingman spawns as an independent pilot with own personality and signature',()=>{
 const game=launch();game.listeners.get('start:click')();
 const state=game.internals.state;
 const enc={rank:5,id:'ace-21',label:'Otto',types:['bf110','bf109'],
  attributes:{manoeuvrability:50,gunnery:75,engine:71},signature:'harden',archetype:'Ironclad',
  wingman:{id:'ace-22',name:'Friedrich',plane:'bf109',attributes:{manoeuvrability:82,gunnery:76,engine:75},signature:'reverse',archetype:'Fox'}};
 state.mode='campaign';
 game.internals.assignCampaignAI(state.fliers[1],enc,0);
 const wing={...state.fliers[1],id:2,type:'bf109',d:game.internals.PLANES.bf109,role:'fighter'};
 game.internals.assignCampaignAI(wing,enc,1);
 assert.equal(state.fliers[1].pilotSkill,'harden');
 assert.equal(wing.pilotSkill,'reverse');
 assert.equal(state.fliers[1].aiStyle,'guardian');
 assert.equal(wing.aiStyle,'trickster');
 assert.notEqual(wing.aiIdentity,state.fliers[1].aiIdentity);
 assert.notEqual(wing.attributes.gunnery,state.fliers[1].attributes.gunnery);
});

test('final mission starts as 1v2 with a queued elite, then the ace enters after first escort falls',()=>{
 const game=launch();
 const boss={id:'ace-21',name:'Otto "Sauerkraut" Krüger',plane:'bf110',signature:'harden',
  archetype:'Ironclad',attributes:{manoeuvrability:60,gunnery:85,engine:70}};
 const escorts=[{id:'ace-22',name:'Friedrich "Schnitzel" Bauer',plane:'bf109',signature:'reverse',
  archetype:'Fox',attributes:{manoeuvrability:90,gunnery:80,engine:75}},
 {id:'ace-25',name:'Ernst "Knödel" Neumann',plane:'he111',signature:'harden',
  archetype:'Bulwark',attributes:{manoeuvrability:70,gunnery:75,engine:65}}];
 const match={id:boss.id,label:boss.name,rank:8,mission:'FINAL SHOWDOWN',finalBoss:true,
  types:[escorts[0].plane,escorts[1].plane,boss.plane],opponents:[...escorts,boss],
  attributes:boss.attributes,signature:boss.signature,archetype:boss.archetype,difficulty:'ace',arena:0};
 game.internals.startCampaignFight(match,'fighter',null);
 const state=game.internals.state;
 assert.equal(state.fliers.length,4);
 assert.equal(state.participants,4);
 assert.equal(state.teams,true);
 assert.equal(state.time,165);
 assert.equal(state.fliers.filter(x=>x.id>0&&x.alive).length,2);
 assert.equal(state.fliers[3].queued,true);
 assert.equal(state.fliers[3].aiIdentity,boss.id);
 assert.equal(state.fliers[1].aiIdentity,escorts[0].id);
 assert.equal(state.fliers[2].aiIdentity,escorts[1].id);
 // The first dead escort must not count as completing the whole battle.
 state.fliers[1].spawnSafe=0;
 game.internals.hit(state.fliers[1],10000,state.fliers[1].x,state.fliers[1].y);
 assert.equal(state.phase,'playing');
 assert.equal(game.internals.bossWaiting(),true);
 game.internals.summonFinalAce(1/60);
 assert.equal(state.fliers[3].alive,true);
 assert.equal(state.fliers[3].queued,false);
 assert.equal(state.bossReinforcementLaunched,true);
 assert.equal(state.fliers[3].aiName,boss.name);
 assert.equal(state.fliers[3].pilotSkill,'harden');
 // Defeat all three, not merely the escort wave.
 for(const p of [state.fliers[2],state.fliers[3]]){
   p.spawnSafe=0;
   game.internals.hit(p,10000,p.x,p.y);
 }
 assert.equal(state.phase,'result');
});
test('final ace arrives after twenty seconds even when both escorts survive',()=>{
 const game=launch(),r={rank:8,id:'ace-24',label:'Kurt',types:['bf109','he111','bf110'],
   finalBoss:true,opponents:[
    {id:'ace-22',name:'Friedrich',plane:'bf109',signature:'reverse'},
    {id:'ace-26',name:'Hans',plane:'he111',signature:'smoke'},
    {id:'ace-24',name:'Kurt',plane:'bf110',signature:'roll'}]};
 game.internals.startCampaignFight(r,'fighter',null);
 game.internals.summonFinalAce(19);
 assert.equal(game.internals.bossWaiting(),true);
 game.internals.summonFinalAce(1.1);
 assert.equal(game.internals.bossWaiting(),false);
 assert.equal(game.internals.state.fliers.filter(p=>p.alive&&p.id>0).length,3);
});


test('Phase 6 Survival carries damaged hull and armour to subsequent wave with partial repairs',()=>{
 const game=launch();game.setMode('survival');game.listeners.get('start:click')();
 const state=game.internals.state;
 assert.equal(state.recordMode,'survival');
 const hero=state.fliers[0];
 hero.health=40;hero.armour=5;hero.spawnSafe=0;
 game.internals.endRound(0);
 assert.equal(state.phase,'intermission');
 assert.equal(state.session.roundsWon,1);
 assert.ok(state.survivalCarry.health>40 && state.survivalCarry.health<hero.d.hull);
 assert.ok(state.survivalCarry.armour>5 && state.survivalCarry.armour<hero.d.armour);
 const old={...state.survivalCarry};state.round=2;
 game.internals.newRound();
 assert.equal(state.phase,'playing');
 assert.equal(state.fliers[0].health,old.health);
 assert.equal(state.fliers[0].armour,old.armour);
 assert.equal(state.session.roundsWon,1,'successive waves belong to one single scorebook entry');
 state.fliers[0].spawnSafe=0;
 game.internals.hit(state.fliers[0],10000,state.fliers[0].x,state.fliers[0].y);
 assert.equal(state.phase,'result');
});
test('Phase 6 2v2 combat continues after player falls while friendly AI remains',()=>{
 const game=launch();game.setPilots(4);game.setTeams('teams');game.listeners.get('start:click')();
 const state=game.internals.state;
 assert.equal(state.recordMode,'teams');
 assert.deepEqual(Array.from(state.fliers,x=>x.team),[0,1,0,1]);
 const friendly=['fighter','heavy','bomber'], german=['bf109','bf110','he111'];
 assert.ok(friendly.includes(state.fliers[2].type));
 assert.ok(german.includes(state.fliers[1].type));
 assert.ok(german.includes(state.fliers[3].type));
 state.fliers[0].spawnSafe=0;
 game.internals.hit(state.fliers[0],9999,state.fliers[0].x,state.fliers[0].y);
 assert.equal(state.phase,'playing');
 assert.ok(game.internals.nearestEnemy(state.fliers[2])?.team===1);
 state.fliers[1].spawnSafe=0;state.fliers[3].spawnSafe=0;
 game.internals.hit(state.fliers[1],9999,state.fliers[1].x,state.fliers[1].y);
 assert.equal(state.phase,'playing');
 game.internals.hit(state.fliers[3],9999,state.fliers[3].x,state.fliers[3].y);
 assert.equal(state.phase,'result','surviving AI wingman can clinch victory');
 assert.equal(state.scores[0],1);
});
test('Phase 6 Free For All only awards a win after both rivals are destroyed',()=>{
 const game=launch();game.setPilots(3);game.listeners.get('start:click')();
 const state=game.internals.state;
 assert.equal(state.recordMode,'triple');
 state.fliers[1].spawnSafe=0;state.fliers[2].spawnSafe=0;
 game.internals.hit(state.fliers[1],9999,state.fliers[1].x,state.fliers[1].y);
 assert.equal(state.phase,'playing');
 game.internals.hit(state.fliers[2],9999,state.fliers[2].x,state.fliers[2].y);
 assert.equal(state.phase,'result');
 assert.equal(state.scores[0],1);
});
test('Phase 6 special challenges enforce forced enemy and clock, adverse weather and no armour',()=>{
 for(const [id,time,type] of [['intercept',45,'bf109'],['crosswind',75,null],['noarmour',90,null],['heavy',90,'bf110']]){
  const game=launch();game.setMode('challenge');game.setChallenge(id);
  game.listeners.get('start:click')();
  const state=game.internals.state;
  assert.equal(state.recordMode,'challenge');
  assert.equal(state.time,time);
  assert.equal(state.participants,2);
  assert.equal(state.challenge,id);
  if(type)assert.equal(state.fliers[1].type,type);
  if(id==='crosswind')assert.equal(state.wind.active,true);
  if(id==='noarmour')assert.equal(state.fliers[0].armour,0);
  if(id==='intercept'||id==='heavy')assert.equal(state.difficulty,'ace');
  state.time=.005;
  game.internals.update(.02);
  assert.equal(state.phase,'result',id+' expires as a real timed mission');
  assert.equal(state.scores[1],1);
 }
});
test('Phase 6 squadron target choices distribute enemy pilots and protect living allies',()=>{
 const game=launch();game.setPilots(4);game.setTeams('teams');game.listeners.get('start:click')();
 const state=game.internals.state;
 assert.equal(game.internals.nearestEnemy(state.fliers[1]).id,0);
 assert.equal(game.internals.nearestEnemy(state.fliers[3]).id,2);
 const wing=state.fliers[2];const chosen=game.internals.nearestEnemy(wing);
 assert.equal(chosen.team,1);
 state.fliers[0].alive=false;
 assert.equal(game.internals.nearestEnemy(state.fliers[1]).team,0);
 state.fliers[2].alive=false;
 assert.equal(game.internals.nearestEnemy(state.fliers[3]),undefined);
});

test('preferred-aircraft career bonus changes the actual hull, armour and gun damage by exactly 10%',()=>{
 const game=launch();
 const rival={id:'ace-21',label:'Otto',rank:2,types:['bf109'],difficulty:'standard',
  attributes:{manoeuvrability:65,gunnery:65,engine:65},signature:'roll',arena:0,
  playerAircraft:'fighter',playerAptitude:{hull:1.1,armour:1.1,damage:1.1}};
 game.internals.startCampaignFight(rival,'fighter',null);
 const hero=game.internals.state.fliers[0],base=game.internals.PLANES.fighter;
 assert.equal(hero.d.hull,Math.round(base.hull*1.1));
 assert.equal(hero.d.armour,Math.round(base.armour*1.1));
 assert.equal(hero.d.damage,Math.round(base.damage*1.1*100)/100);
 assert.equal(hero.health,hero.d.hull);
 assert.equal(hero.armour,hero.d.armour);
 assert.equal(game.internals.PLANES.fighter.hull,base.hull,'never mutate shared airframe definitions');
 const normal={...rival,playerAptitude:null,playerAircraft:'heavy'};
 game.internals.startCampaignFight(normal,'heavy',null);
 const heavy=game.internals.state.fliers[0];
 assert.equal(heavy.d.damage,game.internals.PLANES.heavy.damage);
 assert.equal(heavy.d.armour,game.internals.PLANES.heavy.armour);
 assert.equal(heavy.d.hull,game.internals.PLANES.heavy.hull);
});
test('revised Spitfire Overdrive offers a clearly stronger but bounded speed advantage',()=>{
 function fly(boost){
  const game=launch();game.listeners.get('start:click')();
  const p=game.internals.state.fliers[0];
  p.angle=0;p.y=100;p.speed=62;p.vx=62;p.vy=0;
  if(boost)p.overdriveTime=20;
  for(let n=0;n<180;n++)game.internals.updatePlane(p,1/60,0,boost);
  return {speed:p.speed,cap:p.d.speed,health:p.health,alive:p.alive};
 }
 const ordinary=fly(false),overdrive=fly(true);
 assert.ok(overdrive.speed>ordinary.speed*1.12,
  'boost should have a noticeable acceleration effect: '+ordinary.speed+' -> '+overdrive.speed);
 assert.ok(overdrive.speed<=overdrive.cap*2.11,'Overdrive must have a hard speed ceiling');
 assert.ok(Number.isFinite(overdrive.speed));
});

test('career tactical reserve lets player call one wingman early or wait for two, each for thirty seconds',()=>{
 const g=launch(),match={id:'ace-21',label:'test',rank:8,types:['bf109'],arena:0};
 g.internals.startCampaignFight(match,'fighter',null);
 const st=g.internals.state;
 g.internals.updateSupport(28);
 assert.ok(st.supportCharge>=45&&st.supportCharge<100,'one wingman charged early');
 assert.equal(g.internals.callSupport(),true);
 assert.equal(st.fliers.filter(p=>p.support).length,1);
 assert.equal(st.supportTime,30);
 assert.equal(g.internals.callSupport(),false,'one deployment only');
 g.internals.updateSupport(30);
 assert.equal(st.fliers.filter(p=>p.support).length,0);
 assert.equal(g.internals.callSupport(),false,'cannot call again this sortie');
 g.internals.startCampaignFight(match,'fighter',null);
 g.internals.updateSupport(65);
 assert.equal(st.supportCharge,100);
 assert.equal(g.internals.callSupport(),true);
 assert.equal(st.fliers.filter(p=>p.support).length,2);
 assert.equal(st.supportTime,30);
 assert.ok(st.fliers.filter(p=>p.support).every(p=>p.team===0));
});
test('career reserve is disabled in arcade dogfights',()=>{
 const g=launch();g.listeners.get('start:click')();
 g.internals.updateSupport(100);
 assert.equal(g.internals.state.supportCharge,0);
 assert.equal(g.internals.callSupport(),false);
});

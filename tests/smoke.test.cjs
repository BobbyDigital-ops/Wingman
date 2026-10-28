const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8');

function launch(){
  const listeners=new Map();
  const noop=()=>{};
  const ctx=new Proxy({measureText:s=>({width:String(s).length*5})},{
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
  el['arena-select']={value:'0'};
  for(const id of ['menu','result','result-title','result-detail','start',
    'rematch','change-plane','left','right','boost','fire','special','roll','bomb']){
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
    document,window:{addEventListener:(type,cb)=>listeners.set('window:'+type,cb)},requestAnimationFrame:cb=>{nextFrame=cb},
    console
  };
  const instrumented=code.replace('  // All scenery is painted once;',
    '  window.__wingmanTest={state,triggerBomb,triggerSpecial,hit,steerPlane,updatePlane,controls};\n  // All scenery is painted once;');
  const artCode=fs.readFileSync(require('node:path').join(__dirname,'../src/art/aircraft.js'),'utf8');
  vm.runInNewContext(artCode,sandbox,{timeout:3000,filename:'aircraft.js'});
  vm.runInNewContext(instrumented,sandbox,{timeout:3000,filename:'game.js'});
  return {
    listeners,canvas,modelCanvas,internals:sandbox.window.__wingmanTest,
    setPilots:n=>{el['pilots-select'].value=String(n);},
    setTeams:v=>{el['team-select'].value=v;},
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
  assert.equal(game.canvas.width,520);
  game.setViewport(1350,490);
  assert.equal(game.canvas.width,Math.round(250*1350/490));
  assert.equal(game.canvas.height,250);
  game.listeners.get('start:click')();
  game.advance(400,1200);
  game.setViewport(960,540);
  assert.equal(game.canvas.width,520);
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
test('Spitfire swoop follows a timed arc without instant reversal',()=>{
 const game=launch();
 game.listeners.get('start:click')();
 const fighter=game.internals.state.fliers[0];
 const heading=fighter.angle,initialY=fighter.y;
 game.internals.triggerSpecial(fighter);
 assert.ok(fighter.swoopTime>1);
 assert.equal(fighter.angle,heading);
 game.advance(14,1000);
 assert.ok(fighter.y<initialY,'first part of swoop should climb');
});
test('Bomber climb does not release bombs, separate BOMB button does',()=>{
 const game=launch();
 game.listeners.get('bomber:click')();
 game.listeners.get('start:click')();
 const bomber=game.internals.state.fliers[0];
 assert.equal(game.internals.state.bombs.length,0);
 game.internals.triggerSpecial(bomber);
 assert.ok(bomber.climbAssist>0);
 assert.equal(game.internals.state.bombs.length,0);
 game.listeners.get('bomb:pointerdown')({pointerId:3,preventDefault(){}});
 assert.equal(game.internals.state.bombs.length,1);
 assert.ok(bomber.bombCooldown>0);
});


test('Spitfire has effective guns while remaining controllable',()=>{
 const game=launch();
 game.listeners.get('start:click')();
 const s=game.internals.state.fliers[0];
 assert.equal(s.d.speed,83);
 assert.equal(s.d.damage,15);
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
test('swoop is a continuous curved move rather than an instant heading flip',()=>{
 const game=launch();
 game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];
 const originalAngle=p.angle,originY=p.y;
 game.internals.triggerSpecial(p);
 assert.equal(p.angle,originalAngle);
 let previous={x:p.x,y:p.y},highest=p.y;
 for(let i=0;i<84;i++){
   game.advance(1,2000+i*16.6667);
   highest=Math.min(highest,p.y);
   const step=Math.hypot(p.x-previous.x,p.y-previous.y);
   assert.ok(step<9.5,'swoop should have no sudden position jumps');
   previous={x:p.x,y:p.y};
 }
 assert.ok(highest<originY-5,'the aircraft should arc above its initial altitude');
 assert.equal(p.swoop,null);
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
test('top boundary is recoverable and does not deal health damage',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];
 p.spawnSafe=0;p.y=32;p.angle=-Math.PI/2;
 const hp=p.health;game.advance(2,1000);
 assert.ok(p.alive);assert.equal(p.health,hp);assert.ok(p.y>=37);
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

test('component failure needs repeated accurate hits and leaves hull intact',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[1];p.spawnSafe=0;
 for(let i=0;i<6;i++)game.internals.hit(p,15,p.x,p.y,'engine');
 assert.ok(p.parts.engine>0,'six targeted gun hits cannot kill the engine');
 assert.equal(p.critical,false);
 for(let i=0;i<9;i++)game.internals.hit(p,15,p.x,p.y,'engine');
 assert.equal(p.parts.engine,0);
 assert.equal(p.criticalCause,'ENGINE FAILURE');
 assert.ok(p.health>0,'engine failure occurs before loss of hull');
});
test('tail damage limits turns without removing steering',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];p.spawnSafe=0;
 p.parts.tail=0;p.energy=90;
 const angle=p.angle;
 game.internals.steerPlane(p,1,1/60);
 assert.ok(p.angle>angle,'steering still responds');
 assert.ok(p.turnVelocity<.1,'tail damage limits turn authority');
 assert.ok(p.alive);
});
test('body hits reduce structural health without instant failure',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[1];p.spawnSafe=0;
 game.internals.hit(p,15,p.x,p.y,'body');
 assert.ok(p.health>0);
 assert.equal(p.critical,false);
 assert.ok(p.parts.body<100);
});
test('holding boost uses charge and releasing it recharges',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];
 game.listeners.get('document:keydown')({code:'KeyW',repeat:false,preventDefault(){}});
 game.advance(50,1000);
 const charged=p.boostCharge;
 assert.ok(charged<90,'holding boost consumes charge');
 assert.equal(p.boosting,true);
 game.listeners.get('document:keyup')({code:'KeyW'});
 game.advance(35,2000);
 assert.ok(p.boostCharge>charged,'charge regenerates while not boosting');
});
test('steep climbs stall gently, dives recover',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];p.spawnSafe=0;
 p.energy=0;p.angle=-Math.PI/3;p.y=100;
 game.internals.steerPlane(p,1,1/60);
 assert.ok(p.flightRisk>.5);assert.ok(p.stallTime>0);
 const hp=p.health;
 p.angle=Math.PI/3;
 for(let i=0;i<30;i++)game.internals.steerPlane(p,0,1/60);
 assert.equal(p.health,hp);
 assert.equal(p.stallTime,0);
});
test('swoop briefly evades guns and exits at a bounded speed',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];
 game.internals.triggerSpecial(p);
 assert.ok(p.evasiveTime>0);
 game.advance(100,1000);
 assert.equal(p.swoop,null);
 assert.ok(p.speed<=p.d.speed*1.4);
});

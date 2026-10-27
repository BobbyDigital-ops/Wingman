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
  let viewport={width:320,height:180};
  el.frame={getBoundingClientRect:()=>viewport};
  for(const id of ['menu','result','result-title','result-detail','start',
    'rematch','change-plane','left','right','fire','special','roll','bomb']){
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
    getElementById:id=>id==='game'?canvas:el[id],
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
    '  window.__wingmanTest={state,triggerBomb,triggerSpecial};\n  // All scenery is painted once;');
  vm.runInNewContext(instrumented,sandbox,{timeout:3000,filename:'game.js'});
  return {
    listeners,canvas,internals:sandbox.window.__wingmanTest,
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
  assert.equal(game.canvas.width,480);
  game.setViewport(1350,490);
  assert.equal(game.canvas.width,Math.round(180*1350/490));
  assert.equal(game.canvas.height,180);
  game.listeners.get('start:click')();
  game.advance(400,1200);
  game.setViewport(960,540);
  assert.equal(game.canvas.width,480);
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

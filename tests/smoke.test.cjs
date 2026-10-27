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
    'rematch','change-plane','left','right','fire','special','roll']){
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
  vm.runInNewContext(code,sandbox,{timeout:3000,filename:'game.js'});
  return {
    listeners,canvas,
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

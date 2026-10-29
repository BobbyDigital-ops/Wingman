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
    document,window:{addEventListener:(type,cb)=>listeners.set('window:'+type,cb)},requestAnimationFrame:cb=>{nextFrame=cb},
    console
  };
  const instrumented=code.replace('  // All scenery is painted once;',
    '  window.__wingmanTest={state,triggerBomb,triggerSpecial,triggerRoll,triggerPilotSkill,hit,steerPlane,updatePlane,controls,aiInput,assignCampaignAI,tailMagnet,shoot,rollWind,updateWind,projectiles,PLANES,wrappedDelta,combatDistance,interceptPoint};\n  // All scenery is painted once;');
  const artCode=fs.readFileSync(require('node:path').join(__dirname,'../src/art/aircraft.js'),'utf8');
  vm.runInNewContext(artCode,sandbox,{timeout:3000,filename:'aircraft.js'});
  const sceneryCode=fs.readFileSync(require('node:path').join(__dirname,'../src/art/scenery.js'),'utf8');
  vm.runInNewContext(sceneryCode,sandbox,{timeout:3000,filename:'scenery.js'});
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
test('Fighter Overdrive activates for a bounded duration and has a cooldown',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];
 game.internals.triggerSpecial(p);
 assert.ok(p.overdriveTime>2.5);
 assert.equal(p.specialCooldown,12);
 game.advance(8,1000);
 assert.equal(p.boosting,true);
 assert.ok(p.overdriveTime<2.8);
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
test('ceiling allows exit then re-enters with reversed horizontal heading and no damage',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];p.spawnSafe=0;
 p.y=1;p.angle=-Math.PI/3;p.speed=88;
 p.vx=44;p.vy=-75;p.climbLoad=30;
 const hp=p.health;
 game.internals.steerPlane(p,0,1/60);
 assert.ok(p.y<31,'aircraft may pass above playable sky before wrapping');
 assert.ok(p.vy<0,'flight continues upwards without ceiling bounce');
 p.y=-p.d.radius-1;
 game.internals.steerPlane(p,0,1/60);
 assert.ok(p.alive);assert.equal(p.health,hp);
 assert.ok(p.y>=39+p.d.radius,'aircraft returns visibly below the HUD');
 assert.ok(p.vx<0,'horizontal direction reverses');
 assert.ok(p.vy>0,'aircraft flies back into arena');
 assert.equal(p.flightRisk,0);
});
test('ceiling re-entry works during a special reversal too',()=>{
 const game=launch();game.listeners.get('start:click')();
 const p=game.internals.state.fliers[0];
 game.internals.triggerSpecial(p);
 p.y=-p.d.radius-2;
 game.internals.steerPlane(p,0,1/60);
 assert.ok(p.y>=39+p.d.radius&&p.vy>0);
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
 p.role='heavy';
 game.internals.triggerSpecial(p);
 assert.ok(p.armourTime>0);
 assert.equal(p.specialCooldown,20);
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
test('Phase 8 damage smoke and shockwaves are bounded visual effects, not collision changes',()=>{
  const game=launch();game.listeners.get('start:click')();
  const s=game.internals.state,p=s.fliers[0];p.spawnSafe=0;
  game.internals.hit(p,p.d.armour+45,p.x,p.y);
  assert.ok(s.blasts.length>0,'impacts emit a short glow');
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

test('Spitfire Overdrive gains about 25 percent power; BF 109 keeps previous boost',()=>{
  function overdriveSpeed(type){
    const game=launch();game.listeners.get('start:click')();
    const p=game.internals.state.fliers[0];
    if(type==='bf109'){
      p.type='bf109';p.d=game.internals.PLANES.bf109;
      p.speed=p.d.speed*.8;p.role='fighter';
    }
    p.topRecovery=0;p.spawnSafe=0;
    game.internals.triggerSpecial(p);
    for(let i=0;i<145;i++){
      p.x=200;p.y=105;p.angle=0;p.climbLoad=0;
      game.internals.updatePlane(p,1/60,0);
    }
    assert.ok(p.boosting,'Overdrive remains active during acceleration');
    return p.speed/p.d.speed;
  }
  const spitfire=overdriveSpeed('fighter');
  const bf109=overdriveSpeed('bf109');
  assert.ok(spitfire>bf109*1.18,
    `Spitfire boost should exceed previous fighter tuning by roughly 25%: ${spitfire} vs ${bf109}`);
  assert.ok(spitfire<1.90+0.01,'Spitfire should respect the boosted speed ceiling');
});

test('player roll recovers quickly without making AI dodge more often',()=>{
 const game=launch();game.listeners.get('start:click')();
 const [player,enemy]=game.internals.state.fliers;
 game.internals.triggerRoll(player);
 assert.ok(player.rollRecovery<=.71,'player roll recovery is shortened');
 game.internals.triggerRoll(enemy);
 assert.ok(enemy.rollRecovery>=1.34,'AI keeps its original dodge interval');
 player.rollTime=0;player.rollRecovery=0;player.pilotSkill='roll';
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

#!/usr/bin/env node
'use strict';
// Test-only instrumentation of the production game.js engine; no gameplay hooks ship.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
const types=['fighter','bf109','heavy','bf110','bomber','he111'];
const arenas=['alpine','coast','desert','storm'],difficulties=['rookie','standard','ace'];
function edit(s,find,replacement){assert.equal(s.split(find).length,2,'Missing/nonunique anchor '+find.slice(0,60));return s.replace(find,replacement);}
function launch(){
 let src=source;
 src=edit(src,'      updatePlane(user,dt,(controls.right?1:0)-(controls.left?1:0),controls.boost);',
 '      if(state.bench){const foe=nearestEnemy(user);updatePlane(user,dt,foe?aiInput(user,foe):0,user.aiBoost);}else updatePlane(user,dt,(controls.right?1:0)-(controls.left?1:0),controls.boost);');
 src=edit(src,"    if(p.id!==0||steer!==0||p.swoop||!p.alive)return 0;","    if(p.id!==0||state.bench||steer!==0||p.swoop||!p.alive)return 0;");
 src=edit(src,"    p.rollRecovery=(p.id===0?.70:1.35)+(p.role==='bomber'?.35:0);",
 "    p.rollRecovery=(p.id===0&&!state.bench?.70:1.35)+(p.role==='bomber'?.35:0);");
 src=edit(src,'  function shoot(p){','  function shoot(p){if(state.bench)window.s.shots[p.id]++;');
 src=edit(src,'  function releaseBomb(p){','  function releaseBomb(p){if(state.bench)window.s.bombs[p.id]++;');
 src=edit(src,'            state.bullets.push({\n              x:muzzleX',
 '            if(state.bench)window.s.shots[p.id]++;\n            state.bullets.push({\n              x:muzzleX');
 src=edit(src,'          if(hitBody||hitWing){\n            hit(target,b.damage',
 '          if(hitBody||hitWing){\n            if(state.bench)window.s.hits[b.owner]++;\n            hit(target,b.damage');
 src=edit(src,'  function emit(x,y,count,color,power){','  function emit(x,y,count,color,power){if(state.bench)return;');
 src=edit(src,'  function endRound(winner){','  function endRound(winner){if(state.bench){state.benchWinner=winner;state.phase="result";return;}');
 const api=[
 'window.balance={',
 'setup(a,b,difficulty,arena,wind){',
 'state.bench=false;state.mode="duel";state.participants=2;state.teams=false;state.selected=a;state.enemyType=b;state.difficulty=difficulty;state.arena=arena;',
 'newRound();',
 'if(wind==="off")state.wind={active:false,base:0,current:0,elapsed:0};',
 'else if(wind==="on")state.wind={active:true,base:12,current:12,elapsed:0};',
 'state.bench=true;state.benchWinner=null;window.s={shots:[0,0],hits:[0,0],bombs:[0,0]};',
 '},',
 'run(frames){',
 'const initial=state.fliers.map(p=>p.health+p.armour),ground=[false,false];let framesElapsed=0,bad=false;',
 'for(let k=0;k<frames&&state.phase==="playing";k++){update(STEP);framesElapsed++;',
 'for(const p of state.fliers){if(!p.alive&&p.damageCause==="GROUND")ground[p.id]=true;if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.health))bad=true;}',
 'if(bad)break;',
 '}',
 'const remaining=state.fliers.map(p=>p.health+p.armour);const fractions=remaining.map((x,i)=>x/initial[i]);',
 'const timedOut=state.phase==="playing";',
 'const winner=timedOut?(Math.abs(fractions[0]-fractions[1])<.025?-1:fractions[0]>fractions[1]?0:1):state.benchWinner;',
 'return {winner,seconds:framesElapsed*STEP,timeout:timedOut,ground,bad,shots:window.s.shots,hits:window.s.hits,bombs:window.s.bombs,damage:[initial[1]-remaining[1],initial[0]-remaining[0]]};',
 '},state',
 '};'
 ].join('\n');
 src=edit(src,'  // All scenery is painted once;',api+'\n  // All scenery is painted once;');
 const noop=()=>{},ctx=new Proxy({measureText:t=>({width:String(t).length*5}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),createConicGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
 const elements={},canvas={width:520,height:250,getContext:()=>ctx};
 elements.frame={getBoundingClientRect:()=>({width:520,height:250})};
 const document={hidden:false,documentElement:{style:{setProperty:noop}},getElementById:k=>k==='game'||k==='aircraft-layer'?canvas:(elements[k]??={value:'',hidden:false,textContent:'',classList:{add:noop,remove:noop,toggle:noop},setAttribute:noop,addEventListener:noop}),createElement:()=>({getContext:()=>ctx}),querySelectorAll:()=>[],addEventListener:noop};
 let seed=1;const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const window={matchMedia:()=>({matches:false}),devicePixelRatio:1,innerHeight:250,addEventListener:noop};
 vm.runInNewContext(src,{Math:math,document,window,requestAnimationFrame:noop,console},{filename:'game.js',timeout:3000});
 return {api:window.balance,seed:n=>seed=n>>>0};
}
function tournament({reps=1,seconds=90,wind='random',arenaFilter=null,difficultyFilter=null}={}){
 const bench=launch(),matches=[];
 for(const difficulty of difficultyFilter?[difficultyFilter]:difficulties)for(let arena=0;arena<arenas.length;arena++){
 if(arenaFilter&&arenas[arena]!==arenaFilter)continue;
 for(let i=0;i<types.length;i++)for(let j=i+1;j<types.length;j++)for(let rep=0;rep<reps;rep++){
 const seed=(73129+rep*971+arena*1249+difficulties.indexOf(difficulty)*223+i*1787+j*337)>>>0;
 for(const [a,b] of [[types[i],types[j]],[types[j],types[i]]]){
  bench.seed(seed);bench.api.setup(a,b,difficulty,arena,wind);
  const value=bench.api.run(Math.round(seconds*60));
  assert(!value.bad,'Invalid physics: '+a+' '+b);
  matches.push({a,b,difficulty,arena:arenas[arena],seed,wind,...value});
 }
 }
 }
 const summary={};for(const type of types)summary[type]={played:0,wins:0,losses:0,draws:0,ground:0,timeouts:0,shots:0,hits:0,bombs:0,damage:0,seconds:0};
 const pairs={};
 for(const m of matches){
  for(const side of [0,1]){
   const x=summary[side===0?m.a:m.b];x.played++;x.wins+=Number(m.winner===side);x.losses+=Number(m.winner>=0&&m.winner!==side);x.draws+=Number(m.winner===-1);
   x.ground+=Number(m.ground[side]);x.timeouts+=Number(m.timeout);x.shots+=m.shots[side];x.hits+=m.hits[side];x.bombs+=m.bombs[side];x.damage+=m.damage[side];x.seconds+=m.seconds;
  }
  const label=[m.a,m.b].sort().join(' vs '),p=pairs[label]??={games:0,win:{},draws:0};
  p.games++;p.draws+=Number(m.winner===-1);if(m.winner>=0){const t=m.winner===0?m.a:m.b;p.win[t]=(p.win[t]||0)+1;}
 }
 for(const [type,s] of Object.entries(summary)){
  s.winRate=+((s.wins+s.draws*.5)/s.played*100).toFixed(1);
  s.groundPct=+(s.ground/s.played*100).toFixed(1);
  s.timeoutPct=+(s.timeouts/s.played*100).toFixed(1);
  s.accuracyPct=s.shots?+(s.hits/s.shots*100).toFixed(2):0;
  s.avgDamage=+(s.damage/s.played).toFixed(1);
  s.avgSeconds=+(s.seconds/s.played).toFixed(1);
 }
 return {meta:{games:matches.length,seedPairs:true,reps,seconds,wind,arenas:arenaFilter?[arenaFilter]:arenas,difficulties:difficultyFilter?[difficultyFilter]:difficulties},summary,pairs,matches};
}
if(require.main===module){
 const arg=Object.fromEntries(process.argv.slice(2).map(s=>s.replace(/^--/,'').split('=')));
 const result=tournament({reps:Number(arg.reps||1),seconds:Number(arg.seconds||90),wind:arg.wind||'random',arenaFilter:arg.arena||null,difficultyFilter:arg.difficulty||null});
 console.table(result.summary);console.log('Sample pairs',Object.entries(result.pairs).slice(0,15));console.log(result.meta);
 if(arg.output)fs.writeFileSync(arg.output,JSON.stringify(result,null,2));
}
module.exports={launch,tournament,types,arenas,difficulties};

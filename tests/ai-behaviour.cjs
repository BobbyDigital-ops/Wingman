/* Wingman tactical QA — actual production game and swoop engine, no toy physics.
   Scenarios exercise pursuit, tail retention, threat evasion, bombing, ground
   collision and ceiling contact, with deterministic seeds and both aircraft orders.
   Run: node tests/ai-behaviour.cjs [--seconds=60] [--reps=2]
*/
'use strict';
function runAI(sources,{reps=1,seconds=60,scenarios=['duel','escape','pursuer']}={}){
 let source=sources.game;
 const edit=(from,to)=>{if(source.split(from).length!==2)throw Error('QA anchor missing: '+from.slice(0,75));source=source.replace(from,to);};
 edit('      if(user.alive)updatePlane(user,dt,(controls.right?1:0)-(controls.left?1:0),controls.boost);',
 '      if(state.qa){const foe=nearestEnemy(user);const steer=state.qaScenario==="escape"?clamp(angleDiff(0,user.angle)*3,-1,1):foe?aiInput(user,foe):0;updatePlane(user,dt,steer,user.aiBoost);}else if(user.alive)updatePlane(user,dt,(controls.right?1:0)-(controls.left?1:0),controls.boost);');
 edit('    if(p.id!==0||steer!==0||p.swoop||!p.alive)return 0;',
 '    if(p.id!==0||state.qa||steer!==0||p.swoop||!p.alive)return 0;');
 edit('    p.rollRecovery=(p.id===0?.70:1.35)+(p.role===\'bomber\'?.35:0);',
 '    p.rollRecovery=(p.id===0&&!state.qa?.70:1.35)+(p.role===\'bomber\'?.35:0);');
 edit('  function emit(x,y,count,color,power,kind=\'\'){',
 '  function emit(x,y,count,color,power,kind=\'\'){if(state.qa)return;');
 edit('  function endRound(winner){','  function endRound(winner){if(state.qa){state.qaWinner=winner;state.phase="result";return;}');
 edit('  // All scenery is painted once;',`  window.aiQA={
 setup(a,b,d,scenario,wind){
  state.qa=false;state.mode='duel';state.participants=2;state.teams=false;state.selected=a;state.enemyType=b;state.difficulty=d;
  newRound();state.wind=wind?{active:true,base:10,current:10,elapsed:0}:{active:false,base:0,current:0,elapsed:0};
  state.qa=true;state.qaScenario=scenario;state.qaWinner=null;
  if(scenario==='pursuer'){
   const p=state.fliers[0],q=state.fliers[1];
   p.x=220;p.y=125;p.angle=0;p.vx=p.speed;p.vy=0;
   q.x=145;q.y=130;q.angle=0;q.vx=q.speed;q.vy=0;
  }
 },
 tick(maxFrames){
  const ground=[false,false],tail=[0,0],closing=[0,0],opportunities=[0,0],modes=[{},{}],planChanges=[0,0],ceiling=[0,0];
  const prevPlan=['',''],prevTop=[0,0];let frames=0;
  for(let n=0;n<maxFrames&&state.phase==='playing';n++){
   const distBefore=combatDistance(state.fliers[0],state.fliers[1]);update(STEP);frames++;
   for(const p of state.fliers){
    const i=p.id,t=state.fliers[1-i];const d=combatDistance(p,t);
    const m=modes[i];m[p.aiMode]=(m[p.aiMode]||0)+1;
    const plan=p.aiPlan||p.aiMode;if(plan!==prevPlan[i]){planChanges[i]++;prevPlan[i]=plan;}
    const top=+(p.topRecovery>0);if(top&&!prevTop[i])ceiling[i]++;prevTop[i]=top;
    if(!p.alive&&p.damageCause==='GROUND')ground[i]=true;
    const dx=wrappedDelta(t.x,p.x),dy=p.y-t.y;
    const along=dx*Math.cos(t.angle)+dy*Math.sin(t.angle);
    const lateral=Math.abs(dx*Math.sin(t.angle)-dy*Math.cos(t.angle));
    if(p.alive&&t.alive&&along< -18&&lateral<48&&d<145)tail[i]+=STEP;
    if(p.alive&&t.alive&&d<150&&Math.abs(angleDiff(Math.atan2(t.y-p.y,wrappedDelta(p.x,t.x)),p.angle))<.30)opportunities[i]+=STEP;
    if(state.qaScenario==='escape'&&i===1&&d<distBefore)closing[i]+=STEP;
   }
  }
  return {frames,ground,tail,closing,opportunities,modes,planChanges,ceiling,
   bombs:state.fliers.map(p=>p.bombRunId||0),shots:state.fliers.map(p=>p.tracerCount||0)};
 }};
  // All scenery is painted once;`);
 const noop=()=>{};
 const ctx=new Proxy({measureText:t=>({width:String(t).length*5}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),createConicGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
 const elements={},canvas={width:520,height:250,getContext:()=>ctx};
 elements.frame={getBoundingClientRect:()=>({width:520,height:250})};
 const document={hidden:false,documentElement:{style:{setProperty:noop}},getElementById:k=>k==='game'||k==='aircraft-layer'?canvas:(elements[k]??={value:'',hidden:false,textContent:'',classList:{add:noop,remove:noop,toggle:noop},setAttribute:noop,addEventListener:noop}),createElement:()=>({getContext:()=>ctx}),querySelectorAll:()=>[],addEventListener:noop};
 const window={location:{search:''},matchMedia:()=>({matches:false}),devicePixelRatio:1,innerWidth:1280,innerHeight:720,addEventListener:noop},Params=class{get(){return null}};
 let seed=1;const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(const script of [sources.physics,sources.aircraft,sources.scenery])new Function('window','document','Math',script)(window,document,math);
 new Function('window','document','requestAnimationFrame','localStorage','URLSearchParams','Math',source)(window,document,noop,{getItem:()=>null,setItem:noop},Params,math);
 const types=['fighter','bf109','heavy','bf110','bomber','he111'];
 const summary={games:0,groundCrashes:0,byType:{},bombSalvos:0,gunShots:0,tailSeconds:0,pursuitSeconds:0,firingOpportunitySeconds:0,ceilingContact:0,modeChanges:0,modes:{},scenarios:{},samples:[]};
 for(const t of types)summary.byType[t]={games:0,groundCrashes:0,bombSalvos:0,tailSeconds:0,ceilingContact:0};
 for(const scenario of scenarios){
  summary.scenarios[scenario]={games:0,groundCrashes:0,tailSeconds:0,evadeSeconds:0,pursuitSeconds:0};
  for(let rep=0;rep<reps;rep++)for(let i=0;i<types.length;i++)for(let j=i+1;j<types.length;j++){
   for(const order of [0,1]){
    const a=order?types[j]:types[i],b=order?types[i]:types[j];seed=10001+rep*17029+i*1873+j*3899+order*1193;
    window.aiQA.setup(a,b,'ace',scenario,rep%2===1);const x=window.aiQA.tick(Math.round(seconds*60));
    summary.games++;summary.scenarios[scenario].games++;
    for(let side=0;side<2;side++){
     const type=side===0?a:b,t=summary.byType[type],sc=summary.scenarios[scenario];
     t.games++;t.groundCrashes+=+x.ground[side];t.bombSalvos+=x.bombs[side];t.tailSeconds+=x.tail[side];t.ceilingContact+=x.ceiling[side];
     summary.groundCrashes+=+x.ground[side];sc.groundCrashes+=+x.ground[side];
     summary.bombSalvos+=x.bombs[side];summary.gunShots+=x.shots[side];summary.tailSeconds+=x.tail[side];sc.tailSeconds+=x.tail[side];
     summary.pursuitSeconds+=x.closing[side];sc.pursuitSeconds+=x.closing[side];
     summary.firingOpportunitySeconds+=x.opportunities[side];summary.ceilingContact+=x.ceiling[side];summary.modeChanges+=x.planChanges[side];
     sc.evadeSeconds+=(x.modes[side].evade||0)/60;
     for(const [m,v] of Object.entries(x.modes[side]))summary.modes[m]=(summary.modes[m]||0)+v/60;
     if(x.ground[side])summary.samples.push({scenario,a,b,crash:type,frame:x.frames});
    }
   }
  }
 }
 const round=n=>+n.toFixed(1);for(const k of ['tailSeconds','pursuitSeconds','firingOpportunitySeconds'])summary[k]=round(summary[k]);
 for(const x of Object.values(summary.scenarios))for(const k of ['tailSeconds','evadeSeconds','pursuitSeconds'])x[k]=round(x[k]);
 for(const x of Object.values(summary.byType))x.tailSeconds=round(x.tailSeconds);
 for(const [k,v] of Object.entries(summary.modes))summary.modes[k]=round(v);
 return summary;
}
if(typeof module!=='undefined')module.exports={runAI};
if(typeof require==='function'&&typeof module!=='undefined'&&require.main===module){
 const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..');
 const load=p=>fs.readFileSync(path.join(root,p),'utf8');
 const result=runAI({game:load('game.js'),physics:load('src/physics/swoop-flight.js'),aircraft:load('src/art/aircraft.js'),scenery:load('src/art/scenery.js')},{reps:1,seconds:Number(process.argv.find(a=>a.startsWith('--seconds='))?.split('=')[1]||60)});
 console.log(JSON.stringify(result,null,2));
 if(result.groundCrashes>0)process.exitCode=1;
}

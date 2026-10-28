/* Wingman v0.1: dependency-free 320x180 fixed-step aerial duels.
   Gameplay is separated from rendering so input can later be sourced from networking. */
(() => {
  'use strict';
  let W=520; const H=250, STEP=1/60, TAU=Math.PI*2;
  const canvas=document.getElementById('game');
  const aircraftArt=window.WingmanSprites;
  const modelCanvas=document.getElementById('aircraft-layer');
  const modelCtx=modelCanvas.getContext('2d',{alpha:true});
  let g=canvas.getContext('2d',{alpha:false});
  g.imageSmoothingEnabled=false;

  const PLANES={
    fighter:{name:'SUPERMARINE SPITFIRE',speed:83,turn:3.15,hull:110,radius:5.5,burst:10,interval:.055,cooldown:1.35,damage:15,bulletSpeed:194,specialCd:8,color:'#d5d9b5',shade:'#5c756d',accent:'#db8a51',special:'SWOOP'},
    heavy:{name:'BRISTOL BEAUFIGHTER',speed:72,turn:1.55,hull:160,radius:8,burst:3,interval:.19,cooldown:2.8,damage:29,bulletSpeed:177,specialCd:20,color:'#bd765c',shade:'#673f42',accent:'#f4c47e',special:'ARMOUR'},
    bomber:{name:'AVRO LANCASTER',speed:60,turn:1.05,hull:205,radius:9,burst:2,interval:.30,cooldown:3.2,damage:8,bulletSpeed:85,specialCd:10,color:'#c8b087',shade:'#807359',accent:'#e7dbaf',special:'CLIMB'},
    bf109:{name:'MESSERSCHMITT BF 109',class:'fighter',nation:'Germany',speed:86,turn:3.0,hull:104,radius:5.5,burst:8,interval:.067,cooldown:1.4,damage:15,bulletSpeed:187,specialCd:8,color:'#afb89d',shade:'#647a74',accent:'#ecd06c',special:'SWOOP'},
    bf110:{name:'MESSERSCHMITT BF 110',class:'heavy',nation:'Germany',speed:75,turn:1.47,hull:149,radius:8,burst:3,interval:.20,cooldown:2.7,damage:30,bulletSpeed:173,specialCd:20,color:'#b1b7a4',shade:'#53676a',accent:'#e5c77b',special:'ARMOUR'},
    he111:{name:'HEINKEL HE 111',class:'bomber',nation:'Germany',speed:64,turn:1.12,hull:170,radius:8.5,burst:2,interval:.32,cooldown:3.1,damage:8,bulletSpeed:89,specialCd:10,color:'#a5ae9d',shade:'#576b61',accent:'#b4baca',special:'CLIMB'}
  };
  const state={
    phase:'menu',selected:'fighter',fliers:[],bullets:[],bombs:[],mines:[],sparks:[],
    scores:[0,0],round:1,time:90,intermission:0,banner:'',bannerTime:0,paused:false,
    impactLock:0,enemyType:'heavy',mode:'duel',arena:0,kills:0,participants:2,teams:false,difficulty:'standard'
  };
  const controls={left:false,right:false,boost:false};
  const ui={
    menu:document.getElementById('menu'),result:document.getElementById('result'),
    resultTitle:document.getElementById('result-title'),resultDetail:document.getElementById('result-detail'),
    start:document.getElementById('start'),rematch:document.getElementById('rematch'),
    change:document.getElementById('change-plane')
  };
  let audio=null;
  const random=(a,b)=>a+Math.random()*(b-a);
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const angleDiff=(target,current)=>Math.atan2(Math.sin(target-current),Math.cos(target-current));
  const palette={sky:'#95c7df',ink:'#243945',cream:'#f2e1ad',red:'#e88469'};

  function audioUnlock(){
    try{
      const Ctx=window.AudioContext||window.webkitAudioContext;
      if(Ctx&&!audio){audio=new Ctx();}
      if(audio&&audio.state==='suspended')audio.resume().catch(()=>{});
    }catch(_){}
  }
  function sound(type){
    if(!audio||audio.state!=='running')return;
    try{
      const t=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
      osc.type=type==='hit'?'triangle':'square';
      const hz=type==='shot'?195:type==='boom'?76:type==='hit'?310:450;
      osc.frequency.setValueAtTime(hz,t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(45,hz*.55),t+.10);
      gain.gain.setValueAtTime(type==='boom'?.055:.024,t);
      gain.gain.exponentialRampToValueAtTime(.001,t+.11);
      osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.115);
    }catch(_){}
  }
  function plane(type,id,x,y,angle){
    const d=PLANES[type];
    return {id,type,role:d.class||type,team:state.teams?(id===0||id===2?0:1):id,d,x,y,angle,speed:d.speed*.8,vx:Math.cos(angle)*d.speed*.8,
      vy:Math.sin(angle)*d.speed*.8,health:d.hull,
      parts:{engine:100,body:100,tail:100},
      critical:false,criticalCause:'',flightRisk:0,
      gunCooldown:0,burstLeft:0,shotTimer:0,specialCooldown:0,boostCharge:100,boosting:false,aiBoost:false,
      spawnSafe:1.0,smokeTimer:0,hitFlash:0,alive:true,aiThink:0,
      energy:85,rollTime:0,rollRecovery:0,stallTime:0,wallGrace:0,armourTime:0,bombCooldown:0,climbAssist:0,
      swoopTime:0,swoop:null,turnVelocity:0,damageCause:'',damageNotice:0,muzzleFlash:0};
  }
  const ARENAS=['ALPINE','COAST','DESERT','STORM'];
  function newRound(){
    state.fliers=[
      plane(state.selected,0,W*.22,H*.45,-.14),
      plane(state.enemyType,1,W*.78,H*.52,Math.PI+.15)
    ];
    if(state.participants>2){
      const pool=Object.keys(PLANES).filter(t=>t!==state.selected);
      for(let id=2;id<state.participants;id++){
        const type=pool[(id+state.round)%pool.length];
        const p=plane(type,id,W*(id===2?.42:.61),H*(id===2?.62:.36),id===2?-.8:2.4);
        state.fliers.push(p);
      }
    }
    state.bullets=[];state.bombs=[];state.mines=[];state.sparks=[];
    state.time=state.mode==='survival'?70:90;state.impactLock=0;state.phase='playing';state.paused=false;
    state.banner='ROUND '+state.round;state.bannerTime=1.5;
    controls.left=false;controls.right=false;controls.boost=false;
  }
  function startMatch(){
    audioUnlock();
    const others=Object.keys(PLANES).filter(t=>t!==state.selected);
    state.enemyType=others[Math.floor(Math.random()*others.length)];
    state.scores=[0,0];state.round=1;state.kills=0;
    state.mode=document.getElementById('mode-select')?.value||'duel';
    state.participants=Number(document.getElementById('pilots-select')?.value||2);
    state.teams=state.participants===4&&document.getElementById('team-select')?.value==='teams';
    state.difficulty=document.getElementById('difficulty-select')?.value||'standard';
    state.arena=Number(document.getElementById('arena-select')?.value||0);
    ui.menu.classList.add('hidden');ui.result.classList.add('hidden');
    document.getElementById('bomb').hidden=!['bomber','he111'].includes(state.selected);
    background=makeBackground();newRound();
  }
  function showMenu(){
    state.phase='menu';state.paused=false;controls.left=false;controls.right=false;controls.boost=false;
    ui.result.classList.add('hidden');ui.menu.classList.remove('hidden');
    document.getElementById('bomb').hidden=true;
  }
  function endRound(winner){
    if(state.phase!=='playing')return;
    if(winner===0||winner===1)state.scores[winner]++;
    if(winner===0)state.kills++;
    sound('boom');
    if((state.mode==='survival'&&winner!==0)||(state.mode!=='survival'&&(state.scores[0]>=2||state.scores[1]>=2))){
      state.phase='result';
      const won=state.mode==='survival'?state.kills>0:state.scores[0]>=2;
      ui.resultTitle.textContent=won?'VICTORY!':'DEFEAT';
      ui.resultDetail.textContent=(won?'You outflew the enemy. ':'The enemy won this duel. ')+
        (state.mode==='survival'?'Aircraft shot down: '+state.kills:'Final score: '+state.scores[0]+'–'+state.scores[1])+'.';
      ui.result.classList.remove('hidden');
    }else{
      state.phase='intermission';state.intermission=2.3;
      if(state.mode==='survival'){
        const others=Object.keys(PLANES).filter(t=>t!==state.selected);
        state.enemyType=others[state.round%others.length];
      }
      state.banner=winner===0?'ROUND WON':winner===1?'ROUND LOST':'DRAW';
      state.bannerTime=2.3;
    }
  }
  function triggerBurst(p){
    if(!p||!p.alive||p.gunCooldown>0||p.burstLeft>0||p.rollTime>0||state.phase!=='playing'||state.paused)return;
    p.burstLeft=p.d.burst;p.shotTimer=0;
  }
  function opponents(p){return state.fliers.filter(other=>other.alive&&other.id!==p.id&&(!state.teams||other.team!==p.team));}
  function nearestEnemy(p){return opponents(p).sort((a,b)=>distance(p,a)-distance(p,b))[0];}
  function triggerSpecial(p){
    if(!p||!p.alive||p.specialCooldown>0||state.phase!=='playing'||state.paused)return;
    p.specialCooldown=p.d.specialCd;
    if(p.role==='fighter'){
      // The start of the repositioning loop briefly dodges gunfire.
      p.evasiveTime=.38;
      // A physically continuous high yo-yo: follow a single smooth arc
      // through the upper air, then descend toward the rival's predicted tail.
      // Its destination is captured at launch, so accurate timing matters.
      const rival=nearestEnemy(p);
      const heading={x:Math.cos(p.angle),y:Math.sin(p.angle)};
      const p0={x:p.x,y:p.y};
      const predicted=rival?{
        x:rival.x+rival.vx*.29-Math.cos(rival.angle)*20,
        y:rival.y+rival.vy*.29-Math.sin(rival.angle)*20
      }:{x:p.x+heading.x*65,y:p.y};
      const p3={
        x:clamp(predicted.x,p.x-97,p.x+97),
        y:clamp(predicted.y,p.y-56,p.y+56)
      };
      p3.x=clamp(p3.x,17,W-17);p3.y=clamp(p3.y,43,H-24);
      const p1={
        x:clamp(p.x+heading.x*21,17,W-17),
        y:clamp(p.y+heading.y*14-9,40,H-25)
      };
      const p2={
        x:clamp(p3.x-(rival?Math.cos(rival.angle):heading.x)*22,17,W-17),
        y:clamp(Math.min(p1.y,p3.y)-28,39,H-28)
      };
      p.swoop={p0,p1,p2,p3,elapsed:0,duration:1.22};
      p.swoopTime=1.22;
      p.energy=Math.max(18,p.energy-17);
      emit(p.x,p.y,5,'#d8e9d4',9);
    }else if(p.role==='heavy'){
      p.armourTime=10;
      emit(p.x,p.y,5,'#a9dced',10);
    }else{
      // The bomber's unique skill is a sustained powered climb, not bomb release.
      p.climbAssist=1.25;
      p.energy=Math.min(100,p.energy+25);
      emit(p.x,p.y,6,'#e4d9b7',12);
    }
    sound('special');
  }
  function triggerBomb(p){
    // Bombing is an independent bomber weapon, available between climb assists.
    if(!p||p.role!=='bomber'||!p.alive||state.phase!=='playing'||
      state.paused||p.bombCooldown>0||p.rollTime>0)return;
    p.bombCooldown=2.5;
    state.bombs.push({x:p.x+p.vx*.035,y:p.y+7,
      vx:p.vx*.58,vy:Math.max(8,p.vy*.16+10),
      owner:p.id,life:4,delay:0});
    sound('special');
  }
  function shoot(p){
    // Tail damage adds a small aiming wobble without disabling weapons.
    const spread=(1-p.parts.tail/100)*.065;
    const a=p.angle+random(-spread,spread),dx=Math.cos(a),dy=Math.sin(a);
    state.bullets.push({x:p.x+dx*(p.d.radius+2),y:p.y+dy*(p.d.radius+2),
      vx:dx*p.d.bulletSpeed+p.vx*.35,vy:dy*p.d.bulletSpeed+p.vy*.35,
      owner:p.id,damage:p.d.damage,life:.9,age:0});
    emit(p.x+dx*(p.d.radius+3),p.y+dy*(p.d.radius+3),2,'#fff0a3',7);
    p.muzzleFlash=.12;
    sound('shot');
  }
  function emit(x,y,count,color,power){
    for(let i=0;i<count&&state.sparks.length<100;i++){
      const a=random(0,TAU),s=random(power*.25,power);
      state.sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,
        life:random(.22,.7),max:.7,color,size:Math.random()<.2?2:1});
    }
  }
  function hit(p,amount,x,y,zoneOverride,cause='GUN'){
    if(!p.alive||p.spawnSafe>0)return;
    const ca=Math.cos(p.angle),sa=Math.sin(p.angle);
    const lx=(x-p.x)*ca+(y-p.y)*sa;
    // Side-on guns can meaningfully target only nose, centre and tail.
    const zone=['engine','body','tail'].includes(zoneOverride)?zoneOverride:
      lx>p.d.radius*.34?'engine':
      lx< -p.d.radius*.46?'tail':'body';
    const armour=p.armourTime>0?.45:1;
    if(zone==='body'||cause!=='GUN'){
      p.health=Math.max(0,p.health-amount*(cause!=='GUN'?.72:.64)*armour);
    }else{
      // More than one complete fighter burst of focused hits is required
      // to disable a component. Glancing rounds still chip the hull.
      p.parts[zone]=Math.max(0,p.parts[zone]-amount*(zone==='engine'?.47:.43)*armour);
      p.health=Math.max(0,p.health-amount*.22*armour);
    }
    p.parts.body=clamp(p.health/p.d.hull*100,0,100);
    if(p.parts.engine<=0&&p.criticalCause!=='ENGINE FAILURE'){
      p.criticalCause='ENGINE FAILURE';emit(p.x,p.y,12,'#77777b',22);
    }else if(p.parts.tail<=0&&p.parts.engine>0&&p.criticalCause!=='TAIL FAILURE'){
      p.criticalCause='TAIL FAILURE';emit(p.x,p.y,10,'#c6ad8b',18);
    }
    p.critical=p.parts.engine<=0||p.parts.tail<=0;
    p.hitFlash=.17;
    p.damageCause=zone.toUpperCase()+' '+cause;p.damageNotice=1.15;
    emit(x,y,p.role==='heavy'?11:7,'#ffe0a0',p.role==='heavy'?38:27);sound('hit');
    if(p.health<=0){
      p.alive=false;emit(p.x,p.y,28,'#ffc47e',75);emit(p.x,p.y,16,'#625765',35);
      if(state.participants===2||p.id===0||opponents(state.fliers[0]).every(other=>!other.alive))endRound(p.id===0?1:0);
    }
  }
  function triggerRoll(p){
    if(!p||!p.alive||state.phase!=='playing'||state.paused||p.rollTime>0||p.rollRecovery>0)return;
    p.rollTime=p.role==='fighter'?.5:p.role==='heavy'?.48:.45;
    p.rollRecovery=1.35+(p.role==='bomber'?.35:0);
    sound('special');
  }
  function steerPlane(p,steer,dt){
    if(p.swoop){
      const a=p.swoop;
      a.elapsed=Math.min(a.duration,a.elapsed+dt);
      const t=a.elapsed/a.duration,u=1-t;
      const bez=(key)=>u*u*u*a.p0[key]+3*u*u*t*a.p1[key]+3*u*t*t*a.p2[key]+t*t*t*a.p3[key];
      const deriv=(key)=>
        (3*u*u*(a.p1[key]-a.p0[key])+6*u*t*(a.p2[key]-a.p1[key])+
         3*t*t*(a.p3[key]-a.p2[key]))/a.duration;
      const x=bez('x'),y=bez('y'),vx=deriv('x'),vy=deriv('y');
      p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.speed=Math.hypot(vx,vy);
      if(p.x<-p.d.radius)p.x+=W+2*p.d.radius;
      if(p.x>W+p.d.radius)p.x-=W+2*p.d.radius;
      p.y=Math.max(37,p.y);
      if(p.speed>3)p.angle=Math.atan2(vy,vx);
      p.energy=Math.max(10,p.energy-dt*5);
      p.swoopTime=Math.max(0,a.duration-a.elapsed);
      if(a.elapsed>=a.duration){
        p.swoop=null;p.turnVelocity=0;
        const cap=p.d.speed*1.28;
        p.speed=Math.min(p.speed,cap);
        p.vx=Math.cos(p.angle)*p.speed;p.vy=Math.sin(p.angle)*p.speed;
      }
      return;
    }
    const engine=p.parts.engine/100,tail=p.parts.tail/100;
    const climb=Math.max(0,-Math.sin(p.angle));
    const dive=Math.max(0,Math.sin(p.angle));
    // Airspeed and altitude trade off naturally; diving stores useful speed.
    p.energy=clamp(p.energy+dt*(19*dive-16*climb+4*(1-climb)),0,100);
    const lowEnergy=climb>.55&&p.energy<19;
    p.stallTime=lowEnergy?Math.min(.55,p.stallTime+dt):Math.max(0,p.stallTime-dt*1.6);
    p.flightRisk=clamp((29-p.energy)/29,0,1)*(climb>.25?1:.3);
    // Even a broken tail retains enough authority for a skilful recovery.
    const authority=.54+.46*tail;
    const desired=p.climbAssist>0
      ?clamp(angleDiff(Math.atan2(-43,Math.cos(p.angle)<0?-20:20),p.angle)*2,-p.d.turn,p.d.turn)
      :steer*p.d.turn*authority*(1-p.flightRisk*.17)+p.stallTime*.15;
    p.turnVelocity+=(desired-p.turnVelocity)*Math.min(1,dt*(p.role==='bomber'?6:7.5));
    p.angle+=p.turnVelocity*dt;
    if(p.angle>Math.PI)p.angle-=TAU;
    if(p.angle< -Math.PI)p.angle+=TAU;
    const power=.25+.75*engine;
    const wanted=p.d.speed*power*(.87+.13*p.energy/100)*(p.boosting?1.27:1)*(p.climbAssist>0?1.16:1);
    // Fighters retain less momentum than big, heavier aircraft.
    const drag=p.role==='fighter'?1.55:p.role==='heavy'?1.2:.98;
    const accel=p.role==='fighter'?2.1:p.role==='heavy'?1.65:1.25;
    p.speed+=(wanted-p.speed)*Math.min(1,dt*(p.speed>wanted?drag:accel));
    p.speed+=dt*(15*dive-9*climb);
    p.speed=clamp(p.speed,8,p.d.speed*(p.boosting?1.48:1.36));
    // The velocity vector gently follows the fuselage, rather than snapping.
    const follow=Math.min(1,dt*(p.role==='bomber'?3.2:p.role==='heavy'?4:5.1));
    p.vx+=(Math.cos(p.angle)*p.speed-p.vx)*follow;
    p.vy+=(Math.sin(p.angle)*p.speed-p.vy)*follow;
    // Engine failure causes a controlled glide instead of instant forced death.
    if(p.parts.engine<=0)p.vy+=dt*13;
    if(p.parts.tail<=0)p.vy+=dt*3.5;
    if(p.stallTime>0)p.vy+=dt*5;
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(p.x<-p.d.radius)p.x+=W+2*p.d.radius;
    else if(p.x>W+p.d.radius)p.x-=W+2*p.d.radius;
    if(p.y<37){p.y=37;p.vy=Math.max(3,p.vy);p.angle+=clamp(angleDiff(.3,p.angle),-dt*2,dt*2);}
    if(p.y>=H-13){
      p.y=H-13;p.health=0;p.parts.body=0;p.alive=false;
      p.damageCause='GROUND';emit(p.x,p.y,26,'#ffbb80',48);
      if(p.id===0||state.participants===2||opponents(state.fliers[0]).every(other=>!other.alive))endRound(p.id===0?1:0);
    }
  }
  // Tactical AI: state changes prevent indefinite tail-chasing and combat orbits.
  function aiInput(p,target){
    p.aiThink=Math.max(0,p.aiThink-STEP);
    const range=distance(p,target);
    const targetAngle=Math.atan2(target.y-p.y,target.x-p.x);
    const facing=Math.abs(angleDiff(targetAngle,p.angle));
    const enemyBehind=Math.abs(angleDiff(Math.atan2(p.y-target.y,p.x-target.x),target.angle))<.65;
    if(p.aiThink<=0){
      if(p.y<46||p.y>H-44) p.aiMode='recover';
      else if(target.burstLeft>0&&range<95) p.aiMode='evade';
      else if(enemyBehind&&range<80) p.aiMode='break';
      else if(p.gunCooldown>0&&range<110) p.aiMode='extend';
      else if(range>150) p.aiMode='intercept';
      else p.aiMode='attack';
      p.aiThink=(state.difficulty==='rookie'?.68:state.difficulty==='ace'?.23:.35)+Math.random()*.22;
    }
    let tx=target.x+target.vx*.36,ty=target.y+target.vy*.36;
    if(p.aiMode==='recover'){tx=W*.5;ty=H*.48;}
    if(p.aiMode==='extend'){
      tx=p.x+Math.cos(p.angle)*125;ty=p.y+Math.sin(p.angle)*85;
      if(p.y>H-50)ty=H*.4;
    }
    if(p.aiMode==='break'){tx=p.x+(p.x-target.x)*.9;ty=p.y<H*.5?H*.66:H*.27;}
    if(p.aiMode==='evade'){
      const a=targetAngle+Math.PI*.65;tx=p.x+Math.cos(a)*85;ty=p.y+Math.sin(a)*55;
      if(p.rollRecovery<=0&&range<75)triggerRoll(p);
    }
    if(p.aiMode==='intercept'){
      const lead=state.difficulty==='ace'?.69:state.difficulty==='rookie'?.24:.55;
      tx=target.x+target.vx*lead;ty=target.y+target.vy*lead;
      if(p.energy<38)ty=Math.max(70,ty);
    }
    // The AI can spend limited boost to intercept or extend out of danger.
    p.aiBoost=(p.aiMode==='intercept'&&range>130||
      p.aiMode==='extend'&&p.y>70)&&p.boostCharge>30&&p.parts.engine>25;
    // Bombers seek the high ground and track crossing opportunities.
    if(p.role==='bomber'&&p.aiMode!=='recover'){
      tx=target.x+target.vx*.3;
      ty=p.y>target.y-25?Math.max(43,target.y-48):Math.max(45,target.y-22);
      if(p.y>target.y-16&&p.specialCooldown<=0&&p.climbAssist<=0)
        triggerSpecial(p);
      if(p.y<target.y-14&&Math.abs((p.x+p.vx*.15)-(target.x+target.vx*.15))<24)
        triggerBomb(p);
    }
    tx=clamp(tx,12,W-12);ty=clamp(ty,48,H-43);
    if(p.role==='fighter'&&p.aiMode==='attack'&&range<65&&facing>1){tx=p.x+p.vx*.65;ty=clamp(p.y-35,45,H-30);}
    const dx=tx-p.x;const wrapDx=Math.abs(dx)>W*.5?dx-Math.sign(dx)*W:dx;
    const goal=Math.atan2(ty-p.y,wrapDx);
    const error=angleDiff(goal,p.angle);
    const turn=Math.abs(error)<.085?0:Math.sign(error);
    if(p.aiMode==='attack'&&range<165&&facing<(state.difficulty==='rookie'?.13:state.difficulty==='ace'?.22:.18)&&p.gunCooldown<=0&&p.burstLeft===0&&
      (p.role!=='bomber'||range<65&&Math.random()<.12))triggerBurst(p);
    if(p.specialCooldown<=0){
      if(p.role==='heavy'&&range<100&&(p.health<p.d.hull*.7||target.burstLeft>0))triggerSpecial(p);
      if(p.role==='fighter'&&p.aiMode==='break'&&range<70)triggerSpecial(p);
    }
    return turn;
  }
  function updatePlane(p,dt,steer,wantsBoost=false){
    if(!p.alive)return;
    p.spawnSafe=Math.max(0,p.spawnSafe-dt);
    p.hitFlash=Math.max(0,p.hitFlash-dt);p.muzzleFlash=Math.max(0,p.muzzleFlash-dt);
    p.damageNotice=Math.max(0,p.damageNotice-dt);
    p.specialCooldown=Math.max(0,p.specialCooldown-dt);
    p.armourTime=Math.max(0,p.armourTime-dt);
    p.climbAssist=Math.max(0,p.climbAssist-dt);
    p.bombCooldown=Math.max(0,p.bombCooldown-dt);
    p.evasiveTime=Math.max(0,(p.evasiveTime||0)-dt);
    p.boosting=!!(wantsBoost&&p.boostCharge>0&&p.parts.engine>10&&!p.swoop);
    p.boostCharge=clamp(p.boostCharge+dt*(p.boosting?-29:9),0,100);
    p.rollTime=Math.max(0,p.rollTime-dt);
    p.rollRecovery=Math.max(0,p.rollRecovery-dt);
    steerPlane(p,steer,dt);
    if(p.burstLeft>0){
      p.shotTimer-=dt;
      if(p.shotTimer<=0){
        shoot(p);p.burstLeft--;p.shotTimer+=p.d.interval;
        if(p.burstLeft===0)p.gunCooldown=p.d.cooldown;
      }
    }else p.gunCooldown=Math.max(0,p.gunCooldown-dt);
    p.smokeTimer-=dt;
    if((p.parts.engine<48||p.health<p.d.hull*.35)&&p.smokeTimer<=0){
      p.smokeTimer=.09;
      const x=p.x-Math.cos(p.angle)*p.d.radius;
      const y=p.y-Math.sin(p.angle)*p.d.radius;
      emit(x,y,1,'#6d7480',6);
    }
  }
  function explosion(x,y,r,owner,damage,cause='BOMB'){
    emit(x,y,22,'#ffc47b',52);emit(x,y,9,'#6b707b',30);sound('boom');
    for(const p of state.fliers){
      if(!p.alive||p.id===owner||(state.teams&&state.fliers[owner]?.team===p.team))continue;
      const d=Math.hypot(x-p.x,y-p.y);
      // Explosions must not masquerade as ramming damage when airframes touch.
      const source=state.fliers[owner];
      if(source&&distance(source,p)<source.d.radius+p.d.radius+5)continue;
      if(d<r+p.d.radius)hit(p,damage*(1-clamp(d/(r+p.d.radius),0,.75)),x,y,undefined,cause);
    }
  }
  function projectiles(dt){
    for(let i=state.bullets.length-1;i>=0;i--){
      const b=state.bullets[i],px=b.x,py=b.y;
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;b.age=(b.age||0)+dt;
      const shooter=state.fliers[b.owner];
      const targets=state.fliers.filter(p=>p.id!==b.owner&&p.alive&&(!state.teams||p.team!==shooter?.team));
      // Neither a gun muzzle nor a bomber can inflict disguised impact damage
      // by touching another airframe: rounds must leave the collision envelope.
      let struck=false;
      for(const target of targets){
        const clear=shooter&&distance(target,shooter)>target.d.radius+shooter.d.radius+3;
        if(!clear||target.rollTime>0||target.evasiveTime>0||b.age<=.035)continue;
        const vx=b.x-px,vy=b.y-py,denom=vx*vx+vy*vy;
        const t=denom>0?clamp(((target.x-px)*vx+(target.y-py)*vy)/denom,0,1):0;
        const nx=px+t*vx,ny=py+t*vy;
        if(Math.hypot(target.x-nx,target.y-ny)<target.d.radius+
          (shooter.role==='fighter'?2.7:1.4)){
          hit(target,b.damage,b.x,b.y,undefined,'GUN');struck=true;break;
        }
      }
      if(struck){state.bullets.splice(i,1);continue;}
      if(b.x<0)b.x+=W;else if(b.x>W)b.x-=W;
      if(b.life<=0||b.y<31||b.y>H-4)
        state.bullets.splice(i,1);
    }
    for(let i=state.bombs.length-1;i>=0;i--){
      const b=state.bombs[i];
      b.delay=Math.max(0,(b.delay||0)-dt);
      if(b.delay>0)continue;
      b.age=(b.age||0)+dt;
      b.vy+=94*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      const target=state.fliers.find(p=>p.id!==b.owner&&p.alive&&(!state.teams||p.team!==state.fliers[b.owner]?.team)&&distance(b,p)<p.d.radius+4);
      if(b.y>=H-8||(b.age>.24&&target)){
        explosion(b.x,Math.min(b.y,H-8),24,b.owner,55);
        state.bombs.splice(i,1);continue;
      }
      if(b.life<=0||b.x<0||b.x>W)state.bombs.splice(i,1);
    }
    for(let i=state.mines.length-1;i>=0;i--){
      const m=state.mines[i];m.arm-=dt;m.life-=dt;m.phase+=dt*2;
      const target=state.fliers.find(p=>p.id!==m.owner&&p.alive&&(!state.teams||p.team!==state.fliers[m.owner]?.team)&&distance(m,p)<p.d.radius+6);
      if(m.arm<=0&&target&&target.alive&&distance(m,target)<target.d.radius+6){
        explosion(m.x,m.y,21,m.owner,54,'MINE');state.mines.splice(i,1);continue;
      }
      if(m.life<=0)state.mines.splice(i,1);
    }
  }
  function update(dt){
    if(state.paused)return;
    if(state.phase==='intermission'){
      state.intermission-=dt;
      if(state.intermission<=0){state.round++;newRound();}
    }
    if(state.phase!=='playing'&&state.phase!=='intermission')return;
    state.bannerTime=Math.max(0,state.bannerTime-dt);
    if(state.phase==='playing'){
      state.time-=dt;
      if(state.mode==='survival'&&state.time<=0){endRound(1);return;}
      const user=state.fliers[0];
      updatePlane(user,dt,(controls.right?1:0)-(controls.left?1:0),controls.boost);
      for(const p of state.fliers.slice(1)){
        if(p.alive){const target=nearestEnemy(p);const steer=target?aiInput(p,target):0;updatePlane(p,dt,steer,p.aiBoost);}
      }
      projectiles(dt);
      // Airframes may overlap without dealing damage. No ramming penalty.
      const enemies=state.fliers.slice(1);
      if(state.participants>2){
        if(!user.alive)endRound(1);
        else if(opponents(user).every(p=>!p.alive))endRound(0);
        else if(state.time<=0)endRound(1);
      }else if(state.time<=0){
        const enemy=enemies[0],a=user.health/user.d.hull,b=enemy.health/enemy.d.hull;
        endRound(Math.abs(a-b)<.025?-1:a>b?0:1);
      }
    }
    for(let i=state.sparks.length-1;i>=0;i--){
      const p=state.sparks[i];
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=14*dt;p.life-=dt;
      if(p.life<=0)state.sparks.splice(i,1);
    }
  }

  // All scenery is painted once; the frame loop only draws two aircraft and effects.
  function poly(ctx,pts,color){
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);
    ctx.closePath();ctx.fill();
  }
  // Cached, deterministic low-resolution 16-bit inspired alpine landscape.
  // There are no image downloads and no per-frame scenery allocations.
  function makeBackground(){
    const c=document.createElement('canvas');c.width=W;c.height=H;
    const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
    const scene=ARENAS[state.arena]||'ALPINE';
    ctx.fillStyle={ALPINE:'#73adcf',COAST:'#6ebccc',DESERT:'#d6aa73',STORM:'#506b80'}[scene];ctx.fillRect(0,0,W,H);
    ctx.save();ctx.translate(0,H-180);
    // A few solid sky bands, rather than an expensive per-frame gradient.
    const skies=['#6fa9cf','#80b6d4','#92c3d9','#a9d0da','#bfd9d8'];
    skies.forEach((v,i)=>{ctx.fillStyle=v;ctx.fillRect(0,30+i*18,W,19);});
    ctx.fillStyle='#c3d9d5';ctx.fillRect(0,120,W,60);
    let seed=1337;
    const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    function rect(x,y,w,h,color){
      ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
    }
    function chunkCloud(x,y,scale){
      ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);
      rect(3,3,24,7,'#d5e4dd');rect(7,0,12,6,'#eceddc');
      rect(11,-3,12,5,'#f3f0dd');rect(22,2,12,5,'#eeeedd');
      rect(0,6,36,4,'#eff0de');rect(5,10,28,3,'#c2d5d9');
      rect(12,13,16,2,'#a9cbd5');
      ctx.restore();
    }
    chunkCloud(W*.09,44,1);chunkCloud(W*.38,59,.75);
    chunkCloud(W*.68,42,1.1);chunkCloud(W*.91,56,.7);
    // Mountain faces with sharp, distinct light and dark slopes and snow.
    function peak(cx,yTop,spread,base,colors){
      const l=cx-spread,r=cx+spread;
      poly(ctx,[[l,base],[cx,yTop],[r,base]],colors[0]);
      poly(ctx,[[cx,yTop],[cx+spread*.18,yTop+spread*.23],[r,base],[cx+spread*.16,base]],colors[1]);
      poly(ctx,[[cx,yTop],[cx-spread*.25,yTop+spread*.36],[cx-spread*.46,yTop+spread*.58],
        [cx-spread*.18,yTop+spread*.49],[cx,yTop+spread*.35],
        [cx+spread*.18,yTop+spread*.56],[cx+spread*.3,yTop+spread*.45]],colors[2]);
      poly(ctx,[[cx,yTop+spread*.34],[cx-spread*.13,yTop+spread*.61],
        [cx-spread*.25,yTop+spread*.85],[cx-spread*.13,yTop+spread*.71],
        [cx+spread*.05,yTop+spread*.9],[cx+spread*.2,yTop+spread*.69]],colors[3]);
      // Pixel-textured stone scatter clipped to the mountain.
      ctx.save();
      ctx.beginPath();ctx.moveTo(l,base);ctx.lineTo(cx,yTop);ctx.lineTo(r,base);ctx.closePath();ctx.clip();
      for(let i=0;i<Math.floor(spread*4);i++){
        const x=Math.floor(l+rnd()*spread*2),y=Math.floor(yTop+rnd()*(base-yTop));
        rect(x,y,rnd()>.75?2:1,1,colors[rnd()>.5?1:0]);
      }
      ctx.restore();
    }
    const far=['#8daec3','#7197b4','#e5e8dc','#b9d4db'];
    const mid=['#729bad','#5c829b','#e6eadf','#b0cad1'];
    for(let x=-70,i=0;x<W+105;x+=107,i++){
      peak(x+30,91+(i*13)%13,79,145,far);
    }
    for(let x=-85,i=0;x<W+100;x+=163,i++){
      peak(x+58,109+(i*11)%13,95,160,mid);
    }
    // Lower ravine, slopes and a distant stone bridge across the lake.
    poly(ctx,[[0,157],[W*.12,145],[W*.25,156],[W*.43,147],[W*.59,158],[W*.81,144],[W,155],[W,180],[0,180]],'#658f8e');
    poly(ctx,[[0,164],[W*.12,155],[W*.24,164],[W*.38,153],[W*.53,165],[W*.7,156],[W*.87,164],[W,158],[W,180],[0,180]],'#4c7474');
    // Lake glint: horizontally banded to avoid shader/per-pixel work.
    rect(0,158,W,22,'#568698');
    rect(0,163,W,17,'#47788a');
    for(let y=160;y<179;y+=3)
      for(let x=(y*13)%23;x<W;x+=20+Math.floor(rnd()*16))
        rect(x,y,4+Math.floor(rnd()*11),1,y%2?'#729eaa':'#93b5b4');
    // Tiny distant bridge with arches and buttresses.
    const bridgeStart=W*.49,bridgeY=150,bridgeLength=W*.27;
    rect(bridgeStart,bridgeY,bridgeLength,3,'#657e81');
    rect(bridgeStart,bridgeY-2,bridgeLength,1,'#a9ada6');
    for(let j=0;j<5;j++){
      const x=bridgeStart+j*bridgeLength/5;
      rect(x,bridgeY+3,3,11,'#738c86');
      rect(x+1,bridgeY+3,1,8,'#4d777d');
    }
    // Fortress and evergreen ridge on the left, discreet watchtower on right.
    function tower(x,y,w,h,roof){
      rect(x,y-h,w,h,'#647b7c');rect(x+2,y-h+3,w-5,h-4,'#81928a');
      for(let k=0;k<w;k+=5)rect(x+k,y-h-4,3,4,'#5a7278');
      if(roof){
        poly(ctx,[[x-2,y-h-5],[x+w/2,y-h-13],[x+w+2,y-h-5]],'#955f58');
        rect(x-2,y-h-5,w+4,2,'#775451');
      }
      for(let k=0;k<2;k++)rect(x+4+k*9,y-h+7,2,5,'#324d5c');
      rect(x+w/2-2,y-9,4,9,'#3e5965');
    }
    // Cliffs are behind the aircraft and never block direct input.
    poly(ctx,[[0,135],[12,137],[24,148],[53,147],[67,164],[62,180],[0,180]],'#657274');
    poly(ctx,[[0,145],[9,144],[19,159],[31,165],[31,180],[0,180]],'#445f69');
    poly(ctx,[[W-42,165],[W-27,147],[W-11,151],[W,141],[W,180],[W-48,180]],'#6b7b78');
    rect(0,143,38,2,'#d7d9d0');rect(W-27,149,27,2,'#d7d9d0');
    tower(6,141,14,25,true);tower(23,141,10,18,false);
    rect(0,141,39,5,'#516f70');
    for(let k=0;k<37;k+=5)rect(k,137,3,4,'#516f70');
    tower(W-25,145,13,24,true);
    // Sparse spruce trees with two-shade pixel foliage.
    function tree(x,y,size){
      rect(x-1,y-3,2,6,'#3b5552');
      poly(ctx,[[x,y-size],[x-size*.29,y-size*.27],[x-size*.15,y-size*.27],
        [x-size*.4,y],[x+size*.4,y],[x+size*.15,y-size*.27],
        [x+size*.29,y-size*.27]],'#315d5c');
      rect(x-2,y-size*.55,2,4,'#498073');
    }
    for(let x=3;x<W;x+=8+rnd()*12){
      const yy=144+rnd()*18;
      if((x<40&&yy<146)||(x>W-29&&yy<147))continue;
      tree(x,yy,7+rnd()*8);
    }
    // Quiet foreground flecks, kept low to preserve gameplay contrast.
    for(let i=0;i<W*.85;i++){
      const x=rnd()*W,y=162+rnd()*18;
      rect(x,y,rnd()>.65?2:1,1,rnd()>.5?'#7eaaa5':'#436a74');
    }
    ctx.restore();
    if(scene!=='ALPINE'){
      ctx.fillStyle=scene==='COAST'?'#397ca077':scene==='DESERT'?'#b67c4c77':'#182c4577';
      ctx.fillRect(0,30,W,H-30);
    }
    return c;
  }
  let background=makeBackground();
  // Small, readable aircraft silhouettes. Their proportions are deliberately
  // more plausible than cartoon rockets, but every colour remains pixel art.
  // Aircraft are drawn at native display resolution independently of scenery.
  function aircraft(p){
    const c=modelCtx;
    c.save();c.translate(p.x,p.y);c.rotate(p.angle);
    if(p.rollTime>0)c.scale(1,Math.max(.2,Math.abs(Math.cos(p.rollTime*22))));
    if(p.armourTime>0){
      c.beginPath();c.ellipse(0,0,10,8,0,0,TAU);
      c.strokeStyle='#b1ecf5c9';c.lineWidth=.75;c.stroke();
    }
    c.scale(.54,.54);
    aircraftArt?.draw(c,p.type,p.health<p.d.hull*.38?'damaged':'level');
    if(p.boosting){
      c.fillStyle='#ffdb91a8';c.beginPath();c.ellipse(-19,0,5,1.5,0,0,TAU);c.fill();
    }
    if(p.muzzleFlash>0){c.fillStyle='#fff4ad';c.fillRect(13,-1,7,2);}
    if(p.hitFlash>0){
      c.beginPath();c.ellipse(0,0,8,5,0,0,TAU);
      c.strokeStyle='#fff0bd';c.lineWidth=.8;c.stroke();
    }
    c.restore();
    c.fillStyle='#1e3341d9';c.fillRect(p.x-7,p.y-14,14,5.5);
    c.font='bold 5px sans-serif';c.textAlign='center';c.textBaseline='top';
    c.fillStyle=p.id===0?'#ffe7b4':p.team===0?'#a6d5fa':p.id===1?'#ffc2b8':'#ffc989';
    c.fillText(p.id===0?'P1':'AI'+p.id,p.x,p.y-13.6);
  }
  function drawModels(){
    if(!modelCanvas.width||!modelCanvas.height)return;
    const c=modelCtx;
    c.setTransform(modelCanvas.width/W,0,0,modelCanvas.height/H,0,0);
    c.clearRect(0,0,W,H);
    c.save();c.beginPath();c.rect(0,31,W,H-31);c.clip();
    for(const p of state.fliers)if(p.alive)aircraft(p);
    c.restore();
  }
  function bar(x,y,w,value,max,color){
    g.fillStyle='#243946';g.fillRect(x,y,w,4);
    g.fillStyle=color;g.fillRect(x,y,Math.ceil(w*clamp(value/max,0,1)),4);
  }
  function drawHud(){
    const p=state.fliers[0],e=state.fliers[1];
    g.fillStyle='#182d3bdc';g.fillRect(0,0,W,31);
    g.font='bold 7px monospace';g.textBaseline='top';
    g.fillStyle='#f5e6c2';g.fillText(p?p.d.name:'WINGMAN',7,3);
    const en=e?e.d.name+(state.participants>2?' + '+(state.participants-2):''):'SELECT PLANE';
    g.fillText(en,W-7-g.measureText(en).width,3);
    g.font='bold 5px monospace';g.fillStyle='#a7d8e8';
    if(p)g.fillText(p.role==='heavy'?'HEAVY FIGHTER':p.role==='bomber'?(p.type==='he111'?'MEDIUM BOMBER':'HEAVY BOMBER'):'FIGHTER',7,9);
    if(e){const cls=e.role==='heavy'?'HEAVY FIGHTER':e.role==='bomber'?(e.type==='he111'?'MEDIUM BOMBER':'HEAVY BOMBER'):'FIGHTER';g.fillText(cls,W-7-g.measureText(cls).width,9);}
    if(state.participants>2){
      for(const pilot of state.fliers){
        const ix=W/2-40+pilot.id*27;
        g.fillStyle=pilot.id===0?'#b1eea6':pilot.team===0?'#9ad5ec':'#e4aaa3';
        g.fillRect(ix,24,23,3);
        g.fillStyle=pilot.alive?'#f1e3c2':'#778594';
        g.font='5px monospace';g.fillText(pilot.id===0?'YOU':'AI'+pilot.id,ix,19);
        g.fillStyle='#293d45';g.fillRect(ix,28,23,2);
        g.fillStyle=pilot.alive?'#e4bf81':'#8a9294';
        g.fillRect(ix,28,Math.round(23*clamp(pilot.health/pilot.d.hull,0,1)),2);
      }
    }
    g.font='bold 8px monospace';g.textAlign='center';
    g.fillText(state.participants>2?(state.teams?'2v2 TEAMS':'FREE FOR ALL'):state.mode==='survival'?'WAVE '+state.round:state.scores[0]+' : '+state.scores[1],W/2,3);
    g.font='6px monospace';g.fillStyle='#bed5dc';
    g.fillText(Math.max(0,Math.ceil(state.time))+'s '+ARENAS[state.arena],W/2,15);g.textAlign='left';
    if(p&&e){
      bar(7,12,100,p.health,p.d.hull,'#78ba87');
      bar(W-107,12,100,e.health,e.d.hull,'#d9776d');
      const gReady=p.burstLeft>0?'FIRING':p.gunCooldown>0?'RELOAD':'READY';
      g.fillStyle=p.gunCooldown>0?'#eabc7f':'#c5ead4';
      g.fillText('GUN '+gReady,7,19);
      // A physical refill meter makes the risky post-burst window clear.
      const charge=p.burstLeft>0 ? (p.d.burst-p.burstLeft)/p.d.burst :
        p.gunCooldown>0 ? 1-p.gunCooldown/p.d.cooldown : 1;
      bar(7,27,64,charge,1,p.burstLeft>0?'#e4aa68':p.gunCooldown>0?'#d88e63':'#80c69e');
      const sc=p.specialCooldown>0?Math.ceil(p.specialCooldown)+'s':'READY';
      g.fillStyle='#f0d8a2';g.fillText(p.d.special+' '+sc,77,19);
      bar(77,27,39,p.specialCooldown>0?1-p.specialCooldown/p.d.specialCd:1,
        1,'#c4b6df');
      g.fillStyle='#e6d3a0';g.fillText('BOOST',123,19);
      bar(123,27,48,p.boostCharge,100,p.boosting?'#f4d07c':'#9bd4ad');
      g.fillStyle=p.rollTime>0?'#f8e4a2':'#c0d9df';
      g.fillText(p.rollTime>0?'ROLLING':p.rollRecovery>0?'ROLL '+p.rollRecovery.toFixed(1):'ROLL READY',181,19);
      if(p.role==='bomber'){
        g.fillStyle='#ffd9a2';g.fillText(p.bombCooldown>0?'BOMB '+p.bombCooldown.toFixed(1):'BOMB READY',W*.50,27);
      }
      g.fillStyle='#dce8e1';g.fillText('DAMAGE',W-106,19);
      const zones=[['E','engine'],['B','body'],['T','tail']];
      for(let i=0;i<zones.length;i++){
        const health=p.parts[zones[i][1]];
        const x=W-43+i*14;
        g.fillStyle=health>65?'#76b68a':health>30?'#e6b96c':'#e77267';
        g.fillRect(x,19,8,8);
        g.fillStyle='#192c35';g.font='bold 6px monospace';g.fillText(zones[i][0],x+1,20);
      }
    }
    g.fillStyle='#37546a';g.fillRect(0,30,W,1);
  }
  function damageDiagram(){
    // High-resolution miniature component schematic, overlaid on the HUD.
    const p=state.fliers[0];if(!p)return;
    const c=modelCtx,cx= W-62,cy=42;
    c.save();c.fillStyle='#182b36d9';c.fillRect(cx-34,cy-5,67,35);
    c.strokeStyle='#7c9ba7';c.lineWidth=.45;c.strokeRect(cx-34,cy-5,67,35);
    c.font='bold 4.5px monospace';c.fillStyle='#f6e3ba';c.fillText('AIRFRAME',cx-30,cy-2);
    const stages=[['E','engine'],['B','body'],['T','tail']];
    for(let i=0;i<stages.length;i++){
      const [symbol,key]=stages[i],value=p.parts[key],x=cx-25+i*20;
      c.fillStyle=value>65?'#8dd5a0':value>30?'#f0bd75':'#ee7469';
      c.fillRect(x,cy+7,13,11);
      c.fillStyle='#172a35';c.font='bold 6px monospace';c.fillText(symbol,x+4,cy+9);
      c.fillStyle='#f0e5d1';c.font='4px monospace';c.fillText(Math.round(value)+'%',x,cy+21);
    }
    c.restore();
  }
  function draw(){
    g.drawImage(background,0,0);
    // Light under-aircraft shadows create altitude clues.
    for(const m of state.mines){
      const x=Math.round(m.x),y=Math.round(m.y+Math.sin(m.phase)*1.4);
      g.fillStyle=m.arm>0?'#7e9195':'#cf6558';
      g.fillRect(x-3,y-3,7,7);g.fillStyle='#f4d1a3';g.fillRect(x-1,y-1,3,3);
    }
    for(const b of state.bombs){
      if(b.delay>0)continue;
      g.fillStyle='#2b3743';g.fillRect(Math.round(b.x)-2,Math.round(b.y)-1,5,4);
      g.fillStyle='#e8ba80';g.fillRect(Math.round(b.x)+1,Math.round(b.y),1,1);
    }
    for(const b of state.bullets){
      const heavy=state.fliers[b.owner]?.role==='heavy';
      g.strokeStyle=heavy?'#ffd093':'#fff1b0';g.lineWidth=heavy?2:1;
      g.beginPath();g.moveTo(b.x,b.y);g.lineTo(b.x-b.vx*.024,b.y-b.vy*.024);g.stroke();
      g.fillStyle=heavy?'#653e33':'#574c43';g.fillRect(Math.round(b.x)-1,Math.round(b.y)-1,heavy?5:3,heavy?3:2);
      g.fillStyle=heavy?'#ffd19b':'#fff1ac';g.fillRect(Math.round(b.x),Math.round(b.y),heavy?4:2,1);
    }
    drawModels();
    for(const p of state.sparks){
      g.globalAlpha=clamp(p.life/p.max,.2,1);
      g.fillStyle=p.color;g.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);
    }
    g.globalAlpha=1;
    drawHud();
    // Draw the entire HUD a second time on the high-DPI overlay, preserving
    // sharp glyphs instead of stretching the logical 250px canvas.
    const lowRes=g;g=modelCtx;
    try{drawHud();}finally{g=lowRes;}
    damageDiagram();
    const pilot=state.fliers[0];
    if(pilot&&pilot.alive&&pilot.y>H-42){
      const danger=clamp((pilot.y-(H-42))/29,0,1);
      g.globalAlpha=.45+danger*.55;
      g.fillStyle='#9a2621';g.fillRect(W/2-55,H-28,110,12);
      g.strokeStyle='#f6ca8b';g.strokeRect(W/2-55,H-28,110,12);
      g.fillStyle='#fff0cc';g.textAlign='center';g.font='bold 7px monospace';
      g.fillText('PULL UP · GROUND',W/2,H-25);
      g.textAlign='left';g.globalAlpha=1;
    }
    if(pilot&&pilot.critical&&pilot.alive){
      g.fillStyle='#6f2e2acb';g.fillRect(W*.5-60,38,120,14);
      g.fillStyle='#ffdb9b';g.textAlign='center';g.font='bold 8px monospace';
      g.fillText(pilot.criticalCause+' · GLIDE',W*.5,42);g.textAlign='left';
    }
    if(pilot&&pilot.damageNotice>0){
      g.font='bold 7px monospace';g.textAlign='center';
      g.fillStyle='#ffd39c';g.fillText('HIT BY '+pilot.damageCause,W*.5,36);
      g.textAlign='left';
    }
    if(state.bannerTime>0){
      g.fillStyle='#1d3043b9';g.fillRect(W/2-47,44,94,19);
      g.strokeStyle='#c5a780';g.strokeRect(W/2-46.5,44.5,93,18);
      g.font='bold 9px monospace';g.textAlign='center';g.fillStyle='#ffdfaa';
      g.fillText(state.banner,W/2,50);g.textAlign='left';
    }
    if(state.paused&&state.phase==='playing'){
      g.fillStyle='#172738bb';g.fillRect(W/2-64,75,128,29);
      g.fillStyle=palette.cream;g.font='bold 11px monospace';g.textAlign='center';
      g.fillText('PAUSED',W/2,86);g.textAlign='left';
    }
  }
  function loop(now){
    if(!loop.last)loop.last=now;
    const elapsed=Math.min((now-loop.last)/1000,.05);
    loop.last=now;
    loop.acc=(loop.acc||0)+elapsed;
    let steps=0;
    while(loop.acc>=STEP&&steps<3){
      update(STEP);loop.acc-=STEP;steps++;
    }
    if(steps===3)loop.acc=0;
    draw();requestAnimationFrame(loop);
  }
  function bindButton(id,key,action){
    const el=document.getElementById(id);
    el.addEventListener('pointerdown',ev=>{
      ev.preventDefault();
      el.setPointerCapture(ev.pointerId);
      el.classList.add('pressed');
      audioUnlock();
      if(key)controls[key]=true;
      if(action)action();
    });
    const release=ev=>{
      if(key)controls[key]=false;
      el.classList.remove('pressed');
    };
    el.addEventListener('pointerup',release);
    el.addEventListener('pointercancel',release);
    el.addEventListener('lostpointercapture',release);
    el.addEventListener('contextmenu',ev=>ev.preventDefault());
  }
  bindButton('left','left');
  bindButton('right','right');
  bindButton('boost','boost');
  bindButton('fire',null,()=>triggerBurst(state.fliers[0]));
  bindButton('special',null,()=>triggerSpecial(state.fliers[0]));
  bindButton('roll',null,()=>triggerRoll(state.fliers[0]));
  bindButton('bomb',null,()=>triggerBomb(state.fliers[0]));
  const preventKeys=new Set(['ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','KeyA','KeyD','KeyW','ArrowUp','KeyK','KeyL','KeyB']);
  document.addEventListener('keydown',e=>{
    if(preventKeys.has(e.code))e.preventDefault();
    if(e.code==='KeyA'||e.code==='ArrowLeft')controls.left=true;
    if(e.code==='KeyD'||e.code==='ArrowRight')controls.right=true;
    if(e.code==='KeyW'||e.code==='ArrowUp')controls.boost=true;
    if(e.repeat)return;
    if(e.code==='Space'){audioUnlock();triggerBurst(state.fliers[0]);}
    if(e.code==='ShiftLeft'||e.code==='ShiftRight'||e.code==='KeyK'){audioUnlock();triggerSpecial(state.fliers[0]);}
    if(e.code==='KeyL'){audioUnlock();triggerRoll(state.fliers[0]);}
    if(e.code==='KeyB'){audioUnlock();triggerBomb(state.fliers[0]);}
    if(e.code==='KeyP'&&state.phase==='playing')state.paused=!state.paused;
  });
  document.addEventListener('keyup',e=>{
    if(e.code==='KeyA'||e.code==='ArrowLeft')controls.left=false;
    if(e.code==='KeyD'||e.code==='ArrowRight')controls.right=false;
    if(e.code==='KeyW'||e.code==='ArrowUp')controls.boost=false;
  });
  // Mobile browsers can briefly blur the page when touch controls, browser
  // chrome or audio focus change. Never pause gameplay merely on window blur:
  // it made FIRE appear to pause the game and left no touch way to resume.
  window.addEventListener('blur',()=>{
    controls.left=false;controls.right=false;controls.boost=false;
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){controls.left=false;controls.right=false;controls.boost=false;}
  });
  for(const btn of document.querySelectorAll('[data-plane]')){
    btn.addEventListener('click',()=>{
      state.selected=btn.dataset.plane;
      for(const b of document.querySelectorAll('[data-plane]')){
        const chosen=b===btn;b.classList.toggle('selected',chosen);
        b.setAttribute('aria-pressed',String(chosen));
      }
    });
  }
  ui.start.addEventListener('click',startMatch);
  ui.rematch.addEventListener('click',startMatch);
  ui.change.addEventListener('click',showMenu);
  // Preserve pixel density rather than squashing a 16:9 picture on wide phones.
  function resizeArena(){
    const frame=document.getElementById('frame');
    if(!frame)return;
    const rect=frame.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    // The original logical height remains 180; extra-wide screens show
    // more horizontal sky so 4-player combat will eventually fit naturally.
    const nextW=clamp(Math.round(H*rect.width/rect.height),520,850);
    const dpr=clamp(window.devicePixelRatio||1,1,3);
    const pixelWidth=Math.max(1,Math.round(rect.width*dpr));
    const pixelHeight=Math.max(1,Math.round(rect.height*dpr));
    if(modelCanvas.width!==pixelWidth||modelCanvas.height!==pixelHeight){
      modelCanvas.width=pixelWidth;modelCanvas.height=pixelHeight;
      modelCtx.imageSmoothingEnabled=true;
    }
    if(nextW===W&&canvas.width===W)return;
    const old=W;
    W=nextW;
    canvas.width=W;canvas.height=H;g.imageSmoothingEnabled=false;
    const factor=W/old;
    for(const p of state.fliers){
      p.x*=factor;
      if(p.swoop)for(const node of [p.swoop.p0,p.swoop.p1,p.swoop.p2,p.swoop.p3])
        node.x*=factor;
    }
    for(const kind of [state.bullets,state.bombs,state.mines,state.sparks])
      for(const p of kind)p.x*=factor;
    background=makeBackground();
  }
  if(window.addEventListener)window.addEventListener('resize',resizeArena);
  if(window.visualViewport?.addEventListener)
    window.visualViewport.addEventListener('resize',resizeArena);
  resizeArena();
  requestAnimationFrame(loop);
})();

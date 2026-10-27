/* Wingman v0.1: dependency-free 320x180 fixed-step aerial duels.
   Gameplay is separated from rendering so input can later be sourced from networking. */
(() => {
  'use strict';
  let W=320; const H=180, STEP=1/60, TAU=Math.PI*2;
  const canvas=document.getElementById('game');
  const aircraftArt=window.WingmanSprites;
  const modelCanvas=document.getElementById('aircraft-layer');
  const modelCtx=modelCanvas.getContext('2d',{alpha:true});
  const g=canvas.getContext('2d',{alpha:false});
  g.imageSmoothingEnabled=false;

  const PLANES={
    fighter:{name:'SPITFIRE',speed:83,turn:3.15,hull:110,radius:5.5,burst:10,interval:.055,cooldown:1.35,damage:15,bulletSpeed:194,specialCd:8,color:'#d5d9b5',shade:'#5c756d',accent:'#db8a51',special:'SWOOP'},
    heavy:{name:'HEAVY FIGHTER',speed:72,turn:1.55,hull:160,radius:8,burst:3,interval:.19,cooldown:2.8,damage:29,bulletSpeed:177,specialCd:20,color:'#bd765c',shade:'#673f42',accent:'#f4c47e',special:'ARMOUR'},
    bomber:{name:'BOMBER',speed:60,turn:1.05,hull:205,radius:9,burst:2,interval:.30,cooldown:3.2,damage:8,bulletSpeed:85,specialCd:10,color:'#c8b087',shade:'#807359',accent:'#e7dbaf',special:'CLIMB'}
  };
  const state={
    phase:'menu',selected:'fighter',fliers:[],bullets:[],bombs:[],mines:[],sparks:[],
    scores:[0,0],round:1,time:90,intermission:0,banner:'',bannerTime:0,paused:false,
    impactLock:0,enemyType:'heavy'
  };
  const controls={left:false,right:false};
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
    return {id,type,d,x,y,angle,speed:d.speed*.8,vx:Math.cos(angle)*d.speed*.8,
      vy:Math.sin(angle)*d.speed*.8,health:d.hull,
      parts:{engine:100,nose:100,body:100,left:100,right:100},
      gunCooldown:0,burstLeft:0,shotTimer:0,specialCooldown:0,boost:0,
      spawnSafe:1.0,smokeTimer:0,hitFlash:0,alive:true,aiThink:0,
      energy:85,rollTime:0,rollRecovery:0,stallTime:0,wallGrace:0,armourTime:0,bombCooldown:0,climbAssist:0,
      swoopTime:0,swoop:null,turnVelocity:0,damageCause:'',damageNotice:0};
  }
  function newRound(){
    state.fliers=[
      plane(state.selected,0,W*.19,81,-.14),
      plane(state.enemyType,1,W*.81,92,Math.PI+.15)
    ];
    state.bullets=[];state.bombs=[];state.mines=[];state.sparks=[];
    state.time=90;state.impactLock=0;state.phase='playing';state.paused=false;
    state.banner='ROUND '+state.round;state.bannerTime=1.5;
    controls.left=false;controls.right=false;
  }
  function startMatch(){
    audioUnlock();
    const others=Object.keys(PLANES).filter(t=>t!==state.selected);
    state.enemyType=others[Math.floor(Math.random()*others.length)];
    state.scores=[0,0];state.round=1;
    ui.menu.classList.add('hidden');ui.result.classList.add('hidden');
    document.getElementById('bomb').hidden=state.selected!=='bomber';
    newRound();
  }
  function showMenu(){
    state.phase='menu';state.paused=false;controls.left=false;controls.right=false;
    ui.result.classList.add('hidden');ui.menu.classList.remove('hidden');
    document.getElementById('bomb').hidden=true;
  }
  function endRound(winner){
    if(state.phase!=='playing')return;
    if(winner===0||winner===1)state.scores[winner]++;
    sound('boom');
    if(state.scores[0]>=2||state.scores[1]>=2){
      state.phase='result';
      const won=state.scores[0]>=2;
      ui.resultTitle.textContent=won?'VICTORY!':'DEFEAT';
      ui.resultDetail.textContent=(won?'You outflew the enemy. ':'The enemy won this duel. ')+
        'Final score: '+state.scores[0]+'–'+state.scores[1]+'.';
      ui.result.classList.remove('hidden');
    }else{
      state.phase='intermission';state.intermission=2.3;
      state.banner=winner===0?'ROUND WON':winner===1?'ROUND LOST':'DRAW';
      state.bannerTime=2.3;
    }
  }
  function triggerBurst(p){
    if(!p||!p.alive||p.gunCooldown>0||p.burstLeft>0||p.rollTime>0||state.phase!=='playing'||state.paused)return;
    p.burstLeft=p.d.burst;p.shotTimer=0;
  }
  function triggerSpecial(p){
    if(!p||!p.alive||p.specialCooldown>0||state.phase!=='playing'||state.paused)return;
    p.specialCooldown=p.d.specialCd;
    if(p.type==='fighter'){
      // A physically continuous high yo-yo: follow a single smooth arc
      // through the upper air, then descend toward the rival's predicted tail.
      // Its destination is captured at launch, so accurate timing matters.
      const rival=state.fliers[1-p.id];
      const heading={x:Math.cos(p.angle),y:Math.sin(p.angle)};
      const p0={x:p.x,y:p.y};
      const predicted=rival?{
        x:rival.x+rival.vx*.29-Math.cos(rival.angle)*20,
        y:rival.y+rival.vy*.29-Math.sin(rival.angle)*20
      }:{x:p.x+heading.x*65,y:p.y};
      const p3={
        x:clamp(predicted.x,p.x-82,p.x+82),
        y:clamp(predicted.y,p.y-52,p.y+52)
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
    }else if(p.type==='heavy'){
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
    if(!p||p.type!=='bomber'||!p.alive||state.phase!=='playing'||
      state.paused||p.bombCooldown>0||p.rollTime>0)return;
    p.bombCooldown=2.5;
    state.bombs.push({x:p.x+p.vx*.035,y:p.y+7,
      vx:p.vx*.58,vy:Math.max(8,p.vy*.16+10),
      owner:p.id,life:4,delay:0});
    sound('special');
  }
  function shoot(p){
    // Damaged nose/cowling makes precise bursts noticeably less accurate.
    const spread=(1-p.parts.nose/100)*.12;
    const a=p.angle+random(-spread,spread),dx=Math.cos(a),dy=Math.sin(a);
    state.bullets.push({x:p.x+dx*(p.d.radius+2),y:p.y+dy*(p.d.radius+2),
      vx:dx*p.d.bulletSpeed+p.vx*.35,vy:dy*p.d.bulletSpeed+p.vy*.35,
      owner:p.id,damage:p.d.damage,life:.9,age:0});
    emit(p.x+dx*(p.d.radius+3),p.y+dy*(p.d.radius+3),2,'#fff0a3',7);
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
    const ly=-(x-p.x)*sa+(y-p.y)*ca;
    let zone=zoneOverride;
    if(!zone){
      if(lx>p.d.radius*.65)zone='engine';
      else if(lx>p.d.radius*.22)zone='nose';
      else if(ly< -p.d.radius*.35)zone='left';
      else if(ly>p.d.radius*.35)zone='right';
      else zone='body';
    }
    p.parts[zone]=Math.max(0,p.parts[zone]-amount*1.45*(p.armourTime>0?.4:1));
    const armourPenalty=1+(100-p.parts.body)/100*.25;
    p.health-=amount*armourPenalty*(p.armourTime>0?.4:1);
    p.hitFlash=.17;
    p.damageCause=cause;p.damageNotice=1.15;
    emit(x,y,p.type==='heavy'?11:7,'#ffe0a0',p.type==='heavy'?38:27);sound('hit');
    if(p.health<=0){
      p.health=0;p.alive=false;
      emit(p.x,p.y,28,'#ffc47e',75);
      emit(p.x,p.y,16,'#625765',35);
      endRound(p.id===0?1:0);
    }
  }
  function triggerRoll(p){
    if(!p||!p.alive||state.phase!=='playing'||state.paused||p.rollTime>0||p.rollRecovery>0)return;
    p.rollTime=p.type==='fighter'?.5:p.type==='heavy'?.48:.45;
    p.rollRecovery=1.35+(p.type==='bomber'?.35:0);
    sound('special');
  }
  function steerPlane(p,steer,dt){
    if(p.swoop){
      const a=p.swoop;
      a.elapsed=Math.min(a.duration,a.elapsed+dt);
      const t=a.elapsed/a.duration,u=1-t;
      const bez=(key)=>
        u*u*u*a.p0[key]+3*u*u*t*a.p1[key]+3*u*t*t*a.p2[key]+t*t*t*a.p3[key];
      const deriv=(key)=>
        (3*u*u*(a.p1[key]-a.p0[key])+6*u*t*(a.p2[key]-a.p1[key])+
          3*t*t*(a.p3[key]-a.p2[key]))/a.duration;
      const x=bez('x'),y=bez('y'),vx=deriv('x'),vy=deriv('y');
      p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.speed=Math.hypot(vx,vy);
      if(p.speed>3)p.angle=Math.atan2(vy,vx);
      p.energy=Math.max(10,p.energy-dt*6);
      p.swoopTime=Math.max(0,a.duration-a.elapsed);
      if(a.elapsed>=a.duration){p.swoop=null;p.turnVelocity=0;}
      return;
    }
    const wing=steer<0?p.parts.left:p.parts.right;
    const authority=.42+.58*wing/100;
    const sluggish=p.stallTime>0?.57:1;
    if(p.climbAssist>0){
      const direction=Math.cos(p.angle)<0?-1:1;
      const climbHeading=Math.atan2(-43,direction*20);
      const desired=clamp(angleDiff(climbHeading,p.angle)*2.8,-p.d.turn,p.d.turn);
      p.turnVelocity+=(desired-p.turnVelocity)*Math.min(1,dt*8.8);
    }else{
      const desired=steer*p.d.turn*authority*sluggish;
      p.turnVelocity+=(desired-p.turnVelocity)*Math.min(1,dt*10);
    }
    p.angle+=p.turnVelocity*dt;
    if(p.angle>Math.PI)p.angle-=TAU;
    if(p.angle< -Math.PI)p.angle+=TAU;
    const engine=.52+.48*p.parts.engine/100;
    // Flight energy is a real store: climbing consumes it; diving restores it.
    const climb=Math.max(0,-Math.sin(p.angle));
    const dive=Math.max(0,Math.sin(p.angle));
    p.energy=clamp(p.energy+dt*(24*dive-27*climb+6*(1-climb)),0,100);
    const energyFactor=.75+.25*(p.energy/100);
    const wanted=p.d.speed*engine*energyFactor*(1+Math.min(.32,dive*.25))*
      (p.swoopTime>0?1.14:1)*(p.climbAssist>0?1.25:1);
    p.stallTime=p.energy<9?Math.max(p.stallTime,.2):Math.max(0,p.stallTime-dt);
    // Low energy lowers turn authority and speed, but never disables steering.
    const speedTarget=p.stallTime>0?wanted*.68:wanted;
    p.speed+=(speedTarget-p.speed)*Math.min(1,dt*4.6);
    const follow=Math.min(1,dt*(p.type==='bomber'?8.5:p.type==='heavy'?9.5:10.5));
    p.vx+=(Math.cos(p.angle)*p.speed-p.vx)*follow;
    p.vy+=(Math.sin(p.angle)*p.speed-p.vy)*follow;
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    // A soft, continuous boundary recovery avoids frame-to-frame angle snaps.
    const margin=15;
    if(p.x<margin||p.x>W-margin||p.y<37||p.y>H-15){
      p.x=clamp(p.x,margin,W-margin);p.y=clamp(p.y,37,H-15);
      const inward=Math.atan2(H*.52-p.y,W*.5-p.x);
      p.angle+=clamp(angleDiff(inward,p.angle),-2.7*dt,2.7*dt);
      if(p.x===margin&&p.vx<0||p.x===W-margin&&p.vx>0)p.vx=0;
      if(p.y===37&&p.vy<0||p.y===H-15&&p.vy>0)p.vy=0;
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
      if(p.x<45||p.x>W-45||p.y<43||p.y>H-31) p.aiMode='recover';
      else if(target.burstLeft>0&&range<95) p.aiMode='evade';
      else if(enemyBehind&&range<80) p.aiMode='break';
      else if(p.gunCooldown>0&&range<110) p.aiMode='extend';
      else if(range>150) p.aiMode='intercept';
      else p.aiMode='attack';
      p.aiThink=.35+Math.random()*.22;
    }
    let tx=target.x+target.vx*.36,ty=target.y+target.vy*.36;
    if(p.aiMode==='recover'){tx=W*.5;ty=H*.48;}
    if(p.aiMode==='extend'){
      tx=p.x+Math.cos(p.angle)*125;ty=p.y+Math.sin(p.angle)*85;
      if(p.y>122)ty=55;
    }
    if(p.aiMode==='break'){tx=p.x+(p.x-target.x)*.9;ty=p.y<90?140:51;}
    if(p.aiMode==='evade'){
      const a=targetAngle+Math.PI*.65;tx=p.x+Math.cos(a)*85;ty=p.y+Math.sin(a)*55;
      if(p.rollRecovery<=0&&range<75)triggerRoll(p);
    }
    if(p.aiMode==='intercept'){
      tx=target.x+target.vx*.55;ty=target.y+target.vy*.55;
      if(p.energy<38)ty=Math.max(70,ty);
    }
    // Bombers seek the high ground and track crossing opportunities.
    if(p.type==='bomber'&&p.aiMode!=='recover'){
      tx=target.x+target.vx*.3;
      ty=p.y>target.y-25?Math.max(43,target.y-48):Math.max(45,target.y-22);
      if(p.y>target.y-16&&p.specialCooldown<=0&&p.climbAssist<=0)
        triggerSpecial(p);
      if(p.y<target.y-14&&Math.abs((p.x+p.vx*.15)-(target.x+target.vx*.15))<24)
        triggerBomb(p);
    }
    tx=clamp(tx,32,W-32);ty=clamp(ty,48,H-31);
    const goal=Math.atan2(ty-p.y,tx-p.x);
    const error=angleDiff(goal,p.angle);
    const turn=Math.abs(error)<.085?0:Math.sign(error);
    if(p.aiMode==='attack'&&range<165&&facing<.18&&p.gunCooldown<=0&&p.burstLeft===0&&
      (p.type!=='bomber'||range<65&&Math.random()<.12))triggerBurst(p);
    if(p.specialCooldown<=0){
      if(p.type==='heavy'&&range<100&&(p.health<p.d.hull*.7||target.burstLeft>0))triggerSpecial(p);
      if(p.type==='fighter'&&p.aiMode==='break'&&range<70)triggerSpecial(p);
    }
    return turn;
  }
  function updatePlane(p,dt,steer){
    if(!p.alive)return;
    p.spawnSafe=Math.max(0,p.spawnSafe-dt);
    p.hitFlash=Math.max(0,p.hitFlash-dt);
    p.damageNotice=Math.max(0,p.damageNotice-dt);
    p.specialCooldown=Math.max(0,p.specialCooldown-dt);
    p.armourTime=Math.max(0,p.armourTime-dt);
    p.climbAssist=Math.max(0,p.climbAssist-dt);
    p.bombCooldown=Math.max(0,p.bombCooldown-dt);
    p.boost=Math.max(0,p.boost-dt);
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
    if((p.parts.engine<60||p.health<p.d.hull*.35)&&p.smokeTimer<=0){
      p.smokeTimer=.09;
      const x=p.x-Math.cos(p.angle)*p.d.radius;
      const y=p.y-Math.sin(p.angle)*p.d.radius;
      emit(x,y,1,'#6d7480',6);
    }
  }
  function explosion(x,y,r,owner,damage,cause='BOMB'){
    emit(x,y,22,'#ffc47b',52);emit(x,y,9,'#6b707b',30);sound('boom');
    for(const p of state.fliers){
      if(!p.alive||p.id===owner)continue;
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
      const target=state.fliers[1-b.owner],shooter=state.fliers[b.owner];
      // Neither a gun muzzle nor a bomber can inflict disguised impact damage
      // by touching another airframe: rounds must leave the collision envelope.
      const clear=target&&shooter&&distance(target,shooter)>
        target.d.radius+shooter.d.radius+3;
      if(target&&target.alive&&target.rollTime<=0&&b.age>.085&&clear){
        const vx=b.x-px,vy=b.y-py;
        const denom=vx*vx+vy*vy;
        const t=denom>0?clamp(((target.x-px)*vx+(target.y-py)*vy)/denom,0,1):0;
        const nx=px+t*vx,ny=py+t*vy;
        if(Math.hypot(target.x-nx,target.y-ny)<target.d.radius+
          (shooter.type==='fighter'?2.7:1.4)){
          hit(target,b.damage,b.x,b.y,undefined,'GUN');
          state.bullets.splice(i,1);continue;
        }
      }
      if(b.life<=0||b.x<0||b.x>W||b.y<31||b.y>176)
        state.bullets.splice(i,1);
    }
    for(let i=state.bombs.length-1;i>=0;i--){
      const b=state.bombs[i];
      b.delay=Math.max(0,(b.delay||0)-dt);
      if(b.delay>0)continue;
      b.age=(b.age||0)+dt;
      b.vy+=94*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      const target=state.fliers[1-b.owner];
      if(b.y>=172||(b.age>.24&&target&&target.alive&&distance(b,target)<target.d.radius+4)){
        explosion(b.x,Math.min(b.y,172),24,b.owner,55);
        state.bombs.splice(i,1);continue;
      }
      if(b.life<=0||b.x<0||b.x>W)state.bombs.splice(i,1);
    }
    for(let i=state.mines.length-1;i>=0;i--){
      const m=state.mines[i];m.arm-=dt;m.life-=dt;m.phase+=dt*2;
      const target=state.fliers[1-m.owner];
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
      const user=state.fliers[0],enemy=state.fliers[1];
      updatePlane(user,dt,(controls.right?1:0)-(controls.left?1:0));
      updatePlane(enemy,dt,aiInput(enemy,user));
      projectiles(dt);
      // Airframes cannot hurt one another. Separate overlaps without HP or
      // component damage; bombers must win through bombing, not ramming.
      if(user.alive&&enemy.alive){
        const dx=enemy.x-user.x,dy=enemy.y-user.y;
        const gap=user.d.radius+enemy.d.radius-2;
        const dist=Math.hypot(dx,dy);
        if(dist<gap){
          const nx=dist>.001?dx/dist:Math.cos(user.angle);
          const ny=dist>.001?dy/dist:Math.sin(user.angle);
          const push=(gap-dist)*.5;
          user.x=clamp(user.x-nx*push,12,W-12);
          user.y=clamp(user.y-ny*push,34,H-12);
          enemy.x=clamp(enemy.x+nx*push,12,W-12);
          enemy.y=clamp(enemy.y+ny*push,34,H-12);
        }
      }
      if(state.time<=0){
        const a=user.health/user.d.hull,b=enemy.health/enemy.d.hull;
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
      c.beginPath();c.ellipse(0,0,15,14,0,0,TAU);
      c.strokeStyle='#b1ecf5c9';c.lineWidth=.75;c.stroke();
    }
    aircraftArt?.draw(c,p.type,p.health<p.d.hull*.38?'damaged':'level');
    if(p.hitFlash>0){
      c.beginPath();c.ellipse(0,0,12,8,0,0,TAU);
      c.strokeStyle='#fff0bd';c.lineWidth=.8;c.stroke();
    }
    c.restore();
    c.fillStyle='#1e3341d9';c.fillRect(p.x-7,p.y-19,14,5.5);
    c.font='bold 5px sans-serif';c.textAlign='center';c.textBaseline='top';
    c.fillStyle=p.id===0?'#ffe7b4':'#ffc2b8';
    c.fillText(p.id===0?'P1':'AI',p.x,p.y-18.6);
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
    const en=e?e.d.name:'SELECT PLANE';
    g.fillText(en,W-7-g.measureText(en).width,3);
    g.font='bold 8px monospace';g.textAlign='center';
    g.fillText(state.scores[0]+' : '+state.scores[1],W/2,3);
    g.font='6px monospace';g.fillStyle='#bed5dc';
    g.fillText(Math.max(0,Math.ceil(state.time))+'s',W/2,15);g.textAlign='left';
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
      g.fillStyle='#e6d3a0';g.fillText('ENERGY',123,19);
      bar(123,27,48,p.energy,100,p.energy<20?'#db8369':'#9bbfd0');
      g.fillStyle=p.rollTime>0?'#f8e4a2':'#c0d9df';
      g.fillText(p.rollTime>0?'ROLLING':p.rollRecovery>0?'ROLL '+p.rollRecovery.toFixed(1):'ROLL READY',181,19);
      if(p.type==='bomber'){
        g.fillStyle='#ffd9a2';g.fillText(p.bombCooldown>0?'BOMB '+p.bombCooldown.toFixed(1):'BOMB READY',W*.50,27);
      }
      g.fillStyle='#dce8e1';g.fillText('DAMAGE',W-106,19);
      const zones=[['E','engine'],['N','nose'],['A','body'],['L','left'],['R','right']];
      for(let i=0;i<zones.length;i++){
        const health=p.parts[zones[i][1]];
        const x=W-60+i*11;
        g.fillStyle=health>65?'#76b68a':health>30?'#e6b96c':'#e77267';
        g.fillRect(x,19,8,8);
        g.fillStyle='#192c35';g.font='bold 6px monospace';g.fillText(zones[i][0],x+1,20);
      }
    }
    g.fillStyle='#37546a';g.fillRect(0,30,W,1);
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
      const heavy=state.fliers[b.owner]?.type==='heavy';
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
    const pilot=state.fliers[0];
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
  bindButton('fire',null,()=>triggerBurst(state.fliers[0]));
  bindButton('special',null,()=>triggerSpecial(state.fliers[0]));
  bindButton('roll',null,()=>triggerRoll(state.fliers[0]));
  bindButton('bomb',null,()=>triggerBomb(state.fliers[0]));
  const preventKeys=new Set(['ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','KeyA','KeyD','KeyK','KeyL','KeyB']);
  document.addEventListener('keydown',e=>{
    if(preventKeys.has(e.code))e.preventDefault();
    if(e.code==='KeyA'||e.code==='ArrowLeft')controls.left=true;
    if(e.code==='KeyD'||e.code==='ArrowRight')controls.right=true;
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
  });
  // Mobile browsers can briefly blur the page when touch controls, browser
  // chrome or audio focus change. Never pause gameplay merely on window blur:
  // it made FIRE appear to pause the game and left no touch way to resume.
  window.addEventListener('blur',()=>{
    controls.left=false;controls.right=false;
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){controls.left=false;controls.right=false;}
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
    const nextW=clamp(Math.round(H*rect.width/rect.height),480,650);
    const dpr=clamp(window.devicePixelRatio||1,1,2);
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

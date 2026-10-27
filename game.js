/* Wingman v0.1: dependency-free 320x180 fixed-step aerial duels.
   Gameplay is separated from rendering so input can later be sourced from networking. */
(() => {
  'use strict';
  let W=320; const H=180, STEP=1/60, TAU=Math.PI*2;
  const canvas=document.getElementById('game');
  const g=canvas.getContext('2d',{alpha:false});
  g.imageSmoothingEnabled=false;

  const PLANES={
    fighter:{name:'SPITFIRE',speed:62,turn:3.35,hull:110,radius:8,burst:6,interval:.085,cooldown:2.05,damage:12,bulletSpeed:165,specialCd:7.5,color:'#d5d9b5',shade:'#5c756d',accent:'#db8a51',special:'BOOST'},
    heavy:{name:'HEAVY FIGHTER',speed:49,turn:2.35,hull:160,radius:10,burst:4,interval:.14,cooldown:2.55,damage:23,bulletSpeed:155,specialCd:8.5,color:'#bd765c',shade:'#673f42',accent:'#f4c47e',special:'MINE'},
    bomber:{name:'BOMBER',speed:40,turn:1.73,hull:205,radius:12,burst:4,interval:.17,cooldown:2.7,damage:11,bulletSpeed:135,specialCd:5.6,color:'#c8b087',shade:'#807359',accent:'#e7dbaf',special:'BOMB'}
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
      spawnSafe:1.0,smokeTimer:0,hitFlash:0,alive:true,aiThink:0};
  }
  function newRound(){
    state.fliers=[
      plane(state.selected,0,W*.23,82,-.14),
      plane(state.enemyType,1,W*.77,89,Math.PI+.15)
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
    newRound();
  }
  function showMenu(){
    state.phase='menu';state.paused=false;controls.left=false;controls.right=false;
    ui.result.classList.add('hidden');ui.menu.classList.remove('hidden');
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
    if(!p||!p.alive||p.gunCooldown>0||p.burstLeft>0||state.phase!=='playing'||state.paused)return;
    p.burstLeft=p.d.burst;p.shotTimer=0;
  }
  function triggerSpecial(p){
    if(!p||!p.alive||p.specialCooldown>0||state.phase!=='playing'||state.paused)return;
    p.specialCooldown=p.d.specialCd;
    if(p.type==='fighter'){
      p.boost=1.2;sound('special');
      emit(p.x-Math.cos(p.angle)*8,p.y-Math.sin(p.angle)*8,7,'#ffe4a2',18);
    }else if(p.type==='heavy'){
      state.mines.push({x:p.x-Math.cos(p.angle)*11,y:p.y-Math.sin(p.angle)*11,
        owner:p.id,arm:.7,life:11,phase:random(0,TAU)});
      sound('special');
    }else{
      state.bombs.push({x:p.x-Math.sin(p.angle)*4,y:p.y+7,
        vx:p.vx*.55,vy:p.vy*.15+9,owner:p.id,life:3});
      sound('special');
    }
  }
  function shoot(p){
    const a=p.angle,dx=Math.cos(a),dy=Math.sin(a);
    state.bullets.push({x:p.x+dx*(p.d.radius+2),y:p.y+dy*(p.d.radius+2),
      vx:dx*p.d.bulletSpeed+p.vx*.35,vy:dy*p.d.bulletSpeed+p.vy*.35,
      owner:p.id,damage:p.d.damage,life:.9});
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
  function hit(p,amount,x,y,zoneOverride){
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
    p.parts[zone]=Math.max(0,p.parts[zone]-amount*1.45);
    const armourPenalty=1+(100-p.parts.body)/100*.25;
    p.health-=amount*armourPenalty;
    p.hitFlash=.17;
    emit(x,y,7,'#ffe0a0',27);sound('hit');
    if(p.health<=0){
      p.health=0;p.alive=false;
      emit(p.x,p.y,28,'#ffc47e',75);
      emit(p.x,p.y,16,'#625765',35);
      endRound(p.id===0?1:0);
    }
  }
  function steerPlane(p,steer,dt){
    const turning=steer<0?(.4+.6*p.parts.left/100):(.4+.6*p.parts.right/100);
    p.angle+=steer*p.d.turn*turning*dt;
    if(p.angle>Math.PI)p.angle-=TAU;
    if(p.angle< -Math.PI)p.angle+=TAU;
    const engine=.52+.48*p.parts.engine/100;
    const altitude=1+Math.sin(p.angle)*.22;
    const wanted=p.d.speed*engine*altitude*(p.boost>0?1.55:1);
    p.speed+=(wanted-p.speed)*Math.min(1,dt*2.6);
    const follow=Math.min(1,dt*(p.type==='bomber'?2.4:3.8));
    p.vx+=(Math.cos(p.angle)*p.speed-p.vx)*follow;
    p.vy+=(Math.sin(p.angle)*p.speed-p.vy)*follow;
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    // Prototype arena: reflect at the edges. Later we can tune soft boundaries.
    if(p.x<11){p.x=11;p.vx=Math.abs(p.vx)*.65;p.angle=Math.PI-p.angle;}
    if(p.x>W-11){p.x=W-11;p.vx=-Math.abs(p.vx)*.65;p.angle=Math.PI-p.angle;}
    if(p.y<32){p.y=32;p.vy=Math.abs(p.vy)*.65;p.angle=-p.angle;}
    if(p.y>162){
      p.y=162;p.vy=-Math.abs(p.vy)*.7;p.angle=-p.angle;
      if(p.spawnSafe<=0)hit(p,25,p.x,p.y,'body');
    }
  }
  function aiInput(p,target){
    let goal;
    // Fly toward the opponent's tail rather than simply aiming at the nose.
    const tx=target.x-Math.cos(target.angle)*26+target.vx*.17;
    const ty=target.y-Math.sin(target.angle)*26+target.vy*.17;
    goal=Math.atan2(ty-p.y,tx-p.x);
    if(p.x<43||p.x>W-43||p.y<45||p.y>145){
      const centre=Math.atan2(92-p.y,W/2-p.x);
      goal=centre;
    }
    for(const m of state.mines){
      if(m.owner===p.id||m.arm>0)continue;
      if(Math.hypot(m.x-p.x,m.y-p.y)<28){
        goal=Math.atan2(p.y-m.y,p.x-m.x);break;
      }
    }
    // Slight aiming imperfection keeps early AI beatable.
    const error=angleDiff(goal,p.angle);
    const turn=Math.abs(error)<.07?0:Math.sign(error);
    const range=distance(p,target);
    const aim=angleDiff(Math.atan2(target.y-p.y,target.x-p.x),p.angle);
    if(range<135&&Math.abs(aim)<.16&&p.gunCooldown<=0&&p.burstLeft===0)
      triggerBurst(p);
    if(p.specialCooldown<=0){
      if(p.type==='bomber'&&p.y<target.y-13&&Math.abs(p.x-target.x)<22)triggerSpecial(p);
      if(p.type==='heavy'&&range<54&&Math.abs(angleDiff(target.angle,p.angle))<.7)
        triggerSpecial(p);
      if(p.type==='fighter'&&range>115&&Math.abs(error)<.3)triggerSpecial(p);
    }
    return turn;
  }
  function updatePlane(p,dt,steer){
    if(!p.alive)return;
    p.spawnSafe=Math.max(0,p.spawnSafe-dt);
    p.hitFlash=Math.max(0,p.hitFlash-dt);
    p.specialCooldown=Math.max(0,p.specialCooldown-dt);
    p.boost=Math.max(0,p.boost-dt);
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
  function explosion(x,y,r,owner,damage){
    emit(x,y,22,'#ffc47b',52);emit(x,y,9,'#6b707b',30);sound('boom');
    for(const p of state.fliers){
      if(!p.alive||p.id===owner)continue;
      const d=Math.hypot(x-p.x,y-p.y);
      if(d<r+p.d.radius)hit(p,damage*(1-clamp(d/(r+p.d.radius),0,.75)),x,y);
    }
  }
  function projectiles(dt){
    for(let i=state.bullets.length-1;i>=0;i--){
      const b=state.bullets[i];
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      const target=state.fliers[1-b.owner];
      if(target&&target.alive&&distance(b,target)<target.d.radius+1){
        hit(target,b.damage,b.x,b.y);state.bullets.splice(i,1);continue;
      }
      if(b.life<=0||b.x<0||b.x>W||b.y<31||b.y>170)state.bullets.splice(i,1);
    }
    for(let i=state.bombs.length-1;i>=0;i--){
      const b=state.bombs[i];
      b.vy+=94*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      const target=state.fliers[1-b.owner];
      if(b.y>=161||(target&&target.alive&&distance(b,target)<target.d.radius+4)){
        explosion(b.x,Math.min(b.y,161),24,b.owner,55);
        state.bombs.splice(i,1);continue;
      }
      if(b.life<=0||b.x<0||b.x>W)state.bombs.splice(i,1);
    }
    for(let i=state.mines.length-1;i>=0;i--){
      const m=state.mines[i];m.arm-=dt;m.life-=dt;m.phase+=dt*2;
      const target=state.fliers[1-m.owner];
      if(m.arm<=0&&target&&target.alive&&distance(m,target)<target.d.radius+6){
        explosion(m.x,m.y,21,m.owner,54);state.mines.splice(i,1);continue;
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
      state.impactLock=Math.max(0,state.impactLock-dt);
      if(user.alive&&enemy.alive&&distance(user,enemy)<user.d.radius+enemy.d.radius-3&&state.impactLock<=0){
        const hx=(user.x+enemy.x)/2,hy=(user.y+enemy.y)/2;
        hit(user,21,hx,hy);hit(enemy,21,hx,hy);
        state.impactLock=.75;
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
  function makeBackground(){
    const c=document.createElement('canvas');c.width=W;c.height=H;
    const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='#96c6de';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#a9d2e2';ctx.fillRect(0,34,W,27);
    ctx.fillStyle='#b6d6df';ctx.fillRect(0,61,W,45);
    // Clouds use chunky horizontal pixel blocks.
    function cloud(x,y){
      ctx.fillStyle='#e8ecdd';ctx.fillRect(x+5,y,26,4);ctx.fillRect(x,y+4,40,5);
      ctx.fillRect(x+9,y-4,12,4);ctx.fillRect(x+14,y+9,27,3);
      ctx.fillStyle='#c9d9d9';ctx.fillRect(x+6,y+10,30,2);
    }
    cloud(24,47);cloud(153,38);cloud(263,55);
    poly(ctx,[[0,116],[29,76],[47,96],[74,61],[104,116]],'#9bbed1');
    poly(ctx,[[74,118],[116,73],[146,104],[173,65],[221,116]],'#94b1c4');
    poly(ctx,[[175,123],[229,66],[256,96],[282,77],[320,120]],'#a5bac9');
    poly(ctx,[[20,89],[29,76],[37,91],[32,87],[28,91]],'#f0ecdd');
    poly(ctx,[[65,74],[74,61],[85,79],[76,74],[73,78]],'#e8e8dc');
    poly(ctx,[[220,76],[229,66],[240,80],[230,75],[227,79]],'#eee9db');
    // Middle distance ridges and snow.
    poly(ctx,[[0,128],[38,106],[64,121],[93,100],[125,131],[160,106],[200,127],[244,102],[282,125],[320,107],[320,180],[0,180]],'#6f9b9e');
    poly(ctx,[[0,141],[30,125],[64,138],[96,124],[140,146],[177,127],[209,139],[249,118],[288,137],[320,128],[320,180],[0,180]],'#4d7d7c');
    ctx.fillStyle='#487f90';ctx.fillRect(0,155,W,25);
    ctx.fillStyle='#7cabb1';for(let y=158;y<180;y+=5){
      for(let x=(y*7)%31;x<W;x+=31)ctx.fillRect(x,y,15,1);
    }
    // Silhouettes: a ruined fortress and tiny pine trees.
    ctx.fillStyle='#375f5d';ctx.fillRect(238,125,33,13);
    ctx.fillRect(241,119,9,8);ctx.fillRect(257,116,9,11);
    ctx.fillRect(241,115,3,3);ctx.fillRect(247,115,3,3);
    ctx.fillRect(257,112,3,4);ctx.fillRect(263,112,3,4);
    ctx.fillStyle='#284b52';ctx.fillRect(252,130,5,8);
    ctx.fillStyle='#365e59';
    for(const x of [12,18,26,43,52,72,91,113,143,170,190,220,284,300,312]){
      const y=143+(x*13)%11,h=9+(x*7)%9;
      poly(ctx,[[x,y-h],[x-4,y-2],[x-2,y-2],[x-6,y+2],[x+6,y+2],[x+2,y-2],[x+4,y-2]],'#305e58');
      ctx.fillRect(x-1,y,2,5);
    }
    ctx.fillStyle='#345b5a';ctx.fillRect(0,164,W,16);
    ctx.fillStyle='#426c64';for(let x=0;x<W;x+=11)ctx.fillRect(x,162+(x%3),7,3);
    return c;
  }
  const background=makeBackground();
  function aircraft(p){
    const d=p.d;
    const x=Math.round(p.x),y=Math.round(p.y);
    g.save();g.translate(x,y);g.rotate(p.angle);
    g.fillStyle='#273e49';
    if(p.type==='fighter'){
      poly(g,[[-10,-3],[-4,-3],[-3,-5],[2,-5],[4,-3],[10,-2],[13,0],[9,2],[-5,2],[-10,3]],'#2d4350');
      poly(g,[[-9,-2],[-3,-2],[0,-4],[3,-3],[10,-1],[12,0],[7,1],[-7,1]],p.hitFlash>0?'#fff2d7':d.color);
      g.fillStyle=d.shade;g.fillRect(-4,2,7,4);g.fillRect(-5,-6,6,2);
      g.fillStyle=d.accent;g.fillRect(-7,-2,2,3);
      g.fillStyle='#395467';g.fillRect(2,-3,3,2);
      g.fillStyle='#e3cd91';g.fillRect(12,-1,2,2);
    }else if(p.type==='heavy'){
      poly(g,[[-13,-4],[-8,-4],[-5,-6],[2,-6],[4,-4],[11,-3],[15,-1],[15,2],[-10,3],[-13,5]],'#3e4650');
      poly(g,[[-12,-3],[-7,-3],[-4,-5],[4,-4],[12,-2],[14,0],[9,2],[-11,2]],p.hitFlash>0?'#fff2d7':d.color);
      g.fillStyle=d.shade;g.fillRect(-4,2,11,5);g.fillRect(-8,-7,10,2);
      g.fillStyle='#f9c773';g.fillRect(5,-2,4,1);
      g.fillStyle='#343b42';g.fillRect(13,-3,4,1);g.fillRect(13,2,4,1);
    }else{
      poly(g,[[-16,-5],[-11,-5],[-10,-7],[4,-7],[10,-4],[15,-3],[18,0],[14,3],[-14,4],[-16,7]],'#4d5552');
      poly(g,[[-15,-4],[-9,-4],[-6,-6],[6,-5],[14,-2],[17,0],[12,3],[-14,3]],p.hitFlash>0?'#fff2d7':d.color);
      g.fillStyle=d.shade;g.fillRect(-7,3,15,6);g.fillRect(-10,-9,14,3);
      g.fillStyle='#7d9aa0';g.fillRect(4,-4,6,2);
      g.fillStyle='#eee0b3';g.fillRect(16,-1,3,2);
    }
    if(p.parts.left<40||p.parts.right<40){
      g.fillStyle='#323a41';g.fillRect(-3,p.parts.left<p.parts.right?-5:3,5,2);
    }
    if(p.boost>0){
      g.fillStyle='#ffe6a0';g.fillRect(-d.radius-5,-2,5,3);
      g.fillStyle='#f6a35d';g.fillRect(-d.radius-8,-1,3,1);
    }
    g.restore();
    // Identifier remains legible when planes cross.
    g.fillStyle=p.id===0?'#fff0bf':'#f4a1a4';
    g.font='bold 6px monospace';g.textAlign='center';
    g.fillText(p.id===0?'YOU':'CPU',x,y-d.radius-6);
    g.textAlign='left';
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
      const sc=p.specialCooldown>0?Math.ceil(p.specialCooldown)+'s':'READY';
      g.fillStyle='#f0d8a2';g.fillText(p.d.special+' '+sc,77,19);
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
      g.fillStyle='#2b3743';g.fillRect(Math.round(b.x)-2,Math.round(b.y)-1,5,4);
      g.fillStyle='#e8ba80';g.fillRect(Math.round(b.x)+1,Math.round(b.y),1,1);
    }
    for(const b of state.bullets){
      g.fillStyle='#354657';g.fillRect(Math.round(b.x)-1,Math.round(b.y)-1,4,3);
      g.fillStyle='#ffe18e';g.fillRect(Math.round(b.x),Math.round(b.y),3,1);
    }
    for(const p of state.fliers)if(p.alive)aircraft(p);
    for(const p of state.sparks){
      g.globalAlpha=clamp(p.life/p.max,.2,1);
      g.fillStyle=p.color;g.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);
    }
    g.globalAlpha=1;
    drawHud();
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
  const preventKeys=new Set(['ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','KeyA','KeyD','KeyK']);
  document.addEventListener('keydown',e=>{
    if(preventKeys.has(e.code))e.preventDefault();
    if(e.code==='KeyA'||e.code==='ArrowLeft')controls.left=true;
    if(e.code==='KeyD'||e.code==='ArrowRight')controls.right=true;
    if(e.repeat)return;
    if(e.code==='Space'){audioUnlock();triggerBurst(state.fliers[0]);}
    if(e.code==='ShiftLeft'||e.code==='ShiftRight'||e.code==='KeyK'){audioUnlock();triggerSpecial(state.fliers[0]);}
    if(e.code==='KeyP'&&state.phase==='playing')state.paused=!state.paused;
  });
  document.addEventListener('keyup',e=>{
    if(e.code==='KeyA'||e.code==='ArrowLeft')controls.left=false;
    if(e.code==='KeyD'||e.code==='ArrowRight')controls.right=false;
  });
  window.addEventListener('blur',()=>{
    controls.left=false;controls.right=false;
    if(state.phase==='playing')state.paused=true;
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
    const nextW=clamp(Math.round(H*rect.width/rect.height),320,560);
    if(nextW===W&&canvas.width===W)return;
    const old=W;
    W=nextW;
    canvas.width=W;canvas.height=H;
    g.imageSmoothingEnabled=false;
    const factor=W/old;
    for(const p of state.fliers)p.x*=factor;
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

/* Wingman v0.1: dependency-free 320x180 fixed-step aerial duels.
   Gameplay is separated from rendering so input can later be sourced from networking. */
(() => {
  'use strict';
  let W=520; const H=250, STEP=1/60, TAU=Math.PI*2;
  const renderScale=window.matchMedia?.('(pointer: coarse)')?.matches ? Math.min(3,Math.max(2.5,window.devicePixelRatio||2)) : 1;
  const canvas=document.getElementById('game');
  const aircraftArt=window.WingmanSprites;
  const modelCanvas=document.getElementById('aircraft-layer');
  const modelCtx=modelCanvas.getContext('2d',{alpha:true});
  let g=canvas.getContext('2d',{alpha:false});
  g.imageSmoothingEnabled=false;

  // Stronger gravity-driven dive momentum and Spitfire-specific Overdrive.
  const DIVE_SPEED_GAIN=64;
  const DIVE_OVERSPEED_LIMIT=1.60;
  const SPITFIRE_BOOST_GAIN=1.25;
  const PLANES={
    fighter:{name:'SUPERMARINE SPITFIRE',speed:82,turn:3.15,hull:130,armour:40,radius:5.5,burst:10,interval:.055,cooldown:1.5,damage:11,bulletSpeed:194,gunLife:1.28,specialCd:8,color:'#d5d9b5',shade:'#5c756d',accent:'#db8a51',special:'REVERSE'},
    heavy:{name:'BRISTOL BEAUFIGHTER',speed:75,turn:1.98,hull:160,armour:78,radius:8,burst:7,interval:.17,cooldown:2.20,damage:16,bulletSpeed:180,gunLife:1.25,specialCd:20,color:'#bd765c',shade:'#673f42',accent:'#f4c47e',special:'ARMOUR'},
    bomber:{name:'AVRO LANCASTER',speed:66,turn:1.3,hull:180,armour:124,radius:9,burst:4,interval:.30,cooldown:2.85,damage:10,bulletSpeed:158,gunLife:1.22,specialCd:10,color:'#c8b087',shade:'#807359',accent:'#e7dbaf',special:'CLIMB'},
    bf109:{name:'MESSERSCHMITT BF 109E · EMIL',class:'fighter',nation:'Germany',speed:87,turn:3.02,hull:125,armour:42,radius:5.5,burst:10,interval:.064,cooldown:1.40,damage:11,bulletSpeed:194,gunLife:1.28,specialCd:8,color:'#afb89d',shade:'#647a74',accent:'#ecd06c',special:'REVERSE'},
    bf110:{name:'MESSERSCHMITT BF 110 · ZERSTÖRER',class:'heavy',nation:'Germany',speed:78,turn:1.91,hull:160,armour:75,radius:8,burst:8,interval:.17,cooldown:2.27,damage:17,bulletSpeed:180,gunLife:1.25,specialCd:20,color:'#b1b7a4',shade:'#53676a',accent:'#e5c77b',special:'ARMOUR'},
    he111:{name:'HEINKEL HE 111',class:'bomber',nation:'Germany',speed:69,turn:1.35,hull:175,armour:116,radius:8.5,burst:4,interval:.32,cooldown:2.82,damage:10,bulletSpeed:162,gunLife:1.22,specialCd:10,color:'#a5ae9d',shade:'#576b61',accent:'#b4baca',special:'CLIMB'}
  };
  const state={
    phase:'menu',selected:'fighter',fliers:[],bullets:[],bombs:[],mines:[],sparks:[],
    scores:[0,0],round:1,time:90,intermission:0,banner:'',bannerTime:0,paused:false,
    impactLock:0,trails:[],blasts:[],visualClock:0,enemyType:'heavy',mode:'duel',arena:0,kills:0,participants:2,teams:false,difficulty:'standard',
    wind:{active:false,base:0,current:0,elapsed:0},recordMode:'duel',challenge:'intercept',session:null,survivalCarry:null,supportCharge:0,supportTime:0,supportUses:0
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
  // Flight and targeting share the same horizontally wrapping sky.
  const wrappedDelta=(from,to)=>{
    let dx=to-from;
    if(dx>W*.5)dx-=W;else if(dx< -W*.5)dx+=W;
    return dx;
  };
  const combatDistance=(a,b)=>Math.hypot(wrappedDelta(a.x,b.x),b.y-a.y);
  // Predict relative bullet travel; AI must physically steer into the solution.
  function interceptPoint(shooter,target){
    const dx=wrappedDelta(shooter.x,target.x),dy=target.y-shooter.y;
    const vx=target.vx-shooter.vx*.35+(state.wind?.current||0)*.82;
    const vy=target.vy-shooter.vy*.35;
    const speed=shooter.d.bulletSpeed*pilotFactors(shooter).gun;
    const a=vx*vx+vy*vy-speed*speed,b=2*(dx*vx+dy*vy),cc=dx*dx+dy*dy;
    let t=Math.sqrt(cc)/Math.max(speed,1),discriminant=b*b-4*a*cc;
    if(Math.abs(a)>1e-6&&discriminant>=0){
      const root=Math.sqrt(discriminant);
      const options=[(-b-root)/(2*a),(-b+root)/(2*a)].filter(n=>n>0);
      if(options.length)t=Math.min(...options);
    }else if(Math.abs(a)<=1e-6&&Math.abs(b)>1e-6&&-cc/b>0)t=-cc/b;
    t=clamp(t,0,1.2);
    return {x:shooter.x+dx+target.vx*t+(state.wind?.current||0)*.82*t,
      y:target.y+target.vy*t,time:t};
  }
  const palette={sky:'#95c7df',ink:'#243945',cream:'#f2e1ad',red:'#e88469'};

  function audioUnlock(){
    if(window.WingmanAudio){window.WingmanAudio.unlock();return;}
    try{
      const Ctx=window.AudioContext||window.webkitAudioContext;
      if(Ctx&&!audio){audio=new Ctx();}
      if(audio&&audio.state==='suspended')audio.resume().catch(()=>{});
    }catch(_){}
  }
  function sound(type){
    if(window.WingmanAudio){window.WingmanAudio.play(type);return;}
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
  function pilotAttributes(values){
 const n=k=>clamp(Number(values?.[k])||65,35,95);
 return {manoeuvrability:n('manoeuvrability'),gunnery:n('gunnery'),engine:n('engine')};
}
function readPilotAttributes(){
 try{return JSON.parse(localStorage.getItem('wingman-road-to-ace-v1')||'null')?.profile?.attributes;}catch{return null;}
}
function readPilotName(){try{return JSON.parse(localStorage.getItem('wingman-road-to-ace-v1')||'null')?.profile?.name||'';}catch{return '';}}
function readPilotSkill(){try{return JSON.parse(localStorage.getItem('wingman-road-to-ace-v1')||'null')?.profile?.skill||'roll';}catch{return 'roll';}}
function pilotFactors(p){
 const a=p.attributes||pilotAttributes();
 return {turn:1+(a.manoeuvrability-65)*.0017,gun:1+(a.gunnery-65)*.0028,
 engine:1+(a.engine-65)*.0012,accel:1+(a.engine-65)*.0035,
 momentum:1+(a.manoeuvrability-65)*.002};
}
function plane(type,id,x,y,angle){
    const d=PLANES[type];
    return {overdriveTime:0,bombQueue:0,bombInterval:0,bombRunId:0,attributes:pilotAttributes(),pilotSkill:'roll',skillCooldown:0,smokescreen:0,hardenTime:0,deadeyeTime:0,engineCutTime:0,diveTime:0,id,type,role:d.class||type,team:state.teams?(id===0||id===2?0:1):id,d,x,y,angle,speed:d.speed*.8,vx:Math.cos(angle)*d.speed*.8,
      vy:Math.sin(angle)*d.speed*.8,health:d.hull,armour:d.armour,rearCooldown:0,rearShots:0,rearShotTime:0,aiBombDelay:id>0?4.5:0,turretFlash:0,
      critical:false,criticalCause:'',flightRisk:0,climbLoad:0,aiRecoveryTime:0,tailAssist:0,
      gunCooldown:0,burstLeft:0,shotTimer:0,specialCooldown:0,boostCharge:100,boosting:false,aiBoost:false,
      spawnSafe:1.0,smokeTimer:0,hitFlash:0,alive:true,aiThink:0,
      energy:85,rollTime:0,rollDuration:0,rollRecovery:0,skillFeedback:'',skillFeedbackTime:0,stallTime:0,wallGrace:0,armourTime:0,bombCooldown:0,climbAssist:0,
      swoopTime:0,swoop:null,turnVelocity:0,damageCause:'',damageNotice:0,muzzleFlash:0};
  }

  // Wind is an infrequent, symmetric difficulty modifier, not the baseline physics.
  function rollWind(mode,rank=1){
    const chance=mode==='campaign'?Math.min(.38,.18+Math.max(1,rank)*.025):.28;
    if(Math.random()>=chance)return {active:false,base:0,current:0,elapsed:0};
    const base=(Math.random()<.5?-1:1)*(8+Math.random()*9);
    return {active:true,base,current:base,elapsed:0};
  }
  function updateWind(dt){
    const w=state.wind;if(!w?.active)return;
    w.elapsed+=dt;
    w.current=w.base*(1+.16*Math.sin(w.elapsed*1.1)+.07*Math.sin(w.elapsed*2.7));
  }
  function drawWind(){
    const w=state.wind;if(!w?.active)return;
    g.save();g.strokeStyle='#e7edf2a0';g.lineWidth=.65;
    const dir=Math.sign(w.current),shift=w.elapsed*w.current*.88;
    for(let i=0;i<10;i++){
      const x=((i*83+shift)%(W+72)+(W+72))%(W+72)-36;
      const y=63+(i*37)%Math.max(100,H-112);
      g.beginPath();g.moveTo(x,y);g.lineTo(x+dir*(9+i%4*2),y-1.2);g.stroke();
    }
    g.restore();
  }
  const ARENAS=['ALPINE','COAST','DESERT','STORM'];
  const CHALLENGES={
    intercept:{name:'ACE INTERCEPT',time:45,difficulty:'ace',description:'Shoot down an elite fighter before time runs out'},
    crosswind:{name:'CROSSWIND',time:75,difficulty:'standard',description:'Defeat your rival through a sustained crosswind'},
    noarmour:{name:'IRON NERVES',time:90,difficulty:'standard',description:'Win with no starting armour'},
    heavy:{name:'HEAVY HUNTER',time:90,difficulty:'ace',description:'Intercept a heavily armed two-engine fighter'}
  };
  function newSession(){
    return {seconds:0,shots:0,hits:0,kills:0,roundsWon:0,damageTaken:0,finalized:false};
  }
  function sessionScore(won){
    const q=state.session||newSession();
    const speedBonus=won&&state.recordMode==='challenge'?Math.ceil(Math.max(0,state.time)*4):0;
    return Math.max(0,Math.round(q.kills*150+q.roundsWon*125+
      (state.recordMode==='survival'?q.roundsWon*q.roundsWon*28:0)+
      (won?240:0)+speedBonus+Math.min(250,q.hits*4)));
  }
  function finishArcade(won){
    if(state.mode==='campaign'||!state.session||state.session.finalized)return;
    const session=state.session;session.finalized=true;
    const waves=state.recordMode==='survival'?session.roundsWon:0;
    const entry=window.WingmanArcade?.finish({
      mode:state.recordMode,challenge:state.recordMode==='challenge'?state.challenge:null,
      aircraft:state.selected,difficulty:state.difficulty,won,
      score:sessionScore(won),kills:session.kills,waves,
      seconds:session.seconds,shots:session.shots,hits:session.hits,damageTaken:session.damageTaken
    });
    const box=document.getElementById('arcade-after-action');
    if(box){
      const awarded=(entry?.awards||[]).map(a=>'<span class="arcade-new-honour">✦ '+a.replace(/[&<>]/g,'')+'</span>').join('');
      box.innerHTML='<div class="arcade-after-score"><b>SCORE '+sessionScore(won).toLocaleString()+'</b>'+
       '<span>YOUR BEST '+Number(entry?.best||sessionScore(won)).toLocaleString()+'</span>'+
       '<span>KILLS '+session.kills+' · HITS '+session.hits+'/'+session.shots+
       (state.recordMode==='survival'?' · WAVES '+session.roundsWon:'')+'</span></div>'+
       (awarded?'<div class="arcade-new-honours">'+awarded+'</div>':'');
    }
    window.WingmanArcade?.render?.();
  }

  function syncAbilityButton(){
    const action=document.getElementById('special');
    if(!action)return;
    const role=PLANES[state.selected]?.class||state.selected;
    const label=role==='fighter'?'BOOST':role==='heavy'?'SHIELD':'BOMBS';
    action.textContent=label;
    action.setAttribute('aria-label',role==='bomber'?'Release bomb salvo':role==='heavy'?'Activate defensive shield':'Activate overdrive');
  }
  function newRound(){
    syncAbilityButton();
    if(state.mode==='campaign'){state.supportCharge=0;state.supportTime=0;state.supportUses=0;}
    const help=document.getElementById('call-support');
    if(help)help.hidden=state.mode!=='campaign';
    state.fliers=[
      plane(state.selected,0,W*.22,H*.45,-.14),
      plane(state.enemyType,1,W*.78,H*.52,Math.PI+.15)
    ];
    if(state.mode==='campaign'&&state.campaignEncounter){
      const encounter=state.campaignEncounter;
      state.fliers=[plane(state.selected,0,W*.22,H*.45,-.14)];
      const starts=[[.78,.52,Math.PI+.15],[.68,.36,Math.PI+.28],[.86,.42,Math.PI+.08]];
      encounter.types.slice(0,3).forEach((type,index)=>{
        const [x,y,angle]=starts[index],foe=plane(type,index+1,W*x,H*y,angle);
        foe.team=1;state.fliers.push(foe);
      });
      state.fliers[0].team=0;
      state.bossCountdown=encounter.finalBoss?20:0;
      state.bossReinforcementLaunched=!encounter.finalBoss;
      if(encounter.finalBoss&&state.fliers[3]){
        state.fliers[3].alive=false;state.fliers[3].queued=true;state.fliers[3].spawnSafe=0;
      }
    }else if(state.participants>2){
      const allies=state.selected.startsWith('bf')||state.selected==='he111'?['bf109','bf110','he111']:['fighter','heavy','bomber'];
      const foes=Object.keys(PLANES).filter(t=>!allies.includes(t));
      if(state.teams){
        state.fliers[1]=plane(foes[state.round%foes.length],1,W*.78,H*.52,Math.PI+.15);
        const mate=allies.filter(t=>t!==state.selected)[(state.round-1)%2];
        state.fliers.push(plane(mate,2,W*.40,H*.36,-.1));
        state.fliers.push(plane(foes[(state.round+1)%foes.length],3,W*.67,H*.63,Math.PI+.24));
      }else{
        const pool=Object.keys(PLANES).filter(t=>t!==state.selected&&t!==state.enemyType);
        for(let id=2;id<state.participants;id++){
          const type=pool[(id+state.round)%pool.length];
          state.fliers.push(plane(type,id,W*(id===2?.42:.61),H*(id===2?.62:.36),id===2?-.8:2.4));
        }
      }
    }
    if(state.mode==='campaign'&&state.campaignAirframe?.stats){
      const base=state.fliers[0].d,rolled=state.campaignAirframe.stats;
      const safe={speed:clamp(Number(rolled.speed)||base.speed,base.speed*.94,base.speed*1.06),turn:clamp(Number(rolled.turn)||base.turn,base.turn*.94,base.turn*1.06),armour:clamp(Number(rolled.armour)||base.armour,base.armour*.88,base.armour*1.12)};
      state.fliers[0].d={...base,...safe};
      state.fliers[0].armour=safe.armour;
    }
    state.fliers[0].attributes=pilotAttributes(readPilotAttributes());
    state.fliers[0].pilotSkill=readPilotSkill();
    // Specialist rating only applies to the player's preferred aircraft,
    // and only in Road to Ace. Avoid mutating shared PLANES definitions.
    const bonus=state.mode==='campaign'?state.campaignEncounter?.playerAptitude:null;
    if(bonus){
      const hero=state.fliers[0],base=hero.d;
      hero.d={...base,hull:Math.round(base.hull*bonus.hull),
        armour:Math.round(base.armour*bonus.armour),
        damage:Math.round(base.damage*bonus.damage*100)/100};
      hero.health=hero.d.hull;hero.armour=hero.d.armour;
    }
    if(state.recordMode==='survival'&&state.survivalCarry){
      state.fliers[0].health=clamp(state.survivalCarry.health,1,state.fliers[0].d.hull);
      state.fliers[0].armour=clamp(state.survivalCarry.armour,0,state.fliers[0].d.armour);
    }
    if(state.mode==='challenge'&&state.challenge==='noarmour')state.fliers[0].armour=0;
    if(state.mode==='campaign'&&state.campaignEncounter){
      const enc=state.campaignEncounter;
      for(const [i,foe] of state.fliers.slice(1).entries())assignCampaignAI(foe,enc,i);
    }
    state.bullets=[];state.bombs=[];state.mines=[];state.sparks=[];
    state.trails=[];state.blasts=[];state.visualClock=0;
    state.wind=rollWind(state.mode,state.campaignEncounter?.rank||1);
    if(state.mode==='challenge'&&state.challenge==='crosswind')
      state.wind={active:true,base:state.round%2===0?-16:16,current:state.round%2===0?-16:16,elapsed:0};
    state.time=state.mode==='survival'?70:state.mode==='challenge'?CHALLENGES[state.challenge].time:state.mode==='campaign'?(state.campaignEncounter?.finalBoss?165:120):90;state.impactLock=0;state.phase='playing';state.paused=false;
    if(menuReturn)menuReturn.hidden=false;
    if(fullscreenButton)fullscreenButton.hidden=false;
    const callsign=state.campaignEncounter?.label?.match(/"([^"]+)"/)?.[1]||
      state.campaignEncounter?.label?.split(' ')[0]||'RIVAL';
    state.banner=state.mode==='challenge'?CHALLENGES[state.challenge].name+' — GO':
      state.recordMode==='survival'?'SURVIVAL WAVE '+state.round:
      state.campaignEncounter?.finalBoss?'FINAL SCRAMBLE — TWO ESCORTS':
      state.mode==='campaign'?(state.campaignEncounter?.mission||'RIVAL INTERCEPT')+' • '+callsign:
      state.wind.active?(state.wind.base>0?'CROSSWIND →':'← CROSSWIND'):'ROUND '+state.round;
    state.bannerTime=state.campaignEncounter?.finalBoss?4:1.5;
    controls.left=false;controls.right=false;controls.boost=false;
  }
  function startMatch(){
    audioUnlock();
    const others=Object.keys(PLANES).filter(t=>t!==state.selected);
    state.enemyType=others[Math.floor(Math.random()*others.length)];
    state.scores=[0,0];state.round=1;state.kills=0;state.survivalCarry=null;state.session=newSession();
    state.mode=document.getElementById('mode-select')?.value||'duel';
    state.participants=Number(document.getElementById('pilots-select')?.value||2);
    state.teams=state.participants===4&&document.getElementById('team-select')?.value==='teams';
    state.difficulty=document.getElementById('difficulty-select')?.value||'standard';
    state.arena=Number(document.getElementById('arena-select')?.value||0);
    state.recordMode=state.mode==='challenge'?'challenge':state.mode==='survival'?'survival':
      state.participants===4&&state.teams?'teams':state.participants>2?'triple':'duel';
    state.challenge=CHALLENGES[document.getElementById('challenge-select')?.value]?
      document.getElementById('challenge-select').value:'intercept';
    if(state.mode==='challenge'){
      state.difficulty=CHALLENGES[state.challenge].difficulty;
      const axis=['bf109','bf110','he111'].includes(state.selected);
      state.enemyType=state.challenge==='heavy'?(axis?'heavy':'bf110'):
        state.challenge==='intercept'?(axis?'fighter':'bf109'):state.enemyType;
    }
    ui.menu.classList.add('hidden');ui.result.classList.add('hidden');
    document.getElementById('bomb')?.setAttribute('hidden','');
    background=makeBackground();newRound();window.WingmanAudio?.startEngine();
  }
  function startCampaignFight(encounter,aircraft,airframe){
    if(!encounter||!Array.isArray(encounter.types)||!encounter.types.length)return;
    audioUnlock();
    state.selected=aircraft;
    state.campaignAirframe=airframe?.type===aircraft?airframe:null;
    state.enemyType=encounter.types[0];
    state.campaignEncounter=encounter;
    state.scores=[0,0];state.round=1;state.kills=0;
    state.mode='campaign';state.recordMode='campaign';state.participants=encounter.types.length+1;
    state.teams=encounter.types.length>1;
    state.difficulty=encounter.difficulty||'standard';
    state.arena=encounter.arena||0;
    ui.menu.classList.add('hidden');ui.result.classList.add('hidden');
    document.getElementById('bomb')?.setAttribute('hidden','');
    background=makeBackground();newRound();window.WingmanAudio?.startEngine();
  }
  window.WingmanGame={startCampaignFight,showMenu:()=>showMenu()};
  const menuReturn=document.getElementById('menu-return');
  menuReturn?.addEventListener('click',showMenu);
  const fullscreenButton=document.getElementById('fullscreen-toggle');
  fullscreenButton?.addEventListener('click',async()=>{
    const frame=document.getElementById('frame');
    try{if(document.fullscreenElement)await document.exitFullscreen();else if(frame.requestFullscreen)await frame.requestFullscreen();}catch{}
  });
  document.addEventListener('fullscreenchange',()=>{if(fullscreenButton){
    const full=!!document.fullscreenElement;
    fullscreenButton.textContent=full?'×':'⛶';
    fullscreenButton.setAttribute('aria-label',full?'Exit full screen':'Enter full screen');
    fullscreenButton.title=full?'Exit full screen':'Full screen';
  }});
  function showMenu(){
    window.WingmanAudio?.stopEngine();
    if(state.mode==='campaign')window.WingmanCareer?.cancelEncounter?.();
    state.campaignEncounter=null;state.campaignAirframe=null;
    state.phase='menu';state.paused=false;controls.left=false;controls.right=false;controls.boost=false;
    if(menuReturn)menuReturn.hidden=true;
    if(fullscreenButton)fullscreenButton.hidden=true;
    ui.result.classList.add('hidden');ui.menu.classList.remove('hidden');
    const actionReport=document.getElementById('arcade-after-action');
    if(actionReport)actionReport.innerHTML='';
    window.WingmanArcade?.render?.();
    window.WingmanFlow?.reset?.();
    document.getElementById('bomb')?.setAttribute('hidden','');
  }
  function endRound(winner){
    if(state.phase!=='playing')return;
    if(state.mode==='campaign'){
      window.WingmanAudio?.stopEngine();
      state.phase='result';sound('boom');
      const won=winner===0;
      sound(won?'victory':'defeat');
      ui.resultTitle.textContent=won?'SORTIE WON':'SHOT DOWN';
      ui.resultDetail.textContent=won?'Enemy pilots defeated.':'Your aircraft was lost.';
      ui.result.classList.remove('hidden');
      window.WingmanCareer?.finishEncounter?.(won,state.campaignEncounter);
      return;
    }
    const won=winner===0;
    if(won){state.scores[0]++;state.session.roundsWon++;}
    else state.scores[1]++;
    sound('boom');
    if(state.recordMode==='survival'&&won){
      const hero=state.fliers[0];
      const hull=hero.health+hero.d.hull*.14,armour=hero.armour+hero.d.armour*.24;
      state.survivalCarry={health:clamp(hull,1,hero.d.hull),armour:clamp(armour,0,hero.d.armour)};
      state.kills=state.session.roundsWon;
      state.phase='intermission';state.intermission=2.1;
      const others=Object.keys(PLANES).filter(t=>t!==state.selected);
      state.enemyType=others[state.round%others.length];
      state.banner='WAVE '+state.round+' SURVIVED';state.bannerTime=2.1;
      return;
    }
    if(state.recordMode==='duel'&&state.scores[0]<2&&state.scores[1]<2){
      state.phase='intermission';state.intermission=2.3;
      state.banner=won?'ROUND WON':'ROUND LOST';state.bannerTime=2.3;
      return;
    }
    state.phase='result';window.WingmanAudio?.stopEngine();sound(won?'victory':'defeat');
    ui.resultTitle.textContent=state.recordMode==='survival'?'SURVIVAL ENDED':
      state.recordMode==='challenge'?(won?'CHALLENGE COMPLETE':'MISSION FAILED'):
      won?'VICTORY!':'DEFEAT';
    ui.resultDetail.textContent=state.recordMode==='survival'?
      'Waves cleared: '+state.session.roundsWon+'. Best flying earns a place in your local records.':
      state.recordMode==='challenge'?CHALLENGES[state.challenge].description:
      state.recordMode==='teams'?(won?'Your squadron prevailed.':'Your squadron was defeated.'):
      state.recordMode==='triple'?(won?'Last ace flying.':'Another ace survived the melee.'):
      'Best-of-three score: '+state.scores[0]+'–'+state.scores[1]+'.';
    finishArcade(won);
    ui.result.classList.remove('hidden');
  }
  function battleOutcomeAfterDeath(p){
    if(state.phase!=='playing')return;
    if(state.mode==='campaign'){
      if(p.id===0)endRound(1);
      else if(!bossWaiting()&&opponents(state.fliers[0]).every(q=>!q.alive))endRound(0);
      return;
    }
    if(state.recordMode==='survival'){endRound(p.id===0?1:0);return;}
    if(state.teams){
      if(!state.fliers.some(q=>q.alive&&q.team===0))endRound(1);
      else if(!state.fliers.some(q=>q.alive&&q.team===1))endRound(0);
      return;
    }
    if(state.participants>2){
      if(p.id===0)endRound(1);
      else if(state.fliers.slice(1).every(q=>!q.alive))endRound(0);
      return;
    }
    endRound(p.id===0?1:0);
  }
  function triggerBurst(p){
    if(!p||!p.alive||p.gunCooldown>0||p.burstLeft>0||p.rollTime>0||state.phase!=='playing'||state.paused)return;
    p.burstLeft=p.d.burst;p.shotTimer=0;
  }
  function opponents(p){return state.fliers.filter(other=>other.alive&&other.id!==p.id&&(!(state.teams||state.mode==='campaign')||other.team!==p.team));}
  // Career-only tactical reserve. Call one wingman early (45 charge) or
  // save for two (100 charge). Either deployment lasts 30 seconds.
  // Exactly one call per sortie; charging happens with flying time and
  // successful hits. The player makes a meaningful timing decision.
  const SUPPORT_ONE=45,SUPPORT_TWO=100,SUPPORT_DURATION=30;
  function callSupport(){
    if(state.mode!=='campaign'||state.phase!=='playing'||state.paused||
      !state.fliers[0]?.alive||state.supportCharge<SUPPORT_ONE||
      state.supportTime>0||state.supportUses>=1)return false;
    const allied=['bf109','bf110','he111'].includes(state.selected)?
      ['bf109','bf110','he111']:['fighter','heavy','bomber'];
    const count=state.supportCharge>=SUPPORT_TWO?2:1,hero=state.fliers[0];
    state.supportCharge=0;state.supportTime=SUPPORT_DURATION;state.supportUses++;
    for(let i=0;i<count;i++){
      const type=allied[(allied.indexOf(state.selected)+i+1)%allied.length];
      const p=plane(type,100+state.supportUses*2+i,clamp(hero.x-(i+1)*29,20,W-20),
        clamp(hero.y+(i===0?-22:24),25,H-22),hero.angle);
      p.team=0;p.support=true;p.supportTime=SUPPORT_DURATION;p.spawnSafe=.8;
      p.aiSkillLevel=.42;p.aiName=i===0?'WINGMAN ONE':'WINGMAN TWO';
      state.fliers.push(p);
    }
    state.banner='ON MY SIX! — '+count+' WINGMAN'+(count===1?'':'S')+' · 30s';
    state.bannerTime=2.6;sound('special');return true;
  }
  function updateSupport(dt){
    if(state.mode!=='campaign')return;
    if(state.phase==='playing'&&state.supportUses===0)
      state.supportCharge=Math.min(SUPPORT_TWO,state.supportCharge+dt*1.65);
    if(state.supportTime>0){
      state.supportTime=Math.max(0,state.supportTime-dt);
      for(const p of state.fliers.filter(x=>x.support)){
        p.supportTime=state.supportTime;
        if(!state.supportTime){p.alive=false;p.departed=true;}
      }
      if(!state.supportTime)state.fliers=state.fliers.filter(x=>!x.support);
    }
    const btn=document.getElementById('call-support');
    if(btn){
      btn.hidden=false;
      btn.style?.setProperty?.('--support-charge',state.supportCharge+'%');
      const one=state.supportCharge>=SUPPORT_ONE;
      btn.textContent=state.supportTime>0?'WINGMEN '+Math.ceil(state.supportTime)+'s':
        state.supportUses>0?'SUPPORT USED':
        state.supportCharge>=SUPPORT_TWO?'CALL 2 WINGMEN · 30s':
        one?'CALL 1 · '+Math.floor(state.supportCharge)+'% / HOLD FOR 2':
        'WINGMEN '+Math.floor(state.supportCharge)+'% / 45%';
      btn.setAttribute('aria-label',state.supportTime>0?'Support planes active for '+Math.ceil(state.supportTime)+' seconds':
        state.supportUses>0?'Support already deployed this sortie':
        one?(state.supportCharge>=SUPPORT_TWO?'Call two wingmen for thirty seconds':'Call one wingman for thirty seconds, or wait for two'):
        'Support charging: '+Math.floor(state.supportCharge)+' percent, one plane at forty-five percent');
      btn.disabled=state.supportTime>0||state.supportUses>0||!one;
    }
  }
    function bossWaiting(){return state.mode==='campaign'&&!!state.campaignEncounter?.finalBoss&&state.fliers.some(p=>p.queued);}
  function summonFinalAce(dt){
    if(!bossWaiting())return;
    state.bossCountdown=Math.max(0,(state.bossCountdown||0)-dt);
    if(state.bossCountdown>0&&!state.fliers.some(p=>p.id>0&&p.id<3&&!p.alive))return;
    const boss=state.fliers.find(p=>p.queued);
    if(!boss)return;
    boss.queued=false;boss.alive=true;boss.health=boss.d.hull;boss.armour=boss.d.armour;
    boss.x=W*.85;boss.y=H*.38;boss.angle=Math.PI+.12;boss.speed=boss.d.speed*.8;
    boss.vx=Math.cos(boss.angle)*boss.speed;boss.vy=Math.sin(boss.angle)*boss.speed;
    boss.spawnSafe=2.5;boss.aiThink=0;
    state.bossReinforcementLaunched=true;
    state.banner='THE LEGEND ARRIVES — '+(boss.aiName?.match(/"([^"]+)"/)?.[1]||'FINAL ACE').toUpperCase();
    state.bannerTime=4;sound('boss');
  }
  function nearestEnemy(p){
    const targets=opponents(p);
    if(!state.teams||targets.length<2)return targets.sort((a,b)=>combatDistance(p,a)-combatDistance(p,b))[0];
    if(state.recordMode==='teams'){
      // 2v2 wingmen know friend from foe and cover different targets.
      // Neither enemy is hard-locked: after a casualty the surviving target
      // remains a legitimate opponent and the whole battle is still playable.
      const ally=state.fliers.find(q=>q.team===p.team&&q.id!==p.id&&q.alive);
      const human=state.fliers[0],ourWing=state.fliers[2];
      if(p.team===1){
        const assigned=(p.id===1?human:ourWing);
        if(assigned?.alive&&targets.includes(assigned))return assigned;
      }
      if(p.team===0&&ally){
        const threat=targets.slice().sort((a,b)=>combatDistance(a,ally)-combatDistance(b,ally))[0];
        if(threat&&combatDistance(threat,ally)<105)return threat;
      }
    }
    return targets.sort((a,b)=>combatDistance(p,a)-combatDistance(p,b))[0];
  }
  function triggerSpecial(p){
    if(!p||!p.alive||p.specialCooldown>0||state.phase!=='playing'||state.paused)return;
    if(p.role==='fighter'){
      p.specialCooldown=12;
      p.overdriveTime=2.8;
      emit(p.x,p.y,6,'#c4e4da',12);
    }else if(p.role==='heavy'){
      p.specialCooldown=20;
      p.armourTime=4;
      emit(p.x,p.y,6,'#a9dced',11);
    }else{
      // Three staggered releases from one activation. Bombs are distinct,
      // and a later explosion has diminishing damage on the same target.
      p.specialCooldown=20;
      p.bombQueue=3;p.bombInterval=0;
      emit(p.x,p.y,4,'#efd1a2',9);
    }
    sound('special');
  }
  function triggerBomb(p){if(p?.role==='bomber')triggerSpecial(p);}
  function releaseBomb(p){
    state.bombs.push({x:p.x+p.vx*.035,y:p.y+7,vx:p.vx*.58,vy:Math.max(8,p.vy*.16+10),
      owner:p.id,life:4,delay:0,run:p.bombRunId,age:0});
  }
  function shoot(p){
    // Straight, readable cannon and machine-gun bursts; no component targeting.
    const skill=pilotFactors(p),dx=Math.cos(p.angle),dy=Math.sin(p.angle);
    if(p.deadeyeTime>0)skill.gun*=1.09;
    if(p.id===0&&state.session)state.session.shots++;
    state.bullets.push({x:p.x+dx*(p.d.radius+2),y:p.y+dy*(p.d.radius+2),
      vx:dx*p.d.bulletSpeed*skill.gun+p.vx*.35,vy:dy*p.d.bulletSpeed*skill.gun+p.vy*.35,
      owner:p.id,damage:p.d.damage,life:p.d.gunLife,age:0});
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
  function hit(p,amount,x,y,zoneOverride,cause='GUN',owner=null){
    if(!p.alive||p.spawnSafe>0)return;
    if(state.mode==='campaign'&&owner===0&&p.team===1&&state.phase==='playing')
      state.supportCharge=Math.min(100,state.supportCharge+Math.min(amount,p.health+p.armour)*.24);
    let remaining=amount*(p.armourTime>0?.45:1)*(p.hardenTime>0?.6:1);
    const incoming=Math.min(remaining,Math.max(0,p.armour)+Math.max(0,p.health));
    if(p.id===0&&state.session)state.session.damageTaken+=incoming;
    const absorbed=Math.min(p.armour,remaining);
    p.armour-=absorbed;remaining-=absorbed;
    p.health=Math.max(0,p.health-remaining);
    p.hitFlash=.17;p.damageCause=cause;p.damageNotice=1.15;
    if(state.blasts.length<12)state.blasts.push({x,y,r:3,life:.19,max:.19,large:false});
    emit(x,y,7,'#ffe0a0',26);sound('hit');
    if(p.health<=0){
      p.alive=false;emit(p.x,p.y,28,'#ffc47e',75);emit(p.x,p.y,16,'#625765',35);
      if(state.blasts.length<12)state.blasts.push({x:p.x,y:p.y,r:p.d.radius+8,life:.65,max:.65,large:true});
      if(p.id!==0&&state.mode==='campaign'){
        state.banner='ENEMY DOWN — '+(p.aiName?.match(/"([^"]+)"/)?.[1]||'HOSTILE');
        state.bannerTime=1.9;
      }
      sound('boom');
      if(owner===0&&p.id!==0&&state.session)state.session.kills++;
      battleOutcomeAfterDeath(p);
    }
  }
  const PILOT_SKILL_NAMES={roll:'BARREL ROLL',reverse:'IMMELMANN TURN',smoke:'SMOKESCREEN',harden:'IRON HIDE',deadeye:'DEAD EYE',cut:'ENGINE CUT',dive:'POWER DIVE'};
  function triggerPilotSkill(p){
    if(!p||!p.alive||state.phase!=='playing'||state.paused)return false;
    const kind=p.pilotSkill||'roll';
    if(p.skillCooldown>0){
      if(p.id===0){p.skillFeedback='SKILL RECHARGING · '+Math.ceil(p.skillCooldown)+'s';p.skillFeedbackTime=.8;}
      return false;
    }
    const durations={reverse:16,roll:7,smoke:20,harden:22,deadeye:17,cut:15,dive:16};
    if(kind==='roll'){if(!triggerRoll(p))return false;}
    else if(kind==='reverse'){
      const right=Math.cos(p.angle)>=0,up=p.y>H*.5;
      p.swoop={kind:'reverse',startAngle:p.angle,direction:up?(right?-1:1):(right?1:-1),elapsed:0,duration:.43};
      p.swoopTime=.43;p.energy=Math.max(15,p.energy-8);
    }
    else if(kind==='smoke'){p.smokescreen=2.3;emit(p.x,p.y,14,'#b5c5c2',18);}
    else if(kind==='harden'){p.hardenTime=3;}
    else if(kind==='deadeye'){p.deadeyeTime=4;}
    else if(kind==='cut'){p.engineCutTime=1.4;p.speed*=.72;}
    else if(kind==='dive'){p.diveTime=.85;p.energy=Math.min(100,p.energy+12);}
    else return false;
    p.skillCooldown=durations[kind]||14;
    if(p.id===0){p.skillFeedback=PILOT_SKILL_NAMES[kind]||'PILOT SKILL';p.skillFeedbackTime=1.25;}
    sound('special');
    return true;
  }
  function triggerRoll(p){
    if(!p||!p.alive||state.phase!=='playing'||state.paused||p.rollTime>0||p.rollRecovery>0)return false;
    p.rollTime=p.role==='fighter'?.5:p.role==='heavy'?.48:.45;
    p.rollDuration=p.rollTime;
    p.rollRecovery=(p.id===0?.70:1.35)+(p.role==='bomber'?.35:0);
    return true;
  }
  function crossTopEdge(p){
    // Fly fully out above the playfield, then return on the opposite heading.
    // Reflect horizontal direction and descend into the playable area.
    if(p.y>=-p.d.radius)return false;
    // Re-enter from the same offscreen coordinate: never teleport to HUD.
    p.y=39+p.d.radius;
    p.angle=Math.atan2(Math.sin(Math.PI-p.angle),Math.cos(Math.PI-p.angle));
    const incoming=Math.max(p.speed,Math.hypot(p.vx,p.vy),p.d.speed*.65);
    p.vx=Math.cos(p.angle)*incoming;
    p.vy=Math.abs(Math.sin(p.angle)*incoming);
    // Avoid a near-horizontal re-entry that could retrigger ceiling contact.
    if(p.vy<incoming*.3){
      p.vy=incoming*.3;
      p.angle=Math.atan2(p.vy,p.vx);
    }
    p.turnVelocity=0;
    // Hold a descending course long enough to emerge visibly beneath the HUD.
    p.topRecovery=.65;
    p.climbLoad=0;p.flightRisk=0;p.stallTime=0;
    return true;
  }
  function steerPlane(p,steer,dt){
    if(p.swoop){
      const a=p.swoop;
      a.elapsed=Math.min(a.duration,a.elapsed+dt);
      const t=a.elapsed/a.duration, eased=t*t*(3-2*t);
      // A smooth half-circle turn with continuous position and finite speed.
      p.angle=a.startAngle+a.direction*Math.PI*eased;
      const follow=Math.min(1,dt*9);
      p.vx+=(Math.cos(p.angle)*p.speed-p.vx)*follow;
      p.vy+=(Math.sin(p.angle)*p.speed-p.vy)*follow;
      const oldY=p.y;
      p.x+=(p.vx+state.wind.current)*dt;p.y+=p.vy*dt;
      if(p.x<-p.d.radius)p.x+=W+2*p.d.radius;
      if(p.x>W+p.d.radius)p.x-=W+2*p.d.radius;
      crossTopEdge(p);
      // The manoeuvre should not bypass the normal ground hazard.
      if(p.y>=H-13){
        p.y=H-13;p.health=0;p.alive=false;
        p.damageCause='GROUND';emit(p.x,p.y,26,'#ffbb80',48);
        battleOutcomeAfterDeath(p);
      }
      // Reversals can consume existing climb reserve, never create altitude.
      p.climbLoad=Math.max(0,p.climbLoad-dt*25)+Math.max(0,oldY-p.y);
      p.swoopTime=Math.max(0,a.duration-a.elapsed);
      if(a.elapsed>=a.duration){
        p.swoop=null;p.turnVelocity=0;
        p.angle=Math.atan2(Math.sin(p.angle),Math.cos(p.angle));
        p.speed=Math.min(p.speed,p.d.speed*1.22);
        p.vx=Math.cos(p.angle)*p.speed;p.vy=Math.sin(p.angle)*p.speed;
      }
      return;
    }
    if(p.topRecovery>0){
      p.topRecovery=Math.max(0,p.topRecovery-dt);
      p.vy=Math.max(p.vy,p.d.speed*.42);
      p.y+=p.vy*dt;p.x+=(p.vx+state.wind.current)*dt;
      if(p.x<0)p.x+=W;else if(p.x>W)p.x-=W;
      return;
    }
    const skill=pilotFactors(p),engine=skill.engine,tail=1;
    const climb=Math.max(0,-Math.sin(p.angle));
    const dive=Math.max(0,Math.sin(p.angle));
    // A simple energy model: a sustained climb exchanges forward airspeed
    // for altitude; a dive converts height into kinetic energy. The engine
    // still slowly restores cruise speed when level. No separate boost key.
    p.energy=clamp(p.energy+dt*(24*dive-15*climb+4*(1-climb)),0,100);
    // Stall risk is based on altitude GAINED RAPIDLY, not the current
    // height or an arbitrary low energy threshold. A rolling climb reserve
    // naturally recovers when levelling out or diving.
    const threshold=p.role==='fighter'?69:p.role==='heavy'?62:58;
    p.flightRisk=clamp(((p.climbLoad||0)-threshold)/(threshold*.75),0,1);
    p.stallTime=p.flightRisk>.25?
      Math.min(.85,p.stallTime+dt*(.45+p.flightRisk)):
      Math.max(0,p.stallTime-dt*1.2);
    // A mild automatic nose drop is noticeable in a prolonged steep climb,
    // but normal steering remains responsive and diving recovers promptly.
    const dipHeading=Math.atan2(.25,Math.cos(p.angle)>=0?1:-1);
    const noseDrop=clamp(angleDiff(dipHeading,p.angle),-.8,.8)*p.flightRisk*1.5;
    const authority=.54+.46*tail;
    const magneticTurn=tailMagnet(p,steer);
    const desired=p.climbAssist>0
      ?clamp(angleDiff(Math.atan2(-43,Math.cos(p.angle)<0?-20:20),p.angle)*2,-p.d.turn,p.d.turn)
      :steer*p.d.turn*skill.turn*authority*(1-p.flightRisk*.34)*(p.type==='bf109'?(p.speed>p.d.speed*1.15?.91:p.speed<p.d.speed*.73?.86:1):1)+noseDrop+magneticTurn;
    p.turnVelocity+=(desired-p.turnVelocity)*Math.min(1,dt*(p.role==='bomber'?6:7.5));
    p.angle+=p.turnVelocity*dt;
    if(p.angle>Math.PI)p.angle-=TAU;
    if(p.angle< -Math.PI)p.angle+=TAU;
    const power=1-.15*clamp((.6-p.health/p.d.hull)/.6,0,1);
    // The Spitfire's Overdrive has 25% more power; the BF 109 stays unchanged.
    // Stronger, clearly felt Overdrive, still bounded by flight/energy limits.
    const boostGain=p.boosting?(p.type==='fighter'?1.46*SPITFIRE_BOOST_GAIN:1.40):1;
    const wanted=p.d.speed*engine*(p.engineCutTime>0?.42:1)*(p.diveTime>0?1.15:1)*power*(.87+.13*p.energy/100)*boostGain*(p.climbAssist>0?1.16:1)*(1-p.flightRisk*.28);
    // Airspeed gained in a dive carries through a level-out, then fades.
    const drag=p.role==='fighter'?1.08:p.role==='heavy'?.93:.79;
    const accel=p.role==='fighter'?1.10:p.role==='heavy'?.89:.72;
    const recovery=(1-climb*.70-dive*.55);
    const diveCoast=p.speed>p.d.speed*engine*1.05 && p.engineCutTime<=0 && !p.boosting ? (p.type==='bf109'?.39:.55) : 1;
    p.speed+=(wanted-p.speed)*Math.min(1,dt*(p.speed>wanted?drag*diveCoast:accel)*skill.accel*recovery);
    const exchange=p.type==='bf109'?1.14:p.role==='fighter'?1:p.role==='heavy'?.86:.76;
    p.speed+=dt*exchange*(DIVE_SPEED_GAIN*dive*dive-29*climb*climb);
    if(p.diveTime>0){p.speed+=dt*11;p.vy+=dt*36;}
    // Higher but bounded dive ceiling; proportional Overdrive headroom.
    const speedLimit=p.boosting?(p.type==='fighter'?1.68*SPITFIRE_BOOST_GAIN:1.78):DIVE_OVERSPEED_LIMIT;
    p.speed=clamp(p.speed,p.d.speed*.43,p.d.speed*engine*speedLimit);
    // The velocity vector gently follows the fuselage, rather than snapping.
    const follow=Math.min(1,dt*(p.role==='bomber'?3.2:p.role==='heavy'?4:5.1));
    p.vx+=(Math.cos(p.angle)*p.speed-p.vx)*follow;
    p.vy+=(Math.sin(p.angle)*p.speed-p.vy)*follow;
    // Airspeed exchange works with existing climb-load/stall handling.
    // The velocity vector still turns smoothly (no sudden arcade snap).
    if(p.flightRisk>0)p.vy+=dt*(5+15*p.flightRisk);
    const oldY=p.y;
    p.x+=(p.vx+state.wind.current)*dt;p.y+=p.vy*dt;
    // Fast, sustained ascents increase load. A dive drains it quickly.
    // This is a rolling-memory proxy and independent of absolute altitude.
    const altitudeGain=Math.max(0,oldY-p.y);
    const decay=p.vy>10?85:climb<.35?44:16;
    p.climbLoad=clamp(Math.max(0,(p.climbLoad||0)-dt*decay)+altitudeGain,0,180);
    if(p.x<-p.d.radius)p.x+=W+2*p.d.radius;
    else if(p.x>W+p.d.radius)p.x-=W+2*p.d.radius;
    crossTopEdge(p);
    if(p.y>=H-13){
      p.y=H-13;p.health=0;p.alive=false;
      p.damageCause='GROUND';emit(p.x,p.y,26,'#ffbb80',48);
      battleOutcomeAfterDeath(p);
    }
  }
  function tailMagnet(p,steer){
    // Player-only, tiny angular correction when truly tucked behind an enemy.
    // Never forces position, target swaps, or overrides active steering.
    p.tailAssist=0;
    if(p.id!==0||steer!==0||p.swoop||!p.alive)return 0;
    const enemy=nearestEnemy(p);
    if(!enemy||Math.abs(angleDiff(enemy.angle,p.angle))>.36)return 0;
    const dirX=Math.cos(enemy.angle),dirY=Math.sin(enemy.angle);
    const dx=wrappedDelta(p.x,enemy.x);
    const dy=enemy.y-p.y;
    const range=Math.hypot(dx,dy);
    if(range<17||range>82||dx*Math.cos(p.angle)+dy*Math.sin(p.angle)<10)return 0;
    // Opponent must be ahead of us, with us behind its tail.
    if(dx*dirX+dy*dirY<12)return 0;
    const lateral=Math.abs(-dirY*dx+dirX*dy);
    if(lateral>19)return 0;
    const tailDx=dx-dirX*enemy.d.radius*1.8,tailDy=dy-dirY*enemy.d.radius*1.8;
    const aim=Math.atan2(tailDy,tailDx);
    p.tailAssist=clamp(angleDiff(aim,p.angle)*.32,-.14,.14);
    return p.tailAssist;
  }
  // Tactical AI: state changes prevent indefinite tail-chasing and combat orbits.

  // Personality persists across the ladder. Increasing rank improves aim,
  // decisions and effective attributes without changing weapons or hull.
  const AI_STYLES=['hunter','duellist','guardian','trickster','sniper','interceptor','survivor','brawler'];
  function assignCampaignAI(p,encounter,offset=0){
    const rank=clamp(Number(encounter.rank)||1,1,8);
    const wing=encounter.opponents?.[offset]||(offset>0?encounter.wingman:null);
    const raw=wing||{id:encounter.id,name:encounter.label,plane:encounter.types?.[0]||p.type,
      attributes:encounter.attributes,signature:encounter.signature,
      archetype:encounter.archetype,personality:encounter.personality};
    const personality=window.WingmanPilotAI?.level(raw,rank);
    let hash=0;for(const ch of String(raw.id||raw.name||'rival'))hash=(hash*31+ch.charCodeAt(0))>>>0;
    p.aiIdentity=raw.id||encounter.id;
    p.aiName=raw.name||encounter.label;
    p.aiArchetype=personality?.archetype||raw.archetype||'Balanced';
    p.aiRank=rank;p.aiStyle=personality?.style||raw.personality||AI_STYLES[hash%AI_STYLES.length];
    p.aiPersonality=personality||null;
    p.aiSkillLevel=(rank-1)/7;p.aiMistake=0;
    p.attributes=pilotAttributes(personality?.attributes||raw.attributes||encounter.attributes);
    p.pilotSkill=personality?.signature||raw.signature||encounter.signature||'roll';
    p.aiThink=0;
  }
  function aiInput(p,target){
    p.aiThink=Math.max(0,p.aiThink-STEP);
    const rankAI=state.mode==='campaign'&&p.id>0;
    const talent=rankAI?(p.aiSkillLevel||0):state.recordMode==='survival'?
      clamp((state.difficulty==='ace'?.57:state.difficulty==='rookie'?.12:.34)+(state.round-1)*.065,0,1):
      state.difficulty==='ace'?1:state.difficulty==='rookie'?0:.55;
    const style=rankAI?p.aiStyle:'hunter';
    const range=combatDistance(p,target);
    const targetAngle=Math.atan2(target.y-p.y,wrappedDelta(p.x,target.x));
    if(target.smokescreen>0&&p.aiMode==='attack'&&Math.random()<.36)p.aiThink=Math.max(p.aiThink,.28);
    const enemyBehind=Math.abs(angleDiff(Math.atan2(p.y-target.y,wrappedDelta(target.x,p.x)),target.angle))<.65;
    // Begin pulling out BEFORE the impact point is reached. Account for
    // downward velocity, pitch, and the inertia of heavy aircraft.
    const diveSpeed=Math.max(0,p.vy);
    const projectedY=p.y+diveSpeed*(p.role==='bomber'?1.55:1.25)+
      Math.max(0,Math.sin(p.angle))*25;
    const floorDanger=projectedY>H-72&&p.y>H-145;
    if(floorDanger)p.aiRecoveryTime=1.1;
    else p.aiRecoveryTime=Math.max(0,(p.aiRecoveryTime||0)-STEP);
    if(p.vy< -8&&p.y<H-70)p.aiRecoveryTime=0;
    if(p.aiRecoveryTime>0){
      p.aiMode='recover';p.aiThink=0;
      p.aiBoost=false;
      // Never follow a target into the ground. The climb-out heading
      // is independent of the target's x-coordinate and screen wrap.
      const climbHeading=-Math.PI/2;
      const diff=angleDiff(climbHeading,p.angle);
      return Math.abs(diff)<.07?0:Math.sign(diff);
    }
    if(p.aiThink<=0){
      if(p.y<46) p.aiMode='recover';
      else if(target.burstLeft>0&&range<(rankAI?65+talent*52:95)) p.aiMode='evade';
      else if(enemyBehind&&range<(rankAI?54+talent*40:80)) p.aiMode='break';
      else if(p.gunCooldown>0&&range<110) p.aiMode='extend';
      else if(range>150) p.aiMode='intercept';
      else p.aiMode='attack';
      if(rankAI){
        if((style==='guardian'||style==='survivor')&&range<145&&
           (p.health<p.d.hull*(style==='guardian'?.76:.87)||p.armour<p.d.armour*.52))
          p.aiMode='extend';
        if(style==='trickster'&&enemyBehind&&range<115)p.aiMode='break';
        if(style==='interceptor'&&range>95&&p.y>H*.45)p.aiMode='intercept';
        if(style==='sniper'&&range<50&&target.burstLeft>0)p.aiMode='evade';
        if((style==='brawler'||style==='hunter')&&range<150&&target.gunCooldown>0)p.aiMode='attack';
      }
      if(rankAI&&talent<.58&&Math.random()<(1-talent)*.16)p.aiMistake=.3+(1-talent)*.35;
      const patience=rankAI?(p.aiPersonality?.patience??.55):.55;
      p.aiThink=rankAI?(.75-talent*.53+Math.random()*(.29-talent*.12))*(1.12-patience*.22):
        state.recordMode==='survival'?(.68-talent*.45)+Math.random()*.17:
        (state.difficulty==='rookie'?.68:state.difficulty==='ace'?.23:.35)+Math.random()*.22;
    }
    const solution=interceptPoint(p,target);
    // Rookies aim near present position; aces account for bullet travel time.
    // Neither receives homing bullets or forced steering.
    const lead=rankAI?.18+talent*.72:state.recordMode==='survival'?.20+talent*.7:
      state.difficulty==='rookie'?.20:state.difficulty==='ace'?.90:.55;
    const aimDx=solution.x-(p.x+wrappedDelta(p.x,target.x));
    let tx=target.x+aimDx*lead,ty=target.y+(solution.y-target.y)*lead;
    if(rankAI){
      if(style==='duellist'&&range<110)ty-=18;
      if(style==='hunter'&&range<125)tx+=target.vx*.13;
      if(style==='sniper'&&range>55){tx+=target.vx*.10;ty+=target.vy*.10;}
      if(style==='interceptor'&&range>80)ty=Math.min(ty,target.y-30);
      if(style==='trickster'&&p.aiMode==='break')ty+=p.y>H*.5?-28:28;
      if(style==='survivor'&&range<90&&p.gunCooldown>0)ty+=p.y>H*.55?-26:24;
      if(p.aiMistake>0){p.aiMistake=Math.max(0,p.aiMistake-STEP);ty+=25*(1-talent);}
    }

    if(p.aiMode==='recover'){tx=p.x+Math.cos(p.angle)*25;ty=H*.43;}
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
      tx=target.x+aimDx*lead;ty=target.y+(solution.y-target.y)*lead;
      if(p.energy<38)ty=Math.max(70,ty);
    }
    // The AI can spend limited boost to intercept or extend out of danger.
    p.aiBoost=false;
    // Bombers seek the high ground and track crossing opportunities.
    if(p.role==='bomber'&&p.aiMode!=='recover'){
      tx=target.x+target.vx*.3;
      ty=p.y>target.y-25?Math.max(43,target.y-48):Math.max(45,target.y-22);
      // A bomb run requires time to develop and a predicted firing solution.
      const dropHeight=target.y-p.y;
      const fallTime=clamp(Math.sqrt(Math.max(0,2*(dropHeight-7)/94)),.25,1.1);
      const releaseX=p.x+p.vx*.035;
      const projectedX=target.x+(target.vx-p.vx*.58)*fallTime;
      const aligned=Math.abs(wrappedDelta(releaseX,projectedX))<22;
      if(p.aiBombDelay<=0&&p.specialCooldown<=0&&target.spawnSafe<=0&&
         dropHeight>=32&&dropHeight<=112&&aligned&&range<155)
        triggerSpecial(p);
    }
    // Wingmen in the final mission make complementary attack passes. They
    // spread vertically instead of flying directly on top of each other.
    // This changes steering decisions, never aircraft damage or hitboxes.
    if(rankAI&&state.campaignEncounter?.finalBoss&&p.id<=2&&
       (p.aiMode==='intercept'||p.aiMode==='attack')){
      const wing=state.fliers.find(other=>other.id>0&&other.id!==p.id&&other.id<=2&&other.alive);
      const side=p.id===1?-1:1;
      if(wing&&combatDistance(p,wing)<85){
        ty+=side*(16+12*(p.aiSkillLevel||0));
        tx+=target.vx*(side<0?.16:-.14);
      }
    }
    // Never clamp x to screen edges: crossing the seam is a normal path.
    ty=clamp(ty,48,H-43);
    const facing=Math.abs(angleDiff(targetAngle,p.angle));
    if(p.role==='fighter'&&p.aiMode==='attack'&&range<65&&facing>1){tx=p.x+p.vx*.65;ty=clamp(p.y-35,45,H-30);}
    const wrapDx=wrappedDelta(p.x,tx);
    const goal=Math.atan2(ty-p.y,wrapDx);
    const error=angleDiff(goal,p.angle);
    const turn=Math.abs(error)<.085?0:Math.sign(error);
    const baseTolerance=rankAI?.11+talent*.14:state.recordMode==='survival'?.13+talent*.1:state.difficulty==='rookie'?.13:state.difficulty==='ace'?.22:.18;
    const tolerance=rankAI&&style==='sniper'?baseTolerance*.67:rankAI&&style==='brawler'?baseTolerance*1.12:baseTolerance;
    if(p.aiMode==='attack'&&range<(rankAI?115+talent*65:165)&&Math.abs(error)<tolerance&&
      target.spawnSafe<=0&&target.rollTime<=0&&p.gunCooldown<=0&&p.burstLeft===0&&
      (p.role!=='bomber'||range<72&&Math.random()<.16))triggerBurst(p);
    if(p.specialCooldown<=0){
      if(p.role==='heavy'&&range<100&&(p.armour<p.d.armour*.75||target.burstLeft>0||target.rearShots>0))triggerSpecial(p);
      if(p.role==='fighter'&&(p.aiMode==='intercept'||p.aiMode==='extend')&&range>75)triggerSpecial(p);
    }
    // Veteran enemies deliberately use their own pilot skill; rookies
    // largely rely on elementary manoeuvres and are slower to react.
    if(rankAI&&p.skillCooldown<=0&&talent>.19){
      const threatened=(p.aiMode==='evade'||p.aiMode==='break'||enemyBehind)&&range<(75+talent*45);
      const offensive=(p.aiMode==='attack'||p.aiMode==='intercept')&&range<(90+talent*30);
      if(threatened&&['roll','reverse','smoke','harden','cut','dive'].includes(p.pilotSkill))
        triggerPilotSkill(p);
      else if(offensive&&p.pilotSkill==='deadeye'&&facing<.35)
        triggerPilotSkill(p);
      else if(p.aiStyle==='interceptor'&&p.pilotSkill==='dive'&&
          p.aiMode==='intercept'&&p.y<target.y-25&&range<165)
        triggerPilotSkill(p);
      else if(p.aiStyle==='guardian'&&p.pilotSkill==='harden'&&
          (p.armour<p.d.armour*.6||p.health<p.d.hull*.75))
        triggerPilotSkill(p);
      else if(p.aiStyle==='trickster'&&p.pilotSkill==='smoke'&&enemyBehind&&range<155)
        triggerPilotSkill(p);
    }
    return turn;
  }
  function updatePlane(p,dt,steer,wantsBoost=false){
    if(!p.alive)return;
    p.spawnSafe=Math.max(0,p.spawnSafe-dt);
    p.hitFlash=Math.max(0,p.hitFlash-dt);p.muzzleFlash=Math.max(0,p.muzzleFlash-dt);
    p.damageNotice=Math.max(0,p.damageNotice-dt);
    p.specialCooldown=Math.max(0,p.specialCooldown-dt);
    p.aiBombDelay=Math.max(0,(p.aiBombDelay||0)-dt);
    p.turretFlash=Math.max(0,(p.turretFlash||0)-dt);
    for(const key of ['skillCooldown','smokescreen','hardenTime','deadeyeTime','engineCutTime','diveTime'])p[key]=Math.max(0,(p[key]||0)-dt);
    p.armourTime=Math.max(0,p.armourTime-dt);
    p.overdriveTime=Math.max(0,(p.overdriveTime||0)-dt);
    if(p.bombQueue>0){p.bombInterval-=dt;if(p.bombInterval<=0){releaseBomb(p);p.bombQueue--;p.bombInterval=.40;if(p.bombQueue===0)p.bombRunId++;}}
    p.climbAssist=Math.max(0,p.climbAssist-dt);
    p.bombCooldown=Math.max(0,p.bombCooldown-dt);
    p.rearCooldown=Math.max(0,p.rearCooldown-dt);
    if(p.role==='bomber'&&p.rearCooldown<=0&&p.rearShots===0){
      // Fighters have forward weapons; bombers have an independent rear
      // battery. A pilot sitting directly astern gets a sustained, physical
      // gun burst. Approaches from ahead or the flank remain safer.
      const threats=opponents(p).filter(q=>{
        if(q.spawnSafe>0||q.rollTime>0)return false;
        const dx=wrappedDelta(p.x,q.x),dy=q.y-p.y;
        const along=dx*Math.cos(p.angle)+dy*Math.sin(p.angle);
        const lateral=Math.abs(-dx*Math.sin(p.angle)+dy*Math.cos(p.angle));
        const range=Math.hypot(dx,dy);
        return along< -11&&range<135&&lateral<Math.min(55,range*.62);
      }).sort((a,b)=>combatDistance(p,a)-combatDistance(p,b));
      if(threats.length){
        p.rearShots=4;p.rearShotTime=0;p.rearTarget=threats[0].id;
        p.rearCooldown=2.70;
      }
    }
    if(p.role==='bomber'&&p.rearShots>0){
      p.rearShotTime-=dt;
      if(p.rearShotTime<=0){
        const target=state.fliers.find(q=>q.id===p.rearTarget&&q.alive);
        if(target){
          const dx=wrappedDelta(p.x,target.x),dy=target.y-p.y;
          const range=Math.hypot(dx,dy);
          const along=dx*Math.cos(p.angle)+dy*Math.sin(p.angle);
          const lateral=Math.abs(-dx*Math.sin(p.angle)+dy*Math.cos(p.angle));
          if(along< -9&&range<145&&lateral<Math.min(60,range*.67)){
            // Lead the target using relative airspeed and preserve real bullet
            // collisions. Four 4.5-damage rounds still deter a pursuer without dominating dogfights,
            // but never match the fighter's 10 x 11 primary gun damage.
            const speed=221;
            const lead=clamp(range/speed,.05,.78);
            const muzzleX=p.x-Math.cos(p.angle)*(p.d.radius+4);
            const muzzleY=p.y-Math.sin(p.angle)*(p.d.radius+4);
            const aim=Math.atan2(
              target.y-muzzleY+(target.vy-p.vy*.32)*lead,
              wrappedDelta(muzzleX,target.x)+(target.vx-p.vx*.32)*lead
            )+random(-.095,.095);
            state.bullets.push({
              x:muzzleX,y:muzzleY,
              vx:Math.cos(aim)*speed+p.vx*.32,
              vy:Math.sin(aim)*speed+p.vy*.32,
              owner:p.id,damage:4.5,life:1.0,age:0,rearGun:true
            });
            p.turretFlash=.12;
          }
        }
        p.rearShots--;p.rearShotTime=.073;
      }
    }
    p.evasiveTime=Math.max(0,(p.evasiveTime||0)-dt);
    p.boosting=!!(p.role==='fighter'&&p.overdriveTime>0&&!p.swoop);
    p.boostCharge=100;
    p.rollTime=Math.max(0,p.rollTime-dt);
    p.skillFeedbackTime=Math.max(0,(p.skillFeedbackTime||0)-dt);
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
    if((p.health<p.d.hull*.6)&&p.smokeTimer<=0){
      p.smokeTimer=p.health<p.d.hull*.3?.075:.2;
      const x=p.x-Math.cos(p.angle)*p.d.radius;
      const y=p.y-Math.sin(p.angle)*p.d.radius;
      emit(x,y,1,'#6d7480',6);
    }
  }
  function explosion(x,y,r,owner,damage,cause='BOMB'){
    emit(x,y,22,'#ffc47b',52);emit(x,y,9,'#6b707b',30);sound('boom');
    for(const p of state.fliers){
      if(!p.alive||p.id===owner||((state.teams||state.mode==='campaign')&&state.fliers[owner]?.team===p.team))continue;
      const d=Math.hypot(x-p.x,y-p.y);
      // Explosions must not masquerade as ramming damage when airframes touch.
      const source=state.fliers[owner];
      if(source&&distance(source,p)<source.d.radius+p.d.radius+5)continue;
      if(d<r+p.d.radius)hit(p,damage*(1-clamp(d/(r+p.d.radius),0,.75)),x,y,undefined,cause,owner);
    }
  }
  function projectiles(dt){
    for(let i=state.bullets.length-1;i>=0;i--){
      const b=state.bullets[i],px=b.x,py=b.y;
      b.x+=(b.vx+state.wind.current*.18)*dt;b.y+=b.vy*dt;b.life-=dt;b.age=(b.age||0)+dt;
      const shooter=state.fliers[b.owner];
      const targets=state.fliers.filter(p=>p.id!==b.owner&&p.alive&&(!(state.teams||state.mode==='campaign')||p.team!==shooter?.team));
      // Neither a gun muzzle nor a bomber can inflict disguised impact damage
      // by touching another airframe: rounds must leave the collision envelope.
      let struck=false;
      for(const target of targets){
        const clear=shooter&&combatDistance(target,shooter)>target.d.radius+shooter.d.radius+3;
        if(!clear||target.rollTime>0||target.evasiveTime>0||b.age<=.035)continue;
        const vx=b.x-px,vy=b.y-py,denom=vx*vx+vy*vy;
        // Extended fuselage and wing are independently hittable, without a
        // giant circular hit area around the bombers.
        const halfLength=target.role==='bomber'?10.8:target.role==='heavy'?9.3:7.8;
        const wingWidth=target.role==='bomber'?4.5:target.role==='heavy'?4.1:3.5;
        // Closest point AND collision geometry must use the same wrapped
        // target image; otherwise bullets miss on the frame they cross x=0.
        for(const shiftedX of [target.x-W,target.x,target.x+W]){
          const t=denom>0?clamp(((shiftedX-px)*vx+(target.y-py)*vy)/denom,0,1):0;
          const nx=px+t*vx,ny=py+t*vy;
          const rx=nx-shiftedX,ry=ny-target.y;
          const longitudinal=rx*Math.cos(target.angle)+ry*Math.sin(target.angle);
          const lateral=-rx*Math.sin(target.angle)+ry*Math.cos(target.angle);
          const hitBody=Math.abs(longitudinal)<=halfLength&&Math.abs(lateral)<=3.3;
          const hitWing=Math.abs(longitudinal)<=halfLength*.55&&Math.abs(lateral)<=wingWidth;
          if(hitBody||hitWing){
            if(b.owner===0&&state.session)state.session.hits++;
            hit(target,b.damage,nx,ny,undefined,'GUN',b.owner);struck=true;break;
          }
        }
        if(struck)break;
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
      b.vy+=94*dt;b.x+=(b.vx+state.wind.current*.4)*dt;b.y+=b.vy*dt;b.life-=dt;
      const target=state.fliers.find(p=>p.id!==b.owner&&p.alive&&(!state.teams||p.team!==state.fliers[b.owner]?.team)&&distance(b,p)<p.d.radius+4);
      if(b.y>=H-8||(b.age>.24&&target)){
        explosion(b.x,Math.min(b.y,H-8),27,b.owner,40);
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
    state.visualClock+=dt;
    if(state.phase==='intermission'){
      state.intermission-=dt;
      if(state.intermission<=0){state.round++;newRound();}
    }
    if(state.phase!=='playing'&&state.phase!=='intermission')return;
    state.bannerTime=Math.max(0,state.bannerTime-dt);
    if(state.phase==='playing'){
      updateWind(dt);
      updateSupport(dt);
      state.time-=dt;
      if(state.session)state.session.seconds+=dt;
      summonFinalAce(dt);
      if((state.mode==='survival'||state.mode==='challenge')&&state.time<=0){endRound(1);return;}
      const user=state.fliers[0];
      window.WingmanAudio?.flight(user?.speed||0,(user?.health||0)/(user?.d?.hull||1));
      if(user.alive)updatePlane(user,dt,(controls.right?1:0)-(controls.left?1:0),controls.boost);
      for(const p of state.fliers.slice(1)){
        if(p.alive){const target=nearestEnemy(p);const steer=target?aiInput(p,target):0;updatePlane(p,dt,steer,p.aiBoost);}
      }
      projectiles(dt);
      // Airframes may overlap without dealing damage. No ramming penalty.
      const enemies=state.fliers.slice(1);
      if(state.participants>2){
        if(state.teams){
          if(!state.fliers.some(q=>q.alive&&q.team===0))endRound(1);
          else if(!state.fliers.some(q=>q.alive&&q.team===1))endRound(0);
          else if(state.time<=0)endRound(1);
        }else{
          if(!user.alive)endRound(1);
          else if(enemies.every(p=>!p.alive))endRound(0);
          else if(state.time<=0)endRound(1);
        }
      }else if(state.time<=0){
        const enemy=enemies[0];
        const condition=p=>(p.health+p.armour)/(p.d.hull+p.d.armour);
        const a=condition(user),b=condition(enemy);
        endRound(Math.abs(a-b)<.025?-1:a>b?0:1);
      }
    }
    // Damage smoke is a persistent, airy trail rather than a handful of
    // unrelated particles. Bounded allocations and lifetimes suit phones.
    if(state.phase==='playing'){
      for(const p of state.fliers){
        if(!p.alive||p.health>=p.d.hull*.70)continue;
        p.trailClock=(p.trailClock||0)+dt;
        if(p.trailClock>=.075){
          p.trailClock=0;
          const dx=Math.cos(p.angle),dy=Math.sin(p.angle);
          state.trails.push({x:p.x-dx*(p.d.radius+2),y:p.y-dy*(p.d.radius+2),
            vx:-p.vx*.10,vy:-3,age:0,life:p.health<p.d.hull*.3?1.4:1.0,
            heavy:p.health<p.d.hull*.35});
        }
      }
      for(const p of state.fliers){
        if(!p.alive||!p.boosting||p.role!=='fighter')continue;
        p.contrailClock=(p.contrailClock||0)+dt;
        if(p.contrailClock>.07){
          p.contrailClock=0;
          state.trails.push({x:p.x-Math.cos(p.angle)*(p.d.radius+3),
           y:p.y-Math.sin(p.angle)*(p.d.radius+3),vx:-p.vx*.065,vy:-p.vy*.065,
           age:0,life:.42,heavy:false,contrail:true});
        }
      }
      if(state.trails.length>100)state.trails.splice(0,state.trails.length-100);
    }
    for(let i=state.trails.length-1;i>=0;i--){
      const t=state.trails[i];t.age+=dt;t.x+=(t.vx+(state.wind?.current||0)*.1)*dt;
      t.y+=(t.vy-.75)*dt;
      if(t.age>=t.life)state.trails.splice(i,1);
    }
    for(let i=state.blasts.length-1;i>=0;i--){
      state.blasts[i].life-=dt;
      if(state.blasts[i].life<=0)state.blasts.splice(i,1);
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
    // Four distinct 1940s aviation-theatre landscapes, pre-rendered once.
    // No mountains or medieval castles transplanted into desert/coast scenes.
    const c=document.createElement('canvas');
    c.width=Math.round(W*renderScale);c.height=Math.round(H*renderScale);
    const ctx=c.getContext('2d');
    ctx.setTransform(c.width/W,0,0,c.height/H,0,0);
    ctx.imageSmoothingEnabled=renderScale>1;
    // Phase 8 scenery is generated once on this pre-rendered canvas, not in
    // the frame loop. Retain the old painted arena as an offline fallback.
    if(window.WingmanScenery?.paint){
      window.WingmanScenery.paint(ctx,W,H,state.arena);
      return c;
    }
    const scene=ARENAS[state.arena]||'ALPINE';
    const palettes={
      ALPINE:['#789eb6','#9bb9c9','#b8cbd1','#748c99','#596c74','#334c52'],
      COAST:['#8bb5c5','#a4c9d0','#c3d6d0','#6c9fac','#5e8692','#324d57'],
      DESERT:['#8eaeb9','#adc5c4','#d5d0ba','#c0ab80','#9e845c','#645747'],
      STORM:['#4d6376','#667b8a','#8a9799','#6a7b77','#46595b','#293f48']
    };
    const p=palettes[scene];
    let seed=1918+state.arena*733;
    const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
    function shape(points,color){poly(ctx,points,color);}
    function line(x,y,x2,y2,color,width=1){
      ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();
    }
    function ellipse(x,y,rx,ry,color){
      ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
    }
    rect(0,0,W,H,p[0]);
    for(let i=0;i<8;i++)rect(0,28+i*21,W,22,p[i<2?0:i<4?1:2]);
    // Soft sky strata and cloud wisps. Kept subtle so aircraft stay readable.
    for(let i=0;i<5;i++){
      const x=((W*.13+i*W*.21)%(W+45))-20,y=64+i%3*20;
      ellipse(x,y,24+(i%3)*10,4.7,scene==='STORM'?'#8a999d70':'#e2e5db66');
      ellipse(x+16,y-5,21,4,scene==='STORM'?'#9da8a477':'#ecede277');
      line(x-20,y+5,x+33,y+5,scene==='STORM'?'#73868b70':'#b2cbd077',1.4);
    }
    // Terrain must correspond to its arena, not be the same mountain tinted differently.
    if(scene==='ALPINE'){
      for(let x=-95,i=0;x<W+115;x+=98,i++){
        const tip=140+(i%3)*13;
        shape([[x,210],[x+59,tip],[x+118,212]],'#91a2ad');
        shape([[x+59,tip],[x+118,212],[x+78,207]],'#607b8b');
        shape([[x+59,tip],[x+46,tip+23],[x+56,tip+16],[x+62,tip+31],[x+70,tip+24]],'#e8e7de');
      }
      shape([[0,211],[W*.24,196],[W*.41,211],[W*.67,191],[W,213],[W,H],[0,H]],'#687e7d');
      shape([[0,226],[W*.25,217],[W*.55,229],[W*.78,213],[W,226],[W,H],[0,H]],'#465f63');
      // Remote alpine wartime landing strip, wind marker and concrete flak emplacement.
      rect(W*.25,223,W*.48,2,'#bac2b7');
      rect(W*.25,226,W*.48,3,'#637879');
      for(let i=0;i<7;i++)rect(W*.28+i*W*.065,226,8,1,'#c8c6b5');
      hangar(W*.08,214,30);hangar(W*.79,210,38);
      flak(W*.63,218);
      flag(W*.18,212);
    }else if(scene==='COAST'){
      rect(0,192,W,H-192,'#6f9dab');
      rect(0,209,W,H-209,'#547d92');
      for(let i=0;i<25;i++){const x=rnd()*W,y=197+rnd()*40;line(x,y,x+6+rnd()*16,y,'#bbd2ce6b',.6);}
      // White chalk cliffs and grassy headland beyond an English Channel convoy.
      shape([[0,181],[W*.07,177],[W*.17,180],[W*.22,209],[W*.18,231],[0,224]],'#e1ddd1');
      shape([[0,174],[W*.12,171],[W*.19,187],[W*.13,188],[0,185]],'#6d8875');
      shape([[W*.81,209],[W*.87,185],[W*.95,181],[W,178],[W,242],[W*.79,227]],'#d7d7c6');
      shape([[W*.87,183],[W*.94,176],[W,179],[W,190]],'#7e9280');
      radar(W*.13,172,24);
      ship(W*.37,204,55);ship(W*.65,209,40);
      balloon(W*.50,124,191);balloon(W*.77,138,195);
    }else if(scene==='DESERT'){
      shape([[0,182],[W*.14,172],[W*.31,185],[W*.5,169],[W*.69,189],[W,178],[W,H],[0,H]],'#d5be94');
      shape([[0,210],[W*.2,195],[W*.38,213],[W*.62,196],[W*.83,209],[W,199],[W,H],[0,H]],'#bba077');
      shape([[0,232],[W*.15,219],[W*.41,232],[W*.7,215],[W,229],[W,H],[0,H]],'#947f63');
      for(let i=0;i<75;i++){const x=rnd()*W,y=194+rnd()*50;rect(x,y,rnd()*5+1,.6,rnd()>.5?'#d9c394':'#84755a');}
      // RAF desert forward strip: canvas hangars, supply trucks, radio mast.
      rect(W*.21,216,W*.55,3,'#d5c7a7');
      tent(W*.15,212,28);tent(W*.76,209,35);
      truck(W*.43,217);truck(W*.59,220);
      flak(W*.9,208);radar(W*.06,197,15);
    }else{
      // The wartime British home front in poor weather: fields, radar,
      // hangars and barrage balloons under a darkening sky.
      shape([[0,199],[W*.2,185],[W*.42,196],[W*.64,188],[W,202],[W,H],[0,H]],'#667d78');
      shape([[0,217],[W*.15,209],[W*.35,222],[W*.57,202],[W*.83,218],[W,207],[W,H],[0,H]],'#40595a');
      for(let i=0;i<32;i++){
        const x=i*W/32,y=207+(i*13)%9;
        rect(x,y,7,10+(i*7)%12,'#334850');
        if(i%3===0)rect(x+2,y+4,1,2,'#d4ac77');
      }
      hangar(W*.11,212,44);hangar(W*.69,209,55);
      radar(W*.32,190,32);radar(W*.52,194,28);
      balloon(W*.20,119,201);balloon(W*.82,128,196);
      for(let i=0;i<18;i++){const x=rnd()*W,y=92+rnd()*115;line(x,y,x+3,y+10,'#aebdc05a',.7);}
    }
    // Fixed distant speckle adds texture without expensive per-frame noise.
    for(let i=0;i<120;i++){
      const x=rnd()*W,y=192+rnd()*57;
      rect(x,y,.8+rnd()*1.6,.7,rnd()>.5?'#d8d1bf3c':'#293f493d');
    }
    return c;
    function hangar(x,y,w){
      rect(x,y-11,w,11,'#596e72');
      shape([[x-3,y-11],[x+w*.23,y-21],[x+w*.8,y-21],[x+w+3,y-11]],'#9d9c93');
      rect(x+w*.28,y-8,w*.46,8,'#314b51');
      line(x+1,y-11,x+w-1,y-11,'#d5d1c1');
    }
    function radar(x,y,h){
      rect(x-1,y-h,3,h,'#5b7379');line(x-7,y-h,x+8,y-h,'#d8d5c9',1.3);
      line(x-7,y-h,x-5,y-h-9,'#c8cfc9');line(x+8,y-h,x+6,y-h-9,'#c8cfc9');
      line(x-5,y-h-9,x+6,y-h-9,'#d6d7ca');
      line(x-1,y-h+2,x-9,y,'#8b9e9f');line(x+2,y-h+2,x+9,y,'#80969a');
      rect(x-4,y-2,9,4,'#617d7a');
    }
    function ship(x,y,w){
      shape([[x,y],[x+w,y],[x+w-9,y+7],[x+11,y+7]],'#344f61');
      rect(x+w*.35,y-10,w*.25,10,'#61757d');
      rect(x+w*.5,y-16,2,16,'#3e5860');
      rect(x+w*.15,y-7,w*.15,7,'#526975');
      line(x+3,y+8,x+w-5,y+8,'#afc4c2',.8);
    }
    function balloon(x,y,anchorY){
      ellipse(x,y,13,5.4,'#a8b7ad');
      ellipse(x-3,y-1,7.6,2.5,'#d6d5c6');
      shape([[x+12,y-2],[x+18,y-6],[x+16,y+5]],'#9baaa5');
      line(x,y+5,x+2,anchorY,'#819399b8',.7);
    }
    function tent(x,y,w){
      shape([[x,y],[x+w*.46,y-17],[x+w,y]],'#e2d3ae');
      shape([[x+w*.46,y-17],[x+w,y],[x+w*.53,y]],'#a79877');
      line(x,y,x+w,y,'#77694e');
    }
    function truck(x,y){
      rect(x,y-8,19,8,'#5d6656');rect(x+15,y-12,9,12,'#6d745d');
      ellipse(x+5,y,3,3,'#293d45');ellipse(x+20,y,3,3,'#293d45');
      rect(x+19,y-10,3,3,'#9ba6a1');
    }
    function flak(x,y){
      rect(x-8,y-3,20,4,'#516260');
      rect(x,y-10,4,8,'#414f54');
      line(x+1,y-9,x+18,y-16,'#37474d',2.2);
    }
    function flag(x,y){
      line(x,y-21,x,y,'#c0b6a4');shape([[x,y-20],[x+13,y-18],[x,y-15]],'#af7771');
    }
  }
  let background=makeBackground();
  // Small, readable aircraft silhouettes. Their proportions are deliberately
  // more plausible than cartoon rockets, but every colour remains pixel art.
  // Aircraft are drawn at native display resolution independently of scenery.
  function aircraft(p){
    const c=modelCtx;
    c.save();c.translate(p.x,p.y);c.rotate(p.angle);
    if(p.rollTime>0){
      // Full visible roll, without changing the hitbox or the duration of evasion.
      const progress=1-p.rollTime/(p.rollDuration||.5);
      c.scale(1,Math.cos(progress*TAU));
      c.strokeStyle='#dcece0b3';c.lineWidth=.65;
      c.beginPath();c.ellipse(0,0,p.d.radius+3,4,0,0,TAU);c.stroke();
    }
    if(p.armourTime>0){
      c.beginPath();c.ellipse(0,0,10,8,0,0,TAU);
      c.strokeStyle='#b1ecf5c9';c.lineWidth=.75;c.stroke();
    }
    // Aircraft now read at phone resolution without altering hitboxes or
    // physics. Larger bombers communicate their imposing defensive role.
    c.scale(p.role==='bomber'?.69:p.role==='heavy'?.64:.61,
            p.role==='bomber'?.69:p.role==='heavy'?.64:.61);
    aircraftArt?.draw(c,p.type,p.health<p.d.hull*.38?'damaged':p.health<p.d.hull*.70?'worn':'level');
    if(p.boosting){
      // Cool air streaks, not a jet flame: WWII engines don't have afterburners.
      c.strokeStyle='#d7eff6a0';c.lineWidth=.65;
      for(let i=-1;i<=1;i++){
        c.beginPath();
        c.moveTo(-17,i*5);c.lineTo(-25-i*2,i*5-1);
        c.stroke();
      }
    }
    if(p.muzzleFlash>0){
      c.fillStyle='#fff4ad';
      c.beginPath();c.moveTo(12,-2.5);c.lineTo(23,0);c.lineTo(12,2.5);c.fill();
    }
    if(p.turretFlash>0){
      c.fillStyle='#ffc976';
      c.beginPath();c.moveTo(-14,-2.3);c.lineTo(-23,0);c.lineTo(-14,2.3);c.fill();
    }
    if(p.hitFlash>0){
      c.beginPath();c.ellipse(0,0,8,5,0,0,TAU);
      c.strokeStyle='#fff0bd';c.lineWidth=.8;c.stroke();
    }
    c.restore();
    c.fillStyle='#1e3341d9';c.fillRect(p.x-7,p.y-14,14,5.5);
    c.font='bold 5px sans-serif';c.textAlign='center';c.textBaseline='top';
    c.fillStyle=p.id===0?'#ffe7b4':p.team===0?'#a6d5fa':p.id===1?'#ffc2b8':'#ffc989';
    const call=p.aiName?.match(/"([^"]+)"/)?.[1]||'';
    c.fillText(p.id===0?'P1':state.mode==='campaign'?(p.id===3&&state.campaignEncounter?.finalBoss?'ACE':call.slice(0,9)||'AI'+p.id):'AI'+p.id,p.x,p.y-13.6);
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
    // Minimal cinema-frame combat overlay, not a dashboard: the aircraft and sky
    // own the screen. Vital data appears as small edge markings and typography.
    const p=state.fliers[0],e=state.fliers.find(f=>f.id>0&&f.alive)||state.fliers[1],cx=W*.5;
    const skillButton=document.getElementById('roll');
    if(skillButton&&p){
      const kind=PILOT_SKILL_NAMES[p.pilotSkill]||'BARREL ROLL';
      const short={roll:'ROLL',reverse:'REVERSE',smoke:'SMOKE',harden:'HARDEN',deadeye:'DEADEYE',cut:'ENGINE CUT',dive:'DIVE'}[p.pilotSkill]||'ROLL';
      const cool=Math.max(0,p.skillCooldown||0);
      const label=cool>0?short+' '+Math.ceil(cool)+'s':short;
      if(skillButton.textContent!==label)skillButton.textContent=label;
      skillButton.setAttribute('aria-label',kind+(cool>0?' recharging, '+Math.ceil(cool)+' seconds':' ready'));
      skillButton.classList.toggle('on-cooldown',cool>0);
      skillButton.classList.toggle('skill-active',!!(p.rollTime>0||p.swoop||p.smokescreen>0||p.hardenTime>0||p.deadeyeTime>0||p.engineCutTime>0||p.diveTime>0));
    }
    const names={fighter:'SPITFIRE',heavy:'BEAUFIGHTER',bomber:'LANCASTER',
      bf109:'EMIL (BF 109)',bf110:'ZERSTÖRER',he111:'HEINKEL HE 111'};
    const short=q=>names[q?.type]||'AIRCRAFT';
    const craftClass=q=>q?.role==='heavy'?'HEAVY FIGHTER':
      q?.role==='bomber'?(q?.type==='he111'?'MEDIUM BOMBER':'HEAVY BOMBER'):'FIGHTER';
    const white='#f0e6ce',gold='#e2bf82',dim='#b9b8a9';
    g.save();g.textBaseline='middle';g.lineCap='round';
    // A gently shaded cinema matte occupies just 23 logical pixels,
    // rather than three bulky top-mounted information cards.
    const shade=g.createLinearGradient(0,0,0,32);
    shade.addColorStop(0,'#08151de8');shade.addColorStop(.75,'#0b1d24a0');
    shade.addColorStop(1,'#10232a00');
    g.fillStyle=shade;g.fillRect(0,0,W,32);
    g.strokeStyle='#ddc39670';g.lineWidth=.55;
    g.beginPath();g.moveTo(0,1);g.lineTo(W,1);g.stroke();
    function identification(q,right){
      const x=right?W-9:9;
      g.textAlign=right?'right':'left';
      g.fillStyle=right?'#e9b09c':gold;g.font='bold 5.3px monospace';
      const campaignPilot=(!right&&state.mode==='campaign')?readPilotName():'';
      const enemyName=(right&&state.mode==='campaign')?String(q?.aiName||''):'';
      const callSign=enemyName.match(/"([^"]+)"/)?.[1]||enemyName.split(' ')[0]||'';
      g.fillText((right?'HOSTILE • ':'YOU • ')+craftClass(q)+
        (campaignPilot?' • '+campaignPilot:'')+(callSign?' • '+callSign+' R'+q.aiRank:''),x,6,Math.min(W*.32,143));
      g.fillStyle=white;g.font='bold 10px Georgia,serif';
      g.fillText(short(q),x,17,Math.min(W*.32,143));
      const width=Math.min(W*.24,105),start=right?x-width:x;
      const health=Math.max(0,(q?.health||0)/(q?.d.hull||1));
      const armour=Math.max(0,(q?.armour||0)/(q?.d.armour||1));
      // Fine calibration marks and segmented gauges replace solid panels.
      g.fillStyle='#e8e4d334';g.fillRect(start,24,width,2.2);
      g.fillStyle=right?'#e19580':'#bcd6ab';
      g.fillRect(start,24,width*clamp(health,0,1),2.2);
      g.fillStyle='#a3c3c9';g.fillRect(start,28,width*clamp(armour,0,1),1);
      for(let i=1;i<10;i++){
        const xx=start+width*i/10;
        g.fillStyle='#14252bbd';g.fillRect(xx,24,.55,2.2);
      }
    }
    identification(p,false);identification(e,true);
    // Score painted as unobtrusive typographic overlay.
    const score=state.mode==='campaign'&&state.campaignEncounter?.finalBoss?
      'FINAL • '+(state.bossReinforcementLaunched?'1 v 3':'ESCORTS'):
      state.recordMode==='survival'?'WAVE '+state.round:
      state.recordMode==='challenge'?CHALLENGES[state.challenge].name:
      state.recordMode==='teams'?'SQUADRON '+state.fliers.filter(q=>q.alive&&q.team===0).length+' v '+state.fliers.filter(q=>q.alive&&q.team===1).length:
      state.recordMode==='triple'?'FREE FOR ALL':
      state.mode==='campaign'&&state.participants===3?'1 v 2':
      state.participants>2?(state.teams?'2 v 2':state.participants+' ACES'):
      state.scores[0]+' : '+state.scores[1];
    g.textAlign='center';g.fillStyle=gold;g.font='bold 5.4px monospace';
    g.fillText('W I N G M A N',cx,6);
    g.fillStyle=white;g.font='bold 12px Georgia,serif';
    g.fillText(score,cx,17,Math.max(52,W*.20));
    g.fillStyle='#d4c4a6';g.font='bold 5.8px monospace';
    g.fillText(Math.max(0,Math.ceil(state.time))+'s  /  '+(ARENAS[state.arena]||'ALPINE'),cx,27);
    if(p?.skillFeedbackTime>0){
      g.save();g.textAlign='center';g.font='bold 7px monospace';
      g.fillStyle=p.skillFeedback.includes('RECHARGING')?'#e0b4a6':'#f7e1aa';
      g.fillText(p.skillFeedback,cx,51,Math.min(W*.47,180));g.restore();
    }
    if(state.recordMode==='survival'){
      g.fillStyle='#dbe7a4';g.font='bold 6px monospace';
      g.fillText('CLEARED '+(state.session?.roundsWon||0)+'  ·  DAMAGE CARRIES',cx,35);
    }else if(state.recordMode==='teams'&&!state.fliers[0]?.alive&&state.fliers[2]?.alive){
      g.fillStyle='#e9c89e';g.font='bold 6px monospace';
      g.fillText('WINGMAN STILL FIGHTING',cx,35);
    }
    if(bossWaiting()){
      const remain=Math.ceil(state.bossCountdown||0);
      g.fillStyle='#f4c793';g.font='bold 6.6px monospace';
      g.fillText('FINAL ACE INBOUND • '+remain+'s',cx,36);
    }else if(state.mode==='campaign'&&state.campaignEncounter?.finalBoss){
      g.fillStyle='#f3c49b';g.font='bold 6.6px monospace';
      g.fillText('FINAL ACE ENGAGED',cx,36);
    }
    // A narrow, unboxed airspeed scale sits centrally near the ground.
    // It stays clear of the thumb controls at either side.
    if(p){
      const base=p.d.speed||82,limit=base*(p.type==='fighter'?1.9:1.6);
      const sx=cx-31,sy=H-12,progress=clamp(p.speed/limit,0,1);
      g.fillStyle='#0c1925a8';g.fillRect(sx-4,sy-13,70,22);
      g.textAlign='left';g.fillStyle='#eee1c8';g.font='bold 7px monospace';
      g.fillText('IAS '+Math.round(p.speed),sx,sy-7);
      g.fillStyle='#a5b6b45c';g.fillRect(sx,sy,62,1.8);
      g.fillStyle=progress>.75?'#f1bc83':'#b2d0bd';g.fillRect(sx,sy,62*progress,1.8);
    }
    if(state.wind?.active){
      g.textAlign='center';g.font='bold 6px monospace';g.fillStyle='#ffe0ae';
      g.fillText((state.wind.current>0?'CROSSWIND → ':'← CROSSWIND ')+Math.round(Math.abs(state.wind.current)),cx,42);
    }
    if(p&&e?.role==='bomber'&&e.alive){
      const dx=wrappedDelta(e.x,p.x),dy=p.y-e.y;
      const along=dx*Math.cos(e.angle)+dy*Math.sin(e.angle);
      const lateral=Math.abs(-dx*Math.sin(e.angle)+dy*Math.cos(e.angle));
      if(along< -11&&Math.hypot(dx,dy)<155&&lateral<65){
        g.fillStyle='#ffb49b';g.font='bold 8px monospace';g.textAlign='center';
        g.fillText('⚠ TAIL GUNS',cx,58);
      }
    }
    g.restore();
  }
  function damageDiagram(){
    const p=state.fliers[0];if(!p)return;
    const c=modelCtx,x=W-78,y=82;
    c.save();c.fillStyle='#152b3de0';c.fillRect(x,y,71,31);
    c.strokeStyle='#7d9cac';c.lineWidth=.6;c.strokeRect(x,y,71,31);
    c.font='bold 6px monospace';c.fillStyle='#a9d8ed';c.fillText('ARMOUR',x+5,y+3);
    c.fillStyle='#223c4d';c.fillRect(x+5,y+13,60,4);
    c.fillStyle='#7cc3e7';c.fillRect(x+5,y+13,60*clamp(p.armour/p.d.armour,0,1),4);
    c.fillStyle='#e1eabf';c.fillText('HULL',x+5,y+19);
    c.fillStyle='#223c4d';c.fillRect(x+27,y+22,38,4);
    c.fillStyle='#91c994';c.fillRect(x+27,y+22,38*clamp(p.health/p.d.hull,0,1),4);
    c.restore();
  }
  function draw(){
    g.drawImage(background,0,0,W,H);
    if(window.WingmanScenery?.weather)
      window.WingmanScenery.weather(g,W,H,state.arena,state.visualClock,state.wind);
    drawWind();
    for(const t of state.trails){
      const fade=1-t.age/t.life;
      g.globalAlpha=fade*(t.contrail?.39:.26);
      g.fillStyle=t.contrail?'#d8ece1':t.heavy?'#242e34':'#53616a';
      g.beginPath();g.ellipse(t.x,t.y,t.contrail?.9+t.age*1.7:1.3+t.age*2.8,t.contrail?.45+t.age*.9:1+t.age*1.7,0,0,TAU);g.fill();
    }
    g.globalAlpha=1;
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
      g.strokeStyle=b.rearGun?'#ffc778':heavy?'#ffd093':'#fff1b0';g.lineWidth=b.rearGun?1.6:heavy?2:1;
      g.beginPath();g.moveTo(b.x,b.y);
      g.lineTo(b.x-b.vx*.042,b.y-b.vy*.042);g.stroke();
      g.fillStyle=heavy?'#653e33':'#574c43';g.fillRect(Math.round(b.x)-1,Math.round(b.y)-1,heavy?5:3,heavy?3:2);
      g.fillStyle=b.rearGun?'#ffbd65':heavy?'#ffd19b':'#fff1ac';g.fillRect(Math.round(b.x),Math.round(b.y),heavy?4:2,1);
    }
    // Brief layered flashes and expanding shockwaves make confirmed hits
    // immediately legible, without shake that would destabilise touch input.
    for(const blast of state.blasts){
      const progress=1-blast.life/blast.max;
      g.globalAlpha=(1-progress)*(blast.large?.82:.48);
      g.fillStyle=blast.large?'#ffd18a':'#ffe5b8';
      g.beginPath();g.arc(blast.x,blast.y,Math.max(1,blast.r*(.30+progress*.75)),0,TAU);g.fill();
      g.globalAlpha=(1-progress)*(blast.large?.75:.65);
      g.strokeStyle=blast.large?'#fff1c2':'#ffcd80';
      g.lineWidth=blast.large?1.5:.8;
      g.beginPath();g.arc(blast.x,blast.y,Math.max(1,blast.r*(.4+progress*1.8)),0,TAU);g.stroke();
    }
    g.globalAlpha=1;
    drawModels();
    for(const p of state.sparks){
      g.globalAlpha=clamp(p.life/p.max,.2,1);
      g.fillStyle=p.color;g.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);
    }
    g.globalAlpha=1;
    // Text and meters are rendered only once, at native device resolution.
    // Removing the stretched low-resolution duplicate eliminates fuzzy glyph halos.
    // Draw the entire HUD a second time on the high-DPI overlay, preserving
    // sharp glyphs instead of stretching the logical 250px canvas.
    const lowRes=g;g=modelCtx;
    try{drawHud();}finally{g=lowRes;}
    // Arcade HUD already carries both hull and armour. Keep the extra
    // damage instrument only in cockpit mode, away from MENU controls.
    if(document.getElementById('hud-style')?.value==='cockpit')damageDiagram();
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
    if(pilot&&pilot.flightRisk>.62&&pilot.alive){
      g.fillStyle='#81512bc9';g.fillRect(W/2-47,116,94,12);
      g.fillStyle='#ffdfad';g.textAlign='center';g.font='bold 7px monospace';
      g.fillText('STALL · DIVE',W/2,119);g.textAlign='left';
    }
    if(false&&pilot&&pilot.critical&&pilot.alive){
      g.fillStyle='#6f2e2acb';g.fillRect(W*.5-60,38,120,14);
      g.fillStyle='#ffdb9b';g.textAlign='center';g.font='bold 8px monospace';
      g.fillText(pilot.criticalCause+' · GLIDE',W*.5,42);g.textAlign='left';
    }
    if(pilot&&pilot.damageNotice>0){
      g.font='bold 7px monospace';g.textAlign='center';
      g.fillStyle='#ffd39c';g.fillText('HIT BY '+pilot.damageCause,W*.5,115);
      g.textAlign='left';
    }
    if(state.bannerTime>0){
      // Announcements live below the speed gauges, not on top of them.
      const bannerWidth=Math.min(240,W*.57);
      g.fillStyle='#172f3cd9';g.fillRect(W/2-bannerWidth/2,100,bannerWidth,15);
      g.strokeStyle='#bb9f6fa1';g.strokeRect(W/2-bannerWidth/2,100,bannerWidth,15);
      g.font='bold 7px monospace';g.textAlign='center';g.fillStyle='#ffe0ad';
      g.fillText(state.banner,W/2,107,bannerWidth-12);g.textAlign='left';
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
    if(!el)return;
    let pointerId=null;
    const activeTouches=new Set();
    function sync(){
      const held=pointerId!==null||activeTouches.size>0;
      if(key)controls[key]=held;
      el.classList.toggle('pressed',held);
    }
    el.addEventListener('pointerdown',ev=>{
      // Touch is managed by real touch events below: pointercancel on a long
      // press is not a reliable touch release event on Android/Safari.
      if(ev.pointerType==='touch')return;
      if(pointerId!==null)return;
      ev.preventDefault();
      pointerId=ev.pointerId;
      try{el.setPointerCapture(ev.pointerId);}catch{}
      audioUnlock();sync();
      if(action)action();
    });
    const releasePointer=ev=>{
      if(pointerId===null||ev.pointerId!==pointerId)return;
      pointerId=null;sync();
    };
    el.addEventListener('pointerup',releasePointer);
    el.addEventListener('pointercancel',releasePointer);
    window.addEventListener('pointerup',releasePointer);
    // Prevent the browser from selecting the arrow glyph or taking over a hold.
    // Every finger is tracked separately, so steering remains down while
    // FIRE / SKILL are held with the other thumb.
    el.addEventListener('touchstart',ev=>{
      ev.preventDefault();
      const wasHeld=activeTouches.size>0;
      for(const touch of ev.changedTouches)activeTouches.add(touch.identifier);
      audioUnlock();sync();
      if(action&&!wasHeld)action();
    },{passive:false});
    const releaseTouch=ev=>{
      ev.preventDefault();
      for(const touch of ev.changedTouches)activeTouches.delete(touch.identifier);
      sync();
    };
    el.addEventListener('touchend',releaseTouch,{passive:false});
    el.addEventListener('touchcancel',releaseTouch,{passive:false});
    el.addEventListener('selectstart',ev=>ev.preventDefault());
    el.addEventListener('contextmenu',ev=>ev.preventDefault());
  }
  bindButton('left','left');
  bindButton('right','right');
  bindButton('fire',null,()=>triggerBurst(state.fliers[0]));
  bindButton('special',null,()=>triggerSpecial(state.fliers[0]));
  bindButton('roll',null,()=>triggerPilotSkill(state.fliers[0]));
  bindButton('call-support',null,()=>callSupport());
  // A dedicated SKILL control replaces the ambiguous double-tap turn gesture.
  const preventKeys=new Set(['ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','KeyA','KeyD','KeyW','ArrowUp','KeyE','KeyK','KeyL','KeyQ','KeyB','KeyR']);
  document.addEventListener('keydown',e=>{
    if(preventKeys.has(e.code))e.preventDefault();
    if(e.code==='KeyA'||e.code==='ArrowLeft')controls.left=true;
    if(e.code==='KeyD'||e.code==='ArrowRight')controls.right=true;
    
    if(e.repeat)return;
    if(e.code==='Space'){audioUnlock();triggerBurst(state.fliers[0]);}
    if(e.code==='ShiftLeft'||e.code==='ShiftRight'||e.code==='KeyK'||e.code==='KeyE'){audioUnlock();triggerSpecial(state.fliers[0]);}
    if(e.code==='KeyL'||e.code==='KeyQ'){audioUnlock();triggerPilotSkill(state.fliers[0]);}
    if(e.code==='KeyR'){audioUnlock();callSupport();}
    
    if(e.code==='KeyP'&&state.phase==='playing')state.paused=!state.paused;
    if(e.code==='Escape'&&state.phase!=='menu'){e.preventDefault();showMenu();}
  });
  document.addEventListener('keyup',e=>{
    if(e.code==='KeyA'||e.code==='ArrowLeft')controls.left=false;
    if(e.code==='KeyD'||e.code==='ArrowRight')controls.right=false;
    
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
      state.selected=btn.dataset.plane;syncAbilityButton();
      for(const b of document.querySelectorAll('[data-plane]')){
        const chosen=b===btn;b.classList.toggle('selected',chosen);
        b.setAttribute('aria-pressed',String(chosen));
      }
    });
  }
  syncAbilityButton();
  ui.start.addEventListener('click',startMatch);
  ui.rematch.addEventListener('click',startMatch);
  ui.change.addEventListener('click',showMenu);
  // Preserve pixel density rather than squashing a 16:9 picture on wide phones.
  function resizeArena(){
    // CSS svh can exceed the actual visible rectangle on some Android
    // landscape browsers. Size the game and thumb controls to actual pixels.
    const visibleH=Math.floor(Math.min(window.innerHeight||Infinity,window.visualViewport?.height||Infinity));
    if(Number.isFinite(visibleH)&&visibleH>100)
      document.documentElement?.style?.setProperty?.('--wingman-visible-height',visibleH+'px');
    const frame=document.getElementById('frame');
    if(!frame)return;
    const rect=frame.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    // The original logical height remains 180; extra-wide screens show
    // more horizontal sky so 4-player combat will eventually fit naturally.
    const nextW=clamp(Math.round(H*rect.width/rect.height),320,850);
    const dpr=clamp(window.devicePixelRatio||1,1,3);
    const pixelWidth=Math.max(1,Math.round(rect.width*dpr));
    const pixelHeight=Math.max(1,Math.round(rect.height*dpr));
    if(modelCanvas.width!==pixelWidth||modelCanvas.height!==pixelHeight){
      modelCanvas.width=pixelWidth;modelCanvas.height=pixelHeight;
      modelCtx.imageSmoothingEnabled=true;
    }
    if(nextW===W&&canvas.width===Math.round(W*renderScale)&&canvas.height===Math.round(H*renderScale))return;
    const old=W;
    W=nextW;
    canvas.width=Math.round(W*renderScale);canvas.height=Math.round(H*renderScale);
    g.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    g.imageSmoothingEnabled=renderScale>1;
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

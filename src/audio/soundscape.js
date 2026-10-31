/* Wingman audio engine — CC0 recorded firearm reports + original synthetic effects.
   Field-recorded machine-gun/cannon layers are cached locally; all other sounds remain procedural.
   Original gun audio provenance: assets/audio/guns/README.md */
(()=>{'use strict';
 let ctx=null,master=null,motor=null,motorFilter=null,motorGain=null;
 let volume=1;
 try{const v=Number(localStorage.getItem('wingman-audio-volume'));if(Number.isFinite(v))volume=Math.max(0,Math.min(1,v));}catch{}
 let muted=false,lastFire=-10,lastHit=-10,lastCrash=-10,lastFlight=0,lastBombWhistle=-10;
 let lastGunTail=-10,gunShotIndex=0,gunBus=null,gunAssetsPromise=null;
 const GUN_FILES={
   mg:['./assets/audio/guns/mg-0.wav','./assets/audio/guns/mg-1.wav','./assets/audio/guns/mg-2.wav'],
   cannon:['./assets/audio/guns/cannon-0.wav','./assets/audio/guns/cannon-1.wav'],
   mgTail:'./assets/audio/guns/mg-tail.mp3',
   cannonTail:'./assets/audio/guns/cannon-tail.mp3'
 };
 const gunBuffers={mg:[],cannon:[],mgTail:null,cannonTail:null};
 const recordedGunfire=new URLSearchParams(window.location?.search||'').get('guns')!=='synthetic';
 let noiseBuffer=null;
 try{muted=localStorage.getItem('wingman-audio-muted')==='true';}catch{}
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const buttons=['wm-audio-toggle','wm-audio-toggle-mobile'].map(id=>document.getElementById(id)).filter(Boolean);
 function sync(){
  for(const button of buttons){
   button.textContent=muted?'♪ SOUND OFF':'♫ SOUND ON';
   button.setAttribute('aria-pressed',String(!muted));
   button.setAttribute('aria-label',muted?'Enable Wingman sound':'Mute Wingman sound');
   button.title=muted?'Enable sound':'Mute sound';
   button.classList.toggle('muted',muted);
  }
 }
 function unlock(){
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!ctx&&AC)try{
   ctx=new AC();
   master=ctx.createGain();master.gain.value=muted?0:.42*volume;
   master.connect(ctx.destination);
   // Gun bus compressor makes each field-recorded report audible on small
   // laptop/phone speakers without clipping when several shots overlap.
   if(ctx.createDynamicsCompressor){
     const compressor=ctx.createDynamicsCompressor();
     compressor.threshold.value=-18;
     compressor.knee.value=13;
     compressor.ratio.value=3.4;
     compressor.attack.value=.004;
     compressor.release.value=.19;
     gunBus=ctx.createGain();gunBus.connect(compressor);compressor.connect(master);
   }else gunBus=master;
   // Procedural noise remains as a fallback and for non-gun effects.
   // Cache one varied broadband sample for short gun and explosion impulses.
   // All sounds are generated locally, with no downloaded audio assets.
   const len=Math.ceil(ctx.sampleRate*1.35);
   noiseBuffer=ctx.createBuffer(1,len,ctx.sampleRate);
   const samples=noiseBuffer.getChannelData(0);
   let seed=0x582f1987;
   for(let i=0;i<len;i++){
     seed=(Math.imul(seed,1664525)+1013904223)>>>0;
     samples[i]=(seed/2147483648-1);
   }
  }catch{}
  if(ctx?.state==='suspended')ctx.resume().catch(()=>{});
  if(ctx&&recordedGunfire)loadGunAssets();
  return ctx?.state==='running';
 }
 function loadGunAssets(){
   if(gunAssetsPromise||!ctx||typeof fetch!=='function')return gunAssetsPromise;
   const entries=[
     ...GUN_FILES.mg.map((url,i)=>({url,group:'mg',index:i})),
     ...GUN_FILES.cannon.map((url,i)=>({url,group:'cannon',index:i})),
     {url:GUN_FILES.mgTail,group:'mgTail'},
     {url:GUN_FILES.cannonTail,group:'cannonTail'}
   ];
   gunAssetsPromise=Promise.all(entries.map(async ({url,group,index})=>{
     try{
       const response=await fetch(url,{cache:'force-cache'});
       if(!response.ok)throw Error('audio '+response.status);
       const buffer=await ctx.decodeAudioData(await response.arrayBuffer());
       if(group==='mg'||group==='cannon')gunBuffers[group][index]=buffer;
       else gunBuffers[group]=buffer;
     }catch(_){
       // Keep the legacy synthetic fallback for offline/unsupported browsers.
     }
   }));
   return gunAssetsPromise;
 }
 function playRecorded(buffer,volume,rate=1,delay=0,maxDuration=Infinity){
   if(!ctx||!master||!buffer||muted)return false;
   const at=ctx.currentTime+delay;
   const src=ctx.createBufferSource(),gain=ctx.createGain(),toneFilter=ctx.createBiquadFilter();
   src.buffer=buffer;
   src.playbackRate.value=rate;
   toneFilter.type='highpass';toneFilter.frequency.value=85;
   gain.gain.setValueAtTime(.001,at);
   gain.gain.linearRampToValueAtTime(volume,at+.003);
   // Trim overlapping individual reports: each shot has an impactful attack
   // and body, while the natural outdoor reverberation plays after the burst.
   const duration=Math.min(buffer.duration/rate,maxDuration);
   gain.gain.setValueAtTime(volume,at+Math.max(.005,duration-.035));
   gain.gain.linearRampToValueAtTime(.001,at+duration);
   src.connect(toneFilter);toneFilter.connect(gain);gain.connect(gunBus||master);
   src.start(at,0,Math.min(buffer.duration,duration*rate));
   src.stop(at+duration+.005);
   return true;
 }
 function tone(freq,to,duration,volume=0.08,type='triangle',delay=0){
  if(muted||!ctx||ctx.state!=='running'||!master)return;
  const at=ctx.currentTime+delay;
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=type;
  osc.frequency.setValueAtTime(Math.max(35,freq),at);
  osc.frequency.exponentialRampToValueAtTime(Math.max(35,to),at+duration);
  gain.gain.setValueAtTime(.001,at);
  gain.gain.exponentialRampToValueAtTime(Math.max(.002,volume),at+.009);
  gain.gain.exponentialRampToValueAtTime(.001,at+duration);
  osc.connect(gain);gain.connect(master);osc.start(at);osc.stop(at+duration+.015);
 }
 function noise(duration,volume=0.045,delay=0,options={}){
  if(muted||!ctx||ctx.state!=='running'||!master||!noiseBuffer)return;
  const at=ctx.currentTime+delay;
  const len=Math.min(duration,noiseBuffer.duration-.01);
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  src.buffer=noiseBuffer;
  filter.type=options.filter||'lowpass';
  filter.frequency.setValueAtTime(options.frequency||800,at);
  if(options.toFrequency){
    filter.frequency.exponentialRampToValueAtTime(options.toFrequency,at+len);
  }
  filter.Q.value=options.q??.7;
  gain.gain.setValueAtTime(.001,at);
  gain.gain.linearRampToValueAtTime(volume,at+.004);
  gain.gain.exponentialRampToValueAtTime(.001,at+len);
  src.connect(filter);filter.connect(gain);gain.connect(master);
  const offsetRange=Math.max(0,noiseBuffer.duration-len-.015);
  const offset=offsetRange?((at*5.913)%offsetRange):0;
  src.start(at,offset,len);
 }
 function gunCrack(heavy=false,rear=false,options={}){
   const now=ctx.currentTime;
   const interval=heavy?.092:rear?.077:.051;
   if(now-lastFire<interval)return;
   lastFire=now;
   const key=heavy?'cannon':'mg';
   const available=gunBuffers[key].filter(Boolean);
   const enemy=options.player===false;
   if(recordedGunfire&&available.length){
     const b=available[(gunShotIndex++)%available.length];
     const playbackRate=heavy?.90+(gunShotIndex%3)*.018:
       rear?1.08+(gunShotIndex%3)*.017:.96+(gunShotIndex%3)*.02;
     const gain=(heavy?.59:rear?.29:.46)*(enemy?.68:1);
     playRecorded(b,gain,playbackRate,0,heavy?.32:.235);
     return;
   }
   // Offline/first-shot fallback. Later shots use recorded firearm reports.
   noise(heavy?.16:.11,heavy?.16:.12,0,
      {filter:'lowpass',frequency:heavy?1100:1450,toFrequency:220,q:.45});
   noise(.048,heavy?.07:.06,0,
      {filter:'highpass',frequency:heavy?950:1350,q:.45});
 }
 function gunTail(options={}){
   if(!recordedGunfire||!ctx||muted)return;
   const now=ctx.currentTime;
   if(now-lastGunTail<.23)return;
   lastGunTail=now;
   const heavy=options.role==='heavy';
   const buffer=gunBuffers[heavy?'cannonTail':'mgTail'];
   if(buffer){
     // Natural field reflections after the final round provide size and
     // menace without stacking a reverb tail on every 50-ms gunshot.
     playRecorded(buffer,(heavy?.28:.22)*(options.player===false?.62:1),1,.065);
   }
 }
 function bombWhistle(){
  if(!ctx||ctx.state!=='running'||muted||!master)return;
  const now=ctx.currentTime;
  // One descending air-whistle per bombing sequence, not one noisy voice
  // per individual bomb in a salvo.
  if(now-lastBombWhistle<1.38)return;
  lastBombWhistle=now;
  const duration=1.35,at=now+.075;
  const osc=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  osc.type='sine';
  osc.frequency.setValueAtTime(870,at);
  osc.frequency.exponentialRampToValueAtTime(240,at+duration);
  // Gentle WWII dive-whistle wavering, rather than an electronic laser sweep.
  osc.detune.setValueAtTime(-9,at);
  osc.detune.linearRampToValueAtTime(11,at+.4);
  osc.detune.linearRampToValueAtTime(-13,at+1.1);
  filter.type='lowpass';filter.frequency.value=1250;
  gain.gain.setValueAtTime(.001,at);
  gain.gain.exponentialRampToValueAtTime(.055,at+.17);
  gain.gain.setValueAtTime(.045,at+.58);
  gain.gain.exponentialRampToValueAtTime(.001,at+duration);
  osc.connect(filter);filter.connect(gain);gain.connect(master);
  osc.start(at);osc.stop(at+duration+.025);
  noise(.9,.020,.21,{filter:'bandpass',frequency:630,q:.5});
 }
 function bombImpact(){
  // Low pressure wave and a crumbling tail: no electronic descending bloop.
  noise(.58,.17,0,{filter:'lowpass',frequency:430,toFrequency:90,q:.5});
  noise(.085,.09,0,{filter:'highpass',frequency:850,q:.5});
  noise(.45,.063,.065,{filter:'bandpass',frequency:240,toFrequency:135,q:.5});
  tone(66,39,.43,.075,'sine');
 }
 function metalHit(){
  // A short sheet-metal snap, followed by a soft shrapnel rattle.
  // Deliberately NON-TONAL so gun strikes don't sound like UI bleeps.
  noise(.036,.082,0,{filter:'highpass',frequency:1300,q:.6});
  noise(.13,.071,.007,{filter:'bandpass',frequency:590,toFrequency:310,q:.78});
  noise(.078,.029,.018,{filter:'lowpass',frequency:430,q:.5});
 }
 function aircraftCrash(){
  const now=ctx.currentTime;
  if(now-lastCrash<.24)return;
  lastCrash=now;
  // Heavy structural breakup and fuel detonation, clearly separate from
  // routine bullet hits and from the mission victory/defeat UI jingle.
  noise(.14,.19,0,{filter:'highpass',frequency:470,q:.48});
  noise(.72,.205,0,{filter:'lowpass',frequency:490,toFrequency:85,q:.47});
  noise(.46,.104,.083,{filter:'bandpass',frequency:185,toFrequency:110,q:.49});
  noise(.21,.055,.23,{filter:'highpass',frequency:780,q:.6});
  tone(68,36,.51,.10,'sine');
 }
 function play(type,options={}){
  if(muted)return;
  unlock();
  if(!ctx||ctx.state!=='running')return;
  const now=ctx.currentTime;
  if(type==='shot'||type==='cannon'||type==='rearShot'){
    gunCrack(type==='cannon',type==='rearShot',options);
  }else if(type==='gunTail'){
    gunTail(options);
  }else if(type==='bombDrop'){
    bombWhistle();
  }else if(type==='bombImpact'){
    bombImpact();
  }else if(type==='hit'){
    if(now-lastHit<.065)return;lastHit=now;metalHit();
  }else if(type==='crash'){
    aircraftCrash();
  }else if(type==='boom'){
    aircraftCrash();
  }else if(type==='special'){
    tone(390,610,.21,.052,'triangle');tone(250,470,.15,.045,'sine',.045);
  }else if(type==='boss'){
    [280,390,280,540].forEach((f,i)=>tone(f,f*.78,.18,.11,'sawtooth',i*.15));
  }else if(type==='medal'){
    [523,659,784,1046].forEach((f,i)=>tone(f,f*1.16,.36,.075,'sine',i*.11));
  }else if(type==='victory'){
    [392,523,659,784,1046].forEach((f,i)=>tone(f,f*.99,.34,.083,'triangle',i*.18));
  }else if(type==='defeat'){
    // Do not play a descending arcade "blip" immediately after a crash.
    // The physical impact supplies the feedback; the result screen is visual.
  }
 }
 function startEngine(){
  if(muted)return;
  unlock();
  if(!ctx||ctx.state!=='running'||motor)return;
  motor=ctx.createOscillator();motor.type='sawtooth';
  motorFilter=ctx.createBiquadFilter();motorFilter.type='lowpass';motorFilter.frequency.value=220;
  motorGain=ctx.createGain();motorGain.gain.value=.001;
  motor.frequency.value=75;
  motor.connect(motorFilter);motorFilter.connect(motorGain);motorGain.connect(master);
  motor.start();motorGain.gain.setTargetAtTime(.023,ctx.currentTime,.38);
 }
 function flight(speed,healthRatio=1){
  if(muted||!ctx||!motor)return;
  const t=ctx.currentTime;
  if(t-lastFlight<.13)return;lastFlight=t;
  const hz=clamp(57+(Number(speed)||80)*.68,65,170);
  motor.frequency.setTargetAtTime(hz,t,.13);
  motorFilter.frequency.setTargetAtTime(clamp(hz*2.1,155,410),t,.23);
  motorGain.gain.setTargetAtTime(clamp(.018+(1-healthRatio)*.012,.015,.036),t,.3);
 }
 function stopEngine(){
  if(!motor)return;
  const o=motor,g=motorGain;
  motor=null;motorFilter=null;motorGain=null;
  if(ctx&&g){g.gain.setTargetAtTime(.001,ctx.currentTime,.11);try{o.stop(ctx.currentTime+.65);}catch{}}
 }
 function setVolume(value){
  const next=Math.max(0,Math.min(1,Number(value)));
  if(!Number.isFinite(next))return volume;
  volume=next;
  try{localStorage.setItem('wingman-audio-volume',String(volume));}catch{}
  if(master&&ctx)master.gain.setTargetAtTime(muted?0:.42*volume,ctx.currentTime,.045);
  return volume;
 }
 function setMuted(value){
  muted=Boolean(value);
  try{localStorage.setItem('wingman-audio-muted',String(muted));}catch{}
  if(master&&ctx)master.gain.setTargetAtTime(muted?0:.42*volume,ctx.currentTime,.045);
  if(muted)stopEngine();
  sync();
 }
 for(const button of buttons)button.addEventListener('click',()=>{if(muted){setMuted(false);unlock();play('medal');}else setMuted(true);});
 sync();
 window.WingmanAudio={unlock,play,startEngine,flight,stopEngine,setMuted,setVolume,
   get volume(){return volume;},
   get muted(){return muted;},
   get recordedGunfireReady(){return gunBuffers.mg.filter(Boolean).length>0&&gunBuffers.cannon.filter(Boolean).length>0;}
 };
})();
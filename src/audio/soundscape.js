/* Wingman audio engine — original synthesised effects, no copyrighted samples or downloads.
   One continuously modulated motor voice, event-limited weapon and medal cues. */
(()=>{'use strict';
 let ctx=null,master=null,motor=null,motorFilter=null,motorGain=null;
 let muted=false,lastFire=-10,lastHit=-10,lastFlight=0,lastBombWhistle=-10;
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
   master=ctx.createGain();master.gain.value=muted?0:.42;
   master.connect(ctx.destination);
   // Cache one varied broadband sample for short gun and explosion impulses.
   // All sounds are generated locally, with no downloaded audio assets.
   const len=Math.ceil(ctx.sampleRate*.42);
   noiseBuffer=ctx.createBuffer(1,len,ctx.sampleRate);
   const samples=noiseBuffer.getChannelData(0);
   let seed=0x582f1987;
   for(let i=0;i<len;i++){
     seed=(Math.imul(seed,1664525)+1013904223)>>>0;
     samples[i]=(seed/2147483648-1);
   }
  }catch{}
  if(ctx?.state==='suspended')ctx.resume().catch(()=>{});
  return ctx?.state==='running';
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
  const now=ctx.currentTime+delay;
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  src.buffer=noiseBuffer;
  filter.type=options.filter||'lowpass';
  filter.frequency.setValueAtTime(options.frequency||1600,now);
  filter.Q.value=options.q??.8;
  gain.gain.setValueAtTime(.001,now);
  gain.gain.linearRampToValueAtTime(volume,now+.004);
  gain.gain.exponentialRampToValueAtTime(.001,now+duration);
  src.connect(filter);filter.connect(gain);gain.connect(master);
  const maxOffset=Math.max(0,noiseBuffer.duration-duration-.015);
  const offset=maxOffset?((now*5.913)%maxOffset):0;
  src.start(now,offset,Math.max(.012,duration));
 }
 function gunCrack(heavy=false,rear=false){
  const now=ctx.currentTime;
  const minInterval=heavy?.095:rear?.075:.052;
  if(now-lastFire<minInterval)return;
  lastFire=now;
  // A very short broadband pressure crack, followed by low mechanical
  // resonance. Two different spectral profiles for cannon and machine guns.
  const variation=.96+.08*((now*17.7)%1);
  noise(heavy?.104:rear?.063:.077,heavy?.145:rear?.073:.104,0,
    {filter:'bandpass',frequency:heavy?720:rear?1320:1020,q:heavy?.45:.55});
  tone((heavy?132:rear?175:205)*variation,heavy?68:rear?118:122,
    heavy?.12:.085,heavy?.098:rear?.049:.066,'triangle');
  if(heavy)noise(.078,.055,.023,{filter:'lowpass',frequency:430,q:.7});
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
  // Thick low-frequency thump plus rough rolling detonation and dust.
  tone(116,42,.56,.16,'sawtooth');
  tone(70,38,.5,.12,'triangle',.02);
  noise(.34,.17,0,{filter:'lowpass',frequency:690,q:.5});
  noise(.31,.048,.1,{filter:'bandpass',frequency:310,q:.6});
 }
 function play(type){
  if(muted)return;
  unlock();
  if(!ctx||ctx.state!=='running')return;
  const now=ctx.currentTime;
  if(type==='shot'||type==='cannon'||type==='rearShot'){
    gunCrack(type==='cannon',type==='rearShot');
  }else if(type==='bombDrop'){
    bombWhistle();
  }else if(type==='bombImpact'){
    bombImpact();
  }else if(type==='hit'){
    if(now-lastHit<.07)return;lastHit=now;
    tone(245,98,.095,.046,'triangle');
    noise(.063,.075,0,{filter:'bandpass',frequency:1450,q:.65});
  }else if(type==='boom'){
    tone(132,40,.41,.126,'sawtooth');
    tone(64,37,.47,.104,'triangle');
    noise(.29,.115,0,{filter:'lowpass',frequency:620,q:.6});
  }else if(type==='special'){
    tone(390,610,.21,.052,'triangle');tone(250,470,.15,.045,'sine',.045);
  }else if(type==='boss'){
    [280,390,280,540].forEach((f,i)=>tone(f,f*.78,.18,.11,'sawtooth',i*.15));
  }else if(type==='medal'){
    [523,659,784,1046].forEach((f,i)=>tone(f,f*1.16,.36,.075,'sine',i*.11));
  }else if(type==='victory'){
    [392,523,659,784,1046].forEach((f,i)=>tone(f,f*.99,.34,.083,'triangle',i*.18));
  }else if(type==='defeat'){
    [310,245,185].forEach((f,i)=>tone(f,f*.8,.28,.080,'sawtooth',i*.22));
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
 function setMuted(value){
  muted=Boolean(value);
  try{localStorage.setItem('wingman-audio-muted',String(muted));}catch{}
  if(master&&ctx)master.gain.setTargetAtTime(muted?0:.42,ctx.currentTime,.045);
  if(muted)stopEngine();
  sync();
 }
 for(const button of buttons)button.addEventListener('click',()=>{if(muted){setMuted(false);unlock();play('medal');}else setMuted(true);});
 sync();
 window.WingmanAudio={unlock,play,startEngine,flight,stopEngine,setMuted,get muted(){return muted;}};
})();
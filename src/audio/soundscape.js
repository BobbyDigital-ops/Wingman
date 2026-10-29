/* Wingman audio engine — original synthesised effects, no copyrighted samples or downloads.
   One continuously modulated motor voice, event-limited weapon and medal cues. */
(()=>{'use strict';
 let ctx=null,master=null,motor=null,motorFilter=null,motorGain=null;
 let muted=false,lastFire=0,lastHit=0,lastFlight=0;
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
 function noise(duration,volume=0.045,delay=0){
  if(muted||!ctx||ctx.state!=='running'||!master)return;
  const rate=ctx.sampleRate,length=Math.ceil(rate*duration);
  if(!ctx.createBuffer||!ctx.createBufferSource)return;
  const buffer=ctx.createBuffer(1,length,rate),d=buffer.getChannelData(0);
  // Short crackles: avoid a persistent noise source and avoid external samples.
  let seed=27;for(let i=0;i<length;i++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;
   d[i]=((seed/4294967296)*2-1)*Math.pow(1-i/length,1.6);
  }
  const src=ctx.createBufferSource(),g=ctx.createGain(),filter=ctx.createBiquadFilter();
  filter.type='lowpass';filter.frequency.value=1600;
  src.buffer=buffer;g.gain.value=volume;src.connect(filter);filter.connect(g);g.connect(master);
  src.start(ctx.currentTime+delay);
 }
 function play(type){
  if(muted)return;
  unlock();
  if(!ctx||ctx.state!=='running')return;
  const now=ctx.currentTime;
  if(type==='shot'){
    if(now-lastFire<.055)return;lastFire=now;
    tone(250,100,.078,.065,'square');noise(.055,.027);
  }else if(type==='hit'){
    if(now-lastHit<.07)return;lastHit=now;
    tone(365,120,.12,.068,'triangle');noise(.085,.054);
  }else if(type==='boom'){
    tone(140,47,.4,.145,'sawtooth');tone(73,38,.46,.12,'triangle');noise(.35,.12);
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
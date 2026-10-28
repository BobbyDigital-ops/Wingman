/* Wingman startup: title → combat mode → loadout. Gameplay remains in game.js. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const panelIds={splash:'splash-panel',mode:'mode-panel',options:'options-panel'};
function show(view){
 for(const [name,id] of Object.entries(panelIds)){
   const el=$(id);if(el)el.hidden=name!==view;
 }
}
function setMode(kind){
 const preset={
   duel:['duel','2','ffa'],
   survival:['survival','2','ffa'],
   triple:['duel','3','ffa'],
   teams:['duel','4','teams']
 }[kind]||['duel','2','ffa'];
 for(const [id,value] of [['mode-select',preset[0]],['pilots-select',preset[1]],['team-select',preset[2]]]){
   const el=$(id);if(el)el.value=value;
 }
 for(const button of document.querySelectorAll('[data-mode-choice]')){
   const selected=button.dataset.modeChoice===kind;
   button.classList.toggle('selected',selected);
   button.setAttribute('aria-pressed',String(selected));
 }
}
function requestImmersive(force=false){
 const frame=document.querySelector('.app'); // fullscreen the whole game workspace, including career
 const isPhone=window.matchMedia?.('(pointer: coarse)')?.matches;
 if(document.fullscreenElement)return;
 if(!force&&(!isPhone||window.innerHeight>window.innerWidth))return;
 try{
   const result=frame?.requestFullscreen?.({navigationUI:'hide'});
   result?.catch?.(()=>{});
 }catch(_){}
}
for(const buttonId of ['menu-fullscreen','career-fullscreen']) $(buttonId)?.addEventListener('click',()=>{
 if(document.fullscreenElement){
   document.exitFullscreen?.()?.catch?.(()=>{});
 }else requestImmersive(true);
});
document.addEventListener('fullscreenchange',()=>{
 const full=!!document.fullscreenElement;
 for(const buttonId of ['menu-fullscreen','career-fullscreen']){
  const button=$(buttonId);if(!button)continue;
  button.innerHTML=full?'× <span>EXIT FULL SCREEN</span>':'⛶ <span>FULL SCREEN</span>';
  button.setAttribute('aria-label',full?'Exit full screen':'Enter full screen');
 }
});
$('splash-continue')?.addEventListener('click',()=>{
 // Keep briefings free of the browser's fullscreen instructional toast.
 // Enter immersive mode only as the player launches a sortie.
 show('mode');
});
$('mode-back')?.addEventListener('click',()=>show('splash'));
$('mode-next')?.addEventListener('click',()=>show('options'));
$('options-back')?.addEventListener('click',()=>show('mode'));
for(const choice of document.querySelectorAll('[data-mode-choice]')){
 choice.addEventListener('click',()=>setMode(choice.dataset.modeChoice));
}
$('start')?.addEventListener('click',requestImmersive,{capture:true});
function paintIntro(){
 const c=$('splash-aircraft');if(!c||!window.WingmanSprites)return;
 const g=c.getContext('2d');if(!g)return;
 const w=c.width,h=c.height;
 g.clearRect(0,0,w,h);
 let grad=g.createLinearGradient(0,0,w,0);
 grad.addColorStop(0,'#d2d2b500');grad.addColorStop(.5,'#d6bd8870');grad.addColorStop(1,'#d2d2b500');
 g.fillStyle=grad;g.fillRect(0,h*.66,w,1);
 // Aviation-poster contrails and two enlarged repository aircraft silhouettes.
 g.save();g.strokeStyle='#e7d6b24a';g.lineWidth=3;g.beginPath();g.moveTo(-20,h*.84);g.bezierCurveTo(w*.25,h*.79,w*.48,h*.34,w*.77,h*.36);g.stroke();g.strokeStyle='#cbd5c630';g.lineWidth=8;g.beginPath();g.moveTo(-20,h*.88);g.bezierCurveTo(w*.25,h*.83,w*.50,h*.39,w*.77,h*.41);g.stroke();g.restore();
 // Two genuine repository aircraft drawings for an aviation-game splash.
 g.save();g.translate(w*.31,h*.53);g.rotate(-.18);g.scale(5.7,5.7);
 window.WingmanSprites.draw(g,'fighter','level');g.restore();
 g.save();g.translate(w*.76,h*.34);g.rotate(Math.PI+.14);g.scale(4.6,4.6);
 window.WingmanSprites.draw(g,'bf109','level');g.restore();
}

/* Hangar aircraft gallery: artwork comes from the same airframe geometry as
   gameplay, so no wrong-plane thumbnails or extra external image requests. */
const fleet={
 fighter:{name:'SPITFIRE',tag:'RAF · AGILE FIGHTER · OVERDRIVE',stats:[81,96,28]},
 heavy:{name:'BEAUFIGHTER',tag:'RAF · HEAVY FIGHTER · SHIELD',stats:[68,47,80]},
 bomber:{name:'LANCASTER',tag:'RAF · BOMBER · DEFENSIVE GUNNERS',stats:[52,29,98]},
 bf109:{name:'MESSERSCHMITT',tag:'LUFTWAFFE · BF 109E · INTERCEPTOR · OVERDRIVE',stats:[84,93,30]},
 bf110:{name:'ZERSTÖRER',tag:'LUFTWAFFE · MESSERSCHMITT BF 110 · HEAVY FIGHTER · SHIELD',stats:[70,45,77]},
 he111:{name:'HEINKEL',tag:'LUFTWAFFE · HE 111 · MEDIUM BOMBER · DEFENSIVE GUNNERS',stats:[54,32,93]}
};
// Keep crisp native-resolution vector aircraft previews until the painted
// assets are generated as separate full-resolution files, not 86x60 crops.
function paintPlane(canvas,type,scale){
 if(!canvas||!window.WingmanSprites)return;
 const g=canvas.getContext('2d');if(!g)return;
 g.clearRect(0,0,canvas.width,canvas.height);
 g.save();g.translate(canvas.width*.5,canvas.height*.52);g.scale(scale,scale);
 g.rotate(-.085);g.shadowColor='#051928';g.shadowBlur=1.3;g.shadowOffsetY=1.2;
 window.WingmanSprites.draw(g,type,'level');
 g.restore();
}
function renderFleet(){
 document.querySelectorAll('canvas[data-aircraft-art]').forEach(c=>paintPlane(c,c.dataset.aircraftArt,10.3));
 const current=document.querySelector('.plane-choice.selected')?.dataset.plane||'fighter';
 const info=fleet[current]||fleet.fighter;
 paintPlane($('wm-featured-plane'),current,21.5);
 if($('wm-featured-name'))$('wm-featured-name').textContent=info.name;
 if($('wm-featured-description'))$('wm-featured-description').textContent=info.tag;
 for(const [i,id] of ['wm-stat-speed','wm-stat-turn','wm-stat-armour'].entries()){
  const bar=$(id);if(bar)bar.style.setProperty('--wm-stat',info.stats[i]+'%');
 }
}
document.querySelectorAll('[data-plane]').forEach(button=>button.addEventListener('click',()=>{
 requestAnimationFrame(renderFleet);
}));

window.WingmanFlow={reset:()=>show('splash'),setMode,show};
setMode('duel');show('splash');paintIntro();renderFleet();
})();

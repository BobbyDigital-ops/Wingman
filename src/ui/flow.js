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
function requestImmersive(){
 const frame=$('frame');
 const isPhone=window.matchMedia?.('(pointer: coarse)')?.matches;
 if(!isPhone||window.innerHeight>window.innerWidth||document.fullscreenElement)return;
 try{
   const result=frame?.requestFullscreen?.({navigationUI:'hide'});
   result?.catch?.(()=>{});
 }catch(_){}
}
$('splash-continue')?.addEventListener('click',()=>{
 // Fullscreen requires a user activation. Do this synchronously in the tap.
 requestImmersive();
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
 // Two genuine repository aircraft drawings for an aviation-game splash.
 g.save();g.translate(w*.31,h*.47);g.rotate(-.12);g.scale(3.0,3.0);
 window.WingmanSprites.draw(g,'fighter','level');g.restore();
 g.save();g.translate(w*.74,h*.38);g.rotate(Math.PI+.12);g.scale(2.4,2.4);
 window.WingmanSprites.draw(g,'bf109','level');g.restore();
}
window.WingmanFlow={reset:()=>show('splash'),setMode,show};
setMode('duel');show('splash');paintIntro();
})();

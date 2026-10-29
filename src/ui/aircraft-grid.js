/* Wingman aircraft comparison grid. Independent of flight physics. */
(function(){
'use strict';
const aircraft=[
 {id:'fighter',name:'SPITFIRE',role:'AGILE FIGHTER',ability:'OVERDRIVE',faction:'Allies',speed:82,turn:3.15,armour:40,damage:11},
 {id:'heavy',name:'BEAUFIGHTER',role:'HEAVY FIGHTER',ability:'SHIELD',faction:'Allies',speed:75,turn:1.98,armour:78,damage:16},
 {id:'bomber',name:'LANCASTER',role:'BOMBER',ability:'TURRETS',faction:'Allies',speed:66,turn:1.30,armour:124,damage:10},
 {id:'bf109',name:'BF 109E EMIL',role:'AGILE FIGHTER',ability:'OVERDRIVE',faction:'Axis',speed:87,turn:3.02,armour:42,damage:11},
 {id:'bf110',name:'BF 110 ZERSTÖRER',role:'HEAVY FIGHTER',ability:'SHIELD',faction:'Axis',speed:78,turn:1.91,armour:75,damage:17},
 {id:'he111',name:'HEINKEL HE 111',role:'MEDIUM BOMBER',ability:'TURRETS',faction:'Axis',speed:69,turn:1.35,armour:116,damage:10}
];
const find=id=>aircraft.find(p=>p.id===id)||aircraft[0];
const index=id=>aircraft.findIndex(p=>p.id===id);
const pct=(n,max)=>Math.round(Math.max(0,Math.min(100,100*n/max)));
function stats(p,bonus){
 return [['SPEED',p.speed,94],['TURN',p.turn.toFixed(2),3.4],
 ['ARMOUR',Math.round(p.armour*bonus),135],['GUN DMG',+(p.damage*bonus).toFixed(2),19]]
 .map(entry=>'<span class="wg-stat"><span>'+entry[0]+'</span><i class="wg-meter"><i style="width:'+pct(Number(entry[1]),entry[2])+'%"></i></i><b>'+entry[1]+'</b></span>').join('');
}
function card(type,opts){
 opts=opts||{};
 const p=find(type),i=index(type),sel=!!opts.selected,fav=!!opts.preferred;
 const btn=document.createElement('button');btn.type='button';
 btn.className='plane-choice wg-card'+(sel?' selected':'')+(fav?' wg-preferred':'');
 btn.setAttribute('aria-pressed',String(sel));
 btn.setAttribute('aria-label',p.name+'; '+(opts.career?'choose for this sortie':'select aircraft'));
 btn.dataset[opts.career?'sortiePlane':'plane']=p.id;
 btn.innerHTML='<span class="wg-card-art wg-art-'+i+'" role="img" aria-label="Painted '+p.name+' aircraft"><small>'+(p.faction==='Axis'?'LUFTWAFFE':'RAF FIGHTER COMMAND')+' · 1940</small></span>'+
 '<span class="wg-card-copy"><span class="wg-card-title"><strong>'+p.name+'</strong><span class="wg-selected-label">'+(sel?'✓ SELECTED':'SELECT')+'</span></span>'+
 '<span class="wg-role">'+p.role+'</span><span class="wg-stats">'+stats(p,fav?1.1:1)+'</span>'+
 '<span class="wg-ability">✦ ABILITY: <b>'+p.ability+'</b></span>'+
 (fav?'<span class="wg-preferred-tag">★ SPECIALIST · +10% HULL / ARMOUR / GUN DAMAGE</span>':'')+'</span>';
 return btn;
}
let faction='Allies';
function switchFaction(value,trigger){
 faction=value==='Axis'?'Axis':'Allies';
 const root=document.getElementById('wingman-grid-mount');if(!root)return;
 root.querySelectorAll('[data-wg-faction]').forEach(tab=>{
  const selected=tab.dataset.wgFaction===faction;
  tab.classList.toggle('active',selected);tab.setAttribute('aria-pressed',String(selected));
 });
 root.querySelectorAll('.wg-card[data-plane]').forEach(button=>{button.hidden=find(button.dataset.plane).faction!==faction;});
 const selected=root.querySelector('.wg-card.selected[data-plane]');
 if(!selected||find(selected.dataset.plane).faction!==faction){
  const first=root.querySelector('.wg-card[data-plane]:not([hidden])');
  if(first){
   if(trigger)first.click();
   else root.querySelectorAll('.wg-card').forEach(item=>{
    const yes=item===first;item.classList.toggle('selected',yes);item.setAttribute('aria-pressed',String(yes));
   });
  }
 }
}
function refreshBadges(root){
 root.querySelectorAll('.wg-card').forEach(item=>{
  const flag=item.querySelector('.wg-selected-label');
  if(flag)flag.textContent=item.classList.contains('selected')?'✓ SELECTED':'SELECT';
 });
}
function init(){
 const mount=document.getElementById('wingman-grid-mount');if(!mount)return;
 const holder=document.createElement('div');holder.className='wg-main';
 holder.innerHTML='<div class="wg-toolbar"><div class="wg-heading"><strong>SELECT A SQUADRON</strong><small>Compare your aircraft before takeoff.</small></div>'+
 '<div class="wg-tabs" role="group" aria-label="Choose a squadron"><button type="button" class="wg-tab active" data-wg-faction="Allies" aria-pressed="true">◉ RAF / ALLIES</button>'+
 '<button type="button" class="wg-tab" data-wg-faction="Axis" aria-pressed="false">✠ LUFTWAFFE</button></div></div>';
 const cards=document.createElement('div');cards.className='wg-cards';cards.setAttribute('role','group');cards.setAttribute('aria-label','Choose aircraft');
 aircraft.forEach((p,i)=>cards.appendChild(card(p.id,{selected:i===0})));
 holder.appendChild(cards);
 const note=document.createElement('div');note.className='wg-note';note.setAttribute('role','status');
 note.textContent='THREE AIRCRAFT PER SQUADRON · SELECT ONE TO FLY';
 holder.appendChild(note);mount.appendChild(holder);
 mount.addEventListener('click',e=>{
  const tab=e.target.closest('[data-wg-faction]');
  if(tab){switchFaction(tab.dataset.wgFaction,true);return;}
  const item=e.target.closest('.wg-card[data-plane]');
  if(item){
    note.textContent=find(item.dataset.plane).name+' SELECTED · LAUNCH WHEN READY';
    requestAnimationFrame(()=>refreshBadges(mount));
  }
 });
 switchFaction('Allies',false);
}
window.WingmanGrid={aircraft,card,find,index,switchFaction};
init();
})();
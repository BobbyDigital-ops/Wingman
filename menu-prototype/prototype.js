(function(){
'use strict';
const aircraft=[
 {id:'fighter',name:'SPITFIRE',full:'Supermarine Spitfire Mk IX',group:'Allies',subtitle:'RAF · AGILE FIGHTER · OVERDRIVE',description:'The iconic all-rounder. Superb handling and firepower make the Spitfire a favourite in any situation.',speed:84,turn:94,armour:46,guns:78},
 {id:'heavy',name:'BEAUFIGHTER',full:'Bristol Beaufighter',group:'Allies',subtitle:'RAF · HEAVY FIGHTER · ARMOUR SHIELD',description:'Heavily armed and built to endure. A formidable hunter that rewards a deliberate approach.',speed:69,turn:48,armour:84,guns:94},
 {id:'bomber',name:'LANCASTER',full:'Avro Lancaster',group:'Allies',subtitle:'RAF · BOMBER · DEFENSIVE TURRETS',description:'A big, powerful airframe with defensive guns. It needs thoughtful flying to survive against nimble foes.',speed:48,turn:31,armour:94,guns:83},
 {id:'bf109',name:'BF 109E EMIL',full:'Messerschmitt Bf 109E',group:'Axis',subtitle:'LUFTWAFFE · AGILE FIGHTER · OVERDRIVE',description:'Fast, agile and dangerous in the hands of a capable ace. An excellent fighter for aggressive manoeuvres.',speed:87,turn:86,armour:42,guns:77},
 {id:'bf110',name:'BF 110',full:'Messerschmitt Bf 110',group:'Axis',subtitle:'LUFTWAFFE · HEAVY FIGHTER · ARMOUR SHIELD',description:'The Zerstörer is a twin-engine bruiser with punishing firepower and formidable durability.',speed:66,turn:46,armour:86,guns:94},
 {id:'he111',name:'HE 111',full:'Heinkel He 111',group:'Axis',subtitle:'LUFTWAFFE · MEDIUM BOMBER · TURRETS',description:'A sturdy Luftwaffe bomber with rear gunners. Trades manoeuvrability for staying power.',speed:50,turn:34,armour:92,guns:80}
];
const modes=[
 {id:'duel',name:'1 VS 1',subtitle:'A CLASSIC DOGFIGHT',description:'Head to head. Prove your skills in a pure duel.'},
 {id:'survival',name:'SURVIVAL',subtitle:'HOW LONG CAN YOU LAST?',description:'Face increasing waves of enemies. Stay in the air.'},
 {id:'triple',name:'FREE FOR ALL',subtitle:'EVERY PILOT FOR THEMSELVES',description:'Multiple pilots. One winner. It is a free for all.'},
 {id:'teams',name:'2 VS 2',subtitle:'TEAM UP',description:'Two aircraft per team. Fight alongside your AI wingman.'},
 {id:'challenge',name:'CHALLENGES',subtitle:'SPECIAL OPERATIONS',description:'Unique scenarios, tight timers and objectives.'}
];
const pilots=Array.isArray(window.WingmanRoster)?window.WingmanRoster:[];
const state={screen:'home',history:[],mode:'duel',plane:'fighter',faction:'Allies',pilotId:null,pilotFilter:'Allies',mission:0,careerStep:'pilot',difficulty:'standard',theatre:'channel',time:'day',sound:true,modal:null};
const app=document.querySelector('#viewport'),status=document.querySelector('#pilot-status');
const plane=id=>aircraft.find(a=>a.id===id)||aircraft[0];
const pilot=id=>pilots.find(x=>x.id===id)||pilots[0];
const chosenPilot=()=>pilot(state.pilotId);
const mode=()=>modes.find(m=>m.id===state.mode)||modes[0];
const safe=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function callsign(p){return p?.name?.match(/"([^"]+)"/)?.[1]||p?.name?.split(' ')[0]||'PILOT'}
function button(label,action,style='navy',extra=''){return '<button class="btn btn-'+style+'" '+extra+' data-action="'+action+'">'+label+'</button>'}
function sceneTitle(h,subtitle){return '<div class="screen-head"><h1>'+h+'</h1><p>'+subtitle+'</p></div>'}
function sceneWrap(name,body){return '<section class="view-shell screen-enter '+name+'">'+body+'</section>'}
function badge(group){return '<i class="flag '+(group==='Axis'?'axis':'')+'" aria-label="'+(group==='Axis'?'Luftwaffe':'RAF')+'"></i>'}
function planeOption(x){return '<button class="aircraft-tile '+(state.plane===x.id?'selected':'')+'" data-plane="'+x.id+'" aria-pressed="'+(state.plane===x.id)+'"><span class="aircraft-image"><canvas width="316" height="190" data-art="'+x.id+'"></canvas></span><span class="aircraft-caption">'+badge(x.group)+safe(x.name)+'</span></button>'}
function bars(x){return '<div class="bars">'+[['SPEED',x.speed],['TURN',x.turn],['ARMOUR',x.armour],['GUNS',x.guns]].map(([n,v])=>'<div class="bar"><span>'+n+'</span><span class="bar-meter"><i style="width:'+v+'%"></i></span><span>'+v+'</span></div>').join('')+'</div>'}
function home(){
 return '<section class="home scene screen-enter"><div class="home-left"><div><div class="home-brand"><div class="home-roundel"><b class="wing">≋</b><i class="roundel"></i><b class="wing">≋</b></div><h1>WINGMAN</h1><p>THE SKY IS THE BATTLEFIELD</p></div><div class="home-quote">SOME FIGHT FOR LAND.<br>WE FIGHT FOR TOMORROW.</div></div><div><div class="home-buttons">'+
 button('BEGIN OPERATIONS <span class="arrow">›</span>','operations','red')+
 button('ROAD TO ACE <span class="arrow">›</span>','career','navy')+
 button('PILOTS & SQUADRONS <span class="arrow">›</span>','pilots','navy')+
 button('OPTIONS <span class="arrow">›</span>','options','navy')+
 button('◖)) &nbsp; SOUND '+(state.sound?'ON':'OFF')+' <span class="arrow">›</span>','sound','navy')+
 '</div><div class="home-footer">PILOTS MAKE HISTORY &nbsp; • &nbsp; DESIGN PREVIEW</div></div></div></section>';
}
function operations(){
 return sceneWrap('operations',sceneTitle('SELECT OPERATION','DOGFIGHTS, BOMBERS, BROTHERS IN THE SKY')+
 '<div class="content"><div class="ops"><aside class="ops-art"><span class="pill small-tag">ROYAL AIR FORCE &nbsp; • &nbsp; 1940</span><div class="slogan">OWN THE SKY.<br>WRITE YOUR STORY.</div></aside><div class="operations-list">'+modes.map((m,i)=>
 '<button class="operation '+(state.mode===m.id?'selected':'')+'" data-mode="'+m.id+'" aria-pressed="'+(state.mode===m.id)+'"><span class="operation-art art-'+(i+1)+'"></span><span class="operation-copy"><strong>'+m.name+'</strong><em>'+m.subtitle+'</em><p>'+m.description+'</p></span><span class="chev">›</span></button>').join('')+
 '</div></div><div class="op-actions">'+button('← &nbsp; BACK','back','outline')+button('CONTINUE <span class="arrow">→</span>','aircraft','red')+'</div></div>');
}
function hangar(){
 const a=plane(state.plane);
 const items=(state.careerStep==='aircraft'&&state.history.includes('career'))?aircraft.filter(p=>p.group===chosenPilot()?.faction):aircraft;
 if(!items.some(p=>p.id===state.plane))state.plane=items[0]?.id||'fighter';
 const p=plane(state.plane);
 const isCareer=state.careerStep==='aircraft'&&state.history.includes('career');
 const heading=isCareer?'CHOOSE YOUR AIRCRAFT':'PREPARE FOR TAKEOFF';
 const caption=isCareer?'PICK AN AIRCRAFT FOR THIS CAREER SORTIE':'CHOOSE YOUR AIRCRAFT AND CONDITIONS';
 return sceneWrap('aircraft-view',sceneTitle(heading,caption)+
 '<div class="content aircraft-screen">'+
 '<div class="craft-top"><div class="craft-art"><div class="craft-nameplate"><h2>'+p.name+'</h2><small>'+p.subtitle+'</small></div></div><div class="craft-summary"><p>'+p.description+'</p>'+bars(p)+(isCareer&&chosenPilot()?'<span class="pill '+(chosenPilot().plane===p.id?'gold':'')+'">'+(chosenPilot().plane===p.id?'★ SPECIALIST: +10% HULL / ARMOUR / GUNS':'STANDARD AIRFRAME — NO PILOT BONUS')+'</span>':'')+'</div></div>'+
 '<div class="grid-aircraft">'+items.map(planeOption).join('')+'</div>'+
 '<div class="conditions"><label>AI DIFFICULTY<select data-setting="difficulty"><option value="rookie">ROOKIE</option><option value="standard">REGULAR</option><option value="ace">ACE</option></select></label><label>THEATRE<select data-setting="theatre"><option value="channel">ENGLISH CHANNEL</option><option value="alpine">ALPINE FRONT</option><option value="desert">DESERT</option><option value="storm">STORM FRONT</option></select></label><label>TIME OF DAY<select data-setting="time"><option value="day">DAY</option><option value="dusk">DUSK</option><option value="night">NIGHT</option></select></label></div>'+
 '<div class="stage-actions">'+button('← &nbsp; BACK','back','outline')+button(isCareer?'CONFIRM AIRCRAFT <span class="arrow">→</span>':'LAUNCH SORTIE <span class="arrow">→</span>','launch','gold')+'</div></div>');
}
function filteredPilots(){return pilots.filter(p=>state.pilotFilter==='All'||p.faction===state.pilotFilter)}
function pilotsPage(){
 let ps=filteredPilots();if(!ps.length)return sceneWrap('pilots-view',sceneTitle('SELECT PILOT','CHOOSE A CHARACTER'),'<div class="content"><p>Pilot data loading...</p></div>');
 if(!ps.find(p=>p.id===state.pilotId))state.pilotId=ps[0].id;
 const p=chosenPilot(),special=plane(p.plane);
 const cards=ps.map(item=>'<button class="pilot-card '+(state.pilotId===item.id?'selected':'')+'" data-pilot="'+item.id+'" aria-pressed="'+(state.pilotId===item.id)+'"><span class="pilot-portrait"><canvas width="96" height="112" data-portrait="'+item.id+'"></canvas></span><span class="pilot-info"><strong>'+safe(callsign(item)).toUpperCase()+'</strong><small>'+safe(item.faction==='Axis'?'LUFTWAFFE':'RAF')+' · '+safe(item.archetype)+'</small></span></button>').join('');
 return sceneWrap('pilots-view',sceneTitle('SELECT YOUR PILOT','40 DEFINED CHARACTERS • DISTINCT ABILITIES • YOUR ACE, YOUR STORY')+
 '<div class="content pilots-screen"><div class="filter-row"><span class="eyebrow">SQUADRON</span>'+[['All','ALL'],['Allies','RAF'],['Axis','LUFTWAFFE']].map(([v,n])=>'<button class="seg '+(state.pilotFilter===v?'selected':'')+'" data-filter="'+v+'">'+n+'</button>').join('')+'</div>'+
 '<div class="pilot-layout"><div class="pilot-cards">'+cards+'</div><aside class="pilot-detail"><div><div class="detail-portrait"><canvas width="96" height="112" data-portrait="'+p.id+'"></canvas></div><span class="pill">'+(p.faction==='Axis'?'LUFTWAFFE':'ROYAL AIR FORCE')+'</span><h2>'+safe(p.name)+'<small>'+safe(p.archetype)+' &nbsp; • &nbsp; '+safe(p.signature.toUpperCase())+'</small></h2></div><p>'+safe(p.bio)+'</p>'+
 '<div class="bonus">★ PREFERRED AIRCRAFT: <strong>'+safe(special.name)+'</strong><br>+10% HULL, ARMOUR & GUN DAMAGE</div>'+bars({speed:p.attributes.engine,turn:p.attributes.manoeuvrability,armour:p.attributes.gunnery,guns:p.attributes.gunnery})+
 button('CONFIRM THIS PILOT <span class="arrow">→</span>','confirm-pilot','red')+'</aside></div><div class="stage-actions">'+button('← &nbsp; BACK','back','outline')+'<span class="tiny">Pilot selection in this preview does not overwrite your current save.</span></div></div>');
}
function career(){
 let p=chosenPilot();if(!p){return sceneWrap('career-view',sceneTitle('ROAD TO ACE','CHOOSE YOUR ACE • CHALLENGE THE SKIES')+
 '<div class="content"><div class="career-layout"><div class="career-brief"><span class="pill">YOUR CAREER BEGINS HERE</span><h2>40 PILOTS.<br>ONE LEGEND.</h2><p>Confirm a fixed character, then choose a mission and a suitable aircraft before each sortie. Your preferred plane receives +10% hull, armour and primary gun damage.</p>'+
 button('CHOOSE YOUR PILOT <span class="arrow">→</span>','pick-career-pilot','red')+'</div><aside class="ops-art"><span class="pill small-tag">EIGHT RANKS • THREE LIVES</span><div class="slogan">EARN YOUR<br>WINGS.</div></aside></div></div>')}
 let missions=[{name:'PATROL INTERCEPT',sub:'RANK 1 • STANDARD',desc:'A lone enemy fighter has crossed the coast. Select your aircraft and intercept.'},{name:'HIGH ALTITUDE DUEL',sub:'RANK 1 • PRECISION',desc:'A rival ace is patrolling above the clouds. Choose between speed and survivability.'},{name:'DANGEROUS ESCORTS',sub:'RANK 1 • HARD',desc:'Two enemy fighters are flying together. Risk a tougher encounter for a greater story.'}];
 const m=missions[state.mission]||missions[0];
 return sceneWrap('career-view',sceneTitle('ROAD TO ACE','YOUR PILOT • YOUR AIRCRAFT • YOUR LEGEND')+
 '<div class="content"><div class="step-track"><span>1 PILOT CONFIRMED</span><span class="now">2 CHOOSE MISSION</span><span>3 CHOOSE AIRCRAFT</span></div>'+
 '<div class="career-layout"><div class="mission-grid">'+missions.map((x,i)=>'<button class="mission-card '+(state.mission===i?'selected':'')+'" data-mission="'+i+'"><strong>'+x.name+' <span>→</span></strong><span>'+x.sub+'</span><span>'+x.desc+'</span></button>').join('')+'</div>'+
 '<aside class="career-brief"><span class="pill">YOUR ACE</span><h2>'+safe(callsign(p)).toUpperCase()+'</h2><p>'+safe(p.name)+'<br>'+safe(p.faction)+' · '+safe(p.archetype)+' · '+safe(p.signature.toUpperCase())+'</p><div class="bonus">★ '+safe(plane(p.plane).name)+' SPECIALIST<br>+10% GUN DAMAGE, HULL & ARMOUR</div><div class="notices"><strong>SELECTED:</strong> '+m.name+'<br>CHALLENGE: '+m.sub+'</div>'+
 button('PICK AIRCRAFT <span class="arrow">→</span>','career-aircraft','red')+'</aside></div><div class="stage-actions">'+button('← &nbsp; BACK','back','outline')+button('CHANGE PILOT','change-pilot','navy')+'</div></div>');
}
function records(){return sceneWrap('records-view',sceneTitle('PILOT RECORDS','EVERY SORTIE COUNTS')+
 '<div class="content"><div class="options-layout"><div class="option-panel"><h2>FLIGHT RECORD</h2><p>This is the proposed visual design for the actual in-game stats page. This standalone prototype does not read or change your career save.</p><div class="notices">SORTIES &nbsp; —<br>VICTORIES &nbsp; —<br>ACE RANK &nbsp; —<br>BEST SURVIVAL &nbsp; —</div></div><div class="option-panel"><h2>DECORATIONS</h2><p>Medals and service records would appear here in the live implementation.</p><div class="bonus">★ FIRST VICTORY &nbsp; ★ TRIPLE ACE &nbsp; ★ WINGMAN LEGEND</div></div></div><div class="stage-actions">'+button('← &nbsp; BACK','back','outline')+button('CHOOSE PILOT','pilots','red')+'</div></div>')}
function options(){return sceneWrap('options-view',sceneTitle('OPTIONS','YOUR AIRCRAFT • YOUR RULES')+
 '<div class="content"><div class="options-layout"><div class="option-panel"><h2>GAMEPLAY</h2><label>DIFFICULTY <select data-setting="difficulty"><option value="rookie">ROOKIE</option><option value="standard">REGULAR</option><option value="ace">ACE</option></select></label><label>THEATRE <select data-setting="theatre"><option value="channel">ENGLISH CHANNEL</option><option value="alpine">ALPINE FRONT</option><option value="desert">DESERT</option><option value="storm">STORM</option></select></label><label>TIME OF DAY <select data-setting="time"><option value="day">DAY</option><option value="dusk">DUSK</option><option value="night">NIGHT</option></select></label></div><div class="option-panel"><h2>SOUND & DISPLAY</h2><label>SOUND <button class="toggle '+(state.sound?'on':'')+'" data-action="sound">'+(state.sound?'ON':'OFF')+'</button></label><p>Controls, accessibility settings and graphics quality can be added to this layout when the menu is integrated into the game.</p><div class="notices">A / D &nbsp; STEER<br>SPACE &nbsp; FIRE<br>E &nbsp; AIRCRAFT ABILITY<br>Q &nbsp; PILOT SKILL</div></div></div><div class="stage-actions">'+button('← &nbsp; BACK','back','outline')+button('RETURN HOME','home','navy')+'</div></div>')}
function render(){
 const handlers={home,operations,aircraft:hangar,pilots:pilotsPage,career,options,records};
 app.innerHTML=(handlers[state.screen]||home)();
 document.querySelectorAll('[data-nav]').forEach(n=>{n.classList.toggle('active',n.dataset.nav===state.screen);n.setAttribute('aria-current',n.dataset.nav===state.screen?'page':'false')});
 status.textContent=state.pilotId?callsign(chosenPilot()):'Guest Pilot';
 for(const el of app.querySelectorAll('select[data-setting]'))el.value=state[el.dataset.setting];
 paint();
 app.scrollTop=0;
}
function go(next){
 if(next!==state.screen){state.history.push(state.screen);state.screen=next;render();}
}
function back(){state.screen=state.history.pop()||'home';if(state.screen!=='aircraft')state.careerStep='pilot';render()}
function message(title,txt){state.modal={title,txt};const m=document.createElement('div');m.className='modal-cover';m.id='demo-modal';m.innerHTML='<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><span class="pill gold">WORKING MENU PROTOTYPE</span><h2 id="modal-title">'+safe(title)+'</h2><p>'+safe(txt)+'</p><div class="modal-actions">'+button('← KEEP EXPLORING','dismiss','navy')+'<a class="btn btn-red" href="../" target="_blank" rel="noopener">OPEN LIVE GAME ↗</a></div><span class="tiny">Menu actions are functional; combat launching is deliberately disabled in this isolated prototype.</span></div>';document.body.append(m);m.querySelector('button').focus()}
function act(action){
 if(action==='back'){back();return}
 if(['home','operations','aircraft','pilots','records','options','career'].includes(action)){if(action==='career'&&!state.pilotId)state.careerStep='pilot';go(action);return}
 if(action==='sound'){state.sound=!state.sound;render();return}
 if(action==='pick-career-pilot'){state.careerStep='pilot';state.pilotId=null;state.pilotFilter='Allies';go('pilots');return}
 if(action==='confirm-pilot'){
  if(!state.pilotId){return}state.faction=chosenPilot().faction;
  if(state.history.includes('career')){state.careerStep='mission';state.screen='career';state.history=state.history.filter(x=>x!=='career');render();}
  else{message('PILOT CONFIRMED',callsign(chosenPilot())+' is ready for duty. Open Road to Ace to choose your mission or explore the aircraft selection screen.');status.textContent=callsign(chosenPilot());}
  return;
 }
 if(action==='change-pilot'){state.pilotFilter=chosenPilot()?.faction||'Allies';go('pilots');return}
 if(action==='career-aircraft'){
  state.careerStep='aircraft';state.faction=chosenPilot().faction;
  state.plane=chosenPilot().plane;go('aircraft');return;
 }
 if(action==='launch'){
  const p=plane(state.plane),isCareer=state.careerStep==='aircraft'&&state.history.includes('career');
  message(isCareer?'CAREER SORTIE READY':'SORTIE READY',
   p.full+' selected. '+(isCareer?'Your pilot: '+chosenPilot().name+'. '+(chosenPilot().plane===p.id?'Preferred aircraft: the 10% bonus is active.':'Standard airframe: no specialist bonus.'):
   'Operation: '+mode().name+'.')+' In the integrated version this would start the actual Wingman combat engine. This prototype only demonstrates the menus.');
  return;
 }
 if(action==='dismiss'){document.querySelector('#demo-modal')?.remove();state.modal=null;return}
}
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-action],[data-screen],[data-mode],[data-plane],[data-pilot],[data-filter],[data-mission]');
 if(!t)return;
 if(t.dataset.screen){go(t.dataset.screen);return}
 if(t.dataset.action){act(t.dataset.action);return}
 if(t.dataset.mode){state.mode=t.dataset.mode;render();return}
 if(t.dataset.plane){state.plane=t.dataset.plane;render();return}
 if(t.dataset.pilot){state.pilotId=t.dataset.pilot;render();return}
 if(t.dataset.filter){state.pilotFilter=t.dataset.filter;let choices=filteredPilots();if(!choices.some(p=>p.id===state.pilotId))state.pilotId=choices[0]?.id||null;render();return}
 if(t.dataset.mission){state.mission=Number(t.dataset.mission);render();return}
});
document.addEventListener('change',e=>{if(e.target.matches('select[data-setting]'))state[e.target.dataset.setting]=e.target.value});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(state.modal)act('dismiss');else back()}});
let atlas=null,allies=null,germans=null;
function loadImage(src,cb){if(!src)return;const image=new Image();image.onload=()=>{cb(image);paint()};image.src=src}
function paint(){
 if(!atlas){}else{
  document.querySelectorAll('canvas[data-art]').forEach(canvas=>{
   const id=canvas.dataset.art,ctx=canvas.getContext('2d'),index=aircraft.findIndex(a=>a.id===id);
   if(index<0)return;
   const w=canvas.width,h=canvas.height;
   const gradient=ctx.createLinearGradient(0,0,0,h);
   gradient.addColorStop(0,index===3?'#e8bf91':'#b2d6df');
   gradient.addColorStop(1,index%2?'#53768c':'#c2a17b');
   ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
   ctx.filter='saturate(1.35) contrast(1.11)';ctx.drawImage(atlas,index*86,84,86,60,0,0,w,h);ctx.filter='none';
   ctx.fillStyle='#0c293635';ctx.fillRect(0,0,w,h);
   ctx.strokeStyle='#ffe5b38c';ctx.lineWidth=2;ctx.strokeRect(4,4,w-8,h-8);
  })
 }
 document.querySelectorAll('canvas[data-portrait]').forEach(canvas=>{
  let p=pilot(canvas.dataset.portrait);if(!p)return;
  let img=p.faction==='Axis'?germans:allies;if(!img)return;
  let index=p.faction==='Axis'?p.portrait-20:p.portrait;
  let cols=p.faction==='Axis'?4:8;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,96,112);
  ctx.drawImage(img,(index%cols)*96,Math.floor(index/cols)*112,96,112,0,0,96,112)
 })
}
loadImage(window.WingmanPaintedAtlas,img=>atlas=img);
loadImage(window.WingmanRosterPortraitAtlas,img=>allies=img);
loadImage(window.WingmanGermanPortraitAtlas,img=>germans=img);
render();
window.WingmanMenuPrototype={state,go,back,render,act,aircraft,modes,pilots,version:'variant1-standalone-v1'};
})();
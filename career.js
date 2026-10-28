/* Road to Ace — self-contained single-player campaign, saved locally. */
(()=>{
'use strict';
const STORE='wingman-road-to-ace-v1',MAX_RANK=8;
const PILOT_SKILLS=[['reverse','180° REVERSE'],['roll','BARREL ROLL'],['smoke','SMOKESCREEN'],['harden','HARDEN'],['deadeye','DEADEYE'],['cut','ENGINE CUT'],['dive','EMERGENCY DIVE']];

const AXIS=['bf109','bf110','he111'],ALLIES=['fighter','heavy','bomber'];
const CATALOG=[
 ['Arthur "Sparrow" Miles','fighter','rookie'],['James "Lucky" Mercer','fighter','rookie'],['Peter "Pip" Collins','heavy','rookie'],
 ['Friedrich "Finch" Bauer','bf109','rookie'],['Emil "Ghost" Hartmann','bf109','rookie'],['Otto "Tin Wing" Kruger','bf110','rookie'],
 ['Henry "Rook" Fletcher','fighter','standard'],['William "Red" Foster','heavy','standard'],['Douglas "Compass" Reed','bomber','standard'],
 ['Kurt "Jackal" Weber','bf109','standard'],['Erich "Knuckles" Vogel','bf110','standard'],['Hans "High Noon" Fischer','he111','standard'],
 ['Daniel "Skipper" Price','fighter','standard'],['Thomas "Bulldog" Grady','heavy','standard'],
 ['Lukas "Fox" Richter','bf109','standard'],['Karl "Iron" Neumann','bf110','standard'],
 ['Edward "Hawk" Bennett','fighter','ace'],['George "Mariner" Walsh','heavy','ace'],
 ['Adler "The Vulture" Klaus','bf109','ace'],['Walter "Sting" Engel','bf110','ace'],
 ['Michael "Northwind" Shaw','fighter','ace'],['Oliver "Anchor" Blake','bomber','ace'],
 ['Dietrich "Blackbird" Falk','bf109','ace'],['Rudolf "Wraith" Stein','bf110','ace'],
 ['Charles "Last Light" Morgan','fighter','ace'],['Wilhelm "The Baron" Adler','bf109','ace'],
 ['Hugh "Raven" Doyle','fighter','ace'],['Max "Nightwatch" Beck','bf109','ace']
].map((x,i)=>({id:'pilot-'+i,name:x[0],plane:x[1],skill:x[2],faction:AXIS.includes(x[1])?'Axis':'Allies'}));
const byId=Object.fromEntries(CATALOG.map((p,i)=>[p.id,{...p,appearance:appearance(i*47+9),attributes:{manoeuvrability:50+(i*17)%37,gunnery:48+(i*23)%40,engine:52+(i*11)%34}}]));
const aircraft={fighter:'Spitfire',heavy:'Beaufighter',bomber:'Lancaster',bf109:'Bf 109',bf110:'Bf 110',he111:'He 111'};
const screen=document.getElementById('career-screen'),menu=document.getElementById('menu'),result=document.getElementById('result');
const nav=document.getElementById('career-open'),licenceBtn=document.getElementById('career-license');
function load(){try{const o=JSON.parse(localStorage.getItem(STORE)||'null');return o?.profile?o:null;}catch{return null;}}
let data=load(),active=null,showing=false,view='ladder';
function save(){try{localStorage.setItem(STORE,JSON.stringify(data));}catch{}}
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function appearance(seed=0){
 const n=Number(seed)||0;
 return {face:n%5,skin:Math.floor(n/3)%5,hair:Math.floor(n/2)%6,
 headwear:Math.floor(n/5)%4,goggles:Math.floor(n/7)%3,scarf:Math.floor(n/11)%4,
 moustache:Math.floor(n/13)%3,monocle:Math.floor(n/17)%3,nose:Math.floor(n/19)%4};
}
function pilotPortrait(faction,look=0){
 const opt=typeof look==='object'?look:appearance(look);
 const axis=faction==='Axis';
 const skins=['#e9bf9b','#cfa384','#af795d','#845640','#f4d0ac'];
 const hairs=['#392e27','#8b6244','#b99353','#c5b58a','#322c2d','#6d4735'];
 const skin=skins[opt.skin%skins.length],hair=hairs[opt.hair%hairs.length];
 const coat=axis?'#546b65':'#656b53',trim=axis?'#bdc6b5':'#cbb887';
 const caps=['#','cap','helmet','none','beret'][opt.headwear%4+1]||'cap';
 const nose=[2,3,4,2.6][opt.nose%4],face=[24,22,26,23,25][opt.face%5];
 return `<svg class="pilot-avatar" viewBox="0 0 120 144" role="img" aria-label="${faction} pilot wearing a customised uniform">
 <defs><linearGradient id="bg${opt.face}${opt.skin}" x2=".8" y2="1"><stop stop-color="#758b8a"/><stop offset="1" stop-color="#273d43"/></linearGradient></defs>
 <rect width="120" height="144" fill="#364c50"/><path d="M3 0H117V144H3Z" fill="none" stroke="#d5c8a3" stroke-width="2"/>
 <path d="M0 127Q10 94 41 90L79 90Q111 95 120 128V144H0Z" fill="${coat}" stroke="#253637" stroke-width="2"/>
 <path d="M38 93L59 131L77 93L87 102L76 144H43L31 103Z" fill="${axis?'#414d4a':'#4e564a'}" stroke="${trim}" stroke-width="1.5"/>
 <path d="M49 93L59 109L70 93" fill="#e2c7a4" stroke="#bca482"/><path d="M51 91V75H70V91L60 101Z" fill="${skin}"/>
 <ellipse cx="60" cy="56" rx="${face}" ry="34" fill="${skin}" stroke="#764e3f" stroke-width=".7"/>
 <path d="M36 50Q33 18 59 16Q83 19 83 49Q75 32 61 32Q46 42 36 50" fill="${hair}"/>
 <path d="M40 58q7 -4 15 0m13 0q7 -4 13 0" fill="none" stroke="#40382f" stroke-width="2.2" stroke-linecap="round"/>
 <circle cx="48" cy="58" r="1.6" fill="#283735"/><circle cx="74" cy="58" r="1.6" fill="#283735"/>
 <path d="M60 56l${nose} 10l-4 1" fill="none" stroke="#a97159" stroke-width="1.4"/>
 <path d="M53 78q7 2 14-1" fill="none" stroke="#77483e" stroke-width="1.2"/>
 ${opt.moustache%3?'<path d="M58 72q-6 -4 -12 1q7 3 13 0q7 3 14-1q-7 -4 -13 0" fill="'+hair+'"/>':''}
 ${opt.monocle%3===1?'<circle cx="74" cy="57" r="10" stroke="#d9c593" stroke-width="2" fill="none"/><path d="M84 62Q88 83 85 101" stroke="#d9c593" fill="none"/>':''}
 ${opt.goggles%3===1?'<path d="M32 56H86" stroke="#534a3e" stroke-width="3"/><rect x="38" y="50" width="19" height="13" rx="4" fill="#98b8ba88" stroke="#c2ad84" stroke-width="2"/><rect x="64" y="50" width="19" height="13" rx="4" fill="#98b8ba88" stroke="#c2ad84" stroke-width="2"/>':''}
 ${opt.scarf%4?'<path d="M41 93Q59 107 77 91L83 98Q58 117 38 101Z" fill="'+(['#ac443e','#e3d2ae','#485f7e','#7d8f75'][opt.scarf%4])+'"/><path d="M72 101L83 130L72 128L62 104Z" fill="'+(['#ac443e','#e3d2ae','#485f7e','#7d8f75'][opt.scarf%4])+'"/>':''}
 ${caps==='cap'?'<path d="M30 41Q29 14 60 13Q90 14 89 42L77 35H40Z" fill="'+coat+'" stroke="'+trim+'" stroke-width="2"/><path d="M38 37Q62 32 88 37Q74 46 40 43Z" fill="'+coat+'" stroke="'+trim+'"/>':
 caps==='helmet'?'<path d="M31 48Q26 13 60 10Q94 13 89 48L81 62L77 34Q60 27 41 36L39 64Z" fill="#634d3b" stroke="'+trim+'" stroke-width="1.6"/><path d="M37 35L83 35" stroke="'+trim+'" stroke-width="3"/>':
 caps==='beret'?'<path d="M29 35Q20 17 57 12Q95 9 91 29L84 39Q62 33 31 41Z" fill="'+coat+'" stroke="'+trim+'" stroke-width="2"/>':''}
 ${opt.goggles%3===2?'<rect x="37" y="29" width="21" height="12" rx="5" fill="#8db3b8" stroke="#c8b893" stroke-width="3"/><rect x="63" y="29" width="21" height="12" rx="5" fill="#8db3b8" stroke="#c8b893" stroke-width="3"/>':''}
 <path d="M93 108l9 5m-9 2l9 5" stroke="${trim}" stroke-width="2"/>
 <path d="M15 130H105" stroke="#cfb98d" opacity=".5"/>
 </svg>`;
}
function makeChoices(run){
 const enemyFaction=run.faction==='Allies'?'Axis':'Allies',pool=CATALOG.filter(p=>p.faction===enemyFaction);
 // Stable selection for each visit to a rank; favour recurring rivals when possible.
 const seen=Object.keys(data.records||{}).filter(id=>byId[id]&&byId[id].faction===enemyFaction);
 const rng=(run.seed+run.rank*37+run.visits*19)>>>0;
 const shuffled=pool.map((p,i)=>({p,sort:((i*53+rng*17+i*i*11)%113)})).sort((a,b)=>a.sort-b.sort).map(o=>o.p);
 const picked=[];
 if(seen.length&&run.visits%2===1){const rival=byId[seen[(run.seed+run.rank)%seen.length]];if(rival)picked.push(rival);}
 for(const p of shuffled)if(picked.length<3&&!picked.some(q=>q.id===p.id))picked.push(p);
 return picked.map((p,i)=>({
  id:p.id,
  types:(run.rank>=3&&run.rank<MAX_RANK&&i===2&&run.rank%2===1)?[p.plane,shuffled.find(x=>x.id!==p.id&&x.plane!==p.plane)?.plane||p.plane]:[p.plane],
  difficulty:run.rank<2?'rookie':run.rank<5?'standard':'ace',
  arena:(run.rank+i)%4,
  attributes:p.attributes,
  label:p.name
 }));
}
function show(which='ladder'){
 if(!data&&!candidates.length)candidates=generateCandidates();
 showing=true;view=which;screen.hidden=false;menu.classList.add('hidden');result.classList.add('hidden');render();
}
function close(){showing=false;screen.hidden=true;window.WingmanGame?.showMenu();}
const ATTRS=['manoeuvrability','gunnery','engine'];
let candidates=[];
let selectedSkill='roll';
const SILLY_NAMES={Allies:{first:['Chocs','Bertie','Bangers','Nigel','Pip','Monty','Cecil','Basil','Waffles','Reginald','Archibald','Tally-Ho'],last:['McGinty','Wobblebottom','Puddington','Crumpet','Bumblesnatch','Flapworthy','Fotherington-Smythe','Porkington','Wingnut','Teacup','Muffinworth','Tweedle']},Axis:{first:['Dietrich','Günter','Wolfgang','Klaus','Otto','Fritz','Helmut','Hans','Rolf','Heinrich','Ludwig','Manfred'],last:['von Pooper','Schnitzelhosen','Wurstmeister','von Fluffel','Bratwurst','Knödelkopf','von Wobbel','Pumpernickel','Käsebrot','Schnurrbart','Blitzensocks','von Quack']}};
function recruitName(faction,seed){const pool=SILLY_NAMES[faction==='Axis'?'Axis':'Allies'];return pool.first[seed%pool.first.length]+' '+pool.last[Math.floor(seed/17)%pool.last.length];}

function rollAttributes(){
 const shuffled=[0,1,2].sort(()=>Math.random()-.5);
 const values=[82,65,53];
 return Object.fromEntries(shuffled.map((key,i)=>[ATTRS[key],values[i]+Math.floor(Math.random()*7)-3]));
}
function generateCandidates(){
 const pool=[];
 for(let i=0;i<3;i++){
  const seed=Math.floor(Math.random()*2147483647);
  pool.push({style:appearance(seed),attributes:rollAttributes(),id:seed});
 }
 return pool;
}
function candidatePicker(){
 return '<div class="candidate-grid">'+candidates.map((c,i)=>
  '<button type="button" data-candidate="'+i+'" class="candidate-card" aria-label="Select pilot '+(i+1)+'">'+
  '<div class="candidate-portrait">'+pilotPortrait(document.getElementById('career-faction')?.value||'Allies',c.style)+'</div>'+
  '<strong>'+escape(recruitName(document.getElementById('career-faction')?.value||'Allies',c.id))+'</strong>'+
  '<small>MANOEUVRABILITY '+c.attributes.manoeuvrability+'</small>'+
  '<small>GUNNERY '+c.attributes.gunnery+'</small>'+
  '<small>ENGINE '+c.attributes.engine+'</small>'+
  '<span>SELECT PILOT</span></button>').join('')+'</div>';
}
function createProfile(index){
 const chosen=candidates[index];if(!chosen)return;
 const name=document.getElementById('career-name')?.value.trim().slice(0,30)||recruitName(document.getElementById('career-faction')?.value||'Allies',chosen.id);
 const faction=document.getElementById('career-faction')?.value==='Axis'?'Axis':'Allies';
 airframeOffers=[];
 data={profile:{name,faction,style:chosen.style,attributes:chosen.attributes,skill:selectedSkill},wins:0,losses:0,kills:0,records:{},best:0,completed:0,run:null};
 save();view='licence';render();
}
const BASE_AIRCRAFT={fighter:{speed:82,turn:3.15,hull:130,armour:40},heavy:{speed:75,turn:1.85,hull:160,armour:96},bomber:{speed:66,turn:1.30,hull:180,armour:147},bf109:{speed:84,turn:3.05,hull:125,armour:42},bf110:{speed:77,turn:1.78,hull:160,armour:90},he111:{speed:69,turn:1.35,hull:175,armour:135}};
function rollAirframe(type){
 const b=BASE_AIRCRAFT[type];if(!b)return null;
 const trade=[-1,0,1].sort(()=>Math.random()-.5);
 return {type,stats:{speed:Math.round(b.speed*(1+trade[0]*.045)*10)/10,
 turn:Math.round(b.turn*(1+trade[1]*.045)*1000)/1000,
 hull:b.hull,armour:Math.round(b.armour*(1+trade[2]*.09))}};
}
let airframeOffers=[];
function prepareAirframes(){
 const types=data?.profile?.faction==='Axis'?AXIS:ALLIES;
 airframeOffers=types.map(rollAirframe);
}
function startRun(aircraftId){
 if(!data||!([...(data.profile.faction==='Allies'?ALLIES:AXIS)].includes(aircraftId)))return;
 const airframe=airframeOffers.find(a=>a.type===aircraftId)||rollAirframe(aircraftId);
 data.run={faction:data.profile.faction,aircraft:aircraftId,airframe,rank:1,lives:3,visits:0,seed:Math.floor(Math.random()*10000),choices:null};
 data.run.choices=makeChoices(data.run);save();view='ladder';render();
}
function fight(index){
 const run=data?.run;if(!run||active||!run.choices)return;
 const choice=run.choices[index];if(!choice)return;
 active=choice;screen.hidden=true;showing=false;
 window.WingmanGame.startCampaignFight(choice,run.aircraft,run.airframe);
}
function finishEncounter(won,encounter){
 if(!active||!data?.run)return;
 const run=data.run;
 const record=data.records[active.id]||(data.records[active.id]={wins:0,losses:0});
 if(won){data.wins++;data.kills+=active.types.length;record.wins++;run.rank++;data.best=Math.max(data.best,run.rank);
  if(run.rank>MAX_RANK){data.completed++;data.run=null;}
 }else{data.losses++;record.losses++;run.lives--;run.rank=Math.max(1,run.rank-1);
  if(run.lives<=0)data.run=null;
 }
 if(data.run){run.visits++;run.choices=makeChoices(run);}
 save();active=null;
 view='outcome';showing=true;screen.hidden=false;result.classList.add('hidden');renderOutcome(won,encounter);
}
function panel(title,body){screen.innerHTML=`<div class="career-panel"><div class="career-head"><h2>${title}</h2><button type="button" data-action="close">CLOSE ×</button></div>${body}</div>`;}
function renderOutcome(won,encounter){
 const resultTitle=won?'VICTORY — SORTIE COMPLETE':'DEFEAT — AIRCRAFT LOST';
 panel(resultTitle,`<p>${escape(encounter.label)} · ${escape(encounter.types.map(t=>aircraft[t]).join(' + '))}</p>
 <div class="career-stats"><span>${data?.run?'RANK '+data.run.rank:'RUN FINISHED'}</span><span>${data?.run?'♥ '+data.run.lives+' LIVES':'START AGAIN'}</span></div>
 <button class="career-primary" data-action="ladder">${data?.run?'CONTINUE LADDER':'VIEW PILOT LICENCE'}</button>`);
}
function appearanceControls(){
 const options={face:['Oval','Narrow','Broad','Angular','Round'],skin:['Fair','Warm','Tan','Deep','Pale'],
 hair:['Dark brown','Chestnut','Blond','Ash blond','Black','Auburn'],headwear:['Officer cap','Flying helmet','Bare head','Beret'],
 goggles:['None','Worn','On helmet'],scarf:['None','Red','Cream','Blue'],moustache:['Clean-shaven','Moustache','Moustache'],
 monocle:['None','Monocle','None'],nose:['Straight','Sharp','Broad','Small']};
 return '<div class="portrait-options">'+Object.entries(options).map(([k,arr])=>
  '<label>'+k.toUpperCase()+'<select id="career-'+k+'">'+arr.map((x,i)=>'<option value="'+i+'">'+x+'</option>').join('')+'</select></label>').join('')+'</div>';
}
function ladder(run){
 const rows=[];
 for(let rank=MAX_RANK;rank>=1;rank--){
  if(rank===run.rank){
    rows.push('<div class="ladder-rung current" id="active-rung"><div class="ladder-rank">RANK '+rank+' · YOUR NEXT CHALLENGE</div><div class="career-options">'+run.choices.map((op,i)=>{
      const p=byId[op.id],record=data.records[op.id];
      return '<button class="career-opponent" data-choice="'+i+'"><div class="career-small-photo">'+pilotPortrait(p.faction,p.appearance)+'</div><strong>'+escape(p.name)+'</strong><small>'+escape(op.types.map(t=>aircraft[t]).join(' + '))+' · '+op.difficulty.toUpperCase()+'</small>'+(op.types.length>1?'<em>1 VS 2</em>':'')+(record?'<em>'+record.wins+'–'+record.losses+(record.losses>record.wins?' · GRUDGE':'')+'</em>':'')+'<span>CHALLENGE →</span></button>';
    }).join('')+'</div></div>');
  }else rows.push('<div class="ladder-rung '+(rank<run.rank?'cleared':'locked')+'"><div class="ladder-rank">'+(rank===MAX_RANK?'★ ACE SHOWDOWN':'RANK '+rank)+'</div><span>'+(rank<run.rank?'CLEARED':'LOCKED')+'</span></div>');
 }
 return '<div class="ladder-scroll" role="region" aria-label="Full pilot ladder" tabindex="0">'+rows.join('')+'</div>';
}
function render(){
 if(!data){
  if(!candidates.length)candidates=generateCandidates();
  panel('CHOOSE YOUR PILOT',`<p class="career-muted">Three unique recruits. Pick one to keep across your sorties; each has a different flight speciality.</p>
  <div class="candidate-identity"><label>OPTIONAL CUSTOM NAME <input id="career-name" maxlength="30" placeholder="Keep your recruit&#39;s name" autocomplete="off"></label>
  <label>ALLEGIANCE <select id="career-faction"><option>Allies</option><option>Axis</option></select></label></div>
  <div id="candidate-picker">${candidatePicker()}</div>
  <label class="pilot-skill-picker">PILOT SKILL (Q)<select id="career-skill">${PILOT_SKILLS.map(([id,label])=>`<option value="${id}" ${id===selectedSkill?'selected':''}>${label}</option>`).join('')}</select></label>
  <button data-action="reroll">GENERATE THREE NEW RECRUITS</button>`);
  return;
 }
 const p=data.profile,run=data.run,losses=data.losses,wins=data.wins,ratio=losses?(wins/losses).toFixed(2):wins?wins.toFixed(2):'0.00';
 if(view==='licence'){
  const nemesis=Object.entries(data.records).filter(([,r])=>r.losses>r.wins).sort((a,b)=>(b[1].losses-b[1].wins)-(a[1].losses-a[1].wins))[0];
  panel('PILOT LICENCE',`<div class="career-licence"><div class="career-photo">${pilotPortrait(p.faction,p.style)}</div>
   <div><strong>${escape(p.name)}</strong><small>${p.faction.toUpperCase()} · ACTIVE SERVICE</small>
   <p>ACTIVE SKILL <b>${escape(PILOT_SKILLS.find(x=>x[0]===(p.skill||'roll'))?.[1]||'BARREL ROLL')}</b></p><p>MANOEUVRABILITY <b>${p.attributes?.manoeuvrability??65}</b></p><p>GUNNERY <b>${p.attributes?.gunnery??65}</b></p><p>ENGINE HANDLING <b>${p.attributes?.engine??65}</b></p><p>CONFIRMED KILLS <b>${data.kills}</b></p><p>VICTORIES <b>${wins}</b></p><p>DEFEATS <b>${losses}</b></p>
   <p>WIN / LOSS <b>${ratio}</b></p><p>HIGHEST RANK <b>${Math.min(MAX_RANK,data.best||1)}</b></p>
   <p>NEMESIS <b>${nemesis?escape(byId[nemesis[0]]?.name||'Unknown'):'None yet'}</b></p>
   <p>ACE RUNS COMPLETED <b>${data.completed}</b></p></div></div>
   <button class="career-primary" data-action="ladder">ROAD TO ACE</button>`);
  return;
 }
 if(!run){
  if(airframeOffers.length!==3)prepareAirframes();
  panel('ROAD TO ACE',`<p>${escape(p.name)} · ${p.faction}. Choose one aircraft for your entire run. Three lives; a defeat costs a life and drops you one rank.</p>
  <p class="career-muted">Win eight ranks of tactical dogfights to challenge the summit. Opponents are named, and past defeats build grudges.</p>
  <div class="career-planes">${airframeOffers.map(a=>`<button class="airframe-card" data-aircraft="${a.type}"><strong>${aircraft[a.type]}</strong><small>SPEED ${a.stats.speed}</small><small>TURN ${a.stats.turn}</small><small>HULL ${a.stats.hull}</small><small>ARMOUR ${a.stats.armour}</small><span>LOCK IN AIRCRAFT</span></button>`).join('')}</div>
  <button data-action="licence">VIEW PILOT LICENCE</button>`);
  return;
 }
 panel('ROAD TO ACE',`<div class="career-stats"><span>${escape(p.name)} · ${aircraft[run.aircraft]}</span><span>RANK ${run.rank}/${MAX_RANK}</span><span>${'♥'.repeat(run.lives)}${'♡'.repeat(3-run.lives)}</span></div>
 <p class="career-muted">Climb the full ladder. Three opponents at your current rank; earlier ranks remain visible below.</p>
 ${ladder(run)}<button data-action="licence">VIEW PILOT LICENCE</button>`);
 const marker=screen.querySelector('#active-rung');if(marker)marker.scrollIntoView({block:'center'});

}
screen.addEventListener('click',e=>{
 const el=e.target.closest('button');if(!el)return;
 const action=el.dataset.action;
 if(action==='close')close();
 if(action==='reroll'){candidates=generateCandidates();render();}
 if(el.dataset.candidate!==undefined)createProfile(Number(el.dataset.candidate));
 if(action==='ladder'){view=data?.run?'ladder':'licence';if(data&&!data.run)view='ladder';render();}
 if(action==='licence'){view='licence';render();}
 if(el.dataset.aircraft)startRun(el.dataset.aircraft);
 if(el.dataset.choice!==undefined)fight(Number(el.dataset.choice));
});
screen.addEventListener('change',e=>{
 if(e.target.id==='career-skill'){selectedSkill=e.target.value;}
 if(e.target.id==='career-faction'&&!data){
  const picker=document.getElementById('candidate-picker');
  if(picker)picker.innerHTML=candidatePicker();
 }
});
nav.addEventListener('click',()=>show('ladder'));licenceBtn.addEventListener('click',()=>show('licence'));
window.WingmanCareer={finishEncounter,open:show};
})();

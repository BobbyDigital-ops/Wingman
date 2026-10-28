/* Road to Ace — self-contained single-player campaign, saved locally. */
(()=>{
'use strict';
const STORE='wingman-road-to-ace-v1',MAX_RANK=8;
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
const byId=Object.fromEntries(CATALOG.map(p=>[p.id,p]));
const aircraft={fighter:'Spitfire',heavy:'Beaufighter',bomber:'Lancaster',bf109:'Bf 109',bf110:'Bf 110',he111:'He 111'};
const screen=document.getElementById('career-screen'),menu=document.getElementById('menu'),result=document.getElementById('result');
const nav=document.getElementById('career-open'),licenceBtn=document.getElementById('career-license');
function load(){try{const o=JSON.parse(localStorage.getItem(STORE)||'null');return o?.profile?o:null;}catch{return null;}}
let data=load(),active=null,showing=false,view='ladder';
function save(){try{localStorage.setItem(STORE,JSON.stringify(data));}catch{}}
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function pilotPortrait(faction,style=0){
 const axis=faction==='Axis',coat=axis?'#63766b':'#706e54',trim=axis?'#a9b6a5':'#c2b496';
 return `<svg class="pilot-avatar" viewBox="0 0 110 130" role="img" aria-label="${faction} pilot in uniform">
 <rect width="110" height="130" fill="#33434a"/><path d="M0 108Q28 79 55 83Q83 78 110 108V130H0Z" fill="${coat}"/>
 <path d="M24 94L41 81L55 112L67 81L88 96L76 130H33Z" fill="#354941" stroke="${trim}" stroke-width="2"/>
 <path d="M44 81V66H68V82L56 96Z" fill="#c59b7e"/>
 <ellipse cx="56" cy="49" rx="25" ry="33" fill="#d2ab8d"/><path d="M31 46Q28 18 44 15Q66 9 79 27L81 43Q75 29 67 29Q47 34 31 46Z" fill="${style%2?'#43382c':'#514638'}"/>
 <path d="M36 50h13m15 0h13" stroke="#38372f" stroke-width="2"/><path d="M53 65q4 4 9 0" fill="none" stroke="#8b6355"/>
 <path d="M27 34Q26 8 55 8Q85 8 84 35L71 30L39 30Z" fill="${coat}" stroke="${trim}" stroke-width="2"/>
 <path d="M38 27H75" stroke="${trim}" stroke-width="2"/>
 <path d="M45 18h20l-10 7Z" fill="${trim}"/>
 <path d="M75 105l5 4m-5 3l5 4" stroke="${trim}" stroke-width="2"/>
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
  label:p.name
 }));
}
function show(which='ladder'){
 showing=true;view=which;screen.hidden=false;menu.classList.add('hidden');result.classList.add('hidden');render();
}
function close(){showing=false;screen.hidden=true;window.WingmanGame?.showMenu();}
function createProfile(){
 const name=document.getElementById('career-name')?.value.trim().slice(0,30)||'Unknown Pilot';
 const faction=document.getElementById('career-faction')?.value==='Axis'?'Axis':'Allies';
 const style=Number(document.getElementById('career-portrait')?.value||0);
 data={profile:{name,faction,style},wins:0,losses:0,kills:0,records:{},best:0,completed:0,run:null};
 save();view='licence';render();
}
function startRun(aircraftId){
 if(!data||!([...(data.profile.faction==='Allies'?ALLIES:AXIS)].includes(aircraftId)))return;
 data.run={faction:data.profile.faction,aircraft:aircraftId,rank:1,lives:3,visits:0,seed:Math.floor(Math.random()*10000),choices:null};
 data.run.choices=makeChoices(data.run);save();view='ladder';render();
}
function fight(index){
 const run=data?.run;if(!run||active||!run.choices)return;
 const choice=run.choices[index];if(!choice)return;
 active=choice;screen.hidden=true;showing=false;
 window.WingmanGame.startCampaignFight(choice,run.aircraft);
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
function render(){
 if(!data){
  panel('CREATE YOUR PILOT',`<div class="career-layout"><div class="career-photo" id="career-photo">${pilotPortrait('Allies')}</div><div class="career-form">
   <label>PILOT NAME<input id="career-name" maxlength="30" placeholder="Your name or callsign" autocomplete="off"></label>
   <label>ALLEGIANCE<select id="career-faction"><option>Allies</option><option>Axis</option></select></label>
   <label>PORTRAIT<select id="career-portrait"><option value="0">Pilot A</option><option value="1">Pilot B</option></select></label>
   <p class="career-muted">Your uniform, aircraft selection and opponents will reflect your allegiance.</p>
   <button class="career-primary" data-action="create">ISSUE PILOT LICENCE</button></div></div>`);
  return;
 }
 const p=data.profile,run=data.run,losses=data.losses,wins=data.wins,ratio=losses?(wins/losses).toFixed(2):wins?wins.toFixed(2):'0.00';
 if(view==='licence'){
  const nemesis=Object.entries(data.records).filter(([,r])=>r.losses>r.wins).sort((a,b)=>(b[1].losses-b[1].wins)-(a[1].losses-a[1].wins))[0];
  panel('PILOT LICENCE',`<div class="career-licence"><div class="career-photo">${pilotPortrait(p.faction,p.style)}</div>
   <div><strong>${escape(p.name)}</strong><small>${p.faction.toUpperCase()} · ACTIVE SERVICE</small>
   <p>CONFIRMED KILLS <b>${data.kills}</b></p><p>VICTORIES <b>${wins}</b></p><p>DEFEATS <b>${losses}</b></p>
   <p>WIN / LOSS <b>${ratio}</b></p><p>HIGHEST RANK <b>${Math.min(MAX_RANK,data.best||1)}</b></p>
   <p>NEMESIS <b>${nemesis?escape(byId[nemesis[0]]?.name||'Unknown'):'None yet'}</b></p>
   <p>ACE RUNS COMPLETED <b>${data.completed}</b></p></div></div>
   <button class="career-primary" data-action="ladder">ROAD TO ACE</button>`);
  return;
 }
 if(!run){
  panel('ROAD TO ACE',`<p>${escape(p.name)} · ${p.faction}. Choose one aircraft for your entire run. Three lives; a defeat costs a life and drops you one rank.</p>
  <p class="career-muted">Win eight ranks of tactical dogfights to challenge the summit. Opponents are named, and past defeats build grudges.</p>
  <div class="career-planes">${(p.faction==='Allies'?ALLIES:AXIS).map(type=>`<button data-aircraft="${type}">${aircraft[type]}</button>`).join('')}</div>
  <button data-action="licence">VIEW PILOT LICENCE</button>`);
  return;
 }
 const choices=run.choices||[];
 panel('ROAD TO ACE',`<div class="career-stats"><span>${escape(p.name)} · ${aircraft[run.aircraft]}</span><span>RANK ${run.rank}/${MAX_RANK}</span><span>${'♥'.repeat(run.lives)}${'♡'.repeat(3-run.lives)}</span></div>
 <p class="career-muted">${run.rank===MAX_RANK?'FINAL APPROACH — defeat the elite to earn your wings.':'Choose your next opponent. Every victory climbs a rank; defeat loses a life and one rank.'}</p>
 <div class="career-options">${choices.map((op,i)=>{const rival=byId[op.id],r=data.records[op.id];return `<button class="career-opponent" data-choice="${i}">
  <div class="career-small-photo">${pilotPortrait(rival.faction,i)}</div>
  <strong>${escape(rival.name)}</strong><small>${escape(op.types.map(t=>aircraft[t]).join(' + '))} · ${op.difficulty.toUpperCase()}</small>
  ${op.types.length>1?'<em>1 vs 2 — DOUBLE THREAT</em>':''}
  ${r?`<em>${r.wins} WINS · ${r.losses} LOSSES ${r.losses>r.wins?'· GRUDGE':''}</em>`:''}
  <span>CHALLENGE PILOT →</span></button>`}).join('')}</div>
 <button data-action="licence">VIEW PILOT LICENCE</button>`);
}
screen.addEventListener('click',e=>{
 const el=e.target.closest('button');if(!el)return;
 const action=el.dataset.action;
 if(action==='close')close();
 if(action==='create')createProfile();
 if(action==='ladder'){view=data?.run?'ladder':'licence';if(data&&!data.run)view='ladder';render();}
 if(action==='licence'){view='licence';render();}
 if(el.dataset.aircraft)startRun(el.dataset.aircraft);
 if(el.dataset.choice!==undefined)fight(Number(el.dataset.choice));
});
screen.addEventListener('change',e=>{
 if(['career-faction','career-portrait'].includes(e.target.id)){
  const f=document.getElementById('career-faction').value;
  document.getElementById('career-photo').innerHTML=pilotPortrait(f,Number(document.getElementById('career-portrait').value));
 }
});
nav.addEventListener('click',()=>show('ladder'));licenceBtn.addEventListener('click',()=>show('licence'));
window.WingmanCareer={finishEncounter,open:show};
})();

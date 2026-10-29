/* Wingman refined RAF live-interface integration — independent of legacy CSS. */
(function(){'use strict';
const host=document.createElement('div');host.id='wingman-raf-root';
const root=host.attachShadow({mode:'open'});
root.innerHTML=`<link rel="stylesheet" href="./src/ui/raf-ui.css?v=20261029-1"><div class="app" id="app"><header class="topbar">
<button class="brand-small" data-go="home">WINGMAN</button>
<nav class="nav" aria-label="Main navigation"><button data-go="home">HOME</button><button data-go="operations">OPERATIONS</button><button data-go="aircraft">AIRCRAFT</button><button data-go="pilots">PILOTS</button><button data-go="records">STATS</button></nav>
<span class="wing-crest"><span>≪</span><i class="roundel"></i><span>≫</span></span><span class="squadron" id="squadron">SQUADRON <strong>Guest Pilot</strong></span><button class="gear" data-go="options" aria-label="Options">⚙</button></header>
<main class="stage" id="stage" aria-live="polite"></main></div>`;
document.body.appendChild(host);
const ASSET_IMAGES=window.WingmanRafAssets||{};
for(const [name,img] of Object.entries(ASSET_IMAGES))host.style.setProperty('--raf-img-'+name,'url("'+img+'")');
const OP=[['1 VS 1','Classic dogfight','A pure head-to-head duel.'],['SURVIVAL','How long can you last?','Increasing waves of enemy fighters.'],['FREE FOR ALL','Every pilot for themselves','Three aircraft, one survivor.'],['2 VS 2','Team up','Fight beside an allied AI wingman.'],['CHALLENGES','Special operations','Timed missions and unique conditions.']];
const PLANES=[['SPITFIRE','RAF · AGILE FIGHTER · OVERDRIVE','The iconic all-rounder. Superb handling and firepower.',78,91,39,'RAF'],['BEAUFIGHTER','RAF · HEAVY FIGHTER · SHIELD','Twin-engine power. Durable, heavily armed and purposeful.',72,56,77,'RAF'],['LANCASTER','RAF · BOMBER · REAR GUNNERS','Heavy armour and defensive guns for difficult missions.',59,30,93,'RAF'],['BF 109E EMIL','LUFTWAFFE · FIGHTER · OVERDRIVE','Fast, agile and made for decisive offensive manoeuvres.',81,88,38,'LUFTWAFFE'],['BF 110 ZERSTÖRER','LUFTWAFFE · HEAVY FIGHTER','A twin-engine destroyer with powerful forward armament.',72,53,80,'LUFTWAFFE'],['HEINKEL HE 111','LUFTWAFFE · MEDIUM BOMBER','Survive through solid armour and defensive fire.',60,34,91,'LUFTWAFFE']];
const ROSTER=window.WingmanRoster||[];
const PILOTS=ROSTER.map(p=>[p.name,({fighter:'Spitfire',heavy:'Beaufighter',bomber:'Lancaster',bf109:'Bf 109E Emil',bf110:'Bf 110 Zerstörer',he111:'He 111'})[p.plane],(p.signature||'roll').toUpperCase(),p.faction==='Axis'?'LUFTWAFFE':'RAF',p.id,p.plane,p]);
const S={pilotPage:0,careerEntry:false,screen:'home',back:[],operation:0,plane:0,pilot:0,pilotConfirmed:false,pilotFilter:'ALL',mission:0,career:false,modeBefore:'home',difficulty:'regular',theatre:'english-channel',time:'day',sound:true,referenceFrom:'home'};
const PLANE_IDS=['fighter','heavy','bomber','bf109','bf110','he111'];
const PLANE_LABELS={fighter:'Spitfire',heavy:'Beaufighter',bomber:'Lancaster',bf109:'Bf 109E Emil',bf110:'Bf 110 Zerstörer',he111:'Heinkel He 111'};
const GUN_STATS=[70,91,66,70,95,64];
const getCareer=()=>{try{return JSON.parse(localStorage.getItem('wingman-road-to-ace-v1')||'null')}catch{return null}};
const factionOfPilot=()=>ROSTER[S.pilot]?.faction||'Allies';
function pilotImageCss(p){const index=Number(p.portrait)||0,isAxis=p.faction==='Axis';const col=isAxis?4:8,row=isAxis?5:4;
 const x=(index%col)/(col-1)*100,y=Math.floor(index/col)/(row-1)*100;
 return 'background-image:url("'+(isAxis?window.WingmanGermanPortraitAtlas:window.WingmanRosterPortraitAtlas)+'");background-position:'+x+'% '+y+'%;';}
function syncPilot(){const d=getCareer(),idx=ROSTER.findIndex(p=>p.id===d?.profile?.rosterId);if(idx>=0){S.pilot=idx;S.pilotConfirmed=true;}}
function realStart(){
 const mode=['duel','survival','triple','teams','challenge'][S.operation]||'duel';
 window.WingmanFlow?.setMode?.(mode);
 const selected=document.querySelector('#menu [data-plane="'+PLANE_IDS[S.plane]+'"]');selected?.click();
 const difficulty=document.getElementById('difficulty-select');if(difficulty)difficulty.value=S.difficulty==='regular'?'standard':S.difficulty;
 const arena=document.getElementById('arena-select');if(arena)arena.value=String(({alpine:0,'english-channel':1,desert:2,storm:3})[S.theatre]??0);
 document.getElementById('start')?.click();syncOverlay();
}
function realSelectPilot(){
 const wanted=ROSTER[S.pilot],existing=getCareer();if(!wanted)return false;
 if(existing?.profile?.rosterId===wanted.id){S.pilotConfirmed=true;return true}
 // Existing game handles career reset confirmation before replacing a pilot.
 window.WingmanCareer?.open?.('select');
 const selector=document.getElementById('career-faction');if(selector){selector.value=wanted.faction;selector.dispatchEvent(new Event('change',{bubbles:true}))}
 const offset=ROSTER.filter(x=>x.faction===wanted.faction).findIndex(x=>x.id===wanted.id);
 if(offset<0)return false;
 document.querySelector('#career-screen [data-candidate="'+offset+'"]')?.click();
 if(getCareer()?.profile?.rosterId!==wanted.id)return false;
 S.pilotConfirmed=true;return true;
}
function realBeginCareer(){window.WingmanCareer?.open?.('ladder');document.querySelector('#career-screen [data-action="begin-run"]')?.click();S.mission=0;}
function realPrepareCareer(){
 window.WingmanCareer?.open?.('ladder');document.querySelector('#career-screen #active-rung [data-choice="'+S.mission+'"]')?.click();
 if(!document.querySelector('#career-screen [data-sortie-plane]'))return false;
 const idx=PLANE_IDS.indexOf(getCareer()?.profile?.plane);S.plane=idx>=0?idx:(factionOfPilot()==='Axis'?3:0);return true;
}
function realLaunchCareer(){
 const chosen=PLANE_IDS[S.plane];const el=document.querySelector('#career-screen [data-sortie-plane="'+chosen+'"]');if(!el)return;
 el.click();document.querySelector('#career-screen [data-action="confirm-sortie-aircraft"]')?.click();syncOverlay();
}
function syncOverlay(){
 const menu=document.getElementById('menu'),career=document.getElementById('career-screen');
 const playing=menu?.classList.contains('hidden')&&career?.hidden===true;
 host.hidden=!!playing;
}
const stage=root.querySelector('#stage');
const nav=root.querySelector('.nav');
const photo=n=>ASSET_IMAGES[n];
const txt=(s)=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(text,action,cl='navy',extra='')=>`<button type="button" class="btn ${cl}" data-action="${action}" ${extra}>${text}</button>`;
const actions=(back,next,style='red')=>`<div class="screen-actions">${btn('← &nbsp; BACK','back','outline')}${btn(next===undefined?'CONTINUE →':next,'next',style)}</div>`;
function header(title,subtitle){return `<div class="section-header"><h1>${title}</h1><p>${subtitle}</p></div>`}
function home(){return `<section class="frame poster-home v4-home">
  <div class="home-left"><div class="home-identity"><div class="home-roundel"><i class="roundel"></i><span>RAF FIGHTER COMMAND · 1940</span></div><h1 class="home-wordmark">WINGMAN</h1></div><div class="home-buttons">
  ${btn('BEGIN OPERATIONS <span class="chevron">›</span>','operations','red')}
  ${btn('ROAD TO ACE <span class="chevron">›</span>','career','navy')}
  ${btn('PILOTS <span class="chevron">›</span>','pilots','navy')}
  ${btn('AIRCRAFT <span class="chevron">›</span>','aircraft','navy')}
  ${btn('OPTIONS <span class="chevron">›</span>','options','navy')}
  </div><div class="home-subnote">NO. 11 GROUP &nbsp; · &nbsp; OPERATIONS ROOM</div></div><div class="home-artwork" aria-label="Original Spitfire painting from the supplied mockup"></div></section>`;}
function operations(){return `<section class="frame poster-operations"><div class="operations-top" role="img" aria-label="Original painted Spitfire and Select Operation illustration"></div><div class="operations-main">
 <div class="operations-scene"><strong>OPERATIONS<br>1940</strong></div><div class="operation-area"><div class="operation-list">
 ${OP.map((op,i)=>`<button type="button" class="operation-ref ${S.operation===i?'selected':''}" aria-label="${op.join(' — ')}" aria-pressed="${S.operation===i}" data-op="${i}"><img class="operation-cover" src="${photo('operation-art-'+i)}" alt=""/><span class="operation-copy"><strong>${op[0]}</strong><small>${op[1].toUpperCase()}</small><span>${op[2]}</span></span><b class="operation-chevron">›</b></button>`).join('')}
 </div>${actions('back','CONTINUE →')}</div></div></section>`;}
function stat(label,n){return `<div><span>${label}</span><i><b style="width:${n}%"></b></i></div>`}
function aircraft(){
 const career=S.career;
 const owned=factionOfPilot()==='Axis'?[3,4,5]:[0,1,2];
 const visible=career?owned:(S.aircraftFaction==='Axis'?[3,4,5]:[0,1,2]);
 if(!visible.includes(S.plane)) S.plane=visible[0];
 const controls=career?'PILOT SPECIALIST (+10% ON PREFERRED AIRCRAFT)':'CHOOSE YOUR SQUADRON';
 return `<section class="frame aircraft-screen production-aircraft">
 <div class="aircraft-head"><h1>PREPARE FOR TAKEOFF</h1><span>${career?'ROAD TO ACE · RANK '+(getCareer()?.run?.rank||1):'FIGHTER COMMAND · AIRCRAFT SELECTION'}</span></div>
 <div class="aircraft-content"><div class="raf-campaign-header"><strong>${controls}</strong>${career?'':`<div class="aircraft-tabs">${btn('◉ RAF','faction-raf',S.aircraftFaction!=='Axis'?'gold':'navy')}${btn('✠ LUFTWAFFE','faction-axis',S.aircraftFaction==='Axis'?'gold':'navy')}</div>`}</div>
 <div class="plane-grid">${visible.map(i=>{
 const p=PLANES[i],fav=career&&ROSTER[S.pilot]?.plane===PLANE_IDS[i];
 return `<button type="button" class="raf-plane-card ${S.plane===i?'selected':''}" data-plane="${i}" aria-label="Select ${p[0]}" aria-pressed="${S.plane===i}">
 <img src="${photo('aircraft-art-'+i)}" alt="Original painted ${p[0]} aircraft artwork"/>
 <span class="plane-caption">${i<3?'◉':'✠'} ${p[0]}</span><span class="plane-role">${p[1]}</span>
 <span class="plane-stats">${[['SPEED',p[3]],['TURN',p[4]],['ARMOUR',p[5]],['FIREPOWER',GUN_STATS[i]]].map(([name,v])=>`<span class="plane-stat"><span>${name}</span><i><b style="width:${v}%"></b></i><strong>${v}</strong></span>`).join('')}</span>
 <span class="plane-ability">✦ ABILITY: ${['OVERDRIVE','SHIELD','GUNNERS','OVERDRIVE','SHIELD','GUNNERS'][i]}</span>
 ${fav?'<span class="plane-specialist">★ +10% HULL / ARMOUR / WEAPON DAMAGE</span>':''}</button>`;}).join('')}</div>
 <div class="conditions"><label>AI DIFFICULTY<select data-setting="difficulty"><option value="rookie">ROOKIE</option><option value="regular">REGULAR</option><option value="ace">ACE</option></select></label><label>THEATRE<select data-setting="theatre"><option value="english-channel">ENGLISH CHANNEL</option><option value="alpine">ALPINE FRONT</option><option value="desert">DESERT</option><option value="storm">STORM FRONT</option></select></label><label>TIME OF DAY<select data-setting="time"><option value="day">DAY</option><option value="dusk">DUSK</option><option value="night">NIGHT</option></select></label></div>
 ${actions('back',career?'CONFIRM AIRCRAFT & FLY →':'SCRAMBLE →','gold')}</div></section>`;
}
function pilots(){
 const available=ROSTER.map((p,i)=>({p,i})).filter(x=>S.pilotFilter==='ALL'||(x.p.faction==='Axis'?'LUFTWAFFE':'RAF')===S.pilotFilter);
 const per=6,pages=Math.ceil(available.length/per);S.pilotPage=Math.max(0,Math.min(pages-1,S.pilotPage));
 const shown=available.slice(S.pilotPage*per,(S.pilotPage+1)*per);
 const selected=ROSTER[S.pilot]||ROSTER[0];
 return `<section class="frame pilot-screen">${header('SELECT PILOT','FIGHTER COMMAND PERSONNEL · 40 UNIQUE PILOTS')}
 <div class="inner"><div class="pilot-preview">
 <div style="display:flex;gap:8px;justify-content:flex-end">${['ALL','RAF','LUFTWAFFE'].map(f=>`<button class="btn ${S.pilotFilter===f?'gold':'navy'}" style="min-height:34px;font-size:15px" data-filter="${f}">${f}</button>`).join('')}</div>
 <div class="pilot-grid">${shown.map(({p,i})=>`<button type="button" class="pilot-card ${S.pilot===i?'selected':''}" data-pilot="${i}" aria-label="Choose ${txt(p.name)}" aria-pressed="${S.pilot===i}"><span class="raf-pilot-image ${p.faction==='Axis'?'axis':''}" style="${pilotImageCss(p)}"></span><span class="raf-pilot-name">${txt(p.name.split('"')[1]||p.name.split(' ')[0])}</span></button>`).join('')}</div>
 <div class="pilot-copy"><strong>${txt(selected.name)}</strong> · ${selected.faction==='Axis'?'LUFTWAFFE':'RAF'} · SIGNATURE: ${txt((selected.signature||'ROLL').toUpperCase())} · PREFERRED AIRCRAFT: ${txt(PLANE_LABELS[selected.plane])}<br><span style="color:#ffd380">★ +10% HULL, ARMOUR & GUN DAMAGE IN PREFERRED AIRCRAFT</span></div>
 <div class="pilot-meta">${btn('← BACK','back','outline')}<div style="display:flex;gap:5px;align-items:center">${btn('← PREV','prev-pilots','navy') }<small> ${S.pilotPage+1} / ${pages} </small>${btn('NEXT →','next-pilots','navy')}</div>${btn('CONFIRM THIS PILOT →','confirm-pilot','red')}</div></div></div></section>`;
}
function career(){
 const saved=getCareer(),prof=saved?.profile,run=saved?.run;
 if(!prof)return `<section class="frame career-screen v4-career">${header('ROAD TO ACE','FIGHTER COMMAND · THE CAREER LADDER')}
 <div class="inner career-intro-layout"><div class="career-hangar-art"><span class="art-stamp">RAF STATION · 1940</span></div><div class="career-block"><span class="notice">EIGHT RANKS · THREE LIVES</span><h2>YOUR FIRST SORTIE.</h2><p>Choose your pilot, then follow a campaign of rising difficulty against recurring rivals. Choose the aircraft best suited to every encounter.</p>${btn('CHOOSE YOUR PILOT →','to-pilots','red')}${btn('← BACK','back','outline')}</div></div></section>`;
 const me=ROSTER.findIndex(p=>p.id===prof.rosterId);if(me>=0)S.pilot=me;
 if(!run)return `<section class="frame career-screen v4-career">${header('ROAD TO ACE','YOUR PILOT IS READY')}
 <div class="inner career-intro-layout"><div class="career-hangar-art"><span class="art-stamp">AIRCRAFT PREPARATION · 1940</span></div><div class="career-block"><span class="notice">EIGHT RANKS · THREE LIVES</span><h2>${txt(prof.name)}</h2><p>${txt(PLANE_LABELS[prof.plane])} specialist. Earn victories against recurring rivals, keep three lives intact and reach the final three-aircraft ace encounter.</p>${btn('START ROAD TO ACE →','begin-career','red')}${btn('CHANGE PILOT','to-pilots','navy')}${btn('← BACK','back','outline')}</div></div></section>`;
 const options=run.choices||[],chosen=options[S.mission]||options[0];
 const rank=run.rank||1,lives=Math.max(0,run.lives||0);
 return `<section class="frame career-screen v4-career">${header('ROAD TO ACE',txt(prof.name)+' · RANK '+rank+' OF 8 · '+lives+' LIVES REMAINING')}
 <div class="career-v4-content"><div class="career-tree"><div class="tree-heading"><b>THE EIGHT-RANK ROAD</b><small>${lives} LIVES · ${rank===8?'FINAL ACE':'SELECT A RIVAL'}</small></div>
 <div class="rank-rail">${Array.from({length:8},(_,i)=>`<div class="rank-stop ${i+1===rank?'current':''} ${i===7?'final':''}"><span class="rank-pin">${i===7?'★':i+1}</span><span>RANK ${i+1}</span>${i+1===rank?'<em>ACTIVE</em>':''}</div>`).join('')}</div>
 <div class="tree-branch-heading"><span>CHOOSE A ROUTE</span><small>Recurring rivals and aircraft are drawn from your real campaign</small></div>
 <div class="tree-routes">${options.map((q,i)=>{const rival=ROSTER.find(p=>p.id===q.id)||null;return `<button class="career-route ${S.mission===i?'selected':''}" data-mission="${i}" aria-pressed="${S.mission===i}"><span class="route-portrait">${rival?`<span class="raf-pilot-image ${rival.faction==='Axis'?'axis':''}" style="${pilotImageCss(rival)}"></span>`:'<span class="classified">?</span>'}</span><span class="route-copy"><strong>${txt(q.label||q.mission||'ENEMY ACE')}</strong><small>${txt(q.mission||'DOGFIGHT')} · ${q.types?.length||1} AIRCRAFT</small><em>${txt(q.difficulty||'STANDARD').toUpperCase()}</em></span><span class="route-light"></span></button>`}).join('')}</div>
 <div class="career-progression-note">YOUR ROUTE <b>→</b> NEXT RANK <span>·</span> RETURNING RIVALS <span>·</span> FINAL ACE + ESCORTS</div></div>
 <aside class="career-side"><div class="career-hangar-art"><span class="art-stamp">RAF STATION · HANGAR 2</span></div><div class="career-brief"><span class="pill-label">YOUR PILOT</span><strong>${txt(prof.name)}</strong><span>${txt(prof.faction)} · ${txt(prof.skill||'ROLL').toUpperCase()}</span><p>PREFERRED AIRCRAFT <b>${txt(PLANE_LABELS[prof.plane])}</b><br><span class="bonus-accent">★ +10% HULL, ARMOUR AND GUN DAMAGE</span></p><div class="career-selected"><small>OPPONENT SELECTED</small><b>${txt(chosen?.label||'RIVAL')}</b><span>${txt(chosen?.mission||'DOGFIGHT')}</span></div>${btn('SELECT AIRCRAFT →','career-aircraft','red')}<div class="career-back-row">${btn('← BACK','back','outline')}${btn('CHANGE PILOT','to-pilots','navy')}</div></div></aside></div></section>`;
}
function options(){return `<section class="frame options-screen">${header('OPTIONS','TACTICS · CONTROLS · THEATRE')}<div class="inner option-rows"><div class="option-card"><h2>FLIGHT CONDITIONS</h2><label>DIFFICULTY <select data-setting="difficulty"><option value="rookie">ROOKIE</option><option value="regular">REGULAR</option><option value="ace">ACE</option></select></label><label>THEATRE <select data-setting="theatre"><option value="english-channel">ENGLISH CHANNEL</option><option value="alpine">ALPINE</option><option value="desert">DESERT</option><option value="storm">STORM</option></select></label></div><div class="option-card"><h2>CONTROLS & SOUND</h2><p>A/D — STEER · SPACE — FIRE · E — AIRCRAFT ABILITY · Q — PILOT SKILL</p><br>${btn('SOUND '+(S.sound?'ON':'OFF'),'sound','navy')}</div></div><div class="inner">${btn('← BACK','back','outline')} ${btn('VIEW ORIGINAL PANELS','reference','navy')}</div></section>`;}
function records(){const p=getCareer();return `<section class="frame records-screen">${header('SERVICE RECORD','PILOTS MAKE HISTORY')}
<div class="inner career-layout"><div class="career-scene"><strong>HONOUR<br>IN THE AIR.</strong></div><div class="career-block"><h2>${txt(p?.profile?.name||'NO PILOT YET')}</h2><p>VICTORIES ${p?.wins||0} · DEFEATS ${p?.losses||0}<br>CONFIRMED KILLS ${p?.kills||0}<br>BEST RANK ${p?.best||0}<br>COMPLETE RUNS ${p?.completed||0}</p>${btn('← BACK','back','outline')}</div></div></section>`;}
function originals(){return `<section class="original-view"><header><strong>YOUR ORIGINAL ARTWORK — UNALTERED PANELS</strong>${btn('← RETURN TO MENUS','original-back','outline')}</header>${['HOME','OPERATIONS','AIRCRAFT'].map((name,i)=>`<figure><img src="${photo('original-'+name.toLowerCase())}" alt="Original ${name} panel from your image"><figcaption>${name} · EXACT SOURCE CROP</figcaption></figure>`).join('')}</section>`;}
function show(){stage.innerHTML=({home,operations,aircraft,pilots,career,options,records,originals})[S.screen]?.()||home();root.querySelectorAll('.nav button').forEach(b=>{const on=b.dataset.go===S.screen;b.setAttribute('aria-current',on?'page':'false')});root.querySelector('#squadron strong').textContent=getCareer()?.profile?.name||'Guest Pilot';root.querySelectorAll('select[data-setting]').forEach(s=>s.value=S[s.dataset.setting]);stage.scrollTop=0;}
function go(s,from){if(s===S.screen)return;S.back.push(S.screen);S.screen=s;show()}
function back(){S.screen=S.back.pop()||'home';if(S.screen!=='aircraft')S.career=false;show()}
function modal(title,body){root.querySelector('.demo-modal')?.remove();const e=document.createElement('div');e.className='demo-modal';e.innerHTML=`<div role="dialog" aria-modal="true" class="demo-box"><h2>${txt(title)}</h2><p>${txt(body)}</p>${btn('← CONTINUE EXPLORING','dismiss','red')}</div>`;root.append(e);e.querySelector('button').focus()}
function action(v){
 if(v==='back'){back();return}
 if(v==='reference'){S.referenceFrom=S.screen;go('originals');return}
 if(v==='original-back'){S.screen=S.referenceFrom;S.back.pop();show();return}
 if(v==='sound'){document.getElementById('wm-audio-toggle')?.click();S.sound=!S.sound;show();return}
 if(v==='operations'){S.career=false;go('operations');return}
 if(v==='career'){S.career=true;syncPilot();go('career');return}
 if(v==='pilots'){S.career=false;go('pilots');return}
 if(v==='options'){go('options');return}
 if(v==='faction-raf'){S.aircraftFaction='Allies';S.plane=0;show();return}
 if(v==='faction-axis'){S.aircraftFaction='Axis';S.plane=3;show();return}
 if(v==='prev-pilots'){S.pilotPage=Math.max(0,S.pilotPage-1);show();return}
 if(v==='next-pilots'){S.pilotPage+=1;show();return}
 if(v==='to-pilots'){S.career=true;S.pilotFilter=factionOfPilot()==='Axis'?'LUFTWAFFE':'RAF';go('pilots');return}
 if(v==='career-aircraft'){
   if(!realPrepareCareer())return;
   S.career=true;go('aircraft');return;
 }
 if(v==='begin-career'){realBeginCareer();show();return}
 if(v==='confirm-pilot'){
   if(S.career){if(!realSelectPilot()){show();return}S.screen='career';S.back=['home'];show()}
   else{S.pilotConfirmed=true;modal('PILOT SELECTED',ROSTER[S.pilot]?.name+' is ready. Open Road to Ace to begin.');show()}
   return;
 }
 if(v==='dismiss'){root.querySelector('.demo-modal')?.remove();return}
 if(v==='next'){
   if(S.screen==='operations'){S.career=false;go('aircraft')}
   else if(S.screen==='aircraft'){if(S.career)realLaunchCareer();else realStart()}
   return;
 }
}
root.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.go){S.career=t.dataset.go==='career';if(S.career)syncPilot();go(t.dataset.go);return}if(t.dataset.action){action(t.dataset.action);return}if(t.dataset.op!=null){S.operation=Number(t.dataset.op);show();return}if(t.dataset.plane!=null){S.plane=Number(t.dataset.plane);show();return}if(t.dataset.pilot!=null){S.pilot=Number(t.dataset.pilot);show();return}if(t.dataset.mission!=null){S.mission=Number(t.dataset.mission);show();return}if(t.dataset.filter){S.pilotFilter=t.dataset.filter;S.pilotPage=0;const choices=ROSTER.map((p,i)=>({p,i})).filter(x=>S.pilotFilter==='ALL'||(x.p.faction==='Axis'?'LUFTWAFFE':'RAF')===S.pilotFilter);if(choices.length&&!choices.some(x=>x.i===S.pilot))S.pilot=choices[0].i;show();return}});
root.addEventListener('change',e=>{if(e.target.matches('select[data-setting]')){S[e.target.dataset.setting]=e.target.value}});
root.addEventListener('keydown',e=>{if(e.key==='Escape'){if(root.querySelector('.demo-modal'))root.querySelector('.demo-modal')?.remove();else back()}});
window.WingmanActualReferencePrototype={state:S,go,back,show};show();
// The refined UI follows the old engine visibility, never modifies flight physics.
const menu=document.getElementById('menu'),careerScreen=document.getElementById('career-screen');
if(menu)new MutationObserver(syncOverlay).observe(menu,{attributes:true,attributeFilter:['class','hidden']});
if(careerScreen)new MutationObserver(syncOverlay).observe(careerScreen,{attributes:true,attributeFilter:['hidden','class'],childList:true});
syncPilot();syncOverlay();
})();
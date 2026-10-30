(function(){'use strict';
const art=window.WMART||{};const root=document.documentElement;
for(const [k,v] of Object.entries(art))root.style.setProperty('--art-'+k,'url("'+v+'")');
const P=window.parent;
const roster=P.WingmanRoster||[];
const TYPES=['fighter','heavy','bomber','bf109','bf110','he111'];
const PLANES=[
 ['SPITFIRE','RAF · AGILE FIGHTER','OVERDRIVE','The iconic all-rounder. Superb handling and firepower.',82,3.15,40,11,'Allies'],
 ['BEAUFIGHTER','RAF · HEAVY FIGHTER','SHIELD','Heavy guns and excellent protection for tough missions.',75,1.98,78,16,'Allies'],
 ['LANCASTER','RAF · BOMBER','DEFENSIVE GUNNERS','A resilient bomber with defensive turrets.',66,1.3,124,10,'Allies'],
 ['BF 109E EMIL','LUFTWAFFE · AGILE FIGHTER','OVERDRIVE','Nimble, aggressive and built for sharp interception.',87,3.02,42,11,'Axis'],
 ['BF 110 ZERSTÖRER','LUFTWAFFE · HEAVY FIGHTER','SHIELD','A powerful twin-engine destroyer with heavy forward armament.',78,1.91,75,17,'Axis'],
 ['HEINKEL HE 111','LUFTWAFFE · MEDIUM BOMBER','DEFENSIVE GUNNERS','A sturdy bomber protected by defensive gunners.',69,1.35,116,10,'Axis']
];
const OPS=[['1 VS 1','Classic dogfight','Head-to-head fighter combat.','duel'],['SURVIVAL','How long can you last?','Increasing waves of enemies.','survival'],['FREE FOR ALL','Every pilot for themselves','Multiple aircraft. One winner.','triple'],['2 VS 2','Team up','Fight with an AI wingman.','teams'],['CHALLENGES','Special operations','Time-limited combat objectives.','challenge']];
const S={screen:(!localStorage.getItem('wingman-road-to-ace-v1')?'title':'home'),back:[],op:0,plane:0,faction:'Allies',pilotIndex:0,page:0,pilotFilter:'Allies',career:false,choice:0,difficulty:'standard',theatre:'0',sound:true,lastResult:null};
const stage=document.querySelector('#stage'),nav=document.querySelector('.nav');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const aircraftPreviews={};
const photo=name=>{return art[name]||'';};
const arcadeSave=()=>{try{return JSON.parse(localStorage.getItem('wingman-arcade-v1')||'null')}catch{return null}};
const playerSave=()=>{try{return JSON.parse(localStorage.getItem('wingman-road-to-ace-v1')||'null')}catch{return null}};
const api=()=>P.WingmanUIBridge;
const confirmButton=(label,action,cl='red')=>'<button type="button" class="btn '+cl+'" data-action="'+action+'">'+label+'</button>';
const rankTitles=['FIRST SORTIE','ROOKIE','REGULAR','EXPERIENCED','VETERAN','ELITE','ACE FLIGHT','FINAL ACE'];
function pById(id){return roster.find(p=>p.id===id)}
function rivalFor(c){const current=pById(c.id);if(current)return current;const n=Number(String(c.id).replace('pilot-',''));const faction=['bf109','bf110','he111'].includes(c.types?.[0])?'Axis':'Allies';const candidates=roster.filter(p=>p.faction===faction&&p.gender!=='female');const base=candidates[(Number.isFinite(n)?n:0)%candidates.length];return base?{...base,name:c.label||base.name}:null;}
function player(){const saved=playerSave();return pById(saved?.profile?.rosterId)||null}
function pilotShort(p){return p?.name?.match(/"([^"]+)"/)?.[1]||p?.name?.split(' ')[0]||'PILOT'}
function atlas(p){
 if(!p)return '';
 const german=p.faction==='Axis',src=german?P.WingmanGermanPortraitAtlas:P.WingmanRosterPortraitAtlas;
 if(!src)return '';
 const cols=german?4:8,rows=german?5:4,n=german?roster.filter(q=>q.faction==='Axis').findIndex(q=>q.id===p.id):p.portrait;
 const x=(n%cols)/(cols-1)*100,y=Math.floor(n/cols)/(rows-1)*100;
 return '<span class="atlas-portrait" role="img" aria-label="'+esc(p.name)+' portrait" style="display:block;width:100%;height:100%;background-image:url('+src+');background-size:'+(cols*100)+'% '+(rows*100)+'%;background-position:'+x+'% '+y+'%"></span>';
}
function header(title,subtitle){return '<div class="section-header"><h1>'+title+'</h1><p>'+subtitle+'</p></div>'}
function title(){return `<section class="frame poster-home v4-home opening-screen"><div class="opening-content"><div class="home-roundel"><i class="roundel"></i><span>RAF FIGHTER COMMAND · 1940</span></div><h1>WINGMAN</h1><p>THE SKIES ARE CALLING</p><button class="btn red opening-start" data-action="opening-start">PRESS TO START →</button><small>CHOOSE YOUR PILOT · EARN YOUR WINGS</small></div></section>`}
function home(){const saved=playerSave(),p=player();return `<section class="frame poster-home v4-home"><div class="home-left"><div class="home-identity"><div class="home-roundel"><i class="roundel"></i><span>RAF FIGHTER COMMAND · 1940</span></div><h1 class="home-wordmark">WINGMAN</h1></div><div class="home-buttons">
${confirmButton('BEGIN OPERATIONS <span class="chevron">›</span>','operations')}
${confirmButton('KING OF THE SKIES <span class="chevron">›</span>','career','navy')}
${confirmButton('HANGAR <span class="chevron">›</span>','aircraft','navy')}
${confirmButton('OPTIONS <span class="chevron">›</span>','options','navy')}</div><div class="home-subnote">NO. 11 GROUP · OPERATIONS ROOM</div></div>${p?'<button class="home-licence-thumb" type="button" data-action="licence" aria-label="Open your pilot licence"><span class="mini-licence-top">RAF · FIGHTER COMMAND</span><span class="mini-licence-body"><span class="mini-licence-photo">'+atlas(p)+'</span><span><strong>'+esc(p.name)+'</strong><small>'+esc(p.archetype)+' · '+esc(p.signature.toUpperCase())+'</small><em>VIEW LICENCE →</em></span></span></button>':''}</section>`}
function operations(){return `<section class="frame poster-operations"><div class="operations-top" role="img" aria-label="Painted RAF operations artwork"></div><div class="operations-main"><div class="operations-scene"><strong>OPERATIONS<br>1940</strong></div><div class="operation-area"><div class="operation-list">${OPS.map((op,i)=>`<button type="button" class="operation-ref ${i===S.op?'selected':''}" data-op="${i}" aria-pressed="${i===S.op}"><img class="operation-cover" src="${photo(['operation-art-0','operation-art-1','operations-painting','operation-art-3','raf-hangar-scene'][i])}" alt=""/><span class="operation-copy"><strong>${op[0]}</strong><small>${op[1].toUpperCase()}</small><span>${op[2]}</span></span><b class="operation-chevron">›</b></button>`).join('')}</div><div class="screen-actions">${confirmButton('← BACK','back','outline')}${confirmButton('CONTINUE →','operations-next')}</div></div></div></section>`}
function statBar(name,value,max){return '<div class="grid-plane-stat"><span>'+name+'</span><i class="grid-plane-track"><i style="width:'+(Math.min(100,Math.round(value/max*100)))+'%"></i></i><em>'+value+'</em></div>'}
function aircraft(){
 const save=playerSave(),career=S.career&&!!save?.run;
 const faction=career?save.profile.faction:S.faction;
 const types=faction==='Axis'?[3,4,5]:[0,1,2];
 if(!types.includes(S.plane))S.plane=types[0];
 const speciality=save?.profile?.plane;
 const selection=PLANES[S.plane];
 return `<section class="frame aircraft-screen wm-live-aircraft"><div class="aircraft-head"><h1>${career?'SELECT AIRCRAFT · RANK '+save.run.rank:'PREPARE FOR TAKEOFF'}</h1><small>${career?'KING OF THE SKIES · '+esc(save?.run?.choices?.[S.choice]?.mission||'SORTIE'):'FIGHTER COMMAND · AIRCRAFT SELECTION'}</small></div><div class="aircraft-content">
 <div class="faction-bar"><strong>CHOOSE YOUR AIRCRAFT</strong><div class="faction-buttons">${career?'<span class="notice">'+(faction==='Axis'?'LUFTWAFFE':'RAF')+' · YOUR SQUADRON</span>':['Allies','Axis'].map(n=>'<button type="button" class="btn '+(n===faction?'gold':'navy')+'" data-faction="'+n+'">'+(n==='Axis'?'✠ LUFTWAFFE':'◉ RAF / ALLIES')+'</button>').join('')}</div></div>
 <div class="grid-of-planes">${types.map(i=>{
  const p=PLANES[i],selected=i===S.plane,fav=career&&speciality===TYPES[i],bonus=fav?1.1:1;
  return '<button type="button" class="grid-plane-card '+(selected?'selected':'')+'" data-plane="'+i+'" aria-pressed="'+selected+'"><img src="'+photo('aircraft-art-'+i)+'" alt="'+p[0]+' painted reference aircraft"><div class="grid-plane-body"><div class="grid-plane-name"><strong>'+p[0]+'</strong><span class="selection-stamp">'+(selected?'✓ SELECTED':'SELECT')+'</span></div><span class="grid-plane-role">'+p[1]+'</span><div class="grid-plane-stats">'+statBar('SPEED',p[4],96)+statBar('TURN',p[5].toFixed(2),3.5)+statBar('ARMOUR',Math.round(p[6]*bonus),140)+statBar('GUN DMG',+(p[7]*bonus).toFixed(1),19)+'</div><span class="plane-ability">✦ ABILITY: '+p[2]+'<small>'+(['E · Temporary speed boost.','E · Temporarily reduces incoming damage.','Automatic rear defence. E · Drop a three-bomb salvo.'][i%3])+'</small></span>'+(fav?'<span class="specialist">★ SPECIALIST +10% HULL / ARMOUR / GUN DMG</span>':'')+'</div></button>';
 }).join('')}</div>
 ${!career?`<div class="conditions"><label>AI DIFFICULTY <select data-setting="difficulty"><option value="rookie">ROOKIE</option><option value="standard">REGULAR</option><option value="ace">ACE</option></select></label><label>THEATRE<select data-setting="theatre"><option value="0">ALPINE FRONT</option><option value="1">ENGLISH CHANNEL</option><option value="2">NORTH AFRICA</option><option value="3">STORM FRONT</option></select></label></div>`:`<div class="notice">YOUR PILOT: ${esc(save.profile.name)} · PREFERRED AIRCRAFT: ${esc(PLANES[TYPES.indexOf(speciality)]?.[0]||'FIGHTER')}</div>`}
 <div class="screen-actions">${confirmButton('← BACK','back','outline')}${confirmButton(career?'CONFIRM AIRCRAFT & FLY →':'SCRAMBLE →',career?'launch-career':'launch-arcade',career?'red':'gold')}</div></div></section>`;
}
function pilots(){
 const saved=playerSave(),list=roster.filter(p=>p.faction===S.pilotFilter);
 if(!list.length)return header('SELECT PILOT','PERSONNEL ROSTER LOADING');
 if(!list.includes(roster[S.pilotIndex]))S.pilotIndex=roster.indexOf(list[0]);
 const current=roster[S.pilotIndex];
 return `<section class="frame pilot-screen dossier-screen">${header('SELECT PILOT','PERSONNEL · SELECT YOUR AVIATOR')}
 <div class="dossier-toolbar">
 ${confirmButton('← BACK','back','outline')}
 <div class="dossier-factions"><button class="btn ${S.pilotFilter==='Allies'?'gold':'navy'}" data-filter="Allies">RAF</button><button class="btn ${S.pilotFilter==='Axis'?'gold':'navy'}" data-filter="Axis">LUFTWAFFE</button></div>
 <span>${list.length} PILOTS · SCROLL TO EXPLORE</span>
 </div>
 <div class="dossier-scroll"><div class="dossier-grid">${list.map(p=>{
 const stats=p.attributes||{},chosen=current.id===p.id;
 return '<button type="button" class="dossier-card '+(chosen?'selected':'')+'" data-pilot="'+p.id+'" aria-pressed="'+chosen+'"><span class="dossier-photo">'+atlas(p)+'</span><span class="dossier-content"><strong>'+esc(p.name)+'</strong><small>'+esc(p.faction==='Axis'?'LUFTWAFFE':'ROYAL AIR FORCE')+' · '+esc(p.archetype)+' · '+esc(PLANES[TYPES.indexOf(p.plane)]?.[0]||'FIGHTER')+'</small><span class="dossier-story">'+esc(p.bio||'A distinctive ace with an appetite for trouble and a talent for flying.')+'</span><span class="dossier-skill">SIGNATURE: '+esc(p.signature||'ROLL').toUpperCase()+'</span><span class="dossier-values">MANOEUVRE '+(stats.manoeuvrability??'—')+'  ·  GUNNERY '+(stats.gunnery??'—')+'  ·  ENGINE '+(stats.engine??'—')+'</span></span></button>';
 }).join('')}</div></div>
 <div class="dossier-footer"><span><b>${esc(current.name)}</b> · ${esc(current.signature).toUpperCase()} · ${esc(PLANES[TYPES.indexOf(current.plane)]?.[0]||'FIGHTER')} SPECIALIST</span>
 ${confirmButton(saved?.profile?.rosterId===current.id?'CONTINUE WITH THIS PILOT →':'CONFIRM PILOT →','confirm-pilot','red')}</div>
 </section>`;
}
function career(){
 const saved=playerSave();
 if(!saved?.profile||saved.awaitingPilotSelection)return `<section class="frame career-screen v4-career">${header('KING OF THE SKIES','CHOOSE YOUR PILOT')}<div class="inner career-intro-layout"><div class="career-hangar-art"></div><div class="career-block"><h2>YOUR FIRST SORTIE</h2><p>Choose your pilot to begin.</p>${confirmButton('CHOOSE PILOT →','to-pilots')}</div></div></section>`;
 if(!saved.run)return `<section class="frame career-screen v4-career">${header('KING OF THE SKIES','READY FOR DUTY')}<div class="inner career-intro-layout"><div class="career-hangar-art"></div><div class="career-block"><h2>${esc(saved.profile.name)}</h2><p>Eight ranks, three lives and rivals who remember you.</p>${confirmButton('START CAMPAIGN →','begin-career')}</div></div></section>`;
 const run=saved.run,choices=run.choices||[],selected=choices[S.choice]||choices[0],p=player(),played=Math.max(0,(saved.wins||0)+(saved.losses||0)),rate=played?Math.round((saved.wins||0)/played*100):0;
 const campaignRanks=Array.from({length:8},(_,i)=>8-i);
 const currentRank=run.rank||1;
 const laneX=[17,50,83],mapRows=Array.from({length:8},(_,i)=>8-i);
 const encounterMeta=mission=>{
  const key=String(mission||'').toUpperCase();
  if(key.includes('FINAL'))return {icon:'★',name:'FINAL ACE'};
  if(key.includes('DOUBLE'))return {icon:'✦',name:'DOUBLE ACE'};
  if(key.includes('HIGH-ALTITUDE'))return {icon:'⚔',name:'HIGH-ALTITUDE DUEL'};
  if(key.includes('HUNTER'))return {icon:'⌖',name:'HUNTER PATROL'};
  return {icon:'✈',name:'INTERCEPTION'};
 };
 const ladder=mapRows.map((rank,idx)=>{
  const final=rank===8,now=rank===currentRank,passed=rank<currentRank;

  return '<div class="route-map-row '+(now?'is-current':passed?'is-cleared':'is-ahead')+'" data-map-rank="'+rank+'"><span class="route-map-rank">RANK '+rank+' · '+esc(rankTitles[rank-1])+'</span><div class="route-map-nodes">'+laneX.map((x,lane)=>{
   if(final&&!now&&lane!==1)return '';
   const actual=now?choices[lane]:null,meta=now?encounterMeta(actual?.mission):final?{icon:'★',name:'FINAL ACE'}:passed?{icon:'✓',name:'CLEARED'}:{icon:'?',name:'UNREVEALED'};
   const chosen=now&&lane===Math.min(S.choice,2),state=now?'is-available':passed?'is-complete':'is-future';
   const label=now?(meta.name+' · '+(actual?.label||'CHOOSE A RIVAL')):meta.name;
   const tag=now&&actual?'button':'span',attrs=now&&actual?' type="button" data-choice="'+lane+'" aria-pressed="'+(chosen?'true':'false')+'"':'';
   return '<'+tag+' class="route-map-node '+(chosen?'is-chosen ':'')+state+'" style="left:'+x+'%" title="'+esc(label)+'" aria-label="'+esc(label)+'"'+attrs+'><span class="node-symbol">'+meta.icon+'</span><small>'+esc(meta.name)+'</small></'+tag+'>';
  }).join('')+'</div></div>';
 }).join('');
 const mapEdges=mapRows.slice(0,-1).map((rank,row)=>{
  const sources=rank===8?[1]:[0,1,2];
  return sources.map(lane=>{
   const destinations=rank===8?[0,1,2]:lane===0?(row%2===0?[0,1]:[0]):lane===1?(row%2===0?[1,2]:[0,1]):(row%2===0?[2]:[1,2]);
   return destinations.map(dest=>'<path d="M '+laneX[lane]+' '+(48+row*105)+' L '+laneX[dest]+' '+(48+(row+1)*105)+'" />').join('');
  }).join('');
 }).join('');
 const connectedLadder='<div class="campaign-map-canvas"><svg class="map-connections" viewBox="0 0 100 840" preserveAspectRatio="none" aria-hidden="true">'+mapEdges+'</svg>'+ladder+'</div>';
 const rivals=choices.map((c,i)=>{
  const rival=rivalFor(c),stat=saved.records?.[c.id]||{},fought=(stat.wins||0)+(stat.losses||0);
  return '<button type="button" class="compact-rival '+(i===S.choice?'selected':'')+'" data-choice="'+i+'" aria-pressed="'+(i===S.choice)+'"><span class="compact-rival-photo">'+atlas(rival)+'</span><span class="compact-rival-info"><strong>'+esc(rival?.name||c.label)+'</strong><small>'+esc(c.mission||'DOGFIGHT')+' · '+esc(rival?.signature||'ROLL').toUpperCase()+'</small><span class="compact-rival-description">'+esc(rival?.bio||'A formidable pilot with a fearsome reputation in the skies.')+'</span><em>'+ (fought?('YOUR ENCOUNTERS '+fought+' · W '+(stat.wins||0)+' / L '+(stat.losses||0)):'UNDEFEATED IN YOUR SERVICE RECORD')+'</em></span></button>';
 }).join('');
 return `<section class="frame career-screen campaign-rework">${header('KING OF THE SKIES','RANK '+currentRank+' / 8 · '+run.lives+' LIVES')}
 <div class="campaign-rework-content"><div class="campaign-main">
 <div class="campaign-ladder-head"><strong>ROAD TO ACE</strong><span>BRANCHING ROUTES · CLIMB TO THE FINAL ACE</span></div>
 <div class="campaign-map-legend"><span>✈ INTERCEPT</span><span>⚔ DUEL</span><span>⌖ PATROL</span><span>✦ DOUBLE ACE</span><span>★ FINAL ACE</span><span>? UNREVEALED</span></div><div class="campaign-ladder-scroll" data-rank="${currentRank}" aria-label="Branching eight-rank campaign map">${connectedLadder}</div>
 <div class="campaign-rivals-title"><strong>CHOOSE YOUR NEXT OPPONENT</strong><small>THREE ROUTES · YOUR DECISION</small></div>
 <div class="campaign-rivals">${rivals}</div>
 </div>
 <aside class="campaign-service-side"><div class="service-card">
 <div class="service-card-head"><span>${p?.faction==='Axis'?'LUFTWAFFE':'ROYAL AIR FORCE'}</span><small>ACTIVE CAMPAIGN · LIVE SERVICE RECORD</small></div>
 <div class="service-identity"><div class="service-picture">${atlas(p)}</div><div><small>PILOT / CALLSIGN</small><strong>${esc(saved.profile.name)}</strong><span>${esc(p?.archetype||'AVIATOR')} · ${esc(saved.profile.skill||'ROLL').toUpperCase()}</span></div></div>
 <div class="service-progress"><strong>RANK ${currentRank} / 8</strong><span>${'♥'.repeat(run.lives)}${'♡'.repeat(Math.max(0,3-run.lives))}</span></div>
 <div class="service-stat-grid"><div><strong>${saved.wins||0}</strong><small>CAREER WINS</small></div><div><strong>${saved.losses||0}</strong><small>LOSSES</small></div><div><strong>${saved.kills||0}</strong><small>CONFIRMED KILLS</small></div><div><strong>${rate}%</strong><small>WIN RATE</small></div></div>
 <p class="service-specialism">PREFERRED AIRCRAFT <b>${esc(PLANES[TYPES.indexOf(saved.profile.plane)]?.[0]||'FIGHTER')}</b><span>★ +10% HULL · ARMOUR · GUN DAMAGE</span></p>
 <div class="service-brief"><small>YOUR CHOSEN OPPONENT</small><b>${esc(selected?.label||'SELECT A RIVAL')}</b><span>${esc(selected?.mission||'DOGFIGHT')}</span></div>
 <div class="service-actions">${confirmButton('SELECT AIRCRAFT →','career-aircraft','red')}${confirmButton('← BACK','back','outline')}</div>
 </div></aside></div></section>`;
}
function records(){
 const saved=playerSave(),p=player(),arc=arcadeSave()||{},flights=Array.isArray(arc.records)?arc.records:[],
 totalArcade=Number(arc.total)||0,arcadeWins=Number(arc.wins)||0,arcadeLosses=Number(arc.losses)||0,
 totalWins=(saved?.wins||0)+arcadeWins,totalLosses=(saved?.losses||0)+arcadeLosses,
 allTimeKills=(saved?.kills||0)+flights.reduce((n,r)=>n+(Number(r.kills)||0),0),
 pilotFlights=p?flights.filter(r=>r.pilotId===p.id):[],pilotWins=pilotFlights.filter(r=>r.won).length,
 pilotKills=pilotFlights.reduce((n,r)=>n+(Number(r.kills)||0),0),
 service=[['ALL-TIME VICTORIES',totalWins],['DEFEATS',totalLosses],['CONFIRMED KILLS',allTimeKills],['TOTAL SORTIES',totalArcade+(saved?.wins||0)+(saved?.losses||0)],['BEST CAMPAIGN RANK',(saved?.best||0)+'/8'],['COMPLETED CAMPAIGNS',saved?.completed||0]];
 return `<section class="frame licence-screen">${header('PILOT LICENCE','ALL OPERATIONS · PERSONNEL RECORD')}
 <div class="licence-card">
 <div class="licence-title"><span>${p?.faction==='Axis'?'LUFTWAFFE · FLIEGERAUSWEIS':'ROYAL AIR FORCE · AIRCREW LICENCE'}</span><b>IDENTITY &amp; SERVICE BOOK</b></div>
 <div class="licence-body"><div class="licence-photo">${atlas(p)}</div>
 <div class="licence-details"><small>OFFICER / CALLSIGN</small><h2>${esc(saved?.profile?.name||'NO PILOT SELECTED')}</h2>
 <p>${esc(p?.archetype||'')} · SIGNATURE ${esc(p?.signature||'—').toUpperCase()} · ${esc(PLANES[TYPES.indexOf(p?.plane)]?.[0]||'—')} SPECIALIST</p>
 <div class="licence-rule">PERSONAL AIRCREW SERVICE RECORD <span>ISSUED 1940 · ACTIVE DUTY</span></div>
 <div class="licence-stats">${service.map(([k,v])=>'<div><strong>'+v+'</strong><small>'+k+'</small></div>').join('')}</div>
 <div class="licence-pilot-tally">SELECTED PILOT · ${pilotFlights.length} ARCADE SORTIES · ${pilotWins} VICTORIES · ${pilotKills} KILLS <small>(Earlier arcade sorties were not assigned to a pilot.)</small></div>
 </div></div>
 <div class="licence-seal"><span>✦ ${p?.faction==='Axis'?'LUFTWAFFE':'RAF FIGHTER COMMAND'}</span><span>SERVICE NO. ${esc(p?.id||'UNASSIGNED').toUpperCase()}</span><span class="licence-stamp">ACTIVE SERVICE</span></div>
 <div class="licence-honours"><b>DECORATIONS &amp; HONOURS</b><p>${saved?.medals?.length?saved.medals.map(m=>esc(m.replace(/-/g,' ').toUpperCase())).join(' · '):'No campaign decorations recorded yet.'} · ARCADE HONOURS ${arc?.unlocks?.length||0}</p></div></div>
 <div class="licence-actions">${confirmButton('← BACK','back','outline')}${confirmButton('KING OF THE SKIES →','career')}</div></section>`;
}
function options(){return `<section class="frame options-screen">${header('OPTIONS','TACTICS · CONTROLS · THEATRE')}<div class="inner option-rows"><div class="option-card"><h2>FLIGHT CONDITIONS</h2><label>DIFFICULTY <select data-setting="difficulty"><option value="rookie">ROOKIE</option><option value="standard">REGULAR</option><option value="ace">ACE</option></select></label><label>THEATRE <select data-setting="theatre"><option value="0">ALPINE FRONT</option><option value="1">ENGLISH CHANNEL</option><option value="2">NORTH AFRICA</option><option value="3">STORM</option></select></label></div><div class="option-card"><h2>CONTROLS & SOUND</h2><p>A/D — STEER · SPACE — FIRE · E — AIRCRAFT ABILITY · Q — PILOT SKILL</p>${confirmButton('SOUND '+(S.sound?'ON':'OFF'),'sound','navy')}${confirmButton('SERVICE RECORD','records','navy')}</div></div><div class="inner">${confirmButton('← BACK','back','outline')}</div></section>`;}
function outcome(){const saved=playerSave(),result=S.lastResult||'SORTIE COMPLETE',isCareer=!!S.lastCareer;return `<section class="frame career-screen v4-career">${header('AFTER ACTION REPORT','FIGHTER COMMAND · COMBAT DEBRIEF')}<div class="inner career-intro-layout"><div class="career-hangar-art"><span class="art-stamp">AIRCRAFT RETURNING · 1940</span></div><div class="career-block"><span class="notice">SORTIE LOG</span><h2>${esc(result)}</h2><p>${isCareer?(esc(saved?.profile?.name||'Pilot')+' · '+(saved?.wins||0)+' VICTORIES · '+(saved?.losses||0)+' LOSSES'):'THE BATTLE IS FINISHED. READY FOR YOUR NEXT SORTIE?'}</p>${isCareer?confirmButton('CONTINUE KING OF THE SKIES →','career-continue'):confirmButton('FLY AGAIN →','fly-again')}${isCareer?'':confirmButton('CHANGE AIRCRAFT','change-aircraft','navy')}${confirmButton('RETURN TO MENU','return-home','outline')}</div></div></section>`;}
function show(){const views={title,home,operations,aircraft,pilots,career,records,options,outcome};const oldMap=stage.querySelector('.campaign-ladder-scroll');const mapMemory=oldMap?{rank:oldMap.dataset.rank,top:oldMap.scrollTop}:null;
stage.innerHTML=(views[S.screen]||home)();
const newMap=stage.querySelector('.campaign-ladder-scroll');
if(newMap){if(mapMemory&&mapMemory.rank===newMap.dataset.rank)newMap.scrollTop=mapMemory.top;else{const current=newMap.querySelector('.route-map-row.is-current');if(current){const top=current.getBoundingClientRect().top-newMap.getBoundingClientRect().top+newMap.scrollTop;newMap.scrollTop=Math.max(0,Math.min(newMap.scrollHeight-newMap.clientHeight,top-newMap.clientHeight*.65));}}}document.querySelector('.utility-home').hidden=S.screen==='home';document.querySelector('.utility-settings').hidden=S.screen!=='career';document.querySelector('.career-settings-popup').hidden=true;nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.go===S.screen?'page':'false'));document.querySelector('#squadron strong').textContent=playerSave()?.profile?.name||'Guest Pilot';stage.querySelectorAll('select[data-setting]').forEach(sel=>sel.value=S[sel.dataset.setting]);stage.scrollTop=0;}
function go(screen){if(S.screen!==screen){S.back.push(S.screen);S.screen=screen;show()}}
function back(){S.screen=S.back.pop()||'home';if(S.screen!=='aircraft')S.career=false;show()}
function beginCareer(){const a=api();if(!a?.beginCareer?.())return;S.choice=0;S.career=false;S.screen='career';show()}
function action(v){
 if(v==='opening-start'){S.screen=playerSave()?.profile?'home':'pilots';S.back=[];return show();}
 if(v==='campaign-settings'){const panel=document.querySelector('.career-settings-popup');panel.hidden=!panel.hidden;return;}
 if(v==='restart-run'){if(!confirm('Restart King of the Skies? Select a pilot again and return to rank 1. Lifetime service statistics and medals are kept.'))return;const ok=api()?.restartCampaign?.();if(!ok)return;S.choice=0;S.career=false;S.page=0;S.pilotFilter=playerSave()?.profile?.faction||'Allies';const current=roster.findIndex(p=>p.id===playerSave()?.profile?.rosterId);S.pilotIndex=Math.max(0,current);S.screen='pilots';S.back=['career'];show();return;}
 if(v==='fullscreen'){const d=P.document;(d.fullscreenElement?d.exitFullscreen():d.documentElement.requestFullscreen()).catch(()=>{});return;}
 if(v==='back')return back();
 if(v==='operations'){S.career=false;return go('operations')}
 if(v==='career'){S.career=false;return go('career')}
 if(v==='pilots'||v==='to-pilots'){const save=playerSave();S.pilotFilter=save?.profile?.faction||'Allies';const idx=roster.findIndex(p=>p.id===save?.profile?.rosterId);if(idx>=0)S.pilotIndex=idx;S.page=0;return go('pilots')}
 if(v==='aircraft'){S.career=false;return go('aircraft')}
 if(['home','options','records'].includes(v))return go(v);
 if(v==='operations-next'){S.career=false;return go('aircraft')}
 if(v==='sound'){S.sound=!S.sound;api()?.toggleSound?.();return show()}
 if(v==='confirm-pilot'){const p=roster[S.pilotIndex];if(!p)return;const status=api()?.choosePilot?.(p.id);if(status===false)return;S.faction=p.faction;S.plane=Math.max(0,TYPES.indexOf(p.plane));S.career=false;S.screen='home';S.back=[];return show()}
 if(v==='begin-career')return beginCareer();
 if(v==='career-aircraft'){if(!playerSave()?.run)return;S.career=true;S.faction=playerSave().profile.faction;S.plane=TYPES.indexOf(playerSave().profile.plane);return go('aircraft')}
 if(v==='launch-arcade'){const ok=api()?.startArcade?.({mode:OPS[S.op][3],aircraft:TYPES[S.plane],difficulty:S.difficulty,arena:S.theatre});if(ok)api()?.hide?.();return}
 if(v==='launch-career'){const ok=api()?.startCareer?.(S.choice,TYPES[S.plane]);if(ok){S.career=false;api()?.hide?.()}return}
 if(v==='career-continue'){api()?.continueCareer?.();S.lastResult=null;S.screen='career';S.back=[];return show()}
 if(v==='fly-again'){api()?.rematch?.();return}
 if(v==='change-aircraft'){api()?.changeAircraft?.();S.screen='aircraft';S.career=false;S.back=[];return show()}
 if(v==='return-home'){api()?.home?.();S.screen='home';S.career=false;S.back=[];return show()}
 if(v==='licence')return go('records');
}
document.addEventListener('click',e=>{
 const el=e.target.closest('button');if(!el)return;
 if(el.dataset.go){S.career=false;return go(el.dataset.go)}
 if(el.dataset.action)return action(el.dataset.action);
 if(el.dataset.op!=null){S.op=Number(el.dataset.op);return show()}
 if(el.dataset.plane!=null){S.plane=Number(el.dataset.plane);return show()}
 if(el.dataset.faction){S.faction=el.dataset.faction;S.plane=S.faction==='Axis'?3:0;return show()}
 if(el.dataset.filter){S.pilotFilter=el.dataset.filter;S.page=0;const i=roster.findIndex(p=>p.faction===S.pilotFilter);if(i>=0)S.pilotIndex=i;return show()}
 if(el.dataset.page){S.page=Math.max(0,Math.min(3,S.page+Number(el.dataset.page)));return show()}
 if(el.dataset.pilot){S.pilotIndex=roster.findIndex(p=>p.id===el.dataset.pilot);return show()}
 if(el.dataset.choice!=null){S.choice=Number(el.dataset.choice);return show()}
});
document.addEventListener('change',e=>{if(e.target.matches('select[data-setting]'))S[e.target.dataset.setting]=e.target.value});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&S.screen!=='title')back();else if((e.key==='Enter'||e.key===' ')&&S.screen==='title'){e.preventDefault();action('opening-start')}});
window.addEventListener('message',e=>{if(e.origin!==location.origin)return;if(e.data?.wmUI==='career'){S.career=false;S.screen='career';S.back=[];S.lastResult=null;show()}if(e.data?.wmUI==='home'){S.career=false;S.screen='home';S.back=[];show()}if(e.data?.wmUI==='result'){S.lastResult=e.data.result;S.lastCareer=!!e.data.career;S.screen='outcome';S.back=[];show()}});
window.WingmanLiveUI={state:S,go,show};show();
})();
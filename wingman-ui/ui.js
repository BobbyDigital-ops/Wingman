(function(){'use strict';
const art=window.WMART||{};const root=document.documentElement;
for(const [k,v] of Object.entries(art))root.style.setProperty('--art-'+k,'url("'+v+'")');
const P=window.parent;
const roster=P.WingmanRoster||[];
const TYPES=['fighter','heavy','bomber','bf109','bf110','he111'];
// Values are refreshed from the authoritative game stats when the UI mounts.
const PLANES=[
 ['SPITFIRE','RAF · AGILE FIGHTER','CORKSCREW','The iconic all-rounder. Superb handling and firepower.',82,3.15,40,11,'Allies'],
 ['BEAUFIGHTER','RAF · HEAVY FIGHTER','SHIELD','Heavy guns and excellent protection for tough missions.',75,1.98,78,16,'Allies'],
 ['LANCASTER','RAF · LIGHT STRIKE','ASSISTED BOMBS','A nimble strike bomber. Set up overhead attacks, escape fast; weak defensive guns.',75,1.72,98,2.9,'Allies'],
 ['BF 109E EMIL','LUFTWAFFE · AGILE FIGHTER','OVERDRIVE','Nimble, aggressive and built for sharp interception.',87,3.02,42,11,'Axis'],
 ['BF 110 ZERSTÖRER','LUFTWAFFE · HEAVY FIGHTER','SHIELD','A powerful twin-engine destroyer with heavy forward armament.',78,1.91,75,17,'Axis'],
 ['HEINKEL HE 111','LUFTWAFFE · LIGHT STRIKE','ASSISTED BOMBS','An agile strike aircraft with a dangerous bomb attack but light rear defence.',77,1.75,92,2.9,'Axis']
];
const liveSpecs=P.WingmanGame?.aircraftSpecs?.();
if(liveSpecs)for(let i=0;i<TYPES.length;i++){const p=liveSpecs[TYPES[i]];if(!p)continue;PLANES[i][4]=p.speed;PLANES[i][5]=p.turn;PLANES[i][6]=p.armour;PLANES[i][7]=p.damage;}
const OPS=[['1 VS 1','Classic dogfight','Head-to-head fighter combat.','duel'],['SURVIVAL','How long can you last?','Increasing waves of enemies.','survival'],['FREE FOR ALL','Every pilot for themselves','Multiple aircraft. One winner.','triple'],['2 VS 2','Team up','Fight with an AI wingman.','teams'],['CHALLENGES','Special operations','Time-limited combat objectives.','challenge']];
const S={screen:'title',back:[],op:0,plane:0,opponent:'random',faction:'Allies',pilotIndex:0,page:0,pilotFilter:'Allies',career:false,choice:0,campaignPanel:'ladder',difficulty:'standard',theatre:'0',sound:true,lastResult:null};
const stage=document.querySelector('#stage'),nav=document.querySelector('.nav');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const aircraftPreviews={};
const photo=name=>{return art[name]||'';};
const arcadeSave=()=>{try{return JSON.parse(localStorage.getItem('wingman-arcade-v1')||'null')}catch{return null}};
const playerSave=()=>{try{return JSON.parse(localStorage.getItem('wingman-road-to-ace-v1')||'null')}catch{return null}};
const api=()=>P.WingmanUIBridge;
const campaignRules=P.WingmanCampaign;
const perkById=id=>[...(campaignRules?.UPGRADES||[]),...(campaignRules?.ELITE_UPGRADES||[]),...(campaignRules?.SETBACKS||[])].find(p=>p.id===id);
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
function profiles(){
 const fromBridge=api()?.listProfileSlots?.();
 const slots=Array.isArray(fromBridge)&&fromBridge.length===3?fromBridge:
  Array.from({length:3},(_,i)=>({slot:i,active:i===0,hasProfile:i===0&&!!playerSave()?.profile,
    name:i===0?playerSave()?.profile?.name||'':'',faction:i===0?playerSave()?.profile?.faction:null,
    rosterId:i===0?playerSave()?.profile?.rosterId:null,rank:i===0?playerSave()?.run?.rank:null}));
 const cards=slots.map(p=>{
  const pilot=pById(p.rosterId),existing=!!p.hasProfile;
  return '<button type="button" class="wm-v13-profile-card '+(p.active?'is-current':'')+
  '" data-profile-slot="'+p.slot+'" aria-label="'+(existing?'Continue':'Create')+' pilot profile '+(p.slot+1)+'">'+
  '<span class="wm-v13-profile-number">SERVICE RECORD '+String(p.slot+1).padStart(2,'0')+(p.active?' · CURRENT':'')+'</span>'+
  '<span class="wm-v13-profile-photo">'+(pilot?atlas(pilot):'<span class="wm-v13-empty-portrait">+</span>')+'</span>'+
  '<strong>'+esc(existing?p.name:'NEW PILOT')+'</strong>'+
  '<span class="wm-v13-profile-meta">'+(existing?esc(p.faction==='Axis'?'LUFTWAFFE':'ROYAL AIR FORCE')+
  ' · '+(p.rank?'RANK '+p.rank+' / 8':'READY FOR DUTY'):'CREATE AN INDEPENDENT CAREER')+'</span>'+
  '<em>'+(existing?'SELECT SERVICE RECORD ›':'ENLIST NEW PILOT ›')+'</em></button>';
 }).join('');
 return '<section class="frame wm-v13-profiles">'+
  '<div class="wm-v13-profiles-content"><header><span class="wm-v12-kicker">AIR MINISTRY · PERSONNEL OFFICE · PRIVATE & CONFIDENTIAL</span>'+
  '<h1>SELECT YOUR SERVICE RECORD</h1><p>Three independent flying careers. Choose a pilot to enter Fighter Command.</p></header>'+
  '<div class="wm-v13-profiles-grid">'+cards+'</div>'+
  '<footer><button type="button" class="wm-v13-profile-back" data-action="profile-back">← BACK TO SPLASH</button>'+
  '<span>YOUR EXISTING WINGMAN CAREER IS PRESERVED IN SERVICE RECORD 01.</span></footer></div></section>';
}
function home(){
 const saved=playerSave(),p=player(),rank=saved?.run?.rank||1;
 const careerDetail=saved?.run?'CONTINUE · RANK '+rank+' / 8':'EIGHT RANKS · ONE LEGEND';
 return '<section class="frame wm-v12-home">'+
   '<div class="wm-v12-home-content">'+
   '<div class="wm-v12-home-intro"><span class="wm-v12-kicker">RAF FIGHTER COMMAND · OPERATIONS ROOM · 1940</span>'+
   '<h1>WINGMAN</h1><div class="wm-v12-home-title">CHOOSE YOUR ADVENTURE</div>'+
   '<p>ONE WAR. TWO WAYS TO MAKE YOUR NAME.</p>'+
   (p?'<button type="button" class="wm-v12-identity" data-action="licence"><span class="wm-v12-identity-photo">'+atlas(p)+'</span><span><small>YOUR SERVICE RECORD</small><strong>'+esc(p.name)+'</strong><em>VIEW PILOT LICENCE ›</em></span></button>':
       '<button type="button" class="wm-v12-identity" data-action="pilots"><span>PERSONNEL OFFICE · SELECT YOUR PILOT ›</span></button>')+
   '</div><div class="wm-v12-home-choices">'+
   '<button class="wm-v12-adventure wm-v12-adventure-arcade" type="button" data-action="operations"><span class="wm-v12-adventure-no">01 / FREE FLIGHT</span>'+
   '<strong>SKIRMISH</strong><span>YOUR AIRCRAFT. YOUR RULES.</span><p>Classic dogfights, squadron battles, survival and challenges.</p>'+
   '<em>CONFIGURE A SORTIE <b>›</b></em></button>'+
   '<button class="wm-v12-adventure wm-v12-adventure-campaign" type="button" data-action="career"><span class="wm-v12-adventure-no">02 / FIGHTER COMMAND</span>'+
   '<strong>KING OF<br>THE SKIES</strong><span>'+esc(careerDetail)+'</span><p>Choose your route, win upgrades and take on the Luftwaffe’s best.</p>'+
   '<em>OPEN OPERATIONS DESK <b>›</b></em></button>'+
   '<div class="wm-v13-home-actions"><button data-action="switch-profile">⇄ CHANGE PROFILE</button><button data-action="options">⚙ OPTIONS &amp; SETTINGS</button></div>'+
   '</div></div><span class="wm-v12-footer-stamp">NO. 11 GROUP · FIGHTER COMMAND · CLASSIFIED</span></section>';
}
function operations(){
 const op=OPS[S.op]||OPS[0];
 const types=OPS.map((o,i)=>'<option value="'+i+'">'+esc(o[0])+' · '+esc(o[1]).toUpperCase()+'</option>').join('');
 const theatre='<option value="0">ALPINE FRONT</option><option value="1">ENGLISH CHANNEL</option>'+
   '<option value="2">NORTH AFRICA</option><option value="3">STORM FRONT</option>';
 const opponent='<option value="random">RANDOM OPPONENT</option>'+
   TYPES.map((t,i)=>'<option value="'+t+'">'+esc(PLANES[i][0])+'</option>').join('');
 return '<section class="frame wm-v12-ops wm-v13-ops"><div class="wm-v13-ops-content">'+
  '<header class="wm-v12-ops-title"><span class="wm-v12-kicker">RAF FIGHTER COMMAND · FORM 01</span>'+
  '<h1>SKIRMISH</h1><p>Choose your mission, conditions and opponent before takeoff.</p></header>'+
  '<div class="wm-v13-ops-grid">'+
  '<div class="wm-v13-ops-left"><span class="wm-v13-field-label">01 · MISSION TYPE</span>'+
  '<select data-setting="op" aria-label="Mission type">'+types+'</select>'+
  '<div class="wm-v13-mission-summary"><span class="wm-v12-kicker">YOUR FLIGHT ORDERS</span>'+
  '<h2>'+esc(op[0])+'</h2><strong>'+esc(op[1]).toUpperCase()+'</strong>'+
  '<p>'+esc(op[2])+'</p></div></div>'+
  '<div class="wm-v13-ops-right"><span class="wm-v13-field-label">02 · CONDITIONS</span>'+
  '<div class="wm-v12-ops-field"><label>DIFFICULTY<select data-setting="difficulty"><option value="rookie">ROOKIE</option>'+
  '<option value="standard">REGULAR</option><option value="ace">ACE</option></select></label>'+
  '<label>THEATRE<select data-setting="theatre">'+theatre+'</select></label>'+
  (op[3]==='duel'?'<label class="wm-v12-span-all">ENEMY AIRCRAFT<select data-setting="opponent">'+opponent+'</select></label>':'')+
  '</div><div class="wm-v13-ops-note"><span class="wm-v12-kicker">OPERATIONAL NOTES</span>'+
  '<p>Briefing and aircraft confirmation follow. Your chosen settings are retained.</p></div>'+
  '</div></div></div>'+
  '<div class="wm-v12-actionbar"><button type="button" class="wm-v12-secondary" data-action="back">← BACK TO COMMAND</button>'+
  '<button type="button" class="wm-v12-primary" data-action="operations-next">SELECT AIRCRAFT ›</button></div></section>';
}
function statBar(name,value,max){return '<div class="grid-plane-stat"><span>'+name+'</span><i class="grid-plane-track"><i style="width:'+(Math.min(100,Math.round(value/max*100)))+'%"></i></i><em>'+value+'</em></div>'}
function aircraft(){
 const save=playerSave(),career=S.career&&!!save?.run;
 const faction=career?save.profile.faction:S.faction;
 const options=faction==='Axis'?[3,4,5]:[0,1,2];
 if(!options.includes(S.plane))S.plane=options[0];
 const selected=PLANES[S.plane],speciality=save?.profile?.plane;
 const fav=career&&speciality===TYPES[S.plane],bonus=fav?1.1:1;
 const typeName=faction==='Axis'?'LUFTWAFFE':'ROYAL AIR FORCE';
 const specs=[['AIRSPEED',selected[4],100,'IAS'],['HANDLING',Number(selected[5]).toFixed(2),3.6,'TURN'],['ARMOUR',Math.round(selected[6]*bonus),140,'ARM'],['FIREPOWER',Number(selected[7]*bonus).toFixed(1),22,'DMG']];
 const figures=specs.map(([label,num,max,unit])=>
   '<div class="wm-v12-figure"><span>'+label+'</span><div class="wm-v12-figure-track"><i style="width:'+Math.min(100,Math.round(Number(num)/max*100))+'%"></i></div><b>'+num+' <small>'+unit+'</small></b></div>').join('');
 const craft=options.map(i=>{const p=PLANES[i],active=i===S.plane;
   return '<button class="wm-v12-aircraft-tile '+(active?'selected':'')+'" type="button" data-plane="'+i+'" aria-pressed="'+active+'" aria-label="Select '+esc(p[0])+'">'+
     '<span class="wm-v12-tile-image"><img src="'+photo('aircraft-art-'+i)+'" alt="'+esc(p[0])+' aircraft — original approved image"></span>'+
     '<span class="wm-v12-tile-info"><strong>'+esc(p[0])+'</strong><small>'+esc(p[1])+'</small></span>'+
     '<span class="wm-v12-tile-mark">'+(active?'✓':'›')+'</span></button>';
 }).join('');
 const rail=career?
   '<div class="wm-v12-service-locked">'+esc(typeName)+'<small>YOUR ACTIVE SQUADRON</small></div>':
   ['Allies','Axis'].map(n=>'<button class="wm-v12-faction '+(n===faction?'selected':'')+'" type="button" data-faction="'+n+'" aria-pressed="'+(n===faction)+'">'+(n==='Axis'?'✠ LUFTWAFFE':'◉ RAF')+' <span>›</span></button>').join('');
 const settings=!career?
  '<div class="wm-v12-hangar-settings"><label>DIFFICULTY<select data-setting="difficulty"><option value="rookie">ROOKIE</option><option value="standard">REGULAR</option><option value="ace">ACE</option></select></label>'+
  '<label>THEATRE<select data-setting="theatre"><option value="0">ALPINE</option><option value="1">CHANNEL</option><option value="2">N. AFRICA</option><option value="3">STORM</option></select></label>'+
  (OPS[S.op][3]==='duel'?'<label>OPPONENT<select data-setting="opponent"><option value="random">RANDOM</option>'+TYPES.map((t,i)=>'<option value="'+t+'">'+esc(PLANES[i][0])+'</option>').join('')+'</select></label>':'')+'</div>':
  '<div class="wm-v12-campaign-note">★ '+esc(save.profile.name)+' · '+esc(save.run.choices?.[S.choice]?.mission||'CAMPAIGN SORTIE')+
  (fav?' · SPECIALIST +10% HULL / ARMOUR / DAMAGE':'')+'</div>';
 return '<section class="frame wm-v12-hangar">'+
   '<div class="wm-v12-hangar-scroll"><header class="wm-v12-hangar-title"><span class="wm-v12-kicker">RAF FIGHTER COMMAND · 1940</span>'+
   '<h1>SELECT AIRCRAFT</h1><p>Choose your machine. Every aircraft has a character of its own.</p></header>'+
   '<div class="wm-v12-hangar-main"><nav class="wm-v12-faction-rail" aria-label="Aircraft nation">'+rail+
   '<span class="wm-v12-locked-nation" aria-disabled="true">USAAF <small>COMING LATER</small></span>'+
   '<span class="wm-v12-locked-nation" aria-disabled="true">IJN <small>COMING LATER</small></span></nav>'+
   '<div class="wm-v12-hangar-hero"><div class="wm-v12-hero-aircraft"><img src="'+photo('aircraft-art-'+S.plane)+'" alt="'+esc(selected[0])+' existing game aircraft painting"></div>'+
   '<div class="wm-v12-hero-caption"><strong>'+esc(selected[0])+'</strong><span>'+esc(selected[3])+'</span></div></div>'+
   '<aside class="wm-v12-hangar-dossier"><span class="wm-v12-dossier-head">'+esc(typeName)+' · AIRCRAFT RECORD</span>'+
   '<h2>'+esc(selected[0])+'</h2><span class="wm-v12-dossier-role">'+esc(selected[1])+'</span>'+
   '<div class="wm-v12-stats">'+figures+'</div>'+
   '<div class="wm-v12-dossier-weapon"><span>PRIMARY ABILITY</span><b>'+esc(selected[2])+'</b>'+
   '<p>'+esc(selected[3])+'</p></div>'+
   (fav?'<div class="wm-v12-specialist">★ YOUR PILOT’S SPECIALIST AIRCRAFT · +10% HULL, ARMOUR AND DAMAGE</div>':'')+
   '</aside></div>'+
   '<div class="wm-v12-hangar-lower"><div class="wm-v12-hangar-cards">'+craft+'</div>'+settings+'</div>'+
   '</div><div class="wm-v12-actionbar"><button type="button" class="wm-v12-secondary" data-action="back">← BACK</button>'+
   '<button type="button" class="wm-v12-primary" data-action="mission-review">READY FOR SORTIE ›</button></div></section>';
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
 if(saved.run.pendingReward)return outcome();
 const run=saved.run,choices=run.choices||[],selected=choices[S.choice]||choices[0],p=player(),played=Math.max(0,(saved.wins||0)+(saved.losses||0)),rate=played?Math.round((saved.wins||0)/played*100):0;
 const campaignRanks=Array.from({length:8},(_,i)=>8-i);
 const currentRank=run.rank||1;
 const laneX=[17,50,83],mapRows=Array.from({length:8},(_,i)=>8-i);
 const encounterMeta=mission=>{
  const key=String(mission||'').toUpperCase();
  if(key.includes('FINAL'))return {icon:'★',name:'FINAL ACE'};
  if(key.includes('ESCORT'))return {icon:'✦',name:'BOMBER ESCORT'};
  if(key.includes('RECON'))return {icon:'◈',name:'RECON SURVIVAL'};
  if(key.includes('ACE HUNT'))return {icon:'♠',name:'ACE HUNT'};
  if(key.includes('SCOUT'))return {icon:'⌖',name:'SCOUT PATROL'};
  if(key.includes('OUTNUMBERED'))return {icon:'⚔',name:'OUTNUMBERED'};
  if(key.includes('BOMBER'))return {icon:'✈',name:'BOMBER INTERCEPT'};
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
   const label=now?(meta.name+' · '+(actual?.label||'CHOOSE A RIVAL')+' · '+(actual?.risk||'')+' RISK'):meta.name;
   const tag=now&&actual?'button':'span',attrs=now&&actual?' type="button" data-choice="'+lane+'" aria-pressed="'+(chosen?'true':'false')+'"':'';
   return '<'+tag+' class="route-map-node '+(chosen?'is-chosen ':'')+state+'" style="left:'+x+'%" title="'+esc(label)+'" aria-label="'+esc(label)+'"'+attrs+'><span class="node-symbol">'+meta.icon+'</span><small>'+esc(meta.name)+(actual?' · '+esc(actual.risk)+' RISK':'')+'</small></'+tag+'>';
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
  return '<button type="button" class="compact-rival '+(i===S.choice?'selected':'')+'" data-choice="'+i+'" aria-pressed="'+(i===S.choice)+'"><span class="compact-rival-photo">'+atlas(rival)+'</span><span class="compact-rival-info"><strong>'+esc(rival?.name||c.label)+'</strong><small>'+esc(c.mission||'DOGFIGHT')+' · '+esc(c.risk||'LOW')+' RISK · '+esc(c.timeLimit||120)+'s</small><span class="compact-rival-description">'+esc(c.briefing||rival?.bio||'Defeat your rival and survive the encounter.')+'</span><em>'+(fought?('W '+(stat.wins||0)+' / L '+(stat.losses||0)):'FIRST ENCOUNTER')+' · THREAT '+(c.threat??'—')+'/100 · +'+(c.suppliesAward||1)+' SUPPLIES'+(c.rewardTier===2?' · ELITE UPGRADE':'')+'</em></span></button>';
 }).join('');
 return `<section class="frame career-screen campaign-rework">${header('KING OF THE SKIES','RANK '+currentRank+' / 8 · '+run.lives+' LIVES')}
 <div class="campaign-rework-content"><div class="campaign-main">
 <div class="campaign-ladder-head"><strong>ROAD TO ACE</strong><span>BRANCHING ROUTES · CLIMB TO THE FINAL ACE</span></div>
 <div class="campaign-map-legend"><span>✈ INTERCEPT</span><span>◈ RECON</span><span>♠ ACE HUNT</span><span>✦ ESCORT</span><span>⚔ OUTNUMBERED</span><span>★ FINALE</span></div><div class="campaign-ladder-scroll" data-rank="${currentRank}" aria-label="Branching eight-rank campaign map">${connectedLadder}</div>
 <div class="campaign-rivals-title"><strong>CHOOSE YOUR NEXT OPPONENT</strong><small>THREE ROUTES · YOUR DECISION</small></div>
 <div class="campaign-rivals">${rivals}</div>
 </div>
 <aside class="campaign-service-side"><div class="service-card">
 <div class="service-card-head"><span>${p?.faction==='Axis'?'LUFTWAFFE':'ROYAL AIR FORCE'}</span><small>ACTIVE CAMPAIGN · LIVE SERVICE RECORD</small></div>
 <div class="service-identity"><div class="service-picture">${atlas(p)}</div><div><small>PILOT / CALLSIGN</small><strong>${esc(saved.profile.name)}</strong><span>${esc(p?.archetype||'AVIATOR')} · ${esc(saved.profile.skill||'ROLL').toUpperCase()}</span></div></div>
 <div class="service-progress"><strong>RANK ${currentRank} / 8</strong><span>${'♥'.repeat(run.lives)}${'♡'.repeat(Math.max(0,3-run.lives))}</span></div>
 <div class="service-stat-grid"><div><strong>${saved.wins||0}</strong><small>CAREER WINS</small></div><div><strong>${saved.losses||0}</strong><small>LOSSES</small></div><div><strong>${saved.kills||0}</strong><small>CONFIRMED KILLS</small></div><div><strong>${rate}%</strong><small>WIN RATE</small></div></div>
 <p class="service-specialism">PREFERRED AIRCRAFT <b>${esc(PLANES[TYPES.indexOf(saved.profile.plane)]?.[0]||'FIGHTER')}</b><span>★ +10% HULL · ARMOUR · GUN DAMAGE</span></p>
 <div class="wg-v7-run-ledger"><div><small>AIRCRAFT CONDITION</small><strong>${Math.round(run.condition??100)}%</strong></div><div><small>REPAIR SUPPLIES</small><strong>${run.supplies||0}/12</strong></div>
  <div class="wg-v7-condition-track"><i style="width:${Math.round(run.condition??100)}%"></i></div>
  <div class="wg-v7-perks"><small>ACTIVE UPGRADES & CONSEQUENCES</small>
  ${(run.effects||[]).length?run.effects.map(id=>'<span title="'+esc(perkById(id)?.detail||'')+'">'+esc(perkById(id)?.name||id)+'</span>').join(''):'<span>NONE · WIN SORTIES TO EARN UPGRADES</span>'}</div>
  ${confirmButton('FIELD REPAIR · 2 SUPPLIES','repair-airframe','navy')}</div>
 <div class="service-brief"><small>YOUR CHOSEN MISSION · ${esc(selected?.risk||'LOW')} RISK · EST. THREAT ${selected?.threat??'—'}/100</small><b>${esc(selected?.mission||'DOGFIGHT')}</b><span>${esc(selected?.briefing||'CHOOSE A MISSION')}</span><em>RIVAL ${esc(selected?.label||'UNKNOWN')} · +${selected?.suppliesAward||1} SUPPLIES${selected?.rewardTier===2?' · PREMIUM REWARD AVAILABLE':''}</em></div>
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
 <div class="licence-honours"><b>DECORATIONS &amp; HONOURS</b><p>${saved?.medals?.length?saved.medals.map(m=>esc(m.replace(/-/g,' ').toUpperCase())).join(' · '):'No campaign decorations recorded yet.'} · ARCADE HONOURS ${arc?.unlocks?.length||0}</p></div>
 <div class="wg-v7-records-log"><strong>RECENT CAMPAIGN SORTIES</strong>${(saved?.service||[]).slice(-6).reverse().map(e=>
  '<div><span>'+esc(e.won?'VICTORY':'SHOT DOWN')+' · '+esc(e.grade||'—')+'</span><b>R'+esc(e.rank)+' · '+esc(e.mission||'SORTIE')+'</b><small>'+esc(e.rival||'RIVAL')+'</small></div>').join('')||'<p>No campaign sorties recorded.</p>'}</div></div>
 <div class="licence-actions">${confirmButton('← BACK','back','outline')}${confirmButton('KING OF THE SKIES →','career')}</div></section>`;
}
function options(){return `<section class="frame options-screen">${header('OPTIONS','TACTICS · CONTROLS · THEATRE')}<div class="inner option-rows"><div class="option-card"><h2>FLIGHT CONDITIONS</h2><label>DIFFICULTY <select data-setting="difficulty"><option value="rookie">ROOKIE</option><option value="standard">REGULAR</option><option value="ace">ACE</option></select></label><label>THEATRE <select data-setting="theatre"><option value="0">ALPINE FRONT</option><option value="1">ENGLISH CHANNEL</option><option value="2">NORTH AFRICA</option><option value="3">STORM</option></select></label></div><div class="option-card"><h2>CONTROLS & SOUND</h2><p>A/D — STEER · SPACE — FIRE · E — AIRCRAFT ABILITY · Q — PILOT SKILL</p>${confirmButton('SOUND '+(S.sound?'ON':'OFF'),'sound','navy')}${confirmButton('SERVICE RECORD','records','navy')}</div></div><div class="inner">${confirmButton('← BACK','back','outline')}</div></section>`;}
function outcome(){
 const saved=playerSave(),run=saved?.run,pending=run?.pendingReward;
 const isCareer=!!S.lastCareer||!!pending;
 const report=saved?.lastOutcome||{},title=S.lastResult|| (report.won?'VICTORY':'SORTIE COMPLETE');
 const completed=!run&&!!saved?.lastCompleted?.rank;
 const flightLog=(saved?.service||[]).slice(-3).reverse();
 const rewards=pending?.offers?.map(id=>{
  const perk=perkById(id);if(!perk)return '';
  return '<button type="button" class="wg-v7-reward-card'+(perk.elite?' wg-v8-elite':'')+'" data-reward="'+esc(id)+'"><span>'+(perk.elite?'ELITE · HIGH-RISK REWARD':'SELECT REWARD')+'</span><strong>'+esc(perk.name)+'</strong><small>'+esc(perk.detail)+'</small></button>';
 }).join('')||'';
 if(!isCareer)return `<section class="frame career-screen v4-career">${header('AFTER ACTION REPORT','FIGHTER COMMAND · COMBAT DEBRIEF')}
 <div class="inner career-intro-layout"><div class="career-hangar-art"><span class="art-stamp">AIRCRAFT RETURNING · 1940</span></div>
 <div class="career-block"><span class="notice">SORTIE LOG</span><h2>${esc(title)}</h2><p>THE BATTLE IS FINISHED. READY FOR YOUR NEXT SORTIE?</p>
 ${confirmButton('FLY AGAIN →','fly-again')}${confirmButton('CHANGE AIRCRAFT','change-aircraft','navy')}${confirmButton('RETURN TO MENU','return-home','outline')}</div></div></section>`;
 return `<section class="frame career-screen wg-v7-debrief">
  ${header(pending?'CHOOSE YOUR REWARD':'AFTER ACTION REPORT','KING OF THE SKIES · RAF OPERATIONS DESK')}
  <div class="wg-v7-debrief-layout">
   <div class="wg-v7-debrief-banner"><div class="wg-v7-debrief-pilot">${atlas(player())}</div>
    <small>${esc(saved?.profile?.name||'PILOT')} · RANK ${run?.rank||8}</small>
    <h2>${esc(pending?'VICTORY — CLAIM YOUR SPOILS':completed?'KING OF THE SKIES — LEGEND':title)}</h2>
    <p>${esc(report.mission||'COMBAT SORTIE')} · ${esc(report.label||'ENEMY SQUADRON')}</p>
    <div class="wg-v7-debrief-stats"><span>${saved?.wins||0} VICTORIES</span><span>${saved?.losses||0} LOSSES</span>
    <span>${run?run.lives+' LIVES LEFT':'RUN FINISHED'}</span><span>SORTIE GRADE ${esc(report.grade||'—')}</span></div>
    <small>Recent operations</small><div class="wg-v7-debrief-log">${flightLog.map(e=>'<div>'+esc(e.won?'✓':'✕')+' '+esc(e.grade||'—')+' · R'+esc(e.rank)+' · '+esc(e.mission||'DOGFIGHT')+' · '+esc(e.rival||'RIVAL')+'</div>').join('')}</div>
   </div>
   <div class="wg-v7-debrief-choice">
    ${pending?`<span class="wg-v7-overline">${esc(pending.risk)} RISK MISSION · REWARD EARNED</span>
      <h3>CHOOSE ONE UPGRADE</h3>
      <p>Upgrades stay with your aircraft for the rest of this campaign. A low-risk sortie may also leave a temporary setback, repairable with supplies.</p>
      <div class="wg-v7-reward-options">${rewards}</div>
      ${pending.setback?'<p class="wg-v7-warning">FIELD REPORT: '+esc(perkById(pending.setback)?.name||'MECHANICAL ISSUE')+' — repair to clear the setback.</p>':''}
      <p class="wg-v7-locked">A reward must be selected before your next sortie.</p>`:`
      <span class="wg-v7-overline">SORTIE CLOSED · RECORD SAVED</span>
      <h3>${completed?'CAMPAIGN COMPLETE':run?'READY FOR NEXT SORTIE':'TO THE HANGAR'}</h3>
      <p>${run?'Supplies '+(run.supplies||0)+' · Aircraft condition '+Math.round(run.condition??100)+'%. Choose your next route or make field repairs.':'Your record and campaign honours have been saved.'}</p>
      ${confirmButton(run?'RETURN TO CAMPAIGN →':'VIEW PILOT LICENCE →',run?'career-continue':'licence','red')}
      ${confirmButton('RETURN TO MENU','return-home','outline')}`}
   </div>
  </div>
 </section>`;
}
function missionReview(){
 const p=PLANES[S.plane],career=S.career,op=OPS[S.op];
 const selectedMission=career?playerSave()?.run?.choices?.[S.choice]:null;
 const sites=['ALPINE FRONT','ENGLISH CHANNEL','NORTH AFRICA','STORM FRONT'];
 const pilot=playerSave()?.profile?.name||'GUEST PILOT';
 const detail=career?(selectedMission?.mission||'KING OF THE SKIES · ACTIVE SORTIE'):op[0]+' · '+op[1].toUpperCase();
 const role=p[1].split('·').pop().trim();
 const description=esc(p[3]);
 return `<section class="frame wm-v11-review">
  <div class="wm-v11-review-panel">
   <div class="wm-v11-review-scroll">
    <div class="wm-v11-eyebrow">RAF FIGHTER COMMAND · MISSION ORDERS</div>
    <h1>FINAL BRIEFING</h1>
    <p class="wm-v11-sub">YOUR ORDERS ARE CLEAR. CHECK YOUR AIRCRAFT, IDENTIFY YOUR OBJECTIVE, AND SCRAMBLE WHEN READY.</p>
    <div class="wm-v11-review-grid">
     <div class="wm-v11-review-photo">
      <img src="${photo('aircraft-art-'+S.plane)}" alt="${esc(p[0])} original Wingman aircraft art">
      <div class="wm-v11-photo-caption"><b>${esc(p[0])}</b><span>${esc(role)} · ${esc(p[2])}</span></div>
     </div>
     <div class="wm-v11-manifest">
      <div><small>AIRCRAFT</small><strong>${esc(p[0])}</strong></div>
      <div><small>PILOT</small><strong>${esc(pilot)}</strong></div>
      <div><small>MISSION</small><strong>${esc(detail)}</strong></div>
      <div><small>THEATRE</small><strong>${career?'CAMPAIGN ASSIGNMENT':esc(sites[Number(S.theatre)]||sites[0])}</strong></div>
      <div><small>DIFFICULTY</small><strong>${career?esc(selectedMission?.risk||'MISSION DEFINED')+' RISK · EST. THREAT '+(selectedMission?.threat??'—')+'/100':esc(S.difficulty.toUpperCase())}</strong></div>
      ${career?'<div><small>RIVAL / TARGET</small><strong>'+esc(selectedMission?.label||'UNKNOWN')+'</strong></div>':''}
      ${!career&&OPS[S.op][3]==='duel'?'<div><small>OPPONENT AIRCRAFT</small><strong>'+esc(S.opponent==='random'?'RANDOM OPPONENT':PLANES[TYPES.indexOf(S.opponent)]?.[0]||'RANDOM OPPONENT')+'</strong></div>':''}
     </div>
    </div>
    <div class="wm-v11-mission-orders">
     <div><small>FLIGHT OBJECTIVE</small><strong>${career?esc(selectedMission?.mission||'COMPLETE THE ASSIGNED ENCOUNTER'):'ENGAGE AND DEFEAT THE ENEMY AIRCRAFT'}</strong>
      <p>${career?esc(selectedMission?.briefing||'COMPLETE YOUR SORTIE')+' · '+(selectedMission?.timeLimit||120)+'s deadline.':'Maintain airspeed, protect your tail, and use altitude to control the engagement.'}</p></div>
     <div><small>AIRCRAFT NOTES</small><strong>${esc(p[2])}</strong><p>${description}</p></div>
    </div>
   </div>
   <div class="screen-actions wm-v11-sticky-actions">
    ${confirmButton('← BACK','back','outline')}
    ${confirmButton('SCRAMBLE ▶',career?'launch-career':'launch-arcade','red')}
   </div>
  </div>
 </section>`;
}
function show(){const views={title,profiles,home,operations,aircraft,pilots,career,records,options,outcome,review:missionReview};const oldMap=stage.querySelector('.campaign-ladder-scroll');const mapMemory=oldMap?{rank:oldMap.dataset.rank,top:oldMap.scrollTop}:null;
stage.innerHTML=(views[S.screen]||home)();
const newMap=stage.querySelector('.campaign-ladder-scroll');
if(newMap){if(mapMemory&&mapMemory.rank===newMap.dataset.rank)newMap.scrollTop=mapMemory.top;else{const current=newMap.querySelector('.route-map-row.is-current');if(current){const top=current.getBoundingClientRect().top-newMap.getBoundingClientRect().top+newMap.scrollTop;newMap.scrollTop=Math.max(0,Math.min(newMap.scrollHeight-newMap.clientHeight,top-newMap.clientHeight*.65));}}}document.querySelector('.utility-home').hidden=S.screen==='home'||S.screen==='title';document.querySelector('.utility-settings').hidden=S.screen!=='career';document.querySelector('.career-settings-popup').hidden=true;nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.go===S.screen?'page':'false'));document.querySelector('#squadron strong').textContent=playerSave()?.profile?.name||'Guest Pilot';stage.querySelectorAll('select[data-setting]').forEach(sel=>sel.value=S[sel.dataset.setting]);stage.scrollTop=0;}
function go(screen){if(S.screen!==screen){S.back.push(S.screen);S.screen=screen;show()}}
function back(){S.screen=S.back.pop()||'home';if(S.screen!=='aircraft')S.career=false;show()}
function beginCareer(){const a=api();if(!a?.beginCareer?.())return;S.choice=0;S.career=false;S.screen='career';show()}
function action(v){
 if(v==='opening-start'){S.screen='profiles';S.back=[];return show();}
 if(v==='profile-back'){S.screen='title';S.back=[];return show();}
 if(v==='switch-profile'){S.screen='profiles';S.back=['home'];return show();}
 if(v==='campaign-map'){S.campaignPanel='ladder';return show();}
 if(v==='campaign-sortie'){S.campaignPanel='sortie';return show();}
 if(v==='campaign-settings'){const panel=document.querySelector('.career-settings-popup');panel.hidden=!panel.hidden;return;}
 if(v==='restart-run'){if(!confirm('Restart King of the Skies? Select a pilot again and return to rank 1. Lifetime service statistics and medals are kept.'))return;const ok=api()?.restartCampaign?.();if(!ok)return;S.choice=0;S.career=false;S.page=0;S.pilotFilter=playerSave()?.profile?.faction||'Allies';const current=roster.findIndex(p=>p.id===playerSave()?.profile?.rosterId);S.pilotIndex=Math.max(0,current);S.screen='pilots';S.back=['career'];show();return;}
 if(v==='fullscreen'){const d=P.document;(d.fullscreenElement?d.exitFullscreen():d.documentElement.requestFullscreen()).catch(()=>{});return;}
 if(v==='back')return back();
 if(v==='operations'){S.career=false;return go('operations')}
 if(v==='career'){S.career=false;S.campaignPanel='ladder';return go('career')}
 if(v==='pilots'||v==='to-pilots'){const save=playerSave();S.pilotFilter=save?.profile?.faction||'Allies';const idx=roster.findIndex(p=>p.id===save?.profile?.rosterId);if(idx>=0)S.pilotIndex=idx;S.page=0;return go('pilots')}
 if(v==='aircraft'){S.career=false;return go('aircraft')}
 if(['home','options','records'].includes(v))return go(v);
 if(v==='operations-next'){S.career=false;return go('aircraft')}
 if(v==='mission-review')return go('review');
 if(v==='sound'){S.sound=!S.sound;api()?.toggleSound?.();return show()}
 if(v==='confirm-pilot'){const p=roster[S.pilotIndex];if(!p)return;const status=api()?.choosePilot?.(p.id);if(status===false)return;S.faction=p.faction;S.plane=Math.max(0,TYPES.indexOf(p.plane));S.career=false;S.screen='home';S.back=[];return show()}
 if(v==='begin-career')return beginCareer();
 if(v==='career-aircraft'){if(!playerSave()?.run)return;S.career=true;S.faction=playerSave().profile.faction;S.plane=TYPES.indexOf(playerSave().profile.plane);return go('aircraft')}
 if(v==='launch-arcade'){const ok=api()?.startArcade?.({mode:OPS[S.op][3],aircraft:TYPES[S.plane],opponent:S.opponent,difficulty:S.difficulty,arena:S.theatre});if(ok){S.launchError='';api()?.hide?.()}else{S.launchError='UNABLE TO LAUNCH · TRY AGAIN';show()}return}
 if(v==='launch-career'){const ok=api()?.startCareer?.(S.choice,TYPES[S.plane]);if(ok){S.career=false;api()?.hide?.()}return}
 if(v==='career-continue'){if(playerSave()?.run?.pendingReward)return show();api()?.continueCareer?.();S.lastResult=null;S.campaignPanel='ladder';S.screen='career';S.back=[];return show()}
 if(v==='repair-airframe'){if(api()?.repairCampaignAircraft?.())show();return;}
 if(v==='fly-again'){api()?.rematch?.();return}
 if(v==='change-aircraft'){api()?.changeAircraft?.();S.screen='aircraft';S.career=false;S.back=[];return show()}
 if(v==='return-home'){api()?.home?.();S.screen='home';S.career=false;S.back=[];return show()}
 if(v==='licence')return go('records');
}
document.addEventListener('click',e=>{
 const el=e.target.closest('button');if(!el)return;
 if(el.dataset.go){S.career=false;return go(el.dataset.go)}
 if(el.dataset.reward){
   if(api()?.claimCampaignReward?.(el.dataset.reward)){
     S.screen='career';S.lastCareer=false;S.lastResult=null;S.back=[];show();
   }
   return;
 }
 if(el.dataset.action)return action(el.dataset.action);
 if(el.dataset.op!=null){S.op=Number(el.dataset.op);return show()}
 if(el.dataset.profileSlot!=null){
   const res=api()?.selectProfileSlot?.(Number(el.dataset.profileSlot));
   if(res?.ok&&!res.reload){S.screen=res.hasProfile?'home':'pilots';S.back=[];show();}
   return;
 }
 if(el.dataset.plane!=null){S.plane=Number(el.dataset.plane);return show()}
 if(el.dataset.faction){S.faction=el.dataset.faction;S.plane=S.faction==='Axis'?3:0;return show()}
 if(el.dataset.filter){S.pilotFilter=el.dataset.filter;S.page=0;const i=roster.findIndex(p=>p.faction===S.pilotFilter);if(i>=0)S.pilotIndex=i;return show()}
 if(el.dataset.page){S.page=Math.max(0,Math.min(3,S.page+Number(el.dataset.page)));return show()}
 if(el.dataset.pilot){S.pilotIndex=roster.findIndex(p=>p.id===el.dataset.pilot);return show()}
 if(el.dataset.choice!=null){S.choice=Number(el.dataset.choice);if(S.screen==='career')S.campaignPanel='sortie';return show()}
});
document.addEventListener('change',e=>{
 if(!e.target.matches('select[data-setting]'))return;
 const key=e.target.dataset.setting;
 if(key==='op'){S.op=Number(e.target.value);show();return;}
 S[key]=e.target.value;
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&S.screen!=='title')back();else if((e.key==='Enter'||e.key===' ')&&S.screen==='title'){e.preventDefault();action('opening-start')}});
window.addEventListener('message',e=>{if(e.origin!==location.origin)return;if(e.data?.wmUI==='career'){S.career=false;S.screen='career';S.back=[];S.lastResult=null;show()}if(e.data?.wmUI==='home'){S.career=false;S.screen='home';S.back=[];show()}if(e.data?.wmUI==='result'){S.lastResult=e.data.result;S.lastCareer=!!e.data.career;S.screen='outcome';S.back=[];show()}});
try{
 const arrived=sessionStorage.getItem('wingman-menu-arrival-v1');
 if(arrived==='home'||arrived==='pilots'){
   sessionStorage.removeItem('wingman-menu-arrival-v1');S.screen=arrived;
 }
}catch{}
window.WingmanLiveUI={state:S,go,show};show();
})();
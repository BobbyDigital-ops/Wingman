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
const S={screen:'home',back:[],op:0,plane:0,faction:'Allies',pilotIndex:0,page:0,pilotFilter:'Allies',career:false,choice:0,difficulty:'standard',theatre:'0',sound:true,lastResult:null};
const stage=document.querySelector('#stage'),nav=document.querySelector('.nav');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photo=name=>art[name]||'';
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
function home(){return `<section class="frame poster-home v4-home"><div class="home-left"><div class="home-identity"><div class="home-roundel"><i class="roundel"></i><span>RAF FIGHTER COMMAND · 1940</span></div><h1 class="home-wordmark">WINGMAN</h1></div><div class="home-buttons">
${confirmButton('BEGIN OPERATIONS <span class="chevron">›</span>','operations')}
${confirmButton('KING OF THE SKIES <span class="chevron">›</span>','career','navy')}
${confirmButton('HANGAR <span class="chevron">›</span>','aircraft','navy')}
${confirmButton('OPTIONS <span class="chevron">›</span>','options','navy')}</div><div class="home-subnote">NO. 11 GROUP · OPERATIONS ROOM</div></div></section>`}
function operations(){return `<section class="frame poster-operations"><div class="operations-top" role="img" aria-label="Painted RAF operations artwork"></div><div class="operations-main"><div class="operations-scene"><strong>OPERATIONS<br>1940</strong></div><div class="operation-area"><div class="operation-list">${OPS.map((op,i)=>`<button type="button" class="operation-ref ${i===S.op?'selected':''}" data-op="${i}" aria-pressed="${i===S.op}"><img class="operation-cover" src="${photo('operation-art-'+i)}" alt=""/><span class="operation-copy"><strong>${op[0]}</strong><small>${op[1].toUpperCase()}</small><span>${op[2]}</span></span><b class="operation-chevron">›</b></button>`).join('')}</div><div class="screen-actions">${confirmButton('← BACK','back','outline')}${confirmButton('CONTINUE →','operations-next')}</div></div></div></section>`}
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
 const saved=playerSave(),list=roster.filter(p=>p.faction===S.pilotFilter);if(!list.length)return header('SELECT PILOT','PILOT ROSTER LOADING');
 if(!list.includes(roster[S.pilotIndex]))S.pilotIndex=roster.indexOf(list[0]);
 const current=roster[S.pilotIndex];const start=Math.max(0,Math.min(list.length-6,S.page*6));const visible=list.slice(start,start+6);
 return `<section class="frame pilot-screen">${header('SELECT PILOT','FIGHTER COMMAND PERSONNEL')}<div class="inner"><div class="pilot-preview"><div class="pilot-pager">${confirmButton('← BACK','back','outline')}<div style="display:flex;gap:7px"><button class="btn ${S.pilotFilter==='Allies'?'gold':'navy'}" data-filter="Allies">RAF</button><button class="btn ${S.pilotFilter==='Axis'?'gold':'navy'}" data-filter="Axis">LUFTWAFFE</button></div><div style="display:flex;gap:5px"><button class="btn navy" data-page="-1" aria-label="Previous pilots">‹</button><span class="pill-label">${start+1}–${Math.min(start+6,list.length)} / ${list.length}</span><button class="btn navy" data-page="1" aria-label="Next pilots">›</button></div></div>
 <div class="pilot-grid">${visible.map(p=>'<button type="button" class="pilot-card '+(current.id===p.id?'selected':'')+'" data-pilot="'+p.id+'" aria-pressed="'+(current.id===p.id)+'">'+atlas(p)+'<span class="pilot-tag">'+esc(pilotShort(p)).toUpperCase()+'</span></button>').join('')}</div>
 <div class="pilot-copy"><strong>${esc(current.name)}</strong> · ${current.faction==='Axis'?'LUFTWAFFE':'RAF'} · ${esc(current.archetype).toUpperCase()} · SIGNATURE: ${esc(current.signature).toUpperCase()}<br><span style="color:#ffd380">★ SPECIALIST IN ${esc(PLANES[TYPES.indexOf(current.plane)][0])}: +10% HULL, ARMOUR & GUN DAMAGE</span></div>
 <div class="pilot-meta"><small>${saved?.profile?.rosterId===current.id?'CURRENT CAREER PILOT':'20 DEFINED PILOTS PER SQUADRON · ONE CONFIRMATION'}</small>${confirmButton(saved?.profile?.rosterId===current.id?'CONTINUE WITH THIS PILOT →':'CONFIRM THIS PILOT →','confirm-pilot')}</div></div></div></section>`;
}
function career(){
 const saved=playerSave();if(!saved?.profile)return `<section class="frame career-screen v4-career">${header('KING OF THE SKIES','FIGHTER COMMAND · THE CAREER LADDER')}<div class="inner career-intro-layout"><div class="career-hangar-art"><span class="art-stamp">RAF STATION · 1940</span></div><div class="career-block"><span class="notice">EIGHT RANKS · THREE LIVES</span><h2>YOUR FIRST SORTIE.</h2><p>Select one of Wingman's 40 defined pilots, then face recurring rivals in an escalating campaign.</p>${confirmButton('CHOOSE YOUR PILOT →','to-pilots')}${confirmButton('← BACK','back','outline')}</div></div></section>`;
 if(!saved.run)return `<section class="frame career-screen v4-career">${header('KING OF THE SKIES','SERVICE RECORD · YOUR PILOT IS READY')}<div class="inner career-intro-layout"><div class="career-hangar-art"><span class="art-stamp">RAF STATION · HANGAR 2</span></div><div class="career-block"><span class="notice">EIGHT RANKS · THREE LIVES</span><h2>${esc(pilotShort(player())).toUpperCase()} IS READY.</h2><p>Choose an encounter at each rank and then pick an aircraft suited to it. Your specialist aircraft receives +10% protection and gun damage.</p>${confirmButton('START KING OF THE SKIES →','begin-career')}${confirmButton('CHANGE PILOT','to-pilots','navy')}</div></div></section>`;
 const run=saved.run,choices=run.choices||[],choice=choices[S.choice]||choices[0],p=player();
 const life='♥'.repeat(run.lives)+'♡'.repeat(Math.max(0,3-run.lives));
 return `<section class="frame career-screen v4-career">${header('KING OF THE SKIES','RANK '+run.rank+' / 8 · '+life+' · PERSONNEL & COMBAT RECORD')}<div class="career-v4-content"><div class="career-tree"><div class="tree-heading"><b>THE EIGHT-RANK ROAD</b><small>${run.lives} LIVES · ${saved.wins} VICTORIES</small></div><div class="rank-rail">${Array.from({length:8},(_,i)=>'<div class="rank-stop '+(i+1===run.rank?'current':'')+' '+(i===7?'final':'')+'"><span class="rank-pin">'+(i===7?'★':i+1)+'</span><span>RANK '+(i+1)+'</span></div>').join('')}</div><div class="tree-branch-heading"><span>CHOOSE AN OPPONENT</span><small>REAL RIVALS · YOUR CURRENT RANK</small></div><div class="tree-routes">${choices.map((c,i)=>{const rival=rivalFor(c);return '<button class="career-route '+(S.choice===i?'selected':'')+'" data-choice="'+i+'" aria-pressed="'+(S.choice===i)+'"><span class="route-portrait">'+atlas(rival)+'</span><span class="route-copy"><strong>'+esc(pilotShort(rival)||c.label).toUpperCase()+'</strong><small>'+esc(c.mission||'DOGFIGHT')+'</small><em>'+(c.types?.length||1)+' ENEMY AIRCRAFT · '+(c.difficulty||'STANDARD').toUpperCase()+'</em></span><span class="route-light"></span></button>'}).join('')}</div><div class="career-progression-note">YOUR ROUTE <b>→</b> NEXT RANK <span>·</span> RETURNING RIVALS <span>·</span> FINAL ACE + 2 ESCORTS</div></div><aside class="career-side"><div class="career-hangar-art"><span class="art-stamp">RAF STATION · HANGAR 2</span></div><div class="career-brief"><span class="pill-label">YOUR PILOT</span><strong>${esc(saved.profile.name)}</strong><span>${esc(p?.archetype||'AVIATOR')} · ${esc(saved.profile.skill||'ROLL').toUpperCase()}</span><p>PREFERRED AIRCRAFT <b>${esc(PLANES[TYPES.indexOf(saved.profile.plane)]?.[0]||'FIGHTER')}</b><br><span class="bonus-accent">★ +10% HULL, ARMOUR AND GUN DAMAGE</span></p><div class="career-selected"><small>OPPONENT SELECTED</small><b>${esc(choice?.label||'RIVAL')}</b><span>${esc(choice?.mission||'DOGFIGHT')} · ${choice?.types?.length||1} ENEMY</span></div>${confirmButton('SELECT AIRCRAFT →','career-aircraft')}<div class="career-back-row">${confirmButton('← BACK','back','outline')}${confirmButton('PILOT LICENCE','licence','navy')}</div></div></aside></div></section>`;
}
function records(){const save=playerSave();return `<section class="frame records-screen">${header('SERVICE RECORD','PILOTS MAKE HISTORY')}<div class="inner option-rows"><div class="option-card"><h2>${esc(save?.profile?.name||'GUEST PILOT')}</h2><p>VICTORIES ${save?.wins||0} · LOSSES ${save?.losses||0} · KILLS ${save?.kills||0}</p><p>BEST RANK ${save?.best||0} / 8 · COMPLETED RUNS ${save?.completed||0}</p></div><div class="option-card"><h2>DECORATIONS</h2><p>${esc((save?.medals||[]).join(', ')||'First victory awaits.')}</p></div></div><div class="inner">${confirmButton('← BACK','back','outline')} ${confirmButton('KING OF THE SKIES →','career')}</div></section>`;}
function options(){return `<section class="frame options-screen">${header('OPTIONS','TACTICS · CONTROLS · THEATRE')}<div class="inner option-rows"><div class="option-card"><h2>FLIGHT CONDITIONS</h2><label>DIFFICULTY <select data-setting="difficulty"><option value="rookie">ROOKIE</option><option value="standard">REGULAR</option><option value="ace">ACE</option></select></label><label>THEATRE <select data-setting="theatre"><option value="0">ALPINE FRONT</option><option value="1">ENGLISH CHANNEL</option><option value="2">NORTH AFRICA</option><option value="3">STORM</option></select></label></div><div class="option-card"><h2>CONTROLS & SOUND</h2><p>A/D — STEER · SPACE — FIRE · E — AIRCRAFT ABILITY · Q — PILOT SKILL</p>${confirmButton('SOUND '+(S.sound?'ON':'OFF'),'sound','navy')}${confirmButton('SERVICE RECORD','records','navy')}</div></div><div class="inner">${confirmButton('← BACK','back','outline')}</div></section>`;}
function outcome(){const saved=playerSave(),result=S.lastResult||'SORTIE COMPLETE',isCareer=!!S.lastCareer;return `<section class="frame career-screen v4-career">${header('AFTER ACTION REPORT','FIGHTER COMMAND · COMBAT DEBRIEF')}<div class="inner career-intro-layout"><div class="career-hangar-art"><span class="art-stamp">AIRCRAFT RETURNING · 1940</span></div><div class="career-block"><span class="notice">SORTIE LOG</span><h2>${esc(result)}</h2><p>${isCareer?(esc(saved?.profile?.name||'Pilot')+' · '+(saved?.wins||0)+' VICTORIES · '+(saved?.losses||0)+' LOSSES'):'THE BATTLE IS FINISHED. READY FOR YOUR NEXT SORTIE?'}</p>${isCareer?confirmButton('CONTINUE KING OF THE SKIES →','career-continue'):confirmButton('FLY AGAIN →','fly-again')}${isCareer?'':confirmButton('CHANGE AIRCRAFT','change-aircraft','navy')}${confirmButton('RETURN TO MENU','return-home','outline')}</div></div></section>`;}
function show(){const views={home,operations,aircraft,pilots,career,records,options,outcome};stage.innerHTML=(views[S.screen]||home)();document.querySelector('.utility-home').hidden=S.screen==='home';nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.go===S.screen?'page':'false'));document.querySelector('#squadron strong').textContent=playerSave()?.profile?.name||'Guest Pilot';stage.querySelectorAll('select[data-setting]').forEach(sel=>sel.value=S[sel.dataset.setting]);stage.scrollTop=0;}
function go(screen){if(S.screen!==screen){S.back.push(S.screen);S.screen=screen;show()}}
function back(){S.screen=S.back.pop()||'home';if(S.screen!=='aircraft')S.career=false;show()}
function beginCareer(){const a=api();if(!a?.beginCareer?.())return;S.choice=0;S.career=false;S.screen='career';show()}
function action(v){
 if(v==='fullscreen'){const d=P.document;(d.fullscreenElement?d.exitFullscreen():d.documentElement.requestFullscreen()).catch(()=>{});return;}
 if(v==='back')return back();
 if(v==='operations'){S.career=false;return go('operations')}
 if(v==='career'){S.career=false;return go('career')}
 if(v==='pilots'||v==='to-pilots'){const save=playerSave();S.pilotFilter=save?.profile?.faction||'Allies';const idx=roster.findIndex(p=>p.id===save?.profile?.rosterId);if(idx>=0)S.pilotIndex=idx;S.page=0;return go('pilots')}
 if(v==='aircraft'){S.career=false;return go('aircraft')}
 if(['home','options','records'].includes(v))return go(v);
 if(v==='operations-next'){S.career=false;return go('aircraft')}
 if(v==='sound'){S.sound=!S.sound;api()?.toggleSound?.();return show()}
 if(v==='confirm-pilot'){const p=roster[S.pilotIndex];if(!p)return;const status=api()?.choosePilot?.(p.id);if(status===false)return;S.faction=p.faction;S.plane=Math.max(0,TYPES.indexOf(p.plane));S.career=false;S.screen='career';S.back=[];return show()}
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
document.addEventListener('keydown',e=>{if(e.key==='Escape')back()});
window.addEventListener('message',e=>{if(e.origin!==location.origin)return;if(e.data?.wmUI==='career'){S.career=false;S.screen='career';S.back=[];S.lastResult=null;show()}if(e.data?.wmUI==='home'){S.career=false;S.screen='home';S.back=[];show()}if(e.data?.wmUI==='result'){S.lastResult=e.data.result;S.lastCareer=!!e.data.career;S.screen='outcome';S.back=[];show()}});
window.WingmanLiveUI={state:S,go,show};show();
})();
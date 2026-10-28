/* Road to Ace — self-contained single-player campaign, saved locally. */
(()=>{
'use strict';
const STORE='wingman-road-to-ace-v1',MAX_RANK=8;
const PILOT_SKILLS=[['reverse','180° REVERSE'],['roll','BARREL ROLL'],['smoke','SMOKESCREEN'],['harden','HARDEN'],['deadeye','DEADEYE'],['cut','ENGINE CUT'],['dive','EMERGENCY DIVE']];

const AXIS=['bf109','bf110','he111'],ALLIES=['fighter','heavy','bomber'];
const ROSTER=window.WingmanRoster||[];
// Existing pilot-0…pilot-27 references remain valid for historical saves.
const CATALOG=ROSTER.map((p,i)=>({id:p.id,name:p.name,plane:p.plane,skill:i<6?'rookie':i<17?'standard':'ace',faction:p.faction,signature:p.signature,bio:p.bio,archetype:p.archetype,rosterId:p.id}));
const LEGACY_RIVALS=[["Arthur \"Sparrow\" Miles","fighter"],["James \"Lucky\" Mercer","fighter"],["Peter \"Pip\" Collins","heavy"],["Friedrich \"Finch\" Bauer","bf109"],["Emil \"Ghost\" Hartmann","bf109"],["Otto \"Tin Wing\" Kruger","bf110"],["Henry \"Rook\" Fletcher","fighter"],["William \"Red\" Foster","heavy"],["Douglas \"Compass\" Reed","bomber"],["Kurt \"Jackal\" Weber","bf109"],["Erich \"Knuckles\" Vogel","bf110"],["Hans \"High Noon\" Fischer","he111"],["Daniel \"Skipper\" Price","fighter"],["Thomas \"Bulldog\" Grady","heavy"],["Lukas \"Fox\" Richter","bf109"],["Karl \"Iron\" Neumann","bf110"],["Edward \"Hawk\" Bennett","fighter"],["George \"Mariner\" Walsh","heavy"],["Adler \"The Vulture\" Klaus","bf109"],["Walter \"Sting\" Engel","bf110"],["Michael \"Northwind\" Shaw","fighter"],["Oliver \"Anchor\" Blake","bomber"],["Dietrich \"Blackbird\" Falk","bf109"],["Rudolf \"Wraith\" Stein","bf110"],["Charles \"Last Light\" Morgan","fighter"],["Wilhelm \"The Baron\" Adler","bf109"],["Hugh \"Raven\" Doyle","fighter"],["Max \"Nightwatch\" Beck","bf109"]].map((x,i)=>({
 id:'pilot-'+i,name:x[0],plane:x[1],
 faction:AXIS.includes(x[1])?'Axis':'Allies',
 skill:i<6?'rookie':i<16?'standard':'ace'
}));
const byId=Object.fromEntries([
 ...CATALOG.map((p,i)=>[p.id,{...p,appearance:appearance(i*47+9),attributes:{...ROSTER[i].attributes}}]),
 ...LEGACY_RIVALS.map((p,i)=>[p.id,{...p,appearance:appearance(i*47+9),attributes:{
 manoeuvrability:50+(i*17)%37,gunnery:48+(i*23)%40,engine:52+(i*11)%34}}])
]);
const aircraft={fighter:'Spitfire',heavy:'Beaufighter',bomber:'Lancaster',bf109:'Emil (Bf 109)',bf110:'Zerstörer (Bf 110)',he111:'Heinkel He 111'};
const screen=document.getElementById('career-screen'),menu=document.getElementById('menu'),result=document.getElementById('result');
const nav=document.getElementById('career-open'),licenceBtn=document.getElementById('career-license');
function load(){try{const o=JSON.parse(localStorage.getItem(STORE)||'null');return o?.profile?o:null;}catch{return null;}}
let data=load(),active=null,showing=false,view='ladder';
function save(){try{localStorage.setItem(STORE,JSON.stringify(data));}catch{}}
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function appearance(seed=0){
 const n=Number(seed)||0;
 return {face:n%5,skin:Math.floor(n/3)%5,hair:Math.floor(n/2)%6,
 headwear:[2,0,2,1,3][Math.floor(n/5)%5],hairstyle:Math.floor(n/23)%6,
 goggles:Math.floor(n/7)%3,scarf:Math.floor(n/11)%4,
 moustache:Math.floor(n/13)%3,monocle:Math.floor(n/17)%3,nose:Math.floor(n/19)%4};
}
// Distinct facial silhouettes and sculpted hair. Every portrait uses the same
// light-weight SVG renderer, so existing pilot profiles and saves still work.
const FACE_SILHOUETTES=[
 'M37 48C35 30 45 23 60 23C76 22 86 32 83 50L81 69Q76 86 62 92Q47 89 40 76Z',
 'M42 47C40 29 48 20 60 19C74 20 81 30 80 47L77 74Q72 90 61 98Q48 94 44 76Z',
 'M33 45Q32 23 59 23Q86 22 88 45L89 73L80 90L44 90L32 75Z',
 'M37 47Q34 28 57 21Q84 24 85 46L80 73Q73 88 60 98Q46 87 39 72Z',
 'M36 49C34 32 44 27 59 27C79 26 87 37 85 51Q88 76 74 87Q60 95 46 86Q33 77 36 49Z'
];
const HAIR_SILHOUETTES=[
 {name:'short textured crop',
  back:'M34 52Q30 33 37 20Q40 10 49 13Q57 4 65 12Q76 8 81 18Q91 23 87 49L81 53Q72 37 62 38Q46 36 39 54Z',
  front:'M36 47L40 34Q49 39 54 30Q65 38 71 31Q80 34 84 43Q72 42 64 44Q48 39 36 49Z',
  light:'M38 27Q47 17 54 20M58 16Q67 13 75 22'},
 {name:'high pompadour',
  back:'M32 54Q28 36 34 24Q36 4 51 6Q60 -2 70 3Q88 2 91 22L89 55L80 52Q78 36 60 36Q45 36 39 57Z',
  front:'M32 42Q38 24 47 24Q58 25 63 16Q70 8 79 15Q91 24 87 40Q79 34 70 35Q56 49 41 43L35 56Z',
  light:'M42 22Q47 14 59 16M67 11Q78 9 82 23'},
 {name:'loose curls',
  back:'M30 54Q23 46 30 36Q24 27 35 24Q30 14 43 14Q46 4 55 9Q61 0 70 9Q80 5 85 17Q96 19 90 29Q99 38 89 51L82 59Q77 41 61 40Q45 40 38 57Z',
  front:'M32 45Q24 35 39 33Q32 23 46 27Q50 16 60 26Q69 16 74 29Q91 22 87 38Q96 42 82 48Q74 41 66 49Q57 41 48 47Q40 42 32 51Z',
  light:'M32 31Q39 25 46 33M52 18Q60 13 65 24M74 25Q85 25 83 35'},
 {name:'windswept side part',
  back:'M32 62Q27 34 41 17Q49 9 60 12Q74 7 84 21Q94 34 88 62L80 70L79 42Q53 33 40 52L38 72Z',
  front:'M29 48Q41 19 68 15Q84 15 89 30Q78 25 68 33Q55 43 41 44L35 61Z',
  light:'M39 28Q56 15 70 21M53 32Q67 25 79 29'},
 {name:'dramatic spiky quiff',
  back:'M33 60L29 34L37 38L36 16L48 26L55 4L64 22L78 3L80 28L92 20L88 58L80 60Q74 40 60 38Q46 40 39 60Z',
  front:'M34 50L37 30L49 39L55 15L64 36L79 18L78 39L88 34L83 51Q68 42 61 49Q48 41 37 57Z',
  light:'M43 28L48 35M57 19L62 33M78 24L74 36'},
 {name:'long wavy side locks',
  back:'M31 57Q25 32 37 17Q48 8 59 11Q81 6 89 28Q97 49 91 72L87 86L77 78L79 45Q65 30 49 41L42 53L42 88L30 79Z',
  front:'M32 47Q32 22 49 22Q66 7 82 20Q93 30 86 48Q78 39 66 37Q56 47 45 42Q43 52 35 67Z',
  light:'M39 30Q47 16 60 20M70 19Q81 20 83 33M34 62Q30 72 35 80'}
];
function buildPortraitHair(style,colour){
 const part=HAIR_SILHOUETTES[style];
 return {
  back:'<path class="hair-back" d="'+part.back+'" fill="'+colour+'" stroke="#192838" stroke-width="2.6" stroke-linejoin="round"/>',
  front:'<path class="hair-front" d="'+part.front+'" fill="'+colour+'" stroke="#192838" stroke-width="1.6" stroke-linejoin="round"/><path d="'+part.light+'" stroke="#fff2d2" stroke-opacity=".31" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  side: style===5?'<path d="M36 43Q32 64 36 78M85 43Q89 64 85 78" stroke="'+colour+'" stroke-width="7" fill="none" stroke-linecap="round"/>':
    style===3?'<path d="M36 42Q32 57 36 64" stroke="'+colour+'" stroke-width="5.5" fill="none" stroke-linecap="round"/>':
    style===2?'<circle cx="35" cy="47" r="5.5" fill="'+colour+'"/><circle cx="86" cy="46" r="5" fill="'+colour+'"/>':''
 };
}

function pilotPortrait(faction,look=0){
 const opt=typeof look==='object'?look:appearance(look);
 const axis=faction==='Axis';
 const skins=['#f9bc93','#df9e78','#b97957','#895b4c','#f8d2ac'];
 const hairs=['#202a34','#71463b','#d39c5c','#efbf77','#151c2b','#a64f3c'];
 const skin=skins[opt.skin%skins.length],hair=hairs[opt.hair%hairs.length];
 const coat=axis?'#547568':'#2b6382',trim=axis?'#e5d3a3':'#e8ca8e';
 const backdrops=[['#63bac4','#1c456d'],['#ba7770','#4b3b62'],['#539e8e','#233b56'],['#8799c7','#2d355c'],['#d39a59','#514058'],['#4688b8','#143e5c']];
 const bg=backdrops[(opt.face*3+opt.hair+(axis?2:0))%backdrops.length];
 const bgId='portrait-'+[axis?1:0,opt.face,opt.skin,opt.hair,opt.headwear,opt.goggles].join('-');
 const caps=['#','cap','helmet','none','beret'][opt.headwear%4+1]||'cap';
 const nose=[2,3,4,2.6][opt.nose%4],face=[24,21,28,24,26][opt.face%5];
 const faceShape=((Number(opt.face)||0)%5+5)%5;
 const hairStyle=Number.isInteger(opt.hairstyle)?((opt.hairstyle%6)+6)%6:
   ((Number(opt.hair)||0)*3+(Number(opt.face)||0)*2+(Number(opt.headwear)||0))%6;
 const hairParts=buildPortraitHair(hairStyle,hair);
 // Painted source artwork is independent of old procedural SVG features.
 // Legacy SVG stays as a no-network fallback and preserves saved appearances.
 const artIndex=Number.isInteger(opt.rosterPortrait)?((opt.rosterPortrait%5)+5)%5:
   Number.isInteger(opt.portraitIndex)?((opt.portraitIndex%5)+5)%5:
   ((Number(opt.face)||0)*3+(Number(opt.hair)||0))%5;
 const paintedArt=window.WingmanPaintedAtlas?
  `<image class="painted-pilot-portrait" href="${window.WingmanPaintedAtlas}" x="${-artIndex*120}" y="0" width="774" height="247" preserveAspectRatio="none"/>`:'';
 return `<svg class="pilot-avatar" viewBox="0 0 120 144" role="img" aria-label="${faction} pilot wearing a customised uniform">
 <defs><linearGradient id="${bgId}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient><linearGradient id="${bgId}-skin" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="${skin}"/><stop offset=".73" stop-color="${skin}"/><stop offset="1" stop-color="#754545"/></linearGradient><linearGradient id="${bgId}-coat" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="${axis?'#8ca894':'#61a1bd'}"/><stop offset="1" stop-color="${axis?'#253e42':'#183c5b'}"/></linearGradient></defs>
 <rect width="120" height="144" fill="url(#${bgId})"/><circle cx="24" cy="19" r="66" fill="#ffdf9d" opacity=".16"/><path d="M0 36L120 0V23L0 58Z" fill="#ffffff" opacity=".09"/><path d="M8 9H24M8 9V26M96 134H111V119" stroke="#e9f0d2" stroke-width="1.5" opacity=".6" fill="none"/>
 <path d="M-4 145V126Q8 95 40 90L79 90Q111 96 124 127V145Z" fill="url(#${bgId}-coat)" stroke="#172d3a" stroke-width="3"/><path d="M0 137Q16 105 35 103L43 144H0Z" fill="#11243d" opacity=".33"/><path d="M120 137Q107 103 85 103L78 144H120Z" fill="#fff" opacity=".13"/>
 <path d="M38 93L59 131L77 93L87 102L76 144H43L31 103Z" fill="${axis?'#273f40':'#1a415b'}" stroke="${trim}" stroke-width="1.9"/><path d="M43 104L59 131L75 103" stroke="#fff3da" stroke-width="1.3" opacity=".7" fill="none"/>
 <path d="M49 93L59 109L70 93" fill="#e2c7a4" stroke="#bca482"/><path d="M51 91V75H70V91L60 101Z" fill="${skin}"/>
 ${hairParts.back}
 <ellipse cx="${60-face}" cy="61" rx="4" ry="9" fill="${skin}" stroke="#764e3f" stroke-width="1.5"/><ellipse cx="${60+face}" cy="61" rx="4" ry="9" fill="${skin}" stroke="#764e3f" stroke-width="1.5"/><path class="pilot-face-shape" data-face-shape="${faceShape}" d="${FACE_SILHOUETTES[faceShape]}" fill="url(#${bgId}-skin)" stroke="#764e3f" stroke-width="1.4"/><path d="M40 67Q42 83 59 89Q46 86 40 77Z" fill="#74413d" opacity=".23"/><path d="M68 40Q81 43 78 66" stroke="#fff0d6" stroke-opacity=".28" stroke-width="3" fill="none"/>
 <g class="pilot-hair-style" data-hair-style="${hairStyle}" aria-label="${HAIR_SILHOUETTES[hairStyle].name}">${hairParts.front}</g>
 <path d="M40 54q7 -5 15-1m13 0q7 -4 13 1" fill="none" stroke="${hair}" stroke-width="2.8" stroke-linecap="round"/><ellipse cx="48" cy="61" rx="6" ry="3.3" fill="#f7f0e3"/><ellipse cx="74" cy="61" rx="6" ry="3.3" fill="#f7f0e3"/>
 <circle cx="${47+(opt.face%3)}" cy="61" r="2.5" fill="#315765"/><circle cx="${73+(opt.face%2)}" cy="61" r="2.5" fill="#315765"/><circle cx="48" cy="60" r=".9" fill="#fff"/><circle cx="74" cy="60" r=".9" fill="#fff"/>
 <path d="M60 56l${nose} 10l-4 1" fill="none" stroke="#a97159" stroke-width="1.4"/>
 <path d="M52 78q8 ${opt.face%2?4:7} 16 0" fill="none" stroke="#773e41" stroke-width="1.9" stroke-linecap="round"/><circle cx="27" cy="119" r="6.1" fill="#dce7e4" stroke="#193646" stroke-width="1.3"/><circle cx="27" cy="119" r="3.7" fill="${axis?'#535a5a':'#4289b3'}"/><circle cx="27" cy="119" r="1.8" fill="${axis?'#c2b38b':'#cc5353'}"/>
 ${opt.moustache%3?'<path d="M58 72q-6 -4 -12 1q7 3 13 0q7 3 14-1q-7 -4 -13 0" fill="'+hair+'"/>':''}
 ${opt.monocle%3===1?'<circle cx="74" cy="57" r="10" stroke="#d9c593" stroke-width="2" fill="none"/><path d="M84 62Q88 83 85 101" stroke="#d9c593" fill="none"/>':''}
 ${opt.goggles%3===1?'<path d="M32 56H86" stroke="#534a3e" stroke-width="3"/><rect x="38" y="50" width="19" height="13" rx="4" fill="#98b8ba88" stroke="#c2ad84" stroke-width="2"/><rect x="64" y="50" width="19" height="13" rx="4" fill="#98b8ba88" stroke="#c2ad84" stroke-width="2"/>':''}
 ${opt.scarf%4?'<path d="M41 93Q59 107 77 91L83 98Q58 117 38 101Z" fill="'+(['#ac443e','#e3d2ae','#485f7e','#7d8f75'][opt.scarf%4])+'"/><path d="M72 101L83 130L72 128L62 104Z" fill="'+(['#ac443e','#e3d2ae','#485f7e','#7d8f75'][opt.scarf%4])+'"/>':''}
 ${caps==='cap'?'<path d="M30 41Q29 14 60 13Q90 14 89 42L77 35H40Z" fill="'+coat+'" stroke="'+trim+'" stroke-width="2"/><path d="M38 37Q62 32 88 37Q74 46 40 43Z" fill="'+coat+'" stroke="'+trim+'"/>':
 caps==='helmet'?'<path d="M31 48Q26 13 60 10Q94 13 89 48L81 62L77 34Q60 27 41 36L39 64Z" fill="#634d3b" stroke="'+trim+'" stroke-width="1.6"/><path d="M37 35L83 35" stroke="'+trim+'" stroke-width="3"/>':
 caps==='beret'?'<path d="M29 35Q20 17 57 12Q95 9 91 29L84 39Q62 33 31 41Z" fill="'+coat+'" stroke="'+trim+'" stroke-width="2"/>':''}
 ${hairParts.side}
 ${opt.goggles%3===2?'<rect x="37" y="29" width="21" height="12" rx="5" fill="#8db3b8" stroke="#c8b893" stroke-width="3"/><rect x="63" y="29" width="21" height="12" rx="5" fill="#8db3b8" stroke="#c8b893" stroke-width="3"/>':''}
 <path d="M93 108l9 5m-9 2l9 5" stroke="${trim}" stroke-width="2"/>
 <path d="M4 140H116" stroke="#e9e1c4" opacity=".42"/><path d="M104 17l6 8m-6 0l6-8" stroke="#fff" opacity=".20" stroke-width="1.4"/>
 ${paintedArt}
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
  rank:run.rank,
  types:(run.rank>=3&&run.rank<MAX_RANK&&i===2&&run.rank%2===1)?[p.plane,shuffled.find(x=>x.id!==p.id&&x.plane!==p.plane)?.plane||p.plane]:[p.plane],
  difficulty:run.rank<2?'rookie':run.rank<5?'standard':'ace',
  arena:(run.rank+i)%4,
  attributes:p.attributes,
  signature:p.signature||ROSTER.find(x=>x.id===p.rosterId)?.signature,
  label:p.name
 }));
}
function show(which='ladder'){
 if((!data||which==='select')&&!candidates.length)candidates=generateCandidates();
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
 // Preview all defined characters, not three random names/stats.
 return ROSTER.filter(p=>p.faction===selectFaction).map(p=>({
  id:p.id,roster:p,style:{...appearance(p.portrait*47+9),portraitIndex:p.portrait%5},
  attributes:{...p.attributes}
 }));
}
let selectFaction=data?.profile?.faction==='Axis'?'Axis':'Allies';
function candidatePicker(){
 return '<div class="character-roster">'+candidates.map((c,i)=>
 '<button type="button" data-candidate="'+i+'" class="candidate-card" aria-label="Choose '+escape(c.roster.name)+'">'+
 '<div class="candidate-portrait">'+pilotPortrait(c.roster.faction,{...c.style,rosterPortrait:c.roster.portrait})+'</div>'+
 '<strong>'+escape(c.roster.name)+'</strong><small>'+escape(c.roster.archetype)+' · '+escape(aircraft[c.roster.plane])+'</small>'+
 '<p class="character-bio">'+escape(c.roster.bio)+'</p>'+
 '<small>TURN '+c.attributes.manoeuvrability+' · GUNS '+c.attributes.gunnery+' · ENGINE '+c.attributes.engine+'</small>'+
 '<span>'+escape(PILOT_SKILLS.find(x=>x[0]===c.roster.signature)?.[1]||'SPECIAL')+'</span></button>').join('')+'</div>';
}
function createProfile(index){
 const chosen=candidates[index];if(!chosen)return;
 if(data&&!window.confirm('Create a new pilot? This replaces your current career and Road to Ace progress.'))return;
 const name=chosen.roster.name;
 const faction=chosen.roster.faction;
 airframeOffers=[];
 data={profile:{name,faction,rosterId:chosen.roster.id,plane:chosen.roster.plane,style:chosen.style,attributes:chosen.attributes,skill:chosen.roster.signature},wins:0,losses:0,kills:0,records:{},best:0,completed:0,run:null};
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
 // A true 3-lane branching route: choices fan out from each tier and reconnect
 // into the next rank. Completed and future tiers remain visible on the map.
 for(let rank=MAX_RANK;rank>=1;rank--){
  const current=rank===run.rank,cleared=rank<run.rank;
  const status=current?'current':cleared?'cleared':'locked';
  const options=[0,1,2].map((lane)=>{
   if(!current)return '<div class="route-node '+status+'" aria-label="Rank '+rank+' route '+(lane+1)+' '+status+'"><span class="route-node-symbol">'+(cleared?'✓':'◆')+'</span><small>'+(cleared?'CLEARED':'UNKNOWN ACE')+'</small></div>';
   const op=run.choices[lane],p=byId[op?.id],record=data.records[op?.id];
   if(!p)return '<div class="route-node locked">?</div>';
   const appearance={...p.appearance};
   const fixed=ROSTER.find(x=>x.id===p.rosterId);
   // Identity remains stable wherever this pilot reappears in the tree.
   if(fixed)appearance.rosterPortrait=fixed.portrait;
   else appearance.portraitIndex=((Number(p.id.replace('pilot-',''))||0)*7)%5;
   return '<button class="route-node route-opponent" data-choice="'+lane+'" aria-label="Challenge '+escape(p.name)+'"><span class="route-photo">'+pilotPortrait(p.faction,{...appearance,rosterPortrait:ROSTER.find(x=>x.id===p.rosterId)?.portrait??Number(p.id.replace('pilot-',''))})+'</span><strong>'+escape(p.name)+'</strong><small>'+escape(op.types.map(t=>aircraft[t]).join(' + '))+'</small>'+(record?'<em>'+record.wins+'–'+record.losses+' RIVALRY</em>':'')+'<span class="route-cta">CHALLENGE →</span></button>';
  }).join('');
  rows.push('<section class="route-tier '+status+'" '+(current?'id="active-rung"':'')+'><div class="route-rank">'+(rank===MAX_RANK?'★ FINAL ACE':'RANK '+rank)+(current?' • CHOOSE A BRANCH':'')+'</div><div class="route-fork" aria-hidden="true"><span></span><span></span><span></span></div><div class="route-three">'+options+'</div><div class="route-join" aria-hidden="true"><span></span><span></span><span></span></div></section>');
 }
 return '<div class="ladder-scroll campaign-tree career-route-map" role="region" aria-label="Eight rank branching career map with three routes per rank" tabindex="0"><div class="tree-spine route-spine">'+rows.join('')+'</div></div>';
}
function characterPicker(){
 if(!data?.profile)return '';
 const p=data.profile;
 const members=ROSTER.filter(x=>x.faction===p.faction);
 return '<p class="career-muted">32 defined pilots across both squadrons. Switching an existing career changes identity and ability while retaining earned wins, rank and progression.</p>'+
 '<div class="character-roster" role="group" aria-label="Choose your Wingman pilot">'+members.map(pilot=>{
 const selected=data.profile.rosterId===pilot.id;
 return '<button type="button" data-roster="'+pilot.id+'" class="candidate-card '+(selected?'selected':'')+'" aria-pressed="'+selected+'">'+
 '<div class="candidate-portrait">'+pilotPortrait(pilot.faction,{...appearance(pilot.portrait*47+9),rosterPortrait:pilot.portrait})+'</div>'+
 '<strong>'+escape(pilot.name)+'</strong><small>'+escape(pilot.archetype)+' · '+escape(aircraft[pilot.plane])+'</small>'+
 '<p class="character-bio">'+escape(pilot.bio)+'</p><small>TURN '+pilot.attributes.manoeuvrability+' · GUNS '+pilot.attributes.gunnery+' · ENGINE '+pilot.attributes.engine+'</small>'+
 '<span>'+escape(PILOT_SKILLS.find(x=>x[0]===pilot.signature)?.[1]||'SPECIAL')+'</span></button>';
 }).join('')+'</div><button type="button" data-action="licence">BACK TO LICENCE</button>';
}
function render(){
 if(data&&view==='character'){panel('CHOOSE YOUR CHARACTER',characterPicker());return;}
 if(!data||view==='select'){
  if(!candidates.length)candidates=generateCandidates();
  panel('SELECT YOUR ACE',`<p class="career-muted">Choose one of 32 predefined pilots. Each has a fixed identity, aircraft, stats and signature skill. The opposing squadron supplies your rivals.</p>
  <div class="candidate-identity"><label>SQUADRON <select id="career-faction"><option value="Allies" ${selectFaction==='Allies'?'selected':''}>RAF — 20 PILOTS</option><option value="Axis" ${selectFaction==='Axis'?'selected':''}>LUFTWAFFE — 12 PILOTS</option></select></label></div>
  <div id="candidate-picker">${candidatePicker()}</div>
  ${data?'<button data-action="licence">BACK TO CURRENT PILOT</button>':''}`);
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
   <button class="career-primary" data-action="ladder">ROAD TO ACE</button><button data-action="character">CHOOSE CHARACTER & NAME</button><button data-action="select">START A NEW PILOT</button>`);
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
 <p class="career-muted">Choose one of three rival branches to ascend. Cleared ranks remain below; future ranks are locked above.</p>
 ${ladder(run)}<div class="career-bottom-actions"><button data-action="licence">VIEW PILOT LICENCE</button><button data-action="character">CHOOSE CHARACTER</button></div>`);
 const marker=screen.querySelector('#active-rung'),list=screen.querySelector('.ladder-scroll');
  // Only centre the active rank inside the ladder itself. scrollIntoView()
  // also scrolled the outer career panel and hid the title/navigation on phones.
  if(marker&&list){
    const a=marker.getBoundingClientRect(),b=list.getBoundingClientRect();
    list.scrollTop+=a.top-b.top-(list.clientHeight-a.height)/2;
  }

}
screen.addEventListener('click',e=>{
 const el=e.target.closest('button');if(!el)return;
 const action=el.dataset.action;
 if(action==='close')close();
 if(action==='select'){view='select';if(!candidates.length)candidates=generateCandidates();render();}
 if(action==='reroll'){candidates=generateCandidates();render();}
 if(action==='character'&&data){view='character';render();}
 if(el.dataset.portrait!==undefined&&data?.profile){
  const name=document.getElementById('character-name')?.value;
  const choice=Number(el.dataset.portrait);
  if(Number.isInteger(choice)&&choice>=0&&choice<5){
   const style=data.profile.style||(data.profile.style=appearance(0));
   style.portraitIndex=choice;
   if(name?.trim())data.profile.name=name.trim().slice(0,30);
   save();view='character';render();
  }
 }
 if(action==='save-character'&&data?.profile){
  const name=document.getElementById('character-name')?.value.trim();
  if(name)data.profile.name=name.slice(0,30);
  save();view='licence';render();
 }
 if(el.dataset.roster&&data?.profile){
  const newPilot=ROSTER.find(p=>p.id===el.dataset.roster);
  if(newPilot&&newPilot.faction===data.profile.faction){
   // Existing career progress is retained; current sortie's chosen plane
   // remains unchanged until the next run.
   data.profile.rosterId=newPilot.id;data.profile.name=newPilot.name;
   data.profile.plane=newPilot.plane;data.profile.skill=newPilot.signature;
   data.profile.attributes={...newPilot.attributes};
   data.profile.style={...appearance(newPilot.portrait*47+9),portraitIndex:newPilot.portrait%5,rosterPortrait:newPilot.portrait};
   save();view='licence';render();
  }
 }
 if(el.dataset.candidate!==undefined)createProfile(Number(el.dataset.candidate));
 if(action==='ladder'){view=data?.run?'ladder':'licence';if(data&&!data.run)view='ladder';render();}
 if(action==='licence'){view='licence';render();}
 if(action==='portrait'&&data?.profile){
  const style=data.profile.style||(data.profile.style=appearance(0));
  const originalArt=((Number(style.face)||0)*3+(Number(style.hair)||0))%5;
  style.portraitIndex=((Number.isInteger(style.portraitIndex)?style.portraitIndex:originalArt)+1)%5;
  save();view='licence';render();
 }
 if(el.dataset.aircraft)startRun(el.dataset.aircraft);
 if(el.dataset.choice!==undefined)fight(Number(el.dataset.choice));
});
screen.addEventListener('change',e=>{
 if(e.target.id==='career-skill'){selectedSkill=e.target.value;}
 if(e.target.id==='career-faction'){selectFaction=e.target.value;candidates=generateCandidates();
  const picker=document.getElementById('candidate-picker');
  if(picker)picker.innerHTML=candidatePicker();
 }
});
nav.addEventListener('click',()=>show(data?'ladder':'select'));licenceBtn.addEventListener('click',()=>show('licence'));
document.getElementById('career-open-mobile')?.addEventListener('click',()=>show(data?'ladder':'select'));
window.WingmanCareer={finishEncounter,open:show};
})();

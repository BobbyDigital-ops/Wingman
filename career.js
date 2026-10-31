/* Road to Ace — self-contained single-player campaign, saved locally. */
(()=>{
'use strict';
const STORE='wingman-road-to-ace-v1',MAX_RANK=12;
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
const aircraft={fighter:'Spitfire',heavy:'Beaufighter',bomber:'Lancaster',bf109:'Messerschmitt Bf 109E',bf110:'Zerstörer (Bf 110)',he111:'Heinkel He 111'};
const screen=document.getElementById('career-screen'),menu=document.getElementById('menu'),result=document.getElementById('result');
const nav=document.getElementById('career-open'),licenceBtn=document.getElementById('career-license');
function load(){try{
 const o=JSON.parse(localStorage.getItem(STORE)||'null');
 if(!o?.profile)return null;
 // Reconcile older saved German identities with the fixed painted-portrait
 // canon. Never overwrite a player's custom callsign.
 const chosen=ROSTER.find(p=>p.id===o.profile.rosterId);
 if(chosen&&chosen.faction==='Axis'){
  const oldNames={
   'ace-24':['Kurt "Korken" Weber','Klara "Korken" Weber'],
   'ace-26':['Hans "Bratwurst" Fischer'],
   'ace-27':['Lotte "Schwalbe" Fischer'],
   'ace-32':['Günther "Käsekopf" Hoffmann','Gisela "Käsekopf" Hoffmann']
  };
  if(oldNames[chosen.id]?.includes(o.profile.name))o.profile.name=chosen.name;
  o.profile.gender=chosen.gender;
 }
 o.records=o.records&&typeof o.records==='object'?o.records:{};
 o.medals=Array.isArray(o.medals)?o.medals:[];
 o.service=Array.isArray(o.service)?o.service.slice(-32):[];
 o.streak=Math.max(0,Number(o.streak)||0);
 o.bestStreak=Math.max(0,Number(o.bestStreak)||0);
 return o;
 }catch{return null;}}
let data=load(),active=null,showing=false,view='ladder';
const campaign=window.WingmanCampaign;
if(data?.run&&campaign){
 campaign.normalizeRun(data.run);
 // Keep the pilot's old progress and route history when upgrading saves.
 if(!Number.isInteger(data.run.lastLane)&&data.run.rank>1){
   const previous=[...(data.service||[])].reverse().find(e=>e.rank===data.run.rank-1);
   data.run.lastLane=previous?.risk==='LOW'?0:previous?.risk==='HIGH'?2:
     previous?.risk==='MEDIUM'?1:1;
 }
 if(data.run.rank===1)data.run.lastLane=null;
 data.run.allowedLanes=campaign.reachableLanes(data.run.lastLane,data.run.rank);
 if(!Array.isArray(data.run.pathHistory)){
  data.run.pathHistory=(data.service||[]).filter(e=>e.rank<data.run.rank&&e.won!==false).map(e=>({rank:e.rank,lane:e.lane??(e.risk==='LOW'?0:e.risk==='HIGH'?2:1),mission:e.mission||'COMPLETED'}));
 }
 // Migrate current v0.7 missions once without resetting rank, lives,
 // earned effects, service history or a pending post-sortie reward.
 if(!data.run.pendingReward&&(data.run.campaignSchema!==11||
   !Array.isArray(data.run.choices)||data.run.choices.length!==3||
   data.run.choices.some(c=>!c?.objective))){
   data.run.choices=makeChoices(data.run);
   data.run.campaignSchema=11;
 }
 if(data.run.pendingReward)view='outcome';
 save();
}
function save(){try{localStorage.setItem(STORE,JSON.stringify(data));}catch{}}
 const MEDALS=[
  {id:'first-blood',title:'FIRST VICTORY',desc:'Win your first aerial encounter',glyph:'✦'},
  {id:'triple-ace',title:'TRIPLE ACE',desc:'Win three consecutive sorties',glyph:'★'},
  {id:'veteran',title:'VETERAN WINGS',desc:'Reach rank five',glyph:'❖'},
  {id:'double-trouble',title:'TWO AGAINST ONE',desc:'Defeat two enemy aircraft',glyph:'⚔'},
  {id:'iron-will',title:'IRON WILL',desc:'Survive a run after losing a life',glyph:'◆'},
  {id:'wingman-legend',title:'WINGMAN LEGEND',desc:'Defeat the final three-aircraft squadron',glyph:'♛'}
 ];
 const rankTitle=rank=>rank>=12?'LEGENDARY ACE':rank>=9?'ACE COMMANDER':rank>=5?'FLIGHT LEADER':rank>=3?'FLYING OFFICER':'ROOKIE';
 const medal=code=>{
  data.medals||=[];if(data.medals.includes(code))return false;
  data.medals.push(code);return true;
 };
 const archiveService=entry=>{
  data.service||=[];data.service.push(entry);data.service=data.service.slice(-32);
 };
 function serviceMarkup(limit=7){
  const entries=(data?.service||[]).slice(-limit).reverse();
  return '<section class="career-service"><h3>FLIGHT LOG</h3>'+
   (entries.length?entries.map(e=>'<div class="career-log-entry"><span>'+escape(e.won?'✓ VICTORY':'✕ DEFEAT')+'</span><strong>'+escape(e.rival||'UNKNOWN')+'</strong><small>R'+e.rank+' · '+escape(e.mission||'SORTIE')+'</small></div>').join(''):'<p class="career-muted">Your service record begins with your first sortie.</p>')+'</section>';
 }
 function medalMarkup(){
  return '<section class="career-medals"><h3>HONOURS & DECORATIONS</h3><div class="medal-strip">'+MEDALS.map(m=>
   '<div class="medal '+(data?.medals?.includes(m.id)?'earned':'locked')+'" title="'+escape(m.desc)+'"><span aria-hidden="true">'+m.glyph+'</span><strong>'+escape(m.title)+'</strong><small>'+escape(m.desc)+'</small></div>').join('')+'</div></section>';
 }
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


// Luftwaffe character cards: individually composed, centred busts, separate from
// the established RAF painted atlas. The twenty designs are indexed by pilot ID.
function germanPilotPortrait(slot){
 const pilots=window.WingmanRoster||[];
 const p=pilots.find(x=>x.portrait===slot&&x.faction==='Axis');
 const i=p?pilots.filter(x=>x.faction==='Axis').findIndex(x=>x.id===p.id):Math.max(0,slot-20);
 const paintedReady=window.WingmanGermanPortraitsReady===true && !!window.WingmanGermanPortraitAtlas;
 if(i>=0&&i<20&&paintedReady){
  // Direct, stable one-to-one mapping. All 20 tiles are distinct.
  // Female faces are slots 3, 5, 11, 14, 16 and 18, matching roster gender.
  const artworkSlot=i,col=artworkSlot%4,row=Math.floor(artworkSlot/4);
  return '<svg class="pilot-avatar german-painted" viewBox="0 0 96 112" role="img" aria-label="'+escape(p?.name||'German pilot')+' portrait" overflow="hidden"><image href="'+window.WingmanGermanPortraitAtlas+'" x="'+(-col*96)+'" y="'+(-row*112)+'" width="384" height="560" preserveAspectRatio="none"/></svg>';
 }
 const female=p?.gender==='female';
 const faces=['#e6b18c','#e2a77e','#c9906c','#efc4a3','#bd876b','#e9b897','#d6a081','#efc9a7','#b68161','#eabda0',
 '#dbad91','#c98f73','#e8b998','#e0a987','#f0c5a4','#d4a184','#c98b67','#e9b794','#dba68a','#edc3a6'];
 const hair=['#302c2b','#644530','#b58a5c','#282a29','#85634a','#4a3330','#c1a17c','#453932','#7b4e3c','#b7a27e',
 '#252528','#5a4437','#aa8260','#3b3030','#6d5040','#b5a078','#2d3335','#77513a','#3b3437','#c18b54'];
 const uniforms=['#657168','#53645a','#626b5b','#475c59','#6a6657','#53625a'];
 const backgrounds=['#a1afb1','#8c9692','#a7a79b','#788f96','#a3a19a','#879c99'];
 const face=faces[i],locks=hair[i],uniform=uniforms[i%6],background=backgrounds[i%6];
 const headWidth=[24,30,22,25,32,23,26,29,24,27,22,30,26,24,29,22,31,26,23,28][i];
 const chin=[88,94,85,91,89,97,87,90,98,86,93,88,97,86,94,89,91,99,86,92][i];
 const brow=[0,2,-1,3,-2,1,-3,2,0,-2,3,-1,2,-2,0,3,-1,1,-3,2][i];
 const cap=[1,0,2,0,3,1,0,2,1,0,3,2,1,0,2,0,3,1,0,2][i];
 const moustache=!female&&[0,4,7,11,15,19].includes(i);
 const beard=!female&&[5,12].includes(i);
 const glasses=[6,16].includes(i);
 const monocle=i===9;
 const eyepatch=i===14;
 const scar=[2,10,18].includes(i);
 const pipe=i===5;
 const goggles=[1,8,13,17].includes(i);
 const hairShape=female
 ? '<path d="M30 46Q24 17 54 13Q93 10 94 48L91 103L77 107L81 53L39 49L39 105L26 104Z" fill="'+locks+'"/>'
 : ['<path d="M34 46Q30 18 48 19Q63 7 80 19L87 42Q67 32 54 38L39 51Z" fill="'+locks+'"/>',
 '<path d="M30 49L34 20L49 29L58 10L73 26L85 18L91 47L76 40L53 37L38 56Z" fill="'+locks+'"/>',
 '<path d="M32 45Q36 17 58 14Q82 14 87 43Q70 31 54 38L36 52Z" fill="'+locks+'"/>'][i%3];
 const hat=cap===1?'<path d="M29 45Q26 17 60 13Q90 14 91 44L79 39L39 41Z" fill="#5b6055" stroke="#333b38" stroke-width="2"/><path d="M30 41Q60 35 93 41L82 49L39 49Z" fill="#323c3b"/><circle cx="60" cy="29" r="3" fill="#c5c5b5"/>'
 :cap===2?'<path d="M29 48Q28 12 59 11Q93 13 90 50L83 62L79 36Q57 30 41 38L39 65Z" fill="#4b4037" stroke="#272d2d" stroke-width="2"/><path d="M36 36H84" stroke="#a8a39a" stroke-width="3"/>'
 :cap===3?'<path d="M28 39Q18 26 41 17Q67 7 88 23L89 36L72 42L36 45Z" fill="#4d5c59" stroke="#253b3a" stroke-width="2"/>':'';
 const ornaments=[
  '<rect x="18" y="116" width="13" height="7" rx="2" fill="#a6aca0"/>',
  '<path d="M88 114l12 4l-9 8Z" fill="#a9a48c"/>',
  '<circle cx="24" cy="120" r="6" fill="#bca66b"/>',
  '<path d="M89 112l9 8l-9 8l-9-8Z" fill="#b6afa2"/>'
 ][i%4];
 // All artwork uses a consistent 120x144 viewBox, centred at x=60.
 return '<svg class="pilot-avatar german-unique" viewBox="0 0 120 144" role="img" aria-label="'+escape(p?.name||'Luftwaffe pilot')+' portrait">'+
 '<rect width="120" height="144" fill="'+background+'"/><path d="M0 65L120 12V0H0Z" fill="#ffffff" opacity=".14"/>'+
 '<circle cx="92" cy="31" r="32" fill="#f4e7c4" opacity=".12"/>'+
 '<path d="M0 144Q3 105 37 100L49 91H72L83 100Q119 107 120 144Z" fill="'+uniform+'" stroke="#35463f" stroke-width="3"/>'+
 '<path d="M34 104L48 143H71L86 103L70 96H49Z" fill="#34433f"/>'+
 '<path d="M51 88L50 101L60 113L71 100L69 87Z" fill="'+face+'"/>'+
 hairShape+
 '<path d="M'+(60-headWidth)+' 50Q'+(60-headWidth-5)+' 27 60 26Q'+(60+headWidth+5)+' 27 '+(60+headWidth)+' 50L'+(60+headWidth-2)+' 73Q75 '+chin+' 60 '+chin+'Q45 '+chin+' '+(60-headWidth+2)+' 73Z" fill="'+face+'" stroke="#825f51" stroke-width="1.5"/>'+
 '<path d="M'+(60-headWidth+3)+' 58q-8 -5 -6 5q4 11 9 7M'+(60+headWidth-3)+' 58q8 -5 6 5q-4 11 -9 7" fill="'+face+'" stroke="#916e59" stroke-width="1.2"/>'+
 '<path d="M39 '+(53+brow)+'Q48 '+(48+brow)+' 55 '+(53+brow)+'M65 '+(53-brow)+'Q73 '+(48-brow)+' 81 '+(53-brow)+'" fill="none" stroke="'+locks+'" stroke-width="'+(female?2.4:3.6)+'"/>'+
 '<ellipse cx="48" cy="61" rx="5.8" ry="2.5" fill="#e8e4d6"/><ellipse cx="73" cy="61" rx="5.8" ry="2.5" fill="#e8e4d6"/>'+
 '<circle cx="'+(48+i%3-1)+'" cy="61" r="2.25" fill="#384b51"/><circle cx="'+(72+i%3-1)+'" cy="61" r="2.25" fill="#384b51"/>'+
 '<path d="M60 58l'+(i%4-1)+' 13l-5 1" stroke="#a26b55" stroke-width="1.6" fill="none"/>'+
 '<path d="M51 79Q60 '+(80+(i%5))+' 69 79" fill="none" stroke="#8d5c54" stroke-width="1.6"/>'+
 (moustache?'<path d="M45 75Q52 69 59 74Q68 69 76 75Q68 78 60 76Q52 79 45 75Z" fill="'+locks+'"/>':'')+
 (beard?'<path d="M37 74Q43 92 60 101Q77 93 83 74L76 83Q60 96 44 83Z" fill="'+locks+'" opacity=".85"/>':'')+
 (glasses?'<g stroke="#3d403c" stroke-width="2.4" fill="none"><circle cx="48" cy="60" r="10"/><circle cx="73" cy="60" r="10"/><path d="M58 59h5M38 59l-6 -4M83 59l5 -4"/></g>':'')+
 (monocle?'<circle cx="74" cy="60" r="11" stroke="#b6a16b" stroke-width="2" fill="none"/><path d="M84 64Q88 80 86 104" fill="none" stroke="#b6a16b"/>':'')+
 (eyepatch?'<path d="M32 56L86 46" stroke="#272b2b" stroke-width="3"/><ellipse cx="48" cy="61" rx="10" ry="8" fill="#252a2b"/>':'')+
 (scar?'<path d="M75 67l-6 16" stroke="#925b50" stroke-width="2.5"/>':'')+
 (pipe?'<path d="M69 79l19 8l8 -11" stroke="#503b30" stroke-width="3" fill="none"/>':'')+
 hat+
 (goggles?'<rect x="37" y="'+(cap===2?32:18)+'" width="20" height="11" rx="5" stroke="#b0a487" stroke-width="3" fill="#5b858a"/><rect x="64" y="'+(cap===2?32:18)+'" width="20" height="11" rx="5" stroke="#b0a487" stroke-width="3" fill="#5b858a"/>':'')+
 ornaments+
 '<path d="M8 8H24M8 8V23M111 135H97M111 135V120" fill="none" stroke="#e2ded0" stroke-width="1.4" opacity=".65"/></svg>';
}

function pilotPortrait(faction,look=0){
 if(faction==='Axis'&&typeof look==='object'&&Number.isInteger(look.rosterPortrait))return germanPilotPortrait(look.rosterPortrait);
 const opt=typeof look==='object'?look:appearance(look);
 const axis=faction==='Axis';
 const skins=['#f9bc93','#df9e78','#b97957','#895b4c','#f8d2ac'];
 const hairs=['#202a34','#71463b','#d39c5c','#efbf77','#151c2b','#a64f3c'];
 const skin=skins[opt.skin%skins.length],hair=hairs[opt.hair%hairs.length];
 const coat=axis?'#5a645a':'#2b6382',trim=axis?'#bdc5b4':'#e8ca8e';
 const backdrops=[['#63bac4','#1c456d'],['#ba7770','#4b3b62'],['#539e8e','#233b56'],['#8799c7','#2d355c'],['#d39a59','#514058'],['#4688b8','#143e5c']];
 const bg=axis?['#8e9b8b','#394c51']:backdrops[(opt.face*3+opt.hair)%backdrops.length];
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
 const portraitSlot=Number.isInteger(opt.rosterPortrait)?opt.rosterPortrait:-1;
 const rosterArt=portraitSlot>=0&&portraitSlot<32&&window.WingmanRosterPortraitAtlas?
  `<svg class="unique-pilot-portrait" viewBox="0 0 120 144" x="0" y="0" width="120" height="144" overflow="hidden">
    <image href="${window.WingmanRosterPortraitAtlas}" x="${-(portraitSlot%8)*120}" y="${-Math.floor(portraitSlot/8)*144}" width="960" height="576" preserveAspectRatio="none"/>
   </svg>`:'';
 const paintedArt=portraitSlot<0&&window.WingmanPaintedAtlas?
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
 ${rosterArt}
 </svg>`;
}
function makeChoices(run){
 const enemyFaction=run.faction==='Allies'?'Axis':'Allies';
 const pool=CATALOG.filter(p=>p.faction===enemyFaction);
 const seed=(run.seed+run.rank*37+run.visits*19)>>>0;
 const shuffled=pool.map((p,i)=>({p,sort:((i*53+seed*17+i*i*11)%113)}))
  .sort((a,b)=>a.sort-b.sort).map(o=>o.p);
 const nemesis=pool.map(p=>({p,r:data?.records?.[p.id]}))
  .filter(x=>x.r&&(x.r.losses||x.r.wins))
  .sort((a,b)=>((b.r.losses||0)*3+(b.r.wins||0))-((a.r.losses||0)*3+(a.r.wins||0)))[0]?.p;
 const picked=[];
 if(nemesis&&run.rank>=5)picked.push(nemesis);
 for(const p of shuffled)if(picked.length<3&&!picked.some(q=>q.id===p.id))picked.push(p);
 const fixed=window.WingmanPilotAI;
 const profile=p=>{
  const scaled=fixed?.level(p,run.rank);
  return {id:p.id,name:p.name,plane:p.plane,scaledForRank:run.rank,
   attributes:scaled?.attributes||p.attributes,
   signature:scaled?.signature||p.signature||'roll',
   archetype:p.archetype||'Balanced',personality:scaled?.tactic||'duellist'};
 };
 const chooseEscorts=(boss,lane)=>{
  const options=shuffled.filter(p=>p.id!==boss.id);
  const first=options[(seed+lane*3)%options.length];
  const second=options.filter(p=>p.id!==first.id&&p.plane!==first.plane)[(seed+lane*7)%options.filter(p=>p.id!==first.id&&p.plane!==first.plane).length]||options.find(p=>p.id!==first.id);
  return [first,second];
 };
 return [0,1,2].map(i=>{
  // Rank twelve is always a three-plane finale: two escorts launch first,
  // then the SAME named final ace enters, whatever approach the player picks.
  const final=run.rank===MAX_RANK;
  const p=final?(nemesis||shuffled[(run.seed+13)%shuffled.length]):picked[i];
  const duo=!final&&run.rank>=3&&i===2&&run.rank%2===1;
  const lead=profile(p);
  const wing=duo?shuffled.find(q=>q.id!==p.id&&q.plane!==p.plane):null;
  const w=wing?profile(wing):null;
  const escorts=final?chooseEscorts(p,i).map(profile):[];
  const opponents=final?[...escorts,lead]:w?[lead,w]:[lead];
  const mission=final?'FINAL SHOWDOWN':duo?'DOUBLE ACE':i===0?'INTERCEPTION':i===1?'HIGH-ALTITUDE DUEL':'HUNTER PATROL';
  const encounter={id:p.id,rank:run.rank,types:opponents.map(q=>q.plane),
   difficulty:run.rank<2?'rookie':run.rank<5?'standard':'ace',
   arena:(run.rank+i)%4,attributes:lead.attributes,signature:lead.signature,
   archetype:lead.archetype,personality:lead.personality,
   wingman:w,wingmen:escorts,
   opponents,finalBoss:final,bossId:final?p.id:null,mission,
   label:p.name};
  return campaign?.decorateEncounter(encounter,run,i,{pool:shuffled,profile})||encounter;
 });
}
function show(which='ladder'){
 // Existing unconfirmed legacy pilots are not treated as a default choice.
 // Do not discard their records; require the player to confirm an identity.
 if(!data)which='select';
 else if(!data.profile.characterConfirmed)which='character';
 if((!data||which==='select')&&!candidates.length)candidates=generateCandidates();
 if(data?.run?.pendingReward)which='outcome';
 if(data?.run?.rank===MAX_RANK&&!data.run.choices?.every(c=>c.finalBoss)){
   data.run.choices=makeChoices(data.run);save();
 }
 showing=true;view=which;screen.hidden=false;menu.classList.add('hidden');result.classList.add('hidden');render();
}
function close(){pendingChoice=null;pendingAircraft=null;showing=false;screen.hidden=true;window.WingmanGame?.showMenu();}
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
  id:p.id,roster:p,style:{...appearance(p.portrait*47+9),rosterPortrait:p.portrait},
  attributes:{...p.attributes}
 }));
}
let selectFaction=data?.profile?.faction==='Axis'?'Axis':'Allies';
function candidatePicker(){
 return '<div class="character-roster">'+candidates.map((c,i)=>
 '<button type="button" data-candidate="'+i+'" class="candidate-card" aria-label="Confirm '+escape(c.roster.name)+' as your pilot">'+
 '<div class="candidate-portrait">'+pilotPortrait(c.roster.faction,{...c.style,rosterPortrait:c.roster.portrait})+'</div>'+
 '<strong>'+escape(c.roster.name)+'</strong><small>'+escape(c.roster.archetype)+' · '+escape(aircraft[c.roster.plane])+'</small>'+
 '<p class="character-bio">'+escape(c.roster.bio)+'</p>'+
 '<small>TURN '+c.attributes.manoeuvrability+' · GUNS '+c.attributes.gunnery+' · ENGINE '+c.attributes.engine+'</small>'+
 '<span>CONFIRM PILOT · '+escape(PILOT_SKILLS.find(x=>x[0]===c.roster.signature)?.[1]||'SPECIAL')+'</span></button>').join('')+'</div>';
}
function createProfile(index){
 const chosen=candidates[index];if(!chosen)return;
 if(data&&!data.awaitingPilotSelection&&!window.confirm('Create a new pilot? This replaces your current career and Road to Ace progress.'))return;
  const retained=data?.awaitingPilotSelection?data:null;
 const name=chosen.roster.name;
 const faction=chosen.roster.faction;
 airframeOffers=[];
 data={profile:{name,faction,rosterId:chosen.roster.id,plane:chosen.roster.plane,style:chosen.style,attributes:chosen.attributes,skill:chosen.roster.signature,characterConfirmed:true,gender:chosen.roster.gender},wins:0,losses:0,kills:0,records:{},best:0,completed:0,streak:0,bestStreak:0,medals:[],service:[],run:null};
 if(retained){for(const key of ['wins','losses','kills','records','best','completed','streak','bestStreak','medals','service'])if(retained[key]!==undefined)data[key]=retained[key];}
  data.awaitingPilotSelection=false;
  save();view='ladder';render();
}
const BASE_AIRCRAFT={fighter:{speed:82,turn:3.15,hull:130,armour:40},heavy:{speed:75,turn:1.98,hull:160,armour:78},bomber:{speed:66,turn:1.30,hull:180,armour:124},bf109:{speed:87,turn:3.02,hull:125,armour:42},bf110:{speed:78,turn:1.91,hull:160,armour:75},he111:{speed:69,turn:1.35,hull:175,armour:116}};
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
 if(!data?.profile)return;
 const allowed=data.profile.faction==='Allies'?ALLIES:AXIS;
 if(!allowed.includes(aircraftId))return;
 data.run={faction:data.profile.faction,aircraft:aircraftId,airframe:null,rank:1,
  lives:3,visits:0,seed:Math.floor(Math.random()*10000),choices:null,campaignSchema:11,lastLane:null,allowedLanes:[0,1,2],pathHistory:[]};
 campaign?.normalizeRun(data.run);
 data.run.choices=makeChoices(data.run);save();view='ladder';render();
}
let pendingChoice=null;
let pendingAircraft=null;
function fight(index){
 if(!data?.run||active||data.run.pendingReward||!data.run.choices?.[index]||
    !campaign?.reachableLanes(data.run.lastLane,data.run.rank).includes(index))return;
 pendingChoice=index;pendingAircraft=data.profile.plane;view='sortie';render();
}
function resolveCampaignEvent(index,optionId){
 const run=data?.run;
 if(!run||active||run.pendingReward||!Array.isArray(run.choices))return null;
 if(!Number.isInteger(index)||index<0||index>2)return null;
 const enc=run.choices[index];
 if(!enc?.isNonCombat||enc.rank!==run.rank||
   !campaign.reachableLanes(run.lastLane,run.rank).includes(index))return null;
 const result=campaign?.resolveEvent?.(run,enc,optionId);
 if(!result)return null;
 const atRank=run.rank;
 run.pathHistory??=[];
 run.pathHistory.push({rank:atRank,lane:index,mission:enc.mission,nodeType:enc.nodeType});
 run.lastLane=index;
 run.rank=Math.min(MAX_RANK+1,run.rank+1);
 run.allowedLanes=campaign.reachableLanes(run.lastLane,run.rank);
 run.visits=(run.visits||0)+1;
 data.best=Math.max(data.best||1,Math.min(MAX_RANK,run.rank));
 archiveService({won:true,kind:'event',rank:atRank,lane:index,rival:enc.label,
  mission:enc.mission,kills:0,grade:'—',risk:'EVENT',result:'EVENT COMPLETED'});
 data.lastOutcome={won:true,kind:'event',rank:atRank,mission:enc.mission,
  label:enc.label,kills:0,grade:'—',description:result.description};
 if(run.rank>MAX_RANK)return null; // Final rung is a mandatory combat boss.
 run.choices=makeChoices(run);
 run.campaignSchema=11;
 save();
 if(showing){view='ladder';render();}
 return result;
}
function launchSortie(type){
 const run=data?.run;if(!run||run.pendingReward||pendingChoice===null||active)return;
 if(!(run.faction==='Allies'?ALLIES:AXIS).includes(type))return;
 const choice=run.choices[pendingChoice];if(!choice||
   !campaign.reachableLanes(run.lastLane,run.rank).includes(pendingChoice)||choice.isNonCombat)return;
 const lead=byId[choice.id],scaled=lead?window.WingmanPilotAI?.level(lead,run.rank):null;
 if(scaled){choice.attributes=scaled.attributes;choice.signature=scaled.signature;choice.archetype=scaled.archetype;choice.personality=scaled.tactic;}
 choice.playerAptitude=campaign?.sortieBonuses(run,type,type===data.profile.plane)||
   (type===data.profile.plane?{hull:1.1,armour:1.1,damage:1.1}:null);
 choice.playerAircraft=type;run.aircraft=type;run.airframe=null;
 pendingChoice=null;pendingAircraft=null;save();active=choice;showing=false;screen.hidden=true;
 window.WingmanGame.startCampaignFight(choice,type,null);
}
function finishEncounter(won,encounter,summary={}){
 if(!active||!data?.run)return;
 const run=data.run,rival=active;
 const atRank=run.rank;
 const potentialKills=rival.totalEnemyThreat||rival.types?.length||0;
 const kills=Math.max(0,Math.min(potentialKills,
   Math.floor(Number(summary.kills??potentialKills)||0)));
 const grade=campaign?.sortieGrade?.(won,rival,summary)||(won?'B':'F');
 const previousTitle=rankTitle(atRank);
 const record=data.records[rival.id]||(data.records[rival.id]={wins:0,losses:0});
 const earned=[];
 const award=id=>{if(medal(id))earned.push(MEDALS.find(m=>m.id===id));};
 data.streak??=0;data.bestStreak??=0;
 if(won){
  data.wins++;data.kills+=kills;record.wins++;
  data.streak++;data.bestStreak=Math.max(data.bestStreak,data.streak);
  run.pathHistory??=[];
  run.pathHistory.push({rank:atRank,lane:rival.lane,mission:rival.mission,nodeType:rival.nodeType});
  run.lastLane=rival.lane;
  run.rank++;
  run.allowedLanes=campaign.reachableLanes(run.lastLane,run.rank);
  data.best=Math.max(data.best,Math.min(MAX_RANK,run.rank));
  if(data.wins===1)award('first-blood');
  if(data.streak>=3)award('triple-ace');
  if(run.rank>=5)award('veteran');
  if(kills>=2)award('double-trouble');
  if(run.lives<3)award('iron-will');
  if(atRank===MAX_RANK&&rival.finalBoss)award('wingman-legend');
  if(run.rank>MAX_RANK){
   data.completed++;
   data.lastCompleted={pilot:data.profile.name,aircraft:run.aircraft,
    nemesis:rival.label,streak:data.bestStreak,missions:data.service?.length+1||12,
    medals:data.medals.slice(),rank:MAX_RANK};
   data.run=null;
  }
 }else{
  data.losses++;record.losses++;data.streak=0;
  run.lives--; // Defeat costs a life; never advances or rewinds the route.
  if(run.lives<=0)data.run=null;
 }
 if(data.run)campaign?.settle(run,rival,won,Number(summary.integrity??1));
 data.lastOutcome={won,rank:atRank,risk:rival.risk||'LOW',objective:rival.objective||'duel',
   mission:rival.mission||'DOGFIGHT',label:rival.label,
   aircraft:run.aircraft,integrity:Number(summary.integrity??1),
   kills,grade,threat:rival.threat??null,
   secondsRemaining:Math.max(0,Number(summary.remainingSeconds??0)||0),
   secondsElapsed:Math.max(0,Number(summary.elapsedSeconds??0)||0),
   shots:Math.max(0,Math.floor(Number(summary.shots)||0)),
   hits:Math.max(0,Math.floor(Number(summary.hits)||0)),
   damageDealt:Math.max(0,Math.round(Number(summary.damageDealt)||0)),
   damageTaken:Math.max(0,Math.round(Number(summary.damageTaken)||0)),
   reinforcements:Math.max(0,Math.floor(Number(summary.reinforcements)||0)),
   alliesLost:Math.max(0,Math.floor(Number(summary.alliesLost)||0)),
   enemiesExpected:rival.totalEnemyThreat||rival.types?.length||1,
   suppliesEarned:won?rival.suppliesAward||1:0};
 archiveService({won,rank:atRank,lane:rival.lane,rival:rival.label,
  mission:rival.mission||'DOGFIGHT',enemies:rival.types.length,
  kills,grade,threat:rival.threat??null,risk:rival.risk||'LOW',
  remainingSeconds:Math.max(0,Number(summary.remainingSeconds??0)||0),
  shots:Math.max(0,Math.floor(Number(summary.shots)||0)),
  hits:Math.max(0,Math.floor(Number(summary.hits)||0)),
  damageDealt:Math.max(0,Math.round(Number(summary.damageDealt)||0)),
  damageTaken:Math.max(0,Math.round(Number(summary.damageTaken)||0)),
  result:won?'VICTORY':'SHOT DOWN'});
 if(data.run){run.visits++;if(won){run.choices=makeChoices(run);run.campaignSchema=11;}}
 save();active=null;
 view='outcome';showing=true;screen.hidden=false;result.classList.add('hidden');
 const promotion=won&&rankTitle(Math.min(MAX_RANK,atRank+1))!==previousTitle?
  rankTitle(Math.min(MAX_RANK,atRank+1)):null;
 renderOutcome(won,encounter||rival,earned,promotion);
 // Guaranteed illustrated debrief even if the native result overlay was
 // shown and hidden within the same event-loop turn.
 window.WingmanUIBridge?.notifyCampaignResult?.(data.lastOutcome);
}
function panel(title,body){screen.innerHTML=`<div class="career-panel"><div class="career-head"><h2>${title}</h2><button type="button" data-action="close" aria-label="Close career and return to main menu">BACK TO MENU ×</button></div>${body}</div>`;}
function renderOutcome(won,encounter,earned=[],promotion=null){
 const finished=won&&!data?.run&&data?.lastCompleted?.rank===MAX_RANK;
 const resultTitle=finished?'★ WINGMAN LEGEND — FINAL VICTORY':won?'VICTORY — SORTIE COMPLETE':'DEFEAT — AIRCRAFT LOST';
 const medalCards=earned.length?'<div class="award-celebration"><strong>NEW DECORATIONS</strong><div class="earned-ribbons">'+
  earned.map(m=>'<span title="'+escape(m.desc)+'">'+m.glyph+' '+escape(m.title)+'</span>').join('')+'</div></div>':'';
 const tribute=finished?'<section class="final-tribute"><div class="final-laurel">★ ✦ ★</div><h3>THE SKY IS YOURS</h3>'+
  '<p>'+escape(data.profile.name)+' has defeated the final squadron and earned the title of <b>Wingman Legend</b>.</p>'+
  '<div class="career-stats"><span>'+data.completed+' COMPLETED RUN'+(data.completed===1?'':'S')+'</span>'+
  '<span>'+data.kills+' CONFIRMED KILLS</span><span>'+data.bestStreak+' BEST STREAK</span></div></section>':'';
 const promotionMarkup=promotion?'<div class="career-promotion"><span>NEW PROMOTION</span><strong>'+escape(promotion)+'</strong></div>':'';
 const lossNotice=!won&&data?.run?'<p class="career-muted">One life lost. Your career continues from rank '+data.run.rank+'.</p>':'';
 panel(resultTitle,'<p class="career-outcome-opponent">'+escape(encounter?.label||'Rival')+' · '+
  escape((encounter?.types||[]).map(t=>aircraft[t]||t).join(' + '))+'</p>'+tribute+lossNotice+
  '<div class="career-stats"><span>'+(data?.run?'RANK '+data.run.rank:'RUN FINISHED')+'</span>'+
  '<span>'+(data?.run?'♥ '+data.run.lives+' LIVES':'SERVICE RECORDED')+'</span>'+
  '<span>PERFORMANCE '+escape(data.lastOutcome?.grade||'—')+'</span></div>'+
  promotionMarkup+medalCards+(finished?medalMarkup():'' )+
  (finished?serviceMarkup(8):'')+
  (data?.run?.pendingReward?'<div class="wg-v7-reward"><strong>CHOOSE YOUR SORTIE REWARD</strong>'+
    data.run.pendingReward.offers.map(id=>{const perk=[...(campaign?.UPGRADES||[]),...(campaign?.ELITE_UPGRADES||[])].find(x=>x.id===id);return perk?
    '<button data-reward="'+escape(id)+'"><b>'+escape(perk.name)+'</b><small>'+escape(perk.detail)+'</small></button>':'';}).join('')+'</div>':'')+
  (!data?.run?.pendingReward?'<button class="career-primary" data-action="ladder">'+
    (data?.run?'CONTINUE LADDER':'VIEW PILOT LICENCE')+'</button>':'<p class="career-muted">Select a reward before your next sortie.</p>'));
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
   return '<button class="route-node route-opponent" data-choice="'+lane+'" aria-label="Challenge '+escape(p.name)+'"><span class="route-photo">'+pilotPortrait(p.faction,{...appearance,rosterPortrait:ROSTER.find(x=>x.id===p.rosterId)?.portrait??Number(p.id.replace('pilot-',''))})+'</span><strong>'+escape(p.name)+'</strong><small>'+escape(op.types.map(t=>aircraft[t]).join(' + '))+'</small><small class="rival-tactics">'+escape(window.WingmanPilotAI?.describe(p,rank)||p.archetype||'ACE')+'</small><small class="rival-rank-stats">TURN '+(op.attributes?.manoeuvrability??65)+' · GUNS '+(op.attributes?.gunnery??65)+' · ENGINE '+(op.attributes?.engine??65)+'</small>'+(op.wingman?'<small class="rival-wingman">⚔ 1v2 WITH '+escape(op.wingman.name)+'</small>':'')+
 (op.finalBoss?'<small class="rival-final">♛ FINAL 1v3 • ACE + '+escape(op.wingmen.map(w=>w.name.match(/"([^"]+)"/)?.[1]||w.name).join(' & '))+'</small>':'')+
 '<small class="rival-mission">'+escape(op.mission||'DOGFIGHT')+'</small>'+(record?'<em>'+record.wins+'–'+record.losses+' RIVALRY</em>':'')+'<span class="route-cta">CHALLENGE →</span></button>';
  }).join('');
  rows.push('<section class="route-tier '+status+'" '+(current?'id="active-rung"':'')+'><div class="route-rank">'+(rank===MAX_RANK?'♛ FINAL SQUADRON · 1v3':'RANK '+rank)+(current?' • CHOOSE A BRANCH':'')+'</div><div class="route-fork" aria-hidden="true"><span></span><span></span><span></span></div><div class="route-three">'+options+'</div><div class="route-join" aria-hidden="true"><span></span><span></span><span></span></div></section>');
 }
 return '<div class="ladder-scroll campaign-tree career-route-map" role="region" aria-label="Twelve rung mixed encounter campaign map with three routes per rung" tabindex="0"><div class="tree-spine route-spine">'+rows.join('')+'</div></div>';
}
function characterPicker(){
 if(!data?.profile)return '';
 const p=data.profile;
 const members=ROSTER.filter(x=>x.faction===p.faction);
 return '<p class="career-muted">SELECT YOUR PILOT — tap a portrait to confirm. Switching identity retains your current career progress and medals.</p>'+
 '<div class="character-roster" role="group" aria-label="Choose your Wingman pilot">'+members.map(pilot=>{
 const selected=data.profile.characterConfirmed===true&&data.profile.rosterId===pilot.id;
 return '<button type="button" data-roster="'+pilot.id+'" class="candidate-card '+(selected?'selected':'')+'" aria-pressed="'+selected+'">'+
 '<div class="candidate-portrait">'+pilotPortrait(pilot.faction,{...appearance(pilot.portrait*47+9),rosterPortrait:pilot.portrait})+'</div>'+
 '<strong>'+escape(pilot.name)+'</strong><small>'+escape(pilot.archetype)+' · '+escape(aircraft[pilot.plane])+'</small>'+
 '<p class="character-bio">'+escape(pilot.bio)+'</p><small>TURN '+pilot.attributes.manoeuvrability+' · GUNS '+pilot.attributes.gunnery+' · ENGINE '+pilot.attributes.engine+'</small>'+
 '<span>CONFIRM PILOT · '+escape(PILOT_SKILLS.find(x=>x[0]===pilot.signature)?.[1]||'SPECIAL')+'</span></button>';
 }).join('')+'</div><button type="button" data-action="licence">BACK TO LICENCE</button>';
}
function render(){
 if(data?.run?.pendingReward&&view!=='character'&&view!=='licence'){
  const outcome=data.lastOutcome||{};
  renderOutcome(true,{label:outcome.label||'LAST RIVAL',types:[]});return;
 }
 if(data&&view==='character'){panel('CHOOSE YOUR PILOT',characterPicker());return;}
 if(!data||view==='select'){
  if(!candidates.length)candidates=generateCandidates();
  panel('SELECT YOUR ACE',`<p class="career-muted">Choose one of 40 predefined pilots. Each has a fixed identity, aircraft, stats and signature skill. The opposing squadron supplies your rivals.</p>
  <div class="candidate-identity"><label>SQUADRON <select id="career-faction"><option value="Allies" ${selectFaction==='Allies'?'selected':''}>RAF — 20 PILOTS</option><option value="Axis" ${selectFaction==='Axis'?'selected':''}>LUFTWAFFE — 20 PILOTS</option></select></label></div>
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
   <p>ACE RUNS COMPLETED <b>${data.completed}</b></p><p>SERVICE RANK <b>${rankTitle(data.best||1)}</b></p><p>LONGEST STREAK <b>${data.bestStreak||0}</b></p></div></div>
   ${medalMarkup()}${serviceMarkup()}
   <button class="career-primary" data-action="ladder" >START / CONTINUE CAMPAIGN</button><button data-action="character">CHANGE PILOT (KEEP PROGRESS)</button><button data-action="select">NEW CAREER (RESET PROGRESS)</button>`);
  return;
 }
 if(!run){
  panel('READY FOR YOUR FIRST SORTIE',`<div class="career-onboarding"><div class="onboard-step">1 <strong>PILOT CONFIRMED</strong><span>${escape(p.name)} · ${escape(p.faction)}</span></div>
  <div class="onboard-step">2 <strong>START ROAD TO ACE</strong><span>Twelve encounters, three regions, three lives</span></div>
  <div class="onboard-step">3 <strong>PICK AN AIRCRAFT EACH MISSION</strong><span>Preferred: ${escape(aircraft[p.plane])} · +10% hull, armour and damage</span></div></div>
  <button class="career-primary" data-action="begin-run">START ROAD TO ACE ▶</button>
  <button data-action="character">CHANGE PILOT</button><button data-action="licence">PILOT LICENCE</button>`);
  return;
 }
 if(view==='sortie'&&pendingChoice!==null){
  const encounter=run.choices[pendingChoice],types=run.faction==='Allies'?ALLIES:AXIS;
  const selected=types.includes(pendingAircraft)?pendingAircraft:types[0];
  const choices=types.map(type=>{
   const pref=type===p.plane,chosen=type===selected;
   if(window.WingmanGrid?.card)return window.WingmanGrid.card(type,{career:true,preferred:pref,selected:chosen}).outerHTML;
   const b=BASE_AIRCRAFT[type];
   return '<button type="button" data-sortie-plane="'+type+'" class="airframe-card '+(chosen?'selected':'')+'">'+
    escape(aircraft[type])+' · HULL '+b.hull+' · ARMOUR '+b.armour+'</button>';
  }).join('');
  panel('SELECT AIRCRAFT — RANK '+run.rank,`<div class="wg-career-prep">
   <p class="wg-career-intro"><b>${escape(encounter.mission||'DOGFIGHT')}</b> · Opposing pilot: ${escape(encounter.label)}.<br>
   Your specialist aircraft is <b>${escape(aircraft[p.plane])}</b>. +10% hull, armour and gun damage when flying it.</p>
   <div class="wg-cards" role="group" aria-label="Choose aircraft for this career sortie">${choices}</div>
   <div class="wg-career-actions"><button data-action="sortie-back">← BACK TO MISSIONS</button>
    <button class="wg-career-confirm" data-action="confirm-sortie-aircraft">CONFIRM AIRCRAFT &amp; FLY ▶</button></div>
   </div>`);
  return;
 }
 panel('ROAD TO ACE',`<div class="career-stats"><span>${escape(p.name)} · ${aircraft[run.aircraft]}</span><span>RANK ${run.rank}/${MAX_RANK}</span><span>${'♥'.repeat(run.lives)}${'♡'.repeat(3-run.lives)}</span></div>
 <p class="career-muted">Choose a mission, then choose a suitable aircraft for that sortie. Rung twelve ends against the final three-aircraft squadron.</p>
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
   data.profile.gender=newPilot.gender;data.profile.characterConfirmed=true;
   data.profile.plane=newPilot.plane;data.profile.skill=newPilot.signature;
   data.profile.attributes={...newPilot.attributes};
   data.profile.style={...appearance(newPilot.portrait*47+9),portraitIndex:newPilot.portrait%5,rosterPortrait:newPilot.portrait};
   save();view='licence';render();
  }
 }
 if(el.dataset.candidate!==undefined)createProfile(Number(el.dataset.candidate));
 if(action==='ladder'){view=data?.run?'ladder':'licence';if(data&&!data.run)view='ladder';render();}
 if(action==='begin-run')startRun(data.profile.plane);
 if(action==='licence'){view='licence';render();}
 if(action==='portrait'&&data?.profile){
  const style=data.profile.style||(data.profile.style=appearance(0));
  const originalArt=((Number(style.face)||0)*3+(Number(style.hair)||0))%5;
  style.portraitIndex=((Number.isInteger(style.portraitIndex)?style.portraitIndex:originalArt)+1)%5;
  save();view='licence';render();
 }
 if(el.dataset.aircraft)startRun(el.dataset.aircraft);
 if(el.dataset.reward){claimReward(el.dataset.reward);return;}
 if(action==='repair-airframe'){repairAirframe();return;}
 if(el.dataset.choice!==undefined)fight(Number(el.dataset.choice));
 if(el.dataset.sortiePlane&&view==='sortie'){
  pendingAircraft=el.dataset.sortiePlane;
  screen.querySelectorAll('[data-sortie-plane]').forEach(button=>{
   const yes=button.dataset.sortiePlane===pendingAircraft;
   button.classList.toggle('selected',yes);
   button.setAttribute('aria-pressed',String(yes));
   const badge=button.querySelector('.wg-selected-label');
   if(badge)badge.textContent=yes?'✓ SELECTED':'SELECT';
  });
 }
 if(action==='confirm-sortie-aircraft'&&pendingAircraft)launchSortie(pendingAircraft);
 if(action==='sortie-back'){pendingChoice=null;pendingAircraft=null;view='ladder';render();}
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
function claimReward(id){
 if(!data?.run||!campaign?.claim(data.run,id))return false;
 if(data.run.campaignSchema!==11){
   data.run.choices=makeChoices(data.run);
   data.run.campaignSchema=11;
 }
 save();
 if(showing){view='ladder';render();}
 return true;
}
function repairAirframe(){
 if(!data?.run||!campaign?.repair(data.run))return false;
 save();if(showing)render();return true;
}
function restartCampaign(){
  if(!data)return false;
  active=null;pendingChoice=null;pendingAircraft=null;airframeOffers=[];
  data.run=null;data.awaitingPilotSelection=true;
  selectFaction=data.profile?.faction||'Allies';candidates=generateCandidates();
  save();view='select';render();return true;
 }
 window.WingmanCareer={claimReward,repairAirframe,resolveCampaignEvent,suspendLegacyScreen:()=>{pendingChoice=null;pendingAircraft=null;showing=false;screen.hidden=true;},restartCampaign,restartRun:()=>{active=null;pendingChoice=null;pendingAircraft=null;startRun(data?.profile?.plane);},finishEncounter,open:show,cancelEncounter:()=>{active=null;}};
})();

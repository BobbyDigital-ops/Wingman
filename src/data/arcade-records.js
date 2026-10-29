/* Wingman Phase 6: private, on-device arcade scorebook and honours.
   No remote leaderboard and no personal data upload. */
(()=>{'use strict';
 const KEY='wingman-arcade-v1';
 const ACHIEVEMENTS=Object.freeze([
  {id:'first-sortie',name:'FIRST SORTIE',description:'Complete any arcade sortie'},
  {id:'first-win',name:'ACE IN THE HOLE',description:'Win an arcade sortie'},
  {id:'triple-threat',name:'TRIPLE THREAT',description:'Win a Free-for-All'},
  {id:'true-wingman',name:'TRUE WINGMAN',description:'Win a 2v2 squadron battle'},
  {id:'survive-3',name:'THREE LIVES LATER',description:'Reach Survival wave four'},
  {id:'survive-5',name:'STILL FLYING',description:'Clear five Survival waves'},
  {id:'survive-10',name:'UNTOUCHABLE LEGEND',description:'Clear ten Survival waves'},
  {id:'challenge-ace',name:'ACE HUNTER',description:'Beat the timed Ace Intercept challenge'},
  {id:'challenge-wind',name:'STORMCHASER',description:'Win the Crosswind challenge'},
  {id:'challenge-armour',name:'IRON NERVES',description:'Win without starting armour'},
  {id:'challenge-heavy',name:'HEAVY METAL',description:'Win the Heavy Hunter challenge'},
  {id:'perfect',name:'NOT A SCRATCH',description:'Win a duel without taking damage'}
 ]);
 const clean=()=>({version:1,total:0,wins:0,losses:0,records:[],unlocks:[],bestSurvival:0});
 function read(){
  try{
   const obj=JSON.parse(localStorage.getItem(KEY)||'null');
   if(!obj||obj.version!==1)return clean();
   return {...clean(),...obj,records:Array.isArray(obj.records)?obj.records.slice(-120):[],
    unlocks:Array.isArray(obj.unlocks)?obj.unlocks.filter(x=>ACHIEVEMENTS.some(a=>a.id===x)):[]};
  }catch{return clean();}
 }
 let data=read();
 function save(){try{localStorage.setItem(KEY,JSON.stringify(data));}catch{}}
 const number=(v,lo,hi)=>Number.isFinite(Number(v))?Math.min(hi,Math.max(lo,Number(v))):lo;
 const groupKey=r=>[r.mode,r.challenge||'none',r.difficulty||'standard',r.aircraft||'fighter'].join('|');
 const rank=r=>Number(r.score)||0;
 function board(mode=null){
  const results=data.records.filter(r=>!mode||r.mode===mode);
  return results.slice().sort((a,b)=>rank(b)-rank(a)||b.timestamp-a.timestamp).slice(0,10);
 }
 function top(mode){return board(mode)[0]?.score||0;}
 function award(id,newAwards){
  if(!data.unlocks.includes(id)){data.unlocks.push(id);newAwards.push(ACHIEVEMENTS.find(a=>a.id===id)?.name||id);}
 }
 function finish(result){
  const r={
   mode:String(result.mode||'duel').slice(0,20),
   challenge:result.challenge?String(result.challenge).slice(0,24):null,
   aircraft:String(result.aircraft||'fighter').slice(0,20),
   difficulty:String(result.difficulty||'standard').slice(0,15),
   won:!!result.won,score:Math.round(number(result.score,0,9999999)),
   kills:Math.round(number(result.kills,0,9999)),
   waves:Math.round(number(result.waves,0,9999)),
   seconds:Math.round(number(result.seconds,0,100000)),
   shots:Math.round(number(result.shots,0,999999)),
   hits:Math.round(number(result.hits,0,999999)),
   damageTaken:Math.round(number(result.damageTaken,0,99999)),
   timestamp:Date.now()
  };
  if(r.mode==='campaign')return {record:r,awards:[]};
  const awards=[];
  data.total++;if(r.won)data.wins++;else data.losses++;
  award('first-sortie',awards);
  if(r.won)award('first-win',awards);
  if(r.mode==='triple'&&r.won)award('triple-threat',awards);
  if(r.mode==='teams'&&r.won)award('true-wingman',awards);
  if(r.mode==='survival'){
   data.bestSurvival=Math.max(data.bestSurvival,r.waves);
   if(r.waves>=3)award('survive-3',awards);
   if(r.waves>=5)award('survive-5',awards);
   if(r.waves>=10)award('survive-10',awards);
  }
  if(r.mode==='challenge'&&r.won){
   const ids={intercept:'challenge-ace',crosswind:'challenge-wind',noarmour:'challenge-armour',heavy:'challenge-heavy'};
   if(ids[r.challenge])award(ids[r.challenge],awards);
  }
  if(r.mode==='duel'&&r.won&&r.damageTaken===0)award('perfect',awards);
  data.records.push(r);data.records=data.records.slice(-120);
  save();
  return {record:r,awards,best:board(r.mode)[0]?.score||0};
 }
 function escape(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function render(){
  const element=document.getElementById('arcade-records');if(!element)return;
  const summary=['duel','survival','triple','teams','challenge'].map(mode=>
   '<div class="arcade-record"><span>'+escape(({duel:'DUEL',survival:'SURVIVAL',triple:'FREE FOR ALL',teams:'SQUADRON',challenge:'CHALLENGE'})[mode])+'</span><b>'+top(mode).toLocaleString()+'</b></div>').join('');
  const medals=ACHIEVEMENTS.map(a=>'<span class="arcade-honour '+(data.unlocks.includes(a.id)?'earned':'locked')+'" title="'+escape(a.description)+'">'+(data.unlocks.includes(a.id)?'✦ ':'◇ ')+escape(a.name)+'</span>').join('');
  element.innerHTML='<div class="arcade-scores">'+summary+'</div>'+
   '<div class="arcade-summary">SORTIES '+data.total+' · WINS '+data.wins+' · BEST SURVIVAL '+data.bestSurvival+' WAVES · '+data.unlocks.length+'/'+ACHIEVEMENTS.length+' HONOURS</div>'+
   '<div class="arcade-honours">'+medals+'</div>';
 }
 function resetView(){data=read();render();}
 window.WingmanArcade={finish,board,top,render,resetView,get data(){return data;},ACHIEVEMENTS,KEY,groupKey};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
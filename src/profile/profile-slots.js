/* Wingman service record slots — separate local careers and arcade history.
 * Loaded before arcade-records.js and career.js. No existing save is erased:
 * the legacy unslotted record is adopted as slot 1 on first use. */
(function(root){
'use strict';
const KEY='wingman-profile-slot-v1',ACTIVE=KEY+'-active';
const DATA=['wingman-road-to-ace-v1','wingman-arcade-v1'];
const slotKey=(i,k)=>KEY+'-'+i+'-'+k;
const safe=(f,def)=>{try{return f()}catch{return def}};
const read=k=>safe(()=>localStorage.getItem(k),null);
const write=(k,v)=>safe(()=>{if(v===null||v===undefined)localStorage.removeItem(k);else localStorage.setItem(k,v);return true},false);
const index=x=>Math.max(0,Math.min(2,Number(x)||0));
let active=index(read(ACTIVE));
if(read(ACTIVE)===null)write(ACTIVE,String(active));
// On first integration snapshot every existing save into slot 0 without
// altering or discarding the active legacy copy.
if(read(KEY+'-adopted')!=='1'){
 for(const k of DATA)if(read(k)!==null)write(slotKey(0,k),read(k));
 write(KEY+'-adopted','1');
}
function saveActive(){for(const k of DATA)write(slotKey(active,k),read(k));}
function snapshot(i){
 i=index(i);
 const raw=i===active?read(DATA[0]):read(slotKey(i,DATA[0]));
 const arcade=i===active?read(DATA[1]):read(slotKey(i,DATA[1]));
 let career=null,history=null;
 try{career=JSON.parse(raw||'null')}catch{}
 try{history=JSON.parse(arcade||'null')}catch{}
 const p=career?.profile;
 return {slot:i,active:i===active,hasProfile:!!p?.rosterId,
  rosterId:p?.rosterId||null,name:p?.name||null,faction:p?.faction||null,
  rank:career?.run?.rank||career?.best||0,wins:Number(career?.wins)||0,
  arcadeWins:Number(history?.wins)||0};
}
function select(i){
 i=index(i);
 if(root.WingmanGame?.isPlaying?.())return {ok:false,reason:'Finish your sortie before switching pilots'};
 if(i===active)return {ok:true,reloading:false,hasProfile:snapshot(i).hasProfile};
 saveActive();
 // Import the target slot into the canonical keys BEFORE reloading all
 // in-memory campaign and arcade modules. Do not emulate a hot swap.
 for(const k of DATA)write(k,read(slotKey(i,k)));
 active=i;write(ACTIVE,String(i));
 const next=snapshot(i);
 safe(()=>sessionStorage.setItem(KEY+'-after-select',next.hasProfile?'home':'pilots'),null);
 root.location.reload();
 return {ok:true,reloading:true,hasProfile:next.hasProfile};
}
root.WingmanProfiles={list:()=>[0,1,2].map(snapshot),current:()=>active,select,saveActive};
})(window);

/* Wingman v0.8.2 — independent pilot profiles.
 * The live game and career modules retain their legacy save keys.
 * Slot changes snapshot both keys then reload so in-memory career state
 * never points at the previous pilot. First-time migration is lossless.
 */
(function(root){
'use strict';
const INIT='wingman-profile-slots-initialized-v1';
const ACTIVE='wingman-profile-active-v1';
const SLOT='wingman-profile-slot-v1-';
const ARRIVAL='wingman-menu-arrival-v1';
const KEYS=['wingman-road-to-ace-v1','wingman-arcade-v1'];
const get=key=>{try{return root.localStorage.getItem(key)}catch{return null}};
const put=(key,val)=>{try{if(val===null||val===undefined)root.localStorage.removeItem(key);else root.localStorage.setItem(key,val);return true}catch{return false}};
const parsed=text=>{try{return text?JSON.parse(text):null}catch{return null}};
const valid=i=>Number.isInteger(Number(i))&&Number(i)>=0&&Number(i)<3;
const active=()=>{const i=Number(get(ACTIVE));return valid(i)?i:0};
function capture(){return {career:get(KEYS[0]),arcade:get(KEYS[1])};}
function ensure(){
 if(get(INIT)==='1')return;
 const existing=capture();
 // Preserve the original user career and arcade stats without
 // modifying the authoritative keys read by the game.
 put(SLOT+'0',JSON.stringify(existing));
 put(ACTIVE,'0');
 put(INIT,'1');
}
function snapshot(i){return parsed(get(SLOT+i))||{career:null,arcade:null}}
function slots(){
 ensure();
 const current=active();
 return Array.from({length:3},(_,i)=>{
  const data=i===current?capture():snapshot(i);
  const saved=parsed(data.career),profile=saved?.profile||null;
  return {slot:i,active:i===current,hasProfile:!!profile,
   name:profile?.name||'',faction:profile?.faction||null,
   rosterId:profile?.rosterId||null,rank:saved?.run?.rank||null,
   wins:Number(saved?.wins)||0,completed:Number(saved?.completed)||0,
   ready:!!profile};
 });
}
function select(i){
 ensure();
 if(!valid(i))return {ok:false,error:'invalid-slot'};
 const target=Number(i),previous=active();
 if(target===previous){
  const data=parsed(get(KEYS[0]));
  return {ok:true,reload:false,hasProfile:!!data?.profile,slot:target};
 }
 const before=capture(),next=snapshot(target);
 // Save current pilot before changing canonical keys. Do not touch
 // any aircraft imagery, pilot roster, or other game configuration.
 if(!put(SLOT+previous,JSON.stringify(before)))return {ok:false,error:'storage-unavailable'};
 for(let idx=0;idx<KEYS.length;idx++){
  if(!put(KEYS[idx],idx===0?next.career:next.arcade)){
    for(let j=0;j<KEYS.length;j++)put(KEYS[j],j===0?before.career:before.arcade);
    return {ok:false,error:'storage-unavailable'};
  }
 }
 if(!put(ACTIVE,String(target))){
  for(let j=0;j<KEYS.length;j++)put(KEYS[j],j===0?before.career:before.arcade);
  return {ok:false,error:'storage-unavailable'};
 }
 const hasProfile=!!parsed(next.career)?.profile;
 try{root.sessionStorage.setItem(ARRIVAL,hasProfile?'home':'pilots')}catch{}
 // Game and career.js cache state at startup. A full reload is mandatory
 // after switching; trying to hot-swap produces mixed pilot identities.
 root.location.reload();
 return {ok:true,reload:true,hasProfile,slot:target};
}
const api={slots,select,ensure,active};
root.WingmanProfileSlots=api;
ensure();
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

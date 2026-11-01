/* Wingman 10A — mission-specific tactical roles and objective arbitration.
   Pure helpers: no physics changes and no frame-loop allocations beyond tiny arrays. */
(function(root){
'use strict';
const PRIORITY_OBJECTIVES=new Set(['intel-hunt','formation-break','escape-artist']);
const roles=Object.freeze({
 hunter:'HUNTER',flanker:'FLANKER',screen:'SCREEN',interceptor:'INTERCEPTOR',
 guard:'GUARD',leader:'FORMATION LEAD',runner:'COURIER',escapeAce:'ESCAPE ACE',boss:'ACE COMMANDER'
});
function roleFor(objective,index,{finalBoss=false}={}){
 if(finalBoss)return index===2?'boss':index===0?'hunter':'screen';
 if(objective==='escort')return index===0?'interceptor':'hunter';
 if(objective==='intel-hunt')return index===0?'runner':'screen';
 if(objective==='formation-break')return index===0?'leader':'guard';
 if(objective==='escape-artist')return index===0?'escapeAce':'screen';
 if(objective==='outnumbered')return index===0?'hunter':'flanker';
 if(objective==='ace-hunt')return 'hunter';
 if(objective==='recon')return 'hunter';
 return index%2===0?'hunter':'flanker';
}
function priorityObjective(objective){return PRIORITY_OBJECTIVES.has(objective);}
function pickTarget(actor,targets,{objective,dist,player,fliers}={}){
 if(!targets?.length)return null;
 const distance=typeof dist==='function'?dist:(a,b)=>Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0));
 const role=actor.aiRole;
 if(objective==='escort'&&actor.team===1){
  const bomber=targets.find(p=>p.escortProtected&&p.alive);
  if(bomber)return bomber;
 }
 if((role==='screen'||role==='guard')&&player&&targets.includes(player)){
  // Screens are useful only if they actively threaten the intercepting pilot.
  return player;
 }
 if(role==='flanker'&&player&&targets.includes(player))return player;
 if(actor.team===0&&actor.id!==0&&player){
  // Friendly wingmen actively clear threats closest to their leader.
  return targets.slice().sort((a,b)=>distance(a,player)-distance(b,player))[0];
 }
 return targets.slice().sort((a,b)=>distance(actor,a)-distance(actor,b))[0];
}
function priorityDecision(enc,fliers,time){
 if(!enc||!priorityObjective(enc.objective))return null;
 if(!fliers?.[0]?.alive)return 1;
 const target=fliers.find(p=>p.team===1&&p.priorityObjective);
 if(target&&!target.alive)return 0;
 if(Number(time)<=0)return 1;
 return null;
}
function formationAnchor(actor,fliers){
 if(actor.aiRole!=='guard'&&actor.aiRole!=='screen')return null;
 return fliers?.find(p=>p.team===actor.team&&p.id!==actor.id&&
   p.alive&&(p.priorityObjective||p.priorityCarrier))||null;
}
const api={roles,roleFor,pickTarget,priorityObjective,priorityDecision,formationAnchor};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.WingmanMissionDoctrine=api;
})(typeof window!=='undefined'?window:{});

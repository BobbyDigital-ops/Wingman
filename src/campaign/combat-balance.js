/* Wingman Phase 10E — measured campaign difficulty calibration.
 * Tactical proficiency and formation placement only: never modifies
 * airframe statistics, damage, collision, physics, hit boxes or roster art.
 * Pure and testable; uses the existing 12-rung progression and route lanes.
 */
(function(root){
 'use strict';
 const BASE_SKILL=Object.freeze([0,.08,.16,.29,.30,.40,.52,.65,.67,.77,.84,.89]);
 const LANE_BONUS=Object.freeze([0,.075,.15]);
 const clamp=(v,low,high)=>Math.min(high,Math.max(low,v));
 function skillFor(enc={}){
  const rank=clamp(Math.trunc(Number(enc.rank)||1),1,12);
  const lane=clamp(Math.trunc(Number(enc.lane)||0),0,2);
  const elite=enc.eliteEncounter?.075:0,final=enc.finalBoss?.055:0;
  const prepared=enc.fieldOrders?.ambush?.13:0;
  return clamp(Math.round((BASE_SKILL[rank-1]+LANE_BONUS[lane]+elite+final-prepared)*1000)/1000,0,1);
 }
 // Combatants all arrive in the ordinary sky and fly using normal momentum.
 // The old second aircraft spawned closer than the commander, causing an
 // immediate overlapping burst against the player. Keep two enemy aircraft
 // at once but begin in a legible echelon with an approach to navigate.
 function startingPosition(index){
  const locations=[
   [.78,.52,Math.PI+.15],
   [.91,.28,Math.PI+.28],
   [.91,.64,Math.PI+.08]
  ];
  return [...(locations[clamp(index,0,2)]||locations[0])];
 }
 function calibratedThreat(enc={}){
  if(enc.finalBoss)return [86,92,98][clamp(Math.trunc(Number(enc.lane)||0),0,2)];
  const rank=clamp(Math.trunc(Number(enc.rank)||1),1,12);
  const lane=clamp(Math.trunc(Number(enc.lane)||0),0,2);
  const objective=enc.objective||'patrol';
  const task={
   patrol:0,duel:2,recon:-10,intercept:4,'ace-hunt':7,
   escort:8,outnumbered:7,'escape-artist':9,
   'formation-break':11,'intel-hunt':12,final:15
  }[objective]??4;
  const wingmen=Math.max(0,(enc.types?.length||1)-1);
  const waves=(enc.reinforcements||[]).reduce((n,w)=>n+(Number(w.count)||1),0);
  const pressure=18+(rank-1)*4.3+[0,7,13][lane]+task+
   wingmen*9+Math.min(12,waves*4)+(enc.eliteEncounter?11:0)+
   (enc.timeLimit>0&&enc.timeLimit<70&&objective!=='recon'?3:0);
  return clamp(Math.round(pressure),10,99);
 }
 const api={skillFor,calibratedThreat,startingPosition,BASE_SKILL,LANE_BONUS};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.WingmanCombatBalance=api;
})(typeof window!=='undefined'?window:globalThis);

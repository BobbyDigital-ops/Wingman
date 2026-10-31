/* Wingman interface isolation bridge.
   The complete illustrated menu runs in a same-origin iframe; game.js and
   career.js remain authoritative for gameplay, saves, difficulty and rank. */
(function(){'use strict';
const by=id=>document.getElementById(id);
const career=()=>{try{return JSON.parse(localStorage.getItem('wingman-road-to-ace-v1')||'null')}catch{return null}};
let iframe,cover,syncing=false,lastResult='',resultSeen=false;
const broadcast=data=>iframe?.contentWindow?.postMessage(data,location.origin);
const visible=el=>!!el&&!(el.hidden||el.classList.contains('hidden'));
function show(){if(cover){cover.hidden=false;cover.style.display='block'}}
function hide(){if(cover){cover.hidden=true;cover.style.display='none'}}
function openCareer(screen='ladder'){window.WingmanCareer?.open?.(screen);show()}
const click=(query,scope=document)=>{const el=scope.querySelector(query);if(!el)return false;el.click();return true};
const setValue=(id,value)=>{const el=by(id);if(!el)return;el.value=String(value);el.dispatchEvent(new Event('change',{bubbles:true}))};
function choosePilot(id){
 const p=window.WingmanRoster?.find(p=>p.id===id);if(!p)return false;
 const saved=career();
 if(saved?.awaitingPilotSelection){
   openCareer('select');setValue('career-faction',p.faction);
   const cards=Array.from(by('career-screen')?.querySelectorAll('[data-candidate]')||[]);
   const card=cards.find(el=>el.textContent.includes(p.name));
   if(!card)return false;
   card.click();
   return career()?.profile?.rosterId===id&&!career()?.awaitingPilotSelection;
  }
  if(saved?.profile?.rosterId===id)return true;
 if(saved?.profile?.faction===p.faction){
  openCareer('character');
  return click('[data-roster="'+id+'"]',by('career-screen'));
 }
 openCareer('select');
 setValue('career-faction',p.faction);
 const list=Array.from(by('career-screen')?.querySelectorAll('[data-candidate]')||[]);
 const candidate=list.find(el=>el.textContent.includes(p.name));
 if(!candidate)return false;
 candidate.click();
 return career()?.profile?.rosterId===id;
}
function beginCareer(){
 const saved=career();if(!saved?.profile)return false;
 if(saved.run)return true;
 openCareer('ladder');
 return click('[data-action="begin-run"]',by('career-screen'))&&!!career()?.run;
}
function startCareer(index,type){
 const saved=career();if(!saved?.run||saved.run.pendingReward||!Number.isInteger(index)||!saved.run.choices?.[index]||saved.run.choices[index].isNonCombat)return false;
 const legal=window.WingmanCampaign?.reachableLanes?.(saved.run.lastLane,saved.run.rank)||[0,1,2];
 if(!legal.includes(index))return false;
 const faction=saved.profile.faction;
 if(!(faction==='Axis'?['bf109','bf110','he111']:['fighter','heavy','bomber']).includes(type))return false;
 openCareer('ladder');
 if(!click('#active-rung [data-choice="'+index+'"]',by('career-screen')))return false;
 if(!click('[data-sortie-plane="'+type+'"]',by('career-screen')))return false;
 if(!click('[data-action="confirm-sortie-aircraft"]',by('career-screen')))return false;
 const started=!!window.WingmanGame?.isPlaying?.();
 if(started)hide();
 return started;
}
function startArcade(options){
  if(!window.WingmanGame?.launchArcade)return false;
  // Selecting a pilot can leave the old Road-to-Ace screen mounted even
  // though the illustrated interface is on top. Tear down that state FIRST
  // so it cannot cover the actual match when the iframe disappears.
  window.WingmanCareer?.suspendLegacyScreen?.();
  const legacy=by('career-screen');
  if(legacy)legacy.hidden=true;
  const started=window.WingmanGame.launchArcade(options);
  if(started){
    if(legacy)legacy.hidden=true;
    hide();resultSeen=false;
  }
  return !!started;
}
function continueCareer(){openCareer('ladder');show()}
function sync(){
 if(syncing)return;syncing=true;
 try{
  const result=visible(by('result'));
  const campaign=visible(by('career-screen'));
  const menu=visible(by('menu'));
  const playing=window.WingmanGame?.isPlaying?.();
  if(playing){hide();resultSeen=false;return;}
  if(result){
   show();
   const value=by('result-title')?.textContent||'SORTIE COMPLETE';
   const marker=(campaign?'campaign':'arcade')+':'+value;
   if(!resultSeen||lastResult!==marker){lastResult=marker;resultSeen=true;broadcast({wmUI:'result',result:value,career:campaign})}
  }else{
   resultSeen=false;
   if(menu||campaign){
    if(cover?.hidden){show();if(menu&&!campaign)broadcast({wmUI:'home'});}
   }else hide();
  }
 }finally{syncing=false}
}
function mount(){
 if(by('wingman-new-interface'))return;
 cover=document.createElement('div');cover.id='wingman-new-interface';cover.setAttribute('aria-label','Wingman illustrated main menu');
 cover.style.cssText='position:fixed;inset:0;z-index:60;background:#061824;display:block;overflow:hidden';
 iframe=document.createElement('iframe');iframe.src='./wingman-ui/index.html?v=91';iframe.title='Wingman RAF illustrated menus';
 iframe.style.cssText='width:100%;height:100%;border:0;display:block;background:#061824';
 iframe.setAttribute('allowfullscreen','');cover.appendChild(iframe);
 const app=document.querySelector('.app')||document.body;app.appendChild(cover);
 for(const id of ['menu','career-screen','result']){
  const el=by(id);if(el)new MutationObserver(sync).observe(el,{attributes:true,attributeFilter:['class','hidden']});
 }
 // Career changes occur behind the new presentation; stay on the same-origin iframe.
 iframe.addEventListener('load',()=>{
    document.body.classList.add('wingman-illustrated-ready');
    sync();
  });
 sync();
}
window.WingmanUIBridge={show,hide,choosePilot,beginCareer,startCareer,startArcade,continueCareer,
 notifyCampaignResult(outcome){
  // A synchronous combat result is authoritative; do not rely on a transient
  // DOM MutationObserver state which can be hidden in the same JS task.
  resultSeen=true;lastResult='campaign:'+(outcome?.won?'SORTIE WON':'SHOT DOWN');
  show();broadcast({wmUI:'result',result:outcome?.won?'SORTIE WON':'SHOT DOWN',career:true});
 },
 listProfileSlots(){return window.WingmanProfileSlots?.slots?.()||[];},
 selectProfileSlot(index){return window.WingmanProfileSlots?.select?.(index)||{ok:false,error:'profile-manager-unavailable'};},
 resolveCampaignEvent(index,optionId){return window.WingmanCareer?.resolveCampaignEvent?.(index,optionId)||null;},
 claimCampaignReward(id){
  return !!window.WingmanCareer?.claimReward?.(id);
 },
 repairCampaignAircraft(){
  return !!window.WingmanCareer?.repairAirframe?.();
 },
  restartCampaign(){const ok=window.WingmanCareer?.restartCampaign?.();if(ok)show();return !!ok;},
 openLicence(){openCareer('licence');broadcast({wmUI:'career'})},
 toggleSound(){const current=window.WingmanAudio?.muted;window.WingmanAudio?.setMuted?.(!current);return !window.WingmanAudio?.muted;},
 getAudioSettings(){return {muted:!!window.WingmanAudio?.muted,volume:window.WingmanAudio?.volume??1};},
 setAudioVolume(v){return window.WingmanAudio?.setVolume?.(v)??1;},
 rematch(){if(click('#rematch'))hide()},
 changeAircraft(){if(click('#change-plane'))show()},
 home(){window.WingmanGame?.showMenu?.();broadcast({wmUI:'home'});show()}
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
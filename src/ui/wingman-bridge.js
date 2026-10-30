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
 const saved=career();if(!saved?.run||!Number.isInteger(index)||!saved.run.choices?.[index])return false;
 const faction=saved.profile.faction;
 if(!(faction==='Axis'?['bf109','bf110','he111']:['fighter','heavy','bomber']).includes(type))return false;
 openCareer('ladder');
 if(!click('#active-rung [data-choice="'+index+'"]',by('career-screen')))return false;
 if(!click('[data-sortie-plane="'+type+'"]',by('career-screen')))return false;
 if(!click('[data-action="confirm-sortie-aircraft"]',by('career-screen')))return false;
 hide();return true;
}
function startArcade({mode,aircraft,difficulty,arena}){
 if(!['duel','survival','triple','teams','challenge'].includes(mode))return false;
 if(!['fighter','heavy','bomber','bf109','bf110','he111'].includes(aircraft))return false;
 window.WingmanFlow?.setMode?.(mode);
 if(!window.WingmanFlow?.setMode)return false;
 // Show the underlying hidden setup to preserve the original game state.
 window.WingmanFlow.show?.('options');
 const faction=['bf109','bf110','he111'].includes(aircraft)?'Axis':'Allies';
 click('[data-wg-faction="'+faction+'"]');
 if(!click('.wg-card[data-plane="'+aircraft+'"]'))return false;
 setValue('difficulty-select',difficulty);
 setValue('arena-select',arena);
 if(!click('#start'))return false;
 hide();return true;
}
function continueCareer(){openCareer('ladder');show()}
function sync(){
 if(syncing)return;syncing=true;
 try{
  const result=visible(by('result'));
  const campaign=visible(by('career-screen'));
  const menu=visible(by('menu'));
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
 iframe=document.createElement('iframe');iframe.src='./wingman-ui/index.html?v=19';iframe.title='Wingman RAF illustrated menus';
 iframe.style.cssText='width:100%;height:100%;border:0;display:block;background:#061824';
 iframe.setAttribute('allowfullscreen','');cover.appendChild(iframe);
 const app=document.querySelector('.app')||document.body;app.appendChild(cover);
 for(const id of ['menu','career-screen','result']){
  const el=by(id);if(el)new MutationObserver(sync).observe(el,{attributes:true,attributeFilter:['class','hidden']});
 }
 // Career changes occur behind the new presentation; stay on the same-origin iframe.
 iframe.addEventListener('load',sync);
 sync();
}
window.WingmanUIBridge={show,hide,choosePilot,beginCareer,startCareer,startArcade,continueCareer,
  restartCampaign(){const ok=window.WingmanCareer?.restartCampaign?.();if(ok)show();return !!ok;},
 openLicence(){openCareer('licence');broadcast({wmUI:'career'})},
 toggleSound(){const el=by('wm-audio-toggle');if(el)el.click()},
 rematch(){if(click('#rematch'))hide()},
 changeAircraft(){if(click('#change-plane'))show()},
 home(){window.WingmanGame?.showMenu?.();broadcast({wmUI:'home'});show()}
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
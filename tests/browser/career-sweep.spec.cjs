const {test,expect}=require('@playwright/test');
const KEY='wingman-road-to-ace-v1';
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function openCareer(page){
  await page.goto('/');
  if(await page.locator('#career-open').isVisible())await page.locator('#career-open').click();
  else await page.locator('#career-open-mobile').click();
}
async function newPilot(page,faction='Allies',index=0,aircraft){
 await openCareer(page);
 await page.locator('#career-faction').selectOption(faction);
 await page.locator('[data-candidate="'+index+'"]').click();
 await expect(page.locator('[data-action="begin-run"]')).toBeVisible();
 await page.locator('[data-action="begin-run"]').click();
 await expect(page.locator('#active-rung [data-choice]')).toHaveCount(3);
}
async function launchChoice(page,lane=0,type){
 const before=await state(page);
 await page.locator('#active-rung [data-choice="'+lane+'"]').click();
 await expect(page.locator('[data-sortie-plane]')).toHaveCount(3);
 await page.locator('[data-sortie-plane="'+(type||(before.profile.faction==='Axis'?'bf109':'fighter'))+'"]').click();
 await page.locator('[data-action="confirm-sortie-aircraft"]').click();
 await expect(page.locator('#menu-return')).toBeVisible();
 return before;
}
async function encounter(page,win=true,lane=0){
 const before=await launchChoice(page,lane);
 await page.evaluate(won=>window.WingmanCareer.finishEncounter(won,{label:'Playwright test rival',types:['fighter']}),win);
 await expect(page.locator('[data-action="ladder"]')).toBeVisible();
 return before;
}
test('RAF and Luftwaffe can both select a character, retain career on reload and see three real opponent branches',async({page})=>{
 for(const faction of ['Allies','Axis']){
  await newPilot(page,faction,0);
  const saved=await state(page);
  expect(saved.profile.faction).toBe(faction);
  expect(saved.profile.characterConfirmed).toBe(true);
  expect(saved.run.rank).toBe(1);
  expect(saved.run.lives).toBe(3);
  expect(saved.run.aircraft).toBe(saved.profile.plane);
  const rivals=await page.locator('#active-rung .route-opponent strong').allTextContents();
  expect(rivals).toHaveLength(3);
  expect(new Set(rivals).size).toBe(3);
  await page.reload();
  if(await page.locator('#career-open').isVisible())await page.locator('#career-open').click();
  else await page.locator('#career-open-mobile').click();
  await expect(page.locator('#active-rung [data-choice]')).toHaveCount(3);
  const restored=await state(page);
  expect(restored.run.aircraft).toBe(saved.run.aircraft);
  // Starting another faction is a deliberate new profile; clear only this isolated test session.
  await page.evaluate(key=>localStorage.removeItem(key),KEY);
 }
});
test('eight real career victories ascend exactly one tier each and complete the run',async({page})=>{
 await newPilot(page,'Allies',2,'fighter');
 for(let rank=1;rank<=8;rank++){
  await expect(page.locator('#active-rung [data-choice]')).toHaveCount(3);
  const before=await encounter(page,true,rank%3);
  expect(before.run.rank).toBe(rank);
  const after=await state(page);
  expect(after.wins).toBe(rank);
  expect(after.kills).toBeGreaterThanOrEqual(rank);
  if(rank<8){
    expect(after.run.rank).toBe(rank+1);
    expect(after.run.lives).toBe(3);
    await page.locator('[data-action="ladder"]').click();
    await expect(page.locator('#active-rung [data-choice]')).toHaveCount(3);
  }else{
    expect(after.completed).toBe(1);
    expect(after.run).toBeNull();
    expect(after.best).toBe(8);
  }
 }
});
test('three losses consume exactly three lives, preserve defeats and end career without corrupting profile',async({page})=>{
 await newPilot(page,'Axis',0,'bf110');
 for(let losses=1;losses<=3;losses++){
  await encounter(page,false,0);
  let saved=await state(page);
  expect(saved.losses).toBe(losses);
  if(losses<3){
    expect(saved.run.rank).toBe(1);
    expect(saved.run.lives).toBe(3-losses);
    await page.locator('[data-action="ladder"]').click();
    await expect(page.locator('#active-rung [data-choice]')).toHaveCount(3);
  }else{
    expect(saved.run).toBeNull();
    expect(saved.profile.name).toContain('Otto');
    expect(Object.values(saved.records).some(r=>r.losses>0)).toBe(true);
  }
 }
});
test('switching a predefined character within the squadron keeps progression and changes signature',async({page})=>{
 await newPilot(page,'Allies',0);
 await encounter(page,true,0);
 const prior=await state(page);
 await page.locator('[data-action="ladder"]').click();
 await page.locator('[data-action="character"]').click();
 await expect(page.locator('[data-roster]')).toHaveCount(20);
 const target=await page.locator('[data-roster]').nth(4).getAttribute('data-roster');
 await page.locator('[data-roster="'+target+'"]').click();
 const after=await state(page);
 expect(after.profile.rosterId).toBe(target);
 expect(after.profile.name).not.toBe(prior.profile.name);
 expect(after.profile.skill).not.toBe(prior.profile.skill);
 expect(after.wins).toBe(prior.wins);
 expect(after.run.rank).toBe(prior.run.rank);
 expect(after.run.aircraft).toBe(prior.run.aircraft);
});
test('all 40 pilots have valid unique identity-and-skill profiles and unique art locations',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(()=>{
  const roster=window.WingmanRoster||[];
  const axis=roster.filter(p=>p.faction==='Axis');
  const raf=roster.filter(p=>p.faction==='Allies');
  return {total:roster.length,raf:raf.length,axis:axis.length,
    names:new Set(roster.map(p=>p.name)).size,
    ids:new Set(roster.map(p=>p.id)).size,
    portraits:new Set(roster.map(p=>p.portrait)).size,
    profiles:new Set(roster.map(p=>p.signature+':'+Object.values(p.attributes).join(','))).size,
    invalid:roster.filter(p=>!['male','female'].includes(p.gender) ||
     !['reverse','roll','smoke','harden','deadeye','cut','dive'].includes(p.signature) ||
     !Object.values(p.attributes).every(n=>Number.isFinite(n)&&n>=35&&n<=100)).map(p=>p.id),
    artReady:window.WingmanGermanPortraitsReady===true};
 });
 expect(result).toEqual({total:40,raf:20,axis:20,names:40,ids:40,portraits:40,profiles:40,invalid:[],artReady:true});
});

test('abandoning an active career sortie via MENU unlocks the same tier without charging a life',async({page})=>{
 await newPilot(page,'Allies',0);
 const before=await state(page);
 await launchChoice(page,0);
 await page.locator('#menu-return').click();
 if(await page.locator('#career-open').isVisible())await page.locator('#career-open').click();
 else await page.locator('#career-open-mobile').click();
 await expect(page.locator('#active-rung [data-choice]')).toHaveCount(3);
 await launchChoice(page,1);
 const after=await state(page);
 expect(after.wins).toBe(before.wins);
 expect(after.losses).toBe(before.losses);
 expect(after.run.lives).toBe(3);
 expect(after.run.rank).toBe(1);
});
test('mission-by-mission aircraft selection has three valid choices and no permanent airframe lock',async({page})=>{
 for(const faction of ['Allies','Axis']){
  await newPilot(page,faction,0);
  const initial=await state(page);
  await page.locator('#active-rung [data-choice="0"]').click();
  await expect(page.locator('[data-sortie-plane]')).toHaveCount(3);
  await page.locator('[data-action="sortie-back"]').click();
  await expect(page.locator('#active-rung [data-choice]')).toHaveCount(3);
  const aircraft=faction==='Allies'?'heavy':'bf110';
  await launchChoice(page,1,aircraft);
  const saved=await state(page);
  expect(saved.run.aircraft).toBe(aircraft);
  expect(saved.run.airframe).toBeNull();
  await page.locator('#menu-return').click();
  await page.evaluate(key=>localStorage.removeItem(key),KEY);
 }
});
test('roster remains scrollable with the faction selector visible on both mobile and desktop',async({page})=>{
 await openCareer(page);
 await page.locator('#career-faction').selectOption('Axis');
 const before=await page.locator('.character-roster').evaluate(el=>({scrollHeight:el.scrollHeight,clientHeight:el.clientHeight}));
 expect(before.scrollHeight).toBeGreaterThan(before.clientHeight);
 await page.locator('.character-roster').evaluate(el=>el.scrollTop=el.scrollHeight);
 const offset=await page.locator('.character-roster').evaluate(el=>el.scrollTop);
 expect(offset).toBeGreaterThan(0);
 await expect(page.locator('#career-faction')).toBeVisible();
});


test('named 1v2 branches exist only on ranks 3 5 and 7, with two distinct enemy profiles',async({page})=>{
 await newPilot(page,'Allies',0);
 for(let rank=1;rank<=8;rank++){
  const saved=await state(page);
  expect(saved.run.rank).toBe(rank);
  const lanes=saved.run.choices;
  expect(lanes).toHaveLength(3);
  for(const [i,choice] of lanes.entries()){
   const double=(rank===3||rank===5||rank===7)&&i===2;
   expect(choice.types).toHaveLength(rank===8?3:double?2:1);
   if(double){
    expect(choice.wingman).toBeTruthy();
    expect(choice.wingman.id).not.toBe(choice.id);
    expect(choice.wingman.name).not.toBe(choice.label);
    expect(choice.wingman.plane).not.toBe(choice.types[0]);
    expect(choice.wingman.plane).toBe(choice.types[1]);
    expect(choice.wingman.signature).toBeTruthy();
    await expect(page.locator('#active-rung [data-choice="2"] .rival-wingman')).toContainText(choice.wingman.name);
    }else expect(choice.wingman).toBeNull();
   if(rank===8){
     expect(choice.finalBoss).toBe(true);
     expect(choice.wingmen).toHaveLength(2);
     expect(choice.opponents).toHaveLength(3);
     expect(choice.opponents[2].id).toBe(choice.id);
     expect(new Set(choice.opponents.map(p=>p.id)).size).toBe(3);
     expect(choice.bossId).toBe(choice.id);
     await expect(page.locator('#active-rung [data-choice="'+i+'"] .rival-final')).toContainText('1v3');
   }
   const profile=await page.evaluate(({id,rank})=>{
    const p=window.WingmanRoster.find(x=>x.id===id);
    const v=window.WingmanPilotAI.level(p,rank);
    return {attributes:v.attributes,signature:v.signature,tactic:v.tactic};
   },{id:choice.id,rank});
   expect(choice.attributes).toEqual(profile.attributes);
   expect(choice.signature).toBe(profile.signature);
   expect(choice.personality).toBe(profile.tactic);
  }
  // Verify player can launch each challenge tier, including the 1v3 finale.
  const pick=(rank===3||rank===5||rank===7)?2:0;
  await launchChoice(page,pick);
  await page.evaluate(()=>window.WingmanCareer.finishEncounter(true,{label:'Regression',types:['fighter']}));
  if(rank<8)await page.locator('[data-action="ladder"]').click();
 }
});
test('a recurring rival grows in proficiency without changing name, archetype or signature',async({page})=>{
 await page.goto('/');
 const observed=await page.evaluate(()=>{
  const pilot=window.WingmanRoster.find(x=>x.id==='ace-21');
  const rookie=window.WingmanPilotAI.level(pilot,1);
  const ace=window.WingmanPilotAI.level(pilot,8);
  return {rookie,ace};
 });
 expect(observed.rookie.name).toBe(observed.ace.name);
 expect(observed.rookie.signature).toBe(observed.ace.signature);
 expect(observed.rookie.tactic).toBe(observed.ace.tactic);
 for(const stat of ['gunnery','manoeuvrability','engine'])
   expect(observed.ace.attributes[stat]).toBeGreaterThan(observed.rookie.attributes[stat]);
 expect(observed.ace.reaction).toBeLessThan(observed.rookie.reaction);
});

test('career records decorations, streaks, final-ace ceremony and persistent service history',async({page})=>{
 await newPilot(page,'Allies',1,'heavy');
 for(let rank=1;rank<=8;rank++){
  const pick=rank===3||rank===5||rank===7?2:0;
  await launchChoice(page,pick);
  await page.evaluate(()=>window.WingmanCareer.finishEncounter(true,{label:'QA Victory',types:['fighter']}));
  const saved=await state(page);
  expect(saved.streak).toBe(rank);
  expect(saved.bestStreak).toBe(rank);
  expect(saved.service).toHaveLength(rank);
  expect(saved.service[rank-1].rank).toBe(rank);
  if(rank<8)await page.locator('[data-action="ladder"]').click();
 }
 const result=await state(page);
 expect(result.completed).toBe(1);
 expect(result.run).toBeNull();
 expect(result.medals).toContain('wingman-legend');
 expect(result.medals).toContain('triple-ace');
 expect(result.medals).toContain('veteran');
 expect(result.medals).toContain('double-trouble');
 await expect(page.locator('.final-tribute')).toContainText('Wingman Legend');
 await expect(page.locator('.career-service .career-log-entry')).toHaveCount(8);
 await page.reload();
 if(await page.locator('#career-license').isVisible())await page.locator('#career-license').click();
 else {
  await page.locator('#career-open-mobile').click();
  await page.locator('[data-action="licence"]').first().click();
 }
 await expect(page.locator('.medal.earned')).toHaveCount(result.medals.length);
 await expect(page.locator('.career-service')).toBeVisible();
});
test('final ace identity is constant across all three approaches, and nemesis returns later in career',async({page})=>{
 await newPilot(page,'Allies',1,'fighter');
 // Force a fully versioned saved rank-eight run to verify its three approach variants.
 await page.evaluate(key=>{
  const d=JSON.parse(localStorage.getItem(key));
  d.run.rank=8;d.run.visits=7;d.run.choices=null;
  d.records['ace-21']={wins:1,losses:3};
  localStorage.setItem(key,JSON.stringify(d));
 },KEY);
 await page.reload();
 if(await page.locator('#career-open').isVisible())await page.locator('#career-open').click();
 else await page.locator('#career-open-mobile').click();
 const saved=await state(page);
 expect(saved.run.rank).toBe(8);
 const choices=saved.run.choices;
 expect(choices.every(x=>x.finalBoss&&x.types.length===3)).toBe(true);
 expect(new Set(choices.map(x=>x.id)).size).toBe(1);
 expect(choices[0].label).toContain('Otto');
 expect(new Set(choices.map(x=>x.wingmen.map(y=>y.id).join(','))).size).toBeGreaterThan(1);
});

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
  await expect(page.locator('.career-licence')).toBeVisible();
  await page.locator('[data-action="ladder"]').last().click();
  await expect(page.locator('.airframe-card')).toHaveCount(3);
  const type=aircraft||(faction==='Axis'?'bf109':'fighter');
  await page.locator('[data-aircraft="'+type+'"]').click();
  await expect(page.locator('#active-rung [data-choice]')).toHaveCount(3);
}
async function encounter(page,win=true,lane=0){
  const before=await state(page);
  await page.locator('#active-rung [data-choice="'+lane+'"]').click();
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
  expect(saved.run.aircraft).toBe(faction==='Allies'?'fighter':'bf109');
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
 await page.locator('#active-rung [data-choice="0"]').click();
 await expect(page.locator('#menu-return')).toBeVisible();
 await page.locator('#menu-return').click();
 if(await page.locator('#career-open').isVisible())await page.locator('#career-open').click();
 else await page.locator('#career-open-mobile').click();
 await expect(page.locator('#active-rung [data-choice]')).toHaveCount(3);
 await page.locator('#active-rung [data-choice="1"]').click();
 await expect(page.locator('#menu-return')).toBeVisible();
 const after=await state(page);
 expect(after.wins).toBe(before.wins);
 expect(after.losses).toBe(before.losses);
 expect(after.run.lives).toBe(3);
 expect(after.run.rank).toBe(1);
});
test('rolled heavy fighter armour reflects actual combat armour rather than inflated historical cards',async({page})=>{
 for(const [faction,type,base] of [['Allies','heavy',78],['Axis','bf110',75]]){
  await openCareer(page);
  await page.locator('#career-faction').selectOption(faction);
  await page.locator('[data-candidate="0"]').click();
  await page.locator('[data-action="ladder"]').last().click();
  const armour=Number((await page.locator('[data-aircraft="'+type+'"]').innerText()).match(/ARMOUR\s+(\d+)/)?.[1]);
  expect(armour).toBeGreaterThanOrEqual(Math.round(base*.9));
  expect(armour).toBeLessThanOrEqual(Math.ceil(base*1.1));
  await page.locator('[data-aircraft="'+type+'"]').click();
  const saved=await state(page);
  expect(saved.run.airframe.stats.armour).toBe(armour);
  await page.evaluate(key=>localStorage.removeItem(key),KEY);
  await page.goto('/');
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

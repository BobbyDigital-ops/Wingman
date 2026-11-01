/* Phase 11A — actual Chromium visual and behavioural checks, both viewports. */
const {test,expect}=require('@playwright/test');
async function boot(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect.poll(()=>page.evaluate(()=>!!window.WingmanGame?.flightVisuals)).toBe(true);
 return errors;
}
async function launchCampaign(page,rank,lane){
 return page.evaluate(({rank,lane})=>{
  const pool=window.WingmanRoster.filter(p=>p.faction==='Axis');
  const p=pool.find(x=>x.plane==='bf109');
  const enc=window.WingmanCampaign.decorateEncounter({
   id:p.id,label:p.name,rank,types:['bf109'],opponents:[p],
   attributes:p.attributes,signature:p.signature,archetype:p.archetype,
   personality:p.personality,arena:rank%4
  },{rank,seed:13071,visits:0,faction:'Allies',condition:100,supplies:0,effects:[]},
   lane,{pool,profile:q=>({...q,attributes:{...q.attributes}})});
  if(enc.isNonCombat)throw Error('Expected real combat mission');
  window.WingmanGame.startCampaignFight(enc,'fighter',null);
  document.getElementById('wingman-new-interface')?.style.setProperty('display','none');
  return {visuals:window.WingmanGame.flightVisuals(),label:enc.environment?.label,
   isPlaying:window.WingmanGame.isPlaying()};
 },{rank,lane});
}
test('Skirmish weather dropdown launches the chosen hazard through the real menu',async({page},testInfo)=>{
 const errors=await boot(page);
 const ui=page.frameLocator('#wingman-new-interface iframe');
 await ui.locator('[data-action="opening-start"]').click();
 await ui.locator('[data-profile-slot="0"]').click();
 if(await ui.locator('[data-action="confirm-pilot"]').count())
  await ui.locator('[data-action="confirm-pilot"]').click();
 await expect(ui.locator('[data-action="operations"]')).toBeVisible();
 await ui.locator('[data-action="operations"]').click();
 const weather=ui.locator('select[data-setting="weather"]');
 await expect(weather).toHaveValue('auto');
 await expect(weather.locator('option[value="searchlight"]')).toHaveCount(0);
 await weather.selectOption('flak');
 await expect(weather).toHaveValue('flak');
 await page.screenshot({path:testInfo.outputPath('skirmish-weather-choice.png')});
 await ui.locator('[data-action="operations-next"]').click();
 await ui.locator('[data-action="launch-arcade"]').click();
 await expect.poll(()=>page.evaluate(()=>window.WingmanGame.flightVisuals().hazard)).toBe('flak');
 expect(await page.evaluate(()=>window.WingmanGame.isPlaying())).toBe(true);
 expect(errors).toEqual([]);
});
test('turning bank is visible for human and AI aircraft, and naturally levels',async({page},testInfo)=>{
 const errors=await boot(page);
 const start=await page.evaluate(()=>{
  const ok=window.WingmanGame.launchArcade({mode:'duel',aircraft:'fighter',
   difficulty:'standard',arena:3,opponent:'bf109'});
  document.getElementById('wingman-new-interface')?.style.setProperty('display','none');
  return {ok,visuals:window.WingmanGame.flightVisuals()};
 });
 expect(start.ok).toBe(true);
 expect(start.visuals.weather).toBe('storm');
 await page.keyboard.down('ArrowRight');
 await page.waitForTimeout(700);
 const bank=await page.evaluate(()=>window.WingmanGame.flightVisuals().banking[0].bank);
 expect(bank).toBeGreaterThan(.50);
 const wind=await page.evaluate(()=>window.WingmanGame.flightVisuals().wind);
 expect(wind.active).toBe(true);
 expect(Math.abs(wind.current)).toBeGreaterThan(18);
 await page.screenshot({path:testInfo.outputPath('right-bank-and-storm.png')});
 await page.keyboard.up('ArrowRight');
 await page.waitForTimeout(950);
 const after=await page.evaluate(()=>window.WingmanGame.flightVisuals().banking[0].bank);
 expect(Math.abs(after)).toBeLessThan(Math.abs(bank));
 expect(errors).toEqual([]);
});
test('campaign flak is readable and old searchlight missions fall back to fog',async({page},testInfo)=>{
 const errors=await boot(page);
 const flak=await launchCampaign(page,10,2);
 expect(flak.isPlaying).toBe(true);
 expect(flak.visuals.hazard).toBe('flak');
 expect(flak.label).toContain('FLAK');
 await page.screenshot({path:testInfo.outputPath('flak-mission.png')});
 const lights=await launchCampaign(page,11,1);
 expect(lights.isPlaying).toBe(true);
 expect(lights.visuals.hazard).toBeNull();
 expect(lights.visuals.weather).toBe('fog');
 expect(lights.label).not.toContain('SEARCHLIGHT');
 await page.waitForTimeout(400);
 await page.screenshot({path:testInfo.outputPath('retired-searchlight-fog-mission.png')});
 expect(errors).toEqual([]);
});
test('sun glare, fog and final boss weather use existing aircraft and remain playable',async({page},testInfo)=>{
 const errors=await boot(page);
 const glare=await launchCampaign(page,9,1);
 expect(glare.visuals.weather).toBe('glare');
 expect(glare.visuals.hazard).toBeNull();
 await page.screenshot({path:testInfo.outputPath('sun-glare.png')});
 const fog=await launchCampaign(page,6,0);
 expect(fog.visuals.weather).toBe('fog');
 await page.screenshot({path:testInfo.outputPath('fog.png')});
 const boss=await launchCampaign(page,12,1);
 expect(boss.visuals.weather).toBe('storm');
 expect(boss.visuals.hazard).toBeNull();
 expect(boss.isPlaying).toBe(true);
 expect(errors).toEqual([]);
});

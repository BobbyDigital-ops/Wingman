const {test,expect}=require('@playwright/test');
async function mode(page,name){
 await page.goto('/');
 await page.locator('#splash-continue').click();
 await expect(page.locator('#mode-panel')).toBeVisible();
 await page.locator('[data-mode-choice="'+name+'"]').click();
 await expect(page.locator('[data-mode-choice="'+name+'"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#mode-next').click();
 await expect(page.locator('#options-panel')).toBeVisible();
}
test('Phase 6 all five selectable modes retain distinct real game presets',async({page})=>{
 for(const [name,expected,participants,team] of [
  ['duel','duel','2','ffa'],['survival','survival','2','ffa'],
  ['triple','duel','3','ffa'],['teams','duel','4','teams'],
  ['challenge','challenge','2','ffa']
 ]){
  await mode(page,name);
  expect(await page.locator('#mode-select').inputValue()).toBe(expected);
  expect(await page.locator('#pilots-select').inputValue()).toBe(participants);
  expect(await page.locator('#team-select').inputValue()).toBe(team);
  if(name==='challenge')await expect(page.locator('#challenge-setting')).toBeVisible();
  else await expect(page.locator('#challenge-setting')).toBeHidden();
  await page.locator('#options-back').click();
 }
});
test('Phase 6 every special operation can be selected and launched in landscape',async({page})=>{
 await mode(page,'challenge');
 for(const id of ['intercept','crosswind','noarmour','heavy']){
  await page.locator('#challenge-select').selectOption(id);
  expect(await page.locator('#challenge-select').inputValue()).toBe(id);
  const start=page.locator('#start');await start.scrollIntoViewIfNeeded();
  await start.click();
  await expect(page.locator('#menu')).toHaveClass(/hidden/);
  await expect(page.locator('#menu-return')).toBeVisible();
  await page.locator('#menu-return').click();
  await expect(page.locator('#splash-panel')).toBeVisible();
  if(id!=='heavy')await mode(page,'challenge');
 }
});
test('Phase 6 honours and five separate local records survive reloading',async({page})=>{
 await page.goto('/');
 const entry=await page.evaluate(()=>{
  for(const [mode,score] of [['duel',320],['survival',1180],['triple',520],['teams',900],['challenge',760]]){
   window.WingmanArcade.finish({mode,won:true,score,waves:mode==='survival'?5:0,
    kills:2,seconds:45,shots:30,hits:8,damageTaken:20,
    aircraft:'fighter',difficulty:'standard',challenge:mode==='challenge'?'intercept':null});
  }
  return {keys:window.WingmanArcade.board().map(x=>x.mode),earned:window.WingmanArcade.data.unlocks.length};
 });
 expect(entry.earned).toBeGreaterThanOrEqual(5);
 await page.reload();
 await page.locator('#splash-continue').click();
 const panel=page.locator('#arcade-records-panel');
 await expect(panel).toBeVisible();
 await panel.locator('summary').click();
 const board=page.locator('#arcade-records');
 await expect(board).toContainText('1,180');
 await expect(board).toContainText('SURVIVAL');
 await expect(board).toContainText('SQUADRON');
 await expect(board).toContainText('CHALLENGE');
 expect(await page.evaluate(()=>window.WingmanArcade.data.total)).toBe(5);
 await expect(board.locator('.arcade-honour.earned')).not.toHaveCount(0);
});
test('Phase 6 local records do not block touch controls or operation selection on mobile',async({page})=>{
 await page.goto('/');
 await page.locator('#splash-continue').click();
 await page.locator('#arcade-records-panel summary').click();
 await expect(page.locator('#arcade-records')).toBeVisible();
 const button=page.locator('#mode-next');
 await button.scrollIntoViewIfNeeded();
 await button.click();
 await expect(page.locator('#options-panel')).toBeVisible();
 await page.locator('#start').click();
 await expect(page.locator('#menu')).toHaveClass(/hidden/);
 await expect(page.locator('#fire')).toBeVisible();
});

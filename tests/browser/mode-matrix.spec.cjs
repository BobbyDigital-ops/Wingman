const {test,expect}=require('@playwright/test');
async function setup(page,mode){
 await page.goto('/');
 await page.locator('#splash-continue').click();
 await page.locator('[data-mode-choice="'+mode+'"]').click();
 await page.locator('#mode-next').click();
 await expect(page.locator('#options-panel')).toBeVisible();
}
for(const [mode,pilots,team,style] of [
 ['duel','2','ffa','duel'],['survival','2','ffa','survival'],
 ['triple','3','ffa','duel'],['teams','4','teams','duel']
]){
 test('operation '+mode+' configures and launches the correct playable match',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await setup(page,mode);
  expect(await page.locator('#pilots-select').inputValue()).toBe(pilots);
  expect(await page.locator('#team-select').inputValue()).toBe(team);
  expect(await page.locator('#mode-select').inputValue()).toBe(style);
  await page.locator('#start').click();
  await expect(page.locator('#menu-return')).toBeVisible();
  await page.waitForTimeout(150);
  expect(errors).toEqual([]);
  await page.locator('#menu-return').click();
  await expect(page.locator('#menu')).toBeVisible();
 });
}
test('six aircraft select, preview and launch with no browser errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const aircraft of ['fighter','heavy','bomber','bf109','bf110','he111']){
  await setup(page,'duel');
  const card=page.locator('[data-plane="'+aircraft+'"]');
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#wm-featured-name')).not.toBeEmpty();
  await page.locator('#start').click();
  await expect(page.locator('#menu-return')).toBeVisible();
  await page.waitForTimeout(120);
  expect(errors).toEqual([]);
  await page.locator('#menu-return').click();
 }
});
test('every theatre and difficulty can be set before sortie launch',async({page})=>{
 await setup(page,'duel');
 for(const arena of ['0','1','2','3']){
  await page.locator('#arena-select').selectOption(arena);
  expect(await page.locator('#arena-select').inputValue()).toBe(arena);
 }
 for(const diff of ['rookie','standard','ace']){
  await page.locator('#difficulty-select').selectOption(diff);
  expect(await page.locator('#difficulty-select').inputValue()).toBe(diff);
 }
 await page.locator('#start').click();
 await expect(page.locator('#menu-return')).toBeVisible();
});

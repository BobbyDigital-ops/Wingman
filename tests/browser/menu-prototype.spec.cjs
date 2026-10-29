const {test,expect}=require('@playwright/test');
const url='/menu-prototype/';
test('home, operation, aircraft and honest prototype-only sortie briefing',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);
 await expect(page.getByRole('heading',{name:'WINGMAN'})).toBeVisible();
 await page.locator('[data-action="operations"]').click();
 await expect(page.getByRole('heading',{name:'SELECT OPERATION'})).toBeVisible();
 await page.locator('[data-mode="teams"]').click();
 await expect(page.locator('[data-mode="teams"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-action="aircraft"]').click();
 await expect(page.getByRole('heading',{name:'PREPARE FOR TAKEOFF'})).toBeVisible();
 await expect(page.locator('.aircraft-tile')).toHaveCount(6);
 await page.locator('[data-plane="bf109"]').click();
 await expect(page.locator('[data-plane="bf109"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-action="launch"]').click();
 await expect(page.getByRole('dialog')).toContainText('This prototype only demonstrates the menus');
 await page.locator('[data-action="dismiss"]').click();
 await page.locator('[data-action="back"]').click();
 await expect(page.getByRole('heading',{name:'SELECT OPERATION'})).toBeVisible();
 expect(errors).toEqual([]);
});
test('pilot selection uses actual roster and career aircraft is chosen separately',async({page})=>{
 await page.goto(url);
 await page.locator('[data-action="career"]').click();
 await expect(page.getByRole('heading',{name:'ROAD TO ACE'})).toBeVisible();
 await page.locator('[data-action="pick-career-pilot"]').click();
 await expect(page.locator('.pilot-card')).toHaveCount(20);
 await page.locator('[data-filter="Axis"]').click();
 await expect(page.locator('.pilot-card')).toHaveCount(20);
 await page.locator('[data-filter="Allies"]').click();
 await page.locator('[data-pilot="ace-02"]').click();
 await page.locator('[data-action="confirm-pilot"]').click();
 await expect(page.getByRole('heading',{name:'ROAD TO ACE'})).toBeVisible();
 await expect(page.locator('.mission-card')).toHaveCount(3);
 await page.locator('[data-mission="1"]').click();
 await page.locator('[data-action="career-aircraft"]').click();
 await expect(page.locator('.aircraft-tile')).toHaveCount(3);
 await expect(page.locator('.pill.gold')).toContainText('SPECIALIST');
 await page.locator('[data-action="launch"]').click();
 await expect(page.getByRole('dialog')).toContainText('pilot');
 await expect(page.getByRole('dialog')).toContainText('10% bonus');
});
test('all top navigation and back routes work without affecting live game',async({page})=>{
 await page.goto(url);
 for(const screen of ['operations','aircraft','pilots','records','home','options']){
  await page.locator('.topnav [data-screen="'+screen+'"], .top-right [data-screen="'+screen+'"]').first().click();
  expect(await page.evaluate(()=>window.WingmanMenuPrototype.state.screen)).toBe(screen);
 }
 await page.locator('[data-action="sound"]').click();
 expect(await page.evaluate(()=>window.WingmanMenuPrototype.state.sound)).toBe(false);
 await page.locator('[data-action="home"]').click();
 await expect(page.getByRole('heading',{name:'WINGMAN'})).toBeVisible();
});
test('mobile landscape exposes the full menu without horizontal overflow',async({page,isMobile})=>{
 await page.goto(url);
 await expect(page.locator('.topbar')).toBeVisible();
 const initial=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:window.innerWidth,app:document.querySelector('.app').getBoundingClientRect().height,height:window.innerHeight}));
 expect(initial.scroll).toBeLessThanOrEqual(initial.inner+3);
 await page.locator('[data-action="operations"]').click();
 await expect(page.locator('[data-mode="challenge"]')).toBeVisible();
 await page.locator('[data-action="aircraft"]').click();
 await expect(page.locator('.aircraft-tile')).toHaveCount(6);
 await page.locator('[data-plane="heavy"]').click();
 await expect(page.locator('[data-plane="heavy"]')).toHaveAttribute('aria-pressed','true');
});
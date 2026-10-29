const {test,expect}=require('@playwright/test');
const KEY='wingman-road-to-ace-v1';
async function openCareer(page){
 await page.goto('/');
 const desktop=page.locator('#career-open');
 if(await desktop.isVisible())await desktop.click();
 else await page.locator('#career-open-mobile').click();
}
test('clear three-step Road to Ace onboarding and change aircraft without resetting the run',async({page})=>{
 await openCareer(page);
 await expect(page.locator('#career-faction')).toBeVisible();
 const pilotName=await page.locator('[data-candidate="0"] strong').innerText();
 await expect(page.locator('[data-candidate="0"]')).toContainText('CONFIRM PILOT');
 await page.locator('[data-candidate="0"]').click();
 await expect(page.locator('.career-onboarding')).toContainText(pilotName);
 await expect(page.locator('[data-action="begin-run"]')).toBeVisible();
 await expect(page.locator('.airframe-card')).toHaveCount(0);
 await page.locator('[data-action="begin-run"]').click();
 await expect(page.locator('#active-rung [data-choice]')).toHaveCount(3);
 await page.locator('#active-rung [data-choice="0"]').click();
 await expect(page.locator('[data-sortie-plane]')).toHaveCount(3);
 await expect(page.locator('.preferred-plane')).toHaveCount(1);
 const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 const preferred=saved.profile.plane;
 await expect(page.locator('.preferred-plane')).toContainText('10%');
 await page.locator('[data-action="sortie-back"]').click();
 await expect(page.locator('#active-rung [data-choice]')).toHaveCount(3);
 const alternative=preferred==='fighter'?'heavy':'fighter';
 await page.locator('#active-rung [data-choice="1"]').click();
 await page.locator('[data-sortie-plane="'+alternative+'"]').click();
 await expect(page.locator('#menu-return')).toBeVisible();
 let progressed=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 expect(progressed.run.aircraft).toBe(alternative);
 expect(progressed.run.choices[1].playerAptitude).toBeNull();
 await page.evaluate(()=>window.WingmanCareer.finishEncounter(true,{label:'Test',types:['fighter']}));
 await page.locator('[data-action="ladder"]').click();
 await page.locator('#active-rung [data-choice="0"]').click();
 await page.locator('[data-sortie-plane="'+preferred+'"]').click();
 progressed=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 expect(progressed.run.aircraft).toBe(preferred);
 expect(progressed.run.choices[0].playerAptitude).toEqual({hull:1.1,armour:1.1,damage:1.1});
 expect(progressed.run.rank).toBe(2);
});
test('all six historical aircraft photographs load as real images and selection updates the featured photo',async({page})=>{
 await page.goto('/');
 await page.locator('#splash-continue').click();
 await page.locator('#mode-next').click();
 await expect(page.locator('#options-panel')).toBeVisible();
 await expect.poll(async()=>page.locator('.hangar-real-photo.ready').count(),{timeout:18000}).toBe(7);
 for(const type of ['fighter','heavy','bomber','bf109','bf110','he111']){
  await page.locator('[data-plane="'+type+'"]').click();
  const hero=page.locator('.hangar-real-hero');
  await expect(hero).toHaveAttribute('data-plane',type);
  await expect(hero).toHaveClass(/ready/);
  const dimensions=await hero.evaluate(e=>({width:e.naturalWidth,height:e.naturalHeight,src:e.currentSrc}));
  expect(dimensions.width).toBeGreaterThan(200);
  expect(dimensions.height).toBeGreaterThan(100);
  expect(dimensions.src).toMatch(/commons.wikimedia.org/);
 }
 const files=await page.locator('.hangar-real-tile').evaluateAll(xs=>xs.map(x=>x.src));
 expect(new Set(files).size).toBe(6);
});
test('menu navigation provides back routes and does not trap the user in arcade settings',async({page})=>{
 await page.goto('/');
 await page.locator('#splash-continue').click();
 await expect(page.locator('#mode-panel')).toBeVisible();
 await page.locator('[data-mode-choice="challenge"]').click();
 await page.locator('#mode-next').click();
 await expect(page.locator('#challenge-setting')).toBeVisible();
 await page.locator('#options-back').click();
 await expect(page.locator('#mode-panel')).toBeVisible();
 await page.locator('#mode-back').click();
 await expect(page.locator('#splash-panel')).toBeVisible();
});
test('Road to Ace close button is unobstructed even when the fullscreen control is present',async({page})=>{
 await openCareer(page);
 await expect(page.locator('.career-head [data-action="close"]')).toBeVisible();
 await expect(page.locator('#career-fullscreen')).toBeHidden();
 await page.locator('.career-head [data-action="close"]').click();
 await expect(page.locator('#career-screen')).toBeHidden();
});

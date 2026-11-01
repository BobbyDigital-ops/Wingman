/* Phase 10E focused browser acceptance: CURRENT illustrated UI, not old prototypes. */
'use strict';
const {test,expect}=require('@playwright/test');
const ui=page=>page.frameLocator('#wingman-new-interface iframe');
async function pilotToHome(page,faction='Allies'){
 await page.goto('/');
 await expect(ui(page).locator('[data-action="opening-start"]')).toBeVisible();
 await ui(page).locator('[data-action="opening-start"]').click();
 await expect(ui(page).locator('[data-profile-slot="0"]')).toBeVisible();
 await ui(page).locator('[data-profile-slot="0"]').click();
 await expect(ui(page).locator('.pilot-screen')).toBeVisible();
 if(faction==='Axis')await ui(page).locator('[data-filter="Axis"]').click();
 await ui(page).locator('[data-action="confirm-pilot"]').click();
 await expect(ui(page).locator('[data-action="career"]')).toBeVisible();
}
async function campaignToHangar(page){
 await ui(page).locator('[data-action="career"]').click();
 await expect(ui(page).locator('[data-action="begin-career"]')).toBeVisible();
 await ui(page).locator('[data-action="begin-career"]').click();
 await expect(ui(page).locator('.campaign-ladder-scroll')).toBeVisible();
 await expect(ui(page).locator('.route-map-row')).toHaveCount(12);
 await ui(page).locator('[data-choice="1"]').click();
 await expect(ui(page).locator('.wm-v085-sortie-brief')).toBeVisible();
 await expect(ui(page).locator('.wm-v085-sortie-metrics')).toContainText('THREAT RATING');
 await ui(page).locator('[data-action="career-aircraft"]').click();
 await expect(ui(page).locator('[data-action="launch-career"]')).toBeVisible();
 await expect(ui(page).locator('.wm-v12-aircraft-tile')).toHaveCount(3);
}
test('RAF campaign map, relative threat and live combat launch work on desktop and phone',async({page})=>{
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await pilotToHome(page);
 const calibration=await page.evaluate(()=>({
  present:!!window.WingmanCombatBalance,
  rank3:window.WingmanCombatBalance?.skillFor({rank:3,lane:2}),
  rank12:window.WingmanCombatBalance?.skillFor({rank:12,lane:2,finalBoss:true})
 }));
 expect(calibration.present).toBe(true);
 expect(calibration.rank3).toBeLessThan(.4);
 expect(calibration.rank12).toBe(1);
 await campaignToHangar(page);
 await ui(page).locator('[data-action="launch-career"]').click();
 await expect(page.locator('#menu-return')).toBeVisible();
 await expect(page.locator('#wingman-new-interface')).toBeHidden();
 expect(await page.evaluate(()=>window.WingmanGame.isPlaying())).toBe(true);
 await page.locator('#menu-return').click();
 await expect(ui(page).locator('[data-action="career"]')).toBeVisible();
 expect(errors).toEqual([]);
});
test('Luftwaffe career retains correct original German plane roster and sortie',async({page})=>{
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await pilotToHome(page,'Axis');
 await campaignToHangar(page);
 const labels=await ui(page).locator('.wm-v12-aircraft-tile').allTextContents();
 expect(labels.join(' ')).toContain('BF 109');
 expect(labels.join(' ')).toContain('BF 110');
 expect(labels.join(' ')).toContain('HEINKEL');
 await ui(page).locator('[data-plane="4"]').click();
 await ui(page).locator('[data-action="launch-career"]').click();
 await expect(page.locator('#menu-return')).toBeVisible();
 expect(await page.evaluate(()=>window.WingmanGame.isPlaying())).toBe(true);
 expect(errors).toEqual([]);
});
test('phone landscape provides reachable live controls without covering the game',async({page,isMobile})=>{
 test.skip(!isMobile,'Touch layout only');
 await pilotToHome(page);
 await campaignToHangar(page);
 await ui(page).locator('[data-action="launch-career"]').click();
 await expect(page.locator('#fire')).toBeVisible();
 await expect(page.locator('#left')).toBeVisible();
 await expect(page.locator('#right')).toBeVisible();
 for(const id of ['left','right','fire','special']){
  const box=await page.locator('#'+id).boundingBox();
  expect(box).not.toBeNull();
  expect(box.width).toBeGreaterThan(16);
  expect(box.height).toBeGreaterThan(16);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x+box.width).toBeLessThanOrEqual(page.viewportSize().width+2);
 }
 await page.locator('#fire').tap();
 expect(await page.evaluate(()=>window.WingmanGame.isPlaying())).toBe(true);
});

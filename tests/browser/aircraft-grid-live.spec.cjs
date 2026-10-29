const {test,expect}=require('@playwright/test');
async function options(page){
 await page.goto('/');
 await page.locator('#splash-continue').click();
 await page.locator('#mode-next').click();
 await expect(page.locator('#options-panel')).toBeVisible();
}
test('approved painted aircraft grid replaces the previous preview with 3 visible cards',async({page})=>{
 await options(page);
 await expect(page.locator('#wm-featured-plane')).toHaveCount(0);
 await expect(page.locator('.wg-card[data-plane]')).toHaveCount(6);
 await expect(page.locator('.wg-card[data-plane]:visible')).toHaveCount(3);
 await expect(page.locator('.wg-card-art')).toHaveCount(6);
 await expect(page.locator('.wg-card[data-plane="fighter"]')).toContainText('OVERDRIVE');
 await expect(page.locator('.wg-card[data-plane="heavy"]')).toContainText('SHIELD');
 const asset=await page.locator('.wg-card-art').first().evaluate(el=>getComputedStyle(el).backgroundImage);
 expect(asset).toContain('data:image/avif;base64');
 const dimensions=await page.evaluate(async()=>{
  const source=getComputedStyle(document.querySelector('.wg-card-art')).backgroundImage;
  const match=source.match(/data:image\/avif;base64,([^"')]+)/);
  if(!match)return null;
  const img=new Image();img.src='data:image/avif;base64,'+match[1];await img.decode();
  return [img.naturalWidth,img.naturalHeight];
 });
 expect(dimensions).toEqual([504,216]);
});
test('Luftwaffe filter selects actual German aircraft for launch',async({page})=>{
 await options(page);
 await page.locator('[data-wg-faction="Axis"]').click();
 await expect(page.locator('.wg-card[data-plane]:visible')).toHaveCount(3);
 await expect(page.locator('[data-plane="bf109"]')).toHaveClass(/selected/);
 await expect(page.locator('[data-plane="fighter"]')).toBeHidden();
 await page.locator('[data-plane="bf110"]').click();
 await expect(page.locator('[data-plane="bf110"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#start').click();
 await expect(page.locator('#menu')).toHaveClass(/hidden/);
 await expect(page.locator('#menu-return')).toBeVisible();
});
test('Road to Ace uses identical pictures and confirms the chosen aircraft before launching',async({page})=>{
 await page.goto('/');
 await page.locator('#career-open').click();
 await page.locator('[data-candidate="0"]').click();
 await page.locator('[data-action="begin-run"]').click();
 await page.locator('#active-rung [data-choice="0"]').click();
 await expect(page.locator('#career-screen .wg-card')).toHaveCount(3);
 const type=await page.locator('#career-screen [data-sortie-plane]').nth(1).getAttribute('data-sortie-plane');
 await page.locator('#career-screen [data-sortie-plane="'+type+'"]').click();
 await expect(page.locator('#career-screen')).toBeVisible();
 await expect(page.locator('#career-screen [data-sortie-plane="'+type+'"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-action="confirm-sortie-aircraft"]').click();
 await expect(page.locator('#menu-return')).toBeVisible();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('wingman-road-to-ace-v1')));
 expect(saved.run.aircraft).toBe(type);
});
test('mobile landscape displays three readable comparison cards and active Launch',async({page,isMobile})=>{
 test.skip(!isMobile,'Phone-specific layout');
 await options(page);
 await expect(page.locator('.wg-card[data-plane]:visible')).toHaveCount(3);
 await expect(page.locator('#start')).toBeVisible();
 await page.locator('[data-wg-faction="Axis"]').click();
 await page.locator('[data-plane="he111"]').click();
 await expect(page.locator('[data-plane="he111"]')).toHaveClass(/selected/);
 await page.locator('#start').click();
 await expect(page.locator('#menu')).toHaveClass(/hidden/);
});
const {test, expect} = require('@playwright/test');

async function enterSetup(page) {
  await page.goto('/');
  await expect(page.locator('#splash-panel')).toBeVisible();
  await page.locator('#splash-continue').click();
  await expect(page.locator('#mode-panel')).toBeVisible();
  await page.locator('#mode-next').click();
  await expect(page.locator('#options-panel')).toBeVisible();
}

test('flight pads never obscure title, mission briefing, loadout or results', async ({page}) => {
  await page.goto('/');
  const pads=page.locator('#touch-controls');
  await expect(page.locator('#splash-panel')).toBeVisible();
  await expect(pads).toBeHidden();
  await page.locator('#splash-continue').click();
  await expect(page.locator('#mode-panel')).toBeVisible();
  await expect(pads).toBeHidden();
  await page.locator('#mode-next').click();
  await expect(page.locator('#options-panel')).toBeVisible();
  await expect(pads).toBeHidden();
  await page.locator('#start').click();
  await expect(page.locator('#menu')).toHaveClass(/hidden/);
  await expect(pads).toBeVisible();
  await page.evaluate(() => document.getElementById('result').classList.remove('hidden'));
  await expect(pads).toBeHidden();
  await page.evaluate(() => document.getElementById('result').classList.add('hidden'));
  await page.locator('#menu-return').click();
  await expect(page.locator('#splash-panel')).toBeVisible();
  await expect(pads).toBeHidden();
});

test('operation and sortie buttons remain unobstructed on landscape screens', async ({page}) => {
  for (const size of [{width:915,height:412},{width:740,height:360}]) {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.locator('#touch-controls')).toBeHidden();
    await page.locator('#splash-continue').click();
    for (const id of ['mode-next','mode-back']) {
      const loc=page.locator('#'+id);
      await loc.scrollIntoViewIfNeeded();
      const top=await loc.evaluate(el=>{
        const r=el.getBoundingClientRect(),elAt=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return elAt===el || el.contains(elAt);
      });
      expect(top,id+' should be the actual touch target at '+size.width+'px').toBe(true);
    }
    await page.locator('#mode-next').click();
    await expect(page.locator('#touch-controls')).toBeHidden();
    for (const id of ['start','options-back']) {
      const loc=page.locator('#'+id);
      await loc.scrollIntoViewIfNeeded();
      const top=await loc.evaluate(el=>{
        const r=el.getBoundingClientRect(),elAt=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return elAt===el || el.contains(elAt);
      });
      expect(top,id+' should not be covered at '+size.width+'px').toBe(true);
    }
  }
});

test('aircraft class identification returns to the live combat HUD', async ({page}) => {
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    window.__hudLabels=[];
    const prior=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(value,...args){
      if(typeof value==='string' && /^(YOU|HOSTILE) • /.test(value)){
        if(!window.__hudLabels.includes(value))window.__hudLabels.push(value);
      }
      return prior.call(this,value,...args);
    };
  });
  await enterSetup(page);
  await page.locator('[data-plane="heavy"]').click();
  await page.locator('#start').click();
  await page.waitForTimeout(200);
  const labels=await page.evaluate(()=>window.__hudLabels);
  expect(labels).toContain('YOU • HEAVY FIGHTER');
  expect(labels.some(value=>value.startsWith('HOSTILE • '))).toBe(true);
  expect(errors).toEqual([]);
});

test('fullscreen instruction cannot interrupt operation selection', async ({page}) => {
  await page.goto('/');
  await page.locator('#splash-continue').click();
  await expect(page.locator('#mode-panel')).toBeVisible();
  const full=await page.evaluate(()=>Boolean(document.fullscreenElement));
  expect(full).toBe(false);
});

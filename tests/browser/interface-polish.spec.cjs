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

test('preflight fullscreen is available on title, operations and loadout',async({page})=>{
 await page.addInitScript(()=>{
   window.fullscreenInvocations=0;
   Element.prototype.requestFullscreen=function(){
     if(this.classList.contains('app'))window.fullscreenInvocations++;
     return Promise.resolve();
   };
 });
 await page.goto('/');
 const button=page.locator('#menu-fullscreen');
 await expect(button).toBeVisible();
 await button.click();
 await expect.poll(()=>page.evaluate(()=>window.fullscreenInvocations)).toBe(1);
 await page.locator('#splash-continue').click();
 await expect(button).toBeVisible();
 await button.click();
 await expect.poll(()=>page.evaluate(()=>window.fullscreenInvocations)).toBe(2);
 await page.locator('#mode-next').click();
 await expect(button).toBeVisible();
 await button.click();
 await expect.poll(()=>page.evaluate(()=>window.fullscreenInvocations)).toBe(3);
});

test('every pre-game action stays inside the visible landscape viewport without scrolling',async({page})=>{
 for(const vp of [{width:915,height:412},{width:740,height:360},{width:844,height:320}]){
  await page.setViewportSize(vp);
  await page.goto('/');
  const verify=async id=>{
    const loc=page.locator('#'+id);
    await expect(loc).toBeVisible();
    const bounds=await loc.evaluate(el=>{
      const r=el.getBoundingClientRect();
      const viewport=document.getElementById('frame').getBoundingClientRect();
      return {top:r.top,bottom:r.bottom,height:r.height,
        floor:Math.min(window.innerHeight,viewport.bottom),
        hit:el.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))};
    });
    expect(bounds.top,id+' top outside viewport at '+vp.height).toBeGreaterThanOrEqual(0);
    expect(bounds.bottom,id+' hidden below viewport at '+vp.height).toBeLessThanOrEqual(bounds.floor+1);
    expect(bounds.hit,id+' obstructed at '+vp.height).toBe(true);
  };
  await verify('splash-continue');
  await page.locator('#splash-continue').click();
  await verify('mode-back');await verify('mode-next');
  await page.locator('#mode-next').click();
  await verify('options-back');await verify('start');
 }
});

test('new portraits render colourful gradients and detailed facial features',async({page})=>{
 await page.goto('/');
 const portrait=async()=>page.locator('.pilot-avatar').first().evaluate(svg=>({
  defs:svg.querySelectorAll('linearGradient').length,
  whiteEyes:svg.querySelectorAll('ellipse[fill="#f7f0e3"]').length,
  gradient:svg.querySelector('linearGradient stop')?.getAttribute('stop-color'),
  eyeDetail:svg.querySelectorAll('circle[fill="#fff"]').length
 }));
 if(await page.locator('#career-open').isVisible())await page.locator('#career-open').click();
 else await page.locator('#career-open-mobile').click();
 await expect(page.locator('.pilot-avatar')).toHaveCount(3);
 const avatar=await portrait();
 expect(avatar.defs).toBeGreaterThanOrEqual(3);
 expect(avatar.whiteEyes).toBe(2);
 expect(avatar.eyeDetail).toBe(2);
 expect(['#63bac4','#ba7770','#539e8e','#8799c7','#d39a59','#4688b8']).toContain(avatar.gradient);
});

test('Road to Ace has a preflight fullscreen control outside its rerendered panel',async({page})=>{
 await page.addInitScript(()=>{
   window.careerFull=0;
   Element.prototype.requestFullscreen=function(){
     if(this.classList.contains('app'))window.careerFull++;
     return Promise.resolve();
   };
 });
 await page.goto('/');
 if(await page.locator('#career-open').isVisible())await page.locator('#career-open').click();
 else await page.locator('#career-open-mobile').click();
 await expect(page.locator('#career-screen')).toBeVisible();
 await expect(page.locator('#career-fullscreen')).toBeVisible();
 await page.locator('#career-fullscreen').click();
 await expect.poll(()=>page.evaluate(()=>window.careerFull)).toBe(1);
 await page.locator('[data-candidate="0"]').click();
 await expect(page.locator('#career-fullscreen')).toBeVisible();
});

test('cartoon pilots have distinct facial geometry and full-volume hairstyle paths',async({page})=>{
 await page.goto('/');
 if(await page.locator('#career-open').isVisible())await page.locator('#career-open').click();
 else await page.locator('#career-open-mobile').click();
 await expect(page.locator('.pilot-avatar')).toHaveCount(3);
 const shapes=new Map(),styles=new Map();
 for(let round=0;round<20;round++){
  const features=await page.locator('.pilot-avatar').evaluateAll(avatars=>avatars.map(svg=>{
    const face=svg.querySelector('.pilot-face-shape');
    const hair=svg.querySelector('.pilot-hair-style');
    const back=svg.querySelector('.hair-back');
    const front=svg.querySelector('.hair-front');
    return {
      face:face?.getAttribute('data-face-shape'),
      facePath:face?.getAttribute('d'),
      hair:hair?.getAttribute('data-hair-style'),
      hairPath:back?.getAttribute('d'),
      frontPath:front?.getAttribute('d'),
      volume: back&&face ? face.getBBox().y-back.getBBox().y : -1
    };
  }));
  expect(features).toHaveLength(3);
  expect(new Set(features.map(x=>x.face)).size).toBe(3);
  expect(new Set(features.map(x=>x.hair)).size).toBe(3);
  for(const f of features){
    expect(f.facePath?.length).toBeGreaterThan(35);
    expect(f.hairPath?.length).toBeGreaterThan(35);
    expect(f.frontPath?.length).toBeGreaterThan(30);
    expect(f.volume).toBeGreaterThan(7);
    shapes.set(f.face,f.facePath);
    styles.set(f.hair,f.hairPath);
  }
  if(shapes.size===5&&styles.size===6)break;
  await page.getByRole('button',{name:'GENERATE THREE NEW RECRUITS'}).click();
 }
 expect(shapes.size,'five visibly different face silhouettes').toBe(5);
 expect(new Set(shapes.values()).size).toBe(5);
 expect(styles.size,'six distinct raised hairstyles').toBe(6);
 expect(new Set(styles.values()).size).toBe(6);
});

test('older saved pilot portraits without hairstyle still render on licence',async({page})=>{
 await page.goto('/');
 if(await page.locator('#career-open').isVisible())await page.locator('#career-open').click();
 else await page.locator('#career-open-mobile').click();
 await page.locator('[data-candidate="0"]').click();
 await page.evaluate(()=>{
   const key='wingman-road-to-ace-v1';
   const save=JSON.parse(localStorage.getItem(key));
   delete save.profile.style.hairstyle;
   localStorage.setItem(key,JSON.stringify(save));
 });
 await page.reload();
 if(await page.locator('#career-license').isVisible())await page.locator('#career-license').click();
 else {await page.locator('#career-open-mobile').click();await page.locator('[data-action="licence"]').click();}
 const portrait=page.locator('.career-photo .pilot-avatar');
 await expect(portrait).toBeVisible();
 await expect(portrait.locator('.pilot-face-shape')).toHaveCount(1);
 await expect(portrait.locator('.hair-back')).toHaveCount(1);
 await expect(portrait.locator('.hair-front')).toHaveCount(1);
});

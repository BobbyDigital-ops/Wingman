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
 await expect(page.locator('.pilot-avatar')).toHaveCount(20);
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

test('predefined RAF pilots have varied SVG face and hair outlines',async({page})=>{
 await page.goto('/');
 if(await page.locator('#career-open').isVisible())await page.locator('#career-open').click();
 else await page.locator('#career-open-mobile').click();
 await expect(page.locator('[data-candidate]')).toHaveCount(20);
 const distinct=await page.locator('.candidate-portrait .pilot-avatar').evaluateAll(avatars=>({
  face:new Set(avatars.map(a=>a.querySelector('.pilot-face-shape')?.getAttribute('d'))).size,
  hair:new Set(avatars.map(a=>a.querySelector('.pilot-hair-style')?.getAttribute('data-hair-style'))).size
 }));
 expect(distinct.face).toBe(5);expect(distinct.hair).toBe(6);
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

test('saved pilot can reopen selection safely and keep their career on cancel',async({page})=>{
 await page.goto('/');
 if(await page.locator('#career-open').isVisible())await page.locator('#career-open').click();
 else await page.locator('#career-open-mobile').click();
 await page.locator('[data-candidate="0"]').click();
 const original=await page.evaluate(()=>localStorage.getItem('wingman-road-to-ace-v1'));
 await page.getByRole('button',{name:'START A NEW PILOT'}).click();
 await expect(page.locator('[data-candidate]')).toHaveCount(20);
 page.once('dialog',dialog=>dialog.dismiss());
 await page.locator('[data-candidate="1"]').click();
 expect(await page.evaluate(()=>localStorage.getItem('wingman-road-to-ace-v1'))).toBe(original);
 await page.locator('[data-action="licence"]').click();
 await expect(page.getByRole('heading',{name:'PILOT LICENCE'})).toBeVisible();
});

test('rank map has eight three-way branching tiers and an active challenge lane',async({page})=>{
 await page.goto('/');
 if(await page.locator('#career-open').isVisible())await page.locator('#career-open').click();
 else await page.locator('#career-open-mobile').click();
 await page.locator('[data-candidate="0"]').click();
 await page.getByRole('button',{name:'ROAD TO ACE'}).last().click();
 await page.locator('[data-aircraft="fighter"]').click();
 const map=page.locator('.career-route-map');
 await expect(map).toBeVisible();
 await expect(map.locator('.route-tier')).toHaveCount(8);
 await expect(map.locator('.route-node')).toHaveCount(24);
 await expect(map.locator('.route-fork')).toHaveCount(8);
 await expect(map.locator('.route-join')).toHaveCount(8);
 await expect(map.locator('#active-rung [data-choice]')).toHaveCount(3);
 await expect(page.locator('[data-action="character"]')).toBeVisible();
});

test('Wingman 2.0 title and operation cards load illustrated artwork',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 const hero=page.locator('#splash-panel');
 await expect(hero).toBeVisible();
 await expect(hero.locator('.splash-copy')).toBeVisible();
 const artwork=await hero.evaluate(el=>getComputedStyle(el).backgroundImage);
 expect(artwork).toContain('wingman-menu-scene.svg');
 const asset=await page.evaluate(async()=>{
  const r=await fetch('./assets/art/wingman-menu-scene.svg');
  return {status:r.status,type:r.headers.get('content-type'),text:(await r.text()).slice(0,110)};
 });
 expect(asset.status).toBe(200);
 expect(asset.text).toContain('<svg');
 await page.locator('#splash-continue').click();
 await expect(page.locator('#mode-panel')).toBeVisible();
 await expect(page.locator('.mode-choice')).toHaveCount(4);
 for(const card of await page.locator('.mode-choice').all()){
  expect(await card.evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('wingman-menu-scene.svg');
 }
 expect(errors).toEqual([]);
});

test('Wingman 2.0 airframe gallery uses six genuine live aircraft previews',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.locator('#splash-continue').click();
 await page.locator('#mode-next').click();
 await expect(page.locator('#options-panel')).toBeVisible();
 await expect(page.locator('.wm-aircraft-card-canvas')).toHaveCount(6);
 const painted=await page.locator('.wm-aircraft-card-canvas').evaluateAll(els=>els.map(c=>{
  const ctx=c.getContext('2d'),rgba=ctx.getImageData(0,0,c.width,c.height).data;
  let opaque=0;for(let i=3;i<rgba.length;i+=4)if(rgba[i]>0)opaque++;
  return opaque;
 }));
 expect(painted.every(n=>n>250)).toBe(true);
 await page.locator('[data-plane="bf110"]').click();
 await expect(page.locator('#wm-featured-name')).toHaveText('ZERSTÖRER');
 await expect(page.locator('#wm-featured-description')).toContainText('LUFTWAFFE');
 expect(await page.locator('#wm-stat-armour').evaluate(el=>el.style.getPropertyValue('--wm-stat'))).toBe('77%');
 await page.locator('#options-back').click();
 await expect(page.locator('#mode-panel')).toBeVisible();
 expect(errors).toEqual([]);
});

test('Wingman 2 aircraft retain silhouettes while showing six distinct liveries',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(()=>{
  const types=['fighter','heavy','bomber','bf109','bf110','he111'];
  return types.map(type=>{
   const c=document.createElement('canvas');c.width=560;c.height=250;
   const g=c.getContext('2d');
   g.translate(c.width*.5,c.height*.5);g.scale(12,12);
   window.WingmanSprites.draw(g,type,'level');
   const img=g.getImageData(0,0,c.width,c.height);
   const frequency=new Map(),pixels=img.data;let coverage=0;
   let minX=c.width,maxX=0,minY=c.height,maxY=0;
   for(let y=0;y<c.height;y+=2)for(let x=0;x<c.width;x+=2){
    const i=(y*c.width+x)*4,a=pixels[i+3];if(a<120)continue;
    coverage++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);
    minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    const key=[pixels[i]>>4,pixels[i+1]>>4,pixels[i+2]>>4].join('-');
    frequency.set(key,(frequency.get(key)||0)+1);
   }
   return {type,coverage,colourCount:frequency.size,width:maxX-minX,height:maxY-minY,
     palette:window.WingmanSprites.liveries[type]};
  });
 });
 expect(result).toHaveLength(6);
 for(const shape of result){
  expect(shape.coverage).toBeGreaterThan(200);
  expect(shape.colourCount).toBeGreaterThan(20);
  expect(shape.width).toBeGreaterThan(250);
  expect(shape.height).toBeLessThan(180);
  expect(shape.palette.camouflage).toHaveLength(2);
 }
 expect(new Set(result.map(x=>x.palette.camouflage.join('|'))).size).toBe(6);
});

test('German aircraft display recognisable identities with accurate original designations',async({page})=>{
 await page.goto('/');
 await page.locator('#splash-continue').click();
 await page.locator('#mode-next').click();
 for(const [type,title,model] of [
  ['bf109','EMIL','BF 109E'],['bf110','ZERSTÖRER','BF 110'],
  ['he111','HEINKEL','HE 111']
 ]){
  await page.locator('[data-plane="'+type+'"]').click();
  await expect(page.locator('#wm-featured-name')).toHaveText(title);
  await expect(page.locator('#wm-featured-description')).toContainText(model);
 }
});

test('defined pilot character portraits use vector art, not repeated tiny atlas crops',async({page})=>{
 await page.goto('/');
 if(await page.locator('#career-open').isVisible())await page.locator('#career-open').click();
 else await page.locator('#career-open-mobile').click();
 await expect(page.locator('.pilot-avatar')).toHaveCount(20);
 await expect(page.locator('.pilot-avatar .painted-pilot-portrait')).toHaveCount(0);
 const variety=await page.locator('.pilot-avatar').evaluateAll(els=>new Set(els.map(el=>
  (el.querySelector('.pilot-face-shape')?.getAttribute('d')||'')+'|'+
  (el.querySelector('.pilot-hair-style')?.getAttribute('data-hair-style')||'')
 )).size);
 expect(variety).toBeGreaterThanOrEqual(20);
});
test('active rivals use stable defined identities, separate from historic records',async({page})=>{
 await page.goto('/');
 if(await page.locator('#career-open').isVisible())await page.locator('#career-open').click();
 else await page.locator('#career-open-mobile').click();
 await page.locator('[data-candidate="0"]').click();
 await page.locator('[data-action="ladder"]').last().click();
 if(await page.locator('[data-aircraft]').first().isVisible())await page.locator('[data-aircraft]').first().click();
 await expect(page.locator('#active-rung [data-choice]')).toHaveCount(3);
 await expect(page.locator('#active-rung .pilot-face-shape')).toHaveCount(3);
 const names=await page.locator('#active-rung .route-opponent strong').allTextContents();
 expect(new Set(names).size).toBe(3);
});
test('aircraft preview remains crisp transparent original geometry instead of enlarged 86px paintings',async({page})=>{
 await page.goto('/');
 await page.locator('#splash-continue').click();
 await page.locator('#mode-next').click();
 const card=page.locator('[data-aircraft-art="fighter"]');
 await expect(card).toBeVisible();
 const corners=await card.evaluate(c=>{
  const g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height).data;
  return [d[3],d[(c.width-1)*4+3],d[(c.width*(c.height-1))*4+3]];
 });
 expect(corners).toEqual([0,0,0]);
});

test('fixed roster gives persistent predesigned identities without erasing career stats',async({page})=>{
 await page.goto('/');
 if(await page.locator('#career-open').isVisible())await page.locator('#career-open').click();
 else await page.locator('#career-open-mobile').click();
 await expect(page.locator('[data-candidate]')).toHaveCount(20);
 await page.locator('[data-candidate="2"]').click();
 const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('wingman-road-to-ace-v1')));
 expect(original.profile.name).toContain('Chocs');
 await page.locator('[data-action="character"]').first().click();
 await expect(page.locator('[data-roster]')).toHaveCount(20);
 await page.locator('[data-roster="ace-01"]').click();
 const updated=await page.evaluate(()=>JSON.parse(localStorage.getItem('wingman-road-to-ace-v1')));
 expect(updated.profile.name).toContain('Biscuit');
 expect(updated.profile.skill).toBe('reverse');
 expect(updated.profile.attributes.manoeuvrability).toBe(91);
 for(const field of ['wins','losses','kills','best','completed','run']){
  expect(updated[field]).toEqual(original[field]);
 }
});

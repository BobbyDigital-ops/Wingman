const {test,expect}=require('@playwright/test');
async function openSetup(page){
 await page.goto('/');
 await page.locator('#splash-continue').click();
 await page.locator('#mode-next').click();
 await expect(page.locator('#options-panel')).toBeVisible();
}
test('20 German pilots have fixed unique matched gender, painted faces and no duplicate atlas tiles',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const pilots=window.WingmanRoster.filter(p=>p.faction==='Axis');
  const women=[3,5,11,14,16,18];
  const image=new Image();image.src=window.WingmanGermanPortraitAtlas;
  await image.decode();
  const ctx=document.createElement('canvas').getContext('2d');
  ctx.canvas.width=96;ctx.canvas.height=112;
  const fingerprints=[];
  for(let i=0;i<20;i++){
   ctx.clearRect(0,0,96,112);
   ctx.drawImage(image,(i%4)*96,Math.floor(i/4)*112,96,112,0,0,96,112);
   const pixels=ctx.getImageData(0,0,96,112).data;
   let h=2166136261;
   // Sample distributed pixels for an efficiently stable face fingerprint.
   for(let j=0;j<pixels.length;j+=31){h^=pixels[j];h=Math.imul(h,16777619)>>>0;}
   fingerprints.push(h);
  }
  return {pilots:pilots.map((p,i)=>({id:p.id,name:p.name,gender:p.gender,portrait:p.portrait,
   expected:women.includes(i)?'female':'male'})),
   fingerprints,width:image.width,height:image.height};
 });
 expect(result.width).toBe(384);expect(result.height).toBe(560);
 expect(result.pilots).toHaveLength(20);
 expect(new Set(result.pilots.map(p=>p.portrait)).size).toBe(20);
 expect(new Set(result.fingerprints).size).toBe(20);
 for(const pilot of result.pilots)expect(pilot.gender,pilot.name).toBe(pilot.expected);
 expect(result.pilots[3].name).toMatch(/^Erika /);
 expect(result.pilots[5].name).toMatch(/^Hanna /);
 expect(result.pilots[11].name).toMatch(/^Ingrid /);
});
test('all German candidates render distinct artwork rather than repeated images',async({page})=>{
 await page.goto('/');
 if(await page.locator('#career-open').isVisible())await page.locator('#career-open').click();
 else await page.locator('#career-open-mobile').click();
 await page.locator('#career-faction').selectOption('Axis');
 const portraits=page.locator('.candidate-portrait .german-painted');
 await expect(portraits).toHaveCount(20);
 const layout=await portraits.evaluateAll(items=>items.map(s=>{
  const i=s.querySelector('image');
  return {x:i?.getAttribute('x'),y:i?.getAttribute('y'),href:i?.getAttribute('href')?.slice(0,32)};
 }));
 expect(new Set(layout.map(x=>x.x+':'+x.y)).size).toBe(20);
 expect(layout.every(x=>x.href?.startsWith('data:image/webp;base64'))).toBe(true);
});
test('Spitfire skill works with Q, advertises recharging and has a real manoeuvre',async({page})=>{
 await openSetup(page);
 await page.locator('[data-plane="fighter"]').click();
 await page.locator('#start').click();
 await expect(page.locator('#menu')).toHaveClass(/hidden/);
 await page.keyboard.press('q');
 await expect(page.locator('#roll')).toHaveText(/ROLL\s+7s/i);
 await expect(page.locator('#roll')).toHaveClass(/on-cooldown/);
 await expect(page.locator('#roll')).toHaveAttribute('aria-label',/recharging/i);
});
test('selection art uses separate illustrated hangar backgrounds and aircraft names never overlap cards',async({page})=>{
 await openSetup(page);
 expect(await page.evaluate(()=>window.WingmanHangarArt.themes.length)).toBe(6);
 const artwork=await page.locator('canvas.wm-aircraft-card-canvas').evaluateAll(els=>els.map(canvas=>{
  const {width,height}=canvas;const p=canvas.getContext('2d').getImageData(0,0,width,height).data;
  let hash=2166136261;
  for(let i=0;i<p.length;i+=61){hash^=p[i];hash=Math.imul(hash,16777619)>>>0;}
  return {hash,width,height};
 }));
 expect(artwork).toHaveLength(6);
 expect(new Set(artwork.map(a=>a.hash)).size).toBe(6);
 for(const button of await page.locator('.plane-choice').all()){
  const b=button.locator('b');
  const rect=await button.boundingBox(),textRect=await b.boundingBox();
  expect(rect).toBeTruthy();expect(textRect).toBeTruthy();
  expect(textRect.x).toBeGreaterThanOrEqual(rect.x-1);
  expect(textRect.x+textRect.width).toBeLessThanOrEqual(rect.x+rect.width+1);
 }
 await page.locator('[data-plane="bf109"]').click();
 await expect(page.locator('#wm-featured-name')).toHaveText('EMIL');
 const image=await page.locator('#wm-featured-plane').evaluate(canvas=>{
  const rgba=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  return [rgba[0],rgba[1],rgba[2],rgba[3]];
 });
 expect(image[3]).toBe(255);
});

test('on-screen Spitfire SKILL button activates barrel roll by actual mobile touch',async({page,isMobile})=>{
 test.skip(!isMobile,'Touch UI test belongs to mobile landscape');
 await openSetup(page);
 await page.locator('[data-plane="fighter"]').click();
 await page.locator('#start').click();
 const skill=page.locator('#roll');
 await expect(skill).toBeVisible();
 await expect(skill).toHaveText('ROLL');
 await skill.tap();
 await expect(skill).toHaveText(/ROLL\s+7s/);
 await expect(skill).toHaveClass(/on-cooldown/);
});

test('old saved female-name German profile migrates to its fixed male portrait identity',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>{
  const pilot=window.WingmanRoster.find(p=>p.id==='ace-27');
  localStorage.setItem('wingman-road-to-ace-v1',JSON.stringify({
   profile:{name:'Lotte "Schwalbe" Fischer',faction:'Axis',gender:'female',rosterId:pilot.id,
    plane:pilot.plane,skill:pilot.signature,style:{rosterPortrait:pilot.portrait},
    attributes:pilot.attributes,characterConfirmed:true},
   wins:0,losses:0,kills:0,records:{},best:0,completed:0,run:null
  }));
 });
 await page.reload();
 await page.evaluate(()=>window.WingmanCareer.open('licence'));
 await expect(page.locator('.career-licence')).toContainText('Ludwig');
 await page.locator('[data-action="portrait"]').click();
 const updated=await page.evaluate(()=>JSON.parse(localStorage.getItem('wingman-road-to-ace-v1')));
 expect(updated.profile.name).toMatch(/^Ludwig /);
 expect(updated.profile.gender).toBe('male');
});

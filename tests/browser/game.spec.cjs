const { test, expect } = require('@playwright/test');

test('launches and draws the game without uncaught browser exceptions', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'WINGMAN' })).toBeVisible();
  await expect(page.locator('canvas#game')).toBeVisible();
  await expect(page.locator('#aircraft-layer')).toBeAttached();
  await page.waitForTimeout(650);
  const canvas = await page.locator('#game').evaluate(el => ({
    width: el.width, height: el.height,
    hasPixels: !!el.getContext('2d').getImageData(
      Math.floor(el.width / 2), Math.floor(el.height / 2), 1, 1
    ).data[3]
  }));
  expect(canvas.width).toBeGreaterThan(0);
  expect(canvas.height).toBeGreaterThan(0);
  expect(canvas.hasPixels).toBe(true);
  expect(errors).toEqual([]);
});

test('selects aircraft, starts a duel and accepts steering and firing', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  const bf109 = page.locator('[data-plane="bf109"]');
  await bf109.click();
  await expect(bf109).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#start').click();
  await expect(page.locator('#menu')).toHaveClass(/hidden/);
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(180);
  await page.keyboard.up('KeyA');
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
});

test('launches four-plane team combat with class-labelled aircraft', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('[data-plane="bomber"] small')).toContainText('Bomber');
  await expect(page.locator('[data-plane="heavy"] small')).toContainText('Heavy Fighter');
  await page.locator('#pilots-select').selectOption('4');
  await page.locator('#team-select').selectOption('teams');
  await page.locator('#difficulty-select').selectOption('ace');
  await page.locator('#start').click();
  await expect(page.locator('#menu')).toHaveClass(/hidden/);
  await page.waitForTimeout(600);
  expect(errors).toEqual([]);
});

test('reverse manoeuvre and wind boost run without browser errors',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.locator('[data-plane="fighter"]').click();
 await page.locator('#start').click();
 await page.keyboard.down('KeyW');
 await page.keyboard.press('KeyK');
 await page.waitForTimeout(570);
 await page.keyboard.up('KeyW');
 expect(errors).toEqual([]);
});

test('Road to Ace creates a pilot licence and persists it across reloads',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.locator('#career-open').click();
 await expect(page.getByRole('heading',{name:'CHOOSE YOUR PILOT'})).toBeVisible();
 await page.locator('#career-name').fill('Test Squadron');
 await page.locator('#career-faction').selectOption('Axis');
 
 await page.locator('[data-candidate="1"]').click();
 await expect(page.getByText('Test Squadron',{exact:true})).toBeVisible();
 await expect(page.getByText('AXIS · ACTIVE SERVICE')).toBeVisible();
 await page.reload();
 await page.locator('#career-license').click();
 await expect(page.getByText('Test Squadron',{exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});
test('Road to Ace starts and saves a locked-aircraft three-life run',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.locator('#career-open').click();
 await page.locator('#career-name').fill('Flight Leader');
 await page.locator('[data-candidate="0"]').click();
 await page.getByRole('button',{name:'ROAD TO ACE'}).last().click();
 await page.locator('[data-aircraft="fighter"]').click();
 await expect(page.getByText('RANK 1/8')).toBeVisible();
 await expect(page.locator('[data-choice]')).toHaveCount(3);
 await page.locator('[data-choice="0"]').click();
 await expect(page.locator('#career-screen')).toBeHidden();
 await expect(page.locator('#menu')).toHaveClass(/hidden/);
 await page.reload();
 await page.locator('#career-open').click();
 await expect(page.getByText('RANK 1/8')).toBeVisible();
 expect(errors).toEqual([]);
});

test('pilot offers random recruits and retains the chosen flight attributes',async({page})=>{
 await page.goto('/');
 await page.locator('#career-open').click();
 await expect(page.locator('[data-candidate]')).toHaveCount(3);
 const before=await page.locator('.candidate-grid').innerText();
 await page.getByRole('button',{name:'GENERATE THREE NEW RECRUITS'}).click();
 const after=await page.locator('.candidate-grid').innerText();
 expect(after.length).toBeGreaterThan(20);
 await page.locator('#career-name').fill('Sky Captain');
 await page.locator('[data-candidate="0"]').click();
 await expect(page.getByText('MANOEUVRABILITY')).toBeVisible();
 await page.reload();await page.locator('#career-license').click();
 await expect(page.getByText('Sky Captain',{exact:true})).toBeVisible();
});

test('rolled airframe is saved and locked for the run',async({page})=>{await page.goto('/');await page.locator('#career-open').click();await page.locator('[data-candidate="0"]').click();await page.getByRole('button',{name:'ROAD TO ACE'}).last().click();await expect(page.locator('.airframe-card')).toHaveCount(3);await page.locator('[data-aircraft="fighter"]').click();const result=await page.evaluate(()=>JSON.parse(localStorage.getItem('wingman-road-to-ace-v1')).run);expect(result.airframe.type).toBe('fighter');expect(result.airframe.stats.speed).toBeGreaterThan(0);await page.reload();await page.locator('#career-open').click();await expect(page.getByText('RANK 1/8')).toBeVisible();});


test('mobile landscape controls stay onscreen, hold steering and render at increased resolution',async({page})=>{
  await page.goto('/');
  if(!(await page.evaluate(()=>matchMedia('(pointer: coarse)').matches)))return;
  await page.locator('#start').click();
  const dimensions=await page.evaluate(()=>{
    const canvas=document.getElementById('game'),r=canvas.getBoundingClientRect();
    const controls=['left','right','fire','special','roll'].map(id=>{
      const el=document.getElementById(id),b=el.getBoundingClientRect();
      return {id,size:Math.min(b.width,b.height),bottom:b.bottom,left:b.left,right:b.right};
    });
    return {canvasPixels:canvas.width,screenWidth:r.width,screenHeight:innerHeight,controls};
  });
  expect(dimensions.canvasPixels).toBeGreaterThan(dimensions.screenWidth*1.4);
  for(const b of dimensions.controls){
    expect(b.size).toBeGreaterThanOrEqual(60);
    expect(b.bottom).toBeLessThanOrEqual(dimensions.screenHeight+1);
    expect(b.left).toBeGreaterThanOrEqual(0);
    expect(b.right).toBeLessThanOrEqual(dimensions.screenWidth+1);
  }
  const touchResult=await page.evaluate(()=>{
    const btn=document.getElementById('right'),r=btn.getBoundingClientRect();
    const t=new Touch({identifier:35,target:btn,clientX:r.left+r.width/2,clientY:r.top+r.height/2});
    const event=(type,touches)=>btn.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,changedTouches:[t],touches,targetTouches:touches}));
    event('touchstart',[t]);
    return btn.classList.contains('pressed');
  });
  expect(touchResult).toBe(true);
  await page.waitForTimeout(450);
  await expect(page.locator('#right')).toHaveClass(/pressed/);
  await page.evaluate(()=>{
    const btn=document.getElementById('right'),r=btn.getBoundingClientRect();
    const t=new Touch({identifier:35,target:btn,clientX:r.left+r.width/2,clientY:r.top+r.height/2});
    btn.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,changedTouches:[t],touches:[],targetTouches:[]}));
  });
  await expect(page.locator('#right')).not.toHaveClass(/pressed/);
});

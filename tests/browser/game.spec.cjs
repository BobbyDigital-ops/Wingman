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
 await expect(page.getByRole('heading',{name:'CREATE YOUR PILOT'})).toBeVisible();
 await page.locator('#career-name').fill('Test Squadron');
 await page.locator('#career-faction').selectOption('Axis');
 await page.locator('#career-portrait').selectOption('1');
 await page.getByRole('button',{name:'ISSUE PILOT LICENCE'}).click();
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
 await page.getByRole('button',{name:'ISSUE PILOT LICENCE'}).click();
 await page.getByRole('button',{name:'ROAD TO ACE'}).last().click();
 await page.getByRole('button',{name:'Spitfire',exact:true}).click();
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

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

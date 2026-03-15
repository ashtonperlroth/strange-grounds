import { test, expect } from '@playwright/test';

test('landing page loads with map and search', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-testid="location-search"]')).toBeVisible();
});

test('can generate a briefing end-to-end', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="location-search"]').fill('Lake Tahoe');
  await page.getByText(/Lake Tahoe/i).first().click({ timeout: 10_000 });

  const activitySelector = page.locator('[data-testid="activity-selector"]');
  if (await activitySelector.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await activitySelector.click();
    await page.getByText(/Ski Touring/i).click();
  }

  await page.locator('[data-testid="generate-button"]').click();
  const narrative = page.locator('[data-testid="briefing-narrative"]');
  await expect(narrative).toBeVisible({ timeout: 120_000 });
  const text = await narrative.textContent();
  expect(text?.length).toBeGreaterThan(100);
});

test('no error cards visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Error loading/i)).not.toBeVisible({ timeout: 3_000 });
});

test('build passes', async ({}) => {
  const { execSync } = require('child_process');
  execSync('npm run build', { stdio: 'pipe', timeout: 120_000 });
});

// ── Visual regression ───────────────────────────────────────────

test('landing page visual baseline', async ({ page }) => {
  await page.goto('/');
  // Wait for map tiles to load
  await page.waitForTimeout(5_000);
  await expect(page).toHaveScreenshot('landing-page.png', {
    maxDiffPixelRatio: 0.05,
    fullPage: false,
  });
});

test('briefing panel visual baseline', async ({ page }) => {
  const narrative = page.locator('[data-testid="briefing-narrative"]');
  if (await narrative.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await expect(page.locator('[data-testid="briefing-narrative"]')).toHaveScreenshot('briefing-panel.png', {
      maxDiffPixelRatio: 0.03,
    });
  }
});

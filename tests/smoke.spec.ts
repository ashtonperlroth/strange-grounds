import { test, expect } from '@playwright/test';

// ── Core shell ──────────────────────────────────────────────────────────────
// landing page, map, search

test('marketing landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="marketing-landing"]')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[data-testid="hero-cta"]')).toBeVisible();
});

test('app page loads with map and search', async ({ page }) => {
  await page.goto('/app');
  await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="location-search-hero"]')).toBeVisible();
});

// ── Briefing generation ─────────────────────────────────────────────────────
// generate, readiness, condition cards

test('can generate a briefing end-to-end', async ({ page }) => {
  await page.goto('/app');

  // Fill and select location using the hero search (always visible on landing)
  await page.locator('[data-testid="location-search-hero"]').fill('Lake Tahoe');
  await page.getByText(/Lake Tahoe/i).first().click({ timeout: 10_000 });

  const activitySelector = page.locator('[data-testid="activity-selector"]');
  if (await activitySelector.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await activitySelector.click();
    await page.getByText(/Ski Touring/i).click();
  }

  // Generate button should be visible in the TopBar after location is set
  const generateBtn = page.locator('[data-testid="generate-button"]').filter({ visible: true });
  await expect(generateBtn).toBeVisible({ timeout: 5_000 });
  await generateBtn.click();

  // The button must respond to the click (leaves "Generate" state)
  await expect(generateBtn).not.toHaveText('Generate', { timeout: 5_000 });

  // If a full backend is configured (Supabase + Inngest + Anthropic), validate the narrative
  const narrative = page.locator('[data-testid="briefing-narrative"]');
  if (await narrative.waitFor({ state: 'visible', timeout: 90_000 }).then(() => true).catch(() => false)) {
    const text = await narrative.textContent();
    expect(text?.length).toBeGreaterThan(100);
  }
});

// ── Route system ────────────────────────────────────────────────────────────
// route drawing, GPX import, segments (future)

// ── Sharing & export ────────────────────────────────────────────────────────
// share links, PDF export (future)

// ── Sanity checks ───────────────────────────────────────────────────────────

test('no error cards visible', async ({ page }) => {
  await page.goto('/app');
  await expect(page.getByText(/Error loading/i)).not.toBeVisible({ timeout: 3_000 });
});

test('build passes', async ({}) => {
  const { execSync } = require('child_process');
  execSync('npm run build', { stdio: 'pipe', timeout: 120_000 });
});

// ── Visual regression ───────────────────────────────────────────

test('landing page visual baseline', async ({ page }) => {
  await page.goto('/');
  // Wait for page to render
  await page.waitForTimeout(2_000);
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

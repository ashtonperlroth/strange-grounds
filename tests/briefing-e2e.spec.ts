/**
 * End-to-end briefing generation test.
 *
 * This is the ONLY test that verifies the product's core feature actually works:
 * data pipeline → Claude synthesis → narrative displayed in UI.
 *
 * Run separately from the fast smoke tests:
 *   npm run test:e2e
 *
 * Requires a full backend (Supabase + Inngest + Anthropic API key).
 * Takes 30–120 seconds per run. Worth it — catches model string changes,
 * Inngest pipeline breaks, synthesis prompt errors, and Supabase write failures.
 */
import { test, expect } from '@playwright/test';

test('briefing generates successfully end-to-end', async ({ page }) => {
  await page.goto('/app');

  // Search for a well-known location with reliable SNOTEL/NWS data
  const searchInput = page.locator('[data-testid="location-search-hero"]');
  await expect(searchInput).toBeVisible({ timeout: 15_000 });
  await searchInput.fill('Teton Pass');

  // Wait for autocomplete and select the first result
  const firstResult = page.locator('[data-testid="search-result"]').first();
  await expect(firstResult).toBeVisible({ timeout: 10_000 });
  await firstResult.click();

  // Ensure the generate button is ready (location selected)
  const generateButton = page.locator('[data-testid="generate-button"]').filter({ visible: true });
  await expect(generateButton).toBeVisible({ timeout: 5_000 });
  await expect(generateButton).toBeEnabled();
  await generateButton.click();

  // Button should immediately reflect generating state
  await expect(generateButton).not.toHaveText('Generate', { timeout: 5_000 });

  // Wait for the narrative to appear — this is the core assertion
  // 120s covers the full Inngest pipeline: data fetch + route conditions + Claude synthesis
  const narrative = page.locator('[data-testid="briefing-narrative"]');
  await expect(narrative).toBeVisible({ timeout: 120_000 });

  // Verify it's real content, not just a placeholder or empty element
  const narrativeContent = await narrative.textContent();
  expect(narrativeContent?.length).toBeGreaterThan(100);

  // Verify the pipeline is no longer stuck in intermediate states
  await expect(page.locator('text="Analyzing route segments"')).not.toBeVisible();
  await expect(page.locator('text="Generating briefing narrative"')).not.toBeVisible();
});

test('briefing generates for a second location (not location-specific)', async ({ page }) => {
  await page.goto('/app');

  const searchInput = page.locator('[data-testid="location-search-hero"]');
  await expect(searchInput).toBeVisible({ timeout: 15_000 });
  await searchInput.fill('Mount Rainier');

  const firstResult = page.locator('[data-testid="search-result"]').first();
  await expect(firstResult).toBeVisible({ timeout: 10_000 });
  await firstResult.click();

  const generateButton = page.locator('[data-testid="generate-button"]').filter({ visible: true });
  await expect(generateButton).toBeEnabled({ timeout: 5_000 });
  await generateButton.click();

  const narrative = page.locator('[data-testid="briefing-narrative"]');
  await expect(narrative).toBeVisible({ timeout: 120_000 });

  const narrativeContent = await narrative.textContent();
  expect(narrativeContent?.length).toBeGreaterThan(100);
});

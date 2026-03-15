/**
 * Debug Network Spec
 *
 * This is NOT a regression test — it's an observability tool for debugging
 * production API failures. Run with:
 *
 *   PLAYWRIGHT_BASE_URL=https://strange-grounds.vercel.app npx playwright test tests/debug-network.spec.ts
 *
 * It navigates to /app, monitors network traffic during briefing generation,
 * and reports all failed API requests (4xx/5xx) and timeouts.
 */
import { test, expect } from '@playwright/test';

interface FailedRequest {
  url: string;
  status: number;
  method: string;
  responseBody?: string;
}

test('network diagnostic — capture failed API requests during briefing', async ({ page }) => {
  const failedRequests: FailedRequest[] = [];
  const apiRequests: { url: string; status: number; method: string }[] = [];

  // Monitor all responses
  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();
    const method = response.request().method();

    // Only track API requests
    if (url.includes('/api/') || url.includes('trpc') || url.includes('inngest') || url.includes('supabase')) {
      apiRequests.push({ url, status, method });

      if (status >= 400) {
        let responseBody: string | undefined;
        try {
          responseBody = await response.text();
        } catch {
          responseBody = '(could not read response body)';
        }
        failedRequests.push({ url, status, method, responseBody });
      }
    }
  });

  // Navigate to /app
  await page.goto('/app');
  await page.waitForLoadState('networkidle');

  // Fill in a location
  const searchInput = page.locator('[data-testid="location-search-hero"]');
  if (await searchInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await searchInput.fill('Lake Tahoe');
    const suggestion = page.getByText(/Lake Tahoe/i).first();
    if (await suggestion.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await suggestion.click();
    }
  }

  // Click Generate if visible
  const generateBtn = page.locator('[data-testid="generate-button"]').filter({ visible: true });
  if (await generateBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await generateBtn.click();

    // Wait up to 30 seconds for API activity
    await page.waitForTimeout(30_000);
  }

  // Print diagnostic report
  console.log('\n=== NETWORK DIAGNOSTIC REPORT ===');
  console.log(`Total API requests captured: ${apiRequests.length}`);
  console.log(`Failed requests (4xx/5xx): ${failedRequests.length}`);

  if (apiRequests.length > 0) {
    console.log('\nAll API requests:');
    for (const req of apiRequests) {
      const statusLabel = req.status >= 400 ? `❌ ${req.status}` : `✓ ${req.status}`;
      console.log(`  ${statusLabel} ${req.method} ${req.url}`);
    }
  }

  if (failedRequests.length > 0) {
    console.log('\n❌ Failed requests:');
    for (const req of failedRequests) {
      console.log(`\n  URL: ${req.url}`);
      console.log(`  Status: ${req.status}`);
      console.log(`  Method: ${req.method}`);
      if (req.responseBody) {
        console.log(`  Response: ${req.responseBody.slice(0, 500)}`);
      }
    }
  } else {
    console.log('\n✓ No failed API requests detected');
  }

  console.log('\n=================================\n');

  // Fail the test if there are server errors (5xx), which are always bugs
  const serverErrors = failedRequests.filter(r => r.status >= 500);
  if (serverErrors.length > 0) {
    expect.soft(serverErrors.length, `Found ${serverErrors.length} server error(s):\n${
      serverErrors.map(r => `  ${r.status} ${r.url}\n  ${r.responseBody?.slice(0, 200)}`).join('\n')
    }`).toBe(0);
  }

  // Always pass for 4xx (auth, not-found) — those may be expected
  // The diagnostic output is the value
  expect(true).toBe(true);
});

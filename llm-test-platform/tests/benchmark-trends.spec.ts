import { test, expect } from '@playwright/test';

test.describe('Performance Trend Charts', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the large benchmarks API call to ensure we have enough data to test the "more than 12" fix
    await page.route('**/api/benchmarks*', async route => {
      const url = route.request().url();
      console.log('Intercepted:', url);

      // Only mock if size=1000
      if (url.includes('size=1000')) {
        const benchmarks = Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          unique_id: `bench-${i + 1}`,
          config: {
            modelName: `Model-${i + 1}`,
            serverName: 'Server-A',
            chipName: 'Chip-X',
            framework: 'MindIE',
            frameworkVersion: '1.0.0',
            testDate: '2023-01-01',
            shardingConfig: 'tp=1',
          },
          metrics: [
            {
              concurrency: 10,
              inputLength: 1024,
              outputLength: 1024,
              ttft: 100,
              tpot: 50,
              tokensPerSecond: 20,
            }
          ]
        }));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: benchmarks,
            total: 20,
            page: 1,
            size: 1000,
            pages: 1
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
  });

  test('TC-TRENDS-001: Trend charts tab is accessible', async ({ page }) => {
    const tabTrigger = page.locator('button[role="tab"]:has-text("性能趋势图")');
    await expect(tabTrigger).toBeVisible();
    await tabTrigger.click();
    
    await expect(page.locator('text=选择性能版本进行对比')).toBeVisible();
  });

  test('TC-TRENDS-002: Displays all benchmarks without truncation', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("性能趋势图")');
    
    // We mocked 20 items, so we expect to find 20 checkboxes or labels
    // The previous bug limited this to 12
    const items = page.locator('div.border.rounded-lg.hover\\:bg-muted\\/30');
    console.log('Count:', await items.count());
    if (await items.count() > 0) {
        console.log('First item text:', await items.first().textContent());
    }
    await expect(items).toHaveCount(20);
  });

  test('TC-TRENDS-003: Search filter works in trend view', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("性能趋势图")');
    
    const searchInput = page.locator('input[placeholder*="搜索：编号"]');
    await searchInput.fill('Model-15');
    
    // Should show Model-15 and hide others
    const items = page.locator('div.border.rounded-lg.hover\\:bg-muted\\/30');
    await expect(items).toHaveCount(1);
    await expect(page.locator('text=Model-15')).toBeVisible();
  });

  test('TC-TRENDS-004: Select benchmarks and generate charts', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("性能趋势图")');
    
    // Select first two benchmarks
    await page.locator('label[for="version-1"]').click();
    await page.locator('label[for="version-2"]').click();
    
    // Select context length (mocked data has 1024/1024)
    // The component might auto-select if there's only one, but let's be sure
    // We wait for the select to be populated.
    // The select trigger might already have the value if it auto-selected.
    
    // Click "Performance Chart" button (text might vary, check component)
    // Button text is "性能对比图" (line 448 in MultiVersionTrendCharts.tsx)
    const chartButton = page.locator('button:has-text("性能对比图")');
    await expect(chartButton).toBeEnabled(); // Should be enabled after selecting 2
    await chartButton.click();
    
    // Verify charts appear
    await expect(page.locator('text=TTFT性能对比')).toBeVisible();
    await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
  });

  test('TC-TRENDS-005: Limit selection to 10 items', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("性能趋势图")');
    
    // Select 10 items
    for (let i = 1; i <= 10; i++) {
        await page.locator(`label[for="version-${i}"]`).click();
    }
    
    // Try to select 11th
    const checkbox11 = page.locator(`button[id="version-11"]`); // Checkbox is actually a button in shadcn sometimes, or input type=checkbox
    // Wait, in the component it's <Checkbox id="..."> which renders a button usually or input.
    // The test logic used `label[for=...]` click which toggles it.
    
    // Let's check the disabled state of the 11th checkbox
    const checkbox11Input = page.locator(`#version-11`);
    await expect(checkbox11Input).toBeDisabled();
    
    // Also check for the warning message
    await expect(page.locator('text=最多只能选择 10 个性能版本')).toBeVisible();
  });
});

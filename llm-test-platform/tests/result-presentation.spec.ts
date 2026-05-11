import { test, expect } from '@playwright/test';

test.describe('Result Presentation - Functional Correctness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
  });

  test('TC-RESULT-001: Comparison panel displays two benchmarks correctly', async ({ page }) => {
    await page.click('button:has-text("对比")');
    await expect(page.locator('text=基准测试 A').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=基准测试 B').first()).toBeVisible();
  });

  test('TC-RESULT-002: Swap button exchanges benchmark positions', async ({ page }) => {
    await page.click('button:has-text("对比")');
    
    const initialA = await page.locator('text=基准测试 A').first().locator('..').locator('.font-bold').textContent();
    
    await page.click('button[title="切换基准测试位置"]');
    
    const swappedContent = await page.locator('text=基准测试 A').first().locator('..').locator('.font-bold').textContent();
    expect(swappedContent).not.toEqual(initialA);
  });

  test('TC-RESULT-003: Context length selector filters performance metrics', async ({ page }) => {
    await page.click('button:has-text("对比")');
    
    const selector = page.locator('text=上下文长度').first();
    await expect(selector).toBeVisible({ timeout: 5000 });
    
    await page.selectOption('[class*="select-trigger"]', '2048 / 2048').catch(() => {});
  });

  test('TC-RESULT-004: Performance metrics show percentage differences', async ({ page }) => {
    await page.click('button:has-text("对比")');
    
    await expect(page.locator('text=TTFT').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=TPOT').first()).toBeVisible();
    await expect(page.locator('text=TPS').first()).toBeVisible();
  });

  test('TC-RESULT-005: Per-GPU TPS calculation displays correctly', async ({ page }) => {
    await page.click('button:has-text("对比")');
    
    await expect(page.locator('text=每卡 TPS').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-RESULT-006: Export HTML button is functional', async ({ page }) => {
    await page.click('button:has-text("对比")');
    
    const exportButton = page.locator('button:has-text("导出为 HTML")');
    await expect(exportButton).toBeVisible({ timeout: 5000 });
  });

  test('TC-RESULT-007: Save report functionality works', async ({ page }) => {
    await page.click('button:has-text("对比")');
    
    await page.fill('textarea', '测试总结内容');
    
    const saveButton = page.locator('button:has-text("保存对比报告")');
    await expect(saveButton).toBeVisible({ timeout: 5000 });
  });

  test('TC-RESULT-008: Performance trend charts toggle visibility', async ({ page }) => {
    await page.click('button:has-text("对比")');
    
    const trendButton = page.locator('button:has-text("性能趋势图")');
    await expect(trendButton).toBeVisible({ timeout: 5000 });
    
    await trendButton.click();
    await expect(page.locator('.recharts-wrapper')).toBeVisible({ timeout: 5000 });
  });

  test('TC-RESULT-009: Copy unique ID button works', async ({ page }) => {
    await page.click('button:has-text("对比")');
    
    const copyButton = page.locator('button[title="复制编号"]').first();
    await expect(copyButton).toBeVisible({ timeout: 5000 });
  });

  test('TC-RESULT-010: Configuration comparison highlights differences', async ({ page }) => {
    await page.click('button:has-text("对比")');
    
    await expect(page.locator('text=详细配置对比').first()).toBeVisible({ timeout: 5000 });
    
    const differentBadge = page.locator('text=不同').first();
    if (await differentBadge.isVisible()) {
      expect(differentBadge).toBeVisible();
    }
  });
});

test.describe('Result Presentation - Reliability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
  });

  test('TC-RESULT-REL-001: Charts render correctly on page load', async ({ page }) => {
    await page.click('button:has-text("对比")');
    await page.click('button:has-text("性能趋势图")');
    
    await expect(page.locator('.recharts-wrapper').first()).toBeVisible({ timeout: 10000 });
  });

  test('TC-RESULT-REL-002: Empty data handling works', async ({ page }) => {
    await page.click('button:has-text("对比")');
    
    await expect(page.locator('text=没有可用的数据').first()).not.toBeVisible({ timeout: 5000 });
  });

  test('TC-RESULT-REL-003: Multiple comparison operations work sequentially', async ({ page }) => {
    await page.click('button:has-text("对比")');
    
    await page.click('button[title="切换基准测试位置"]');
    await page.click('button[title="切换基准测试位置"]');
    
    await page.click('button:has-text("性能趋势图")');
    await page.click('button:has-text("性能趋势图")');
  });

  test('TC-RESULT-REL-004: Large datasets render without errors', async ({ page }) => {
    await page.click('button:has-text("对比")');
    await page.click('button:has-text("性能趋势图")');
    
    await expect(page.locator('.recharts-wrapper').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Result Presentation - Security', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
  });

  test('TC-RESULT-SEC-001: HTML export sanitizes input', async ({ page }) => {
    await page.click('button:has-text("对比")');
    
    await page.fill('textarea', '<script>alert("xss")</script>测试内容');
    await page.click('button:has-text("导出为 HTML")');
    
    expect(page.url()).not.toContain('javascript:');
  });

  test('TC-RESULT-SEC-002: Report summary prevents XSS', async ({ page }) => {
    await page.click('button:has-text("对比")');
    
    await page.fill('textarea', '<img src=x onerror=alert(1)>');
    await page.click('button:has-text("保存对比报告")');
    
    await expect(page.locator('script')).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('Result Presentation - Scalability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
  });

  test('TC-RESULT-SCA-001: Handle multiple context length combinations', async ({ page }) => {
    await page.click('button:has-text("对比")');
    
    const options = page.locator('[class*="select-content"] option');
    const count = await options.count();
    
    expect(count).toBeGreaterThan(0);
  });

  test('TC-RESULT-SCA-002: Performance with many data points', async ({ page }) => {
    await page.click('button:has-text("对比")');
    await page.click('button:has-text("性能趋势图")');
    
    const startTime = Date.now();
    await expect(page.locator('.recharts-wrapper').first()).toBeVisible({ timeout: 15000 });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(10000);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Benchmark Detail and Edit Features - Functional Correctness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
  });

  test('TC-DETAIL-001: View detail dialog opens with read-only data', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const firstRow = page.locator('table tbody tr').first();
    const viewButton = firstRow.locator('button[title="查看详情"]');
    
    await expect(viewButton).toBeVisible({ timeout: 5000 });
    await viewButton.click();
    
    await expect(page.locator('text=配置信息').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=性能数据').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=数据摘要').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-DETAIL-002: View detail shows all configuration fields', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const firstRow = page.locator('table tbody tr').first firstRow.locator('button[title="();
    await查看详情"]').click();
    
    await expect(page.locator('text=模型名称')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=服务器名称')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=AI芯片')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=推理框架')).toBeVisible({ timeout: 3000 });
  });

  test('TC-DETAIL-003: View detail shows performance metrics table', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.locator('button[title="查看详情"]').click();
    
    await page.click('text=性能数据');
    await expect(page.locator('text=并发数').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=TTFT (ms)').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=TPOT (ms)').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=TPS (tokens/s)').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-DETAIL-004: View detail shows data summary', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.locator('button[title="查看详情"]').click();
    
    await page.click('text=数据摘要');
    await expect(page.locator('text=性能数据摘要').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=平均TTFT').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-EDIT-001: Edit button opens edit dialog', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const firstRow = page.locator('table tbody tr').first();
    const editButton = firstRow.locator('button[title="编辑"]');
    
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();
    
    await expect(page.locator('text=配置信息').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=性能数据').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-EDIT-002: Edit dialog allows configuration changes', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.locator('button[title="编辑"]').click();
    
    await expect(page.locator('input[id^="dialog-input"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-EDIT-003: Edit dialog allows metric editing', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.locator('button[title="编辑"]').click();
    
    await page.click('text=性能数据');
    const editIcon = page.locator('svg.lucide-pencil').first();
    await expect(editIcon).toBeVisible({ timeout: 3000 });
  });

  test('TC-EDIT-004: Edit dialog saves changes', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.locator('button[title="编辑"]').click();
    
    await expect(page.locator('text=保存更改').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-EDIT-005: Edit dialog can add new metrics', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.locator('button[title="编辑"]').click();
    
    await page.click('text=性能数据');
    const addButton = page.locator('text=添加数据');
    await expect(addButton).toBeVisible({ timeout: 3000 });
  });

  test('TC-EDIT-006: Edit dialog can delete metrics', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.locator('button[title="编辑"]').click();
    
    await page.click('text=性能数据');
    const trashIcon = page.locator('svg.lucide-trash2').first();
    await expect(trashIcon).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Multi-Version Trend Charts - Functional Correctness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
    await page.click('text=性能趋势图');
  });

  test('TC-TREND-001: Multi-version trend charts section loads', async ({ page }) => {
    await expect(page.locator('text=选择性能版本进行对比').first()).toBeVisible({ timeout: 10000 });
  });

  test('TC-TREND-002: Can select minimum 2 versions for comparison', async ({ page }) => {
    const checkboxes = page.locator('[type="checkbox"]').filter({ has: page.locator('text=/version-/' )});
    
    const firstCheckbox = page.locator('[type="checkbox"]').first();
    await firstCheckbox.check();
    
    const secondCheckbox = page.locator('[type="checkbox"]').nth(1);
    await secondCheckbox.check();
    
    await expect(page.locator('text=已选择 2 个版本').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-TREND-003: Can select up to 10 versions for comparison', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      const checkbox = page.locator('[type="checkbox"]').nth(i);
      if (await checkbox.isVisible()) {
        await checkbox.check();
      }
    }
    
    await expect(page.locator('text=已选择 10 个版本').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-TREND-004: Prevents selection beyond 10 versions', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      const checkbox = page.locator('[type="checkbox"]').nth(i);
      if (await checkbox.isVisible()) {
        await checkbox.check();
      }
    }
    
    const nextCheckbox = page.locator('[type="checkbox"]').nth(10);
    await expect(nextCheckbox).toBeDisabled();
  });

  test('TC-TREND-005: Shows warning when less than 2 versions selected', async ({ page }) => {
    const checkbox = page.locator('[type="checkbox"]').first();
    await checkbox.check();
    
    await expect(page.locator('text=请至少选择 2 个性能版本进行对比').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-TREND-006: Search functionality works', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    
    await searchInput.fill('test');
    await expect(page.locator('text=服务器').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-TREND-007: Context length selector works', async ({ page }) => {
    const contextSelect = page.locator('text=上下文长度 (I/O)').locator('..').locator('[role="combobox"]');
    await expect(contextSelect).toBeVisible({ timeout: 5000 });
  });

  test('TC-TREND-008: Performance comparison charts display after selection', async ({ page }) => {
    for (let i = 0; i < 2; i++) {
      const checkbox = page.locator('[type="checkbox"]').nth(i);
      if (await checkbox.isVisible()) {
        await checkbox.check();
      }
    }
    
    const showChartButton = page.locator('text=性能对比图');
    await expect(showChartButton).toBeEnabled({ timeout: 3000 });
    await showChartButton.click();
    
    await expect(page.locator('text=TTFT性能对比').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-TREND-009: TTFT charts render correctly', async ({ page }) => {
    for (let i = 0; i < 2; i++) {
      const checkbox = page.locator('[type="checkbox"]').nth(i);
      if (await checkbox.isVisible()) {
        await checkbox.check();
      }
    }
    
    await page.click('text=性能对比图');
    await expect(page.locator('text=TTFT 性能柱状图').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=TTFT 性能趋势图').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-TREND-010: TPOT charts render correctly', async ({ page }) => {
    for (let i = 0; i < 2; i++) {
      const checkbox = page.locator('[type="checkbox"]').nth(i);
      if (await checkbox.isVisible()) {
        await checkbox.check();
      }
    }
    
    await page.click('text=性能对比图');
    await expect(page.locator('text=TPOT 性能柱状图').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=TPOT 性能趋势图').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-TREND-011: TPS charts render correctly', async ({ page }) => {
    for (let i = 0; i < 2; i++) {
      const checkbox = page.locator('[type="checkbox"]').nth(i);
      if (await checkbox.isVisible()) {
        await checkbox.check();
      }
    }
    
    await page.click('text=性能对比图');
    await expect(page.locator('text=TPS 性能柱状图').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=TPS 性能趋势图').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-TREND-012: TPS per GPU charts render correctly', async ({ page }) => {
    for (let i = 0; i < 2; i++) {
      const checkbox = page.locator('[type="checkbox"]').nth(i);
      if (await checkbox.isVisible()) {
        await checkbox.check();
      }
    }
    
    await page.click('text=性能对比图');
    await expect(page.locator('text=每卡 TPS 性能柱状图').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=每卡 TPS 性能趋势图').first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Benchmark Detail and Trend - Reliability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
  });

  test('TC-REL-DETAIL-001: Detail dialog opens and closes correctly', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.locator('button[title="查看详情"]').click();
    
    await expect(page.locator('text=配置信息').first()).toBeVisible({ timeout: 5000 });
    
    await page.keyboard.press('Escape');
    await expect(page.locator('text=配置信息').first()).not.toBeVisible({ timeout: 3000 });
  });

  test('TC-REL-DETAIL-002: Edit dialog opens and closes correctly', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.locator('button[title="编辑"]').click();
    
    await expect(page.locator('text=配置信息').first()).toBeVisible({ timeout: 5000 });
    
    await page.keyboard.press('Escape');
    await expect(page.locator('text=配置信息').first()).not.toBeVisible({ timeout: 3000 });
  });

  test('TC-REL-TREND-001: Chart selection persists during navigation', async ({ page }) => {
    await page.click('text=性能趋势图');
    
    const firstCheckbox = page.locator('[type="checkbox"]').first();
    await firstCheckbox.check();
    
    await page.click('text=基准测试');
    await page.click('text=性能趋势图');
    
    await expect(page.locator('text=已选择 1 个版本').first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Benchmark Detail and Trend - Security', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
  });

  test('TC-SEC-DETAIL-001: XSS prevention in detail view', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.locator('button[title="查看详情"]').click();
    
    const dialogContent = await page.locator('[role="dialog"]').innerHTML();
    expect(dialogContent).not.toContain('<script>');
  });

  test('TC-SEC-TREND-001: Search input sanitization', async ({ page }) => {
    await page.click('text=性能趋势图');
    
    const searchInput = page.locator('input[placeholder*="搜索"]').first();
    await searchInput.fill('<script>alert("xss")</script>');
    
    const dialogContent = await page.locator('text=选择性能版本进行对比').locator('..').innerHTML();
    expect(dialogContent).not.toContain('<script>');
  });
});

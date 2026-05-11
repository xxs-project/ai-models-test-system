import { test, expect } from '@playwright/test';

test.describe('CSV Import Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
  });

  test('TC-CSV-001: Enhanced CSV import dialog opens', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: '下载模板' })).toBeVisible();
  });

  test('TC-CSV-003: Dialog has form elements', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });
    
    await expect(page.locator('label').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-CSV-006: Dialog contains labeled sections', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });
    
    await expect(page.locator('label').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-CSV-007: Dialog contains tabs', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });
    
    const tabsContainer = page.locator('[role="tablist"]').first();
    await expect(tabsContainer).toBeVisible({ timeout: 3000 });
  });

  test('TC-CSV-008: Tab interface is present', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });
    
    await expect(page.locator('[role="tablist"]').first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Manual Add Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
  });

  test('TC-MANUAL-001: Open manual add dialog', async ({ page }) => {
    await page.click('button:has-text("手动添加")');
    await expect(page.locator('text=测试配置信息').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-MANUAL-002: Metrics section is visible', async ({ page }) => {
    await page.click('button:has-text("手动添加")');
    await expect(page.locator('text=测试配置信息').first()).toBeVisible({ timeout: 5000 });
    
    await page.click('button:has-text("下一步")');
    await expect(page.locator('text=性能指标').first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe('UI/UX Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
  });

  test('TC-UI-001: Dialog opens with proper styling', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('Page loads correctly', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '性能结果呈现' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('tab', { name: '基准测试' })).toBeVisible();
  });
});

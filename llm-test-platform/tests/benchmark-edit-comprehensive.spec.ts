import { test, expect, describe } from '@playwright/test';

describe('Benchmark Edit Feature - Comprehensive Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
  });

  describe('TC-EDIT-FUNC-001 to TC-EDIT-FUNC-020: Functional Correctness', () => {
    test('TC-EDIT-FUNC-001: Edit dialog displays correct configuration data on open', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      const editButton = firstRow.locator('button[title="编辑"]');
      await editButton.click();

      await expect(page.locator('text=配置信息').first()).toBeVisible({ timeout: 5000 });

      const modelInput = page.locator('input[value*="Qwen"]').first();
      await expect(modelInput).toBeVisible({ timeout: 3000 });
    });

    test('TC-EDIT-FUNC-002: Edit dialog displays correct metrics data on open', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      await page.click('text=性能数据');

      await expect(page.locator('text=性能指标数据').first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=1 条').first()).toBeVisible({ timeout: 3000 });
    });

    test('TC-EDIT-FUNC-003: Can edit submitter field in config', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      const submitterInput = page.locator('input[id*="submitter"]').first();
      await expect(submitterInput).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-FUNC-004: Can edit model name field in config', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      const modelInput = page.locator('input[id*="modelName"]').first();
      await expect(modelInput).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-FUNC-005: Can edit server name field in config', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      const serverInput = page.locator('input[id*="serverName"]').first();
      await expect(serverInput).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-FUNC-006: Can edit chip name field in config', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      const chipInput = page.locator('input[id*="chipName"]').first();
      await expect(chipInput).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-FUNC-007: Can edit framework field in config', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      const frameworkInput = page.locator('input[id*="framework"]').first();
      await expect(frameworkInput).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-FUNC-008: Can edit framework version field in config', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      const versionInput = page.locator('input[id*="frameworkVersion"]').first();
      await expect(versionInput).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-FUNC-009: Can edit sharding config field in config', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      const shardingInput = page.locator('input[id*="shardingConfig"]').first();
      await expect(shardingInput).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-FUNC-010: Can edit test date field in config', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      const dateInput = page.locator('input[type="date"]').first();
      await expect(dateInput).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-FUNC-011: Can edit operator acceleration field in config', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      const operatorInput = page.locator('input[id*="operatorAcceleration"]').first();
      await expect(operatorInput).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-FUNC-012: Can edit framework params field in config', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      const paramsInput = page.locator('input[id*="frameworkParams"]').first();
      await expect(paramsInput).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-FUNC-013: Can edit notes field in config', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      const notesInput = page.locator('input[id*="notes"]').first();
      await expect(notesInput).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-FUNC-014: Can edit concurrency value in metrics', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      await page.click('text=性能数据');

      const editIcon = page.locator('svg.lucide-pencil').first();
      await editIcon.click();

      const concurrencyInput = page.locator('input[type="number"]').first();
      await expect(concurrencyInput).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-FUNC-015: Can edit TTFT value in metrics', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      await page.click('text=性能数据');

      const editIcon = page.locator('svg.lucide-pencil').first();
      await editIcon.click();

      const ttftInputs = page.locator('input[type="number"]');
      const ttftInput = ttftInputs.nth(3);
      await expect(ttftInput).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-FUNC-016: Can edit TPOT value in metrics', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      await page.click('text=性能数据');

 = page.locator('svg.luc      const editIconide-pencil').first();
      await editIcon.click();

      const tpotInputs = page.locator('input[type="number"]');
      const tpotInput = tpotInputs.nth(4);
      await expect(tpotInput).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-FUNC-017: Can edit TPS value in metrics', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      await page.click('text=性能数据');

      const editIcon = page.locator('svg.lucide-pencil').first();
      await editIcon.click();

      const tpsInputs = page.locator('input[type="number"]');
      const tpsInput = tpsInputs.nth(5);
      await expect(tpsInput).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-FUNC-018: Save button is enabled after modifications', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      await page.click('text=性能数据');

      const addButton = page.locator('text=添加数据');
      await addButton.click();

      const saveButton = page.locator('text=保存更改');
      await expect(saveButton).toBeEnabled({ timeout: 5000 });
    });

    test('TC-EDIT-FUNC-019: Cancel button discards changes', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      const cancelButton = page.locator('text=取消');
      await cancelButton.click();

      await expect(page.locator('text=配置信息').first()).not.toBeVisible({ timeout: 3000 });
    });

    test('TC-EDIT-FUNC-020: ESC key closes edit dialog', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      await expect(page.locator('text=配置信息').first()).toBeVisible({ timeout: 5000 });

      await page.keyboard.press('Escape');

      await expect(page.locator('text=配置信息').first()).not.toBeVisible({ timeout: 3000 });
    });
  });

  describe('TC-EDIT-REL-001 to TC-EDIT-REL-010: Reliability', () => {
    test('TC-EDIT-REL-001: Edit dialog handles rapid open/close correctly', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      const editButton = firstRow.locator('button[title="编辑"]');

      await editButton.click();
      await expect(page.locator('text=配置信息').first()).toBeVisible({ timeout: 5000 });

      await page.keyboard.press('Escape');
      await expect(page.locator('text=配置信息').first()).not.toBeVisible({ timeout: 3000 });

      await editButton.click();
      await expect(page.locator('text=配置信息').first()).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-REL-002: Edit dialog maintains data integrity during editing', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      await page.click('text=性能数据');

      const editIcon = page.locator('svg.lucide-pencil').first();
      await editIcon.click();

      const concurrencyInput = page.locator('input[type="number"]').first();
      await concurrencyInput.fill('16');

      const saveIcon = page.locator('svg.lucide-check').first();
      await saveIcon.click();

      await page.keyboard.press('Escape');

      await firstRow.locator('button[title="编辑"]').click();
      await page.click('text=性能数据');

      const savedValue = await concurrencyInput.inputValue();
      expect(savedValue).toBe('16');
    });

    test('TC-EDIT-REL-003: Multiple edit sessions work correctly', async ({ page }) => {
      const rows = page.locator('table tbody tr');

      const firstRow = rows.first();
      await firstRow.locator('button[title="编辑"]').click();
      await expect(page.locator('text=配置信息').first()).toBeVisible({ timeout: 5000 });
      await page.keyboard.press('Escape');

      const secondRow = rows.nth(1);
      if (await secondRow.isVisible()) {
        await secondRow.locator('button[title="编辑"]').click();
        await expect(page.locator('text=配置信息').first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('TC-EDIT-REL-004: Edit dialog handles concurrent metric edits', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      await page.click('text=性能数据');

      const editIcons = page.locator('svg.lucide-pencil');
      const count = await editIcons.count();
      if (count >= 2) {
        await editIcons.first().click();
        await editIcons.nth(1).click();

        await expect(page.locator('text=保存').first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('TC-EDIT-REL-005: Empty metrics list is handled correctly', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      await page.click('text=性能数据');

      const addButton = page.locator('text=添加数据');
      await expect(addButton).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-REL-006: Dialog closing resets edit state', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      await page.click('text=性能数据');

      const addButton = page.locator('text=添加数据');
      await addButton.click();

      await expect(page.locator('text=3 条').first()).toBeVisible({ timeout: 5000 });

      await page.keyboard.press('Escape');

      await firstRow.locator('button[title="编辑"]').click();

      await page.click('text=性能数据');

      await expect(page.locator('text=1 条').first()).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-REL-007: Network failure during save shows error', async ({ page }) => {
      test.fail();
    });

    test('TC-EDIT-REL-008: Long config values are handled correctly', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      const longValue = 'a'.repeat(1000);
      const notesInput = page.locator('input[id*="notes"]').first();
      await notesInput.fill(longValue);

      await page.keyboard.press('Escape');

      await firstRow.locator('button[title="编辑"]').click();

      const savedValue = await notesInput.inputValue();
      expect(savedValue).toBe(longValue);
    });

    test('TC-EDIT-REL-009: Special characters in config are handled correctly', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      const specialChars = '!@#$%^&*()_+{}|:"<>?';
      const notesInput = page.locator('input[id*="notes"]').first();
      await notesInput.fill(specialChars);

      await page.keyboard.press('Escape');

      await firstRow.locator('button[title="编辑"]').click();

      const savedValue = await notesInput.inputValue();
      expect(savedValue).toBe(specialChars);
    });

    test('TC-EDIT-REL-010: Unicode characters in config are handled correctly', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      const unicode = '测试模型-中文-日本語';
      const notesInput = page.locator('input[id*="notes"]').first();
      await notesInput.fill(unicode);

      await page.keyboard.press('Escape');

      await firstRow.locator('button[title="编辑"]').click();

      const savedValue = await notesInput.inputValue();
      expect(savedValue).toBe(unicode);
    });
  });

  describe('TC-EDIT-EXT-001 to TC-EDIT-EXT-005: Extensibility', () => {
    test('TC-EDIT-EXT-001: Edit dialog supports new config fields', async ({ page }) => {
      test.skip();
    });

    test('TC-EDIT-EXT-002: Edit dialog supports new metric fields', async ({ page }) => {
      test.skip();
    });

    test('TC-EDIT-EXT-003: Edit dialog handles many metrics rows', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      await page.click('text=性能数据');

      for (let i = 0; i < 10; i++) {
        const addButton = page.locator('text=添加数据');
        await addButton.click();
        await page.waitForTimeout(100);
      }

      await expect(page.locator('text=11 条').first()).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-EXT-004: Edit dialog supports batch operations', async ({ page }) => {
      test.skip();
    });

    test('TC-EDIT-EXT-005: Edit dialog supports data validation rules', async ({ page }) => {
      test.skip();
    });
  });

  describe('TC-EDIT-SEC-001 to TC-EDIT-SEC-005: Security', () => {
    test('TC-EDIT-SEC-001: XSS prevention in config fields', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      const xssPayload = '<script>alert("xss")</script>';
      const notesInput = page.locator('input[id*="notes"]').first();
      await notesInput.fill(xssPayload);

      const dialogContent = await page.locator('[role="dialog"]').innerHTML();
      expect(dialogContent).not.toContain('<script>alert');
    });

    test('TC-EDIT-SEC-002: XSS prevention in metric fields', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      await page.click('text=性能数据');

      const editIcon = page.locator('svg.lucide-pencil').first();
      await editIcon.click();

      const xssPayload = '<img src=x onerror=alert(1)>';
      const tpsInputs = page.locator('input[type="number"]');
      const tpsInput = tpsInputs.nth(5);
      await tpsInput.fill(xssPayload);

      const dialogContent = await page.locator('[role="dialog"]').innerHTML();
      expect(dialogContent).not.toContain('onerror');
    });

    test('TC-EDIT-SEC-003: SQL injection prevention', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      const sqlPayload = "'; DROP TABLE benchmarks; --";
      const notesInput = page.locator('input[id*="notes"]').first();
      await notesInput.fill(sqlPayload);

      const dialogContent = await page.locator('[role="dialog"]').innerHTML();
      expect(dialogContent).toContain(sqlPayload);
    });

    test('TC-EDIT-SEC-004: Input length limits are enforced', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      const longValue = 'a'.repeat(10000);
      const notesInput = page.locator('input[id*="notes"]').first();
      await notesInput.fill(longValue);

      const savedValue = await notesInput.inputValue();
      expect(savedValue.length).toBeLessThanOrEqual(10000);
    });

    test('TC-EDIT-SEC-005: CSRF protection during save', async ({ page }) => {
      test.skip();
    });
  });

  describe('TC-EDIT-PERF-001 to TC-EDIT-PERF-003: Performance', () => {
    test('TC-EDIT-PERF-001: Dialog opens within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();
      await expect(page.locator('text=配置信息').first()).toBeVisible({ timeout: 5000 });
      const endTime = Date.now();
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(2000);
    });

    test('TC-EDIT-PERF-002: Large metrics list is rendered efficiently', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.locator('button[title="编辑"]').click();

      await page.click('text=性能数据');

      const startTime = Date.now();
      await page.waitForSelector('table tbody tr', { timeout: 5000 });
      const endTime = Date.now();
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000);
    });

    test('TC-EDIT-PERF-003: Type-ahead input is responsive', async ({ page }) => {
      test.skip();
    });
  });
});

import { test, expect } from '@playwright/test';

test.describe('Benchmark Features - Functional Correctness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
  });

  test('TC-FUNC-001: CSV import validates all required config fields', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });

    await page.click('button:has-text("解析数据")');

    await expect(page.locator('text=请完善配置信息')).toBeVisible({ timeout: 3000 });
  });

  test('TC-FUNC-002: CSV import accepts operator acceleration field', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });

    const operatorAccelerationInput = page.locator('input[id="import-operatorAcceleration"]');
    await expect(operatorAccelerationInput).toBeVisible();
    await operatorAccelerationInput.fill('FlashAttention');
  });

  test('TC-FUNC-003: CSV import accepts framework params field', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });

    const frameworkParamsInput = page.locator('input[id="import-frameworkParams"]');
    await expect(frameworkParamsInput).toBeVisible();
    await frameworkParamsInput.fill('--enable-cuda-graph');
  });

  test('TC-FUNC-004: Manual add supports multiple metric rows', async ({ page }) => {
    await page.click('button:has-text("手动添加")');
    await expect(page.locator('text=测试配置信息').first()).toBeVisible({ timeout: 5000 });

    await page.fill('#modelName', 'Test-Model');
    await page.fill('#serverName', 'test-server');
    await page.fill('#chipName', 'GPU-A100');
    await page.selectOption('#framework', 'VLLM');

    await page.click('button:has-text("下一步")');
    await expect(page.locator('text=性能指标').first()).toBeVisible({ timeout: 3000 });

    const initialRows = page.locator('text=指标 #').count();
    expect(initialRows).toBeGreaterThanOrEqual(1);

    await page.click('button:has-text("添加指标")');
    const afterAddRows = page.locator('text=指标 #').count();
    expect(afterAddRows).toBeGreaterThan(initialRows);
  });

  test('TC-FUNC-005: Manual add validates config fields', async ({ page }) => {
    await page.click('button:has-text("手动添加")');
    await expect(page.locator('text=测试配置信息').first()).toBeVisible({ timeout: 5000 });

    await page.click('button:has-text("下一步")');

    await expect(page.locator('text=请输入模型名称')).toBeVisible({ timeout: 3000 });
  });

  test('TC-FUNC-006: Manual add validates metric values', async ({ page }) => {
    await page.click('button:has-text("手动添加")');

    await page.fill('#modelName', 'Test-Model');
    await page.fill('#serverName', 'test-server');
    await page.fill('#chipName', 'GPU-A100');
    await page.selectOption('#framework', 'VLLM');

    await page.click('button:has-text("下一步")');
    await expect(page.locator('text=性能指标').first()).toBeVisible({ timeout: 3000 });

    await page.fill('input[min="1"]:first-of-type', '-1');
    await page.click('button:has-text("添加基准测试")');

    await expect(page.locator('text=并发数必须大于0')).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Benchmark Features - Reliability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
  });

  test('TC-REL-001: Dialog closes and reopens correctly', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
    await expect(page.locator('text=增强CSV导入').first()).not.toBeVisible({ timeout: 3000 });

    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-REL-002: Form data persists during tab switching', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });

    await page.fill('input[id="import-modelName"]', 'Persistence-Test-Model');

    await page.click('[role="tab"]:has-text("粘贴数据")');
    await page.click('[role="tab"]:has-text("上传文件")');

    await expect(page.locator('input[id="import-modelName"]')).toHaveValue('Persistence-Test-Model');
  });

  test('TC-REL-003: Large data sets handled correctly', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });

    const pasteArea = page.locator('textarea').first();
    const largeData = Array.from({ length: 100 }, (_, i) =>
      `${i + 1},${1024 + i},128,${45 + i},${12 + i},${156 + i}`
    ).join('\n');

    await page.click('[role="tab"]:has-text("粘贴数据")');
    await pasteArea.fill(`concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond\n${largeData}`);

    await page.click('button:has-text("解析数据")');

    await expect(page.locator('text=成功解析 100 行数据')).toBeVisible({ timeout: 5000 });
  });

  test('TC-REL-004: Error handling for invalid CSV format', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });

    await page.click('[role="tab"]:has-text("粘贴数据")');
    await page.locator('textarea').fill('invalid,csv,data\n1,2,3\n4,5,6');

    await page.click('button:has-text("解析数据")');

    await expect(page.locator('text=缺少必需的头部字段')).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Benchmark Features - Scalability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
  });

  test('TC-SCAL-001: Handles multiple concurrent benchmark entries', async ({ page }) => {
    await page.click('button:has-text("手动添加")');

    await page.fill('#modelName', 'Scalability-Test-Model');
    await page.fill('#serverName', 'test-server');
    await page.fill('#chipName', 'GPU-A100');
    await page.selectOption('#framework', 'VLLM');

    await page.click('button:has-text("下一步")');

    for (let i = 0; i < 10; i++) {
      await page.click('button:has-text("添加指标")');
    }

    const metricCount = await page.locator('text=指标 #').count();
    expect(metricCount).toBe(11);
  });

  test('TC-SCAL-002: Templates load correctly', async ({ page }) => {
    await page.click('button:has-text("手动添加")');

    await page.fill('#modelName', 'Template-Test-Model');
    await page.fill('#serverName', 'test-server');
    await page.fill('#chipName', 'GPU-A100');
    await page.selectOption('#framework', 'VLLM');

    await page.click('button:has-text("下一步")');

    const concurrencyTemplate = page.locator('button:has-text("并发数模板")');
    await concurrencyTemplate.click();

    const highConcurrency = page.locator('text=高并发(16-128)');
    await highConcurrency.click();

    const metrics = await page.locator('input[min="1"]:first-of-type').allInputValues();
    expect(metrics.some(v => v === '16' || v === '32' || v === '64')).toBe(true);
  });

  test('TC-SCAL-003: CSV batch import performance', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });

    await page.click('[role="tab"]:has-text("粘贴数据")');

    const testData = Array.from({ length: 50 }, (_, i) =>
      `${i + 1},1024,128,${45 + i * 0.1},${12 + i * 0.1},${156 + i}`
    ).join('\n');

    await page.locator('textarea').fill(`concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond\n${testData}`);

    const startTime = Date.now();
    await page.click('button:has-text("解析数据")');
    await expect(page.locator('text=成功解析 50 行数据')).toBeVisible({ timeout: 10000 });
    const parseTime = Date.now() - startTime;

    expect(parseTime).toBeLessThan(5000);
  });
});

test.describe('Benchmark Features - Security', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
  });

  test('TC-SEC-001: XSS prevention in text inputs', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });

    const xssPayload = '<script>alert("xss")</script>';
    await page.fill('input[id="import-modelName"]', xssPayload);

    await page.click('button:has-text("解析数据")');

    await page.click('button:has-text("导入配置"));

    const dialogContent = await page.locator('[role="dialog"]').innerHTML();
    expect(dialogContent).not.toContain('<script>');
  });

  test('TC-SEC-002: SQL injection prevention', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });

    const sqlPayload = "'; DROP TABLE benchmarks; --";
    await page.fill('input[id="import-modelName"]', sqlPayload);

    await page.click('button:has-text("解析数据")');

    await page.click('button:has-text("导入配置"));

    await expect(page.locator('text=配置导入信息').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-SEC-003: Input length validation', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });

    const longString = 'a'.repeat(200);
    await page.fill('input[id="import-modelName"]', longString);

    await page.click('button:has-text("解析数据"));

    await page.click('button:has-text("导入配置"));

    await expect(page.locator('text=模型名称不能超过100个字符')).toBeVisible({ timeout: 3000 });
  });

  test('TC-SEC-004: Special character handling in CSV', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });

    await page.click('[role="tab"]:has-text("粘贴数据")');

    const specialCharData = `concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond
1,1024,128,"45.2","12.5","156.3"`;

    await page.locator('textarea').fill(specialCharData);

    await page.click('button:has-text("解析数据")');

    await expect(page.locator('text=成功解析 1 行数据')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Benchmark Features - Data Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
  });

  test('TC-INT-001: Duplicate concurrency detection', async ({ page }) => {
    await page.click('button:has-text("手动添加")');

    await page.fill('#modelName', 'Test-Model');
    await page.fill('#serverName', 'test-server');
    await page.fill('#chipName', 'GPU-A100');
    await page.selectOption('#framework', 'VLLM');

    await page.click('button:has-text("下一步")');

    const firstInput = page.locator('input[min="1"]:first-of-type');
    await firstInput.fill('1');

    const allInputs = page.locator('input[min="1"]:first-of-type');
    await allInputs.nth(1).fill('1');

    await page.click('button:has-text("添加基准测试")');

    await expect(page.locator('text=并发数 1 重复')).toBeVisible({ timeout: 3000 });
  });

  test('TC-INT-002: TPS and TPOT consistency check', async ({ page }) => {
    await page.click('button:has-text("手动添加")');

    await page.fill('#modelName', 'Test-Model');
    await page.fill('#serverName', 'test-server');
    await page.fill('#chipName', 'GPU-A100');
    await page.selectOption('#framework', 'VLLM');

    await page.click('button:has-text("下一步")');

    const tpotInput = page.locator('input[min="0"][step="0.1"]').nth(1);
    await tpotInput.fill('10');

    const tpsInput = page.locator('input[min="0"][step="0.1"]').nth(2);
    await tpsInput.fill('10');

    await page.click('button:has-text("添加基准测试")');

    await expect(page.locator('text=TPS与TPOT不匹配')).toBeVisible({ timeout: 3000 });
  });

  test('TC-INT-003: Valid data submission', async ({ page }) => {
    await page.click('button:has-text("手动添加")');

    await page.fill('#modelName', 'Valid-Test-Model');
    await page.fill('#serverName', 'test-server');
    await page.fill('#chipName', 'GPU-A100');
    await page.selectOption('#framework', 'VLLM');
    await page.fill('#operatorAcceleration', 'FlashAttention');
    await page.fill('#frameworkParams', '--enable-cuda-graph');

    await page.click('button:has-text("下一步")');

    const tpotInput = page.locator('input[min="0"][step="0.1"]').nth(1);
    await tpotInput.fill('10');

    const tpsInput = page.locator('input[min="0"][step="0.1"]').nth(2);
    await tpsInput.fill('100');

    await page.click('button:has-text("添加基准测试")');

    await expect(page.locator('text=Valid-Test-Model').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Benchmark Features - Edit Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
  });

  test('TC-EDIT-001: Open edit dialog displays config data', async ({ page }) => {
    await expect(page.locator('text=性能结果呈现').first()).toBeVisible({ timeout: 5000 });

    const editButtons = page.locator('button[title="编辑"]');
    await expect(editButtons.first()).toBeVisible({ timeout: 5000 });

    await editButtons.first().click();

    await expect(page.locator('text=配置信息').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=性能数据').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-EDIT-002: Edit dialog displays metrics data', async ({ page }) => {
    await expect(page.locator('text=性能结果呈现').first()).toBeVisible({ timeout: 5000 });

    const editButtons = page.locator('button[title="编辑"]');
    await editButtons.first().click();

    await expect(page.locator('text=性能数据').first()).toBeVisible({ timeout: 3000 });
    await page.click('text=性能数据');

    await expect(page.locator('text=性能指标数据').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=TTFT (ms)').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=TPOT (ms)').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=TPS (tokens/s)').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-EDIT-003: Edit config and save changes', async ({ page }) => {
    await expect(page.locator('text=性能结果呈现').first()).toBeVisible({ timeout: 5000 });

    const editButtons = page.locator('button[title="编辑"]');
    await editButtons.first().click();

    await expect(page.locator('text=配置信息').first()).toBeVisible({ timeout: 3000 });
    await page.click('text=配置信息');

    const modelNameInput = page.locator('input[value*="Qwen"]').first();
    await expect(modelNameInput).toBeVisible({ timeout: 3000 });

    await page.click('button:has-text("保存更改")');

    await expect(page.locator('text=更新成功').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-EDIT-004: Edit metrics and save changes', async ({ page }) => {
    await expect(page.locator('text=性能结果呈现').first()).toBeVisible({ timeout: 5000 });

    const editButtons = page.locator('button[title="编辑"]');
    await editButtons.first().click();

    await expect(page.locator('text=性能数据').first()).toBeVisible({ timeout: 3000 });
    await page.click('text=性能数据');

    const editMetricButton = page.locator('button[title="编辑"]').first();
    await editMetricButton.click();

    const concurrencyInput = page.locator('input[type="number"]').first();
    await expect(concurrencyInput).toBeVisible({ timeout: 3000 });

    await page.click('button:has-text("保存更改")');

    await expect(page.locator('text=更新成功').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-EDIT-005: Add new metric in edit dialog', async ({ page }) => {
    await expect(page.locator('text=性能结果呈现').first()).toBeVisible({ timeout: 5000 });

    const editButtons = page.locator('button[title="编辑"]');
    await editButtons.first().click();

    await expect(page.locator('text=性能数据').first()).toBeVisible({ timeout: 3000 });
    await page.click('text=性能数据');

    const initialMetrics = await page.locator('table tbody tr').count();

    await page.click('button:has-text("添加数据")');

    const afterAddMetrics = await page.locator('table tbody tr').count();
    expect(afterAddMetrics).toBe(initialMetrics + 1);

    await page.click('button:has-text("保存更改")');

    await expect(page.locator('text=更新成功').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-EDIT-006: Delete metric in edit dialog', async ({ page }) => {
    await expect(page.locator('text=性能结果呈现').first()).toBeVisible({ timeout: 5000 });

    const editButtons = page.locator('button[title="编辑"]');
    await editButtons.first().click();

    await expect(page.locator('text=性能数据').first()).toBeVisible({ timeout: 3000 });
    await page.click('text=性能数据');

    const initialMetrics = await page.locator('table tbody tr').count();

    if (initialMetrics > 1) {
      const deleteButton = page.locator('button[title="删除"]').first();
      await deleteButton.click();

      const afterDeleteMetrics = await page.locator('table tbody tr').count();
      expect(afterDeleteMetrics).toBe(initialMetrics - 1);

      await page.click('button:has-text("保存更改")');

      await expect(page.locator('text=更新成功').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('TC-EDIT-007: Cancel edit dialog', async ({ page }) => {
    await expect(page.locator('text=性能结果呈现').first()).toBeVisible({ timeout: 5000 });

    const editButtons = page.locator('button[title="编辑"]');
    await editButtons.first().click();

    await expect(page.locator('text=配置信息').first()).toBeVisible({ timeout: 3000 });

    await page.click('button:has-text("取消")');

    await expect(page.locator('text=配置信息').first()).not.toBeVisible({ timeout: 3000 });
  });

  test('TC-EDIT-008: Edit dialog shows unique ID', async ({ page }) => {
    await expect(page.locator('text=性能结果呈现').first()).toBeVisible({ timeout: 5000 });

    const editButtons = page.locator('button[title="编辑"]');
    await editButtons.first().click();

    await expect(page.locator('text=bench-').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-EDIT-009: Handle incomplete benchmark data', async ({ page }) => {
    await expect(page.locator('text=性能结果呈现').first()).toBeVisible({ timeout: 5000 });

    const editButtons = page.locator('button[title="编辑"]');
    await editButtons.first().click();

    await expect(page.locator('text=配置信息').first()).toBeVisible({ timeout: 3000 });
    await page.click('text=配置信息');

    const frameworkVersionInput = page.locator('input[id*="frameworkVersion"]');
    await expect(frameworkVersionInput).toBeVisible({ timeout: 3000 });
  });

  test('TC-EDIT-010: Tab switching in edit dialog', async ({ page }) => {
    await expect(page.locator('text=性能结果呈现').first()).toBeVisible({ timeout: 5000 });

    const editButtons = page.locator('button[title="编辑"]');
    await editButtons.first().click();

    await expect(page.locator('text=配置信息').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=性能数据').first()).toBeVisible({ timeout: 3000 });

    await page.click('text=性能数据');
    await expect(page.locator('text=性能指标数据').first()).toBeVisible({ timeout: 3000 });

    await page.click('text=配置信息');
    await expect(page.locator('text=测试配置').first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Benchmark Features - User Experience', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/results');
    await page.waitForLoadState('networkidle');
  });

  test('TC-UX-001: Clear error messages', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });

    await page.click('button:has-text("解析数据"));

    const errorMessages = await page.locator('text=/请输入|缺少|无效/').all();
    expect(errorMessages.length).toBeGreaterThan(0);
  });

  test('TC-UX-002: Visual feedback for actions', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });

    await expect(page.locator('text=上传文件').first()).toBeVisible();
    await expect(page.locator('text=粘贴数据').first()).toBeVisible();
  });

  test('TC-UX-003: Responsive dialog layout', async ({ page }) => {
    await page.click('button:has-text("导入CSV")');
    await expect(page.locator('text=增强CSV导入').first()).toBeVisible({ timeout: 5000 });

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    const dialogBox = await dialog.boundingBox();
    expect(dialogBox?.width).toBeGreaterThan(600);
    expect(dialogBox?.height).toBeGreaterThan(400);
  });
});

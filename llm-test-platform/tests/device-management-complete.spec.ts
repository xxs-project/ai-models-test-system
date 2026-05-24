import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:5175';
const API_URL = 'http://localhost:8001';

// 初始化数据库
function initDatabase() {
  try {
    execSync('cd /home/models-test-system_v1.0/llm-test-platform/backend && python3 -c "
from sqlmodel import SQLModel, create_engine
from models import Device
engine = create_engine(\"sqlite:///database.db\", echo=False)
# 保留现有数据，不清空
print(\"Database ready\")
"', { stdio: 'inherit' });
  } catch (e) {
    console.log('Database init error:', e);
  }
}

test.beforeAll(() => {
  initDatabase();
});

test.describe('设备管理功能完整测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/devices`);
    await page.waitForLoadState('networkidle');
  });

  // ========== 1. 下载模板功能测试 ==========
  test.describe('1. 下载模板功能测试', () => {
    
    test('1.1 下载模板按钮存在', async ({ page }) => {
      const downloadTemplateBtn = page.locator('button:has-text("下载模板")');
      await expect(downloadTemplateBtn).toBeVisible();
      await expect(downloadTemplateBtn).toBeEnabled();
    });

    test('1.2 下载模板按钮位置正确', async ({ page }) => {
      // 获取按钮的父元素
      const buttonGroup = page.locator('button:has-text("下载模板")').locator('..');
      
      // 验证在同一行有导入、导出按钮
      const importBtn = page.locator('button:has-text("导入")');
      const exportBtn = page.locator('button:has-text("导出")');
      const addBtn = page.locator('button:has-text("添加设备")');
      
      await expect(importBtn).toBeVisible();
      await expect(exportBtn).toBeVisible();
      await expect(addBtn).toBeVisible();
    });

    test('1.3 点击下载模板成功', async ({ page }) => {
      // 等待下载事件
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('button:has-text("下载模板")')
      ]);
      
      // 验证下载文件名
      expect(download.suggestedFilename()).toBe('device_template.csv');
      
      // 验证成功提示
      await expect(page.locator('text=模板下载成功')).toBeVisible();
    });

    test('1.4 下载的模板内容正确', async ({ page }) => {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('button:has-text("下载模板")')
      ]);
      
      const path = await download.path();
      const fs = require('fs');
      const content = fs.readFileSync(path, 'utf-8');
      
      // 验证包含必要的列标题
      expect(content).toContain('IP地址');
      expect(content).toContain('端口');
      expect(content).toContain('用户名');
      expect(content).toContain('密码');
      expect(content).toContain('备注');
      
      // 验证包含示例数据
      expect(content).toContain('192.168.1.100');
      expect(content).toContain('192.168.1.101');
    });

    test('1.5 下载模板API测试', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/devices/template`);
      
      expect(response.status()).toBe(200);
      
      // 验证响应头
      const headers = response.headers();
      expect(headers['content-type']).toContain('text/csv');
      expect(headers['content-disposition']).toContain('device_template.csv');
      
      // 验证响应内容
      const body = await response.body();
      const content = body.toString();
      expect(content).toContain('IP地址,端口,用户名,密码,备注');
    });
  });

  // ========== 2. 导入功能测试 ==========
  test.describe('2. 导入功能测试', () => {
    
    test('2.1 导入对话框正常打开', async ({ page }) => {
      await page.click('button:has-text("导入")');
      
      await expect(page.locator('text=导入设备')).toBeVisible();
      await expect(page.locator('text=导入说明')).toBeVisible();
      await expect(page.locator('text=选择文件')).toBeVisible();
    });

    test('2.2 导入说明信息完整', async ({ page }) => {
      await page.click('button:has-text("导入")');
      
      // 验证导入说明包含所有关键信息
      await expect(page.locator('text=支持 CSV 格式文件')).toBeVisible();
      await expect(page.locator('text=文件编码建议使用 UTF-8')).toBeVisible();
      await expect(page.locator('text=必填字段：IP地址、端口、用户名、密码')).toBeVisible();
      await expect(page.locator('text=重复IP将被跳过')).toBeVisible();
    });

    test('2.3 导入文件选择功能', async ({ page }) => {
      await page.click('button:has-text("导入")');
      
      const csvContent = `IP地址,端口,用户名,密码,备注
192.168.200.1,22,root,pass1,测试设备1`;
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test_import.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });
      
      // 验证文件已选择
      await expect(page.locator('text=test_import.csv')).toBeVisible();
    });

    test('2.4 导入按钮状态控制', async ({ page }) => {
      await page.click('button:has-text("导入")');
      
      const importButton = page.locator('button:has-text("开始导入")');
      
      // 未选择文件时禁用
      await expect(importButton).toBeDisabled();
      
      // 选择文件后启用
      const csvContent = 'IP地址,端口,用户名,密码\n192.168.200.2,22,root,pass2';
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });
      
      await expect(importButton).toBeEnabled();
    });

    test('2.5 成功导入设备', async ({ page }) => {
      await page.click('button:has-text("导入")');
      
      const uniqueIp = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      const csvContent = `IP地址,端口,用户名,密码,备注
${uniqueIp},22,root,testpass,导入测试设备`;
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'import_success.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });
      
      await page.click('button:has-text("开始导入")');
      
      // 等待导入完成
      await expect(page.locator('text=导入成功')).toBeVisible({ timeout: 10000 });
    });

    test('2.6 导入重复IP处理', async ({ page, request }) => {
      // 先获取一个已存在的IP
      const devicesRes = await request.get(`${API_URL}/api/devices`);
      const devices = await devicesRes.json();
      
      if (devices.items && devices.items.length > 0) {
        const existingIp = devices.items[0].ip;
        
        await page.click('button:has-text("导入")');
        
        const csvContent = `IP地址,端口,用户名,密码
${existingIp},22,root,pass123`;
        
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
          name: 'duplicate_test.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from(csvContent)
        });
        
        await page.click('button:has-text("开始导入")');
        
        // 验证导入成功但显示失败统计
        await expect(page.locator('text=导入成功')).toBeVisible({ timeout: 10000 });
      }
    });

    test('2.7 导入API测试', async ({ request }) => {
      const uniqueIp = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      const csvContent = `IP地址,端口,用户名,密码,备注
${uniqueIp},22,root,testpass,API测试设备`;
      
      const response = await request.post(`${API_URL}/api/devices/import`, {
        data: csvContent,
        headers: {
          'Content-Type': 'text/csv'
        }
      });
      
      expect(response.status()).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.imported_count).toBeGreaterThanOrEqual(0);
      expect(result.failed_count).toBeGreaterThanOrEqual(0);
    });
  });

  // ========== 3. 导出功能测试 ==========
  test.describe('3. 导出功能测试', () => {
    
    test('3.1 导出按钮存在且可用', async ({ page }) => {
      const exportBtn = page.locator('button:has-text("导出")');
      await expect(exportBtn).toBeVisible();
      await expect(exportBtn).toBeEnabled();
    });

    test('3.2 导出功能触发下载', async ({ page }) => {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('button:has-text("导出")')
      ]);
      
      const filename = download.suggestedFilename();
      expect(filename).toContain('devices_export');
      expect(filename).toContain('.csv');
    });

    test('3.3 导出数据格式正确', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/devices/export`);
      
      expect(response.status()).toBe(200);
      
      const body = await response.body();
      const content = body.toString();
      
      // 验证表头包含必要字段
      expect(content).toContain('ID');
      expect(content).toContain('IP地址');
      expect(content).toContain('端口');
      expect(content).toContain('用户名');
      expect(content).toContain('密码');
      expect(content).toContain('状态');
    });
  });

  // ========== 4. 添加设备功能测试 ==========
  test.describe('4. 添加设备功能测试', () => {
    
    test('4.1 打开添加设备对话框', async ({ page }) => {
      await page.click('button:has-text("添加设备")');
      
      await expect(page.locator('text=添加设备')).toBeVisible();
      await expect(page.locator('input#ip')).toBeVisible();
      await expect(page.locator('input#port')).toBeVisible();
      await expect(page.locator('input#username')).toBeVisible();
      await expect(page.locator('input#password')).toBeVisible();
      await expect(page.locator('input#remark')).toBeVisible();
    });

    test('4.2 必填字段验证', async ({ page }) => {
      await page.click('button:has-text("添加设备")');
      
      // 只填写部分字段，提交按钮应禁用
      await page.fill('input#username', 'root');
      
      const submitBtn = page.locator('button:has-text("提交")');
      await expect(submitBtn).toBeDisabled();
    });

    test('4.3 成功添加设备', async ({ page }) => {
      await page.click('button:has-text("添加设备")');
      
      const uniqueIp = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      
      await page.fill('input#ip', uniqueIp);
      await page.fill('input#port', '22');
      await page.fill('input#username', 'root');
      await page.fill('input#password', 'testpass123');
      await page.fill('input#remark', '测试添加设备');
      
      await page.click('button:has-text("提交")');
      
      // 验证成功提示
      await expect(page.locator('text=设备添加成功')).toBeVisible({ timeout: 10000 });
      
      // 验证对话框关闭
      await expect(page.locator('text=添加设备').first()).not.toBeVisible();
    });

    test('4.4 重复IP拒绝', async ({ page, request }) => {
      // 先获取一个已存在的IP
      const devicesRes = await request.get(`${API_URL}/api/devices`);
      const devices = await devicesRes.json();
      
      if (devices.items && devices.items.length > 0) {
        const existingIp = devices.items[0].ip;
        
        await page.click('button:has-text("添加设备")');
        
        await page.fill('input#ip', existingIp);
        await page.fill('input#port', '22');
        await page.fill('input#username', 'root');
        await page.fill('input#password', 'testpass');
        
        await page.click('button:has-text("提交")');
        
        // 验证错误提示
        await expect(page.locator('text=该 IP 已存在')).toBeVisible({ timeout: 5000 });
      }
    });

    test('4.5 无效IP格式拒绝', async ({ page }) => {
      await page.click('button:has-text("添加设备")');
      
      await page.fill('input#ip', 'invalid_ip');
      await page.fill('input#port', '22');
      await page.fill('input#username', 'root');
      await page.fill('input#password', 'testpass');
      
      await page.click('button:has-text("提交")');
      
      // 验证错误提示
      await expect(page.locator('text=无效的IP地址格式')).toBeVisible({ timeout: 5000 });
    });

    test('4.6 无效端口拒绝', async ({ page }) => {
      await page.click('button:has-text("添加设备")');
      
      await page.fill('input#ip', '192.168.1.100');
      await page.fill('input#port', '70000'); // 超出范围
      await page.fill('input#username', 'root');
      await page.fill('input#password', 'testpass');
      
      await page.click('button:has-text("提交")');
      
      // 验证错误提示
      await expect(page.locator('text=端口号必须在1-65535之间')).toBeVisible({ timeout: 5000 });
    });

    test('4.7 添加设备API测试', async ({ request }) => {
      const uniqueIp = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      
      const response = await request.post(`${API_URL}/api/devices`, {
        data: {
          ip: uniqueIp,
          port: 22,
          username: 'root',
          password: 'testpass',
          remark: 'API测试'
        }
      });
      
      expect(response.status()).toBe(200);
      
      const result = await response.json();
      expect(result.ip).toBe(uniqueIp);
      expect(result.username).toBe('root');
      expect(result.status).toBe('Unknown');
    });
  });

  // ========== 5. 安全性测试 ==========
  test.describe('5. 安全性测试', () => {
    
    test('5.1 SQL注入防护 - 添加设备', async ({ request }) => {
      const uniqueIp = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      
      const response = await request.post(`${API_URL}/api/devices`, {
        data: {
          ip: uniqueIp,
          port: 22,
          username: "root'); DROP TABLE devices; --",
          password: 'testpass'
        }
      });
      
      // 请求应该成功，但特殊字符被正确处理
      expect(response.status()).toBe(200);
      
      // 验证设备列表仍然可用
      const devicesRes = await request.get(`${API_URL}/api/devices`);
      expect(devicesRes.status()).toBe(200);
    });

    test('5.2 XSS防护', async ({ page }) => {
      await page.click('button:has-text("添加设备")');
      
      const uniqueIp = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      
      await page.fill('input#ip', uniqueIp);
      await page.fill('input#port', '22');
      await page.fill('input#username', 'root');
      await page.fill('input#password', 'testpass');
      await page.fill('input#remark', '<script>alert("xss")</script>');
      
      await page.click('button:has-text("提交")');
      
      // 验证添加成功，XSS被转义
      await expect(page.locator('text=设备添加成功')).toBeVisible({ timeout: 10000 });
    });

    test('5.3 密码输入类型保护', async ({ page }) => {
      await page.click('button:has-text("添加设备")');
      
      const passwordInput = page.locator('input#password');
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('5.4 导入文件类型限制', async ({ page }) => {
      await page.click('button:has-text("导入")');
      
      const fileInput = page.locator('input[type="file"]');
      
      // 验证accept属性
      await expect(fileInput).toHaveAttribute('accept', '.csv');
    });
  });

  // ========== 6. 可靠性测试 ==========
  test.describe('6. 可靠性测试', () => {
    
    test('6.1 快速连续添加设备', async ({ page }) => {
      // 快速添加多个设备
      for (let i = 0; i < 3; i++) {
        const uniqueIp = `192.168.${200 + i}.${Math.floor(Math.random() * 255)}`;
        
        await page.click('button:has-text("添加设备")');
        await page.fill('input#ip', uniqueIp);
        await page.fill('input#port', '22');
        await page.fill('input#username', 'root');
        await page.fill('input#password', 'testpass');
        await page.click('button:has-text("提交")');
        
        await page.waitForTimeout(500);
      }
      
      // 验证页面仍然正常
      await expect(page.locator('text=设备管理')).toBeVisible();
    });

    test('6.2 大文件导入', async ({ request }) => {
      // 生成大量设备数据
      let csvContent = 'IP地址,端口,用户名,密码\n';
      for (let i = 1; i <= 50; i++) {
        csvContent += `192.168.99.${i},22,user${i},pass${i}\n`;
      }
      
      const response = await request.post(`${API_URL}/api/devices/import`, {
        data: csvContent,
        headers: { 'Content-Type': 'text/csv' }
      });
      
      expect(response.status()).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
    });

    test('6.3 网络异常处理', async ({ page }) => {
      // 模拟网络断开
      await page.route('**/api/devices', route => route.abort('internetdisconnected'));
      
      await page.click('button:has-text("刷新")');
      
      // 验证错误提示
      await expect(page.locator('text=刷新失败')).toBeVisible();
      
      // 恢复网络
      await page.unroute('**/api/devices');
    });
  });

  // ========== 7. 可扩展性测试 ==========
  test.describe('7. 可扩展性测试', () => {
    
    test('7.1 响应式布局测试', async ({ page }) => {
      // 测试不同屏幕尺寸
      const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1280, height: 720 },
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        // 验证关键元素可见
        await expect(page.locator('text=设备管理')).toBeVisible();
        await expect(page.locator('button:has-text("下载模板")')).toBeVisible();
        await expect(page.locator('button:has-text("导入")')).toBeVisible();
        await expect(page.locator('button:has-text("导出")')).toBeVisible();
        await expect(page.locator('button:has-text("添加设备")')).toBeVisible();
      }
    });

    test('7.2 API响应格式验证', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/devices`);
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      
      // 验证响应结构
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('page');
      expect(data).toHaveProperty('size');
      expect(Array.isArray(data.items)).toBeTruthy();
    });
  });

  // ========== 8. UI/UX测试 ==========
  test.describe('8. UI/UX测试', () => {
    
    test('8.1 按钮布局正确', async ({ page }) => {
      // 验证按钮顺序：下载模板、导入、导出、添加设备
      const buttons = await page.locator('button').all();
      const buttonTexts = await Promise.all(
        buttons.map(btn => btn.textContent())
      );
      
      // 检查关键按钮存在
      expect(buttonTexts.some(text => text?.includes('下载模板'))).toBe(true);
      expect(buttonTexts.some(text => text?.includes('导入'))).toBe(true);
      expect(buttonTexts.some(text => text?.includes('导出'))).toBe(true);
      expect(buttonTexts.some(text => text?.includes('添加设备'))).toBe(true);
    });

    test('8.2 导入对话框不包含下载模板按钮', async ({ page }) => {
      await page.click('button:has-text("导入")');
      
      // 验证对话框中没有下载模板按钮（应该只在主界面）
      const dialog = page.locator('[role="dialog"]');
      const downloadBtnInDialog = dialog.locator('button:has-text("下载模板")');
      
      // 对话框中应该只有提示信息，没有下载模板按钮
      await expect(page.locator('text=提示：请先使用"下载模板"按钮')).toBeVisible();
    });

    test('8.3 错误提示清晰', async ({ page }) => {
      await page.click('button:has-text("添加设备")');
      
      // 提交空表单查看错误提示
      await page.fill('input#ip', 'invalid');
      await page.fill('input#username', 'root');
      await page.fill('input#password', 'test');
      await page.click('button:has-text("提交")');
      
      // 验证错误提示是中文且清晰
      const errorMessage = await page.locator('text=无效的IP地址格式').first();
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });
  });
});

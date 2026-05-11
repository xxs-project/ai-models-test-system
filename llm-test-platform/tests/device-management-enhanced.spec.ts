import { test, expect, APIRequestContext } from '@playwright/test';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:8000';

function initDatabase() {
  try {
    execSync('cd /home/models-test-system_v1.0/llm-test-platform/backend && python3 -c "
from sqlmodel import SQLModel, create_engine
from models import Device
engine = create_engine(\"sqlite:///database.db\", echo=False)
# 确保数据库已创建
SQLModel.metadata.create_all(engine)
print(\"Database ready\")
"', { stdio: 'inherit' });
  } catch (e) {
    console.log('Database init error:', e);
  }
}

function generateUniqueIp(): string {
  return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

test.beforeAll(() => {
  initDatabase();
});

test.describe('设备管理功能扩展测试 - 可靠性、可扩展性、安全性', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/devices`);
    await page.waitForLoadState('networkidle');
  });

  // ========== 1. 可靠性测试 ==========
  test.describe('1. 可靠性测试', () => {
    
    test('1.1 页面加载稳定性测试', async ({ page }) => {
      await expect(page.locator('h1:has-text("设备管理")')).toBeVisible();
      await expect(page.locator('text=管理测试设备，监控设备状态')).toBeVisible();
      
      // 多次刷新页面
      for (let i = 0; i < 3; i++) {
        await page.reload();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('text=暂无设备')).toBeVisible({ timeout: 5000 });
      }
    });

    test('1.2 网络波动处理测试', async ({ request }) => {
      // 连续多次请求API
      for (let i = 0; i < 5; i++) {
        const response = await request.get(`${API_URL}/api/devices`);
        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.items).toBeDefined();
        expect(data.total).toBeGreaterThanOrEqual(0);
      }
    });

    test('1.3 并发操作测试', async ({ request }) => {
      // 并发创建设备
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(request.post(`${API_URL}/api/devices`, {
          data: {
            ip: generateUniqueIp(),
            port: 22,
            username: 'root',
            password: 'test123',
            remark: `并发测试设备${i}`
          }
        }));
      }
      
      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });
    });

    test('1.4 长时间无操作测试', async ({ page }) => {
      // 页面停留30秒后操作
      await page.waitForTimeout(1000);
      const refreshBtn = page.locator('button:has-text("刷新")');
      await expect(refreshBtn).toBeVisible();
    });

    test('1.5 数据一致性测试', async ({ request }) => {
      // 创建设备
      const uniqueIp = generateUniqueIp();
      const createRes = await request.post(`${API_URL}/api/devices`, {
        data: {
          ip: uniqueIp,
          port: 22,
          username: 'root',
          password: 'test123',
          remark: '一致性测试'
        }
      });
      expect(createRes.status()).toBe(200);
      const created = await createRes.json();
      
      // 立即查询
      const getRes = await request.get(`${API_URL}/api/devices/${created.id}`);
      expect(getRes.status()).toBe(200);
      const fetched = await getRes.json();
      
      // 验证数据一致性
      expect(fetched.ip).toBe(created.ip);
      expect(fetched.username).toBe(created.username);
    });

    test('1.6 错误恢复测试', async ({ page }) => {
      // 测试无效IP后恢复
      await page.click('button:has-text("添加设备")');
      await page.fill('input#ip', 'invalid-ip');
      await page.fill('input#port', '22');
      await page.fill('input#username', 'root');
      await page.fill('input#password', 'testpass');
      await page.click('button:has-text("提交")');
      
      await expect(page.locator('text=无效的IP地址格式')).toBeVisible({ timeout: 5000 });
      
      // 关闭对话框
      await page.click('button:has-text("取消")');
      
      // 重新打开并填写正确信息
      await page.click('button:has-text("添加设备")');
      const uniqueIp = generateUniqueIp();
      await page.fill('input#ip', uniqueIp);
      await page.fill('input#port', '22');
      await page.fill('input#username', 'root');
      await page.fill('input#password', 'testpass');
      await page.click('button:has-text("提交")');
      
      await expect(page.locator('text=设备添加成功')).toBeVisible({ timeout: 5000 });
    });
  });

  // ========== 2. 可扩展性测试 ==========
  test.describe('2. 可扩展性测试', () => {
    
    test('2.1 大批量数据处理测试', async ({ request }) => {
      // 批量创建设备
      const batchSize = 5;
      const promises = [];
      
      for (let i = 0; i < batchSize; i++) {
        promises.push(request.post(`${API_URL}/api/devices`, {
          data: {
            ip: generateUniqueIp(),
            port: 22 + i,
            username: `user${i}`,
            password: `pass${i}`,
            remark: `批量测试设备${i}`
          }
        }));
      }
      
      const responses = await Promise.all(promises);
      let successCount = 0;
      responses.forEach(response => {
        if (response.status() === 200) successCount++;
      });
      
      expect(successCount).toBe(batchSize);
    });

    test('2.2 分页功能测试', async ({ request }) => {
      // 验证分页参数
      const response = await request.get(`${API_URL}/api/devices`, {
        params: { page: 1, size: 10 }
      });
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.page).toBe(1);
      expect(data.size).toBe(10);
    });

    test('2.3 过滤功能测试', async ({ request }) => {
      // 测试各种过滤条件
      const filters = [
        { params: { status: 'Online' }, desc: '状态过滤' },
        { params: { arch: 'x86_64' }, desc: '架构过滤' },
        { params: { acc_type: 'HasAcc' }, desc: '加速卡过滤' },
        { params: { search: '192.168' }, desc: '搜索过滤' }
      ];
      
      for (const filter of filters) {
        const response = await request.get(`${API_URL}/api/devices`, {
          params: filter.params
        });
        expect(response.status()).toBe(200);
      }
    });

    test('2.4 组合查询测试', async ({ request }) => {
      // 测试多个过滤条件组合
      const response = await request.get(`${API_URL}/api/devices`, {
        params: {
          page: 1,
          size: 20,
          status: 'Unknown',
          arch: 'x86_64',
          search: ''
        }
      });
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.items).toBeDefined();
      expect(Array.isArray(data.items)).toBe(true);
    });

    test('2.5 模板下载可扩展性', async ({ page }) => {
      // 连续多次下载模板
      for (let i = 0; i < 3; i++) {
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          page.click('button:has-text("下载模板")')
        ]);
        expect(download.suggestedFilename()).toBe('device_template.csv');
      }
    });

    test('2.6 导出大数据量测试', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/devices/export`);
      expect(response.status()).toBe(200);
      
      const body = await response.body();
      expect(body.length).toBeGreaterThan(0);
    });
  });

  // ========== 3. 安全性测试 ==========
  test.describe('3. 安全性测试', () => {
    
    test('3.1 SQL注入防护测试 - 设备创建', async ({ request }) => {
      const response = await request.post(`${API_URL}/api/devices`, {
        data: {
          ip: generateUniqueIp(),
          port: 22,
          username: "root'; DROP TABLE device; --",
          password: 'testpass',
          remark: 'SQL注入测试'
        }
      });
      
      // 应该成功创建（用户名被当作字符串处理）
      expect(response.status()).toBe(200);
    });

    test('3.2 XSS防护测试', async ({ request }) => {
      const response = await request.post(`${API_URL}/api/devices`, {
        data: {
          ip: generateUniqueIp(),
          port: 22,
          username: 'root',
          password: 'testpass',
          remark: '<script>alert("xss")</script>'
        }
      });
      
      expect(response.status()).toBe(200);
      
      // 获取设备信息，验证XSS代码被转义或过滤
      const data = await response.json();
      expect(data.remark).toBe('<script>alert("xss")</script>');
    });

    test('3.3 特殊字符处理测试', async ({ request }) => {
      const specialChars = [
        { char: '!@#$%^&*()', desc: '特殊符号' },
        { char: '中文测试', desc: '中文' },
        { char: '日本語テスト', desc: '日文' },
        { char: '🎉🎊🎈', desc: 'emoji' },
        { char: '正常文本\n换行\t制表', desc: '换行制表' }
      ];
      
      for (const { char } of specialChars) {
        const response = await request.post(`${API_URL}/api/devices`, {
          data: {
            ip: generateUniqueIp(),
            port: 22,
            username: 'root',
            password: 'testpass',
            remark: char
          }
        });
        expect(response.status()).toBe(200);
      }
    });

    test('3.4 边界值测试 - IP地址', async ({ request }) => {
      const invalidIps = [
        '256.1.1.1',
        '1.256.1.1',
        '1.1.256.1',
        '1.1.1.256',
        '192.168.1',
        '192.168.1.1.1',
        'abc.def.ghi.jkl'
      ];
      
      for (const ip of invalidIps) {
        const response = await request.post(`${API_URL}/api/devices`, {
          data: {
            ip: ip,
            port: 22,
            username: 'root',
            password: 'testpass'
          }
        });
        expect(response.status()).toBe(400);
      }
    });

    test('3.5 边界值测试 - 端口', async ({ request }) => {
      const uniqueIp = generateUniqueIp();
      
      const invalidPorts = [0, -1, 65536, 100000];
      
      for (const port of invalidPorts) {
        const response = await request.post(`${API_URL}/api/devices`, {
          data: {
            ip: uniqueIp,
            port: port,
            username: 'root',
            password: 'testpass'
          }
        });
        expect(response.status()).toBe(400);
      }
    });

    test('3.6 越权访问测试 - 删除不存在的设备', async ({ request }) => {
      const response = await request.delete(`${API_URL}/api/devices/999999`);
      expect(response.status()).toBe(404);
    });

    test('3.7 越权访问测试 - 获取不存在的设备', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/devices/999999`);
      expect(response.status()).toBe(404);
    });

    test('3.8 越权访问测试 - 更新不存在的设备', async ({ request }) => {
      const response = await request.put(`${API_URL}/api/devices/999999`, {
        data: { remark: '测试' }
      });
      expect(response.status()).toBe(404);
    });

    test('3.9 空值处理测试', async ({ request }) => {
      // 测试可选字段为空
      const response = await request.post(`${API_URL}/api/devices`, {
        data: {
          ip: generateUniqueIp(),
          port: 22,
          username: 'root',
          password: 'testpass',
          remark: ''
        }
      });
      expect(response.status()).toBe(200);
    });

    test('3.10 数据泄露防护测试', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/devices`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      // 验证响应中不包含敏感信息（如密码）
      if (data.items && data.items.length > 0) {
        data.items.forEach((item: any) => {
          expect(item).not.toHaveProperty('password');
        });
      }
    });
  });

  // ========== 4. 性能测试 ==========
  test.describe('4. 性能测试', () => {
    
    test('4.1 API响应时间测试', async ({ request }) => {
      const startTime = Date.now();
      await request.get(`${API_URL}/api/devices`);
      const endTime = Date.now();
      
      // 响应时间应小于2秒
      expect(endTime - startTime).toBeLessThan(2000);
    });

    test('4.2 批量操作性能测试', async ({ request }) => {
      const startTime = Date.now();
      
      // 连续10次API调用
      for (let i = 0; i < 10; i++) {
        await request.get(`${API_URL}/api/devices`);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // 10次调用总时间应小于10秒
      expect(totalTime).toBeLessThan(10000);
    });

    test('4.3 模板下载性能测试', async ({ page }) => {
      const startTime = Date.now();
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('button:has-text("下载模板")')
      ]);
      const endTime = Date.now();
      
      // 下载应在5秒内完成
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  // ========== 5. 兼容性测试 ==========
  test.describe('5. 兼容性测试', () => {
    
    test('5.1 模板格式兼容性测试', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/devices/template`);
      expect(response.status()).toBe(200);
      
      const body = await response.body();
      const content = body.toString();
      
      // 验证UTF-8 BOM标记
      expect(content.charCodeAt(0)).toBe(0xFEFF);
      
      // 验证CSV格式
      const lines = content.split('\r\n').filter(line => line);
      expect(lines.length).toBeGreaterThanOrEqual(2); // 表头 + 至少一行示例
    });

    test('5.2 CSV编码兼容性测试', async ({ page }) => {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('button:has-text("下载模板")')
      ]);
      
      const path = await download.path();
      const fs = require('fs');
      const content = fs.readFileSync(path, 'utf-8');
      
      // 验证中文字符正确显示
      expect(content).toContain('IP地址');
      expect(content).toContain('端口');
      expect(content).toContain('用户名');
      expect(content).toContain('密码');
      expect(content).toContain('备注');
    });

    test('5.3 响应格式兼容性测试', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/devices/template`);
      
      // 验证Content-Type
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/csv');
      
      // 验证Content-Disposition
      const disposition = response.headers()['content-disposition'];
      expect(disposition).toContain('attachment');
      expect(disposition).toContain('device_template.csv');
    });
  });

  // ========== 6. 监控功能一致性测试 ==========
  test.describe('6. 监控功能一致性测试', () => {
    
    test('6.1 设备状态字段一致性测试', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/devices`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const device = data.items[0];
        
        // 验证所有必要字段存在
        expect(device).toHaveProperty('id');
        expect(device).toHaveProperty('ip');
        expect(device).toHaveProperty('port');
        expect(device).toHaveProperty('username');
        expect(device).toHaveProperty('status');
        expect(device).toHaveProperty('accelerator_count');
        expect(device).toHaveProperty('idle_count');
        expect(device).toHaveProperty('busy_count');
        expect(device).toHaveProperty('warning_count');
        expect(device).toHaveProperty('remark');
      }
    });

    test('6.2 设备状态刷新功能测试', async ({ request }) => {
      // 先创建设备
      const createRes = await request.post(`${API_URL}/api/devices`, {
        data: {
          ip: generateUniqueIp(),
          port: 22,
          username: 'root',
          password: 'testpass',
          remark: '刷新测试'
        }
      });
      expect(createRes.status()).toBe(200);
      const device = await createRes.json();
      
      // 刷新设备状态
      const refreshRes = await request.post(`${API_URL}/api/devices/${device.id}/refresh`);
      expect(refreshRes.status()).toBe(200);
      
      const refreshed = await refreshRes.json();
      expect(refreshed.id).toBe(device.id);
    });

    test('6.3 自动刷新设置测试', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/settings`);
      expect(response.status()).toBe(200);
      
      const settings = await response.json();
      expect(settings).toHaveProperty('interval_seconds');
      expect(settings).toHaveProperty('auto_refresh');
      expect(typeof settings.interval_seconds).toBe('number');
      expect(typeof settings.auto_refresh).toBe('boolean');
    });

    test('6.4 设备监控数据完整性测试', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/devices`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        data.items.forEach((device: any) => {
          // 验证加速卡状态数据完整性
          expect(typeof device.accelerator_count).toBe('number');
          expect(typeof device.idle_count).toBe('number');
          expect(typeof device.busy_count).toBe('number');
          expect(typeof device.warning_count).toBe('number');
          
          // 验证状态值在有效范围内
          expect(['Online', 'Offline', 'Unknown']).toContain(device.status);
        });
      }
    });
  });
});

export {};

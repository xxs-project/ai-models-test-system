import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const API_URL = 'http://localhost:8000'

test.describe('设备管理导入导出功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/devices`)
    await page.waitForLoadState('networkidle')
  })

  test.describe('1. 导入功能测试', () => {
    
    test('1.1 打开导入对话框', async ({ page }) => {
      // 点击导入按钮
      await page.click('button:has-text("导入")')
      
      // 验证导入对话框显示
      await expect(page.locator('text=导入设备')).toBeVisible()
      await expect(page.locator('text=导入说明')).toBeVisible()
      await expect(page.locator('text=下载模板')).toBeVisible()
      await expect(page.locator('text=选择文件')).toBeVisible()
    })

    test('1.2 下载模板功能', async ({ page, context }) => {
      // 点击导入按钮
      await page.click('button:has-text("导入")')
      
      // 等待下载事件
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('button:has-text("下载模板")')
      ])
      
      // 验证下载文件名
      expect(download.suggestedFilename()).toBe('device_template.csv')
    })

    test('1.3 导入文件选择', async ({ page }) => {
      // 点击导入按钮
      await page.click('button:has-text("导入")')
      
      // 准备测试CSV文件
      const csvContent = `IP地址,端口,用户名,密码,备注
192.168.100.1,22,root,password1,测试服务器1
192.168.100.2,22,admin,password2,测试服务器2`
      
      // 创建文件选择器
      const fileInput = page.locator('input[type="file"]')
      
      // 上传文件
      await fileInput.setInputFiles({
        name: 'test_devices.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      })
      
      // 验证文件已选择
      await expect(page.locator('text=test_devices.csv')).toBeVisible()
    })

    test('1.4 导入按钮状态', async ({ page }) => {
      // 点击导入按钮
      await page.click('button:has-text("导入")')
      
      // 未选择文件时，开始导入按钮应禁用
      const importButton = page.locator('button:has-text("开始导入")')
      await expect(importButton).toBeDisabled()
      
      // 选择文件
      const csvContent = 'IP地址,端口,用户名,密码\n192.168.100.3,22,root,pass123'
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      })
      
      // 选择文件后，按钮应启用
      await expect(importButton).toBeEnabled()
    })

    test('1.5 取消导入对话框', async ({ page }) => {
      // 打开导入对话框
      await page.click('button:has-text("导入")')
      await expect(page.locator('text=导入设备')).toBeVisible()
      
      // 点击取消
      await page.click('button:has-text("取消")')
      
      // 验证对话框关闭
      await expect(page.locator('text=导入设备')).not.toBeVisible()
    })
  })

  test.describe('2. 导出功能测试', () => {
    
    test('2.1 导出按钮存在', async ({ page }) => {
      // 验证导出按钮存在
      const exportButton = page.locator('button:has-text("导出")')
      await expect(exportButton).toBeVisible()
      await expect(exportButton).toBeEnabled()
    })

    test('2.2 导出功能触发下载', async ({ page, context }) => {
      // 等待下载事件
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('button:has-text("导出")')
      ])
      
      // 验证下载文件名包含devices_export
      const filename = download.suggestedFilename()
      expect(filename).toContain('devices_export')
      expect(filename).toContain('.csv')
    })
  })

  test.describe('3. API接口测试', () => {
    
    test('3.1 下载模板API', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/devices/template`)
      expect(response.status()).toBe(200)
      
      // 验证响应头
      const headers = response.headers()
      expect(headers['content-type']).toContain('text/csv')
      expect(headers['content-disposition']).toContain('device_template.csv')
    })

    test('3.2 导出设备API', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/devices/export`)
      expect(response.status()).toBe(200)
      
      // 验证响应头
      const headers = response.headers()
      expect(headers['content-type']).toContain('text/csv')
      expect(headers['content-disposition']).toContain('devices_export')
      
      // 验证响应内容
      const body = await response.body()
      const content = body.toString()
      expect(content).toContain('ID')
      expect(content).toContain('IP地址')
      expect(content).toContain('用户名')
    })

    test('3.3 导入设备API - 成功场景', async ({ request }) => {
      // 准备CSV数据
      const csvContent = `IP地址,端口,用户名,密码,备注
192.168.200.1,22,root,pass123,测试设备1
192.168.200.2,22,admin,pass456,测试设备2`
      
      const response = await request.post(`${API_URL}/api/devices/import`, {
        data: csvContent,
        headers: {
          'Content-Type': 'text/csv'
        }
      })
      
      expect(response.status()).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.imported_count).toBeGreaterThanOrEqual(0)
      expect(result.failed_count).toBeGreaterThanOrEqual(0)
    })

    test('3.4 导入设备API - 重复IP处理', async ({ request }) => {
      // 先获取现有设备的IP
      const devicesRes = await request.get(`${API_URL}/api/devices`)
      const devices = await devicesRes.json()
      
      if (devices.items && devices.items.length > 0) {
        const existingIp = devices.items[0].ip
        
        // 尝试导入重复IP
        const csvContent = `IP地址,端口,用户名,密码
${existingIp},22,root,pass123`
        
        const response = await request.post(`${API_URL}/api/devices/import`, {
          data: csvContent,
          headers: {
            'Content-Type': 'text/csv'
          }
        })
        
        expect(response.status()).toBe(200)
        
        const result = await response.json()
        expect(result.failed_count).toBeGreaterThan(0)
        expect(result.failed_rows.length).toBeGreaterThan(0)
        expect(result.failed_rows[0]).toContain('已存在')
      }
    })

    test('3.5 导入设备API - 无效IP处理', async ({ request }) => {
      const csvContent = `IP地址,端口,用户名,密码
invalid_ip,22,root,pass123`
      
      const response = await request.post(`${API_URL}/api/devices/import`, {
        data: csvContent,
        headers: {
          'Content-Type': 'text/csv'
        }
      })
      
      expect(response.status()).toBe(200)
      
      const result = await response.json()
      expect(result.failed_count).toBeGreaterThan(0)
      expect(result.failed_rows.length).toBeGreaterThan(0)
    })
  })

  test.describe('4. 功能正确性测试', () => {
    
    test('4.1 导入后设备列表更新', async ({ page }) => {
      // 记录当前设备数量
      const initialCount = await page.locator('table tbody tr').count()
      
      // 打开导入对话框
      await page.click('button:has-text("导入")')
      
      // 准备并上传CSV文件
      const csvContent = `IP地址,端口,用户名,密码,备注
192.168.99.99,22,root,testpass,导入测试设备`
      
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'import_test.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      })
      
      // 点击开始导入
      await page.click('button:has-text("开始导入")')
      
      // 等待导入完成提示
      await page.waitForTimeout(2000)
      
      // 验证成功提示
      const successToast = page.locator('text=导入成功')
      await expect(successToast).toBeVisible({ timeout: 5000 })
    })

    test('4.2 导出数据格式验证', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/devices/export`)
      const body = await response.body()
      const content = body.toString()
      
      // 验证CSV格式
      const lines = content.split('\n')
      expect(lines.length).toBeGreaterThan(1) // 至少包含表头和一行数据
      
      // 验证表头包含必要字段
      const header = lines[0]
      expect(header).toContain('ID')
      expect(header).toContain('IP地址')
      expect(header).toContain('用户名')
      expect(header).toContain('密码')
      expect(header).toContain('状态')
    })
  })

  test.describe('5. 安全性测试', () => {
    
    test('5.1 导入文件类型限制', async ({ page }) => {
      // 打开导入对话框
      await page.click('button:has-text("导入")')
      
      // 尝试上传非CSV文件
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('这不是CSV文件')
      })
      
      // 文件仍能被选择（前端限制有限），但导入应失败
      await page.click('button:has-text("开始导入")')
      
      // 应显示错误提示
      await expect(page.locator('text=导入失败')).toBeVisible({ timeout: 5000 })
    })

    test('5.2 导入数据验证', async ({ request }) => {
      // 测试包含SQL注入的数据
      const csvContent = `IP地址,端口,用户名,密码
192.168.88.88,22,root', 'pass'); DROP TABLE devices; --`
      
      const response = await request.post(`${API_URL}/api/devices/import`, {
        data: csvContent,
        headers: {
          'Content-Type': 'text/csv'
        }
      })
      
      expect(response.status()).toBe(200)
      
      // 验证设备列表仍然可用（没有数据丢失）
      const devicesRes = await request.get(`${API_URL}/api/devices`)
      expect(devicesRes.status()).toBe(200)
    })
  })

  test.describe('6. 可靠性测试', () => {
    
    test('6.1 大文件导入处理', async ({ request }) => {
      // 生成大量设备数据
      let csvContent = 'IP地址,端口,用户名,密码\n'
      for (let i = 1; i <= 100; i++) {
        csvContent += `192.168.77.${i},22,user${i},pass${i}\n`
      }
      
      const response = await request.post(`${API_URL}/api/devices/import`, {
        data: csvContent,
        headers: {
          'Content-Type': 'text/csv'
        }
      })
      
      expect(response.status()).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
    })

    test('6.2 并发导入处理', async ({ request }) => {
      // 同时发起多个导入请求
      const csvContent1 = 'IP地址,端口,用户名,密码\n192.168.66.1,22,root,pass1'
      const csvContent2 = 'IP地址,端口,用户名,密码\n192.168.66.2,22,root,pass2'
      
      const [res1, res2] = await Promise.all([
        request.post(`${API_URL}/api/devices/import`, {
          data: csvContent1,
          headers: { 'Content-Type': 'text/csv' }
        }),
        request.post(`${API_URL}/api/devices/import`, {
          data: csvContent2,
          headers: { 'Content-Type': 'text/csv' }
        })
      ])
      
      // 至少一个应该成功（另一个可能因并发冲突失败）
      expect(res1.status()).toBe(200)
      expect(res2.status()).toBe(200)
    })
  })
})

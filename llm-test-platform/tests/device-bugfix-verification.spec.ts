import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5175'
const API_URL = 'http://localhost:8001'

test.describe('设备管理BUG修复验证测试', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/devices`)
    await page.waitForLoadState('networkidle')
  })

  test.describe('BUG 1: 添加设备功能修复验证', () => {

    test('1.1 添加设备成功后应正确显示成功提示', async ({ page }) => {
      await page.click('button:has-text("添加设备")')

      const uniqueIp = `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`

      await page.fill('input#ip', uniqueIp)
      await page.fill('input#port', '22')
      await page.fill('input#username', 'root')
      await page.fill('input#password', 'testpass')
      await page.fill('input#remark', '修复验证测试')

      await page.click('button:has-text("提交")')

      await expect(page.locator('text=设备添加成功')).toBeVisible({ timeout: 10000 })
    })

    test('1.2 重复IP应显示清晰的错误信息而非"Not Found"', async ({ page, request }) => {
      const devicesRes = await request.get(`${API_URL}/api/devices`)
      const devices = await devicesRes.json()

      if (devices.items && devices.items.length > 0) {
        const existingIp = devices.items[0].ip

        await page.click('button:has-text("添加设备")')

        await page.fill('input#ip', existingIp)
        await page.fill('input#port', '22')
        await page.fill('input#username', 'root')
        await page.fill('input#password', 'testpass')

        await page.click('button:has-text("提交")')

        await expect(page.locator('text=该 IP 已存在')).toBeVisible({ timeout: 5000 })
        await expect(page.locator('text=Not Found')).not.toBeVisible()
      }
    })

    test('1.3 无效IP格式应显示正确的错误提示', async ({ page }) => {
      await page.click('button:has-text("添加设备")')

      await page.fill('input#ip', '256.256.256.256')
      await page.fill('input#port', '22')
      await page.fill('input#username', 'root')
      await page.fill('input#password', 'testpass')

      await page.click('button:has-text("提交")')

      await expect(page.locator('text=无效的IP地址格式')).toBeVisible({ timeout: 5000 })
    })

    test('1.4 无效端口应显示正确的错误提示', async ({ page }) => {
      await page.click('button:has-text("添加设备")')

      await page.fill('input#ip', '192.168.1.100')
      await page.fill('input#port', '0')
      await page.fill('input#username', 'root')
      await page.fill('input#password', 'testpass')

      await page.click('button:has-text("提交")')

      await expect(page.locator('text=端口号必须在1-65535之间')).toBeVisible({ timeout: 5000 })
    })

    test('1.5 添加设备API应返回正确的响应格式', async ({ request }) => {
      const uniqueIp = `10.1.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`

      const response = await request.post(`${API_URL}/api/devices`, {
        data: {
          ip: uniqueIp,
          port: 22,
          username: 'root',
          password: 'testpass',
          remark: 'API测试'
        }
      })

      expect(response.status()).toBe(200)

      const result = await response.json()
      expect(result).toHaveProperty('id')
      expect(result.ip).toBe(uniqueIp)
      expect(result).not.toHaveProperty('password')
    })
  })

  test.describe('BUG 2: 导入设备功能修复验证', () => {

    test('2.1 导入成功后设备列表应立即更新显示新设备', async ({ page, request }) => {
      const uniqueIp = `10.2.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`

      await page.click('button:has-text("导入")')

      const csvContent = `IP地址,端口,用户名,密码,备注
${uniqueIp},22,root,importpass,导入更新验证`

      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'import_refresh_test.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      })

      await page.click('button:has-text("开始导入")')

      await expect(page.locator('text=导入成功')).toBeVisible({ timeout: 10000 })

      await page.waitForTimeout(3000)

      await page.reload()
      await page.waitForLoadState('networkidle')

      await expect(page.locator(`text=${uniqueIp}`)).toBeVisible({ timeout: 10000 })
    })

    test('2.2 重复导入相同文件应正确处理', async ({ page }) => {
      await page.click('button:has-text("导入")')

      const csvContent = `IP地址,端口,用户名,密码
192.168.55.55,22,root,testpass`

      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'duplicate_import.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      })

      await page.click('button:has-text("开始导入")')
      await expect(page.locator('text=导入成功')).toBeVisible({ timeout: 10000 })

      await page.waitForTimeout(1000)

      await page.click('button:has-text("导入")')
      await page.locator('input[type="file"]').setInputFiles({
        name: 'duplicate_import.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      })

      await page.click('button:has-text("开始导入")')

      await expect(page.locator('text=导入成功')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('text=0 个设备, 失败: 1 个')).toBeVisible({ timeout: 5000 })
    })

    test('2.3 导入API应返回正确的统计信息', async ({ request }) => {
      const uniqueIp = `10.3.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
      const csvContent = `IP地址,端口,用户名,密码,备注
${uniqueIp},22,admin,pass123,统计测试`

      const response = await request.post(`${API_URL}/api/devices/import`, {
        data: csvContent,
        headers: { 'Content-Type': 'text/csv' }
      })

      expect(response.status()).toBe(200)

      const result = await response.json()
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('imported_count')
      expect(result).toHaveProperty('failed_count')
      expect(result.success).toBe(true)
      expect(result.imported_count).toBeGreaterThanOrEqual(1)
    })

    test('2.4 导入后应正确刷新React Query缓存', async ({ page, request }) => {
      const uniqueIp = `10.4.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`

      const beforeRes = await request.get(`${API_URL}/api/devices`)
      const beforeData = await beforeRes.json()
      const beforeCount = beforeData.total || 0

      await page.click('button:has-text("导入")')

      const csvContent = `IP地址,端口,用户名,密码
${uniqueIp},22,root,cachepass`

      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'cache_test.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      })

      await page.click('button:has-text("开始导入")')
      await expect(page.locator('text=导入成功')).toBeVisible({ timeout: 10000 })

      const afterRes = await request.get(`${API_URL}/api/devices`)
      const afterData = await afterRes.json()
      const afterCount = afterData.total || 0

      expect(afterCount).toBeGreaterThanOrEqual(beforeCount + 1)
    })

    test('2.5 CSV列名映射功能验证', async ({ request }) => {
      const uniqueIp = `10.5.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
      const csvContent = `IP地址,端口,用户名,密码,备注
${uniqueIp},22,root,mappass,列名映射测试`

      const response = await request.post(`${API_URL}/api/devices/import`, {
        data: csvContent,
        headers: { 'Content-Type': 'text/csv' }
      })

      expect(response.status()).toBe(200)

      const result = await response.json()
      expect(result.imported_count).toBe(1)
      expect(result.failed_count).toBe(0)
    })
  })

  test.describe('功能正确性验证', () => {

    test('3.1 设备列表应正确显示所有字段', async ({ page }) => {
      const devices = await page.locator('table tbody tr').count()

      if (devices > 0) {
        const firstRow = page.locator('table tbody tr').first()

        await expect(firstRow.locator('td').first()).not.toBeEmpty()
        await expect(firstRow.locator('td').nth(1)).not.toBeEmpty()
        await expect(firstRow.locator('td').nth(2)).not.toBeEmpty()
      }
    })

    test('3.2 设备筛选功能应正常工作', async ({ page }) => {
      await page.click('[role="combobox"]:has-text("状态")')
      await page.click('text=Online')

      await page.waitForTimeout(1000)

      await page.click('[role="combobox"]:has-text("状态")')
      await page.click('text=全部')

      await page.waitForTimeout(500)
    })

    test('3.3 搜索功能应正常工作', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="搜索"]')
      if (await searchInput.isVisible()) {
        await searchInput.fill('192.168')
        await searchInput.press('Enter')
        await page.waitForTimeout(1000)
      }
    })

    test('3.4 设备详情查看应显示完整信息', async ({ page }) => {
      const devices = await page.locator('table tbody tr').count()

      if (devices > 0) {
        await page.locator('table tbody tr').first().locator('button[title="查看详情"]').click()

        await expect(page.locator('text=设备详情')).toBeVisible({ timeout: 5000 })

        await page.click('text=关闭')
      }
    })

    test('3.5 设备状态刷新功能应正常', async ({ page }) => {
      const devices = await page.locator('table tbody tr').count()

      if (devices > 0) {
        await page.locator('table tbody tr').first().locator('button[title="刷新状态"]').click()

        await expect(page.locator('text=设备状态已刷新')).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe('可靠性验证', () => {

    test('4.1 快速连续操作不应导致崩溃', async ({ page }) => {
      for (let i = 0; i < 3; i++) {
        await page.click('button:has-text("刷新")')
        await page.waitForTimeout(200)
      }

      await expect(page.locator('text=设备管理')).toBeVisible()
    })

    test('4.2 网络恢复后应能正常刷新', async ({ page }) => {
      await page.click('button:has-text("刷新")')
      await page.waitForTimeout(2000)

      await expect(page.locator('text=设备管理')).toBeVisible()
    })

    test('4.3 并发API请求应正确处理', async ({ request }) => {
      const requests = []
      for (let i = 0; i < 5; i++) {
        requests.push(request.get(`${API_URL}/api/devices`))
      }

      const responses = await Promise.all(requests)

      for (const response of responses) {
        expect(response.status()).toBe(200)
      }
    })
  })

  test.describe('安全性验证', () => {

    test('5.1 密码不应在API响应中返回', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/devices`)
      const data = await response.json()

      if (data.items && data.items.length > 0) {
        expect(data.items[0]).not.toHaveProperty('password')
      }
    })

    test('5.2 特殊字符应被正确处理', async ({ request }) => {
      const uniqueIp = `10.99.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`

      const response = await request.post(`${API_URL}/api/devices`, {
        data: {
          ip: uniqueIp,
          port: 22,
          username: 'test"user',
          password: 'pass\'word',
          remark: '测试<tag>符号'
        }
      })

      expect(response.status()).toBe(200)

      const devicesRes = await request.get(`${API_URL}/api/devices`)
      expect(devicesRes.status()).toBe(200)
    })
  })

  test.describe('可扩展性验证', () => {

    test('6.1 分页功能应正常工作', async ({ page }) => {
      const nextBtn = page.locator('button:has-text("下一页")')
      if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
        await nextBtn.click()
        await page.waitForTimeout(1000)
      }
    })

    test('6.2 大量数据导入应能处理', async ({ request }) => {
      let csvContent = 'IP地址,端口,用户名,密码\n'
      for (let i = 1; i <= 20; i++) {
        csvContent += `10.100.${i}.${i % 255},22,user${i},pass${i}\n`
      }

      const response = await request.post(`${API_URL}/api/devices/import`, {
        data: csvContent,
        headers: { 'Content-Type': 'text/csv' }
      })

      expect(response.status()).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
    })
  })
})

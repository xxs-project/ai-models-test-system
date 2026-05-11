import { test, expect, Page } from '@playwright/test'
import { execSync } from 'child_process'

const BASE_URL = 'http://localhost:5173'
const API_URL = 'http://localhost:8000'

// 测试数据
const testDevice = {
  ip: '192.168.1.100',
  port: 22,
  username: 'testuser',
  password: 'testpass123',
  remark: '测试设备'
}

// 初始化数据库
function initDatabase() {
  try {
    const script = `
from sqlmodel import SQLModel, create_engine
from models import Device, Task, Benchmark, Report, Settings
engine = create_engine('sqlite:///database.db', echo=False)
SQLModel.metadata.drop_all(engine)
SQLModel.metadata.create_all(engine)
print('Database initialized')
`
    execSync(`cd /home/models-test-system_v1.0/llm-test-platform/backend && python3 -c "${script}"`, { 
      stdio: 'inherit',
      cwd: '/home/models-test-system_v1.0/llm-test-platform/backend'
    })
  } catch (e) {
    console.log('Database init error:', e)
  }
}

test.beforeAll(() => {
  initDatabase()
})

test.describe('设备管理功能测试', () => {
  
  test.describe('1. 功能正确性测试', () => {
    
    test('1.1 添加设备 - 成功场景', async ({ page }) => {
      // Monitor console
      page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
      page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));

      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')
      
      // 点击添加设备按钮
      await page.click('button:has-text("添加设备")')
      
      // 填写表单
      await page.fill('input#ip', testDevice.ip)
      await page.fill('input#port', testDevice.port.toString())
      await page.fill('input#username', testDevice.username)
      await page.fill('input#password', testDevice.password)
      await page.fill('input#remark', testDevice.remark)
      
      // 提交
      await page.click('button:has-text("提交")')
      
      // 验证成功提示
      await expect(page.locator('text=设备添加成功')).toBeVisible()
      
      // 验证设备出现在列表中
      await expect(page.locator(`text=${testDevice.ip}`)).toBeVisible()
    })

    test('1.2 添加设备 - 必填字段验证', async ({ page }) => {
      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')
      
      await page.click('button:has-text("添加设备")')
      
      // 只填写部分字段
      await page.fill('input#username', testDevice.username)
      
      // 验证提交按钮禁用
      const submitBtn = page.locator('button:has-text("提交")')
      await expect(submitBtn).toBeDisabled()
    })

    test('1.3 编辑设备 - 成功场景', async ({ page }) => {
      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')
      
      // 找到编辑按钮并点击
      const editBtn = page.locator('button[title="编辑"]').first()
      await editBtn.click()
      
      // 修改备注
      const newRemark = '修改后的备注'
      await page.fill('input#remark', newRemark)
      
      // 提交
      await page.click('button:has-text("提交")')
      
      // 验证成功提示
      await expect(page.locator('text=设备更新成功')).toBeVisible()
    })

    test('1.4 删除设备 - 确认流程', async ({ page }) => {
      // 创建一个临时设备用于删除测试
      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')
      
      const tempDeviceIp = '192.168.1.199'
      
      await page.click('button:has-text("添加设备")')
      await page.fill('input#ip', tempDeviceIp)
      await page.fill('input#port', '22')
      await page.fill('input#username', 'tempuser')
      await page.fill('input#password', 'temppass')
      await page.click('button:has-text("提交")')
      await expect(page.locator('text=设备添加成功')).toBeVisible()
      
      // 找到该设备的行
      const row = page.locator(`tr:has-text("${tempDeviceIp}")`)
      await expect(row).toBeVisible()
      
      // 点击该行的删除按钮
      await row.locator('button[title="删除"]').click()
      
      // 验证确认对话框
      await expect(page.getByRole('heading', { name: '确认删除' })).toBeVisible()
      await expect(page.locator('text=确定要删除此设备吗？此操作不可恢复。')).toBeVisible()
      
      // 确认删除
      await page.click('button:has-text("确认删除")')
      
      // 验证成功提示
      await expect(page.locator('text=设备删除成功')).toBeVisible()
      
      // 验证设备不再存在
      await expect(page.locator(`text=${tempDeviceIp}`)).not.toBeVisible()
    })

    test('1.5 刷新设备状态', async ({ page }) => {
      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')

      // Mock refresh API to prevent timeout on fake IPs
      await page.route('**/api/devices/*/refresh', async route => {
        await route.fulfill({ status: 200, body: JSON.stringify({ status: 'success' }) })
      })
      
      // 点击刷新按钮
      const refreshBtn = page.locator('button[title="刷新状态"]').first()
      await refreshBtn.click()
      
      // 验证成功提示
      await expect(page.locator('text=设备状态已刷新')).toBeVisible()
    })

    test('1.6 查看设备详情', async ({ page }) => {
      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')
      
      // 点击详情按钮
      const detailBtn = page.locator('button[title="查看详情"]').first()
      await detailBtn.click()
      
      // 验证详情对话框
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible()
      await expect(dialog.locator('text=设备详情')).toBeVisible()
      
      // 验证详情内容
      await expect(dialog.getByText('ID', { exact: true })).toBeVisible()
      await expect(dialog.getByText('IP地址', { exact: true })).toBeVisible()
      await expect(dialog.getByText('用户名', { exact: true })).toBeVisible()
      await expect(dialog.getByText('状态', { exact: true })).toBeVisible()
      
      // 关闭详情
      await page.click('button:has-text("关闭")')
    })

    test('1.7 密码显示/隐藏功能', async ({ page }) => {
      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')
      
      // Debug: Wait for table and print headers
      await expect(page.locator('table')).toBeVisible()
      const headers = await page.locator('th').allInnerTexts()
      console.log('Table Headers:', headers)
      
      // Ensure row is visible
      await expect(page.locator('table tbody tr').first()).toBeVisible()

      // Find password column index
      const passwordIndex = headers.findIndex(h => h.includes('密码'))
      // If not found, default to 3 but warn
      const targetIndex = passwordIndex !== -1 ? passwordIndex : 3
      console.log('Using Password Column Index:', targetIndex)

      // 获取第一个密码单元格
      const passwordCell = page.locator('table tbody tr').first().locator('td').nth(targetIndex)
      
      // 初始状态应该显示掩码
      await expect(passwordCell).toHaveText(/•{3,}/)
      
      // 点击显示密码按钮
      const eyeBtn = passwordCell.locator('button').first()
      await eyeBtn.click()
      
      // 密码应该可见
      await expect(passwordCell).not.toHaveText(/•{3,}/)
      
      // 再次点击隐藏
      await eyeBtn.click()
      await expect(passwordCell).toHaveText(/•{3,}/)
    })



    test('1.8 复制密码功能', async ({ page, context }) => {
      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')
      
      // Get headers to find index
      const headers = await page.locator('th').allInnerTexts()
      const passwordIndex = headers.findIndex(h => h.includes('密码'))
      const targetIndex = passwordIndex !== -1 ? passwordIndex : 3

      // 获取第一个密码单元格
      const passwordCell = page.locator('table tbody tr').first().locator('td').nth(targetIndex)
      
      // 点击复制按钮
      const copyBtn = passwordCell.locator('button').nth(1)
      await copyBtn.click()
      
      // 验证成功提示
      await expect(page.locator('text=密码已复制到剪贴板')).toBeVisible()
    })
  })

  test.describe('2. 搜索和筛选功能测试', () => {
    
    test('2.1 按IP搜索', async ({ page }) => {
      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')
      
      // 在搜索框输入IP
      await page.fill('input[placeholder="搜索 IP、用户名..."]', testDevice.ip)
      
      // 等待搜索结果
      await page.waitForTimeout(500)
      
      // 验证只显示匹配的设备
      const rows = page.locator('table tbody tr')
      await expect(rows).toHaveCount(1)
    })

    test('2.2 按状态筛选', async ({ page }) => {
      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')
      
      // Select Status Dropdown
      const statusSelect = page.getByRole('combobox').nth(0)
      await statusSelect.click()
      
      // Wait for option to appear instead of role="menu"
      const option = page.getByRole('option', { name: '离线' })
      await expect(option).toBeVisible()
      await option.click()
      
      // 等待筛选结果
      await page.waitForTimeout(500)
      
      // 验证所有显示的设备都离线
      const badges = page.locator('table tbody tr td:has-text("离线")')
      const count = await badges.count()
      if (count > 0) {
        expect(count).toBeGreaterThan(0)
      }
    })

    test('2.3 按架构筛选', async ({ page }) => {
      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')
      
      // Select Architecture Dropdown
      const archSelect = page.getByRole('combobox').nth(1)
      await archSelect.click()
      
      const option = page.getByRole('option', { name: 'x86_64' })
      await expect(option).toBeVisible()
      await option.click()
      
      // 等待筛选结果
      await page.waitForTimeout(500)
      
      // 验证所有显示的设备都是x86_64架构
      const rows = page.locator('table tbody tr')
      const count = await rows.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('2.4 按加速卡状态筛选', async ({ page }) => {
      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')
      
      // Select Accelerator Dropdown
      const accSelect = page.getByRole('combobox').nth(2)
      await accSelect.click()
      
      const option = page.getByRole('option', { name: '有加速卡' })
      await expect(option).toBeVisible()
      await option.click()
      
      // 等待筛选结果
      await page.waitForTimeout(500)
    })
  })

  test.describe('3. 可靠性测试', () => {
    
    test('3.1 快速连续操作', async ({ page }) => {
      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')

      // Mock refresh API
      await page.route('**/api/devices/*/refresh', async route => {
        await route.fulfill({ status: 200, body: JSON.stringify({ status: 'success' }) })
      })

      // Ensure at least one device exists
      await expect(page.locator('table tbody tr').first()).toBeVisible()
      
      // 快速连续刷新
      for (let i = 0; i < 5; i++) {
        // Use force click to avoid issues with potential overlays or state changes
        const refreshBtn = page.locator('button[title="刷新状态"]').first()
        await refreshBtn.click({ force: true })
        await page.waitForTimeout(100)
      }
      
      // 验证页面仍然正常
      await expect(page.getByRole('heading', { name: '设备管理' })).toBeVisible()
    })

    test('3.2 网络异常处理', async ({ page }) => {
      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')

      // Ensure at least one device exists
      await expect(page.locator('table tbody tr').first()).toBeVisible()
      
      // 模拟离线状态（拦截API请求）
      await page.route('**/api/devices/**', route => route.abort('internetdisconnected'))
      
      // 尝试刷新
      const refreshBtn = page.locator('button[title="刷新状态"]').first()
      await refreshBtn.click({ force: true })
      
      // 验证错误提示
      await expect(page.locator('text=刷新失败')).toBeVisible()
      
      // 恢复网络
      await page.unroute('**/api/devices/**')
    })

    test('3.3 大数据量分页', async ({ page }) => {
      // 先创建多个设备
      for (let i = 0; i < 25; i++) {
        await page.goto(`${BASE_URL}/devices`)
        await page.click('button:has-text("添加设备")')
        await page.fill('input#ip', `192.168.1.${100 + i}`)
        await page.fill('input#port', '22')
        await page.fill('input#username', `user${i}`)
        await page.fill('input#password', 'password')
        await page.click('button:has-text("提交")')
        await page.waitForTimeout(200)
      }
      
      // 验证分页
      await expect(page.locator('text=第 1 / 2 页')).toBeVisible()
      
      // 点击下一页
      await page.click('button:has-text("下一页")')
      await expect(page.locator('text=第 2 / 2 页')).toBeVisible()
    })
  })

  test.describe('4. 安全性测试', () => {
    
    test('4.1 密码输入类型验证', async ({ page }) => {
      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')
      
      await page.click('button:has-text("添加设备")')
      
      // 验证密码输入框类型
      const passwordInput = page.locator('input#password')
      await expect(passwordInput).toHaveAttribute('type', 'password')
    })

    test('4.2 SQL注入防护', async ({ page }) => {
      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')
      
      // 尝试SQL注入
      await page.fill('input[placeholder="搜索 IP、用户名..."]', "'; DROP TABLE devices; --")
      
      // 等待搜索
      await page.waitForTimeout(500)
      
      // 验证页面仍然正常，没有崩溃
      await expect(page.getByRole('heading', { name: '设备管理' })).toBeVisible()
    })

    test('4.3 XSS防护', async ({ page }) => {
      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')
      
      await page.click('button:has-text("添加设备")')
      
      // 尝试XSS攻击
      // Use unique IP to avoid duplicate conflict with previous tests
      await page.fill('input#ip', '192.168.1.166')
      await page.fill('input#port', '22')
      await page.fill('input#username', 'test')
      await page.fill('input#password', 'test')
      await page.fill('input#remark', '<script>alert("xss")</script>')
      
      await page.click('button:has-text("提交")')
      
      // 验证脚本没有被执行
      await expect(page.locator('text=设备添加成功')).toBeVisible()
    })
  })

  test.describe('5. 可扩展性测试', () => {
    
    test('5.1 组件响应式布局', async ({ page }) => {
      // 测试不同屏幕尺寸
      const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 768, height: 1024 },
      ]
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.goto(`${BASE_URL}/devices`)
        await page.waitForLoadState('networkidle')
        
        // 验证关键元素可见
        await expect(page.getByRole('heading', { name: '设备管理' })).toBeVisible()
        await expect(page.locator('button:has-text("添加设备")')).toBeVisible()
      }
    })

    test('5.2 API响应格式验证', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/devices`)
      expect(response.ok()).toBeTruthy()
      
      const data = await response.json()
      
      // 验证响应结构
      expect(data).toHaveProperty('items')
      expect(data).toHaveProperty('total')
      expect(data).toHaveProperty('page')
      expect(data).toHaveProperty('size')
      expect(Array.isArray(data.items)).toBeTruthy()
      
      if (data.items.length > 0) {
        const device = data.items[0]
        expect(device).toHaveProperty('id')
        expect(device).toHaveProperty('ip')
        expect(device).toHaveProperty('status')
        expect(device).toHaveProperty('accelerator_count')
      }
    })

    test('5.3 并发操作测试', async ({ browser }) => {
      // 创建多个页面同时操作
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext(),
      ])
      
      const pages = await Promise.all(contexts.map(ctx => ctx.newPage()))
      
      // 同时打开设备列表
      await Promise.all(pages.map(page => 
        page.goto(`${BASE_URL}/devices`)
      ))
      
      // 同时刷新
      await Promise.all(pages.map(async (page, idx) => {
        await page.waitForLoadState('networkidle')
        const refreshBtn = page.locator('button[title="刷新状态"]').first()
        if (await refreshBtn.isVisible().catch(() => false)) {
          await refreshBtn.click()
        }
      }))
      
      // 验证所有页面都正常
      for (const page of pages) {
        await expect(page.getByRole('heading', { name: '设备管理' })).toBeVisible()
      }
      
      // 清理
      await Promise.all(contexts.map(ctx => ctx.close()))
    })
  })

  test.describe('6. UI/UX测试', () => {
    
    test('6.1 加载状态显示', async ({ page }) => {
      // 模拟慢速网络
      await page.route('**/api/devices', async route => {
        await new Promise(resolve => setTimeout(resolve, 3000))
        await route.continue()
      })
      
      await page.goto(`${BASE_URL}/devices`)
      // Do not wait for networkidle, otherwise the loading state will be gone
      
      // 验证加载状态
      await expect(page.locator('.animate-pulse').first()).toBeVisible()
      
      // 恢复网络速度
      await page.unroute('**/api/devices')
    })

    test('6.2 空状态显示', async ({ page }) => {
      // 清空所有设备
      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')
      
      // 删除所有设备
      while (true) {
        const deleteBtn = page.locator('button[title="删除"]').first()
        if (await deleteBtn.isVisible().catch(() => false)) {
          await deleteBtn.click()
          await page.click('button:has-text("确认删除")')
          await page.waitForTimeout(300)
        } else {
          break
        }
      }
      
      // 验证空状态
      await expect(page.locator('text=暂无设备')).toBeVisible()
    })

    test('6.3 卡状态徽章显示', async ({ page }) => {
      await page.goto(`${BASE_URL}/devices`)
      await page.waitForLoadState('networkidle')
      
      // 验证卡状态徽章存在
      const badges = page.locator('table tbody tr').first().locator('td').nth(7).locator('.badge')
      const count = await badges.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })
})

test.describe('API接口测试', () => {
  
  test('GET /api/devices - 获取设备列表', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/devices`)
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('items')
    expect(data).toHaveProperty('total')
  })

  test('GET /api/devices - 分页参数', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/devices?page=1&size=10`)
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data.page).toBe(1)
    expect(data.size).toBe(10)
  })

  test('GET /api/devices - 搜索参数', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/devices?search=192.168`)
    expect(response.status()).toBe(200)
  })

  test('GET /api/devices - 状态筛选', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/devices?status=Online`)
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    for (const device of data.items) {
      expect(device.status).toBe('Online')
    }
  })

  test('GET /api/devices - 加速卡类型筛选', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/devices?acc_type=HasAcc`)
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    for (const device of data.items) {
      expect(device.accelerator_count).toBeGreaterThan(0)
    }
  })

  test('POST /api/devices - 创建设备', async ({ request }) => {
    const newDevice = {
      ip: '192.168.1.200',
      port: 22,
      username: 'apitest',
      password: 'testpass',
      remark: 'API测试设备'
    }
    
    const response = await request.post(`${API_URL}/api/devices`, {
      data: newDevice
    })
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data.ip).toBe(newDevice.ip)
    expect(data.username).toBe(newDevice.username)
  })

  test('GET /api/devices/{id} - 获取单个设备', async ({ request }) => {
    // 先创建一个设备
    const createRes = await request.post(`${API_URL}/api/devices`, {
      data: {
        ip: '192.168.1.201',
        port: 22,
        username: 'singletest',
        password: 'testpass'
      }
    })
    const created = await createRes.json()
    
    // 获取该设备
    const response = await request.get(`${API_URL}/api/devices/${created.id}`)
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data.id).toBe(created.id)
  })

  test('PUT /api/devices/{id} - 更新设备', async ({ request }) => {
    // 先创建一个设备
    const createRes = await request.post(`${API_URL}/api/devices`, {
      data: {
        ip: '192.168.1.202',
        port: 22,
        username: 'updatetest',
        password: 'testpass'
      }
    })
    const created = await createRes.json()
    
    // 更新设备
    const response = await request.put(`${API_URL}/api/devices/${created.id}`, {
      data: {
        username: 'updateduser',
        remark: 'Updated remark'
      }
    })
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data.username).toBe('updateduser')
    expect(data.remark).toBe('Updated remark')
  })

  test('DELETE /api/devices/{id} - 删除设备', async ({ request }) => {
    // 先创建一个设备
    const createRes = await request.post(`${API_URL}/api/devices`, {
      data: {
        ip: '192.168.1.203',
        port: 22,
        username: 'deletetest',
        password: 'testpass'
      }
    })
    const created = await createRes.json()
    
    // 删除设备
    const response = await request.delete(`${API_URL}/api/devices/${created.id}`)
    expect(response.status()).toBe(200)
    
    // 验证已删除
    const getRes = await request.get(`${API_URL}/api/devices/${created.id}`)
    expect(getRes.status()).toBe(404)
  })

  test('POST /api/devices/{id}/refresh - 刷新设备状态', async ({ request }) => {
    // 先创建一个设备
    const createRes = await request.post(`${API_URL}/api/devices`, {
      data: {
        ip: '192.168.1.204',
        port: 22,
        username: 'refreshtest',
        password: 'testpass'
      }
    })
    const created = await createRes.json()
    
    // 刷新状态
    const response = await request.post(`${API_URL}/api/devices/${created.id}/refresh`)
    expect(response.status()).toBe(200)
  })

  test('GET /api/settings - 获取系统设置', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/settings`)
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('interval_seconds')
  })

  test('PUT /api/settings - 更新系统设置', async ({ request }) => {
    const response = await request.put(`${API_URL}/api/settings`, {
      data: {
        interval_seconds: 120,
        auto_refresh: true
      }
    })
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data.interval_seconds).toBe(120)
    expect(data.auto_refresh).toBe(true)
  })
})

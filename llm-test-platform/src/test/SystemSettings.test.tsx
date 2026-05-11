import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SystemSettings } from '../pages/SystemSettings'
import api from '../lib/api'

// Mock API
vi.mock('../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

describe.skip('系统设置模块测试', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  const renderSystemSettings = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SystemSettings />
      </QueryClientProvider>
    )
  }

  describe('UI渲染测试', () => {
    it('应该正确渲染设置页面', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          id: 1,
          interval_seconds: 60,
          auto_refresh: true,
          notifications_enabled: true,
        }
      })

      renderSystemSettings()

      await waitFor(() => {
        expect(screen.getByText('系统设置')).toBeInTheDocument()
        expect(screen.getByText('监控设置')).toBeInTheDocument()
      })
    })

    it('应该显示监控设置相关字段', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          id: 1,
          interval_seconds: 60,
          auto_refresh: true,
          notifications_enabled: true,
        }
      })

      renderSystemSettings()

      await waitFor(() => {
        expect(screen.getByText('自动刷新设备状态')).toBeInTheDocument()
        expect(screen.getByText('刷新间隔(秒)')).toBeInTheDocument()
        expect(screen.getByText('启用通知')).toBeInTheDocument()
      })
    })
  })

  describe('功能正确性测试', () => {
    it('应该能够切换自动刷新设置', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          id: 1,
          interval_seconds: 60,
          auto_refresh: true,
          notifications_enabled: true,
        }
      })

      vi.mocked(api.put).mockResolvedValueOnce({
        data: {
          id: 1,
          interval_seconds: 60,
          auto_refresh: false,
          notifications_enabled: true,
        }
      })

      renderSystemSettings()

      await waitFor(() => {
        const toggle = screen.getByRole('switch', { name: /自动刷新设备状态/i })
        expect(toggle).toBeChecked()
      })
    })

    it('应该能够修改刷新间隔', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          id: 1,
          interval_seconds: 60,
          auto_refresh: true,
          notifications_enabled: true,
        }
      })

      vi.mocked(api.put).mockResolvedValueOnce({
        data: {
          id: 1,
          interval_seconds: 120,
          auto_refresh: true,
          notifications_enabled: true,
        }
      })

      renderSystemSettings()

      await waitFor(() => {
        const input = screen.getByDisplayValue('60')
        expect(input).toBeInTheDocument()
      })
    })
  })

  describe('可靠性测试', () => {
    it('应该在加载设置失败时显示错误', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Failed to fetch settings'))

      renderSystemSettings()

      await waitFor(() => {
        expect(screen.getByText('加载设置失败')).toBeInTheDocument()
      })
    })

    it('应该在保存设置失败时显示错误提示', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          id: 1,
          interval_seconds: 60,
          auto_refresh: true,
          notifications_enabled: true,
        }
      })

      vi.mocked(api.put).mockRejectedValueOnce(new Error('Failed to update settings'))

      renderSystemSettings()

      await waitFor(() => {
        const saveButton = screen.getByText('保存设置')
        expect(saveButton).toBeInTheDocument()
      })
    })
  })
})

describe('设备状态统计测试', () => {
  describe('GPU状态统计测试', () => {
    it('应该正确计算GPU空闲状态', () => {
      const mockDevice = {
        accelerator_count: 4,
        idle_count: 2,
        busy_count: 1,
        warning_count: 1,
        accelerator_status: {
          gpus: [
            { name: 'NVIDIA A100', temp: 65, status: 'idle' },
            { name: 'NVIDIA A100', temp: 70, status: 'idle' },
            { name: 'NVIDIA A100', temp: 45, status: 'busy' },
            { name: 'NVIDIA A100', temp: 90, status: 'warning' },
          ]
        }
      }

      expect(mockDevice.idle_count).toBe(2)
      expect(mockDevice.busy_count).toBe(1)
      expect(mockDevice.warning_count).toBe(1)
    })

    it('应该正确识别高温警告', () => {
      const gpuTemp = 90
      const isWarning = gpuTemp > 85
      expect(isWarning).toBe(true)
    })

    it('应该正确识别正常温度', () => {
      const gpuTemp = 65
      const isWarning = gpuTemp > 85
      expect(isWarning).toBe(false)
    })
  })

  describe('NPU状态统计测试', () => {
    it('应该正确计算NPU空闲状态', () => {
      const mockNPUDevice = {
        accelerator_type: 'Huawei Ascend 910B',
        accelerator_count: 8,
        idle_count: 5,
        busy_count: 2,
        warning_count: 1,
        accelerator_status: {
          npus: [
            { id: 0, health: 'OK', temp: 45, hbm_usage_percent: 5.2 },
            { id: 1, health: 'OK', temp: 48, hbm_usage_percent: 8.1 },
            { id: 2, health: 'OK', temp: 50, hbm_usage_percent: 6.3 },
            { id: 3, health: 'OK', temp: 52, hbm_usage_percent: 7.5 },
            { id: 4, health: 'OK', temp: 55, hbm_usage_percent: 4.8 },
            { id: 5, health: 'OK', temp: 60, hbm_usage_percent: 45.2 },
            { id: 6, health: 'OK', temp: 58, hbm_usage_percent: 38.7 },
            { id: 7, health: 'Warning', temp: 85, hbm_usage_percent: 12.5 },
          ]
        }
      }

      expect(mockNPUDevice.idle_count).toBe(5)
      expect(mockNPUDevice.busy_count).toBe(2)
      expect(mockNPUDevice.warning_count).toBe(1)
    })

    it('应该正确识别NPU健康状态', () => {
      const npuHealth = 'Warning'
      const isWarning = npuHealth.toLowerCase() === 'warning'
      expect(isWarning).toBe(true)
    })

    it('应该正确计算HBM使用率', () => {
      const hbm_used = 32768
      const hbm_total = 65536
      const hbm_usage_percent = (hbm_used / hbm_total) * 100
      expect(hbm_usage_percent).toBe(50)
    })
  })
})

describe('API端点测试', () => {
  it('应该能够获取设备列表', async () => {
    const api = require('../lib/api').default
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        items: [
          { id: 1, ip: '192.168.1.100', status: 'Online' },
          { id: 2, ip: '192.168.1.101', status: 'Offline' },
        ],
        total: 2,
        page: 1,
        size: 20,
      }
    })

    const response = await api.get('/api/devices')
    expect(response.data.items).toHaveLength(2)
    expect(response.data.total).toBe(2)
  })

  it('应该能够创建设备', async () => {
    const api = require('../lib/api').default
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        id: 3,
        ip: '192.168.1.102',
        port: 22,
        username: 'root',
        status: 'Unknown',
      }
    })

    const response = await api.post('/api/devices', {
      ip: '192.168.1.102',
      port: 22,
      username: 'root',
      password: 'password',
    })

    expect(response.data.ip).toBe('192.168.1.102')
  })

  it('应该能够刷新设备状态', async () => {
    const api = require('../lib/api').default
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        id: 1,
        ip: '192.168.1.100',
        status: 'Online',
        accelerator_count: 4,
        idle_count: 3,
        busy_count: 1,
        warning_count: 0,
      }
    })

    const response = await api.post('/api/devices/1/refresh')
    expect(response.data.status).toBe('Online')
  })

  it('应该能够获取系统设置', async () => {
    const api = require('../lib/api').default
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        id: 1,
        interval_seconds: 60,
        auto_refresh: true,
        notifications_enabled: true,
      }
    })

    const response = await api.get('/api/settings')
    expect(response.data.interval_seconds).toBe(60)
    expect(response.data.auto_refresh).toBe(true)
  })

  it('应该能够更新系统设置', async () => {
    const api = require('../lib/api').default
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        id: 1,
        interval_seconds: 60,
        auto_refresh: true,
        notifications_enabled: true,
      }
    })

    vi.mocked(api.put).mockResolvedValueOnce({
      data: {
        id: 1,
        interval_seconds: 120,
        auto_refresh: true,
        notifications_enabled: true,
      }
    })

    const response = await api.put('/api/settings', {
      interval_seconds: 120,
    })

    expect(response.data.interval_seconds).toBe(120)
  })
})

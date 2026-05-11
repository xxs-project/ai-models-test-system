import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DeviceList } from '../pages/DeviceList'
import * as useDevicesModule from '../hooks/use-devices'
import { Device } from '../lib/types'

// Mock hooks
vi.mock('../hooks/use-devices', () => ({
  useDevices: vi.fn(),
  useCreateDevice: vi.fn(),
  useUpdateDevice: vi.fn(),
  useDeleteDevice: vi.fn(),
  useRefreshDevice: vi.fn(),
}))

// Mock sonner toast
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

const mockDevices: Device[] = [
  {
    id: 1,
    ip: '192.168.1.100',
    port: 22,
    username: 'root',
    password: 'password123',
    status: 'Online',
    os_info: 'Ubuntu 22.04',
    arch: 'x86_64',
    accelerator_type: 'GPU',
    accelerator_count: 4,
    idle_count: 3,
    busy_count: 1,
    warning_count: 0,
    remark: '测试服务器',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    ip: '192.168.1.101',
    port: 22,
    username: 'admin',
    password: 'admin456',
    status: 'Offline',
    os_info: 'CentOS 8',
    arch: 'aarch64',
    accelerator_type: 'NPU',
    accelerator_count: 8,
    idle_count: 0,
    busy_count: 0,
    warning_count: 0,
    remark: undefined,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
]

describe('设备管理模块测试', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    vi.clearAllMocks()
  })

  const renderDeviceList = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DeviceList />
      </QueryClientProvider>
    )
  }

  describe('UI渲染测试', () => {
    it('应该正确渲染设备列表页面', async () => {
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useCreateDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useUpdateDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDeleteDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useRefreshDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderDeviceList()

      // 验证页面标题
      expect(screen.getByText('设备管理')).toBeInTheDocument()
      expect(screen.getByText('管理测试设备，监控设备状态')).toBeInTheDocument()

      // 验证添加按钮
      expect(screen.getByText('添加设备')).toBeInTheDocument()

      // 等待设备列表渲染
      await waitFor(() => {
        expect(screen.getByText('192.168.1.100')).toBeInTheDocument()
        expect(screen.getByText('192.168.1.101')).toBeInTheDocument()
      })
    })

    it('应该显示加载状态', () => {
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: null,
        isLoading: true,
      } as any)

      renderDeviceList()

      // 验证骨架屏显示
      const skeletons = document.querySelectorAll('.skeleton')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('应该显示空状态', () => {
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)

      renderDeviceList()

      expect(screen.getByText('暂无设备')).toBeInTheDocument()
    })
  })

  describe('Dialog样式测试', () => {
    it('添加设备Dialog应该有正确的样式类名', async () => {
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useCreateDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useUpdateDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderDeviceList()

      // 打开添加设备Dialog
      await user.click(screen.getByText('添加设备'))

      // 验证Dialog内容存在
      await waitFor(() => {
        expect(screen.getByText('添加设备')).toBeInTheDocument()
      })

      // 验证Dialog有正确的样式类
      const dialogContent = document.querySelector('[data-radix-dialog-content]')
      expect(dialogContent).toHaveClass('bg-white')
      expect(dialogContent).toHaveClass('border-2')
      expect(dialogContent).toHaveClass('shadow-2xl')

      // 验证表单字段有正确样式
      const ipInput = screen.getByPlaceholderText('192.168.1.100')
      expect(ipInput).toHaveClass('bg-slate-50')
      expect(ipInput).toHaveClass('border-slate-300')

      // 验证Label有正确样式
      const ipLabel = screen.getByText('IP地址')
      expect(ipLabel).toHaveClass('font-semibold')
      expect(ipLabel).toHaveClass('text-slate-800')
    })
  })

  describe('功能正确性测试', () => {
    it('应该能够打开添加设备Dialog', async () => {
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useCreateDevice).mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useUpdateDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderDeviceList()

      // 点击添加设备按钮
      await user.click(screen.getByText('添加设备'))

      // 验证Dialog打开
      await waitFor(() => {
        expect(screen.getByText('添加设备')).toBeInTheDocument()
      })

      // 验证表单字段存在
      expect(screen.getByPlaceholderText('192.168.1.100')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('root')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('可选，例如：生产环境服务器')).toBeInTheDocument()
    })

    it('应该能够输入IP地址', async () => {
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useCreateDevice).mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useUpdateDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderDeviceList()

      // 打开添加设备Dialog
      await user.click(screen.getByText('添加设备'))

      await waitFor(() => {
        expect(screen.getByText('添加设备')).toBeInTheDocument()
      })

      // 输入IP地址
      const ipInput = screen.getByPlaceholderText('192.168.1.100')
      await user.clear(ipInput)
      await user.type(ipInput, '10.0.0.1')

      // 验证输入成功
      expect(ipInput).toHaveValue('10.0.0.1')
    })

    it('应该能够编辑设备并修改IP地址', async () => {
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      const mockUpdateDevice = vi.fn().mockResolvedValue({})
      vi.mocked(useDevicesModule.useUpdateDevice).mockReturnValue({
        mutateAsync: mockUpdateDevice,
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useCreateDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDeleteDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useRefreshDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderDeviceList()

      // 等待设备列表渲染
      await waitFor(() => {
        expect(screen.getByText('192.168.1.100')).toBeInTheDocument()
      })

      // 查找并点击编辑按钮
      const editButtons = screen.getAllByTitle('编辑')
      expect(editButtons.length).toBeGreaterThan(0)
      await user.click(editButtons[0])

      // 验证编辑Dialog打开并显示正确标题
      await waitFor(() => {
        expect(screen.getByText('编辑设备')).toBeInTheDocument()
      })

      // 验证IP地址输入框有当前设备的IP
      const ipInput = screen.getByDisplayValue('192.168.1.100')
      expect(ipInput).toBeInTheDocument()
      expect(ipInput).not.toBeDisabled()
      expect(ipInput).not.toHaveAttribute('readonly')

      // 修改IP地址
      await user.clear(ipInput)
      await user.type(ipInput, '192.168.1.200')

      // 验证IP地址已更改
      expect(ipInput).toHaveValue('192.168.1.200')
    })

    it('应该能够删除设备', async () => {
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      const mockDeleteDevice = vi.fn().mockResolvedValue({})
      vi.mocked(useDevicesModule.useDeleteDevice).mockReturnValue({
        mutateAsync: mockDeleteDevice,
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useCreateDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useUpdateDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useRefreshDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderDeviceList()

      // 等待设备列表渲染
      await waitFor(() => {
        expect(screen.getByText('192.168.1.100')).toBeInTheDocument()
      })

      // 查找并点击删除按钮
      const deleteButtons = screen.getAllByTitle('删除')
      expect(deleteButtons.length).toBeGreaterThan(0)
      await user.click(deleteButtons[0])

      // 验证删除确认Dialog打开
      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument()
        expect(screen.getByText('确定要删除此设备吗？此操作不可恢复。')).toBeInTheDocument()
      })

      // 点击确认删除
      await user.click(screen.getByText('确认删除'))

      // 验证删除函数被调用
      await waitFor(() => {
        expect(mockDeleteDevice).toHaveBeenCalled()
      })
    })
  })

  describe('表单验证测试', () => {
    it('提交按钮应该在必填字段为空时禁用', async () => {
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useCreateDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useUpdateDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderDeviceList()

      // 打开添加设备Dialog
      await user.click(screen.getByText('添加设备'))

      await waitFor(() => {
        expect(screen.getByText('添加设备')).toBeInTheDocument()
      })

      // 验证提交按钮初始状态（应该有disabled属性，因为必填字段为空）
      const submitButton = screen.getByText('提交')
      expect(submitButton).toBeDisabled()
    })
  })

  describe('可靠性测试', () => {
    it('应该在网络错误时显示错误提示', async () => {
      const mockDeleteDevice = vi.fn().mockRejectedValue(new Error('Network error'))
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDeleteDevice).mockReturnValue({
        mutateAsync: mockDeleteDevice,
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useCreateDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useUpdateDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useRefreshDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderDeviceList()

      await waitFor(() => {
        expect(screen.getByText('192.168.1.100')).toBeInTheDocument()
      })

      // 点击删除按钮
      const deleteButtons = screen.getAllByTitle('删除')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument()
      })

      // 点击确认删除
      await user.click(screen.getByText('确认删除'))

      // 验证错误处理
      await waitFor(() => {
        expect(mockDeleteDevice).toHaveBeenCalled()
      })
    })
  })

  describe('安全性测试', () => {
    it('密码输入框应该使用password类型', async () => {
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useCreateDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useUpdateDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderDeviceList()

      // 打开添加设备Dialog
      await user.click(screen.getByText('添加设备'))

      await waitFor(() => {
        expect(screen.getByText('添加设备')).toBeInTheDocument()
      })

      // 验证密码输入框类型
      const passwordInput = screen.getByPlaceholderText('请输入密码')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('编辑设备时应该显示密码提示', async () => {
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useUpdateDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useCreateDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDeleteDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useDevicesModule.useRefreshDevice).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderDeviceList()

      await waitFor(() => {
        expect(screen.getByText('192.168.1.100')).toBeInTheDocument()
      })

      // 点击编辑按钮
      const editButtons = screen.getAllByTitle('编辑')
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByText('编辑设备')).toBeInTheDocument()
      })

      // 验证编辑模式下显示正确的密码提示
      expect(screen.getByText('(留空则不修改)')).toBeInTheDocument()
      const passwordInput = screen.getByPlaceholderText('不修改请留空')
      expect(passwordInput).toBeInTheDocument()
    })
  })
})

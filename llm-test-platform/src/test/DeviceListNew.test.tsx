/*
Frontend test suite for device management functionality.
Tests React components, hooks, and API integration.
*/

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DeviceList } from '@/pages/DeviceList'
import { Device } from '@/lib/types'
import api from '@/lib/api'
import { toast } from 'sonner'

jest.mock('sonner')

jest.mock('@/lib/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}))

const mockApi = api as jest.Mocked<typeof api>

const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  })
}

const renderWithProviders = (component: React.ReactNode) => {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('DeviceList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Device Addition', () => {
    it('should open add device dialog when button is clicked', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: 20 } })

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        expect(screen.getByText('添加设备')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('添加设备'))

      await waitFor(() => {
        expect(screen.getByText('添加设备')).toBeInTheDocument()
        expect(screen.getByLabelText('IP地址')).toBeInTheDocument()
        expect(screen.getByLabelText('端口')).toBeInTheDocument()
        expect(screen.getByLabelText('用户名')).toBeInTheDocument()
        expect(screen.getByLabelText('密码')).toBeInTheDocument()
      })
    })

    it('should show validation errors for empty required fields', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: 20 } })

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('添加设备'))
      })

      const submitButton = screen.getByText('提交')

      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })

    it('should successfully create device with valid data', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: 20 } })
      mockApi.post.mockResolvedValueOnce({
        data: {
          id: 1,
          ip: '192.168.1.100',
          port: 22,
          username: 'root',
          status: 'Unknown',
          accelerator_count: 0,
          idle_count: 0,
          busy_count: 0,
          warning_count: 0,
        }
      })
      mockApi.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: 20 } })

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('添加设备'))
      })

      fireEvent.change(screen.getByLabelText('IP地址'), { target: { value: '192.168.1.100' } })
      fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'root' } })
      fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'testpass123' } })

      await waitFor(() => {
        expect(screen.getByText('提交')).not.toBeDisabled()
      })

      fireEvent.click(screen.getByText('提交'))

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/api/devices', expect.objectContaining({
          ip: '192.168.1.100',
          username: 'root',
        }))
        expect(toast.success).toHaveBeenCalledWith('设备添加成功')
      })
    })

    it('should handle creation error gracefully', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: 20 } })
      mockApi.post.mockRejectedValueOnce({
        response: {
          data: { detail: '该 IP 已存在' },
          status: 400,
        },
      })

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('添加设备'))
      })

      fireEvent.change(screen.getByLabelText('IP地址'), { target: { value: '192.168.1.100' } })
      fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'root' } })
      fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'testpass123' } })

      fireEvent.click(screen.getByText('提交'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('操作失败: 该 IP 已存在')
      })
    })
  })

  describe('Device Import', () => {
    it('should open import dialog when button is clicked', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: 20 } })

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        expect(screen.getByText('导入')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('导入'))

      await waitFor(() => {
        expect(screen.getByText('导入设备')).toBeInTheDocument()
        expect(screen.getByText('开始导入')).toBeInTheDocument()
      })
    })

    it('should show error when no file selected', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: 20 } })

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('导入'))
      })

      const startImportButton = screen.getByText('开始导入')

      await waitFor(() => {
        expect(startImportButton).toBeDisabled()
      })
    })

    it('should successfully import devices from CSV', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: 20 } })
      mockApi.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: 20 } })

      const csvContent = 'IP地址,端口,用户名,密码,备注\n192.168.1.100,22,root,pass1,Device1'
      const csvFile = new File([csvContent], 'devices.csv', { type: 'text/csv' })

      const mockResponse = new Response(JSON.stringify({
        success: true,
        imported_count: 1,
        failed_count: 0,
        failed_rows: [],
      }), { status: 200 })

      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse)

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('导入'))
      })

      const fileInput = screen.getByLabelText('选择文件')
      Object.defineProperty(fileInput, 'files', {
        value: [csvFile],
        configurable: true,
      })
      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('开始导入')).not.toBeDisabled()
      })

      fireEvent.click(screen.getByText('开始导入'))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('导入成功: 1 个设备, 失败: 0 个')
      })

      jest.restoreAllMocks()
    })

    it('should handle import failure gracefully', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: 20 } })

      const mockResponse = new Response(JSON.stringify({
        success: false,
        detail: '文件解析失败',
      }), { status: 400 })

      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse)

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('导入'))
      })

      const csvContent = 'IP地址,端口,用户名,密码,备注\ninvalid,22,root,pass1'
      const csvFile = new File([csvContent], 'devices.csv', { type: 'text/csv' })

      const fileInput = screen.getByLabelText('选择文件')
      Object.defineProperty(fileInput, 'files', {
        value: [csvFile],
        configurable: true,
      })
      fireEvent.change(fileInput)

      fireEvent.click(screen.getByText('开始导入'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })

      jest.restoreAllMocks()
    })
  })

  describe('Device Display', () => {
    it('should display device list correctly', async () => {
      const mockDevices: Device[] = [
        {
          id: 1,
          ip: '192.168.1.100',
          port: 22,
          username: 'root',
          password: 'testpass',
          status: 'Online',
          os_info: 'Linux',
          arch: 'x86_64',
          accelerator_type: 'NVIDIA A100',
          accelerator_count: 2,
          idle_count: 1,
          busy_count: 1,
          warning_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      mockApi.get.mockResolvedValueOnce({ data: { items: mockDevices, total: 1, page: 1, size: 20 } })

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        expect(screen.getByText('192.168.1.100')).toBeInTheDocument()
        expect(screen.getByText('root')).toBeInTheDocument()
        expect(screen.getByText('在线')).toBeInTheDocument()
      })
    })

    it('should show empty state when no devices', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: 20 } })

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        expect(screen.getByText('暂无设备')).toBeInTheDocument()
      })
    })

    it('should display loading state', async () => {
      mockApi.get.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: { items: [], total: 0, page: 1, size: 20 } }), 100)))

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        expect(screen.getByTestId('device-list-loading')).toBeInTheDocument()
      })
    })
  })

  describe('Device Operations', () => {
    it('should refresh device status', async () => {
      const mockDevices: Device[] = [
        {
          id: 1,
          ip: '192.168.1.100',
          port: 22,
          username: 'root',
          password: 'testpass',
          status: 'Unknown',
          accelerator_count: 0,
          idle_count: 0,
          busy_count: 0,
          warning_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      mockApi.get.mockResolvedValueOnce({ data: { items: mockDevices, total: 1, page: 1, size: 20 } })
      mockApi.post.mockResolvedValueOnce({
        data: {
          ...mockDevices[0],
          status: 'Online',
        }
      })
      mockApi.get.mockResolvedValueOnce({ data: { items: [{ ...mockDevices[0], status: 'Online' }], total: 1, page: 1, size: 20 } })

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        expect(screen.getByText('192.168.1.100')).toBeInTheDocument()
      })

      const refreshButton = screen.getByTestId('refresh-device-1')
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/api/devices/1/refresh')
        expect(toast.success).toHaveBeenCalledWith('设备状态已刷新')
      })
    })

    it('should delete device with confirmation', async () => {
      const mockDevices: Device[] = [
        {
          id: 1,
          ip: '192.168.1.100',
          port: 22,
          username: 'root',
          password: 'testpass',
          status: 'Unknown',
          accelerator_count: 0,
          idle_count: 0,
          busy_count: 0,
          warning_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      mockApi.get.mockResolvedValueOnce({ data: { items: mockDevices, total: 1, page: 1, size: 20 } })
      mockApi.delete.mockResolvedValueOnce({ data: { ok: true } })
      mockApi.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: 20 } })

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        expect(screen.getByText('192.168.1.100')).toBeInTheDocument()
      })

      const deleteButton = screen.getByTestId('delete-device-1')
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument()
      })

      const confirmButton = screen.getByText('确认删除')
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockApi.delete).toHaveBeenCalledWith('/api/devices/1')
        expect(toast.success).toHaveBeenCalledWith('设备删除成功')
      })
    })

    it('should cancel delete operation', async () => {
      const mockDevices: Device[] = [
        {
          id: 1,
          ip: '192.168.1.100',
          port: 22,
          username: 'root',
          password: 'testpass',
          status: 'Unknown',
          accelerator_count: 0,
          idle_count: 0,
          busy_count: 0,
          warning_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      mockApi.get.mockResolvedValueOnce({ data: { items: mockDevices, total: 1, page: 1, size: 20 } })

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        const deleteButton = screen.getByTestId('delete-device-1')
        fireEvent.click(deleteButton)
      })

      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument()
      })

      const cancelButton = screen.getByText('取消')
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('确认删除')).not.toBeInTheDocument()
      })
    })
  })

  describe('Filtering and Search', () => {
    it('should filter devices by status', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: 20 } })

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        const statusSelect = screen.getByPlaceholderText('状态')
        fireEvent.click(statusSelect)
      })

      await waitFor(() => {
        expect(screen.getByText('在线')).toBeInTheDocument()
        expect(screen.getByText('离线')).toBeInTheDocument()
        expect(screen.getByText('未知')).toBeInTheDocument()
      })
    })

    it('should search devices by IP', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: 20 } })

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('搜索 IP、用户名...')
        fireEvent.change(searchInput, { target: { value: '192.168.1.100' } })
      })

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/api/devices', expect.objectContaining({
          params: expect.objectContaining({
            search: '192.168.1.100',
          }),
        }))
      })
    })

    it('should filter devices by architecture', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: 20 } })

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        const archSelect = screen.getByPlaceholderText('架构')
        fireEvent.click(archSelect)
      })

      await waitFor(() => {
        expect(screen.getByText('x86_64')).toBeInTheDocument()
        expect(screen.getByText('aarch64')).toBeInTheDocument()
      })
    })
  })

  describe('Export Functionality', () => {
    it('should download device template', async () => {
      const mockBlob = new Blob(['IP,Port,Username,Password,Remark\n192.168.1.100,22,root,pass,Test'], { type: 'text/csv' })
      mockApi.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: 20 } })

      jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(mockBlob))

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        const downloadButton = screen.getByText('下载模板')
        fireEvent.click(downloadButton)
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('模板下载成功')
      })

      jest.restoreAllMocks()
    })

    it('should export devices to CSV', async () => {
      const mockBlob = new Blob(['ID,IP,Port,Username,Password,Status\n1,192.168.1.100,22,root,pass,Online'], { type: 'text/csv' })
      mockApi.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: 20 } })

      jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(mockBlob))

      const mockCreateElement = document.createElement.bind(document)
      document.createElement = jest.fn((tagName) => {
        const element = mockCreateElement(tagName)
        if (tagName === 'a') {
          jest.spyOn(element, 'click')
          jest.spyOn(element, 'remove')
        }
        return element
      })

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        const exportButton = screen.getByText('导出')
        fireEvent.click(exportButton)
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('设备导出成功')
      })

      document.createElement = mockCreateElement
      jest.restoreAllMocks()
    })
  })

  describe('Pagination', () => {
    it('should display pagination controls', async () => {
      const mockDevices = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        ip: `192.168.1.${i + 100}`,
        port: 22,
        username: 'root',
        password: 'testpass',
        status: 'Unknown' as const,
        accelerator_count: 0,
        idle_count: 0,
        busy_count: 0,
        warning_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      mockApi.get.mockResolvedValueOnce({ data: { items: mockDevices.slice(0, 20), total: 25, page: 1, size: 20 } })

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        expect(screen.getByText('第 1 / 2 页，共 25 条')).toBeInTheDocument()
        expect(screen.getByText('下一页')).toBeInTheDocument()
      })
    })

    it('should navigate to next page', async () => {
      const mockDevices = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        ip: `192.168.1.${i + 100}`,
        port: 22,
        username: 'root',
        password: 'testpass',
        status: 'Unknown' as const,
        accelerator_count: 0,
        idle_count: 0,
        busy_count: 0,
        warning_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      mockApi.get.mockResolvedValueOnce({ data: { items: mockDevices.slice(0, 20), total: 25, page: 1, size: 20 } })
      mockApi.get.mockResolvedValueOnce({ data: { items: mockDevices.slice(20), total: 25, page: 2, size: 20 } })

      renderWithProviders(<DeviceList />)

      await waitFor(() => {
        expect(screen.getByText('第 1 / 2 页，共 25 条')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('下一页'))

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/api/devices', expect.objectContaining({
          params: expect.objectContaining({ page: 2 }),
        }))
      })
    })
  })
})

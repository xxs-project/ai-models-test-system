import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TaskList } from '../pages/TaskList'
import * as useTasksModule from '../hooks/use-tasks'
import * as useDevicesModule from '../hooks/use-devices'
import { Task, Device } from '../lib/types'

// Mock hooks
vi.mock('../hooks/use-tasks', () => ({
  useTasks: vi.fn(),
  useCreateTask: vi.fn(),
  useDeleteTask: vi.fn(),
  useExecuteTask: vi.fn(),
  useCancelTask: vi.fn(),
}))

vi.mock('../hooks/use-devices', () => ({
  useDevices: vi.fn(),
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
    password: 'password',
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
]

describe('性能测试管理模块修复验证', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    vi.clearAllMocks()
  })

  const renderTaskList = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TaskList />
      </QueryClientProvider>
    )
  }

  it('验证下拉框交互修复：应该能够打开并选择设备', async () => {
    vi.mocked(useTasksModule.useTasks).mockReturnValue({
      data: { items: [], total: 0, page: 1, size: 20 },
      isLoading: false,
    } as any)
    
    vi.mocked(useDevicesModule.useDevices).mockReturnValue({
      data: { items: mockDevices, total: 1, page: 1, size: 100 },
      isLoading: false,
    } as any)
    
    const mockMutation = {
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    }

    vi.mocked(useTasksModule.useCreateTask).mockReturnValue(mockMutation as any)
    vi.mocked(useTasksModule.useDeleteTask).mockReturnValue(mockMutation as any)
    vi.mocked(useTasksModule.useExecuteTask).mockReturnValue(mockMutation as any)
    vi.mocked(useTasksModule.useCancelTask).mockReturnValue(mockMutation as any)

    // 使用 userEvent 来模拟真实用户交互
    const user = userEvent.setup()
    renderTaskList()

    // 1. 打开创建任务对话框
    await user.click(screen.getByText('创建任务'))
    await waitFor(() => {
      expect(screen.getByText('创建测试任务')).toBeInTheDocument()
    })

    // 2. 验证设备下拉框是否可用
    // 在修复前，open={undefined} 可能导致无法交互。修复后应该可以正常交互。
    
    // 找到 Select Trigger (通常是 role=combobox)
    const selects = screen.getAllByRole('combobox')
    // 这里的 Select Trigger 初始显示 "选择设备" (placeholder)
    const deviceSelect = selects.find(s => s.textContent?.includes('选择设备'))
    
    expect(deviceSelect).toBeInTheDocument()
    
    if (deviceSelect) {
        await user.click(deviceSelect)
        
        // 3. 验证下拉内容出现
        await waitFor(async () => {
             // Use findAllByText to handle potential duplicates and ensure at least one is visible
            const elements = await screen.findAllByText('192.168.1.100 (Online)')
            expect(elements.length).toBeGreaterThan(0)
        })
        
        // 4. 选择设备 - click the one that is likely the option (last one usually in portals, or check role)
        // Better: find by role option
        const options = await screen.findAllByRole('option', { name: '192.168.1.100 (Online)' })
        await user.click(options[0])
        
        // 5. 验证选择结果
        await waitFor(() => {
             expect(deviceSelect).toHaveTextContent('192.168.1.100 (Online)')
        })
    }
  })
})

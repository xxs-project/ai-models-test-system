import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TaskList } from '../pages/TaskList'
import * as useTasksModule from '../hooks/use-tasks'
import * as useDevicesModule from '../hooks/use-devices'
import { Task, Device } from '../lib/types'

// Mock hooks
vi.mock('../hooks/use-tasks', () => ({
  useTasks: vi.fn(() => ({ data: { items: [], total: 0, page: 1, size: 20 }, isLoading: false })),
  useCreateTask: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateTask: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteTask: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useExecuteTask: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCancelTask: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
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

const mockTasks: Task[] = [
  {
    id: 1,
    task_name: 'Qwen-14B性能测试',
    task_description: '测试Qwen-14B在MindIE下的性能',
    priority: 2,
    test_type: 1,
    test_mode: 1,
    device_id: 1,
    model_name: 'Qwen-14B',
    model_path: '/data/models/Qwen-14B',
    inference_framework: 'MindIE',
    framework_version: 'v1.0.1',
    context_lengths: '1024,2048,4096',
    concurrencies: '1,8,16,32,64',
    status: 0,
    progress: 0,
    created_by: 'admin',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    task_name: 'Llama-7B全套测试',
    task_description: '全套模型性能测试',
    priority: 1,
    test_type: 2,
    test_mode: 2,
    device_id: 2,
    model_name: 'Llama-7B',
    model_path: '/data/models/Llama-7B',
    inference_framework: 'VLLM',
    framework_version: 'v2.0.0',
    context_lengths: '512,1024,2048',
    concurrencies: '1,4,8,16',
    status: 3,
    progress: 50,
    created_by: 'admin',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
]

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

describe('性能测试管理模块测试', () => {
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

  describe('UI渲染测试', () => {
    it('应该正确渲染任务列表页面', async () => {
      vi.mocked(useTasksModule.useTasks).mockReturnValue({
        data: { items: mockTasks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 1, page: 1, size: 100 },
        isLoading: false,
      } as any)
      
      vi.mocked(useTasksModule.useCreateTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useDeleteTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useExecuteTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useCancelTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderTaskList()

      // 验证页面标题
      expect(screen.getByText('性能测试管理')).toBeInTheDocument()
      expect(screen.getByText('管理测试任务，监控执行状态')).toBeInTheDocument()

      // 验证创建任务按钮
      expect(screen.getByText('创建任务')).toBeInTheDocument()

      // 等待任务列表渲染
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B性能测试')).toBeInTheDocument()
        expect(screen.getByText('Llama-7B全套测试')).toBeInTheDocument()
      })
    })
  })

  describe('Dialog样式测试', () => {
    it('创建任务Dialog应该有正确的样式类名', async () => {
      vi.mocked(useTasksModule.useTasks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 1, page: 1, size: 100 },
        isLoading: false,
      } as any)
      
      vi.mocked(useTasksModule.useCreateTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useDeleteTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useExecuteTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useCancelTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderTaskList()

      // 打开创建任务Dialog
      await user.click(screen.getByText('创建任务'))

      // 验证Dialog内容存在
      await waitFor(() => {
        expect(screen.getByText('创建测试任务')).toBeInTheDocument()
      })

      // 验证Dialog有正确的样式类
      await waitFor(() => {
        const dialogContent = document.querySelector('[role="dialog"]')
        expect(dialogContent).toHaveClass('bg-white')
        expect(dialogContent).toHaveClass('border-2')
        expect(dialogContent).toHaveClass('shadow-2xl')
      })

      // 验证表单字段有正确样式
      const taskNameInput = screen.getByPlaceholderText('Qwen-14B性能测试')
      expect(taskNameInput).toBeInTheDocument()

      // 验证Label有正确样式
      const taskNameLabel = screen.getByText('任务名称', { selector: 'label' })
      expect(taskNameLabel).toBeInTheDocument()
    })
  })

  describe('功能正确性测试', () => {
    it('应该能够打开创建任务Dialog', async () => {
      vi.mocked(useTasksModule.useTasks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 1, page: 1, size: 100 },
        isLoading: false,
      } as any)
      
      vi.mocked(useTasksModule.useCreateTask).mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useDeleteTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useExecuteTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useCancelTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      // Use pointerEventsCheck: 0 to bypass pointer-events: none check which can happen with Radix UI Select trigger
      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderTaskList()

      // 打开创建任务Dialog
      await user.click(screen.getByText('创建任务'))

      // 验证Dialog打开
      await waitFor(() => {
        expect(screen.getByText('创建测试任务')).toBeInTheDocument()
      })

      // 验证表单字段存在
      expect(screen.getByPlaceholderText('Qwen-14B性能测试')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('测试任务详细描述...')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('/data/models/...')).toBeInTheDocument()
    })

    it('应该能够填写创建任务表单', async () => {
      vi.mocked(useTasksModule.useTasks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 1, page: 1, size: 100 },
        isLoading: false,
      } as any)
      
      const mockCreateTask = vi.fn().mockResolvedValue({})
      vi.mocked(useTasksModule.useCreateTask).mockReturnValue({
        mutateAsync: mockCreateTask,
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useDeleteTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useExecuteTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useCancelTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderTaskList()

      // 打开创建任务Dialog
      await user.click(screen.getByText('创建任务'))

      await waitFor(() => {
        expect(screen.getByText('创建测试任务')).toBeInTheDocument()
      })

      // 填写任务名称
      const taskNameInput = screen.getByPlaceholderText('Qwen-14B性能测试')
      await user.type(taskNameInput, 'Test-Task-001')
      expect(taskNameInput).toHaveValue('Test-Task-001')

      // 填写模型名称
      const modelNameInput = screen.getByPlaceholderText('Qwen-14B')
      await user.type(modelNameInput, 'GPT-Test')
      expect(modelNameInput).toHaveValue('GPT-Test')

      // 填写模型路径
      const modelPathInput = screen.getByPlaceholderText('/data/models/...')
      await user.type(modelPathInput, '/test/models/GPT-Test')
      expect(modelPathInput).toHaveValue('/test/models/GPT-Test')
    })

    it('应该能够执行任务', async () => {
      const mockExecuteTask = vi.fn().mockResolvedValue({})
      vi.mocked(useTasksModule.useTasks).mockReturnValue({
        data: { items: mockTasks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 1, page: 1, size: 100 },
        isLoading: false,
      } as any)
      
      vi.mocked(useTasksModule.useCreateTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useDeleteTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useExecuteTask).mockReturnValue({
        mutateAsync: mockExecuteTask,
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useCancelTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('Qwen-14B性能测试')).toBeInTheDocument()
      })

      // 查找并点击执行按钮
      const executeButtons = screen.getAllByTitle('执行')
      expect(executeButtons.length).toBeGreaterThan(0)
      await user.click(executeButtons[0])

      // 验证执行函数被调用
      await waitFor(() => {
        expect(mockExecuteTask).toHaveBeenCalledWith(1)
      })
    })

    it('应该能够取消任务', async () => {
      const mockCancelTask = vi.fn().mockResolvedValue({})
      vi.mocked(useTasksModule.useTasks).mockReturnValue({
        data: { items: mockTasks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 1, page: 1, size: 100 },
        isLoading: false,
      } as any)
      
      vi.mocked(useTasksModule.useCreateTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useDeleteTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useExecuteTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useCancelTask).mockReturnValue({
        mutateAsync: mockCancelTask,
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('Llama-7B全套测试')).toBeInTheDocument()
      })

      // 查找并点击取消按钮
      const cancelButtons = screen.getAllByTitle('取消')
      expect(cancelButtons.length).toBeGreaterThan(0)
      await user.click(cancelButtons[0])

      // 验证取消函数被调用
      await waitFor(() => {
        expect(mockCancelTask).toHaveBeenCalledWith(2)
      })
    })

    it('应该能够删除任务', async () => {
      const mockDeleteTask = vi.fn().mockResolvedValue({})
      vi.mocked(useTasksModule.useTasks).mockReturnValue({
        data: { items: mockTasks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 1, page: 1, size: 100 },
        isLoading: false,
      } as any)
      
      vi.mocked(useTasksModule.useCreateTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useDeleteTask).mockReturnValue({
        mutateAsync: mockDeleteTask,
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useExecuteTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useCancelTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('Qwen-14B性能测试')).toBeInTheDocument()
      })

      // 查找并点击删除按钮
      const deleteButtons = screen.getAllByTitle('删除')
      expect(deleteButtons.length).toBeGreaterThan(0)
      await user.click(deleteButtons[0])

      // 验证删除确认Dialog打开
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: '确认删除' })).toBeInTheDocument()
        expect(screen.getByText('确定要删除此任务吗？此操作不可恢复。')).toBeInTheDocument()
      })

      // 点击确认删除
      const confirmButton = screen.getByRole('button', { name: '确认删除' })
      await user.click(confirmButton)

      // 验证删除函数被调用
      await waitFor(() => {
        expect(mockDeleteTask).toHaveBeenCalled()
      })
    })
  })

  describe('表单验证测试', () => {
    it('应该在提交空表单时显示验证错误', async () => {
      vi.mocked(useTasksModule.useTasks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 1, page: 1, size: 100 },
        isLoading: false,
      } as any)
      
      vi.mocked(useTasksModule.useCreateTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useDeleteTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useExecuteTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useTasksModule.useCancelTask).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderTaskList()

      // 打开创建任务Dialog
      await user.click(screen.getByText('创建任务'))

      await waitFor(() => {
        expect(screen.getByText('创建测试任务')).toBeInTheDocument()
      })

      // 点击创建按钮 (Inside Dialog)
      const dialog = screen.getByRole('dialog')
      const createButton = within(dialog).getByRole('button', { name: '创建任务' })
      await user.click(createButton)

      // 验证出现必填错误提示
      await waitFor(() => {
        const errorMessages = screen.getAllByText(/必填|必选/)
        expect(errorMessages.length).toBeGreaterThan(0)
      })
    })

    it('应该能够选择低优先级', async () => {
      vi.mocked(useTasksModule.useTasks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 1, page: 1, size: 100 },
        isLoading: false,
      } as any)
      
      vi.mocked(useTasksModule.useCreateTask).mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderTaskList()

      await user.click(screen.getByText('创建任务'))

      await waitFor(() => {
        expect(screen.getByText('创建测试任务')).toBeInTheDocument()
      })

      const dialog = screen.getByRole('dialog')
      const label = within(dialog).getByText(/优先级/)
      const trigger = within(label.closest('div')!).getByRole('combobox')
      
      await user.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('option', { name: '低' })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('option', { name: '低' }))

      await waitFor(() => {
        expect(trigger).toHaveTextContent('低')
      })
    })

    it('应该能够选择单模型测试模式', async () => {
      vi.mocked(useTasksModule.useTasks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 1, page: 1, size: 100 },
        isLoading: false,
      } as any)
      
      vi.mocked(useTasksModule.useCreateTask).mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderTaskList()

      await user.click(screen.getByText('创建任务'))

      await waitFor(() => {
        expect(screen.getByText('创建测试任务')).toBeInTheDocument()
      })

      const dialog = screen.getByRole('dialog')
      const label = within(dialog).getByText(/测试模式/)
      const trigger = within(label.closest('div')!).getByRole('combobox')
      
      await user.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('option', { name: '单模型测试' })).toBeInTheDocument()
      })
      
      await user.click(screen.getByRole('option', { name: '单模型测试' }))

      await waitFor(() => {
        expect(trigger).toHaveTextContent('单模型测试')
      })
    })

    it('应该能够选择全套模型测试模式', async () => {
      vi.mocked(useTasksModule.useTasks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 1, page: 1, size: 100 },
        isLoading: false,
      } as any)
      
      vi.mocked(useTasksModule.useCreateTask).mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderTaskList()

      await user.click(screen.getByText('创建任务'))

      await waitFor(() => {
        expect(screen.getByText('创建测试任务')).toBeInTheDocument()
      })

      const dialog = screen.getByRole('dialog')
      const label = within(dialog).getByText(/测试模式/)
      const trigger = within(label.closest('div')!).getByRole('combobox')
      
      await user.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('option', { name: '全套模型测试' })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('option', { name: '全套模型测试' }))

      await waitFor(() => {
        expect(trigger).toHaveTextContent('全套模型测试')
      })
    })
  })

  describe('下拉框功能测试', () => {
    it('应该能够选择设备', async () => {
      vi.mocked(useTasksModule.useTasks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 1, page: 1, size: 100 },
        isLoading: false,
      } as any)
      
      vi.mocked(useTasksModule.useCreateTask).mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderTaskList()

      await user.click(screen.getByText('创建任务'))

      await waitFor(() => {
        expect(screen.getByText('创建测试任务')).toBeInTheDocument()
      })

      const dialog = screen.getByRole('dialog')
      const label = within(dialog).getAllByText(/设备/i).find(el => el.tagName === 'LABEL') || within(dialog).getByText('设备')
      const trigger = within(label.closest('div')!).getByRole('combobox')

      await user.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /192.168.1.100/ })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('option', { name: /192.168.1.100/ }))

      await waitFor(() => {
        expect(trigger).toHaveTextContent('192.168.1.100')
      })
    })

    it('应该在没有设备时显示暂无可用设备', async () => {
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 100 },
        isLoading: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderTaskList()

      await user.click(screen.getByText('创建任务'))

      await waitFor(() => {
        expect(screen.getByText('创建测试任务')).toBeInTheDocument()
      })

      const dialog = screen.getByRole('dialog')
      const label = within(dialog).getAllByText(/设备/i).find(el => el.tagName === 'LABEL') || within(dialog).getByText('设备')
      const trigger = within(label.closest('div')!).getByRole('combobox')
      
      await user.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('暂无可用设备')).toBeInTheDocument()
      })
    })
  })

  describe('推理框架手动输入测试', () => {
    it('应该能够手动输入推理框架', async () => {
      vi.mocked(useTasksModule.useTasks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 1, page: 1, size: 100 },
        isLoading: false,
      } as any)
      
      vi.mocked(useTasksModule.useCreateTask).mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderTaskList()

      await user.click(screen.getByText('创建任务'))

      await waitFor(() => {
        expect(screen.getByText('创建测试任务')).toBeInTheDocument()
      })

      const inferenceFrameworkInput = screen.getByPlaceholderText('MindIE')
      
      await user.clear(inferenceFrameworkInput)
      await user.type(inferenceFrameworkInput, 'TensorRT-LLM')

      expect(inferenceFrameworkInput).toHaveValue('TensorRT-LLM')
    })
  })

  describe('可扩展性测试', () => {
    it('应该支持多种测试类型', async () => {
      vi.mocked(useTasksModule.useTasks).mockReturnValue({
        data: { items: mockTasks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 1, page: 1, size: 100 },
        isLoading: false,
      } as any)

      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('单模型测试')).toBeInTheDocument()
        expect(screen.getByText('全套模型')).toBeInTheDocument()
      })
    })
  })

  describe('筛选器功能测试', () => {
    it('应该能够使用状态筛选器', async () => {
      vi.mocked(useTasksModule.useTasks).mockImplementation((params: any) => {
        if (params?.status === '3') {
          return {
            data: { items: [mockTasks[1]], total: 1, page: 1, size: 20 },
            isLoading: false,
          } as any
        }
        return {
          data: { items: [mockTasks[0]], total: 1, page: 1, size: 20 },
          isLoading: false,
        } as any
      })
      
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 1, page: 1, size: 100 },
        isLoading: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('Qwen-14B性能测试')).toBeInTheDocument()
      })

      const statusSelect = screen.getByRole('combobox', { name: /状态/i })
      await user.click(statusSelect)

      await waitFor(() => {
        expect(screen.getByRole('option', { name: '执行中' })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('option', { name: '执行中' }))

      await waitFor(() => {
        expect(screen.getByText('Llama-7B全套测试')).toBeInTheDocument()
      })
    })
  })

  describe('安全性测试', () => {
    it('应该正确处理特殊字符输入', async () => {
      vi.mocked(useTasksModule.useTasks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: mockDevices, total: 1, page: 1, size: 100 },
        isLoading: false,
      } as any)
      
      vi.mocked(useTasksModule.useCreateTask).mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderTaskList()

      await user.click(screen.getByText('创建任务'))

      await waitFor(() => {
        expect(screen.getByText('创建测试任务')).toBeInTheDocument()
      })

      const taskNameInput = screen.getByPlaceholderText('Qwen-14B性能测试')
      await user.type(taskNameInput, 'Test<script>alert("xss")</script>')

      expect(taskNameInput).toHaveValue('Test<script>alert("xss")</script>')
    })

    it('应该防止XSS攻击', async () => {
      const xssTask = { ...mockTasks[0], id: 100, task_name: '<script>alert("xss")</script>' }
      
      vi.mocked(useTasksModule.useTasks).mockReturnValue({
        data: { items: [xssTask], total: 1, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 100 },
        isLoading: false,
      } as any)

      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument()
      })
    })
  })

  describe('需求验证补充测试', () => {
    it('应该包含所有必需的列头', async () => {
      vi.mocked(useTasksModule.useTasks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)

      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 100 },
        isLoading: false,
      } as any)

      renderTaskList()

      const expectedHeaders = [
        'ID',
        '任务名称',
        '测试类型',
        '测试模式',
        '模型',
        '推理框架',
        '推理框架版本',
        '创建时间',
        '操作'
      ]

      expectedHeaders.forEach(header => {
        expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument()
      })
    })

    it('应该根据状态显示正确的操作按钮 (扩展性)', async () => {
       const pendingTask = { ...mockTasks[0], status: 0, id: 101, task_name: 'Pending Task' }
       const runningTask = { ...mockTasks[0], status: 3, id: 102, task_name: 'Running Task' }

       vi.mocked(useTasksModule.useTasks).mockReturnValue({
        data: { items: [pendingTask, runningTask], total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)

      vi.mocked(useDevicesModule.useDevices).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 100 },
        isLoading: false,
      } as any)

      vi.mocked(useTasksModule.useCreateTask).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
      vi.mocked(useTasksModule.useDeleteTask).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
      vi.mocked(useTasksModule.useExecuteTask).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
      vi.mocked(useTasksModule.useCancelTask).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)

      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('Pending Task')).toBeInTheDocument()
      })

      const pendingRow = screen.getByText('Pending Task').closest('tr')
      const runningRow = screen.getByText('Running Task').closest('tr')

      expect(within(pendingRow!).getByTitle('执行')).toBeInTheDocument()
      expect(within(runningRow!).getByTitle('取消')).toBeInTheDocument()
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TaskList } from '../pages/TaskList'
import * as useTasksModule from '../hooks/use-tasks'
import * as useDevicesModule from '../hooks/use-devices'

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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// ResizeObserver Mock
class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}
window.ResizeObserver = ResizeObserver;

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

describe('性能测试管理模块业务功能测试', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    vi.clearAllMocks()
    
    // Default mocks
    vi.mocked(useTasksModule.useTasks).mockReturnValue({
      data: { items: [], total: 0, page: 1, size: 20 },
      isLoading: false,
    } as any)
    
    vi.mocked(useDevicesModule.useDevices).mockReturnValue({
      data: { items: [], total: 0, page: 1, size: 100 },
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
  })

  const renderTaskList = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TaskList />
      </QueryClientProvider>
    )
  }

  const openCreateDialog = async (user: any) => {
    await user.click(screen.getByText('创建任务'))
    await waitFor(() => {
      expect(screen.getByText('创建测试任务')).toBeInTheDocument()
    })
  }

  it('验证：性能测试+单模型测试时，应呈现模型名称、NPU数量、图模式', async () => {
    const user = userEvent.setup()
    renderTaskList()
    await openCreateDialog(user)

    // 1. 选择性能测试 (Test Type = 1)
    // Note: test_type=1 means Performance test
    const typeTrigger = screen.getAllByRole('combobox').find(e => e.textContent?.includes('性能测试') || e.textContent?.includes('精度测试'))
    if (typeTrigger) {
         await user.click(typeTrigger)
         const option = await screen.findByRole('option', { name: /性能测试/ })
         await user.click(option)
    }

    // 2. 选择单模型测试 (Test Mode = 1)
    // Note: Default is 1 (Single Model), but let's re-select to be sure
    const modeTrigger = screen.getAllByRole('combobox').find(e => e.textContent?.includes('单模型测试') || e.textContent?.includes('全套模型测试'))
    if (modeTrigger) {
         await user.click(modeTrigger)
         const option = await screen.findByRole('option', { name: /单模型测试/ })
         await user.click(option)
    }

    // 3. 验证字段存在
    await waitFor(() => {
        expect(screen.getByLabelText(/模型名称/)).toBeVisible()
        expect(screen.getByLabelText(/NPU数量/)).toBeVisible()
        expect(screen.getByLabelText(/图模式/)).toBeVisible()
    })

    // 4. 验证数据集名称不存在 (For Performance test)
    expect(screen.queryByLabelText(/数据集名称/)).not.toBeInTheDocument()
  })

  it('验证：精度测试+单模型测试时，应呈现模型名称、NPU数量、图模式、数据集名称', async () => {
    const user = userEvent.setup()
    renderTaskList()
    await openCreateDialog(user)
    
    const dialog = screen.getByRole('dialog')

    // 1. 选择精度测试 (Test Type = 2)
    // Note: test_type=2 means Accuracy test
    const typeTriggerText = within(dialog).getAllByText('性能测试')[0]
    await user.click(typeTriggerText.closest('button')!)
    
    const accuracyOption = await screen.findByRole('option', { name: /精度测试/ })
    await user.click(accuracyOption)

    // 2. 选择单模型测试 (Test Mode = 1)
    // Ensure it is single model. Trigger shows "单模型测试"
    const modeTriggerText = within(dialog).getAllByText('单模型测试')[0]
    expect(modeTriggerText).toBeInTheDocument()

    // 3. 验证所有字段存在
    await waitFor(() => {
        expect(within(dialog).getByLabelText(/模型名称/)).toBeVisible()
        expect(within(dialog).getByLabelText(/NPU数量/)).toBeVisible()
        expect(within(dialog).getByLabelText(/图模式/)).toBeVisible()
        expect(within(dialog).getByLabelText(/数据集名称/)).toBeVisible()
    })
  })

  it('验证：推理框架修改为手动输入', async () => {
    const user = userEvent.setup()
    renderTaskList()
    await openCreateDialog(user)
    const dialog = screen.getByRole('dialog')

    // Look for "推理框架" label
    const label = within(dialog).getByLabelText(/推理框架/)
    
    // It should be an input, so we can type in it
    await user.clear(label)
    await user.type(label, 'CustomFramework')
    
    expect(label).toHaveValue('CustomFramework')
    
    // Verify it is NOT a combobox (Select)
    expect(label.getAttribute('role')).not.toBe('combobox')
  })

  it('验证：测试类型下拉框交互 (可靠性)', async () => {
    const user = userEvent.setup()
    renderTaskList()
    await openCreateDialog(user)
    const dialog = screen.getByRole('dialog')

    // Trigger dropdown
    const typeTriggerText = within(dialog).getAllByText('性能测试')[0]
    await user.click(typeTriggerText.closest('button')!)

    // Check options visible
    const accuracyOption = await screen.findByRole('option', { name: /精度测试/ })
    expect(accuracyOption).toBeVisible()
    
    // Select
    await user.click(accuracyOption)
    
    // Check value update. Now it should say "精度测试"
    // Use waitFor just in case of state update delay
    await waitFor(() => {
       expect(within(dialog).getAllByText('精度测试')[0]).toBeInTheDocument()
    })
  })
  
  it('验证：表单必填校验 (安全性/完整性)', async () => {
    const user = userEvent.setup()
    renderTaskList()
    await openCreateDialog(user)
    const dialog = screen.getByRole('dialog')
    
    // Switch to Accuracy + Single Model
    const typeTriggerText = within(dialog).getAllByText('性能测试')[0]
    await user.click(typeTriggerText.closest('button')!)
    
    await user.click(await screen.findByRole('option', { name: /精度测试/ }))

    // Click submit
    const submitBtn = within(dialog).getByRole('button', { name: '创建任务' })
    await user.click(submitBtn)
    
    // Check for validation errors
    await waitFor(() => {
        const errors = within(dialog).getAllByText(/必填/i)
        expect(errors.length).toBeGreaterThan(0)
    })
    
    // Specifically check Dataset Name validation
    const datasetInput = within(dialog).getByLabelText(/数据集名称/)
    expect(datasetInput).toBeInvalid()
  })

  it('验证：框架版本支持RC版本 (v0.12.0rc1) - 兼容性/扩展性', async () => {
    const user = userEvent.setup()
    renderTaskList()
    await openCreateDialog(user)
    const dialog = screen.getByRole('dialog')

    // Fill in required fields to submit
    await user.type(within(dialog).getByLabelText(/任务名称/), 'RC Version Test')
    
    // Fill Framework Version with RC tag
    const versionInput = within(dialog).getByLabelText(/框架版本/)
    await user.clear(versionInput)
    await user.type(versionInput, 'v0.12.0rc1')
    
    // Fill other requirements to avoid noise
    await user.type(within(dialog).getByLabelText(/模型名称/), 'TestModel')
    await user.type(within(dialog).getByLabelText(/NPU数量/), '1')
    await user.type(within(dialog).getByLabelText(/图模式/), 'mindie')
    await user.type(within(dialog).getByLabelText(/模型路径/), '/tmp/model')
    await user.type(within(dialog).getByLabelText(/测试路径/), '/tmp/test')
    
    // Device selection (default list mode)
    // We need to pick a device. The mock returns empty devices list in beforeEach?
    // Let's check the mock in beforeEach. 
    // It returns items: []. We need to mock devices to select one, OR switch to manual mode.
    // Switching to manual mode is easier for this specific test to avoid depending on list data.
    const manualTab = within(dialog).getByText('手动添加设备')
    await user.click(manualTab)
    await user.type(within(dialog).getByLabelText(/设备IP/), '127.0.0.1')
    await user.type(within(dialog).getByLabelText(/用户名/), 'root')
    await user.type(within(dialog).getByLabelText(/密码/), 'password')

    // Submit
    const submitBtn = within(dialog).getByRole('button', { name: '创建任务' })
    await user.click(submitBtn)

    // Verify NO validation error on version field
    // If regex is strict, versionInput will be invalid or show text "格式如 v1.0.1"
    await waitFor(() => {
        expect(versionInput).not.toBeInvalid()
        expect(within(dialog).queryByText(/格式如 v1.0.1/)).not.toBeInTheDocument()
    })
  })

  it('验证：图模式修改为手动输入', async () => {
    const user = userEvent.setup()
    renderTaskList()
    await openCreateDialog(user)
    const dialog = screen.getByRole('dialog')

    // Ensure Single Model is selected (default) so graph_mode is visible
    const graphModeLabel = within(dialog).getByLabelText(/图模式/)
    expect(graphModeLabel).toBeVisible()

    // Type into it
    await user.clear(graphModeLabel)
    await user.type(graphModeLabel, 'custom_mode')
    expect(graphModeLabel).toHaveValue('custom_mode')
    
    // Verify it is NOT a combobox
    expect(graphModeLabel.getAttribute('role')).not.toBe('combobox')
  })

  it('验证：业务功能点综合测试 (正确性、可靠性)', async () => {
    const user = userEvent.setup()
    renderTaskList()
    await openCreateDialog(user)
    const dialog = screen.getByRole('dialog')

    // 1. 正确性: 验证MindIE框架自动填充图模式
    const graphModeInput = within(dialog).getByLabelText(/图模式/)
    expect(graphModeInput).toHaveValue('mindie')

    // Change framework to VLLM
    const frameworkInput = within(dialog).getByLabelText(/推理框架/)
    await user.clear(frameworkInput)
    await user.type(frameworkInput, 'PyTorch') // change to something else
    await user.clear(graphModeInput) // clear graph mode
    
    await user.clear(frameworkInput)
    await user.type(frameworkInput, 'MindIE') // change back to MindIE
    
    // Expect auto-fill to happen
    expect(graphModeInput).toHaveValue('mindie')

    // 2. 可靠性: 验证图模式必填校验
    await user.clear(graphModeInput) // make it empty
    
    const submitBtn = within(dialog).getByRole('button', { name: '创建任务' })
    await user.click(submitBtn)
    
    // Should show error for graph_mode (since test_mode is 1 by default)
    await waitFor(() => {
        expect(graphModeInput).toBeInvalid()
    })
  })
})

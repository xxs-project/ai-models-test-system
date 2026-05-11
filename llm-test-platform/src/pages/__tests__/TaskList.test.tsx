
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskList } from '../TaskList'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import * as useTasksHooks from '@/hooks/use-tasks'
import * as useDevicesHooks from '@/hooks/use-devices'

// Mocks
class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}
window.ResizeObserver = ResizeObserver;

const mockCreateTask = vi.fn()
const mockDeleteTask = vi.fn()
const mockExecuteTask = vi.fn()
const mockCancelTask = vi.fn()

vi.mock('@/hooks/use-tasks', () => ({
  useTasks: vi.fn(),
  useCreateTask: () => ({ mutateAsync: mockCreateTask, isPending: false }),
  useDeleteTask: () => ({ mutateAsync: mockDeleteTask, isPending: false }),
  useExecuteTask: () => ({ mutateAsync: mockExecuteTask }),
  useCancelTask: () => ({ mutateAsync: mockCancelTask }),
}))

vi.mock('@/hooks/use-devices', () => ({
  useDevices: vi.fn(),
}))

// Wrapper
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
})

const renderComponent = () => {
  return render(
    <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <TaskList />
        </TooltipProvider>
    </QueryClientProvider>
  )
}

describe('TaskList - Create Task Dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useTasksHooks.useTasks as any).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false
    })
    ;(useDevicesHooks.useDevices as any).mockReturnValue({
        data: { 
            items: [
                { id: 1, ip: '192.168.1.1', status: 'Online', accelerator_count: 8 },
                { id: 2, ip: '192.168.1.2', status: 'Offline', accelerator_count: 4 }
            ] 
        }
    })
  })

  it('renders create button and opens dialog', async () => {
    const user = userEvent.setup()
    renderComponent()
    
    const createBtn = screen.getByText('创建任务')
    expect(createBtn).toBeInTheDocument()
    
    await user.click(createBtn)
    
    await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('创建测试任务')).toBeInTheDocument()
    })
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    renderComponent()
    await user.click(screen.getByText('创建任务'))
    
    await waitFor(() => expect(screen.getByRole('dialog')).toBeVisible())

    const dialog = screen.getByRole('dialog')
    const submitBtn = within(dialog).getByRole('button', { name: '创建任务' })

    await user.click(submitBtn)
    
    // Debug: Check if validation state is applied to the input
    await waitFor(() => {
        expect(screen.getByPlaceholderText('Qwen-14B性能测试')).toBeInvalid()
    })

    const input = screen.getByPlaceholderText('Qwen-14B性能测试')
    const describedBy = input.getAttribute('aria-describedby')
    if (describedBy) {
        const ids = describedBy.split(' ')
        const messageId = ids.find(id => id.includes('message'))
        if (messageId) {
            // Wait for the message element to appear and have text
            await waitFor(() => {
                const messageEl = document.getElementById(messageId)
                expect(messageEl).not.toBeNull()
                if (messageEl) {
                    expect(messageEl.textContent).toMatch(/必填/)
                }
            })
        }
    }

    // Also verify device_id error "请选择设备"
    await waitFor(async () => {
         const errors = await screen.findAllByText(/必填|请选择设备/i)
         expect(errors.length).toBeGreaterThan(0)
    })
    
    expect(mockCreateTask).not.toHaveBeenCalled()
    // We expect "必填" for task_name, and "请选择设备" for device_id (since default is list mode)
    const errors = await screen.findAllByText(/必填|请选择设备/i, {}, { timeout: 2000 })
    expect(errors.length).toBeGreaterThan(0)
    
    expect(mockCreateTask).not.toHaveBeenCalled()
  })

  it('submits valid form data', async () => {
    const user = userEvent.setup()
    renderComponent()
    await user.click(screen.getByText('创建任务'))
    
    // Fill basic info
    await user.type(screen.getByLabelText(/任务名称/), 'Test Task')
    
    // Select Device - Manual Tab
    const manualTabTrigger = screen.getByText('手动添加设备')
    await user.click(manualTabTrigger)
    
    // Wait for the tab content to appear
    await waitFor(() => {
        expect(screen.getByLabelText(/设备IP/)).toBeInTheDocument()
    })
    
    await user.type(screen.getByLabelText(/设备IP/), '192.168.1.100')
    await user.type(screen.getByLabelText(/用户名/), 'root')
    await user.type(screen.getByLabelText(/密码/), 'password')
    
    // Fill other required fields
    await user.type(screen.getByPlaceholderText('Qwen-14B'), 'Llama2')
    await user.clear(screen.getByLabelText(/NPU数量/))
    await user.type(screen.getByLabelText(/NPU数量/), '8')
    await user.type(screen.getByLabelText(/模型路径/), '/path/to/model')
    await user.type(screen.getByLabelText(/测试路径/), '/path/to/test')
    
    // Submit
    const buttons = screen.getAllByRole('button', { name: '创建任务' })
    const submitBtn = buttons[buttons.length - 1]
    await user.click(submitBtn)
    
    await waitFor(() => {
        expect(mockCreateTask).toHaveBeenCalled()
        expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
            task_name: 'Test Task',
            device_ip: '192.168.1.100',
            test_mode: 1 
        }))
    })
  })

  it('interacts with dropdowns (Reliability)', async () => {
    const user = userEvent.setup()
    renderComponent()
    await user.click(screen.getByText('创建任务'))
    
    // Find trigger by checking for the text "性能测试" inside a button/combobox
    const testTypeTrigger = screen.getByRole('combobox', { name: /测试类型/i })
    expect(testTypeTrigger).toBeInTheDocument()
    
    await user.click(testTypeTrigger)
    
    // In JSDOM/Radix, options are rendered in a portal
    // Options are: 性能测试 (Performance), 精度测试 (Accuracy)
    const option = await screen.findByRole('option', { name: /精度测试/i }) 
    await user.click(option)
    
    // Verify the trigger text updated
    expect(testTypeTrigger).toHaveTextContent(/精度测试/i)
  })

  it('switches device selection modes (Extensibility)', async () => {
    const user = userEvent.setup()
    renderComponent()
    await user.click(screen.getByText('创建任务'))
    
    // Default: List Mode
    // "选择设备" appears in Label and Placeholder.
    // We check that the List Mode Select is present
    expect(screen.getAllByText('选择设备').length).toBeGreaterThan(0)
    expect(screen.queryByLabelText(/设备IP/)).not.toBeInTheDocument() 
    
    // Switch to Manual
    await user.click(screen.getByText('手动添加设备'))
    
    // Now Manual fields should appear
    expect(screen.getByLabelText(/设备IP/)).toBeInTheDocument()
    
    // The "选择设备" select from List mode should be hidden (Tabs functionality)
    // Note: Radix Tabs unmounts content by default, but let's verify visual state or existence
    // We check that "选择设备" label associated with the Select is gone or hidden
    
    // Switch back
    await user.click(screen.getByText('从设备列表选择'))
    expect(screen.queryByLabelText(/设备IP/)).not.toBeInTheDocument()
  })

  it('handles special characters in inputs (Security)', async () => {
    const user = userEvent.setup()
    renderComponent()
    await user.click(screen.getByText('创建任务'))
    
    const maliciousInput = '<script>alert(1)</script>'
    await user.type(screen.getByLabelText(/任务名称/), maliciousInput)
    
    // We just want to ensure it doesn't crash and types correctly
    expect(screen.getByLabelText(/任务名称/)).toHaveValue(maliciousInput)
    
    // Fill other required to submit
    const manualTabTrigger = screen.getByText('手动添加设备')
    await user.click(manualTabTrigger)
    await user.type(screen.getByLabelText(/设备IP/), '192.168.1.100')
    await user.type(screen.getByLabelText(/用户名/), 'root')
    await user.type(screen.getByLabelText(/密码/), 'pass')
    await user.type(screen.getByPlaceholderText('Qwen-14B'), 'Model')
    await user.type(screen.getByLabelText(/NPU数量/), '1')
    await user.type(screen.getByLabelText(/模型路径/), '/path')
    await user.type(screen.getByLabelText(/测试路径/), '/path')
    
    const buttons = screen.getAllByRole('button', { name: '创建任务' })
    const submitBtn = buttons[buttons.length - 1]
    await user.click(submitBtn)
    
    await waitFor(() => {
        expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
            task_name: maliciousInput
        }))
    })
  })
})

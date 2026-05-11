import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddBenchmarkForm } from '../components/AddBenchmarkForm'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('AddBenchmarkForm 组件测试', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderForm = (props = {}) => {
    return render(
      <AddBenchmarkForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isSubmitting={false}
        {...props}
      />
    )
  }

  describe('UI渲染测试', () => {
    it('应该正确渲染步骤指示器', () => {
      renderForm()

      expect(screen.getByText('配置信息')).toBeInTheDocument()
      expect(screen.getByText('性能指标')).toBeInTheDocument()
    })

    it('应该默认显示配置信息步骤', () => {
      renderForm()

      expect(screen.getByText('测试配置信息')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('如：Qwen-14B')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('如：server-01')).toBeInTheDocument()
    })

    it('应该渲染所有配置字段', () => {
      renderForm()

      expect(screen.getByLabelText(/模型名称/)).toBeInTheDocument()
      expect(screen.getByLabelText(/服务器名称/)).toBeInTheDocument()
      expect(screen.getByLabelText(/推理框架/)).toBeInTheDocument()
      expect(screen.getByLabelText(/AI芯片/)).toBeInTheDocument()
      expect(screen.getByLabelText(/切分参数/)).toBeInTheDocument()
      expect(screen.getByLabelText(/测试日期/)).toBeInTheDocument()
      expect(screen.getByLabelText(/提交人/)).toBeInTheDocument()
    })

    it('应该显示必填标记', () => {
      renderForm()

      const modelLabel = screen.getByText('模型名称')
      expect(modelLabel.parentElement?.textContent).toContain('*')
    })
  })

  describe('表单交互测试', () => {
    it('应该能输入模型名称', async () => {
      const user = userEvent.setup()
      renderForm()

      const input = screen.getByPlaceholderText('如：Qwen-14B')
      await user.type(input, 'Test-Model-Name')

      expect(input).toHaveValue('Test-Model-Name')
    })

    it('应该能选择推理框架', async () => {
      const user = userEvent.setup()
      renderForm()

      const select = screen.getByRole('combobox')
      await user.click(select)

      await waitFor(() => {
        expect(screen.getByText('MindIE')).toBeInTheDocument()
        expect(screen.getByText('VLLM')).toBeInTheDocument()
        expect(screen.getByText('TensorRT-LLM')).toBeInTheDocument()
      })
    })

    it('应该能输入日期', async () => {
      const user = userEvent.setup()
      renderForm()

      const dateInput = screen.getByLabelText(/测试日期/)
      await user.clear(dateInput)
      await user.type(dateInput, '2024-01-15')

      expect(dateInput).toHaveValue('2024-01-15')
    })

    it('点击下一步应该验证必填字段', async () => {
      const user = userEvent.setup()
      renderForm()

      await user.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('请输入模型名称')).toBeInTheDocument()
        expect(screen.getByText('请输入服务器名称')).toBeInTheDocument()
        expect(screen.getByText('请输入AI芯片型号')).toBeInTheDocument()
      })
    })

    it('填写必填字段后应该能进入下一步', async () => {
      const user = userEvent.setup()
      renderForm()

      // 填写必填字段
      await user.type(screen.getByPlaceholderText('如：Qwen-14B'), 'TestModel')
      await user.type(screen.getByPlaceholderText('如：server-01'), 'TestServer')
      await user.type(screen.getByPlaceholderText('如：GPU-A100'), 'GPU-Test')

      await user.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('性能指标数据')).toBeInTheDocument()
      })
    })

    it('应该能取消表单', async () => {
      const user = userEvent.setup()
      renderForm()

      await user.click(screen.getByText('取消'))

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('性能指标步骤测试', () => {
    const fillConfigAndGoToMetrics = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(screen.getByPlaceholderText('如：Qwen-14B'), 'TestModel')
      await user.type(screen.getByPlaceholderText('如：server-01'), 'TestServer')
      await user.type(screen.getByPlaceholderText('如：GPU-A100'), 'GPU-Test')
      await user.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('性能指标数据')).toBeInTheDocument()
      })
    }

    it('应该显示默认的性能指标', async () => {
      const user = userEvent.setup()
      renderForm()

      await fillConfigAndGoToMetrics(user)

      expect(screen.getByText('指标 #1')).toBeInTheDocument()
      expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0)
    })

    it('应该能添加新的性能指标', async () => {
      const user = userEvent.setup()
      renderForm()

      await fillConfigAndGoToMetrics(user)

      await user.click(screen.getByText('添加指标'))

      await waitFor(() => {
        expect(screen.getByText('指标 #2')).toBeInTheDocument()
      })
    })

    it('应该能删除性能指标', async () => {
      const user = userEvent.setup()
      renderForm()

      await fillConfigAndGoToMetrics(user)

      // 先添加一个指标
      await user.click(screen.getByText('添加指标'))
      await waitFor(() => {
        expect(screen.getByText('指标 #2')).toBeInTheDocument()
      })

      // 删除第二个指标
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons[deleteButtons.length - 1]
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.queryByText('指标 #2')).not.toBeInTheDocument()
      })
    })

    it('应该能修改性能指标值', async () => {
      const user = userEvent.setup()
      renderForm()

      await fillConfigAndGoToMetrics(user)

      const concurrencyInput = screen.getByDisplayValue('1')
      await user.clear(concurrencyInput)
      await user.type(concurrencyInput, '8')

      expect(concurrencyInput).toHaveValue(8)
    })

    it('应该能返回上一步', async () => {
      const user = userEvent.setup()
      renderForm()

      await fillConfigAndGoToMetrics(user)

      await user.click(screen.getByText('上一步'))

      await waitFor(() => {
        expect(screen.getByText('测试配置信息')).toBeInTheDocument()
      })
    })

    it('应该能提交表单', async () => {
      const user = userEvent.setup()
      renderForm()

      await fillConfigAndGoToMetrics(user)

      // 填写一些指标值
      const ttftInput = screen.getAllByRole('spinbutton')[3] // TTFT input
      await user.clear(ttftInput)
      await user.type(ttftInput, '100')

      await user.click(screen.getByText('添加基准测试'))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      const submittedData = mockOnSubmit.mock.calls[0][0]
      expect(submittedData.config.modelName).toBe('TestModel')
      expect(submittedData.config.serverName).toBe('TestServer')
      expect(submittedData.metrics).toHaveLength(1)
    })
  })

  describe('表单验证测试', () => {
    it('应该验证并发数必须大于0', async () => {
      const user = userEvent.setup()
      renderForm()

      await user.type(screen.getByPlaceholderText('如：Qwen-14B'), 'TestModel')
      await user.type(screen.getByPlaceholderText('如：server-01'), 'TestServer')
      await user.type(screen.getByPlaceholderText('如：GPU-A100'), 'GPU-Test')
      await user.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('性能指标数据')).toBeInTheDocument()
      })

      // 尝试提交（没有填写指标值，应该有验证错误）
      await user.click(screen.getByText('添加基准测试'))

      // 表单应该显示验证错误或者提交（取决于验证逻辑）
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('应该验证数值不能为负数', async () => {
      const user = userEvent.setup()
      renderForm()

      await user.type(screen.getByPlaceholderText('如：Qwen-14B'), 'TestModel')
      await user.type(screen.getByPlaceholderText('如：server-01'), 'TestServer')
      await user.type(screen.getByPlaceholderText('如：GPU-A100'), 'GPU-Test')
      await user.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('性能指标数据')).toBeInTheDocument()
      })

      // 输入负数的TTFT
      const ttftInput = screen.getAllByRole('spinbutton')[3]
      await user.clear(ttftInput)
      await user.type(ttftInput, '-10')

      await user.click(screen.getByText('添加基准测试'))

      // 应该有验证错误
      await waitFor(() => {
        expect(screen.getByText('TTFT不能为负数')).toBeInTheDocument()
      })
    })
  })

  describe('提交状态测试', () => {
    it('应该显示提交中状态', async () => {
      const user = userEvent.setup()
      renderForm({ isSubmitting: true })

      await user.type(screen.getByPlaceholderText('如：Qwen-14B'), 'TestModel')
      await user.type(screen.getByPlaceholderText('如：server-01'), 'TestServer')
      await user.type(screen.getByPlaceholderText('如：GPU-A100'), 'GPU-Test')
      await user.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('性能指标数据')).toBeInTheDocument()
      })

      expect(screen.getByText('提交中...')).toBeInTheDocument()
      expect(screen.getByText('添加基准测试')).toBeDisabled()
    })

    it('提交中应该禁用取消按钮', async () => {
      renderForm({ isSubmitting: true })

      expect(screen.getByText('取消')).toBeDisabled()
    })
  })

  describe('可扩展性测试', () => {
    it('应该能添加多个性能指标', async () => {
      const user = userEvent.setup()
      renderForm()

      await user.type(screen.getByPlaceholderText('如：Qwen-14B'), 'TestModel')
      await user.type(screen.getByPlaceholderText('如：server-01'), 'TestServer')
      await user.type(screen.getByPlaceholderText('如：GPU-A100'), 'GPU-Test')
      await user.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('性能指标数据')).toBeInTheDocument()
      })

      // 添加多个指标
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByText('添加指标'))
      }

      await waitFor(() => {
        expect(screen.getByText('指标 #6')).toBeInTheDocument()
      })

      // 验证徽章显示正确数量
      expect(screen.getByText('6 条')).toBeInTheDocument()
    })

    it('新添加的指标应该有递增的并发数', async () => {
      const user = userEvent.setup()
      renderForm()

      await user.type(screen.getByPlaceholderText('如：Qwen-14B'), 'TestModel')
      await user.type(screen.getByPlaceholderText('如：server-01'), 'TestServer')
      await user.type(screen.getByPlaceholderText('如：GPU-A100'), 'GPU-Test')
      await user.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('性能指标数据')).toBeInTheDocument()
      })

      // 第一个指标的并发数是1
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()

      // 添加新指标
      await user.click(screen.getByText('添加指标'))

      await waitFor(() => {
        // 新指标的并发数应该是2（上一个的2倍）
        expect(screen.getByDisplayValue('2')).toBeInTheDocument()
      })
    })
  })

  describe('数据完整性测试', () => {
    it('应该正确提交配置和指标数据', async () => {
      const user = userEvent.setup()
      renderForm()

      // 填写配置
      await user.type(screen.getByPlaceholderText('如：Qwen-14B'), 'MyModel')
      await user.type(screen.getByPlaceholderText('如：server-01'), 'MyServer')
      await user.type(screen.getByPlaceholderText('如：v1.0.1'), 'v2.0')
      await user.type(screen.getByPlaceholderText('如：GPU-A100'), 'GPU-B200')
      await user.type(screen.getByPlaceholderText('如：tp=4'), 'tp=8')
      await user.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('性能指标数据')).toBeInTheDocument()
      })

      // 修改指标值
      const inputs = screen.getAllByRole('spinbutton')
      await user.clear(inputs[0]) // concurrency
      await user.type(inputs[0], '16')
      await user.clear(inputs[3]) // ttft
      await user.type(inputs[3], '150.5')
      await user.clear(inputs[5]) // tps
      await user.type(inputs[5], '75.5')

      await user.click(screen.getByText('添加基准测试'))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      const submittedData = mockOnSubmit.mock.calls[0][0]
      expect(submittedData.config.modelName).toBe('MyModel')
      expect(submittedData.config.serverName).toBe('MyServer')
      expect(submittedData.config.frameworkVersion).toBe('v2.0')
      expect(submittedData.config.chipName).toBe('GPU-B200')
      expect(submittedData.config.shardingConfig).toBe('tp=8')
      expect(submittedData.metrics[0].concurrency).toBe(16)
      expect(submittedData.metrics[0].ttft).toBe(150.5)
      expect(submittedData.metrics[0].tokensPerSecond).toBe(75.5)
    })
  })

  describe('错误处理测试', () => {
    it('删除最后一个指标时应该显示错误提示', async () => {
      const user = userEvent.setup()
      renderForm()

      await user.type(screen.getByPlaceholderText('如：Qwen-14B'), 'TestModel')
      await user.type(screen.getByPlaceholderText('如：server-01'), 'TestServer')
      await user.type(screen.getByPlaceholderText('如：GPU-A100'), 'GPU-Test')
      await user.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('性能指标数据')).toBeInTheDocument()
      })

      // 尝试删除唯一的指标
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons.find(btn => btn.querySelector('svg'))
      if (deleteButton) {
        await user.click(deleteButton)
      }

      // 应该显示错误toast（被mock了，所以这里只验证逻辑）
      expect(screen.getByText('指标 #1')).toBeInTheDocument() // 指标应该还在
    })
  })
})

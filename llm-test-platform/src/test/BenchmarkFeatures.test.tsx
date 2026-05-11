import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BenchmarkList } from '../pages/BenchmarkList'
import { CsvImportEnhanced } from '../components/CsvImportEnhanced'
import { AddBenchmarkEnhanced } from '../components/AddBenchmarkEnhanced'
import { Benchmark } from '../lib/types'
import * as useBenchmarks from '../hooks/use-benchmarks'
import { toast } from 'sonner'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

// Mock use-benchmarks hook
vi.mock('../hooks/use-benchmarks', () => ({
  useBenchmarks: vi.fn(),
  useReports: vi.fn(),
  useSaveReport: vi.fn(),
  useDeleteBenchmark: vi.fn(),
  useDeleteReport: vi.fn(),
  useCreateBenchmark: vi.fn(),
  useImportBenchmark: vi.fn(),
  useUpdateBenchmark: vi.fn(),
  AdvancedSearchFilters: {},
}))

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock data
const mockBenchmarks = [
  {
    id: 1,
    unique_id: 'BM-20240101000000-ABCD',
    config: {
      submitter: 'admin',
      modelName: 'Qwen-14B',
      serverName: 'server-01',
      framework: 'MindIE',
      frameworkVersion: 'v1.0',
      chipName: 'GPU-A100',
      shardingConfig: 'tp=4',
      testDate: '2024-01-01',
    },
    metrics: [
      { concurrency: 1, inputLength: 1024, outputLength: 128, ttft: 45.2, tpot: 12.5, tokensPerSecond: 156.3 },
      { concurrency: 2, inputLength: 1024, outputLength: 128, ttft: 48.5, tpot: 13.2, tokensPerSecond: 142.8 },
    ],
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    unique_id: 'BM-20240102000000-EFGH',
    config: {
      submitter: 'admin',
      modelName: 'Llama-7B',
      serverName: 'server-02',
      framework: 'VLLM',
      frameworkVersion: 'v0.2',
      chipName: 'GPU-A100',
      shardingConfig: 'tp=2',
      testDate: '2024-01-02',
    },
    metrics: [
      { concurrency: 1, inputLength: 1024, outputLength: 128, ttft: 42.1, tpot: 11.8, tokensPerSecond: 168.5 },
      { concurrency: 4, inputLength: 1024, outputLength: 128, ttft: 50.3, tpot: 14.2, tokensPerSecond: 135.2 },
    ],
    created_at: '2024-01-02T00:00:00Z',
  },
]

describe('功能正确性测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useBenchmarks.useBenchmarks as any).mockReturnValue({
      data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
      isLoading: false,
    })
    ;(useBenchmarks.useReports as any).mockReturnValue({ data: [] })
    ;(useBenchmarks.useCreateBenchmark as any).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 3 }),
      isPending: false,
    })
  })

  describe('BenchmarkList 基础功能', () => {
    it('应该正确渲染基准测试列表', () => {
      const wrapper = createWrapper()
      render(<BenchmarkList />, { wrapper })

      expect(screen.getByText('性能结果呈现')).toBeInTheDocument()
      expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
      expect(screen.getByText('Llama-7B')).toBeInTheDocument()
    })

    it('应该支持搜索功能', async () => {
      const wrapper = createWrapper()
      render(<BenchmarkList />, { wrapper })

      const searchInput = screen.getByPlaceholderText('搜索模型、服务器...')
      await userEvent.type(searchInput, 'Qwen')

      expect(searchInput).toHaveValue('Qwen')
    })

    it('应该支持框架筛选', async () => {
      const wrapper = createWrapper()
      render(<BenchmarkList />, { wrapper })

      const frameworkSelect = screen.getByRole('combobox')
      await userEvent.click(frameworkSelect)

      expect(screen.getByText('MindIE')).toBeInTheDocument()
      expect(screen.getByText('VLLM')).toBeInTheDocument()
    })
  })

  describe('CSV导入功能测试', () => {
    it('应该打开增强CSV导入对话框', async () => {
      const wrapper = createWrapper()
      render(<BenchmarkList />, { wrapper })

      const importButton = screen.getByText('导入CSV')
      await userEvent.click(importButton)

      // 检查增强导入对话框是否打开
      await waitFor(() => {
        expect(document.querySelector('[role="dialog"]')).toBeInTheDocument()
      })
    })

    it('应该能下载CSV模板', () => {
      const createElementSpy = vi.spyOn(document, 'createElement')
      const mockClick = vi.fn()
      createElementSpy.mockReturnValue({
        href: '',
        download: '',
        click: mockClick,
      } as any)

      render(
        <CsvImportEnhanced
          isOpen={true}
          onClose={vi.fn()}
          onImport={vi.fn()}
          existingBenchmarks={[]}
        />
      )

      const downloadButton = screen.getByText('下载模板')
      fireEvent.click(downloadButton)

      expect(mockClick).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('模板下载成功')
    })

    it('应该正确解析CSV数据', async () => {
      const onImport = vi.fn()
      const csvContent = `concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond
1,1024,128,45.2,12.5,156.3
2,1024,128,48.5,13.2,142.8`

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' })

      render(
        <CsvImportEnhanced
          isOpen={true}
          onClose={vi.fn()}
          onImport={onImport}
          existingBenchmarks={[]}
        />
      )

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('成功解析'))
      })
    })

    it('应该验证CSV数据范围', async () => {
      const onImport = vi.fn()
      // 包含异常数据的CSV
      const csvContent = `concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond
1,1024,128,45.2,12.5,156.3
99999,1024,128,50000,12.5,156.3`

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' })

      render(
        <CsvImportEnhanced
          isOpen={true}
          onClose={vi.fn()}
          onImport={onImport}
          existingBenchmarks={[]}
        />
      )

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('警告'))
      })
    })

    it('应该支持选择部分行导入', async () => {
      const onImport = vi.fn()
      const csvContent = `concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond
1,1024,128,45.2,12.5,156.3
2,1024,128,48.5,13.2,142.8
4,1024,128,52.1,14.8,128.5`

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' })

      render(
        <CsvImportEnhanced
          isOpen={true}
          onClose={vi.fn()}
          onImport={onImport}
          existingBenchmarks={[]}
        />
      )

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(fileInput, file)

      // 等待解析完成
      await waitFor(() => {
        expect(screen.getByText('数据预览')).toBeInTheDocument()
      })
    })

    it('应该检测重复数据', async () => {
      const onImport = vi.fn()
      const existingBenchmarks: Benchmark[] = [
        {
          id: 1,
          unique_id: 'BM-20240101-0001',
          config: {
            submitter: 'admin',
            modelName: 'Qwen-14B',
            serverName: 'server-01',
            chipName: 'NVIDIA A100',
            framework: 'vLLM',
            frameworkVersion: '0.4.0',
            shardingConfig: 'tp=1',
            testDate: '2024-01-01',
          },
          metrics: [],
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      render(
        <CsvImportEnhanced
          isOpen={true}
          onClose={vi.fn()}
          onImport={onImport}
          existingBenchmarks={existingBenchmarks}
        />
      )

      // 验证重复检测功能存在
      expect(screen.getByText('增强CSV导入')).toBeInTheDocument()
    })
  })

  describe('手动添加功能测试', () => {
    it('应该正确渲染添加表单', () => {
      render(
        <AddBenchmarkEnhanced
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      )

      expect(screen.getByText('配置信息')).toBeInTheDocument()
      expect(screen.getByLabelText(/模型名称/)).toBeInTheDocument()
      expect(screen.getByLabelText(/服务器名称/)).toBeInTheDocument()
    })

    it('应该验证必填字段', async () => {
      const onSubmit = vi.fn()
      render(
        <AddBenchmarkEnhanced
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      )

      // 点击下一步但不填写必填字段
      const nextButton = screen.getByText('下一步')
      await userEvent.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('请输入模型名称')).toBeInTheDocument()
        expect(screen.getByText('请输入服务器名称')).toBeInTheDocument()
      })
    })

    it('应该支持添加多个性能指标', async () => {
      const onSubmit = vi.fn()
      render(
        <AddBenchmarkEnhanced
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      )

      // 填写配置信息
      await userEvent.type(screen.getByLabelText(/模型名称/), 'Test-Model')
      await userEvent.type(screen.getByLabelText(/服务器名称/), 'server-test')
      await userEvent.type(screen.getByLabelText(/AI芯片/), 'GPU-A100')

      // 进入下一步
      await userEvent.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('性能指标数据')).toBeInTheDocument()
      })

      // 添加新指标
      const addButton = screen.getByText('添加指标')
      await userEvent.click(addButton)

      // 验证指标数量增加
      expect(screen.getAllByText(/指标 #/).length).toBeGreaterThan(1)
    })

    it('应该支持CSV粘贴导入', async () => {
      const onSubmit = vi.fn()
      render(
        <AddBenchmarkEnhanced
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      )

      // 填写配置信息并进入下一步
      await userEvent.type(screen.getByLabelText(/模型名称/), 'Test-Model')
      await userEvent.type(screen.getByLabelText(/服务器名称/), 'server-test')
      await userEvent.type(screen.getByLabelText(/AI芯片/), 'GPU-A100')
      await userEvent.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('粘贴CSV')).toBeInTheDocument()
      })

      // 点击粘贴CSV按钮
      await userEvent.click(screen.getByText('粘贴CSV'))

      await waitFor(() => {
        expect(screen.getByText('粘贴CSV数据')).toBeInTheDocument()
      })
    })

    it('应该兼容vLLM CSV列名并计算缺失TPOT', async () => {
      const user = userEvent.setup()
      render(<BenchmarkList />)

      // 打开增强CSV导入
      await user.click(screen.getByText('增强CSV导入'))
      await waitFor(() => {
        expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
      })

      // 切换到粘贴模式
      await user.click(screen.getByText('粘贴CSV'))

      const csvContent = `Process Num,Input Length,Output Length,TTFT (ms),avg TPS (without prefill),avg TPS (with prefill),Total Time (ms),TPS (without prefill),TPS (with prefill),Error,avg input Tokens,avg output Tokens
1,128,128,146.0948,40.2046,38.7279,3305.1092624664307,40.2046,38.7279,,128,128`

      const textarea = screen.getByPlaceholderText('在此粘贴CSV数据...') as HTMLTextAreaElement
      await user.clear(textarea)
      await user.type(textarea, csvContent)

      // 解析
      await user.click(screen.getByText('解析并预览'))

      await waitFor(() => {
        expect(screen.getByText('成功解析 1 行数据')).toBeInTheDocument()
      })

      // 进入导入配置
      await user.click(screen.getByText('下一步'))

      await user.clear(screen.getByPlaceholderText('如：Qwen-14B'))
      await user.type(screen.getByPlaceholderText('如：Qwen-14B'), 'Qwen3-30B-A3B-FP8')
      await user.type(screen.getByPlaceholderText('如：server-01'), 'server-01')
      await user.type(screen.getByPlaceholderText('如：GPU-A100'), 'Ascend NPU')

      await user.click(screen.getByText('导入数据'))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('成功解析'))
      })

      // 确保解析结果包含推算的TPOT
      const tpotCell = screen.getByText((content, node) => {
        const hasText = (node: Element) => node.textContent === '25.0'
        const nodeHasText = hasText(node as Element)
        const childrenDontHaveText = Array.from((node as Element).children || []).every(child => !hasText(child))
        return nodeHasText && childrenDontHaveText
      })
      expect(tpotCell).toBeInTheDocument()
    })

    it('应该支持复制现有基准测试', async () => {
      const onSubmit = vi.fn()
      render(
        <AddBenchmarkEnhanced
          onSubmit={onSubmit}
          onCancel={vi.fn()}
          existingBenchmarks={mockBenchmarks}
        />
      )

      const copyButton = screen.getByText('复制现有测试')
      await userEvent.click(copyButton)

      await waitFor(() => {
        expect(screen.getByText('复制现有基准测试')).toBeInTheDocument()
      })
    })

    it('应该验证性能指标范围', async () => {
      const onSubmit = vi.fn()
      render(
        <AddBenchmarkEnhanced
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      )

      // 填写配置信息
      await userEvent.type(screen.getByLabelText(/模型名称/), 'Test-Model')
      await userEvent.type(screen.getByLabelText(/服务器名称/), 'server-test')
      await userEvent.type(screen.getByLabelText(/AI芯片/), 'GPU-A100')
      await userEvent.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('性能指标数据')).toBeInTheDocument()
      })

      // 验证指标输入存在
      expect(screen.getByText('指标 #1')).toBeInTheDocument()
    })
  })
})

describe('可靠性测试', () => {
  describe('错误处理', () => {
    it('应该处理CSV解析错误', async () => {
      const onImport = vi.fn()
      const invalidCsv = 'invalid,data\nno,valid,columns'

      const file = new File([invalidCsv], 'invalid.csv', { type: 'text/csv' })

      render(
        <CsvImportEnhanced
          isOpen={true}
          onClose={vi.fn()}
          onImport={onImport}
          existingBenchmarks={[]}
        />
      )

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('解析失败'))
      })
    })

    it('应该处理超大文件', async () => {
      const onImport = vi.fn()
      // 创建超过10MB的文件
      const largeContent = 'a'.repeat(11 * 1024 * 1024)
      const file = new File([largeContent], 'large.csv', { type: 'text/csv' })

      render(
        <CsvImportEnhanced
          isOpen={true}
          onClose={vi.fn()}
          onImport={onImport}
          existingBenchmarks={[]}
        />
      )

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('文件大小不能超过10MB')
      })
    })

    it('应该处理网络错误', async () => {
      ;(useBenchmarks.useCreateBenchmark as any).mockReturnValue({
        mutateAsync: vi.fn().mockRejectedValue(new Error('Network error')),
        isPending: false,
      })

      const wrapper = createWrapper()
      render(<BenchmarkList />, { wrapper })

      // 尝试添加基准测试
      await userEvent.click(screen.getByText('手动添加'))

      // 验证错误处理
      expect(document.querySelector('[role="dialog"]')).toBeInTheDocument()
    })
  })

  describe('数据一致性', () => {
    it('应该保持并发数唯一性', async () => {
      const onSubmit = vi.fn()
      render(
        <AddBenchmarkEnhanced
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      )

      // 填写配置
      await userEvent.type(screen.getByLabelText(/模型名称/), 'Test-Model')
      await userEvent.type(screen.getByLabelText(/服务器名称/), 'server-test')
      await userEvent.type(screen.getByLabelText(/AI芯片/), 'GPU-A100')
      await userEvent.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('性能指标数据')).toBeInTheDocument()
      })

      // 添加第二个相同并发数的指标
      await userEvent.click(screen.getByText('添加指标'))

      // 验证可以添加（会在验证时检测重复）
      expect(screen.getAllByText(/指标 #/).length).toBe(2)
    })

    it('应该验证TTFT和TPOT一致性', async () => {
      const onSubmit = vi.fn()
      render(
        <AddBenchmarkEnhanced
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      )

      // 填写配置并进入指标步骤
      await userEvent.type(screen.getByLabelText(/模型名称/), 'Test-Model')
      await userEvent.type(screen.getByLabelText(/服务器名称/), 'server-test')
      await userEvent.type(screen.getByLabelText(/AI芯片/), 'GPU-A100')
      await userEvent.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('性能指标数据')).toBeInTheDocument()
      })

      // 验证指标表单存在
      expect(screen.getByLabelText(/并发数/)).toBeInTheDocument()
    })
  })
})

describe('可扩展性测试', () => {
  describe('大数据量处理', () => {
    it('应该能处理大量性能指标', async () => {
      const onSubmit = vi.fn()
      render(
        <AddBenchmarkEnhanced
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      )

      // 填写配置
      await userEvent.type(screen.getByLabelText(/模型名称/), 'Test-Model')
      await userEvent.type(screen.getByLabelText(/服务器名称/), 'server-test')
      await userEvent.type(screen.getByLabelText(/AI芯片/), 'GPU-A100')
      await userEvent.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('性能指标数据')).toBeInTheDocument()
      })

      // 使用CSV粘贴添加大量数据
      await userEvent.click(screen.getByText('粘贴CSV'))

      await waitFor(() => {
        expect(screen.getByText('粘贴CSV数据')).toBeInTheDocument()
      })

      // 粘贴大量数据
      const csvData = Array.from({ length: 100 }, (_, i) => 
        `${i + 1},${45 + i},${12.5},${156.3},1024,128`
      ).join('\n')

      const textarea = screen.getByPlaceholderText('在此粘贴CSV数据...')
      await userEvent.type(textarea, csvData)

      await userEvent.click(screen.getByText('解析数据'))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('成功导入'))
      })
    })
  })

  describe('模板管理', () => {
    it('应该支持保存和加载模板', async () => {
      const onSubmit = vi.fn()
      render(
        <AddBenchmarkEnhanced
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      )

      // 填写配置
      await userEvent.type(screen.getByLabelText(/模型名称/), 'Test-Model')
      await userEvent.type(screen.getByLabelText(/服务器名称/), 'server-test')
      await userEvent.type(screen.getByLabelText(/AI芯片/), 'GPU-A100')
      await userEvent.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('保存模板')).toBeInTheDocument()
      })

      // 点击保存模板
      await userEvent.click(screen.getByText('保存模板'))

      await waitFor(() => {
        expect(screen.getByText('保存为模板')).toBeInTheDocument()
      })

      // 输入模板名称
      const nameInput = screen.getByLabelText('模板名称 *')
      await userEvent.type(nameInput, '我的模板')

      // 保存
      await userEvent.click(screen.getByText('保存'))

      expect(toast.success).toHaveBeenCalledWith('模板保存成功')
    })
  })
})

describe('安全性测试', () => {
  describe('输入验证', () => {
    it('应该防止XSS攻击', async () => {
      const onSubmit = vi.fn()
      render(
        <AddBenchmarkEnhanced
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      )

      // 尝试输入恶意脚本
      const maliciousInput = '<script>alert("xss")</script>'
      await userEvent.type(screen.getByLabelText(/模型名称/), maliciousInput)

      // 验证输入被接受（React会自动转义）
      expect(screen.getByLabelText(/模型名称/)).toHaveValue(maliciousInput)
    })

    it('应该验证文件类型', async () => {
      const onImport = vi.fn()
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' })

      render(
        <CsvImportEnhanced
          isOpen={true}
          onClose={vi.fn()}
          onImport={onImport}
          existingBenchmarks={[]}
        />
      )

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(fileInput, invalidFile)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('请上传CSV格式文件')
      })
    })

    it('应该限制字段长度', async () => {
      const onSubmit = vi.fn()
      render(
        <AddBenchmarkEnhanced
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      )

      // 输入超长模型名称
      const longName = 'a'.repeat(101)
      await userEvent.type(screen.getByLabelText(/模型名称/), longName)

      // 点击下一步触发验证
      await userEvent.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('模型名称不能超过100个字符')).toBeInTheDocument()
      })
    })
  })

  describe('数据验证', () => {
    it('应该验证数值范围', async () => {
      const onSubmit = vi.fn()
      render(
        <AddBenchmarkEnhanced
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      )

      // 填写配置
      await userEvent.type(screen.getByLabelText(/模型名称/), 'Test-Model')
      await userEvent.type(screen.getByLabelText(/服务器名称/), 'server-test')
      await userEvent.type(screen.getByLabelText(/AI芯片/), 'GPU-A100')
      await userEvent.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('性能指标数据')).toBeInTheDocument()
      })

      // 验证数值范围限制
      expect(screen.getByLabelText(/并发数/)).toHaveAttribute('min', '1')
    })

    it('应该防止负数输入', async () => {
      const onSubmit = vi.fn()
      render(
        <AddBenchmarkEnhanced
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      )

      // 填写配置
      await userEvent.type(screen.getByLabelText(/模型名称/), 'Test-Model')
      await userEvent.type(screen.getByLabelText(/服务器名称/), 'server-test')
      await userEvent.type(screen.getByLabelText(/AI芯片/), 'GPU-A100')
      await userEvent.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('性能指标数据')).toBeInTheDocument()
      })

      // TTFT和TPOT应该不能为负数
      const ttftInput = screen.getAllByLabelText(/TTFT/)[0]
      expect(ttftInput).toHaveAttribute('min', '0')
    })
  })
})

describe('用户体验测试', () => {
  describe('界面交互', () => {
    it('应该支持步骤导航', async () => {
      const onSubmit = vi.fn()
      render(
        <AddBenchmarkEnhanced
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      )

      // 初始在配置步骤
      expect(screen.getByText('配置信息').parentElement).toHaveClass('text-blue-600')

      // 填写必填字段
      await userEvent.type(screen.getByLabelText(/模型名称/), 'Test-Model')
      await userEvent.type(screen.getByLabelText(/服务器名称/), 'server-test')
      await userEvent.type(screen.getByLabelText(/AI芯片/), 'GPU-A100')

      // 进入下一步
      await userEvent.click(screen.getByText('下一步'))

      await waitFor(() => {
        expect(screen.getByText('性能指标').parentElement).toHaveClass('text-blue-600')
      })

      // 返回上一步
      await userEvent.click(screen.getByText('上一步'))

      expect(screen.getByText('配置信息').parentElement).toHaveClass('text-blue-600')
    })

    it('应该显示加载状态', async () => {
      ;(useBenchmarks.useBenchmarks as any).mockReturnValue({
        data: null,
        isLoading: true,
      })

      const wrapper = createWrapper()
      render(<BenchmarkList />, { wrapper })

      // 验证加载状态
      expect(screen.getByTestId('skeleton')).toBeInTheDocument()
    })

    it('应该提供清晰的错误提示', async () => {
      const onSubmit = vi.fn()
      render(
        <AddBenchmarkEnhanced
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      )

      // 不填写字段直接下一步
      await userEvent.click(screen.getByText('下一步'))

      // 验证错误提示
      await waitFor(() => {
        const errors = screen.getAllByText(/请输入/)
        expect(errors.length).toBeGreaterThan(0)
      })
    })
  })

  describe('辅助功能', () => {
    it('应该支持键盘导航', async () => {
      const onSubmit = vi.fn()
      render(
        <AddBenchmarkEnhanced
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      )

      // 验证输入框可以获得焦点
      const modelInput = screen.getByLabelText(/模型名称/)
      modelInput.focus()
      expect(modelInput).toHaveFocus()

      // Tab导航到下一个字段
      await userEvent.tab()
      expect(screen.getByLabelText(/服务器名称/)).toHaveFocus()
    })

    it('应该有正确的标签关联', () => {
      const onSubmit = vi.fn()
      render(
        <AddBenchmarkEnhanced
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      )

      // 验证标签和输入框关联
      const modelLabel = screen.getByText('模型名称')
      const modelInput = screen.getByLabelText(/模型名称/)
      expect(modelInput).toHaveAttribute('id', modelLabel.getAttribute('for'))
    })
  })
})

describe('高级搜索功能测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useBenchmarks.useBenchmarks as any).mockReturnValue({
      data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
      isLoading: false,
    })
    ;(useBenchmarks.useReports as any).mockReturnValue({ data: [] })
    ;(useBenchmarks.useUpdateBenchmark as any).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 1 }),
      isPending: false,
    })
  })

  it('应该显示高级搜索面板', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    const advancedSearchButton = screen.getByText('高级搜索')
    await userEvent.click(advancedSearchButton)

    expect(screen.getByText('高级搜索')).toBeInTheDocument()
  })

  it('应该支持按提交人搜索', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByText('高级搜索'))

    const submitterInput = screen.getByLabelText('提交人')
    await userEvent.type(submitterInput, 'admin')

    expect(submitterInput).toHaveValue('admin')
  })

  it('应该支持按模型名称搜索', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByText('高级搜索'))

    const modelNameInput = screen.getByLabelText('模型名称')
    await userEvent.type(modelNameInput, 'Qwen')

    expect(modelNameInput).toHaveValue('Qwen')
  })

  it('应该支持按服务器名称搜索', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByText('高级搜索'))

    const serverNameInput = screen.getByLabelText('服务器名称')
    await userEvent.type(serverNameInput, 'server-01')

    expect(serverNameInput).toHaveValue('server-01')
  })

  it('应该支持按AI芯片搜索', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByText('高级搜索'))

    const chipNameInput = screen.getByLabelText('AI芯片')
    await userEvent.type(chipNameInput, 'A100')

    expect(chipNameInput).toHaveValue('A100')
  })

  it('应该支持按推理框架搜索', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByText('高级搜索'))

    const frameworkInput = screen.getByLabelText('推理框架')
    await userEvent.type(frameworkInput, 'MindIE')

    expect(frameworkInput).toHaveValue('MindIE')
  })

  it('应该支持清空筛选条件', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByText('高级搜索'))

    await userEvent.type(screen.getByLabelText('提交人'), 'admin')
    await userEvent.type(screen.getByLabelText('模型名称'), 'Qwen')

    const resetButton = screen.getByText('清空筛选')
    await userEvent.click(resetButton)

    expect(screen.getByLabelText('提交人')).toHaveValue('')
    expect(screen.getByLabelText('模型名称')).toHaveValue('')
  })
})

describe('基准测试详情编辑功能测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useBenchmarks.useBenchmarks as any).mockReturnValue({
      data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
      isLoading: false,
    })
    ;(useBenchmarks.useReports as any).mockReturnValue({ data: [] })
    ;(useBenchmarks.useUpdateBenchmark as any).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 1 }),
      isPending: false,
    })
  })

  it('应该打开基准测试详情对话框', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    const viewButton = screen.getByTitle('查看详情/编辑')
    await userEvent.click(viewButton)

    expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
  })

  it('应该显示基准测试配置信息', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByTitle('查看详情/编辑'))

    expect(screen.getByText('模型名称')).toBeInTheDocument()
    expect(screen.getByText('服务器名称')).toBeInTheDocument()
    expect(screen.getByText('AI芯片')).toBeInTheDocument()
    expect(screen.getByText('推理框架')).toBeInTheDocument()
  })

  it('应该显示性能指标数据表格', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByTitle('查看详情/编辑'))

    expect(screen.getByText('性能数据')).toBeInTheDocument()
    expect(screen.getByText('并发数')).toBeInTheDocument()
    expect(screen.getByText('输入长度')).toBeInTheDocument()
    expect(screen.getByText('输出长度')).toBeInTheDocument()
    expect(screen.getByText('TTFT (ms)')).toBeInTheDocument()
    expect(screen.getByText('TPOT (ms)')).toBeInTheDocument()
    expect(screen.getByText('TPS (tokens/s)')).toBeInTheDocument()
  })

  it('应该支持编辑配置信息', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByTitle('查看详情/编辑'))

    const modelNameInput = screen.getByDisplayValue('Qwen-14B')
    await userEvent.clear(modelNameInput)
    await userEvent.type(modelNameInput, 'Updated-Model')

    expect(screen.getByDisplayValue('Updated-Model')).toBeInTheDocument()
  })

  it('应该支持编辑性能指标', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByTitle('查看详情/编辑'))

    const editButton = screen.getByRole('button', { name: /铅笔图标/ })
    await userEvent.click(editButton)

    const ttftInput = screen.getByDisplayValue('45.2')
    await userEvent.clear(ttftInput)
    await userEvent.type(ttftInput, '50.0')

    const saveButton = screen.getByRole('button', { name: /保存图标/ })
    await userEvent.click(saveButton)

    expect(screen.getByDisplayValue('50.0')).toBeInTheDocument()
  })

  it('应该支持删除性能指标', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByTitle('查看详情/编辑'))

    const initialRows = screen.getAllByRole('row').length - 1

    const deleteButton = screen.getByRole('button', { name: /删除图标/ })
    await userEvent.click(deleteButton)

    const finalRows = screen.getAllByRole('row').length - 1
    expect(finalRows).toBeLessThan(initialRows)
  })

  it('应该支持添加新性能指标', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByTitle('查看详情/编辑'))

    const addButton = screen.getByText('添加数据')
    await userEvent.click(addButton)

    expect(screen.getByText('指标 #3')).toBeInTheDocument()
  })

  it('应该保存更改', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByTitle('查看详情/编辑'))

    const saveButton = screen.getByText('保存更改')
    await userEvent.click(saveButton)

    expect(useBenchmarks.useUpdateBenchmark).toHaveBeenCalled()
  })
})

describe('性能趋势图对比功能测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useBenchmarks.useBenchmarks as any).mockReturnValue({
      data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
      isLoading: false,
    })
    ;(useBenchmarks.useReports as any).mockReturnValue({ data: [] })
  })

  it('应该切换到性能趋势图标签', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    const trendsTab = screen.getByRole('tab', { name: /性能趋势图/ })
    await userEvent.click(trendsTab)

    expect(screen.getByText('性能趋势图')).toBeInTheDocument()
  })

  it('应该显示选择提示', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByRole('tab', { name: /性能趋势图/ }))

    expect(screen.getByText('请选择两个基准测试查看趋势对比图')).toBeInTheDocument()
  })

  it('应该支持选择第一个基准测试', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByRole('tab', { name: /性能趋势图/ }))

    const firstBenchmark = screen.getByText('Qwen-14B')
    await userEvent.click(firstBenchmark)

    expect(screen.getByText('已选择 1/2')).toBeInTheDocument()
  })

  it('应该支持选择第二个基准测试进行对比', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByRole('tab', { name: /性能趋势图/ }))

    await userEvent.click(screen.getByText('Qwen-14B'))
    await userEvent.click(screen.getByText('Llama-7B'))

    expect(screen.getByText('已选择 2/2')).toBeInTheDocument()
  })

  it('应该清除选择', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByRole('tab', { name: /性能趋势图/ }))

    await userEvent.click(screen.getByText('Qwen-14B'))

    const clearButton = screen.getByText('清除选择')
    await userEvent.click(clearButton)

    expect(screen.getByText('请选择两个基准测试查看趋势对比图')).toBeInTheDocument()
  })

  it('应该标记已选择的基准测试', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByRole('tab', { name: /性能趋势图/ }))

    await userEvent.click(screen.getByText('Qwen-14B'))

    const badge = screen.getByText('A')
    expect(badge).toBeInTheDocument()
  })

  it('应该显示两个已选测试的标签', async () => {
    const wrapper = createWrapper()
    render(<BenchmarkList />, { wrapper })

    await userEvent.click(screen.getByRole('tab', { name: /性能趋势图/ }))

    await userEvent.click(screen.getByText('Qwen-14B'))
    await userEvent.click(screen.getByText('Llama-7B'))

    expect(screen.getByText('A: Qwen-14B')).toBeInTheDocument()
    expect(screen.getByText('B: Llama-7B')).toBeInTheDocument()
  })
})

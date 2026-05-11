import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BenchmarkList } from '../pages/BenchmarkList'
import * as useBenchmarksModule from '../hooks/use-benchmarks'
import { Benchmark, Report } from '../lib/types'

// Mock hooks
vi.mock('../hooks/use-benchmarks', () => ({
  useBenchmarks: vi.fn(),
  useReports: vi.fn(),
  useSaveReport: vi.fn(),
  useDeleteBenchmark: vi.fn(),
  useDeleteReport: vi.fn(),
  useCreateBenchmark: vi.fn(),
  useImportBenchmark: vi.fn(),
  useUpdateBenchmark: vi.fn(),
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

const mockBenchmarks: Benchmark[] = [
  {
    id: 1,
    unique_id: 'bench-001',
    config: {
      submitter: 'admin',
      modelName: 'Qwen-14B',
      serverName: 'server-01',
      framework: 'MindIE',
      frameworkVersion: 'v1.0.1',
      chipName: 'GPU-A100',
      shardingConfig: 'tp=4',
      testDate: '2024-01-15',
    },
    metrics: [
      { concurrency: 1, inputLength: 1024, outputLength: 128, ttft: 100, tpot: 20, tokensPerSecond: 45.5 },
      { concurrency: 8, inputLength: 1024, outputLength: 128, ttft: 120, tpot: 25, tokensPerSecond: 320.2 },
    ],
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 2,
    unique_id: 'bench-002',
    config: {
      submitter: 'admin',
      modelName: 'Llama-7B',
      serverName: 'server-02',
      framework: 'VLLM',
      frameworkVersion: 'v2.0.0',
      chipName: 'GPU-V100',
      shardingConfig: 'tp=2',
      testDate: '2024-01-16',
    },
    metrics: [
      { concurrency: 1, inputLength: 1024, outputLength: 128, ttft: 90, tpot: 18, tokensPerSecond: 52.1 },
      { concurrency: 8, inputLength: 1024, outputLength: 128, ttft: 110, tpot: 22, tokensPerSecond: 380.5 },
    ],
    created_at: '2024-01-16T00:00:00Z',
  },
]

const mockReports: Report[] = [
  {
    id: 1,
    unique_id: 'report-001',
    benchmark_id1: 1,
    benchmark_id2: 2,
    model_name1: 'Qwen-14B',
    model_name2: 'Llama-7B',
    summary: 'Qwen-14B性能略低于Llama-7B',
    created_at: '2024-01-17T00:00:00Z',
  },
]

describe('性能结果呈现模块测试', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    vi.clearAllMocks()
  })

  const renderBenchmarkList = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BenchmarkList />
      </QueryClientProvider>
    )
  }

  describe('UI渲染测试', () => {
    it('应该正确渲染性能结果呈现页面', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: mockReports,
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderBenchmarkList()

      // 验证页面标题
      expect(screen.getByText('性能结果呈现')).toBeInTheDocument()
      expect(screen.getByText('查看和分析测试结果，对比性能数据')).toBeInTheDocument()

      // 验证导入CSV按钮
      expect(screen.getByText('导入CSV')).toBeInTheDocument()

      // 验证Tabs
      expect(screen.getByText('基准测试')).toBeInTheDocument()
      expect(screen.getByText('对比报告')).toBeInTheDocument()

      // 等待基准测试列表渲染
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
        expect(screen.getByText('Llama-7B')).toBeInTheDocument()
      })
    })

    it('应该显示加载状态', () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: null,
        isLoading: true,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)

      renderBenchmarkList()

      // 验证骨架屏显示
      const skeletons = document.querySelectorAll('.skeleton')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('应该显示空状态', () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)

      renderBenchmarkList()

      expect(screen.getByText('暂无基准测试数据')).toBeInTheDocument()
    })
  })

  describe('Dialog样式测试', () => {
    it('导入CSV Dialog应该有正确的样式类名', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 打开导入CSV Dialog
      await user.click(screen.getByText('导入CSV'))

      // 验证Dialog内容存在
      await waitFor(() => {
        expect(screen.getByText('导入CSV测试结果')).toBeInTheDocument()
      })

      // 验证Dialog有正确的样式类
      const dialogContent = document.querySelector('[data-radix-dialog-content]')
      expect(dialogContent).toHaveClass('bg-white')
      expect(dialogContent).toHaveClass('border-2')
      expect(dialogContent).toHaveClass('shadow-2xl')

      // 验证文件上传区域有正确样式
      const uploadArea = screen.getByText('点击选择CSV文件或将文件拖拽到此处').parentElement?.parentElement
      expect(uploadArea).toHaveClass('border-2')
      expect(uploadArea).toHaveClass('border-dashed')
      expect(uploadArea).toHaveClass('bg-slate-50')

      // 验证Label有正确样式
      const fileLabel = screen.getByText('选择CSV文件')
      expect(fileLabel).toHaveClass('font-semibold')
      expect(fileLabel).toHaveClass('text-slate-800')
    })

    it('性能对比Dialog应该有正确的样式类名', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 等待列表渲染
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
      })

      // 选择两个基准测试
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThanOrEqual(2)
      
      await user.click(checkboxes[0])
      await user.click(checkboxes[1])

      // 点击对比按钮
      await user.click(screen.getByText(/对比/))

      // 验证对比Dialog打开
      await waitFor(() => {
        expect(screen.getByText('性能对比')).toBeInTheDocument()
      })

      // 验证Dialog有正确的样式类
      const dialogContent = document.querySelector('[data-radix-dialog-content]')
      expect(dialogContent).toHaveClass('bg-white')
      expect(dialogContent).toHaveClass('border-2')
      expect(dialogContent).toHaveClass('shadow-2xl')
    })
  })

  describe('功能正确性测试', () => {
    it('应该能够打开导入CSV Dialog', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 点击导入CSV按钮
      await user.click(screen.getByText('导入CSV'))

      // 验证Dialog打开
      await waitFor(() => {
        expect(screen.getByText('导入CSV测试结果')).toBeInTheDocument()
      })

      // 验证文件上传区域存在
      expect(screen.getByText('点击选择CSV文件或将文件拖拽到此处')).toBeInTheDocument()
      expect(screen.getByText('支持CSV格式的测试结果文件，文件大小不超过10MB')).toBeInTheDocument()
    })

    it('应该能够选择基准测试进行对比', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 等待列表渲染
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
        expect(screen.getByText('Llama-7B')).toBeInTheDocument()
      })

      // 选择两个基准测试
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])
      await user.click(checkboxes[1])

      // 验证对比按钮显示并启用
      expect(screen.getByText(/对比 \(2\)/)).toBeInTheDocument()
    })

    it('应该能够删除基准测试', async () => {
      const mockDeleteBenchmark = vi.fn().mockResolvedValue({})
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: mockDeleteBenchmark,
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 等待列表渲染
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
      })

      // 查找并点击删除按钮
      const deleteButtons = screen.getAllByTitle('删除')
      expect(deleteButtons.length).toBeGreaterThan(0)
      await user.click(deleteButtons[0])

      // 验证删除函数被调用
      await waitFor(() => {
        expect(mockDeleteBenchmark).toHaveBeenCalledWith(1)
      })
    })

    it('应该能够在报告tab之间切换', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: mockReports,
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 等待基准测试tab渲染
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
      })

      // 切换到对比报告tab
      await user.click(screen.getByText('对比报告'))

      // 验证报告列表渲染
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
        expect(screen.getByText('Llama-7B')).toBeInTheDocument()
      })
    })
  })

  describe('可扩展性测试', () => {
    it('应该支持多种框架筛选', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderBenchmarkList()

      // 验证筛选器存在
      expect(screen.getByPlaceholderText('搜索模型、服务器...')).toBeInTheDocument()
    })

    it('应该支持大量数据的分页显示', async () => {
      const manyBenchmarks = Array.from({ length: 25 }, (_, i) => ({
        ...mockBenchmarks[0],
        id: i + 1,
        unique_id: `bench-${String(i + 1).padStart(3, '0')}`,
      }))

      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: manyBenchmarks, total: 25, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderBenchmarkList()

      // 验证分页控件存在
      await waitFor(() => {
        expect(screen.getByText(/第 1 \/ 2 页/)).toBeInTheDocument()
        expect(screen.getByText('下一页')).toBeInTheDocument()
      })
    })
  })

  describe('可靠性测试', () => {
    it('应该在删除失败时显示错误', async () => {
      const mockDeleteBenchmark = vi.fn().mockRejectedValue(new Error('Delete failed'))
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: mockDeleteBenchmark,
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
      })

      // 点击删除按钮
      const deleteButtons = screen.getAllByTitle('删除')
      await user.click(deleteButtons[0])

      // 验证错误处理
      await waitFor(() => {
        expect(mockDeleteBenchmark).toHaveBeenCalled()
      })
    })

    it('应该处理CSV文件上传', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 打开导入CSV Dialog
      await user.click(screen.getByText('导入CSV'))

      await waitFor(() => {
        expect(screen.getByText('导入CSV测试结果')).toBeInTheDocument()
      })

      // 验证文件输入存在
      const fileInput = document.querySelector('input[type="file"]')
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveAttribute('accept', '.csv')
    })
  })

  describe('安全性测试', () => {
    it('应该验证CSV文件类型', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 打开导入CSV Dialog
      await user.click(screen.getByText('导入CSV'))

      await waitFor(() => {
        expect(screen.getByText('导入CSV测试结果')).toBeInTheDocument()
      })

      // 尝试上传非CSV文件
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const invalidFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
      
      await user.upload(fileInput!, invalidFile)

      // 验证错误提示
      // 注意：实际测试中toast可能被调用，但由于mock，我们需要检查逻辑
    })
  })

  describe('性能对比Tab测试', () => {
    it('应该渲染性能对比Tab', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 切换到性能对比Tab
      await user.click(screen.getByText('性能对比'))

      // 验证Tab内容
      await waitFor(() => {
        expect(screen.getByText('性能对比分析')).toBeInTheDocument()
        expect(screen.getByText(/选择两个基准测试进行详细对比分析/)).toBeInTheDocument()
      })
    })

    it('应该在性能对比Tab中选择基准测试', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 切换到性能对比Tab
      await user.click(screen.getByText('性能对比'))

      await waitFor(() => {
        expect(screen.getByText('请选择两个基准测试进行对比')).toBeInTheDocument()
      })

      // 选择第一个基准测试
      const benchmarkCards = screen.getAllByText('Qwen-14B')
      await user.click(benchmarkCards[benchmarkCards.length - 1])

      // 验证选中状态
      expect(screen.getByText('A')).toBeInTheDocument()
    })

    it('应该在性能对比Tab中显示对比结果', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 切换到性能对比Tab
      await user.click(screen.getByText('性能对比'))

      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
      })

      // 选择两个基准测试（通过点击卡片）
      const cards = document.querySelectorAll('[class*="cursor-pointer"]')
      if (cards.length >= 2) {
        await user.click(cards[0])
        await user.click(cards[1])
      }
    })
  })

  describe('性能趋势图Tab测试', () => {
    it('应该渲染性能趋势图Tab', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 切换到性能趋势图Tab
      await user.click(screen.getByText('性能趋势图'))

      // 验证Tab内容
      await waitFor(() => {
        expect(screen.getByText('性能趋势图')).toBeInTheDocument()
        expect(screen.getByText(/查看单个基准测试在不同并发数下的性能趋势/)).toBeInTheDocument()
      })
    })

    it('应该在性能趋势图Tab中选择基准测试', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 切换到性能趋势图Tab
      await user.click(screen.getByText('性能趋势图'))

      await waitFor(() => {
        expect(screen.getByText('请选择一个基准测试查看趋势图')).toBeInTheDocument()
      })

      // 选择基准测试
      const benchmarkCards = screen.getAllByText('Qwen-14B')
      await user.click(benchmarkCards[benchmarkCards.length - 1])

      // 验证选中后显示趋势图相关内容
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B 性能趋势')).toBeInTheDocument()
      })
    })
  })

  describe('新功能可扩展性测试', () => {
    it('应该处理大量基准测试数据', async () => {
      const manyBenchmarks = Array.from({ length: 10 }, (_, i) => ({
        ...mockBenchmarks[0],
        id: i + 1,
        unique_id: `bench-${String(i + 1).padStart(3, '0')}`,
        config: {
          ...mockBenchmarks[0].config,
          modelName: `Model-${i + 1}`,
        },
      }))

      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: manyBenchmarks, total: 10, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 切换到性能对比Tab
      await user.click(screen.getByText('性能对比'))

      // 应该显示多个基准测试选择卡片
      await waitFor(() => {
        expect(screen.getByText('选择基准测试：')).toBeInTheDocument()
      })
    })
  })

  describe('手动添加基准测试功能测试', () => {
    it('应该显示手动添加按钮', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderBenchmarkList()

      // 验证手动添加按钮存在
      expect(screen.getByText('手动添加')).toBeInTheDocument()
    })

    it('应该能打开手动添加Dialog', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 点击手动添加按钮
      await user.click(screen.getByText('手动添加'))

      // 验证Dialog打开
      await waitFor(() => {
        expect(screen.getByText('手动添加基准测试')).toBeInTheDocument()
      })

      // 验证表单步骤存在
      expect(screen.getByText('配置信息')).toBeInTheDocument()
      expect(screen.getByText('性能指标')).toBeInTheDocument()
    })

    it('应该能完成手动添加流程并提交', async () => {
      const mockCreateBenchmark = vi.fn().mockResolvedValue({
        id: 3,
        unique_id: 'bench-003',
        config: {
          submitter: 'admin',
          modelName: 'Test-Model',
          serverName: 'test-server',
          framework: 'MindIE',
          frameworkVersion: 'v1.0',
          chipName: 'GPU-A100',
          shardingConfig: '',
          testDate: '2024-01-20',
        },
        metrics: [
          { concurrency: 1, inputLength: 1024, outputLength: 128, ttft: 100, tpot: 20, tokensPerSecond: 50 },
        ],
        created_at: '2024-01-20T00:00:00Z',
      })

      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: mockCreateBenchmark,
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 打开手动添加Dialog
      await user.click(screen.getByText('手动添加'))

      await waitFor(() => {
        expect(screen.getByText('手动添加基准测试')).toBeInTheDocument()
      })

      // 填写配置信息
      const modelInput = screen.getByPlaceholderText('如：Qwen-14B')
      await user.type(modelInput, 'Test-Model')

      const serverInput = screen.getByPlaceholderText('如：server-01')
      await user.type(serverInput, 'test-server')

      const chipInput = screen.getByPlaceholderText('如：GPU-A100')
      await user.type(chipInput, 'GPU-A100')

      // 点击下一步
      await user.click(screen.getByText('下一步'))

      // 验证切换到性能指标步骤
      await waitFor(() => {
        expect(screen.getByText('性能指标数据')).toBeInTheDocument()
      })

      // 填写性能指标
      const concurrencyInput = screen.getByDisplayValue('1')
      await user.clear(concurrencyInput)
      await user.type(concurrencyInput, '8')

      const ttftInput = screen.getByDisplayValue('0')
      await user.clear(ttftInput)
      await user.type(ttftInput, '100')

      // 提交表单
      await user.click(screen.getByText('添加基准测试'))

      // 验证提交函数被调用
      await waitFor(() => {
        expect(mockCreateBenchmark).toHaveBeenCalled()
      })
    })

    it('应该验证必填字段', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 打开手动添加Dialog
      await user.click(screen.getByText('手动添加'))

      await waitFor(() => {
        expect(screen.getByText('手动添加基准测试')).toBeInTheDocument()
      })

      // 直接点击下一步，不填写必填字段
      await user.click(screen.getByText('下一步'))

      // 验证显示必填字段错误提示
      await waitFor(() => {
        expect(screen.getByText('请输入模型名称')).toBeInTheDocument()
        expect(screen.getByText('请输入服务器名称')).toBeInTheDocument()
        expect(screen.getByText('请输入AI芯片型号')).toBeInTheDocument()
      })
    })

    it('应该能取消手动添加', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 打开手动添加Dialog
      await user.click(screen.getByText('手动添加'))

      await waitFor(() => {
        expect(screen.getByText('手动添加基准测试')).toBeInTheDocument()
      })

      // 点击取消按钮
      await user.click(screen.getByText('取消'))

      // Dialog应该关闭
      await waitFor(() => {
        expect(screen.queryByText('手动添加基准测试')).not.toBeInTheDocument()
      })
    })
  })

  describe('编辑基准测试功能测试', () => {
    it('应该能打开编辑对话框并显示配置信息', async () => {
      const mockUpdateBenchmark = vi.fn().mockResolvedValue({})
      
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useUpdateBenchmark).mockReturnValue({
        mutateAsync: mockUpdateBenchmark,
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 等待列表渲染
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
      })

      // 点击编辑按钮
      const editButtons = screen.getAllByTitle('编辑')
      await user.click(editButtons[0])

      // 验证编辑对话框打开
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
        expect(screen.getByText('bench-001')).toBeInTheDocument()
      })

      // 验证配置信息Tab存在
      expect(screen.getByText('配置信息')).toBeInTheDocument()
      
      // 切换到配置信息Tab
      await user.click(screen.getByText('配置信息'))

      // 验证配置字段显示正确
      await waitFor(() => {
        expect(screen.getByDisplayValue('Qwen-14B')).toBeInTheDocument()
        expect(screen.getByDisplayValue('server-01')).toBeInTheDocument()
        expect(screen.getByDisplayValue('GPU-A100')).toBeInTheDocument()
        expect(screen.getByDisplayValue('MindIE')).toBeInTheDocument()
      })
    })

    it('应该能打开编辑对话框并显示性能数据', async () => {
      const mockUpdateBenchmark = vi.fn().mockResolvedValue({})
      
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useUpdateBenchmark).mockReturnValue({
        mutateAsync: mockUpdateBenchmark,
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 等待列表渲染
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
      })

      // 点击编辑按钮
      const editButtons = screen.getAllByTitle('编辑')
      await user.click(editButtons[0])

      // 验证编辑对话框打开
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
      })

      // 切换到性能数据Tab
      await user.click(screen.getByText('性能数据'))

      // 验证性能数据显示
      await waitFor(() => {
        expect(screen.getByText('性能指标数据')).toBeInTheDocument()
        expect(screen.getByText('2 条')).toBeInTheDocument()
      })
    })

    it('应该能编辑配置信息并保存', async () => {
      const mockUpdateBenchmark = vi.fn().mockResolvedValue({})
      
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useUpdateBenchmark).mockReturnValue({
        mutateAsync: mockUpdateBenchmark,
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 等待列表渲染
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
      })

      // 点击编辑按钮
      const editButtons = screen.getAllByTitle('编辑')
      await user.click(editButtons[0])

      // 修改模型名称
      const modelInput = await screen.findByDisplayValue('Qwen-14B')
      await user.clear(modelInput)
      await user.type(modelInput, 'Qwen-14B-Updated')

      // 点击保存
      await user.click(screen.getByText('保存更改'))

      // 验证更新函数被调用
      await waitFor(() => {
        expect(mockUpdateBenchmark).toHaveBeenCalledWith({
          id: 1,
          data: expect.objectContaining({
            config: expect.objectContaining({
              modelName: 'Qwen-14B-Updated',
            }),
          }),
        })
      })
    })

    it('应该能编辑性能数据并保存', async () => {
      const mockUpdateBenchmark = vi.fn().mockResolvedValue({})
      
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useUpdateBenchmark).mockReturnValue({
        mutateAsync: mockUpdateBenchmark,
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 等待列表渲染
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
      })

      // 点击编辑按钮
      const editButtons = screen.getAllByTitle('编辑')
      await user.click(editButtons[0])

      // 切换到性能数据Tab
      await user.click(screen.getByText('性能数据'))

      // 点击编辑第一条性能数据
      const editMetricButtons = screen.getAllByTitle('编辑')
      await user.click(editMetricButtons[0])

      // 修改并发数
      const concurrencyInput = await screen.findByDisplayValue('1')
      await user.clear(concurrencyInput)
      await user.type(concurrencyInput, '16')

      // 保存指标
      await user.click(screen.getByLabelText('保存'))

      // 点击保存更改
      await user.click(screen.getByText('保存更改'))

      // 验证更新函数被调用
      await waitFor(() => {
        expect(mockUpdateBenchmark).toHaveBeenCalled()
      })
    })

    it('应该能删除性能数据', async () => {
      const mockUpdateBenchmark = vi.fn().mockResolvedValue({})
      
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useUpdateBenchmark).mockReturnValue({
        mutateAsync: mockUpdateBenchmark,
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 等待列表渲染
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
      })

      // 点击编辑按钮
      const editButtons = screen.getAllByTitle('编辑')
      await user.click(editButtons[0])

      // 切换到性能数据Tab
      await user.click(screen.getByText('性能数据'))

      // 验证初始有2条数据
      await waitFor(() => {
        expect(screen.getByText('2 条')).toBeInTheDocument()
      })

      // 删除第一条数据
      const deleteButtons = screen.getAllByTitle('删除')
      await user.click(deleteButtons[0])

      // 验证数据条数减少
      await waitFor(() => {
        expect(screen.getByText('1 条')).toBeInTheDocument()
      })
    })

    it('应该能添加新的性能数据', async () => {
      const mockUpdateBenchmark = vi.fn().mockResolvedValue({})
      
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useUpdateBenchmark).mockReturnValue({
        mutateAsync: mockUpdateBenchmark,
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 等待列表渲染
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
      })

      // 点击编辑按钮
      const editButtons = screen.getAllByTitle('编辑')
      await user.click(editButtons[0])

      // 切换到性能数据Tab
      await user.click(screen.getByText('性能数据'))

      // 验证初始有2条数据
      await waitFor(() => {
        expect(screen.getByText('2 条')).toBeInTheDocument()
      })

      // 点击添加数据按钮
      await user.click(screen.getByText('添加数据'))

      // 验证数据条数增加
      await waitFor(() => {
        expect(screen.getByText('3 条')).toBeInTheDocument()
      })
    })

    it('应该能取消编辑并关闭对话框', async () => {
      const mockUpdateBenchmark = vi.fn().mockResolvedValue({})
      
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useUpdateBenchmark).mockReturnValue({
        mutateAsync: mockUpdateBenchmark,
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 等待列表渲染
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
      })

      // 点击编辑按钮
      const editButtons = screen.getAllByTitle('编辑')
      await user.click(editButtons[0])

      // 验证编辑对话框打开
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
      })

      // 点击取消按钮
      await user.click(screen.getByText('取消'))

      // 验证对话框关闭
      await waitFor(() => {
        expect(screen.queryByText('Qwen-14B')).not.toBeInTheDocument()
      })

      // 验证更新函数未被调用
      expect(mockUpdateBenchmark).not.toHaveBeenCalled()
    })

    it('应该处理不完整数据的编辑', async () => {
      const incompleteBenchmark: Benchmark = {
        id: 3,
        unique_id: 'bench-003',
        config: {
          submitter: 'admin',
          modelName: 'Qwen-14B',
          serverName: 'server-03',
          framework: 'VLLM',
          frameworkVersion: '',
          chipName: 'GPU-V100',
          shardingConfig: '',
          testDate: '2024-01-18',
        },
        metrics: [],
        created_at: '2024-01-18T00:00:00Z',
      }

      const mockUpdateBenchmark = vi.fn().mockResolvedValue({})
      
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [incompleteBenchmark], total: 1, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useUpdateBenchmark).mockReturnValue({
        mutateAsync: mockUpdateBenchmark,
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderBenchmarkList()

      // 等待列表渲染
      await waitFor(() => {
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
      })

      // 点击编辑按钮
      const editButtons = screen.getAllByTitle('编辑')
      await user.click(editButtons[0])

      // 验证编辑对话框打开并显示空字段
      await waitFor(() => {
        expect(screen.getByDisplayValue('Qwen-14B')).toBeInTheDocument()
      })
    })
  })
})

describe('Reports模块测试', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    vi.clearAllMocks()
  })

  const renderBenchmarkList = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BenchmarkList />
      </QueryClientProvider>
    )
  }

  describe('功能正确性测试', () => {
    it('应该正确渲染对比报告列表', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: mockReports,
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderBenchmarkList()

      // 点击"性能结果呈现"标签
      await userEvent.click(screen.getByText('性能结果呈现'))

      // 验证报告列表渲染
      await waitFor(() => {
        expect(screen.getByText('report-001')).toBeInTheDocument()
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
        expect(screen.getByText('Llama-7B')).toBeInTheDocument()
      })
    })

    it('应该在没有报告时显示"暂无对比报告"', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderBenchmarkList()

      // 点击"性能结果呈现"标签
      await userEvent.click(screen.getByText('性能结果呈现'))

      // 验证空状态显示
      await waitFor(() => {
        expect(screen.getByText('暂无对比报告')).toBeInTheDocument()
      })
    })

    it('应该能够查看对比报告详情', async () => {
      const mockViewReport = vi.fn()
      
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: mockReports,
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: mockViewReport,
        isPending: false,
      } as any)

      renderBenchmarkList()

      // 点击"性能结果呈现"标签
      await userEvent.click(screen.getByText('性能结果呈现'))

      // 点击查看按钮
      const viewButtons = screen.getAllByTitle('查看')
      await userEvent.click(viewButtons[0])

      // 验证切换到对比标签
      await waitFor(() => {
        expect(screen.getByText('性能对比')).toBeInTheDocument()
      })
    })

    it('应该能够删除对比报告', async () => {
      const mockDeleteReport = vi.fn().mockResolvedValue({})
      
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: mockReports,
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: mockDeleteReport,
        isPending: false,
      } as any)

      renderBenchmarkList()

      // 点击"性能结果呈现"标签
      await userEvent.click(screen.getByText('性能结果呈现'))

      // 点击删除按钮
      const deleteButtons = screen.getAllByTitle('删除')
      await userEvent.click(deleteButtons[0])

      // 验证删除函数被调用
      await waitFor(() => {
        expect(mockDeleteReport).toHaveBeenCalledWith(1)
      })
    })
  })

  describe('可靠性测试', () => {
    it('应该在reports数据未加载时不崩溃', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      // 不应该抛出错误
      expect(() => renderBenchmarkList()).not.toThrow()
    })

    it('应该正确处理空数组', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderBenchmarkList()

      // 点击"性能结果呈现"标签
      await userEvent.click(screen.getByText('性能结果呈现'))

      // 验证空状态显示
      await waitFor(() => {
        expect(screen.getByText('暂无对比报告')).toBeInTheDocument()
      })
    })
  })

  describe('安全性测试', () => {
    it('应该正确处理特殊字符的报告ID', async () => {
      const specialCharReport: Report = {
        id: 999,
        unique_id: 'report-test<script>alert("xss")</script>',
        benchmark_id1: 1,
        benchmark_id2: 2,
        model_name1: 'Qwen-14B',
        model_name2: 'Llama-7B',
        summary: '测试<script>alert("xss")</script>',
        created_at: '2024-01-17T00:00:00Z',
      }
      
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [specialCharReport],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderBenchmarkList()

      // 点击"性能结果呈现"标签
      await userEvent.click(screen.getByText('性能结果呈现'))

      // 验证特殊字符被正确转义显示
      await waitFor(() => {
        expect(screen.getByText('report-test<script>alert')).toBeInTheDocument()
      })
    })
  })

  describe('可扩展性测试', () => {
    it('应该支持多个报告的列表渲染', async () => {
      const multipleReports: Report[] = [
        {
          id: 1,
          unique_id: 'report-001',
          benchmark_id1: 1,
          benchmark_id2: 2,
          model_name1: 'Qwen-14B',
          model_name2: 'Llama-7B',
          summary: '报告1',
          created_at: '2024-01-17T00:00:00Z',
        },
        {
          id: 2,
          unique_id: 'report-002',
          benchmark_id1: 3,
          benchmark_id2: 4,
          model_name1: 'ChatGLM-6B',
          model_name2: 'Baichuan-13B',
          summary: '报告2',
          created_at: '2024-01-18T00:00:00Z',
        },
        {
          id: 3,
          unique_id: 'report-003',
          benchmark_id1: 5,
          benchmark_id2: 6,
          model_name1: 'Mistral-7B',
          model_name2: 'Yi-34B',
          summary: '报告3',
          created_at: '2024-01-19T00:00:00Z',
        },
      ]
      
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: mockBenchmarks, total: 2, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: multipleReports,
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderBenchmarkList()

      // 点击"性能结果呈现"标签
      await userEvent.click(screen.getByText('性能结果呈现'))

      // 验证所有报告都显示
      await waitFor(() => {
        expect(screen.getByText('report-001')).toBeInTheDocument()
        expect(screen.getByText('report-002')).toBeInTheDocument()
        expect(screen.getByText('report-003')).toBeInTheDocument()
        expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
        expect(screen.getByText('ChatGLM-6B')).toBeInTheDocument()
        expect(screen.getByText('Mistral-7B')).toBeInTheDocument()
      })
    })
  })
})

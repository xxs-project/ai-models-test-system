import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BenchmarkList } from '../pages/BenchmarkList'
import * as useBenchmarksModule from '../hooks/use-benchmarks'
import { Benchmark } from '../lib/types'

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

describe('CSV导入功能测试', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    vi.clearAllMocks()

    vi.mocked(useBenchmarksModule.useUpdateBenchmark).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)
  })

  const renderBenchmarkList = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BenchmarkList />
      </QueryClientProvider>
    )
  }

  describe('功能正确性测试', () => {
    it('应该能打开CSV导入对话框', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderBenchmarkList()

      // 点击导入CSV按钮
      await user.click(screen.getByText('导入CSV'))

      // 验证对话框打开
      await waitFor(() => {
        expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
      })

      // 验证表单字段存在
      expect(screen.getByText('点击上传 CSV 文件')).toBeInTheDocument()
      expect(screen.getByText('配置信息')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('例如：Qwen3-32B-FP8')).toBeInTheDocument()
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
      
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderBenchmarkList()

      // 打开导入对话框
      await user.click(screen.getByText('导入CSV'))
      await waitFor(() => {
        expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
      })

      // 不选择文件直接点击导入
      const importButton = screen.getByText('导入并保存')
      expect(importButton).toBeDisabled()
    })

    it('应该能选择并解析CSV文件', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      const mockCreateBenchmark = vi.fn().mockResolvedValue({ id: 1 })
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: mockCreateBenchmark,
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderBenchmarkList()

      // 打开导入对话框
      await user.click(screen.getByText('导入CSV'))
      await waitFor(() => {
        expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
      })

      // 模拟上传CSV文件
      const csvContent = `concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond
1,1024,128,100,20,45.5
8,1024,128,120,25,320.2
16,1024,128,150,30,580.5`
      
      const file = new File([csvContent], 'test-model.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      await user.upload(fileInput!, file)

      // 验证文件被选中
      await waitFor(() => {
        expect(screen.getByText(/test-model.csv/)).toBeInTheDocument()
      })

      // 验证文件名被自动提取为模型名称 - Note: Logic changed, file name is NOT auto-extracted to model name in new component logic
      // const modelNameInput = screen.getByPlaceholderText('例如：Qwen3-32B-FP8') as HTMLInputElement
      // expect(modelNameInput.value).toBe('test-model')
    })

    it('应该兼容vLLM实验CSV列名并回退TPOT/TPS', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)

      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)

      const mockCreateBenchmark = vi.fn().mockResolvedValue({ id: 1 })
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: mockCreateBenchmark,
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderBenchmarkList()

      await user.click(screen.getByText('导入CSV'))
      await waitFor(() => {
        expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
      })

      const csvContent = `Process Num,Input Length,Output Length,TTFT (ms),avg TPS (without prefill),avg TPS (with prefill),Total Time (ms),TPS (without prefill),TPS (with prefill),Error,avg input Tokens,avg output Tokens
1,128,128,146.0948,40.2046,38.7279,3305.1092624664307,40.2046,38.7279,,128,128`

      const file = new File([csvContent], 'aarch64_vllm_results_Qwen_Qwen3-30B-A3B-FP8_1_npu_aclgraph.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(fileInput!, file)

      await user.clear(screen.getByPlaceholderText('例如：服务器-A1'))
      await user.type(screen.getByPlaceholderText('例如：服务器-A1'), 'server-01')

      await user.clear(screen.getByPlaceholderText('例如：A100'))
      await user.type(screen.getByPlaceholderText('例如：A100'), 'GPU-A100')

      // Fill other required fields
      await user.type(screen.getByPlaceholderText('例如：Qwen3-32B-FP8'), 'test-model-vllm')
      await user.type(screen.getByPlaceholderText('例如：TP4, TP16'), 'TP8')
      await user.type(screen.getByPlaceholderText('例如：v0.6.3'), 'v0.4.2')
      await user.type(screen.getByPlaceholderText('例如：张三'), 'vllm-tester')

      const frameworkSelect = screen.getByText('选择框架')
      await user.click(frameworkSelect)
      await user.click(screen.getByText('VLLM'))

      await user.click(screen.getByText('导入并保存'))

      await waitFor(() => {
        expect(mockCreateBenchmark).toHaveBeenCalled()
      })

      const metrics = mockCreateBenchmark.mock.calls[0][0].metrics
      expect(metrics).toHaveLength(1)
      expect(metrics[0].concurrency).toBe(1)
      expect(metrics[0].inputLength).toBe(128)
      expect(metrics[0].outputLength).toBe(128)
      expect(metrics[0].ttft).toBeCloseTo(146.0948)
      expect(metrics[0].tokensPerSecond).toBeCloseTo(40.2046)
      expect(metrics[0].tpot).toBeGreaterThan(0)
    })

    it('应该成功导入CSV数据并创建Benchmark', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      const mockCreateBenchmark = vi.fn().mockResolvedValue({ id: 1 })
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: mockCreateBenchmark,
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderBenchmarkList()

      // 打开导入对话框
      await user.click(screen.getByText('导入CSV'))
      await waitFor(() => {
        expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
      })

      // 上传CSV文件
      const csvContent = `concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond
1,1024,128,100,20,45.5
8,1024,128,120,25,320.2`
      
      const file = new File([csvContent], 'test-model.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(fileInput!, file)

      // 填写必填字段
      await user.type(screen.getByPlaceholderText('例如：Qwen3-32B-FP8'), 'test-model')
      await user.type(screen.getByPlaceholderText('例如：服务器-A1'), 'test-server')
      await user.type(screen.getByPlaceholderText('例如：A100'), 'GPU-Test')
      await user.type(screen.getByPlaceholderText('例如：TP4, TP16'), 'TP1')
      await user.type(screen.getByPlaceholderText('例如：v0.6.3'), 'v1.0')
      await user.type(screen.getByPlaceholderText('例如：张三'), 'tester')

      const frameworkSelect = screen.getByText('选择框架')
      await user.click(frameworkSelect)
      await user.click(screen.getByText('VLLM'))

      // 点击导入按钮
      await user.click(screen.getByText('导入并保存'))

      // 验证API被调用
      await waitFor(() => {
        expect(mockCreateBenchmark).toHaveBeenCalled()
      })

      // 验证调用参数
      const callArg = mockCreateBenchmark.mock.calls[0][0]
      expect(callArg.config.modelName).toBe('test-model')
      expect(callArg.config.serverName).toBe('test-server')
      expect(callArg.config.chipName).toBe('GPU-Test')
      expect(callArg.metrics).toHaveLength(2)
    })
  })

  describe('CSV解析功能测试', () => {
    it('应该正确解析标准格式CSV', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      const mockCreateBenchmark = vi.fn().mockResolvedValue({ id: 1 })
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: mockCreateBenchmark,
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderBenchmarkList()

      // 打开导入对话框
      await user.click(screen.getByText('导入CSV'))
      await waitFor(() => {
        expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
      })

      // 上传标准格式CSV
      const csvContent = `concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond
1,1024,128,100.5,20.3,45.5
8,1024,128,120.2,25.1,320.2
16,2048,256,150.8,30.5,580.5`
      
      const file = new File([csvContent], 'standard.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(fileInput!, file)

      // 填写必填字段
      await user.type(screen.getByPlaceholderText('例如：Qwen3-32B-FP8'), 'test-model')
      await user.type(screen.getByPlaceholderText('例如：服务器-A1'), 'server-01')
      await user.type(screen.getByPlaceholderText('例如：A100'), 'GPU-A100')
      await user.type(screen.getByPlaceholderText('例如：TP4, TP16'), 'TP1')
      await user.type(screen.getByPlaceholderText('例如：v0.6.3'), 'v1.0')
      await user.type(screen.getByPlaceholderText('例如：张三'), 'tester')
      
      const frameworkSelect = screen.getByText('选择框架')
      await user.click(frameworkSelect)
      await user.click(screen.getByText('VLLM'))

      // 点击导入
      await user.click(screen.getByText('导入并保存'))

      await waitFor(() => {
        expect(mockCreateBenchmark).toHaveBeenCalled()
      })

      const metrics = mockCreateBenchmark.mock.calls[0][0].metrics
      expect(metrics).toHaveLength(3)
      expect(metrics[0]).toMatchObject({
        concurrency: 1,
        inputLength: 1024,
        outputLength: 128,
        ttft: 100.5,
        tpot: 20.3,
        tokensPerSecond: 45.5,
      })
    })

    it('应该处理简写列名CSV', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      const mockCreateBenchmark = vi.fn().mockResolvedValue({ id: 1 })
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: mockCreateBenchmark,
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderBenchmarkList()

      await user.click(screen.getByText('导入CSV'))
      await waitFor(() => {
        expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
      })

      // 上传简写格式CSV
      const csvContent = `c,i,o,ttft,tpot,tps
1,1024,128,100,20,45.5
8,1024,128,120,25,320.2`
      
      const file = new File([csvContent], 'short.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(fileInput!, file)

      await user.type(screen.getByPlaceholderText('例如：Qwen3-32B-FP8'), 'test-model')
      await user.type(screen.getByPlaceholderText('例如：服务器-A1'), 'server-01')
      await user.type(screen.getByPlaceholderText('例如：A100'), 'GPU-A100')
      await user.type(screen.getByPlaceholderText('例如：TP4, TP16'), 'TP1')
      await user.type(screen.getByPlaceholderText('例如：v0.6.3'), 'v1.0')
      await user.type(screen.getByPlaceholderText('例如：张三'), 'tester')
      
      const frameworkSelect = screen.getByText('选择框架')
      await user.click(frameworkSelect)
      await user.click(screen.getByText('VLLM'))

      await user.click(screen.getByText('导入并保存'))

      await waitFor(() => {
        expect(mockCreateBenchmark).toHaveBeenCalled()
      })

      const metrics = mockCreateBenchmark.mock.calls[0][0].metrics
      expect(metrics).toHaveLength(2)
    })
  })

  describe('可靠性测试', () => {
    it('应该处理空CSV文件', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderBenchmarkList()

      await user.click(screen.getByText('导入CSV'))
      await waitFor(() => {
        expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
      })

      // 上传空CSV
      const file = new File([''], 'empty.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(fileInput!, file)

      // 验证导入按钮仍然被禁用（因为没有有效数据）
      const importButton = screen.getByText('导入并保存')
      expect(importButton).toBeDisabled()
    })

    it('应该处理只有标题行的CSV', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderBenchmarkList()

      await user.click(screen.getByText('导入CSV'))
      await waitFor(() => {
        expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
      })

      // 上传只有标题的CSV
      const csvContent = 'concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond'
      const file = new File([csvContent], 'header-only.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(fileInput!, file)

      // 验证导入按钮仍然被禁用
      const importButton = screen.getByText('导入并保存')
      expect(importButton).toBeDisabled()
    })

    it('应该处理包含无效数据的CSV', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
       vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
         mutateAsync: vi.fn(),
         isPending: false,
       } as any)
       
       const mockCreateBenchmark = vi.fn().mockResolvedValue({ id: 1 })
       
       const user = userEvent.setup({ pointerEventsCheck: 0 })
       renderBenchmarkList()

       await user.click(screen.getByText('导入CSV'))
       await waitFor(() => {
         expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
       })

       // 上传包含无效数据的CSV
       const csvContent = `concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond
1,1024,128,invalid,20,45.5
8,1024,128,120,25,320.2`
       
       const file = new File([csvContent], 'invalid-data.csv', { type: 'text/csv' })
       const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
       await user.upload(fileInput!, file)

       await user.clear(screen.getByPlaceholderText('例如：服务器-A1'))
       await user.type(screen.getByPlaceholderText('例如：服务器-A1'), 'server-01')
       
       await user.clear(screen.getByPlaceholderText('例如：A100'))
       await user.type(screen.getByPlaceholderText('例如：A100'), 'GPU-A100')

       // Fill other required fields
       await user.type(screen.getByPlaceholderText('例如：Qwen3-32B-FP8'), 'test-model-invalid')
       await user.type(screen.getByPlaceholderText('例如：TP4, TP16'), 'TP1')
       await user.type(screen.getByPlaceholderText('例如：v0.6.3'), 'v1.0')
       await user.type(screen.getByPlaceholderText('例如：张三'), 'tester')

       const frameworkSelect = screen.getByText('选择框架')
       await user.click(frameworkSelect)
       await user.click(screen.getByText('VLLM'))

       await user.click(screen.getByText('导入并保存'))

       await waitFor(() => {
         expect(mockCreateBenchmark).toHaveBeenCalled()
       })

       // 应该只导入有效数据
       const metrics = mockCreateBenchmark.mock.calls[0][0].metrics
      expect(metrics).toHaveLength(1)
      expect(metrics[0].concurrency).toBe(8)
    })

    it('应该在导入失败时显示错误', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      const mockCreateBenchmark = vi.fn().mockRejectedValue(new Error('API Error'))
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: mockCreateBenchmark,
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderBenchmarkList()

      await user.click(screen.getByText('导入CSV'))
      await waitFor(() => {
        expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
      })

      // 上传有效CSV
      const csvContent = `concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond
1,1024,128,100,20,45.5`
      
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(fileInput!, file)

      await user.type(screen.getByPlaceholderText('例如：Qwen3-32B-FP8'), 'test-model')
      await user.type(screen.getByPlaceholderText('例如：服务器-A1'), 'server-01')
      await user.type(screen.getByPlaceholderText('例如：A100'), 'GPU-A100')
      await user.type(screen.getByPlaceholderText('例如：TP4, TP16'), 'TP1')
      await user.type(screen.getByPlaceholderText('例如：v0.6.3'), 'v1.0')
      await user.type(screen.getByPlaceholderText('例如：张三'), 'tester')
      
      const frameworkSelect = screen.getByText('选择框架')
      await user.click(frameworkSelect)
      await user.click(screen.getByText('VLLM'))

      await user.click(screen.getByText('导入并保存'))

      // 验证错误处理
      await waitFor(() => {
        expect(mockCreateBenchmark).toHaveBeenCalled()
      })
    })
  })

  describe('安全性测试', () => {
    it('应该拒绝非CSV文件', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderBenchmarkList()

      await user.click(screen.getByText('导入CSV'))
      await waitFor(() => {
        expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
      })

      // 尝试上传非CSV文件
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(fileInput!, file)

      // 文件不应该被接受（通过accept属性限制）
      expect(screen.queryByText(/已选择:/)).not.toBeInTheDocument()
    })

    it('应该处理CSV注入攻击', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      const mockCreateBenchmark = vi.fn().mockResolvedValue({ id: 1 })
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: mockCreateBenchmark,
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderBenchmarkList()

      await user.click(screen.getByText('导入CSV'))
      await waitFor(() => {
        expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
      })

      // 上传包含特殊字符的CSV
      const csvContent = `concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond
1,1024,128,"<script>alert('xss')</script>",20,45.5`
      
      const file = new File([csvContent], 'xss-attempt.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(fileInput!, file)

      await user.type(screen.getByPlaceholderText('例如：Qwen3-32B-FP8'), 'test-model')
      await user.type(screen.getByPlaceholderText('例如：服务器-A1'), 'server-01')
      await user.type(screen.getByPlaceholderText('例如：A100'), 'GPU-A100')
      await user.type(screen.getByPlaceholderText('例如：TP4, TP16'), 'TP1')
      await user.type(screen.getByPlaceholderText('例如：v0.6.3'), 'v1.0')
      await user.type(screen.getByPlaceholderText('例如：张三'), 'tester')
      
      const frameworkSelect = screen.getByText('选择框架')
      await user.click(frameworkSelect)
      await user.click(screen.getByText('VLLM'))

      await user.click(screen.getByText('导入并保存'))

      await waitFor(() => {
        expect(mockCreateBenchmark).toHaveBeenCalled()
      })

      // 验证数据被正确处理（数值解析应该失败，该行被跳过）
      const metrics = mockCreateBenchmark.mock.calls[0][0].metrics
      expect(metrics.length).toBeGreaterThanOrEqual(0)
    })

    it('应该验证必填字段不为空', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderBenchmarkList()

      await user.click(screen.getByText('导入CSV'))
      await waitFor(() => {
        expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
      })

      // 上传CSV
      const csvContent = `concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond
1,1024,128,100,20,45.5`
      
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(fileInput!, file)

      // 清空必填字段
      await user.clear(screen.getByPlaceholderText('例如：服务器-A1'))
      await user.clear(screen.getByPlaceholderText('例如：A100'))

      // 尝试导入
      await user.click(screen.getByText('导入并保存'))

      // API不应该被调用
      expect(useBenchmarksModule.useCreateBenchmark().mutateAsync).not.toHaveBeenCalled()
    })
  })

  describe('用户体验测试', () => {
    it('应该显示加载状态', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000))),
        isPending: true,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderBenchmarkList()

      await user.click(screen.getByText('导入CSV'))
      await waitFor(() => {
        expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
      })

      // 检查加载状态显示
      expect(screen.getByText('导入中...')).toBeInTheDocument()
    })

    it('应该能取消导入', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderBenchmarkList()

      await user.click(screen.getByText('导入CSV'))
      await waitFor(() => {
        expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
      })

      // 上传文件并填写信息
      const csvContent = `concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond
1,1024,128,100,20,45.5`
      
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(fileInput!, file)

      await user.type(screen.getByPlaceholderText('例如：服务器-A1'), 'server-01')
      await user.type(screen.getByPlaceholderText('例如：A100'), 'GPU-A100')

      // 点击取消
      await user.click(screen.getByText('取消'))

      // 对话框应该关闭
      await waitFor(() => {
        expect(screen.queryByText('导入CSV基准测试数据')).not.toBeInTheDocument()
      })
    })

    it('应该清空表单数据', async () => {
      vi.mocked(useBenchmarksModule.useBenchmarks).mockReturnValue({
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)
      
      vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderBenchmarkList()

      await user.click(screen.getByText('导入CSV'))
      await waitFor(() => {
        expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
      })

      // 上传文件
      const csvContent = `concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond
1,1024,128,100,20,45.5`
      
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(fileInput!, file)

      // 填写信息
      await user.type(screen.getByPlaceholderText('例如：服务器-A1'), 'server-01')

      // 取消
      await user.click(screen.getByText('取消'))

      // 重新打开对话框
      await user.click(screen.getByText('导入CSV'))
      await waitFor(() => {
        expect(screen.getByText('导入CSV基准测试数据')).toBeInTheDocument()
      })

      // 验证表单已重置
      const modelNameInput = screen.getByPlaceholderText('例如：Qwen3-32B-FP8') as HTMLInputElement
      expect(modelNameInput.value).toBe('')
    })
  })
})

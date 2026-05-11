import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BenchmarkList } from '../pages/BenchmarkList'
import * as useBenchmarksModule from '../hooks/use-benchmarks'
import { Benchmark } from '../lib/types'
import React from 'react'

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
  AdvancedSearchFilters: {} // Just type export, not used in runtime mock
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

// Generate 56 mock benchmarks
const generateMockBenchmarks = (count: number): Benchmark[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    unique_id: `bench-${String(i + 1).padStart(3, '0')}`,
    config: {
      submitter: 'admin',
      modelName: `Model-${i + 1}`,
      serverName: `server-${(i % 5) + 1}`,
      framework: i % 2 === 0 ? 'MindIE' : 'VLLM',
      frameworkVersion: 'v1.0.0',
      chipName: 'GPU-A100',
      shardingConfig: 'tp=4',
      testDate: '2024-01-01',
    },
    metrics: [],
    created_at: new Date().toISOString(),
  }))
}

const mockBenchmarks56 = generateMockBenchmarks(56)

describe('BenchmarkList Fix Verification', () => {
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

  it('Fix: 应该在性能对比页签中显示所有基准测试数据(超过6条)', async () => {
    // Mock standard pagination (page 1, size 20)
    // We mock the implementation of useBenchmarks to return different data based on arguments
    const useBenchmarksMock = vi.mocked(useBenchmarksModule.useBenchmarks)
    
    useBenchmarksMock.mockImplementation((args: any) => {
      // Check if size is 1000 (the "all" query)
      if (args && args.size === 1000) {
        return {
          data: { items: mockBenchmarks56, total: 56, page: 1, size: 1000 },
          isLoading: false,
          isPending: false,
          isError: false,
        } as any
      }
      // Default query (page 1, size 20)
      return {
        data: { items: mockBenchmarks56.slice(0, 20), total: 56, page: 1, size: 20 },
        isLoading: false,
        isPending: false,
        isError: false,
      } as any
    })

    vi.mocked(useBenchmarksModule.useReports).mockReturnValue({
      data: [],
      isLoading: false,
      isPending: false,
      isError: false,
    } as any)
    
    // Add missing mocks for hooks used in component
    vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
    vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
    vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
    vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
    vi.mocked(useBenchmarksModule.useImportBenchmark).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
    vi.mocked(useBenchmarksModule.useUpdateBenchmark).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)


    const user = userEvent.setup()
    renderBenchmarkList()

    // 1. Verify we are on the page
    expect(screen.getByText('性能结果呈现')).toBeInTheDocument()

    // 2. Switch to "Performance Comparison" tab
    // Find the tab trigger
    const tabTrigger = screen.getByRole('tab', { name: /性能对比/i })
    await user.click(tabTrigger)

    // 3. Verify that we see more than 6 items
    // We wait for the comparison list to render
    await waitFor(() => {
        // Model-7 should be visible if we are showing more than 6 items
        expect(screen.queryByText('Model-7')).toBeInTheDocument()
    })
    
    // Verify we can see the 56th item
    expect(screen.queryByText('Model-56')).toBeInTheDocument()
    
    // Check that we see a significant number of items
    const items = screen.getAllByText(/Model-\d+/)
    // We expect at least 56 items (from the comparison list) 
    // The main list might be hidden, so we check >= 56
    expect(items.length).toBeGreaterThanOrEqual(56)
  })

  it('Reliability: API错误时应该优雅处理', async () => {
    // Mock API error for "all" benchmarks
    const useBenchmarksMock = vi.mocked(useBenchmarksModule.useBenchmarks)
    useBenchmarksMock.mockImplementation((args: any) => {
      if (args && args.size === 1000) {
        return {
          data: null,
          isLoading: false,
          isPending: false,
          isError: true,
          error: new Error('Network Error')
        } as any
      }
      return {
        data: { items: [], total: 0, page: 1, size: 20 },
        isLoading: false,
        isPending: false,
        isError: false,
      } as any
    })
    
    // Add missing mocks
    vi.mocked(useBenchmarksModule.useReports).mockReturnValue({ data: [], isLoading: false } as any)
    vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
    vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
    vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
    vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
    vi.mocked(useBenchmarksModule.useImportBenchmark).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
    vi.mocked(useBenchmarksModule.useUpdateBenchmark).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)

    const user = userEvent.setup()
    renderBenchmarkList()
    
    // Switch to comparison tab
    await user.click(screen.getByText('性能对比'))
    
    // Should not crash, might show empty list or error state if implemented
    // Based on code, it defaults to [] if data is null: (allBenchmarksData?.items || [])
    // So it should show empty list (no benchmarks to select)
    await waitFor(() => {
        expect(screen.getByText('选择基准测试：')).toBeInTheDocument()
    })
    
    // Verify list is empty
    const items = screen.queryAllByText(/Model-\d+/)
    expect(items.length).toBe(0)
  })

  it('Security: 应该转义恶意内容防止XSS', async () => {
    const maliciousBenchmark = {
      id: 999,
      unique_id: 'bench-xss',
      config: {
        submitter: 'hacker',
        modelName: '<img src=x onerror=alert(1)>',
        serverName: 'server-xss',
        framework: 'MindIE',
        frameworkVersion: 'v1.0.0',
        chipName: 'GPU-A100',
        shardingConfig: 'tp=4',
        testDate: '2024-01-01',
      },
      metrics: [],
      created_at: new Date().toISOString(),
    }

    const useBenchmarksMock = vi.mocked(useBenchmarksModule.useBenchmarks)
    useBenchmarksMock.mockImplementation((args: any) => {
        if (args && args.size === 1000) {
            return {
                data: { items: [maliciousBenchmark], total: 1, page: 1, size: 1000 },
                isLoading: false
            } as any
        }
        return {
            data: { items: [maliciousBenchmark], total: 1, page: 1, size: 20 },
            isLoading: false
        } as any
    })
    
    // Add missing mocks
    vi.mocked(useBenchmarksModule.useReports).mockReturnValue({ data: [], isLoading: false } as any)
    vi.mocked(useBenchmarksModule.useSaveReport).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
    vi.mocked(useBenchmarksModule.useDeleteBenchmark).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
    vi.mocked(useBenchmarksModule.useDeleteReport).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
    vi.mocked(useBenchmarksModule.useCreateBenchmark).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
    vi.mocked(useBenchmarksModule.useImportBenchmark).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
    vi.mocked(useBenchmarksModule.useUpdateBenchmark).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)

    const user = userEvent.setup()
    renderBenchmarkList()
    
    await user.click(screen.getByText('性能对比'))
    
    // Check if the content is rendered as text, not HTML
    // getByText will match the text content. If it was rendered as HTML, the text content would be empty or different.
    // React automatically escapes content in JSX unless dangerouslySetInnerHTML is used.
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    
    // Ensure no alert was called (mock window.alert if needed, but JSDOM doesn't run scripts in elements effectively)
  })
})

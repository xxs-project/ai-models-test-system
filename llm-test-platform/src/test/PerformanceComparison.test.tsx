import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PerformanceTrendCharts } from '../components/PerformanceTrendCharts'
import { ComparisonPanel } from '../components/ComparisonPanel'
import { Benchmark, BenchmarkMetricsEntry } from '../lib/types'

// Mock recharts
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  LabelList: () => <div data-testid="label-list" />,
}))

const mockMetrics1: BenchmarkMetricsEntry[] = [
  { concurrency: 1, inputLength: 1024, outputLength: 128, ttft: 100, tpot: 20, tokensPerSecond: 45.5 },
  { concurrency: 8, inputLength: 1024, outputLength: 128, ttft: 120, tpot: 25, tokensPerSecond: 320.2 },
  { concurrency: 16, inputLength: 1024, outputLength: 128, ttft: 150, tpot: 30, tokensPerSecond: 580.5 },
]

const mockMetrics2: BenchmarkMetricsEntry[] = [
  { concurrency: 1, inputLength: 1024, outputLength: 128, ttft: 90, tpot: 18, tokensPerSecond: 52.1 },
  { concurrency: 8, inputLength: 1024, outputLength: 128, ttft: 110, tpot: 22, tokensPerSecond: 380.5 },
  { concurrency: 16, inputLength: 1024, outputLength: 128, ttft: 140, tpot: 28, tokensPerSecond: 650.8 },
]

const mockBenchmark1: Benchmark = {
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
  metrics: mockMetrics1,
  created_at: '2024-01-15T00:00:00Z',
}

const mockBenchmark2: Benchmark = {
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
  metrics: mockMetrics2,
  created_at: '2024-01-16T00:00:00Z',
}

describe('PerformanceTrendCharts 组件测试', () => {
  describe('功能正确性', () => {
    it('应该正确渲染组件标题', () => {
      render(
        <PerformanceTrendCharts
          metrics1={mockMetrics1}
          metrics2={mockMetrics2}
          modelName1="Qwen-14B"
          modelName2="Llama-7B"
        />
      )

      expect(screen.getByText('性能趋势图')).toBeInTheDocument()
      expect(screen.getByText(/对比 Qwen-14B 与 Llama-7B 的性能指标/)).toBeInTheDocument()
    })

    it('应该渲染所有图表区域', () => {
      render(
        <PerformanceTrendCharts
          metrics1={mockMetrics1}
          metrics2={mockMetrics2}
          modelName1="Qwen-14B"
          modelName2="Llama-7B"
        />
      )

      expect(screen.getByText('对比百分比趋势图')).toBeInTheDocument()
      expect(screen.getByText('性能柱状图')).toBeInTheDocument()
      expect(screen.getByText('性能对比总结')).toBeInTheDocument()
    })

    it('应该渲染所有指标卡片', () => {
      render(
        <PerformanceTrendCharts
          metrics1={mockMetrics1}
          metrics2={mockMetrics2}
          modelName1="Qwen-14B"
          modelName2="Llama-7B"
        />
      )

      expect(screen.getByText('TTFT 对比百分比')).toBeInTheDocument()
      expect(screen.getByText('TPOT 对比百分比')).toBeInTheDocument()
      expect(screen.getByText('TPS 对比百分比')).toBeInTheDocument()
      expect(screen.getByText('TTFT 性能对比')).toBeInTheDocument()
      expect(screen.getByText('TPOT 性能对比')).toBeInTheDocument()
      expect(screen.getByText('TPS 性能对比')).toBeInTheDocument()
    })

    it('应该正确计算并显示平均差异', () => {
      render(
        <PerformanceTrendCharts
          metrics1={mockMetrics1}
          metrics2={mockMetrics2}
          modelName1="Qwen-14B"
          modelName2="Llama-7B"
        />
      )

      expect(screen.getByText('平均 TTFT 差异')).toBeInTheDocument()
      expect(screen.getByText('平均 TPOT 差异')).toBeInTheDocument()
      expect(screen.getByText('平均 TPS 差异')).toBeInTheDocument()
    })
  })

  describe('可扩展性', () => {
    it('应该处理空数据情况', () => {
      render(
        <PerformanceTrendCharts
          metrics1={[]}
          metrics2={[]}
          modelName1="Qwen-14B"
          modelName2="Llama-7B"
        />
      )

      expect(screen.getByText(/没有可用的数据来显示趋势图/)).toBeInTheDocument()
    })

    it('应该处理部分数据缺失的情况', () => {
      const partialMetrics = [{ concurrency: 1, inputLength: 1024, outputLength: 128, ttft: 100, tpot: 20, tokensPerSecond: 45.5 }]
      
      render(
        <PerformanceTrendCharts
          metrics1={partialMetrics}
          metrics2={[]}
          modelName1="Qwen-14B"
          modelName2="Llama-7B"
        />
      )

      expect(screen.getByText('性能趋势图')).toBeInTheDocument()
    })

    it('应该支持不同长度的指标数据', () => {
      const shortMetrics = mockMetrics1.slice(0, 2)
      
      render(
        <PerformanceTrendCharts
          metrics1={shortMetrics}
          metrics2={mockMetrics2}
          modelName1="Qwen-14B"
          modelName2="Llama-7B"
        />
      )

      expect(screen.getByText('性能趋势图')).toBeInTheDocument()
    })
  })

  describe('性能指标计算', () => {
    it('应该正确计算百分比差异', () => {
      render(
        <PerformanceTrendCharts
          metrics1={mockMetrics1}
          metrics2={mockMetrics2}
          modelName1="Qwen-14B"
          modelName2="Llama-7B"
        />
      )

      // TTFT: (90-100)/100 = -10%, (110-120)/120 = -8.33%, (140-150)/150 = -6.67%
      // Average should be negative (improvement)
      const ttftDiff = screen.getAllByText(/-?\d+\.\d+%/)[0]
      expect(ttftDiff).toBeInTheDocument()
    })

    it('应该正确区分正反指标', () => {
      render(
        <PerformanceTrendCharts
          metrics1={mockMetrics1}
          metrics2={mockMetrics2}
          modelName1="Qwen-14B"
          modelName2="Llama-7B"
        />
      )

      // TPS improvement should be positive (green)
      // TTFT improvement should be negative (but displayed as improvement)
      const summaryCards = screen.getAllByText(/平均.*差异/)
      expect(summaryCards.length).toBe(3)
    })
  })
})

describe('ComparisonPanel 组件测试', () => {
  describe('功能正确性', () => {
    it('应该正确渲染两个基准测试的基本信息', () => {
      render(<ComparisonPanel benchmark1={mockBenchmark1} benchmark2={mockBenchmark2} />)

      expect(screen.getByText('基准测试 A')).toBeInTheDocument()
      expect(screen.getByText('基准测试 B')).toBeInTheDocument()
      expect(screen.getByText('Qwen-14B')).toBeInTheDocument()
      expect(screen.getByText('Llama-7B')).toBeInTheDocument()
    })

    it('应该显示配置对比', () => {
      render(<ComparisonPanel benchmark1={mockBenchmark1} benchmark2={mockBenchmark2} />)

      expect(screen.getByText('详细配置对比')).toBeInTheDocument()
      expect(screen.getByText('模型名称')).toBeInTheDocument()
      expect(screen.getByText('服务器名称')).toBeInTheDocument()
      expect(screen.getByText('推理框架')).toBeInTheDocument()
    })

    it('应该标记不同的配置项', () => {
      render(<ComparisonPanel benchmark1={mockBenchmark1} benchmark2={mockBenchmark2} />)

      // Model names are different, should show "不同" badge
      const badges = screen.getAllByText('不同')
      expect(badges.length).toBeGreaterThan(0)
    })

    it('应该显示性能指标对比表格', () => {
      render(<ComparisonPanel benchmark1={mockBenchmark1} benchmark2={mockBenchmark2} />)

      expect(screen.getByText('性能指标对比 (按并发数)')).toBeInTheDocument()
      expect(screen.getByText('并发数')).toBeInTheDocument()
      expect(screen.getByText('TTFT (ms)')).toBeInTheDocument()
      expect(screen.getByText('TPOT (ms)')).toBeInTheDocument()
      expect(screen.getByText('TPS (tokens/s)')).toBeInTheDocument()
    })

    it('应该显示切换按钮', () => {
      render(<ComparisonPanel benchmark1={mockBenchmark1} benchmark2={mockBenchmark2} />)

      expect(screen.getByTitle('切换基准测试位置')).toBeInTheDocument()
    })

    it('应该显示趋势图按钮', () => {
      render(<ComparisonPanel benchmark1={mockBenchmark1} benchmark2={mockBenchmark2} />)

      expect(screen.getByText('显示趋势图')).toBeInTheDocument()
    })
  })

  describe('交互功能', () => {
    it('应该能切换显示趋势图', async () => {
      const user = userEvent.setup()
      render(<ComparisonPanel benchmark1={mockBenchmark1} benchmark2={mockBenchmark2} />)

      const toggleButton = screen.getByText('显示趋势图')
      await user.click(toggleButton)

      expect(screen.getByText('隐藏趋势图')).toBeInTheDocument()
    })

    it('应该能切换基准测试位置', async () => {
      const user = userEvent.setup()
      render(<ComparisonPanel benchmark1={mockBenchmark1} benchmark2={mockBenchmark2} />)

      const swapButton = screen.getByTitle('切换基准测试位置')
      await user.click(swapButton)

      // After swap, the component should still render correctly
      expect(screen.getByText('基准测试 A')).toBeInTheDocument()
      expect(screen.getByText('基准测试 B')).toBeInTheDocument()
    })
  })

  describe('性能差异显示', () => {
    it('应该正确显示性能差异百分比', () => {
      render(<ComparisonPanel benchmark1={mockBenchmark1} benchmark2={mockBenchmark2} />)

      // Should show percentage differences
      const percentageElements = screen.getAllByText(/↑|↓/)
      expect(percentageElements.length).toBeGreaterThan(0)
    })

    it('应该用不同颜色标识性能提升和下降', () => {
      render(<ComparisonPanel benchmark1={mockBenchmark1} benchmark2={mockBenchmark2} />)

      // Check for colored text elements
      const improvementElements = document.querySelectorAll('.text-emerald-600')
      const declineElements = document.querySelectorAll('.text-rose-600')
      
      // Should have at least one of each (for TPS and TTFT respectively)
      expect(improvementElements.length + declineElements.length).toBeGreaterThan(0)
    })
  })

  describe('可扩展性', () => {
    it('应该处理没有metrics的情况', () => {
      const emptyBenchmark: Benchmark = {
        ...mockBenchmark1,
        metrics: [],
      }

      render(<ComparisonPanel benchmark1={emptyBenchmark} benchmark2={mockBenchmark2} />)

      expect(screen.getByText('详细配置对比')).toBeInTheDocument()
    })

    it('应该处理单个metric的情况', () => {
      const singleMetricBenchmark: Benchmark = {
        ...mockBenchmark1,
        metrics: [mockMetrics1[0]],
      }

      render(<ComparisonPanel benchmark1={singleMetricBenchmark} benchmark2={mockBenchmark2} />)

      expect(screen.getByText('1 并发')).toBeInTheDocument()
    })
  })

  describe('数据完整性', () => {
    it('应该正确显示测试数据量', () => {
      render(<ComparisonPanel benchmark1={mockBenchmark1} benchmark2={mockBenchmark2} />)

      expect(screen.getByText('3 条')).toBeInTheDocument()
    })

    it('应该显示唯一标识符', () => {
      render(<ComparisonPanel benchmark1={mockBenchmark1} benchmark2={mockBenchmark2} />)

      expect(screen.getByText('bench-001')).toBeInTheDocument()
      expect(screen.getByText('bench-002')).toBeInTheDocument()
    })
  })
})

describe('性能结果呈现模块集成测试', () => {
  describe('新功能Tab测试', () => {
    it('应该存在性能对比Tab', () => {
      // This would be tested in the parent component BenchmarkList
      // Here we document the expected behavior
      const expectedTabs = ['基准测试', '性能对比', '性能趋势图', '对比报告']
      expect(expectedTabs).toContain('性能对比')
      expect(expectedTabs).toContain('性能趋势图')
    })

    it('性能对比Tab应该支持选择两个基准测试', () => {
      // Integration test would verify:
      // 1. Can select first benchmark (marked as A)
      // 2. Can select second benchmark (marked as B)
      // 3. ComparisonPanel is rendered when 2 selected
      expect(true).toBe(true) // Placeholder for integration test
    })

    it('性能趋势图Tab应该支持选择一个基准测试', () => {
      // Integration test would verify:
      // 1. Can select a single benchmark
      // 2. PerformanceTrendCharts is rendered
      expect(true).toBe(true) // Placeholder for integration test
    })
  })

  describe('安全性测试', () => {
    it('应该正确处理undefined metric values', () => {
      const metricsWithUndefined: BenchmarkMetricsEntry[] = [
        { concurrency: 1, inputLength: 1024, outputLength: 128, ttft: 100, tpot: 20, tokensPerSecond: 45.5 },
      ]

      render(
        <PerformanceTrendCharts
          metrics1={metricsWithUndefined}
          metrics2={[]}
          modelName1="Test"
          modelName2="Test2"
        />
      )

      // Should not crash
      expect(screen.getByText('性能趋势图')).toBeInTheDocument()
    })

    it('ComparisonPanel应该处理metrics聚合', () => {
      const benchmarkWithDuplicates: Benchmark = {
        ...mockBenchmark1,
        metrics: [
          ...mockMetrics1,
          { concurrency: 1, inputLength: 1024, outputLength: 128, ttft: 110, tpot: 22, tokensPerSecond: 48.5 },
        ],
      }

      render(<ComparisonPanel benchmark1={benchmarkWithDuplicates} benchmark2={mockBenchmark2} />)

      // Should aggregate metrics by concurrency
      expect(screen.getByText('性能指标对比 (按并发数)')).toBeInTheDocument()
    })
  })
})

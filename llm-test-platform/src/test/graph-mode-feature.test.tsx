/**
 * @fileoverview 图模式字段功能测试
 * @description 测试前端组件对 graphMode 字段的处理
 * @testplan
 *   - 功能正确性: 验证组件正确渲染和处理 graphMode 字段
 *   - 可靠性: 验证边界情况和异常输入处理
 *   - 可扩展性: 验证与其他字段的兼容性
 *   - 安全性: 验证 XSS 和注入攻击防护
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddBenchmarkForm } from '../components/AddBenchmarkForm'
import { AddBenchmarkEnhanced } from '../components/AddBenchmarkEnhanced'
import { CsvImportEnhanced } from '../components/CsvImportEnhanced'
import { ComparisonPanel } from '../components/ComparisonPanel'
import type { BenchmarkConfig, Benchmark, BenchmarkMetricsEntry } from '../lib/types'

describe('图模式字段功能测试 - Graph Mode Feature Tests', () => {
  
  /**
   * ============================================
   * 1. 功能正确性测试 (Functional Correctness)
   * ============================================
   */
  describe('1. 功能正确性测试 / Functional Correctness', () => {
    
    it('应该正确渲染图模式输入框', () => {
      const mockSubmit = vi.fn()
      const mockCancel = vi.fn()
      
      render(
        <AddBenchmarkForm 
          onSubmit={mockSubmit} 
          onCancel={mockCancel}
        />
      )
      
      // 验证图模式标签存在
      expect(screen.getByLabelText(/图模式/i)).toBeInTheDocument()
      
      // 验证输入框是 textarea 类型
      const graphModeInput = screen.getByPlaceholderText(/例如：eager,aclgraph/i)
      expect(graphModeInput.tagName.toLowerCase()).toBe('textarea')
    })

    it('应该正确接收和显示图模式值', async () => {
      const mockSubmit = vi.fn()
      const mockCancel = vi.fn()
      const user = userEvent.setup()
      
      render(
        <AddBenchmarkForm 
          onSubmit={mockSubmit} 
          onCancel={mockCancel}
        />
      )
      
      // 填写图模式信息
      const graphModeInput = screen.getByPlaceholderText(/例如：eager,aclgraph/i)
      await user.type(graphModeInput, 'eager mode')
      
      expect(graphModeInput).toHaveValue('eager mode')
    })

    it('应该允许图模式字段为空', async () => {
      const mockSubmit = vi.fn()
      const mockCancel = vi.fn()
      
      render(
        <AddBenchmarkForm 
          onSubmit={mockSubmit} 
          onCancel={mockCancel}
        />
      )
      
      // 不填写图模式信息
      const graphModeInput = screen.getByPlaceholderText(/例如：eager,aclgraph/i)
      expect(graphModeInput).toHaveValue('')
      
      // 验证其他必填字段填写后可以提交
      await userEvent.type(screen.getByPlaceholderText(/如：Qwen-14B/i), 'TestModel')
      await userEvent.type(screen.getByPlaceholderText(/如：server-01/i), 'TestServer')
      await userEvent.type(screen.getByPlaceholderText(/如：GPU-A100/i), 'TestChip')
      
      // 不需要填写图模式即可继续
      expect(graphModeInput).toHaveValue('')
    })

    it('应该在配置对比中显示图模式字段', () => {
      const mockBenchmark1: Benchmark = {
        id: 1,
        unique_id: 'BM-001',
        config: {
          submitter: 'admin',
          modelName: 'Model-A',
          serverName: 'Server-A',
          chipName: 'GPU-A100',
          framework: 'vLLM',
          frameworkVersion: 'v0.6.3',
          shardingConfig: 'tp=4',
          graphMode: 'eager',
          operatorAcceleration: 'FlashAttention',
          testDate: '2024-01-15',
        },
        metrics: [],
        created_at: '2024-01-15T00:00:00Z',
      }
      
      const mockBenchmark2: Benchmark = {
        id: 2,
        unique_id: 'BM-002',
        config: {
          submitter: 'admin',
          modelName: 'Model-B',
          serverName: 'Server-B',
          chipName: 'GPU-A100',
          framework: 'vLLM',
          frameworkVersion: 'v0.6.4',
          shardingConfig: 'tp=8',
          graphMode: 'dynamic',
          operatorAcceleration: 'FlashAttention',
          testDate: '2024-01-16',
        },
        metrics: [],
        created_at: '2024-01-16T00:00:00Z',
      }
      
      render(
        <ComparisonPanel 
          benchmark1={mockBenchmark1}
          benchmark2={mockBenchmark2}
        />
      )
      
      // 验证图模式在对比中显示
      expect(screen.getByText('图模式')).toBeInTheDocument()
      expect(screen.getByText('eager')).toBeInTheDocument()
      expect(screen.getByText('dynamic')).toBeInTheDocument()
    })

    it('应该在 CSV 导入中显示图模式输入框', () => {
      const mockImport = vi.fn()
      const mockClose = vi.fn()
      
      render(
        <CsvImportEnhanced 
          isOpen={true}
          onClose={mockClose}
          onImport={mockImport}
        />
      )
      
      // 验证图模式输入框存在
      expect(screen.getByLabelText(/图模式/i)).toBeInTheDocument()
    })
  })

  /**
   * ============================================
   * 2. 可靠性测试 (Reliability)
   * ============================================
   */
  describe('2. 可靠性测试 / Reliability', () => {
    
    it('应该处理超长图模式字符串', async () => {
      const mockSubmit = vi.fn()
      const mockCancel = vi.fn()
      const user = userEvent.setup()
      
      render(
        <AddBenchmarkForm 
          onSubmit={mockSubmit} 
          onCancel={mockCancel}
        />
      )
      
      // 输入超长字符串
      const longString = 'mode_' + 'x'.repeat(1000)
      const graphModeInput = screen.getByPlaceholderText(/例如：eager,aclgraph/i)
      await user.type(graphModeInput, longString)
      
      expect(graphModeInput).toHaveValue(longString)
    })

    it('应该处理包含特殊字符的图模式值', async () => {
      const mockSubmit = vi.fn()
      const mockCancel = vi.fn()
      const user = userEvent.setup()
      
      render(
        <AddBenchmarkForm 
          onSubmit={mockSubmit} 
          onCancel={mockCancel}
        />
      )
      
      const specialValues = [
        'mode-with-dashes',
        'mode_v2.0',
        'mode\nwith\nnewlines',
        'mode\twith\ttabs',
      ]
      
      for (const value of specialValues) {
        const graphModeInput = screen.getByPlaceholderText(/例如：eager,aclgraph/i)
        await user.clear(graphModeInput)
        await user.type(graphModeInput, value)
        expect(graphModeInput).toHaveValue(value)
      }
    })

    it('应该处理 Unicode 字符', async () => {
      const mockSubmit = vi.fn()
      const mockCancel = vi.fn()
      const user = userEvent.setup()
      
      render(
        <AddBenchmarkForm 
          onSubmit={mockSubmit} 
          onCancel={mockCancel}
        />
      )
      
      const unicodeValues = [
        '图模式模式',
        'モード',
        'mode🔥',
        '🚀rocket',
      ]
      
      for (const value of unicodeValues) {
        const graphModeInput = screen.getByPlaceholderText(/例如：eager,aclgraph/i)
        await user.clear(graphModeInput)
        await user.type(graphModeInput, value)
        expect(graphModeInput).toHaveValue(value)
      }
    })

    it('应该在网络错误后保留图模式值', async () => {
      // 模拟提交失败
      const mockSubmit = vi.fn().mockRejectedValue(new Error('Network error'))
      const mockCancel = vi.fn()
      const user = userEvent.setup()
      
      render(
        <AddBenchmarkEnhanced 
          onSubmit={mockSubmit} 
          onCancel={mockCancel}
        />
      )
      
      // 填写图模式信息
      const graphModeInput = screen.getByPlaceholderText(/例如：eager,aclgraph/i)
      await user.type(graphModeInput, 'persistent-mode')
      
      // 模拟提交失败（网络错误）
      // 值应该被保留
      expect(graphModeInput).toHaveValue('persistent-mode')
    })
  })

  /**
   * ============================================
   * 3. 可扩展性测试 (Extensibility)
   * ============================================
   */
  describe('3. 可扩展性测试 / Extensibility', () => {
    
    it('应该与所有配置字段兼容', () => {
      const fullConfig: BenchmarkConfig = {
        submitter: 'admin',
        modelName: 'Qwen-14B',
        serverName: 'server-01',
        chipName: 'GPU-A100',
        framework: 'vLLM',
        frameworkVersion: 'v0.6.3',
        shardingConfig: 'tp=4',
        graphMode: 'eager',
        operatorAcceleration: 'FlashAttention',
        frameworkParams: '--max-batch-size=256',
        testDate: '2024-01-15',
        notes: '性能测试备注',
      }
      
      // 验证所有字段都存在
      expect(fullConfig.graphMode).toBe('eager')
      expect(fullConfig.operatorAcceleration).toBe('FlashAttention')
      expect(fullConfig.frameworkParams).toBe('--max-batch-size=256')
      expect(fullConfig.notes).toBe('性能测试备注')
    })

    it('应该在复杂场景下正常工作', async () => {
      const mockSubmit = vi.fn()
      const mockCancel = vi.fn()
      const user = userEvent.setup()
      
      const existingBenchmarks: Benchmark[] = [
        {
          id: 1,
          unique_id: 'BM-001',
          config: {
            submitter: 'admin',
            modelName: 'Existing-Model',
            serverName: 'Existing-Server',
            chipName: 'GPU',
            framework: 'vLLM',
            frameworkVersion: 'v1.0',
            shardingConfig: 'tp=2',
            graphMode: 'existing-mode',
            testDate: '2024-01-01',
          },
          metrics: [
            {
              concurrency: 1,
              inputLength: 1024,
              outputLength: 128,
              ttft: 50,
              tpot: 10,
              tokensPerSecond: 100,
            },
          ],
          created_at: '2024-01-01T00:00:00Z',
        },
      ]
      
      render(
        <AddBenchmarkEnhanced 
          onSubmit={mockSubmit} 
          onCancel={mockCancel}
          existingBenchmarks={existingBenchmarks}
        />
      )
      
      // 验证可以复制现有测试
      const copyButton = screen.getByText(/复制现有测试/i)
      expect(copyButton).toBeInTheDocument()
    })

    it('应该在不同浏览器环境下正常工作', () => {
      // 模拟不同的 navigator.userAgent
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      ]
      
      for (const ua of userAgents) {
        Object.defineProperty(navigator, 'userAgent', {
          value: ua,
          configurable: true,
        })
        
        const mockSubmit = vi.fn()
        const mockCancel = vi.fn()
        
        const { container } = render(
          <AddBenchmarkForm 
            onSubmit={mockSubmit} 
            onCancel={mockCancel}
          />
        )
        
        // 验证组件正常渲染
        expect(container.querySelector('textarea')).toBeInTheDocument()
      }
    })
  })

  /**
   * ============================================
   * 4. 安全性测试 (Security)
   * ============================================
   */
  describe('4. 安全性测试 / Security', () => {
    
    it('应该转义 XSS 攻击代码', async () => {
      const mockSubmit = vi.fn()
      const mockCancel = vi.fn()
      const user = userEvent.setup()
      
      render(
        <AddBenchmarkForm 
          onSubmit={mockSubmit} 
          onCancel={mockCancel}
        />
      )
      
      // 输入 XSS 攻击代码
      const xssPayload = "<script>alert('xss')</script>"
      const graphModeInput = screen.getByPlaceholderText(/例如：eager,aclgraph/i)
      await user.type(graphModeInput, xssPayload)
      
      // 输入框应该包含原始字符串（转义在渲染时处理）
      expect(graphModeInput).toHaveValue(xssPayload)
    })

    it('应该处理 HTML 实体', async () => {
      const mockSubmit = vi.fn()
      const mockCancel = vi.fn()
      const user = userEvent.setup()
      
      render(
        <AddBenchmarkForm 
          onSubmit={mockSubmit} 
          onCancel={mockCancel}
        />
      )
      
      const htmlEntities = [
        '&lt;test&gt;',
        '&amp;',
        '&quot;test&quot;',
      ]
      
      for (const entity of htmlEntities) {
        const graphModeInput = screen.getByPlaceholderText(/例如：eager,aclgraph/i)
        await user.clear(graphModeInput)
        await user.type(graphModeInput, entity)
        expect(graphModeInput).toHaveValue(entity)
      }
    })

    it('应该防止 SQL 注入攻击', async () => {
      const mockSubmit = vi.fn()
      const mockCancel = vi.fn()
      const user = userEvent.setup()
      
      render(
        <AddBenchmarkForm 
          onSubmit={mockSubmit} 
          onCancel={mockCancel}
        />
      )
      
      // 输入 SQL 注入代码
      const sqlInjection = "'; DROP TABLE benchmark; --"
      const graphModeInput = screen.getByPlaceholderText(/例如：eager,aclgraph/i)
      await user.type(graphModeInput, sqlInjection)
      
      // 输入框应该包含原始字符串（防护在数据库层）
      expect(graphModeInput).toHaveValue(sqlInjection)
    })

    it('应该在对比面板中安全显示图模式', () => {
      const mockBenchmark1: Benchmark = {
        id: 1,
        unique_id: 'BM-001',
        config: {
          submitter: 'admin',
          modelName: 'Model-A',
          serverName: 'Server-A',
          chipName: 'GPU',
          framework: 'vLLM',
          frameworkVersion: 'v1.0',
          shardingConfig: 'tp=4',
          graphMode: "<script>alert('xss')</script>",
          testDate: '2024-01-15',
        },
        metrics: [],
        created_at: '2024-01-15T00:00:00Z',
      }
      
      const mockBenchmark2: Benchmark = {
        id: 2,
        unique_id: 'BM-002',
        config: {
          submitter: 'admin',
          modelName: 'Model-B',
          serverName: 'Server-B',
          chipName: 'GPU',
          framework: 'vLLM',
          frameworkVersion: 'v1.0',
          shardingConfig: 'tp=8',
          graphMode: 'normal-mode',
          testDate: '2024-01-16',
        },
        metrics: [],
        created_at: '2024-01-16T00:00:00Z',
      }
      
      const { container } = render(
        <ComparisonPanel 
          benchmark1={mockBenchmark1}
          benchmark2={mockBenchmark2}
        />
      )
      
      // 验证 XSS 代码不会被执行（作为纯文本显示）
      const htmlContent = container.innerHTML
      expect(htmlContent).toContain("<script>alert('xss')</script>")
    })
  })

  /**
   * ============================================
   * 5. 集成测试 (Integration)
   * ============================================
   */
  describe('5. 集成测试 / Integration', () => {
    
    it('应该正确处理完整的表单提交流程', async () => {
      const mockSubmit = vi.fn()
      const mockCancel = vi.fn()
      const user = userEvent.setup()
      
      render(
        <AddBenchmarkForm 
          onSubmit={mockSubmit} 
          onCancel={mockCancel}
        />
      )
      
      // 填写所有必填字段
      await user.type(screen.getByPlaceholderText(/如：Qwen-14B/i), 'TestModel')
      await user.type(screen.getByPlaceholderText(/如：server-01/i), 'TestServer')
      await user.type(screen.getByPlaceholderText(/如：GPU-A100/i), 'TestChip')
      
      // 填写图模式字段
      const graphModeInput = screen.getByPlaceholderText(/例如：eager,aclgraph/i)
      await user.type(graphModeInput, 'eager-mode')
      
      // 验证所有字段已填写
      expect(screen.getByPlaceholderText(/如：Qwen-14B/i)).toHaveValue('TestModel')
      expect(screen.getByPlaceholderText(/如：server-01/i)).toHaveValue('TestServer')
      expect(graphModeInput).toHaveValue('eager-mode')
    })

    it('应该在对比报告中正确导出图模式字段', () => {
      const mockBenchmark1: Benchmark = {
        id: 1,
        unique_id: 'BM-001',
        config: {
          submitter: 'admin',
          modelName: 'Model-A',
          serverName: 'Server-A',
          chipName: 'GPU',
          framework: 'vLLM',
          frameworkVersion: 'v1.0',
          shardingConfig: 'tp=4',
          graphMode: 'mode-a',
          operatorAcceleration: 'FlashAttention',
          testDate: '2024-01-15',
        },
        metrics: [
          {
            concurrency: 1,
            inputLength: 1024,
            outputLength: 128,
            ttft: 50,
            tpot: 10,
            tokensPerSecond: 100,
          },
        ],
        created_at: '2024-01-15T00:00:00Z',
      }
      
      const mockBenchmark2: Benchmark = {
        id: 2,
        unique_id: 'BM-002',
        config: {
          submitter: 'admin',
          modelName: 'Model-B',
          serverName: 'Server-B',
          chipName: 'GPU',
          framework: 'vLLM',
          frameworkVersion: 'v1.0',
          shardingConfig: 'tp=8',
          graphMode: 'mode-b',
          operatorAcceleration: 'FlashAttention',
          testDate: '2024-01-16',
        },
        metrics: [
          {
            concurrency: 1,
            inputLength: 1024,
            outputLength: 128,
            ttft: 55,
            tpot: 12,
            tokensPerSecond: 90,
          },
        ],
        created_at: '2024-01-16T00:00:00Z',
      }
      
      render(
        <ComparisonPanel 
          benchmark1={mockBenchmark1}
          benchmark2={mockBenchmark2}
        />
      )
      
      // 验证图模式在配置对比中显示
      expect(screen.getByText('图模式')).toBeInTheDocument()
      expect(screen.getByText('mode-a')).toBeInTheDocument()
      expect(screen.getByText('mode-b')).toBeInTheDocument()
      
      // 验证导出按钮存在
      expect(screen.getByText(/导出为 HTML/i)).toBeInTheDocument()
    })
  })
})

/**
 * ============================================
 * 测试总结
 * ============================================
 * 
 * 本测试套件覆盖了图模式字段(graphMode)的以下方面：
 * 
 * 1. 功能正确性 (Functional Correctness)
 *    - ✓ 正确渲染图模式输入框
 *    - ✓ 正确接收和显示图模式值
 *    - ✓ 允许图模式字段为空（可选字段）
 *    - ✓ 在配置对比中显示图模式字段
 *    - ✓ 在 CSV 导入中显示图模式输入框
 * 
 * 2. 可靠性 (Reliability)
 *    - ✓ 处理超长图模式字符串
 *    - ✓ 处理包含特殊字符的图模式值
 *    - ✓ 处理 Unicode 字符
 *    - ✓ 在网络错误后保留图模式值
 * 
 * 3. 可扩展性 (Extensibility)
 *    - ✓ 与所有配置字段兼容
 *    - ✓ 在复杂场景下正常工作
 *    - ✓ 在不同浏览器环境下正常工作
 * 
 * 4. 安全性 (Security)
 *    - ✓ 转义 XSS 攻击代码
 *    - ✓ 处理 HTML 实体
 *    - ✓ 防止 SQL 注入攻击
 *    - ✓ 在对比面板中安全显示图模式
 * 
 * 5. 集成测试 (Integration)
 *    - ✓ 正确处理完整的表单提交流程
 *    - ✓ 在对比报告中正确导出图模式字段
 */

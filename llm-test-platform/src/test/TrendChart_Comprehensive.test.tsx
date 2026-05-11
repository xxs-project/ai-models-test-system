import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MultiVersionTrendCharts } from '../components/MultiVersionTrendCharts'
import { Benchmark } from '../lib/types'

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Generate mock data
const generateBenchmarks = (count: number): Benchmark[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    unique_id: `bench-${i + 1}`,
    config: {
      modelName: `Model ${i + 1}`,
      serverName: `Server ${i % 2 === 0 ? 'A' : 'B'}`,
      framework: 'MindIE',
      frameworkVersion: '1.0',
      chipName: 'Ascend',
      testDate: '2023-01-01',
      submitter: 'Admin',
      shardingConfig: 'tp=1'
    },
    metrics: [
      {
        concurrency: 1,
        inputLength: 1024,
        outputLength: 1024,
        ttft: 10 + i,
        tpot: 20 + i,
        tokensPerSecond: 30 + i,
      }
    ],
    created_at: new Date().toISOString()
  }))
}

describe('MultiVersionTrendCharts Component Tests', () => {
  
  // 1. Correctness: Verify it renders all items and filters work
  it('Correctness: renders all 56 benchmarks in the selection list', () => {
    const benchmarks = generateBenchmarks(56)
    render(<MultiVersionTrendCharts benchmarks={benchmarks} />)
    
    // Use regex to find all "Model X" text
    const items = screen.getAllByText(/Model \d+/)
    expect(items.length).toBe(56)
  })

  it('Correctness: filters benchmarks by search query', async () => {
    const benchmarks = generateBenchmarks(10)
    render(<MultiVersionTrendCharts benchmarks={benchmarks} />)
    
    const searchInput = screen.getByPlaceholderText(/搜索/i)
    fireEvent.change(searchInput, { target: { value: 'Model 1' } })
    
    // Model 1 and Model 10 matches "Model 1"
    const items = screen.getAllByText(/Model \d+/)
    // Depending on regex and content, Model 1, Model 10 match.
    // "Model 2" should not match.
    
    // Let's be specific
    expect(screen.getByText('Model 1')).toBeInTheDocument()
    expect(screen.getByText('Model 10')).toBeInTheDocument()
    expect(screen.queryByText('Model 2')).not.toBeInTheDocument()
  })

  // 2. Reliability: Handles empty data and large data gracefully
  it('Reliability: handles empty benchmark list without crashing', () => {
    render(<MultiVersionTrendCharts benchmarks={[]} />)
    expect(screen.getByText(/选择性能版本进行对比/)).toBeInTheDocument()
    // Should show no items
    const items = screen.queryAllByText(/Model/)
    expect(items.length).toBe(0)
  })

  // 3. Scalability: Renders large number of items (e.g., 1000)
  it('Scalability: renders 1000 items correctly', () => {
    const benchmarks = generateBenchmarks(1000)
    const { container } = render(<MultiVersionTrendCharts benchmarks={benchmarks} />)
    
    // Just checking it rendered without error and has many items
    // Using getAllByText might be slow for 1000 items in test environment
    // so we check checkboxes count
    const checkboxes = container.querySelectorAll('button[role="checkbox"]')
    expect(checkboxes.length).toBe(1000)
  })

  // 4. Security: (Contextual) ensuring no XSS in rendered fields
  // Since we use React, XSS is mostly mitigated, but we can check if special chars are escaped/rendered as text
  it('Security: renders special characters in model name safely', () => {
    const maliciousBenchmark = generateBenchmarks(1)[0]
    maliciousBenchmark.config.modelName = '<script>alert("xss")</script>'
    
    render(<MultiVersionTrendCharts benchmarks={[maliciousBenchmark]} />)
    
    // It should be present as text, not executed. 
    // Testing library getByText searches for text content, so if it finds it, it's rendered as text.
    expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument()
  })
})

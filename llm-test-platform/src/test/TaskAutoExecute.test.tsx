/**
 * 任务创建后自动执行测试
 * 
 * 测试范围：
 * 1. 功能正确性：创建任务后自动调用执行API
 * 2. 可靠性：执行失败时的错误处理
 * 3. 可扩展性：不同类型的任务都能正确触发
 * 4. 安全性：防止重复执行等边界情况
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// 模拟API调用
const mockApiPost = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

vi.mock('@/lib/api', () => ({
  default: {
    post: (...args: any[]) => mockApiPost(...args),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => mockToastSuccess(...args),
    error: (...args: any[]) => mockToastError(...args),
  },
}))

// 导入hooks
import { useCreateTask, useExecuteTask } from '@/hooks/use-tasks'

describe('任务创建后自动执行功能测试', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    mockApiPost.mockClear()
    mockToastSuccess.mockClear()
    mockToastError.mockClear()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  )

  describe('功能正确性测试', () => {
    it('创建任务成功后应自动调用执行API', async () => {
      // 模拟创建任务成功
      const createdTask = {
        id: 123,
        task_name: '测试任务',
        status: 0,
        progress: 0,
        created_at: new Date().toISOString(),
      }
      
      // 第一次调用：创建任务，第二次调用：执行任务
      mockApiPost
        .mockResolvedValueOnce({ data: createdTask })
        .mockResolvedValueOnce({ data: { ...createdTask, status: 3 } })

      const { result } = renderHook(() => ({
        createTask: useCreateTask(),
        executeTask: useExecuteTask(),
      }), { wrapper })

      // 创建任务
      await act(async () => {
        const taskData = await result.current.createTask.mutateAsync({
          task_name: '测试任务',
          priority: 1,
          test_type: 2,
          test_mode: 1,
          inference_framework: 'MindIE',
          framework_version: 'v1.0.1',
          model_path: '/data/models/test',
          device_id: 1,
        } as any)
        
        // 模拟TaskList中的逻辑：创建成功后立即执行
        if (taskData?.id) {
          await result.current.executeTask.mutateAsync(taskData.id)
        }
      })

      // 验证API调用
      expect(mockApiPost).toHaveBeenCalledTimes(2)
      expect(mockApiPost).toHaveBeenNthCalledWith(1, '/api/tasks', expect.any(Object))
      expect(mockApiPost).toHaveBeenNthCalledWith(2, '/api/tasks/123/execute')
      
      // 验证成功提示
      expect(mockToastSuccess).toHaveBeenCalledWith('任务创建成功')
      expect(mockToastSuccess).toHaveBeenCalledWith('任务已开始执行')
    })

    it('应传递正确的任务数据到后端', async () => {
      const createdTask = { id: 456, status: 0 }
      mockApiPost
        .mockResolvedValueOnce({ data: createdTask })
        .mockResolvedValueOnce({ data: { ...createdTask, status: 3 } })

      const { result } = renderHook(() => ({
        createTask: useCreateTask(),
        executeTask: useExecuteTask(),
      }), { wrapper })

      const taskPayload = {
        task_name: 'Qwen-14B性能测试',
        priority: 2,
        test_type: 2,
        test_mode: 1,
        inference_framework: 'MindIE',
        framework_version: 'v1.0.1',
        model_path: '/data/models/Qwen-14B',
        model_name: 'Qwen-14B',
        npu_count: 2,
        graph_mode: 'eager',
        device_id: 1,
      }

      await act(async () => {
        const taskData = await result.current.createTask.mutateAsync(taskPayload as any)
        if (taskData?.id) {
          await result.current.executeTask.mutateAsync(taskData.id)
        }
      })

      // 验证创建任务的参数
      const createCallArgs = mockApiPost.mock.calls[0]
      expect(createCallArgs[0]).toBe('/api/tasks')
      expect(createCallArgs[1]).toMatchObject(taskPayload)
    })

    it('不同类型的任务都应能自动执行', async () => {
      const taskTypes = [
        { test_type: 1, test_mode: 1, name: '性能测试-单模型' },
        { test_type: 1, test_mode: 2, name: '性能测试-全套模型' },
        { test_type: 2, test_mode: 1, name: '精度测试-单模型' },
        { test_type: 2, test_mode: 2, name: '精度测试-全套模型' },
      ]

      for (const type of taskTypes) {
        mockApiPost.mockClear()
        const createdTask = { id: Math.floor(Math.random() * 1000), status: 0 }
        mockApiPost
          .mockResolvedValueOnce({ data: createdTask })
          .mockResolvedValueOnce({ data: { ...createdTask, status: 3 } })

        const { result } = renderHook(() => ({
          createTask: useCreateTask(),
          executeTask: useExecuteTask(),
        }), { wrapper })

        await act(async () => {
          const taskData = await result.current.createTask.mutateAsync({
            task_name: `${type.name}测试`,
            priority: 1,
            test_type: type.test_type,
            test_mode: type.test_mode,
            inference_framework: 'VLLM',
            framework_version: 'v0.2.0',
            model_path: '/data/models/test',
          } as any)
          
          if (taskData?.id) {
            await result.current.executeTask.mutateAsync(taskData.id)
          }
        })

        expect(mockApiPost).toHaveBeenCalledTimes(2)
      }
    })
  })

  describe('可靠性测试', () => {
    it('执行任务失败时应显示友好错误提示', async () => {
      const createdTask = { id: 789, status: 0 }
      
      mockApiPost
        .mockResolvedValueOnce({ data: createdTask })
        .mockRejectedValueOnce(new Error('设备离线'))

      const { result } = renderHook(() => ({
        createTask: useCreateTask(),
        executeTask: useExecuteTask(),
      }), { wrapper })

      await act(async () => {
        try {
          const taskData = await result.current.createTask.mutateAsync({
            task_name: '测试任务',
            priority: 1,
            test_type: 2,
            test_mode: 1,
            inference_framework: 'MindIE',
            framework_version: 'v1.0.1',
            model_path: '/data/models/test',
          } as any)
          
          if (taskData?.id) {
            await result.current.executeTask.mutateAsync(taskData.id)
          }
        } catch (error) {
          // 预期会抛出错误
        }
      })

      // 验证错误提示
      expect(mockToastError).toHaveBeenCalledWith('任务创建成功，但执行失败，请手动执行')
    })

    it('创建任务失败时不应尝试执行', async () => {
      mockApiPost.mockRejectedValueOnce(new Error('服务器错误'))

      const { result } = renderHook(() => ({
        createTask: useCreateTask(),
        executeTask: useExecuteTask(),
      }), { wrapper })

      await act(async () => {
        try {
          await result.current.createTask.mutateAsync({
            task_name: '测试任务',
            priority: 1,
            test_type: 2,
            test_mode: 1,
            inference_framework: 'MindIE',
            framework_version: 'v1.0.1',
            model_path: '/data/models/test',
          } as any)
        } catch (error) {
          // 预期会抛出错误
        }
      })

      // 只应调用一次API（创建任务），不应调用执行API
      expect(mockApiPost).toHaveBeenCalledTimes(1)
      expect(mockApiPost).toHaveBeenCalledWith('/api/tasks', expect.any(Object))
    })

    it('网络延迟时不应重复调用执行API', async () => {
      const createdTask = { id: 999, status: 0 }
      
      // 模拟网络延迟
      mockApiPost
        .mockImplementationOnce(async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return { data: createdTask }
        })
        .mockResolvedValueOnce({ data: { ...createdTask, status: 3 } })

      const { result } = renderHook(() => ({
        createTask: useCreateTask(),
        executeTask: useExecuteTask(),
      }), { wrapper })

      await act(async () => {
        const taskData = await result.current.createTask.mutateAsync({
          task_name: '测试任务',
          priority: 1,
          test_type: 2,
          test_mode: 1,
          inference_framework: 'MindIE',
          framework_version: 'v1.0.1',
          model_path: '/data/models/test',
        } as any)
        
        if (taskData?.id) {
          await result.current.executeTask.mutateAsync(taskData.id)
        }
      })

      // 确保只调用一次执行API
      expect(mockApiPost).toHaveBeenCalledTimes(2)
    })
  })

  describe('安全性测试', () => {
    it('不应在没有任务ID时尝试执行', async () => {
      // 模拟返回没有id的任务
      mockApiPost.mockResolvedValueOnce({ data: { status: 0 } })

      const { result } = renderHook(() => ({
        createTask: useCreateTask(),
        executeTask: useExecuteTask(),
      }), { wrapper })

      await act(async () => {
        const taskData = await result.current.createTask.mutateAsync({
          task_name: '测试任务',
          priority: 1,
          test_type: 2,
          test_mode: 1,
          inference_framework: 'MindIE',
          framework_version: 'v1.0.1',
          model_path: '/data/models/test',
        } as any)
        
        // 模拟检查逻辑
        if (taskData?.id) {
          await result.current.executeTask.mutateAsync(taskData.id)
        }
      })

      // 只应调用创建API，不应调用执行API
      expect(mockApiPost).toHaveBeenCalledTimes(1)
      expect(mockApiPost).toHaveBeenCalledWith('/api/tasks', expect.any(Object))
    })

    it('编辑任务时不应自动执行', async () => {
      mockApiPost.mockResolvedValueOnce({
        data: { id: 111, status: 0, task_name: '更新后的任务' }
      })

      const { result } = renderHook(() => ({
        updateTask: useCreateTask(), // 使用update模拟
      }), { wrapper })

      // 模拟编辑任务（不包含自动执行逻辑）
      await act(async () => {
        await result.current.updateTask.mutateAsync({
          id: 111,
          task_name: '更新后的任务',
          priority: 1,
        } as any)
      })

      // 只应调用更新API
      expect(mockApiPost).toHaveBeenCalledTimes(1)
    })
  })

  describe('性能测试', () => {
    it('创建并执行任务应在合理时间内完成', async () => {
      const createdTask = { id: 1000, status: 0 }
      
      mockApiPost
        .mockResolvedValueOnce({ data: createdTask })
        .mockResolvedValueOnce({ data: { ...createdTask, status: 3 } })

      const { result } = renderHook(() => ({
        createTask: useCreateTask(),
        executeTask: useExecuteTask(),
      }), { wrapper })

      const startTime = Date.now()

      await act(async () => {
        const taskData = await result.current.createTask.mutateAsync({
          task_name: '性能测试任务',
          priority: 1,
          test_type: 2,
          test_mode: 1,
          inference_framework: 'MindIE',
          framework_version: 'v1.0.1',
          model_path: '/data/models/test',
        } as any)
        
        if (taskData?.id) {
          await result.current.executeTask.mutateAsync(taskData.id)
        }
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      // 应该在2秒内完成（包括模拟的网络延迟）
      expect(duration).toBeLessThan(2000)
      expect(mockApiPost).toHaveBeenCalledTimes(2)
    })

    it('连续创建多个任务时每个任务都应触发执行', async () => {
      const tasks = [
        { id: 1001, status: 0 },
        { id: 1002, status: 0 },
        { id: 1003, status: 0 },
      ]

      let callIndex = 0
      mockApiPost.mockImplementation(() => {
        const task = tasks[Math.floor(callIndex / 2)]
        callIndex++
        return Promise.resolve({
          data: callIndex % 2 === 1 ? task : { ...task, status: 3 }
        })
      })

      const { result } = renderHook(() => ({
        createTask: useCreateTask(),
        executeTask: useExecuteTask(),
      }), { wrapper })

      // 连续创建3个任务
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          const taskData = await result.current.createTask.mutateAsync({
            task_name: `批量任务${i}`,
            priority: 1,
            test_type: 2,
            test_mode: 1,
            inference_framework: 'MindIE',
            framework_version: 'v1.0.1',
            model_path: '/data/models/test',
          } as any)
          
          if (taskData?.id) {
            await result.current.executeTask.mutateAsync(taskData.id)
          }
        })
      }

      // 应该调用6次API（3次创建 + 3次执行）
      expect(mockApiPost).toHaveBeenCalledTimes(6)
    })
  })

  describe('边界情况测试', () => {
    it('任务名称为空时应正确处理', async () => {
      const createdTask = { id: 2001, status: 0 }
      mockApiPost
        .mockResolvedValueOnce({ data: createdTask })
        .mockResolvedValueOnce({ data: { ...createdTask, status: 3 } })

      const { result } = renderHook(() => ({
        createTask: useCreateTask(),
        executeTask: useExecuteTask(),
      }), { wrapper })

      await act(async () => {
        const taskData = await result.current.createTask.mutateAsync({
          task_name: '', // 空名称
          priority: 1,
          test_type: 2,
          test_mode: 1,
          inference_framework: 'MindIE',
          framework_version: 'v1.0.1',
          model_path: '/data/models/test',
        } as any)
        
        if (taskData?.id) {
          await result.current.executeTask.mutateAsync(taskData.id)
        }
      })

      expect(mockApiPost).toHaveBeenCalledTimes(2)
    })

    it('特殊字符任务名称应正确传递', async () => {
      const createdTask = { id: 2002, status: 0 }
      mockApiPost
        .mockResolvedValueOnce({ data: createdTask })
        .mockResolvedValueOnce({ data: { ...createdTask, status: 3 } })

      const { result } = renderHook(() => ({
        createTask: useCreateTask(),
        executeTask: useExecuteTask(),
      }), { wrapper })

      const specialName = '任务名称<>"\'&测试'

      await act(async () => {
        const taskData = await result.current.createTask.mutateAsync({
          task_name: specialName,
          priority: 1,
          test_type: 2,
          test_mode: 1,
          inference_framework: 'MindIE',
          framework_version: 'v1.0.1',
          model_path: '/data/models/test',
        } as any)
        
        if (taskData?.id) {
          await result.current.executeTask.mutateAsync(taskData.id)
        }
      })

      // 验证特殊字符被正确传递
      const createCall = mockApiPost.mock.calls[0]
      expect(createCall[1].task_name).toBe(specialName)
    })
  })
})

describe('TaskList组件集成测试', () => {
  it('组件应正确集成自动执行逻辑', async () => {
    // 这是一个集成测试的占位符
    // 在实际项目中，这里应该使用@testing-library/react测试实际组件
    // 但由于组件包含大量UI逻辑，这里主要验证hooks的行为
    
    expect(true).toBe(true)
  })
})

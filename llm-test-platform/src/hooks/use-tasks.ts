import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Task, PaginatedResponse } from '@/lib/types'

interface TaskParams {
  page?: number
  size?: number
  search?: string
  status?: string
  test_type?: string
  test_mode?: string
}

export function useTasks(params: TaskParams = {}) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Task>>('/api/tasks', {
        params: {
          page: params.page || 1,
          size: params.size || 20,
          search: params.search,
          status: params.status,
          test_type: params.test_type,
          test_mode: params.test_mode,
        },
      })
      return response.data
    },
    refetchInterval: 60000, // 每60秒自动刷新
    refetchIntervalInBackground: true,
  })
}

export function useTask(id: number) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const response = await api.get<Task>(`/api/tasks/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation<Task, Error, Omit<Task, 'id' | 'created_at' | 'updated_at' | 'status' | 'progress'>>({
    mutationFn: async (task) => {
      const response = await api.post<Task>('/api/tasks', task)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Task> & { id: number }) => {
      const response = await api.put<Task>(`/api/tasks/${id}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/tasks/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useExecuteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<Task>(`/api/tasks/${id}/execute`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useCancelTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<Task>(`/api/tasks/${id}/cancel`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

interface AutoImportResponse {
  success: boolean
  message: string
  data: {
    benchmark_id?: number
    unique_id?: string
    count?: number
    benchmarks?: Array<{
      model_name: string
      benchmark_id: number
      unique_id?: string
      count?: number
      skipped?: boolean
    }>
    errors?: Array<{
      file: string
      error: string
    }>
  }
}

export function useAutoImportTask() {
  const queryClient = useQueryClient()
  return useMutation<AutoImportResponse, Error, number>({
    mutationFn: async (id: number) => {
      const response = await api.post<AutoImportResponse>(`/api/tasks/${id}/auto-import`)
      return response.data
    },
    onSuccess: () => {
      // 导入成功后刷新基准测试列表
      queryClient.invalidateQueries({ queryKey: ['benchmarks'] })
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Benchmark, Report, PaginatedResponse } from '@/lib/types'

export interface AdvancedSearchFilters {
  submitter?: string
  modelName?: string
  serverName?: string
  shardingConfig?: string
  chipName?: string
  framework?: string
  frameworkVersion?: string
  operatorAcceleration?: string
  graphMode?: string
  notes?: string
  frameworkParams?: string
  startDate?: string
  endDate?: string
}

interface BenchmarkParams {
  page?: number
  size?: number
  search?: string
  framework?: string
  model_name?: string
  filters?: AdvancedSearchFilters
}

export function useBenchmarks(params: BenchmarkParams = {}) {
  return useQuery({
    queryKey: ['benchmarks', params],
    queryFn: async () => {
      // Create a clean copy of params to ensure unique cache keys
      const queryParams: Record<string, any> = {
        page: params.page || 1,
        size: params.size || 20,
        search: params.search,
        framework: params.framework,
        model_name: params.model_name,
      }

      if (params.filters) {
        Object.assign(queryParams, params.filters)
      }
      
      console.log('Fetching benchmarks with params:', queryParams)

      const response = await api.get<PaginatedResponse<Benchmark>>('/api/benchmarks', {
        params: queryParams,
      })
      return response.data
    },
  })
}

export function useBenchmark(id: number) {
  return useQuery({
    queryKey: ['benchmark', id],
    queryFn: async () => {
      const response = await api.get<Benchmark>(`/api/benchmarks/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateBenchmark() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (benchmark: { config: Benchmark['config']; metrics: Benchmark['metrics'] }) => {
       const response = await api.post<Benchmark>('/api/benchmarks', benchmark)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benchmarks'] })
    },
  })
}

export function useUpdateBenchmark() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { config: Benchmark['config']; metrics: Benchmark['metrics'] } }) => {
       const response = await api.put<Benchmark>(`/api/benchmarks/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benchmarks'] })
    },
  })
}

export function useDeleteBenchmark() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
       await api.delete(`/api/benchmarks/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benchmarks'] })
    },
  })
}

export function useImportBenchmark() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ config, file }: { config: Benchmark['config']; file: File }) => {
      const formData = new FormData()
      formData.append('config', JSON.stringify(config))
      formData.append('file', file)
       const response = await api.post<Benchmark>('/api/benchmarks/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benchmarks'] })
    },
  })
}

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const response = await api.get<Report[]>('/api/reports')
      return response.data
    },
  })
}

export function useDeleteReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/reports/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}

export function useSaveReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (report: Omit<Report, 'id' | 'created_at'>) => {
      const response = await api.post<Report>('/api/reports', report)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}

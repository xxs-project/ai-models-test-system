import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Device, PaginatedResponse } from '@/lib/types'

interface DeviceParams {
  page?: number
  size?: number
  search?: string
  status?: string
  arch?: string
  acc_type?: string
}

export function useDevices(params: DeviceParams = {}) {
  return useQuery({
    queryKey: ['devices', params],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Device>>('/api/devices', {
        params: {
          page: params.page || 1,
          size: params.size || 20,
          search: params.search,
          status: params.status,
          arch: params.arch,
          acc_type: params.acc_type,
        },
      })
      return response.data
    },
    refetchInterval: 60000, // 每60秒自动刷新
    refetchIntervalInBackground: true,
  })
}

export function useDevice(id: number) {
  return useQuery({
    queryKey: ['device', id],
    queryFn: async () => {
      const response = await api.get<Device>(`/api/devices/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateDevice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (device: Omit<Device, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await api.post<Device>('/api/devices', device)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
    },
  })
}

export function useUpdateDevice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Device> & { id: number }) => {
      const response = await api.put<Device>(`/api/devices/${id}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      queryClient.invalidateQueries({ queryKey: ['device', variables.id] })
    },
  })
}

export function useDeleteDevice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/devices/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
    },
  })
}

export function useRefreshDevice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<Device>(`/api/devices/${id}/refresh`)
      return response.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      queryClient.invalidateQueries({ queryKey: ['device', id] })
    },
  })
}

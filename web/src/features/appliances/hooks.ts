import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Appliance, ApplianceInput } from './types'

const KEY = ['appliances']

export function useAppliances() {
  return useQuery({ queryKey: KEY, queryFn: () => api.get<Appliance[]>('/appliances') })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: KEY })
}

export function useCreateAppliance() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: ApplianceInput) => api.post<Appliance>('/appliances', input),
    onSuccess: invalidate,
  })
}

export function useUpdateAppliance() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ApplianceInput }) =>
      api.put<Appliance>(`/appliances/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useDeleteAppliance() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.del(`/appliances/${id}`),
    onSuccess: invalidate,
  })
}

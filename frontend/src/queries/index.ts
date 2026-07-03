import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type {
  File,
  Folder,
  Bot,
  ApiKey,
  Webhook,
  AuditLog,
  Usage,
  CreateBotInput,
  CreateApiKeyInput,
  CreateWebhookInput,
  CreateFolderInput,
} from '@/types/schema'

// === Files ===
export function useFiles(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['files', filters],
    queryFn: async () => {
      const { data } = await api.get<{ data: File[] }>('/api/v1/files', { params: filters })
      return data.data
    },
    staleTime: 30_000,
  })
}

export function useFile(id: string) {
  return useQuery({
    queryKey: ['files', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: File }>(`/api/v1/files/${id}`)
      return data.data
    },
    staleTime: 300_000,
    enabled: !!id,
  })
}

export function useUploadFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.post('/api/v1/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
  })
}

export function useDeleteFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/files/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
  })
}

// === Folders ===
export function useFolders() {
  return useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Folder[] }>('/api/v1/folders')
      return data.data
    },
    staleTime: 120_000,
  })
}

export function useCreateFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateFolderInput) => {
      const { data } = await api.post('/api/v1/folders', input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}

// === Bots ===
export function useBots() {
  return useQuery({
    queryKey: ['bots'],
    queryFn: async () => {
      const { data } = await api.get<Bot[]>('/web/bots')
      return data
    },
    staleTime: 300_000,
  })
}

export function useCreateBot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateBotInput) => {
      const { data } = await api.post('/web/bots', input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
    },
  })
}

export function useDeleteBot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/web/bots/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
    },
  })
}

// === API Keys ===
export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data } = await api.get<ApiKey[]>('/web/apikeys')
      return data
    },
    staleTime: 60_000,
  })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateApiKeyInput) => {
      const { data } = await api.post('/web/apikeys', input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/web/apikeys/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })
}

// === Webhooks ===
export function useWebhooks() {
  return useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const { data } = await api.get<Webhook[]>('/api/v1/webhooks')
      return data
    },
    staleTime: 120_000,
  })
}

export function useCreateWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateWebhookInput) => {
      const { data } = await api.post('/api/v1/webhooks', input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/webhooks/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })
}

// === Usage ===
export function useUsage() {
  return useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const { data } = await api.get<Usage>('/api/v1/usage')
      return data
    },
    staleTime: 60_000,
  })
}

// === Audit Logs ===
export function useAuditLogs(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const { data } = await api.get<{ data: AuditLog[] }>('/web/audit', { params: filters })
      return data.data
    },
    staleTime: 30_000,
  })
}

// === Auth ===
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get('/web/me')
      return data
    },
    staleTime: 300_000,
    retry: false,
    enabled: !!localStorage.getItem('token'),
  })
}

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
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

// === Types for paginated response ===
interface PaginatedResponse {
  data: File[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  next_page_url: string | null
  prev_page_url: string | null
}

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

export function useFilesInfinite(filters?: Record<string, string>) {
  const perPage = filters?.per_page || '50'
  return useInfiniteQuery({
    queryKey: ['files-infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get<PaginatedResponse>('/api/v1/files', {
        params: { ...filters, page: pageParam, per_page: perPage },
      })
      return data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.current_page < lastPage.last_page) {
        return lastPage.current_page + 1
      }
      return undefined
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
      queryClient.invalidateQueries({ queryKey: ['files-infinite'] })
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
      queryClient.invalidateQueries({ queryKey: ['files-infinite'] })
      queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
  })
}

export function useDeleteFiles() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.delete(`/api/v1/files/${id}`)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['files-infinite'] })
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

// === Move Files ===
export function useMoveFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ fileId, folderId }: { fileId: string; folderId: string | null }) => {
      const { data } = await api.patch(`/api/v1/files/${fileId}/move`, { folder_id: folderId })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['files-infinite'] })
    },
  })
}

export function useBatchMoveFiles() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ ids, folderId }: { ids: string[]; folderId: string | null }) => {
      const { data } = await api.post('/api/v1/files/batch-move', { ids, folder_id: folderId })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['files-infinite'] })
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

export function useUpdateBot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; chat_id: string }) => {
      const res = await api.patch(`/web/bots/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
    },
  })
}

export function useRefreshBotChat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/web/bots/${id}/refresh-chat`)
      return res.data
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
      const { data } = await api.get<Usage>('/web/usage')
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

// === Share ===
export function useGenerateShareLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (fileId: string) => {
      const { data } = await api.post<{ share_token: string; share_url: string }>(`/api/v1/files/${fileId}/share`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })
}

export function useRevokeShareLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (fileId: string) => {
      await api.delete(`/api/v1/files/${fileId}/share`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })
}

export function useSharedFile(token: string) {
  return useQuery({
    queryKey: ['shared-file', token],
    queryFn: async () => {
      const { data } = await api.get<{ data: { name: string; size: number; mime_type: string; uploaded_at: string; share_token: string } }>(`/s/${token}`, {
        baseURL: '/',
      })
      return data.data
    },
    enabled: !!token,
    staleTime: 60_000,
  })
}

// === File Content ===
export function useFileContent(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['file-content', id],
    queryFn: async () => {
      const { data } = await api.get<{ content: string }>(`/api/v1/files/${id}/content`)
      return data.content
    },
    enabled: enabled && !!id,
    staleTime: 300_000,
    retry: 1,
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

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name?: string; email?: string; current_password?: string; password?: string; password_confirmation?: string }) => {
      const { data } = await api.patch('/web/profile', input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

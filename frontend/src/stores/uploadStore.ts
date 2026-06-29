import { create } from 'zustand'

interface UploadItem {
  id: string
  name: string
  size: number
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'failed'
  error?: string
}

interface UploadState {
  queue: UploadItem[]
  activeUploads: string[]
  addToQueue: (item: UploadItem) => void
  updateProgress: (id: string, progress: number) => void
  setStatus: (id: string, status: UploadItem['status'], error?: string) => void
  removeFromQueue: (id: string) => void
  clearCompleted: () => void
}

export const useUploadStore = create<UploadState>((set) => ({
  queue: [],
  activeUploads: [],
  addToQueue: (item) =>
    set((s) => ({ queue: [...s.queue, item], activeUploads: [...s.activeUploads, item.id] })),
  updateProgress: (id, progress) =>
    set((s) => ({
      queue: s.queue.map((item) => (item.id === id ? { ...item, progress } : item)),
    })),
  setStatus: (id, status, error) =>
    set((s) => ({
      queue: s.queue.map((item) =>
        item.id === id ? { ...item, status, error } : item,
      ),
      activeUploads:
        status === 'done' || status === 'failed'
          ? s.activeUploads.filter((uid) => uid !== id)
          : s.activeUploads,
    })),
  removeFromQueue: (id) =>
    set((s) => ({
      queue: s.queue.filter((item) => item.id !== id),
      activeUploads: s.activeUploads.filter((uid) => uid !== id),
    })),
  clearCompleted: () =>
    set((s) => ({
      queue: s.queue.filter((item) => item.status === 'pending' || item.status === 'uploading'),
    })),
}))

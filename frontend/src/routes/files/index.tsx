import React, { useRef, useState } from 'react'
import { createRoute, Link } from '@tanstack/react-router'
import { Route as rootRoute } from '@/routes/__root'
import { useFiles, useDeleteFile, useUploadFile, useMe } from '@/queries'
import { useFilterStore } from '@/stores/filterStore'
import { formatBytes, relativeTime } from '@/lib/utils'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { Upload, AlertCircle, Trash2, Users } from 'lucide-react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/files',
  component: FilesPage,
})

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB (Local Bot API limit)
const MAX_FILE_SIZE_MB = 2048

function FilesPage() {
  const { searchQuery, sortBy, setSearch, setSort } = useFilterStore()
  const { data: me } = useMe()
  const isAdmin = me?.role === 'admin'
  const [selectedUserId, setSelectedUserId] = useState('')
  const { data: files, isLoading, refetch } = useFiles({
    search: searchQuery,
    sort: sortBy,
    ...(isAdmin && selectedUserId ? { user_id: selectedUserId } : {}),
  })
  const deleteFile = useDeleteFile()
  const uploadFile = useUploadFile()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [sizeError, setSizeError] = useState<string | null>(null)
  const [allUsers, setAllUsers] = useState<{id: string; name: string; email: string}[]>([])

  // Load all users (admin only)
  React.useEffect(() => {
    if (isAdmin && allUsers.length === 0) {
      import('@/lib/axios').then(({ default: api }) => {
        api.get('/web/users').then(({ data }) => setAllUsers(data)).catch(() => {})
      })
    }
  }, [isAdmin])

  const handleUploadClick = () => {
    setSizeError(null)
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.size > MAX_FILE_SIZE) {
      setSizeError(`File "${file.name}" is too large (${formatBytes(file.size)}). Maximum size is ${MAX_FILE_SIZE_MB}MB.`)
      toast.error(`File too large! Max ${MAX_FILE_SIZE_MB}MB`)
      return
    }

    setSizeError(null)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      await uploadFile.mutateAsync(formData)
      toast.success(`"${file.name}" uploaded successfully!`)
      refetch()
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Upload failed'
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    await deleteFile.mutateAsync(id)
    toast.success('File deleted')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Files</h1>
          <p className="text-sm text-text-muted">
            {isAdmin ? 'All uploaded files' : 'Manage your Telegram storage'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted">Max {MAX_FILE_SIZE_MB}MB</span>
          <button
            onClick={handleUploadClick}
            disabled={uploading}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent-primary px-4 text-sm font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50 cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
        </div>
      </div>

      {/* Size Error Alert */}
      <AnimatePresence>
        {sizeError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4"
          >
            <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">File too large</p>
              <p className="text-xs text-text-secondary mt-1">{sizeError}</p>
            </div>
            <button onClick={() => setSizeError(null)} className="text-xs text-text-muted hover:text-text-primary">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border-default bg-surface pl-3 pr-8 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          />
        </div>
        {isAdmin && (
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="h-9 rounded-lg border border-border-default bg-surface pl-8 pr-3 text-sm text-text-secondary focus:border-accent-primary focus:outline-none min-w-[140px]"
            >
              <option value="">All Users</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
        )}
        <select
          value={sortBy}
          onChange={(e) => setSort(e.target.value)}
          className="h-9 rounded-lg border border-border-default bg-surface px-3 text-sm text-text-secondary focus:border-accent-primary focus:outline-none"
        >
          <option value="uploaded_at_desc">Newest</option>
          <option value="uploaded_at_asc">Oldest</option>
          <option value="name_asc">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
          <option value="size_desc">Largest</option>
          <option value="size_asc">Smallest</option>
        </select>
      </div>

      {/* File List */}
      <div className="overflow-hidden rounded-xl border border-border-default">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default bg-surface">
              <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">Name</th>
              {isAdmin && <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">User</th>}
              <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">Size</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">Type</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">Uploaded</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={isAdmin ? 6 : 5} className="px-4 py-12 text-center text-sm text-text-muted">Loading...</td></tr>
            ) : !files?.length ? (
              <tr><td colSpan={isAdmin ? 6 : 5} className="px-4 py-12 text-center text-sm text-text-muted">No files found. Upload your first file!</td></tr>
            ) : (
              files.map((file, i) => (
                <motion.tr
                  key={file.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border-default bg-canvas transition-colors hover:bg-surface/50"
                >
                  <td className="px-4 py-3">
                    <Link to="/files/$fileId" params={{ fileId: file.id }} className="text-sm font-medium text-text-primary hover:text-accent-primary">
                      {file.name}
                    </Link>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <span className="text-xs text-text-muted">{file.user_id?.slice(0, 8) || '?'}</span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-text-secondary">{formatBytes(file.size)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-medium text-accent-primary">
                      {file.mime_type?.split('/').pop()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{relativeTime(file.uploaded_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(file.id, file.name)}
                      className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-danger transition-colors"
                      title="Delete file"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

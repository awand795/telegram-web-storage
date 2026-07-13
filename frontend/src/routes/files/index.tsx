import React, { useRef, useState, useCallback } from 'react'
import { createRoute, Link } from '@tanstack/react-router'
import { Route as rootRoute } from '@/routes/__root'
import { useFilesInfinite, useDeleteFile, useDeleteFiles, useUploadFile, useMe, useFolders, useCreateFolder, useMoveFile, useBatchMoveFiles } from '@/queries'
import { useFilterStore } from '@/stores/filterStore'
import { useUploadStore } from '@/stores/uploadStore'
import { formatBytes, relativeTime } from '@/lib/utils'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  AlertCircle,
  Trash2,
  Users,
  Search,
  X,
  CheckCircle2,
  Loader2,
  FileIcon,
  UploadCloud,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Folder,
  CheckSquare,
  Square,
  Download,
} from 'lucide-react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/files',
  component: FilesPage,
})

const MAX_FILE_SIZE = 100 * 1024 * 1024 * 1024

function FilesPage() {
  const { searchQuery, sortBy, setSearch, setSort } = useFilterStore()
  const { data: me } = useMe()
  const isAdmin = me?.role === 'admin'
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)

  const commonFilters = {
    search: searchQuery,
    sort: sortBy,
    ...(isAdmin && selectedUserId ? { user_id: selectedUserId } : {}),
    ...(selectedFolderId ? { folder_id: selectedFolderId } : {}),
  }
  const {
    data: infiniteData,
    isLoading: isInfiniteLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchInfinite,
  } = useFilesInfinite(commonFilters)

  // Flatten paginated data
  const allFiles = infiniteData?.pages.flatMap((page) => page.data) ?? []
  const totalCount = infiniteData?.pages[0]?.total ?? 0

  // IntersectionObserver for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const deleteFile = useDeleteFile()
  const deleteFiles = useDeleteFiles()
  const uploadFile = useUploadFile()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [sizeError, setSizeError] = useState<string | null>(null)
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; email: string }[]>([])
  const { addToQueue, updateProgress, setStatus, queue } = useUploadStore()
  const [dragOver, setDragOver] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const moveFile = useMoveFile()
  const batchMoveFiles = useBatchMoveFiles()
  const [showMovePicker, setShowMovePicker] = useState(false)

  // Folders
  const { data: folders } = useFolders()
  const createFolder = useCreateFolder()
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [folderExpanded, setFolderExpanded] = useState(true)

  // Load all users (admin only)
  React.useEffect(() => {
    if (isAdmin && allUsers.length === 0) {
      import('@/lib/axios').then(({ default: api }) => {
        api.get('/web/users').then(({ data }) => setAllUsers(data)).catch(() => {})
      })
    }
  }, [isAdmin])

  // Dropzone
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          setSizeError(`"${file.name}" is too large (${formatBytes(file.size)}). Maximum size is 100GB.`)
          toast.error(`"${file.name}" too large!`)
          continue
        }

        const uploadId = crypto.randomUUID()
        addToQueue({ id: uploadId, name: file.name, size: file.size, progress: 0, status: 'pending' })

        setUploading(true)
        try {
          const formData = new FormData()
          formData.append('file', file)
          if (selectedFolderId) {
            formData.append('folder_id', selectedFolderId)
          }
          updateProgress(uploadId, 10)

          await uploadFile.mutateAsync(formData, {
            onSuccess: () => {
              setStatus(uploadId, 'done')
              toast.success(`"${file.name}" uploaded!`)
              refetchInfinite()
            },
            onError: (err: any) => {
              const msg = err?.response?.data?.message || 'Upload failed'
              setStatus(uploadId, 'failed', msg)
              toast.error(msg)
            },
          })
        } catch {
          setStatus(uploadId, 'failed', 'Upload failed')
        } finally {
          setUploading(false)
        }
      }
    },
    [uploadFile, refetchInfinite, addToQueue, updateProgress, setStatus, selectedFolderId],
  )

  const { getRootProps, getInputProps, isDragActive, rootRef } = useDropzone({
    onDrop,
    disabled: uploading,
    maxSize: MAX_FILE_SIZE,
    onDragEnter: () => setDragOver(true),
    onDragLeave: () => setDragOver(false),
  })

  const handleUploadClick = () => {
    setSizeError(null)
    fileInputRef.current?.click()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.size > MAX_FILE_SIZE) {
      setSizeError(`File "${file.name}" is too large (${formatBytes(file.size)}). Maximum size is 100GB.`)
      toast.error('File too large!')
      return
    }
    onDrop([file])
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    await deleteFile.mutateAsync(id)
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next })
    toast.success('File deleted')
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    if (!window.confirm(`Delete ${selectedIds.size} file(s)? This cannot be undone.`)) return
    await deleteFiles.mutateAsync(Array.from(selectedIds))
    setSelectedIds(new Set())
    toast.success(`${selectedIds.size} file(s) deleted`)
  }

  const handleBatchMove = async (folderId: string | null) => {
    if (selectedIds.size === 0) return
    await batchMoveFiles.mutateAsync({ ids: Array.from(selectedIds), folderId })
    setSelectedIds(new Set())
    setShowMovePicker(false)
    const label = folderId ? `moved to folder` : `moved to root`
    toast.success(`${selectedIds.size} file(s) ${label}`)
  }

  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    setDraggedFileId(fileId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', fileId)
  }

  const handleDragEnd = () => {
    setDraggedFileId(null)
    setDragOverFolderId(null)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, folderId: string | null) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverFolderId(folderId)
  }

  const handleDropOnFolder = async (e: React.DragEvent<HTMLDivElement>, folderId: string | null) => {
    e.preventDefault()
    const fileId = e.dataTransfer.getData('text/plain') || draggedFileId
    if (!fileId) return
    await moveFile.mutateAsync({ fileId, folderId })
    setDraggedFileId(null)
    setDragOverFolderId(null)
    toast.success('File moved')
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allFiles.length === 0) return
    if (selectedIds.size === allFiles.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allFiles.map((f) => f.id)))
    }
  }

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return
    await createFolder.mutateAsync({
      name: newFolderName.trim(),
      parent_id: selectedFolderId,
    })
    setNewFolderName('')
    setShowNewFolder(false)
    toast.success('Folder created')
  }

  // Upload queue items for display
  const uploadQueueItems = queue.filter(
    (item) => item.status === 'pending' || item.status === 'uploading' || item.status === 'failed',
  )

  const isAllSelected = allFiles.length > 0 && selectedIds.size === allFiles.length

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Files</h1>
          <p className="text-sm text-text-muted">
            {isAdmin ? 'All uploaded files' : 'Manage your Telegram storage'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[10px] text-text-muted md:inline">Max 100GB per file</span>
          <button
            onClick={handleUploadClick}
            disabled={uploading}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-accent-primary px-4 text-sm font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50 transition-all active:scale-[0.97]"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        {...getRootProps()}
        ref={rootRef as React.Ref<HTMLDivElement>}
        className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-all ${
          isDragActive
            ? 'border-accent-primary bg-accent-primary/5 shadow-lg shadow-accent-primary/10'
            : dragOver
              ? 'border-accent-primary/50 bg-accent-primary/5'
              : 'border-border-default hover:border-accent-primary/30 hover:bg-surface/30'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center py-8 md:py-10">
          <div
            className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${
              isDragActive ? 'bg-accent-primary/20 scale-110' : 'bg-surface-elevated'
            }`}
          >
            <UploadCloud className={`h-5 w-5 transition-all ${isDragActive ? 'text-accent-primary' : 'text-text-muted'}`} />
          </div>
          {isDragActive ? (
            <p className="text-sm font-medium text-accent-primary">Drop files here to upload</p>
          ) : (
            <>
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-accent-primary hover:text-accent-primary/80 cursor-pointer">Click to upload</span>{' '}
                or drag and drop
              </p>
              <p className="mt-1 text-xs text-text-muted">Any file type — up to 100GB per file (chunked upload)</p>
            </>
          )}
        </div>
      </div>

      {/* Upload Queue */}
      <AnimatePresence>
        {uploadQueueItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="overflow-hidden rounded-xl border border-border-default bg-surface"
          >
            <div className="flex items-center justify-between border-b border-border-default px-4 py-2">
              <span className="text-xs font-medium text-text-secondary">Upload Queue ({uploadQueueItems.length})</span>
              <button onClick={() => useUploadStore.getState().clearCompleted()} className="text-[10px] text-text-muted hover:text-text-secondary">
                Clear completed
              </button>
            </div>
            <div className="divide-y divide-border-default">
              {uploadQueueItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                  <FileIcon className="h-4 w-4 shrink-0 text-text-muted" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{item.name}</p>
                    <p className="text-[10px] text-text-muted">{formatBytes(item.size)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'uploading' && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-primary" />}
                    {item.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                    {item.status === 'failed' && <AlertCircle className="h-3.5 w-3.5 text-danger" />}
                    {item.status === 'pending' && <div className="h-3.5 w-3.5 rounded-full border-2 border-text-muted border-t-transparent animate-spin" />}
                    {(item.status === 'done' || item.status === 'failed') && (
                      <button onClick={() => useUploadStore.getState().removeFromQueue(item.id)} className="text-text-muted hover:text-text-primary">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {uploadQueueItems.length > 5 && (
                <div className="px-4 py-2 text-center text-[10px] text-text-muted">+{uploadQueueItems.length - 5} more</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Size Error Alert */}
      <AnimatePresence>
        {sizeError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">File too large</p>
              <p className="mt-1 text-xs text-text-secondary">{sizeError}</p>
            </div>
            <button onClick={() => setSizeError(null)} className="text-xs text-text-muted hover:text-text-primary">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Folder Tree + Filters */}
      <div className="flex flex-col gap-3">
        {/* Folder Tree */}
        {folders && folders.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border-default bg-surface">
            <button
              onClick={() => setFolderExpanded(!folderExpanded)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-medium text-text-secondary hover:bg-surface-elevated transition-colors"
            >
              <div className="flex items-center gap-2">
                <Folder className="h-3.5 w-3.5 text-accent-primary" />
                <span>Folders</span>
              </div>
              {folderExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {folderExpanded && (
              <div className="border-t border-border-default px-2 py-1.5 space-y-0.5">
                {/* Root (All Files) drop target */}
                <div
                  onDragOver={(e) => handleDragOver(e as React.DragEvent<HTMLDivElement>, null)}
                  onDragLeave={() => setDragOverFolderId(null)}
                  onDrop={(e) => handleDropOnFolder(e as React.DragEvent<HTMLDivElement>, null)}
                  className={`rounded-lg transition-colors ${
                    dragOverFolderId === null && draggedFileId ? 'bg-accent-primary/10 ring-1 ring-accent-primary/30' : ''
                  }`}
                >
                  <button
                    onClick={() => setSelectedFolderId(null)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                      !selectedFolderId
                        ? 'bg-accent-primary/10 text-accent-primary font-medium'
                        : 'text-text-muted hover:bg-surface-elevated hover:text-text-secondary'
                    }`}
                  >
                    <Folder className="h-3 w-3" />
                    All Files
                    {dragOverFolderId === null && draggedFileId && (
                      <span className="ml-auto text-[9px] text-accent-primary/60">Drop to move here</span>
                    )}
                  </button>
                </div>
                {folders.map((folder) => (
                  <FolderTreeItem
                    key={folder.id}
                    folder={folder}
                    selectedFolderId={selectedFolderId}
                    onSelect={setSelectedFolderId}
                    onDropOnFolder={handleDropOnFolder}
                    onDragOver={handleDragOver}
                    dragOverFolderId={dragOverFolderId}
                    setDragOverFolderId={setDragOverFolderId}
                    draggedFileId={draggedFileId}
                    depth={0}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search & Filter Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-border-default bg-surface pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
            />
          </div>
          {isAdmin && (
            <div className="relative">
              <Users className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="h-9 w-full min-w-[140px] rounded-lg border border-border-default bg-surface pl-8 pr-3 text-sm text-text-secondary focus:border-accent-primary focus:outline-none"
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
          {/* New Folder button */}
          <button
            onClick={() => setShowNewFolder(!showNewFolder)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-default px-3 text-xs text-text-secondary hover:bg-surface-elevated transition-colors"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Folder</span>
          </button>
        </div>

        {/* New Folder Form */}
        <AnimatePresence>
          {showNewFolder && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreateFolder}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 rounded-xl border border-border-default bg-surface p-3">
                <Folder className="h-4 w-4 text-accent-primary shrink-0" />
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="flex-1 h-8 rounded-lg border border-border-default bg-canvas px-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="h-8 rounded-lg bg-accent-primary px-3 text-xs font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewFolder(false)}
                  className="h-8 rounded-lg border border-border-default px-3 text-xs text-text-secondary hover:bg-surface-elevated"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Batch Actions Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 rounded-xl border border-accent-primary/30 bg-accent-primary/5 px-4 py-2.5 flex-wrap"
          >
            <span className="text-xs font-medium text-accent-primary whitespace-nowrap">{selectedIds.size} selected</span>
            <div className="flex-1 min-w-[8px]" />
            <button
              onClick={() => setShowMovePicker(!showMovePicker)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-elevated transition-colors"
            >
              <Folder className="h-3.5 w-3.5" />
              Move to Folder
            </button>
            <button
              onClick={handleBatchDelete}
              className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs text-text-muted hover:bg-surface-elevated transition-colors"
            >
              Clear Selection
            </button>

            {/* Inline folder picker */}
            <AnimatePresence>
              {showMovePicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full overflow-hidden"
                >
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-accent-primary/10 pt-2">
                    <span className="text-[10px] text-text-muted mr-1">Move to:</span>
                    <button
                      onClick={() => handleBatchMove(null)}
                      className="rounded-lg border border-border-default px-2.5 py-1 text-[10px] text-text-secondary hover:bg-surface-elevated transition-colors"
                    >
                      Root (no folder)
                    </button>
                    {folders?.map((f) => (
                      <FolderPickerItem
                        key={f.id}
                        folder={f}
                        onSelect={(id) => handleBatchMove(id)}
                        depth={0}
                      />
                    ))}
                    <button
                      onClick={() => setShowMovePicker(false)}
                      className="ml-auto rounded-lg px-2 py-1 text-[10px] text-text-muted hover:text-text-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File List */}
      <div className="overflow-hidden rounded-xl border border-border-default">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px]">
            <thead>
              <tr className="border-b border-border-default bg-surface">
                <th className="w-10 px-2 py-2.5 text-left">
                  <button onClick={toggleSelectAll} className="flex items-center justify-center mx-auto">
                    {isAllSelected ? (
                      <CheckSquare className="h-4 w-4 text-accent-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-text-muted hover:text-text-secondary" />
                    )}
                  </button>
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">Name</th>
                {isAdmin && <th className="px-2 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">User</th>}
                <th className="hidden px-2 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted sm:table-cell">Size</th>
                <th className="hidden px-2 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted md:table-cell">Type</th>
                <th className="hidden px-2 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted lg:table-cell">Uploaded</th>
                <th className="px-2 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isInfiniteLoading && allFiles.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-4 py-16 text-center text-sm text-text-muted">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-accent-primary" />
                    <p className="mt-2">Loading files...</p>
                  </td>
                </tr>
              ) : !isInfiniteLoading && allFiles.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-4 py-16 text-center text-sm text-text-muted">
                    <UploadCloud className="mx-auto mb-2 h-8 w-8 text-text-muted/50" />
                    <p>No files found. Upload your first file!</p>
                  </td>
                </tr>
              ) : (
                allFiles.map((file, i) => (
                  <motion.tr
                    key={file.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`border-b border-border-default transition-colors ${
                      selectedIds.has(file.id) ? 'bg-accent-primary/5' : 'bg-canvas'
                    } ${
                      draggedFileId === file.id ? 'opacity-40' : 'hover:bg-surface/50'
                    }`}
                  >
                    <td
                      className="px-2 py-3"
                      draggable
                      onDragStart={(e) => handleDragStart(e, file.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <button onClick={() => toggleSelect(file.id)} className="flex items-center justify-center mx-auto cursor-grab active:cursor-grabbing">
                        {selectedIds.has(file.id) ? (
                          <CheckSquare className="h-4 w-4 text-accent-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-text-muted hover:text-text-secondary" />
                        )}
                      </button>
                    </td>
                    <td className="px-2 py-3">
                      <Link
                        to="/files/$fileId"
                        params={{ fileId: file.id }}
                        className="flex items-center gap-2 text-sm font-medium text-text-primary hover:text-accent-primary transition-colors"
                      >
                        <span className="text-base shrink-0">
                          {file.mime_type?.startsWith('image/') ? '🖼' :
                           file.mime_type?.startsWith('video/') ? '🎬' :
                           file.mime_type?.startsWith('audio/') ? '🎵' :
                           file.mime_type === 'application/pdf' ? '📄' : '📁'}
                        </span>
                        <span className="truncate max-w-[150px] md:max-w-[250px]">{file.name}</span>
                      </Link>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-text-muted sm:hidden">
                        <span>{formatBytes(file.size)}</span>
                        <span>·</span>
                        <span>{relativeTime(file.uploaded_at)}</span>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-2 py-3">
                        <span className="text-xs text-text-muted">{file.user_id?.slice(0, 8) || '?'}</span>
                      </td>
                    )}
                    <td className="hidden px-2 py-3 text-sm text-text-secondary sm:table-cell">{formatBytes(file.size)}</td>
                    <td className="hidden px-2 py-3 md:table-cell">
                      <span className="inline-flex rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-medium text-accent-primary">
                        {file.mime_type?.split('/').pop()}
                      </span>
                    </td>
                    <td className="hidden px-2 py-3 text-sm text-text-secondary lg:table-cell">{relativeTime(file.uploaded_at)}</td>
                    <td className="px-2 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/api/v1/files/${file.id}/download`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-elevated hover:text-accent-primary transition-colors"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() => handleDelete(file.id, file.name)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-elevated hover:text-danger transition-colors"
                          title="Delete file"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="flex items-center justify-center py-4">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-accent-primary" />
                <span className="text-xs text-text-muted">Loading more...</span>
              </div>
            ) : hasNextPage ? (
              <button
                onClick={() => fetchNextPage()}
                className="text-xs font-medium text-accent-primary hover:text-accent-primary/80 transition-colors"
              >
                Load {Math.min(50, (totalCount || 0) - allFiles.length)} more files
              </button>
            ) : allFiles.length > 0 ? (
              <span className="text-[10px] text-text-muted">
                Showing all {totalCount} file{totalCount !== 1 ? 's' : ''}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Folder Tree Item ─── */
function FolderTreeItem({
  folder,
  selectedFolderId,
  onSelect,
  onDropOnFolder,
  onDragOver: parentDragOver,
  dragOverFolderId,
  setDragOverFolderId,
  draggedFileId,
  depth,
}: {
  folder: { id: string; name: string; children?: { id: string; name: string; children?: any[] }[] }
  selectedFolderId: string | null
  onSelect: (id: string | null) => void
  onDropOnFolder: (e: React.DragEvent<HTMLDivElement>, folderId: string | null) => Promise<void>
  onDragOver: (e: React.DragEvent<HTMLDivElement>, folderId: string | null) => void
  dragOverFolderId: string | null
  setDragOverFolderId: (id: string | null) => void
  draggedFileId: string | null
  depth: number
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = folder.children && folder.children.length > 0
  const isOver = dragOverFolderId === folder.id

  return (
    <div>
      <div
        onDragOver={(e) => parentDragOver(e as React.DragEvent<HTMLDivElement>, folder.id)}
        onDragLeave={() => setDragOverFolderId(null)}
        onDrop={(e) => onDropOnFolder(e as React.DragEvent<HTMLDivElement>, folder.id)}
        className={`rounded-lg transition-colors ${
          isOver && draggedFileId ? 'bg-accent-primary/10 ring-1 ring-accent-primary/30' : ''
        }`}
      >
        <button
          onClick={() => onSelect(folder.id)}
          className={`flex w-full items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-colors ${
            selectedFolderId === folder.id
              ? 'bg-accent-primary/10 text-accent-primary font-medium'
              : 'text-text-muted hover:bg-surface-elevated hover:text-text-secondary'
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
              className="flex items-center justify-center"
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          ) : (
            <span className="w-3" />
          )}
          <Folder className="h-3 w-3 shrink-0" />
          <span className="truncate">{folder.name}</span>
          {isOver && draggedFileId && (
            <span className="ml-auto text-[9px] text-accent-primary/60">Drop here</span>
          )}
        </button>
      </div>
      {expanded && hasChildren && (
        <div>
          {folder.children!.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onDropOnFolder={onDropOnFolder}
              onDragOver={parentDragOver}
              dragOverFolderId={dragOverFolderId}
              setDragOverFolderId={setDragOverFolderId}
              draggedFileId={draggedFileId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Folder Picker Item (for batch move) ─── */
function FolderPickerItem({
  folder,
  onSelect,
  depth,
}: {
  folder: { id: string; name: string; children?: { id: string; name: string; children?: any[] }[] }
  onSelect: (id: string | null) => void
  depth: number
}) {
  const hasChildren = folder.children && folder.children.length > 0

  return (
    <>
      <button
        onClick={() => onSelect(folder.id)}
        className="inline-flex items-center gap-1 rounded-lg border border-border-default px-2.5 py-1 text-[10px] text-text-secondary hover:bg-surface-elevated transition-colors"
      >
        <Folder className="h-3 w-3" />
        <span className="max-w-[80px] truncate">{folder.name}</span>
      </button>
      {hasChildren &&
        folder.children!.map((child) => (
          <FolderPickerItem
            key={child.id}
            folder={child}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))}
    </>
  )
}

import { createRoute, Link } from '@tanstack/react-router'
import { Route as rootRoute } from '@/routes/__root'
import { useFiles, useDeleteFile } from '@/queries'
import { useUploadStore } from '@/stores/uploadStore'
import { useFilterStore } from '@/stores/filterStore'
import { formatBytes, relativeTime } from '@/lib/utils'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/files',
  component: FilesPage,
})

function FilesPage() {
  const { searchQuery, sortBy, setSearch, setSort } = useFilterStore()
  const { data: files, isLoading } = useFiles({ search: searchQuery, sort: sortBy })
  const deleteFile = useDeleteFile()
  const queue = useUploadStore((s) => s.queue)

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
          <p className="text-sm text-text-muted">Manage your Telegram storage</p>
        </div>
        <Link
          to="/files"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent-primary px-4 text-sm font-medium text-white hover:bg-accent-primary/90"
        >
          + Upload
        </Link>
      </div>

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

      {/* Upload Queue */}
      <AnimatePresence>
        {queue.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden rounded-xl border border-border-default bg-surface"
          >
            <div className="border-b border-border-default px-4 py-2">
              <span className="text-xs font-medium text-text-secondary">Upload Queue</span>
            </div>
            <div className="space-y-1 p-2">
              {queue.map((item) => (
                <div key={item.id} className="rounded-lg bg-surface-elevated px-3 py-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-primary">{item.name}</span>
                    <span className="text-text-muted">
                      {item.status === 'uploading'
                        ? `${item.progress}%`
                        : item.status}
                    </span>
                  </div>
                  {item.status === 'uploading' && (
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-800">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary"
                        initial={{ width: 0 }}
                        animate={{ width: `${item.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File List */}
      <div className="overflow-hidden rounded-xl border border-border-default">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default bg-surface">
              <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Name
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Size
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Type
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Uploaded
              </th>
              <th className="px-4 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-text-muted">
                  Loading...
                </td>
              </tr>
            ) : !files?.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-text-muted">
                  No files found. Upload your first file!
                </td>
              </tr>
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
                    <Link
                      to="/files/$fileId"
                      params={{ fileId: file.id }}
                      className="text-sm font-medium text-text-primary hover:text-accent-primary"
                    >
                      {file.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {formatBytes(file.size)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-medium text-accent-primary">
                      {file.mime_type.split('/').pop()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {relativeTime(file.uploaded_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(file.id, file.name)}
                      className="text-xs text-text-muted hover:text-danger transition-colors"
                    >
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

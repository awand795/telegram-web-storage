import { createRoute, Link } from '@tanstack/react-router'
import { Route as rootRoute } from '@/routes/__root'
import { useUsage, useFiles } from '@/queries'
import { formatBytes, relativeTime } from '@/lib/utils'
import { motion } from 'motion/react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardPage,
})

const statCards = [
  { label: 'Total Files', key: 'total_files' as const, format: (v: number) => v.toLocaleString() },
  { label: 'Total Storage', key: 'total_size' as const, format: (v: number) => formatBytes(v) },
  { label: 'Active Bots', key: 'active_bots' as const, format: (v: number) => v.toString() },
  { label: 'Files Today', key: 'files_today' as const, format: (v: number) => v.toString() },
]

function DashboardPage() {
  const { data: usage, isLoading } = useUsage()
  const { data: recentFiles } = useFiles({ sort: 'uploaded_at_desc', per_page: '5' })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted">Overview of your TeleStore activity</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const value = usage ? usage[card.key] : 0
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.2 }}
              className="relative overflow-hidden rounded-xl border border-border-default bg-surface p-4"
            >
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-accent-primary to-accent-secondary" />
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                {card.label}
              </p>
              <motion.p
                className="mt-1 text-2xl font-semibold text-text-primary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, type: 'spring' }}
              >
                {isLoading ? '...' : card.format(value)}
              </motion.p>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-xl border border-border-default bg-surface p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-text-secondary">Recent Uploads</h2>
            <Link to="/files" className="text-[10px] text-accent-primary hover:underline">
              View all
            </Link>
          </div>
          {!recentFiles?.length ? (
            <p className="text-xs text-text-muted text-center py-12">
              No files uploaded yet. Start uploading!
            </p>
          ) : (
            <div className="space-y-1">
              {recentFiles.slice(0, 5).map((file, i) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-surface-elevated"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0">
                      {file.mime_type?.startsWith('image/') ? '🖼' :
                       file.mime_type?.startsWith('video/') ? '🎬' :
                       file.mime_type === 'application/pdf' ? '📄' : '📁'}
                    </span>
                    <div className="min-w-0">
                      <Link
                        to="/files/$fileId"
                        params={{ fileId: file.id }}
                        className="text-sm font-medium text-text-primary hover:text-accent-primary truncate block"
                      >
                        {file.name}
                      </Link>
                      <p className="text-[10px] text-text-muted">
                        {formatBytes(file.size)} &middot; {relativeTime(file.uploaded_at)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium uppercase ${
                    file.status === 'done' ? 'text-success' :
                    file.status === 'failed' ? 'text-danger' : 'text-warning'
                  }`}>
                    {file.status}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border-default bg-surface p-4">
          <h2 className="mb-4 text-sm font-medium text-text-secondary">Storage by Type</h2>
          <div className="space-y-3">
            {(usage?.storage_by_type ?? []).map((item) => {
              const items = usage?.storage_by_type ?? []
              const total = items.reduce((s, i) => s + i.size, 0) || 1
              const pct = (item.size / total) * 100
              return (
                <div key={item.mime_type}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">{item.mime_type}</span>
                    <span className="text-text-muted">{formatBytes(item.size)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: '#a78bfa' }}
                    />
                  </div>
                </div>
              )
            })}
            {!(usage?.storage_by_type ?? []).length && (
              <p className="text-xs text-text-muted text-center py-8">No data yet. Start uploading files!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

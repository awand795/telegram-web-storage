import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '@/routes/__root'
import { useAuditLogs } from '@/queries'
import { relativeTime } from '@/lib/utils'
import { motion } from 'motion/react'
import { Search } from 'lucide-react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/audit',
  component: AuditPage,
})

const ACTION_COLORS: Record<string, string> = {
  upload: 'text-success',
  delete: 'text-danger',
  create: 'text-info',
  revoke: 'text-warning',
  login: 'text-accent-primary',
}

function AuditPage() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const { data: logs, isLoading } = useAuditLogs({ search, action: actionFilter })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Audit Log</h1>
        <p className="text-sm text-text-muted">Track all actions across your storage</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border-default bg-surface pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-9 rounded-lg border border-border-default bg-surface px-3 text-sm text-text-secondary focus:border-accent-primary focus:outline-none"
        >
          <option value="">All Actions</option>
          <option value="upload">Upload</option>
          <option value="delete">Delete</option>
          <option value="create">Create</option>
          <option value="revoke">Revoke</option>
          <option value="login">Login</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border-default">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default bg-surface">
              <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Action
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Target
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">
                IP
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-text-muted">
                  Loading...
                </td>
              </tr>
            ) : !logs?.length ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-text-muted">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map((log, i) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-border-default bg-canvas transition-colors hover:bg-surface/50"
                >
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium capitalize ${ACTION_COLORS[log.action] || 'text-text-secondary'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-text-secondary">
                      {log.target_type}
                      {log.target_id && ` / ${log.target_id.slice(0, 12)}...`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-[11px] text-text-muted">{log.ip}</code>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {relativeTime(log.created_at)}
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

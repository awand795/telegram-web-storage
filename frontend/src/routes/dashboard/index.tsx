import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '@/routes/__root'
import { useUsage } from '@/queries'
import { formatBytes } from '@/lib/utils'
import { motion } from 'motion/react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardPage,
})

const chartData = [
  { name: 'Mon', files: 0 },
  { name: 'Tue', files: 0 },
  { name: 'Wed', files: 0 },
  { name: 'Thu', files: 0 },
  { name: 'Fri', files: 0 },
  { name: 'Sat', files: 0 },
  { name: 'Sun', files: 0 },
]

const statCards = [
  { label: 'Total Files', key: 'total_files' as const, format: (v: number) => v.toLocaleString() },
  { label: 'Total Storage', key: 'total_size' as const, format: (v: number) => formatBytes(v) },
  { label: 'Active Bots', key: 'active_bots' as const, format: (v: number) => v.toString() },
  { label: 'Files Today', key: 'files_today' as const, format: (v: number) => v.toString() },
]

function DashboardPage() {
  const { data: usage, isLoading } = useUsage()

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
          <h2 className="mb-4 text-sm font-medium text-text-secondary">Weekly Uploads</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorFiles" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    color: '#f4f4f5',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="files"
                  stroke="#a78bfa"
                  fillOpacity={1}
                  fill="url(#colorFiles)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-surface p-4">
          <h2 className="mb-4 text-sm font-medium text-text-secondary">Storage by Type</h2>
          <div className="space-y-3">
            {(usage?.storage_by_type ?? []).map((item) => {
              const total = usage.storage_by_type.reduce((s, i) => s + i.size, 0) || 1
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

import { createRoute, Link } from '@tanstack/react-router'
import { Route as rootRoute } from '@/routes/__root'
import { useUsage, useFiles } from '@/queries'
import { formatBytes, relativeTime } from '@/lib/utils'
import { motion } from 'motion/react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useState } from 'react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardPage,
})

const PIE_COLORS = ['#a78bfa', '#e879f9', '#22d3ee', '#4ade80', '#fcd34d', '#f87171', '#fb923c', '#818cf8']

const statCards = [
  { label: 'Total Files', key: 'total_files' as const, format: (v: number) => v.toLocaleString() },
  { label: 'Total Storage', key: 'total_size' as const, format: (v: number) => formatBytes(v) },
  { label: 'Active Bots', key: 'active_bots' as const, format: (v: number) => v.toString() },
  { label: 'Files Today', key: 'files_today' as const, format: (v: number) => v.toString() },
]

function DashboardPage() {
  const { data: usage, isLoading } = useUsage()
  const { data: recentFiles } = useFiles({ sort: 'uploaded_at_desc', per_page: '5' })
  const [chartView, setChartView] = useState<'pie' | 'bar'>('pie')

  // Prepare pie chart data
  const pieData = (usage?.storage_by_type ?? []).map((item) => ({
    name: item.mime_type.split('/').pop() || item.mime_type,
    value: item.size,
    count: item.count,
    fullType: item.mime_type,
  }))

  const totalStorage = usage?.total_size || 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted">Overview of your TeleStore activity</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
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
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                {card.label}
              </p>
              <motion.p
                className="mt-1 text-xl font-semibold text-text-primary md:text-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, type: 'spring' }}
              >
                {isLoading ? (
                  <span className="inline-block h-6 w-16 animate-pulse rounded bg-surface-elevated" />
                ) : (
                  card.format(value)
                )}
              </motion.p>
            </motion.div>
          )
        })}
      </div>

      {/* Charts + Recent Uploads */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Charts Section */}
        <div className="rounded-xl border border-border-default bg-surface p-4 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-text-secondary">Storage by Type</h2>
            <div className="flex gap-1">
              <button
                onClick={() => setChartView('pie')}
                className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                  chartView === 'pie'
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                Pie
              </button>
              <button
                onClick={() => setChartView('bar')}
                className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                  chartView === 'bar'
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                Bar
              </button>
            </div>
          </div>

          {pieData.length === 0 ? (
            <div className="flex h-[250px] items-center justify-center">
              <p className="text-xs text-text-muted">No data yet. Start uploading files!</p>
            </div>
          ) : (
            <>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border-default)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => [formatBytes(value), 'Size']}
                      />
                    </PieChart>
                  ) : (
                    <BarChart data={pieData} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                        width={60}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border-default)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => [formatBytes(value), 'Size']}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {pieData.map((_, index) => (
                          <Cell
                            key={`bar-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="mt-2 space-y-1.5 border-t border-border-default pt-3">
                {pieData.map((item, i) => (
                  <div key={item.fullType} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-text-secondary truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-muted">
                      <span>{item.count} files</span>
                      <span>·</span>
                      <span>{formatBytes(item.value)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-3 flex items-center justify-between border-t border-border-default pt-3 text-xs">
                <span className="font-medium text-text-primary">Total</span>
                <span className="text-text-muted">{formatBytes(totalStorage)}</span>
              </div>
            </>
          )}
        </div>

        {/* Recent Uploads */}
        <div className="rounded-xl border border-border-default bg-surface p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-text-secondary">Recent Uploads</h2>
            <Link to="/files" className="text-[10px] font-medium text-accent-primary hover:text-accent-primary/80 transition-colors">
              View all &rarr;
            </Link>
          </div>
          {!recentFiles?.length ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated">
                <svg className="h-6 w-6 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </div>
              <p className="text-xs text-text-muted">No files uploaded yet. Start uploading!</p>
              <Link to="/files" className="mt-2 text-xs text-accent-primary hover:underline">
                Go to Files
              </Link>
            </div>
          ) : (
            <div className="space-y-0.5">
              {recentFiles.slice(0, 5).map((file, i) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-elevated"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0">
                      {file.mime_type?.startsWith('image/') ? '🖼' :
                       file.mime_type?.startsWith('video/') ? '🎬' :
                       file.mime_type?.startsWith('audio/') ? '🎵' :
                       file.mime_type === 'application/pdf' ? '📄' : '📁'}
                    </span>
                    <div className="min-w-0">
                      <Link
                        to="/files/$fileId"
                        params={{ fileId: file.id }}
                        className="text-sm font-medium text-text-primary hover:text-accent-primary truncate block max-w-[250px] md:max-w-[400px]"
                      >
                        {file.name}
                      </Link>
                      <p className="text-[10px] text-text-muted">
                        {formatBytes(file.size)} &middot; {relativeTime(file.uploaded_at)}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 text-[10px] font-medium uppercase ${
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
      </div>
    </div>
  )
}

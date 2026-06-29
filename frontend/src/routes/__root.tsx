import React from 'react'
import { Outlet, createRootRouteWithContext, Link, useLocation } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import type { QueryClient } from '@tanstack/react-query'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="flex h-screen bg-canvas text-text-primary">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#18181b',
            border: '1px solid #27272a',
            color: '#f4f4f5',
          },
        }}
      />
    </div>
  )
}

function Sidebar() {
  const [expanded, setExpanded] = React.useState(false)
  const location = useLocation()

  const navItems = [
    { path: '/dashboard', icon: '⊞', label: 'Dashboard' },
    { path: '/files', icon: '≡', label: 'Files' },
    { path: '/settings/bots', icon: '⚙', label: 'Bots' },
    { path: '/settings/api-keys', icon: '🔑', label: 'API Keys' },
    { path: '/settings/webhooks', icon: '↗', label: 'Webhooks' },
    { path: '/audit', icon: '📋', label: 'Audit Log' },
  ]

  return (
    <aside
      className={`border-r border-border-default bg-surface transition-all duration-200 ${
        expanded ? 'w-[220px]' : 'w-[56px]'
      }`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="flex h-12 items-center justify-center border-b border-border-default">
        <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-lg font-bold text-transparent">
          {expanded ? 'TeleStore' : 'TS'}
        </span>
      </div>
      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                isActive
                  ? 'bg-accent-primary/10 text-accent-primary'
                  : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
              }`}
            >
              <span className="flex w-5 items-center justify-center text-base">{item.icon}</span>
              {expanded && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

function Topbar() {
  const location = useLocation()
  const pageName = location.pathname.split('/').filter(Boolean).join(' › ') || 'Dashboard'

  return (
    <header className="flex h-12 items-center justify-between border-b border-border-default px-6">
      <h1 className="text-sm font-medium capitalize text-text-secondary">{pageName}</h1>
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-success" />
        <span className="text-xs text-text-muted">Connected</span>
      </div>
    </header>
  )
}

import React from 'react'
import { Outlet, createRootRouteWithContext, Link, useLocation, useRouter } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import type { QueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useMe } from '@/queries'
import { LogOut } from 'lucide-react'
import api from '@/lib/axios'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  const { isAuthenticated, setUser, clearAuth, isLoading } = useAuthStore()
  const location = useLocation()
  const router = useRouter()
  const isPublicPage = location.pathname === '/login' || location.pathname === '/register'

  // Fetch current user if token exists
  const { data: meData } = useMe()

  // Set loading false once useMe settles
  React.useEffect(() => {
    if (!localStorage.getItem('token')) {
      useAuthStore.getState().setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (meData) {
      setUser(meData)
    } else if (!localStorage.getItem('token')) {
      useAuthStore.getState().setLoading(false)
    }
  }, [meData, setUser])

  // Listen for 401 events
  React.useEffect(() => {
    const handler = () => {
      clearAuth()
      router.navigate({ to: '/login' })
    }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [clearAuth, router])

  // Public pages (login/register) — no sidebar
  if (isPublicPage) {
    return (
      <>
        <Outlet />
        <Toaster position="bottom-right" toastOptions={{
          style: { background: '#18181b', border: '1px solid #27272a', color: '#f4f4f5' },
        }} />
      </>
    )
  }

  // Not authenticated — redirect to login
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <div className="text-center">
          <p className="text-text-muted mb-4">Redirecting to login...</p>
          <a href="/login" className="text-accent-primary hover:underline">Go to Login</a>
        </div>
      </div>
    )
  }

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
  const { user, clearAuth } = useAuthStore()
  const router = useRouter()
  const isAdmin = user?.role === 'admin'

  const navItems = [
    { path: '/dashboard', icon: '⊞', label: 'Dashboard' },
    { path: '/files', icon: '≡', label: 'Files' },
  ]

  // Admin-only menu items
  if (isAdmin) {
    navItems.push(
      { path: '/settings/bots', icon: '⚙', label: 'Bots' },
      { path: '/settings/api-keys', icon: '🔑', label: 'API Keys' },
      { path: '/settings/webhooks', icon: '↗', label: 'Webhooks' },
      { path: '/audit', icon: '📋', label: 'Audit Log' },
    )
  }

  const handleLogout = async () => {
    try {
      await api.post('/web/logout')
    } catch {}
    clearAuth()
    router.navigate({ to: '/login' })
  }

  return (
    <aside
      className={`border-r border-border-default bg-surface transition-all duration-200 flex flex-col ${
        expanded ? 'w-[220px]' : 'w-[56px]'
      }`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="flex h-12 items-center justify-center border-b border-border-default shrink-0">
        <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-lg font-bold text-transparent">
          {expanded ? 'TeleStore' : 'TS'}
        </span>
      </div>
      <nav className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
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
      {/* User info & logout */}
      {expanded && user && (
        <div className="border-t border-border-default p-3 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-primary/20 text-xs font-medium text-accent-primary">
              {user.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text-primary truncate">{user.name}</p>
              <p className="text-[10px] text-text-muted capitalize">{user.role || 'user'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-muted hover:bg-surface-elevated hover:text-text-primary transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </aside>
  )
}

function Topbar() {
  const location = useLocation()
  const pageName = location.pathname.split('/').filter(Boolean).join(' › ') || 'Dashboard'

  return (
    <header className="flex h-12 items-center justify-between border-b border-border-default px-6 shrink-0">
      <h1 className="text-sm font-medium capitalize text-text-secondary">{pageName}</h1>
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-success" />
        <span className="text-xs text-text-muted">Connected</span>
      </div>
    </header>
  )
}

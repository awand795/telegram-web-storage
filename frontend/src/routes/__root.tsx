import React from 'react'
import { Outlet, createRootRouteWithContext, Link, useLocation, useRouter } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import type { QueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useUploadStore } from '@/stores/uploadStore'
import { useMe } from '@/queries'
import {
  LogOut,
  LayoutDashboard,
  FolderOpen,
  Bot,
  KeyRound,
  Webhook,
  ScrollText,
  Sun,
  Moon,
  Upload,
  Menu,
  X,
  User as UserIcon,
} from 'lucide-react'

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
  const isPublicPage =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/s/')

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

  // Public pages (login/register/share) — no sidebar
  if (isPublicPage) {
    return (
      <>
        <Outlet />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-text-primary)',
            },
          }}
        />
      </>
    )
  }

  // Not authenticated — redirect to login
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <div className="text-center">
          <p className="mb-4 text-text-muted">Redirecting to login...</p>
          <a href="/login" className="text-accent-primary hover:underline">
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-canvas text-text-primary">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-default)',
            color: 'var(--color-text-primary)',
          },
        }}
      />
    </div>
  )
}

/* ─── Sidebar ─── */
const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/files', icon: FolderOpen, label: 'Files' },
  { path: '/settings/profile', icon: UserIcon, label: 'Profile' },
]

const ADMIN_ITEMS = [
  { path: '/settings/bots', icon: Bot, label: 'Bots' },
  { path: '/settings/api-keys', icon: KeyRound, label: 'API Keys' },
  { path: '/settings/webhooks', icon: Webhook, label: 'Webhooks' },
  { path: '/audit', icon: ScrollText, label: 'Audit Log' },
]

function Sidebar() {
  const [expanded, setExpanded] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()
  const router = useRouter()
  const isAdmin = user?.role === 'admin'

  const items = isAdmin ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS

  const handleLogout = async () => {
    try {
      await (await import('@/lib/axios')).default.post('/web/logout')
    } catch {
      /* ignore */
    }
    clearAuth()
    router.navigate({ to: '/login' })
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-border-default bg-surface transition-all duration-200 md:static ${
          expanded ? 'w-[220px]' : 'w-[56px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {/* Mobile close + Logo */}
        <div className="flex h-14 items-center justify-between border-b border-border-default shrink-0 px-3 md:justify-center">
          {/* Close button on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-elevated hover:text-text-primary md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-lg font-bold text-transparent">
            {expanded ? 'TeleStore' : 'TS'}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5 p-2 flex-1 overflow-y-auto">
          {items.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`group flex h-10 items-center gap-3 rounded-lg px-2.5 text-sm transition-all ${
                  isActive
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                }`}
              >
                <span className="flex w-5 shrink-0 items-center justify-center">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-accent-primary' : ''}`} />
                </span>
                {expanded && <span className="truncate text-sm">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User info & logout */}
        {user && (
          <div className="border-t border-border-default shrink-0">
            <div className={`p-3 ${!expanded ? 'flex justify-center' : ''}`}>
              {expanded ? (
                <>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-primary/20 text-xs font-semibold text-accent-primary">
                      {user.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">
                        {user.name}
                      </p>
                      <p className="text-[10px] text-text-muted capitalize">
                        {user.role || 'user'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-muted hover:bg-surface-elevated hover:text-text-primary transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary/20 text-xs font-semibold text-accent-primary">
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 left-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary text-white shadow-lg shadow-accent-primary/30 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
    </>
  )
}

/* ─── Topbar ─── */
function Topbar() {
  const location = useLocation()
  const { user } = useAuthStore()
  const { theme, toggle: toggleTheme } = useThemeStore()
  const queue = useUploadStore((s) => s.queue)
  const activeCount = queue.filter((i) => i.status === 'pending' || i.status === 'uploading').length

  const pageName = location.pathname.split('/').filter(Boolean).join(' › ') || 'Dashboard'

  return (
    <header className="flex h-14 items-center justify-between border-b border-border-default bg-surface/80 backdrop-blur-md px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-primary/10 text-[10px] font-bold text-accent-primary md:hidden">
          TS
        </div>
        <h1 className="text-sm font-medium capitalize text-text-secondary truncate">
          {pageName}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Upload queue badge */}
        {activeCount > 0 && (
          <div className="relative flex items-center gap-1.5 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
            <Upload className="h-3.5 w-3.5 animate-pulse" />
            <span className="font-medium">{activeCount}</span>
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-elevated hover:text-text-primary transition-all"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* Status */}
        <div className="hidden items-center gap-2 md:flex">
          <span className="h-2 w-2 rounded-full bg-success" />
          <span className="text-xs text-text-muted">
            {user?.name || 'Connected'}
          </span>
        </div>
      </div>
    </header>
  )
}

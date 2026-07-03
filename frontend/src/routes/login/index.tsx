import { createRoute, useRouter } from '@tanstack/react-router'
import { Route as rootRoute } from '@/routes/__root'
import { motion } from 'motion/react'
import { Send, Shield, Database, Key, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/axios'
import { toast } from 'sonner'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { setUser, setToken } = useAuthStore()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      setUser(data.user, data.token)
      toast.success('Welcome back!')
      router.navigate({ to: '/dashboard' })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="grid w-full max-w-4xl grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 md:px-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="hidden flex-col justify-center md:flex"
        >
          <h1 className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-6xl font-bold text-transparent">
            TeleStore
          </h1>
          <p className="mt-4 text-lg text-text-secondary">
            Telegram Cloud Storage &amp; AI Agent Platform
          </p>
          <p className="mt-2 text-sm text-text-muted">
            Store, manage, and serve files through Telegram's infrastructure with a modern API.
          </p>

          <div className="mt-8 space-y-4">
            {[
              { icon: Database, text: 'Unlimited cloud storage via Telegram' },
              { icon: Send, text: 'Fast upload & download with async queue' },
              { icon: Key, text: 'REST API with rate-limited API keys' },
              { icon: Shield, text: 'AES-256 encrypted bot tokens & Argon2 hashed keys' },
            ].map((feature, i) => (
              <motion.div
                key={feature.text}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-center gap-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10">
                  <feature.icon className="h-4 w-4 text-accent-primary" />
                </div>
                <span className="text-sm text-text-secondary">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Login Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center justify-center"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface p-8">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20">
                <Send className="h-8 w-8 text-accent-primary" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-text-primary">Welcome back</h2>
              <p className="mt-1 text-sm text-text-muted">Sign in to your account</p>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-xl border border-border-default bg-canvas py-2.5 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-border-default bg-canvas py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-primary px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-accent-primary/90 hover:shadow-lg hover:shadow-accent-primary/20 disabled:opacity-50"
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-default" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-surface px-2 text-text-muted">or continue with</span>
              </div>
            </div>

            <div className="space-y-3">
              <a
                href="/auth/telegram"
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#0088cc] px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#0088cc]/90 hover:shadow-lg hover:shadow-[#0088cc]/20"
              >
                <Send className="h-4 w-4" />
                Continue with Telegram
              </a>

              <a
                href="/api/v1"
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-border-default px-6 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
              >
                <Key className="h-4 w-4" />
                Use API Key
              </a>
            </div>

            <p className="mt-6 text-center text-xs text-text-muted">
              Don't have an account?{' '}
              <a href="/register" className="text-accent-primary hover:underline">
                Sign up
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

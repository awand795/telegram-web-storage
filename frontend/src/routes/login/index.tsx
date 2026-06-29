import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '@/routes/__root'
import { motion } from 'motion/react'
import { Send, Shield, Database, Key } from 'lucide-react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="grid w-full max-w-4xl grid-cols-2 gap-12 px-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col justify-center"
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
              <p className="mt-1 text-sm text-text-muted">Sign in with your Telegram account</p>
            </div>

            <div className="mt-8 space-y-3">
              <a
                href="/auth/telegram"
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#0088cc] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[#0088cc]/90 hover:shadow-lg hover:shadow-[#0088cc]/20"
              >
                <Send className="h-4 w-4" />
                Continue with Telegram
              </a>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-default" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-surface px-2 text-text-muted">or</span>
                </div>
              </div>

              <a
                href="/api/v1"
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-border-default px-6 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
              >
                <Key className="h-4 w-4" />
                Use API Key
              </a>
            </div>

            <p className="mt-6 text-center text-[10px] text-text-muted">
              By signing in, you agree to the Terms of Service.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

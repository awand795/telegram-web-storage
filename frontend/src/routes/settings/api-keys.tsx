import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '@/routes/__root'
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from '@/queries'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { Copy, Eye, EyeOff, Trash2, Plus, Key } from 'lucide-react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/api-keys',
  component: ApiKeysPage,
})

function ApiKeysPage() {
  const { data: keys, isLoading } = useApiKeys()
  const createKey = useCreateApiKey()
  const deleteKey = useDeleteApiKey()
  const [showCreate, setShowCreate] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [rateLimit, setRateLimit] = useState(60)
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [newKeyPlaintext, setNewKeyPlaintext] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyName) return
    const result = await createKey.mutateAsync({ name: keyName, rate_limit: rateLimit })
    if (result?.plain_text_key) {
      setNewKeyPlaintext(result.plain_text_key)
    }
    setKeyName('')
    setShowCreate(false)
    toast.success('API key created')
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Revoke this API key? This cannot be undone.')) return
    await deleteKey.mutateAsync(id)
    toast.success('API key revoked')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">API Keys</h1>
          <p className="text-sm text-text-muted">Manage API keys for AI Agent integration</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent-primary px-4 text-sm font-medium text-white hover:bg-accent-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Key
        </button>
      </div>

      {/* New Key Reveal */}
      <AnimatePresence>
        {newKeyPlaintext && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-warning/30 bg-warning/5 p-4"
          >
            <p className="text-xs font-medium text-warning">Save this key — it won't be shown again!</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-canvas px-3 py-2 font-mono text-sm text-text-primary">
                {newKeyPlaintext}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newKeyPlaintext)
                  toast.success('Copied to clipboard')
                }}
                className="rounded-lg bg-accent-primary/10 p-2 text-accent-primary hover:bg-accent-primary/20"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => setNewKeyPlaintext(null)}
              className="mt-2 text-xs text-text-muted hover:text-text-secondary"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="overflow-hidden rounded-xl border border-border-default bg-surface p-4"
          >
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Key Name
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="Production API Key"
                  className="mt-1 h-9 w-full rounded-lg border border-border-default bg-canvas px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Rate Limit (requests/min)
                </label>
                <input
                  type="number"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(Number(e.target.value))}
                  min={1}
                  max={1000}
                  className="mt-1 h-9 w-32 rounded-lg border border-border-default bg-canvas px-3 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!keyName}
                  className="inline-flex h-8 items-center gap-2 rounded-lg bg-accent-primary px-3 text-xs font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50"
                >
                  Generate Key
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="inline-flex h-8 items-center gap-2 rounded-lg border border-border-default px-3 text-xs font-medium text-text-secondary hover:bg-surface-elevated"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Key List */}
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-center py-12 text-sm text-text-muted">Loading keys...</p>
        ) : !keys?.length ? (
          <p className="text-center py-12 text-sm text-text-muted">No API keys yet.</p>
        ) : (
          keys.map((key, i) => (
            <motion.div
              key={key.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between rounded-xl border border-border-default bg-surface p-4 transition-colors hover:border-border-hover"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary/10">
                  <Key className="h-4 w-4 text-accent-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{key.name}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    {revealedId === key.id ? (
                      <code className="font-mono text-xs text-text-muted">{key.key_preview}</code>
                    ) : (
                      <code className="font-mono text-xs text-text-muted">
                        {key.key_preview.slice(0, 20)}...
                      </code>
                    )}
                    <button
                      onClick={() => setRevealedId(revealedId === key.id ? null : key.id)}
                      className="text-text-muted hover:text-text-secondary"
                    >
                      {revealedId === key.id ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-text-muted">
                  {key.rate_limit} req/min
                </span>
                <button
                  onClick={() => handleDelete(key.id)}
                  className="text-text-muted hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

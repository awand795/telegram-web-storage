import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '@/routes/__root'
import { useWebhooks, useCreateWebhook, useDeleteWebhook } from '@/queries'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { Plus, Trash2, Webhook, Activity } from 'lucide-react'

const AVAILABLE_EVENTS = ['file.uploaded', 'file.deleted', 'file.failed', 'key.revoked', 'bot.added', 'bot.removed']

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/webhooks',
  component: WebhooksPage,
})

function WebhooksPage() {
  const { data: webhooks, isLoading } = useWebhooks()
  const createWebhook = useCreateWebhook()
  const deleteWebhook = useDeleteWebhook()
  const [showCreate, setShowCreate] = useState(false)
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    )
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url || selectedEvents.length === 0) return
    await createWebhook.mutateAsync({ url, events: selectedEvents })
    setUrl('')
    setSelectedEvents([])
    setShowCreate(false)
    toast.success('Webhook created')
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this webhook?')) return
    await deleteWebhook.mutateAsync(id)
    toast.success('Webhook removed')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Webhooks</h1>
          <p className="text-sm text-text-muted">Receive real-time events from your storage</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent-primary px-4 text-sm font-medium text-white hover:bg-accent-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Webhook
        </button>
      </div>

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
                  Endpoint URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.myapp.com/webhook"
                  className="mt-1 h-9 w-full rounded-lg border border-border-default bg-canvas px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Events
                </label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {AVAILABLE_EVENTS.map((event) => (
                    <button
                      key={event}
                      type="button"
                      onClick={() => toggleEvent(event)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                        selectedEvents.includes(event)
                          ? 'bg-accent-primary/20 text-accent-primary'
                          : 'bg-surface-elevated text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      {event}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!url || selectedEvents.length === 0}
                  className="inline-flex h-8 items-center gap-2 rounded-lg bg-accent-primary px-3 text-xs font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50"
                >
                  Create Webhook
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

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-center py-12 text-sm text-text-muted">Loading webhooks...</p>
        ) : !webhooks?.length ? (
          <p className="text-center py-12 text-sm text-text-muted">No webhooks configured.</p>
        ) : (
          webhooks.map((hook, i) => (
            <motion.div
              key={hook.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start justify-between rounded-xl border border-border-default bg-surface p-4 transition-colors hover:border-border-hover"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary/10">
                  <Webhook className="h-4 w-4 text-accent-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{hook.url}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {hook.events.map((event) => (
                      <span
                        key={event}
                        className="inline-flex items-center gap-1 rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-medium text-accent-primary"
                      >
                        <Activity className="h-2.5 w-2.5" />
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(hook.id)}
                className="text-text-muted hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

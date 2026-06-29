import React, { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '@/routes/__root'
import { useBots, useCreateBot, useDeleteBot } from '@/queries'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useBotStore } from '@/stores/botStore'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/bots',
  component: BotsPage,
})

function BotsPage() {
  const { data: bots, isLoading } = useBots()
  const createBot = useCreateBot()
  const deleteBot = useDeleteBot()
  const { setActiveBot, activeBotId } = useBotStore()
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [token, setToken] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !token) return
    await createBot.mutateAsync({ name, token })
    setName('')
    setToken('')
    setShowAdd(false)
    toast.success('Bot added successfully')
  }

  const handleDelete = async (id: string, botName: string) => {
    if (!window.confirm(`Remove bot "${botName}" and all its files?`)) return
    await deleteBot.mutateAsync(id)
    toast.success('Bot removed')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Bot Management</h1>
          <p className="text-sm text-text-muted">Manage your Telegram bots</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent-primary px-4 text-sm font-medium text-white hover:bg-accent-primary/90"
        >
          + Add Bot
        </button>
      </div>

      {showAdd && (
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
                Bot Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Bot"
                className="mt-1 h-9 w-full rounded-lg border border-border-default bg-canvas px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Bot Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="1234567890:ABCdefGHIjklmNOPqrstUVwxyz"
                className="mt-1 h-9 w-full rounded-lg border border-border-default bg-canvas px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!name || !token}
                className="inline-flex h-8 items-center gap-2 rounded-lg bg-accent-primary px-3 text-xs font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50"
              >
                Create Bot
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="inline-flex h-8 items-center gap-2 rounded-lg border border-border-default px-3 text-xs font-medium text-text-secondary hover:bg-surface-elevated"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.form>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {isLoading ? (
          <p className="text-sm text-text-muted col-span-2 text-center py-12">Loading bots...</p>
        ) : !bots?.length ? (
          <p className="text-sm text-text-muted col-span-2 text-center py-12">No bots yet. Add your first bot!</p>
        ) : (
          bots.map((bot, i) => (
            <motion.div
              key={bot.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-xl border p-4 transition-all ${
                activeBotId === bot.id
                  ? 'border-accent-primary/40 bg-accent-primary/5'
                  : 'border-border-default bg-surface hover:border-border-hover'
              }`}
              onClick={() => setActiveBot(bot.id)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-text-primary">{bot.name}</h3>
                  <p className="mt-0.5 font-mono text-[11px] text-text-muted">{bot.token_preview}...</p>
                </div>
                <span
                  className={`inline-flex h-2 w-2 rounded-full ${
                    bot.active ? 'bg-success' : 'bg-text-muted'
                  }`}
                />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border-default pt-3">
                <span className="text-[10px] text-text-muted">
                  {bot.chat_id ? `Chat: ${bot.chat_id}` : 'Not connected'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(bot.id, bot.name)
                  }}
                  className="text-[10px] text-danger hover:underline"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

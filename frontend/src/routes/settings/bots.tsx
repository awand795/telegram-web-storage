import React, { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '@/routes/__root'
import { useBots, useCreateBot, useDeleteBot, useUpdateBot, useRefreshBotChat } from '@/queries'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useBotStore } from '@/stores/botStore'
import { RefreshCw, Edit3 } from 'lucide-react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/bots',
  component: BotsPage,
})

function BotsPage() {
  const { data: bots, isLoading, refetch } = useBots()
  const createBot = useCreateBot()
  const deleteBot = useDeleteBot()
  const updateBot = useUpdateBot()
  const refreshChat = useRefreshBotChat()
  const { setActiveBot, activeBotId } = useBotStore()
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [token, setToken] = useState('')
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [chatIdInput, setChatIdInput] = useState('')

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

  const handleRefreshChat = async (botId: string) => {
    const result = await refreshChat.mutateAsync(botId)
    if (result.chat_id) {
      toast.success(`Chat ID detected: ${result.chat_id}`)
      refetch()
    } else {
      toast.error('No chat found. Send a message to the bot first!')
    }
  }

  const handleSaveChatId = async (botId: string) => {
    if (!chatIdInput.trim()) return
    await updateBot.mutateAsync({ id: botId, chat_id: chatIdInput.trim() })
    setEditingChatId(null)
    setChatIdInput('')
    toast.success('Chat ID updated')
    refetch()
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

              {/* Chat ID Section */}
              <div className="mt-3 border-t border-border-default pt-3">
                {editingChatId === bot.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={chatIdInput}
                      onChange={(e) => setChatIdInput(e.target.value)}
                      placeholder={bot.chat_id || 'Enter chat ID or @username'}
                      className="flex-1 h-8 rounded-lg border border-border-default bg-canvas px-2 text-[11px] text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveChatId(bot.id)}
                      disabled={!chatIdInput.trim()}
                      className="h-8 rounded-lg bg-accent-primary px-2 text-[10px] font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingChatId(null); setChatIdInput('') }}
                      className="h-8 rounded-lg border border-border-default px-2 text-[10px] text-text-secondary hover:bg-surface-elevated"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-text-muted whitespace-nowrap">Chat ID:</span>
                      <span className="text-[11px] font-mono text-text-secondary truncate">
                        {bot.chat_id || (
                          <span className="text-danger/70">Not set — uploads will fail!</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingChatId(bot.id)
                          setChatIdInput(bot.chat_id || '')
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-elevated hover:text-text-primary"
                        title="Edit Chat ID"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRefreshChat(bot.id)
                        }}
                        disabled={refreshChat.isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-elevated hover:text-text-primary disabled:opacity-50"
                        title="Auto-detect Chat ID from Telegram"
                      >
                        <RefreshCw className={`h-3 w-3 ${refreshChat.isPending ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(bot.id, bot.name)
                        }}
                        className="text-[10px] text-danger hover:underline ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
                <p className="mt-1 text-[9px] text-text-muted">
                  Send a message to @{bot.name} on Telegram, then click <RefreshCw className="inline h-2.5 w-2.5" /> to auto-detect. 
                  Or enter a group chat ID / @username manually.
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

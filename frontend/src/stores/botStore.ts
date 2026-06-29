import { create } from 'zustand'
import type { Bot } from '@/types/schema'

interface BotState {
  activeBotId: string | null
  bots: Bot[]
  setActiveBot: (id: string | null) => void
  setBots: (bots: Bot[]) => void
  addBot: (bot: Bot) => void
  removeBot: (id: string) => void
}

export const useBotStore = create<BotState>((set) => ({
  activeBotId: null,
  bots: [],
  setActiveBot: (id) => set({ activeBotId: id }),
  setBots: (bots) => set({ bots }),
  addBot: (bot) => set((s) => ({ bots: [...s.bots, bot] })),
  removeBot: (id) =>
    set((s) => ({
      bots: s.bots.filter((b) => b.id !== id),
      activeBotId: s.activeBotId === id ? null : s.activeBotId,
    })),
}))

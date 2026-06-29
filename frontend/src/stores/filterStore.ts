import { create } from 'zustand'

interface FilterState {
  selectedFolder: string | null
  activeTags: string[]
  searchQuery: string
  sortBy: string
  setFolder: (folder: string | null) => void
  toggleTag: (tag: string) => void
  setSearch: (query: string) => void
  setSort: (sort: string) => void
}

export const useFilterStore = create<FilterState>((set) => ({
  selectedFolder: null,
  activeTags: [],
  searchQuery: '',
  sortBy: 'uploaded_at_desc',
  setFolder: (folder) => set({ selectedFolder: folder }),
  toggleTag: (tag) =>
    set((s) => ({
      activeTags: s.activeTags.includes(tag)
        ? s.activeTags.filter((t) => t !== tag)
        : [...s.activeTags, tag],
    })),
  setSearch: (query) => set({ searchQuery: query }),
  setSort: (sort) => set({ sortBy: sort }),
}))

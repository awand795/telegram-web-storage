import { create } from 'zustand'

interface UiState {
  sidebarExpanded: boolean
  activeModal: string | null
  toggleSidebar: () => void
  openModal: (modal: string) => void
  closeModal: () => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarExpanded: false,
  activeModal: null,
  toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
}))

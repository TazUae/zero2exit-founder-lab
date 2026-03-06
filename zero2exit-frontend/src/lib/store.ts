import { create } from "zustand"

interface AppStore {
  language: "en" | "ar"
  setLanguage: (lang: "en" | "ar") => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppStore>((set) => ({
  language: "en",
  setLanguage: (language) => set({ language }),
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}))


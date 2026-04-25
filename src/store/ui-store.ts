// ============================================================================
// UI Store — Theme, sidebar, layout, view state, search
// ============================================================================
"use client";

import { create } from "zustand";

export type AppView = "landing" | "auth" | "dashboard";

function getSavedTheme(): "light" | "dark" | "premium-dark" {
  if (typeof window === "undefined") return "premium-dark";
  try {
    const saved = localStorage.getItem("valtriox-theme");
    if (saved === "light" || saved === "dark" || saved === "premium-dark") return saved;
  } catch {}
  return "premium-dark";
}
function saveThemeToStorage(theme: "light" | "dark" | "premium-dark") {
  try { if (typeof window !== "undefined") localStorage.setItem("valtriox-theme", theme); } catch {}
}
function getSavedLanguage(): "en" | "ur" {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem("valtriox-language");
    if (saved === "en" || saved === "ur") return saved;
  } catch {}
  return "en";
}
function saveLanguageToStorage(lang: "en" | "ur") {
  try { if (typeof window !== "undefined") localStorage.setItem("valtriox-language", lang); } catch {}
}

interface UIStore {
  // View
  view: AppView;
  setView: (view: AppView) => void;
  // Active Section
  activeSection: string;
  setActiveSection: (section: string) => void;
  // Theme
  appTheme: "light" | "dark" | "premium-dark";
  setAppTheme: (theme: "light" | "dark" | "premium-dark") => void;
  // Language
  language: "en" | "ur";
  setLanguage: (lang: "en" | "ur") => void;
  // Sidebar (Desktop)
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  // Sidebar (Mobile)
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  // Notifications
  notificationCount: number;
  setNotificationCount: (count: number) => void;
  incrementNotifications: (by?: number) => void;
  decrementNotifications: (by?: number) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  view: "landing",
  setView: (view) => set({ view }),
  activeSection: "dashboard",
  setActiveSection: (section) => set({ activeSection: section, sidebarOpen: false }),
  appTheme: getSavedTheme(),
  setAppTheme: (theme) => { saveThemeToStorage(theme); set({ appTheme: theme }); },
  language: getSavedLanguage(),
  setLanguage: (lang) => { saveLanguageToStorage(lang); set({ language: lang }); },
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearSearch: () => set({ searchQuery: "" }),
  notificationCount: 0,
  setNotificationCount: (count) => set({ notificationCount: count }),
  incrementNotifications: (by = 1) => set((s) => ({ notificationCount: Math.max(0, s.notificationCount + by) })),
  decrementNotifications: (by = 1) => set((s) => ({ notificationCount: Math.max(0, s.notificationCount - by) })),
  clearNotifications: () => set({ notificationCount: 0 }),
}));

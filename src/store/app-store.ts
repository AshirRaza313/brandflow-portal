import { create } from 'zustand';

interface Admin {
  id: string;
  name: string;
  email: string;
}

interface AppState {
  currentPage: string;
  isAuthenticated: boolean;
  admin: Admin | null;
  sidebarOpen: boolean;
  token: string | null;
  setCurrentPage: (page: string) => void;
  login: (admin: Admin, token: string) => void;
  logout: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  isAuthenticated: false,
  admin: null,
  sidebarOpen: true,
  token: null,
  setCurrentPage: (page) => set({ currentPage: page }),
  login: (admin, token) => set({ isAuthenticated: true, admin, token }),
  logout: () => set({ isAuthenticated: false, admin: null, token: null, currentPage: 'dashboard' }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

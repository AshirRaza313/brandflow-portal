// ============================================================================
// Auth Store — User authentication state, organization info, login/logout
// ============================================================================
"use client";

import { create } from "zustand";

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  favicon?: string;
  website?: string;
  phone?: string;
  email?: string;
  currency: string;
  timezone: string;
  plan: string;
  country?: string;
  religion?: string;
  brandLogo?: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
}

interface AuthStore {
  // User
  user: UserInfo | null;
  setUser: (user: UserInfo | null) => void;
  // Organization
  organization: OrganizationInfo | null;
  setOrganization: (org: OrganizationInfo | null) => void;
  // Auth Modal (landing page)
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalMode: "login" | "signup" | null;
  setAuthModalMode: (mode: "login" | "signup" | null) => void;
  // Logout
  logout: () => void;
}

function getSavedUser(): any {
  try {
    const saved = typeof window !== "undefined" ? localStorage.getItem("brandforge-user") : null;
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}
function getSavedOrg(): any {
  try {
    const saved = typeof window !== "undefined" ? localStorage.getItem("brandforge-org") : null;
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: getSavedUser(),
  setUser: (user) => {
    try { localStorage.setItem("brandforge-user", JSON.stringify(user)); } catch {}
    set({ user });
  },
  organization: getSavedOrg(),
  setOrganization: (org) => {
    try { localStorage.setItem("brandforge-org", JSON.stringify(org)); } catch {}
    set({ organization: org });
  },
  authModalOpen: false,
  setAuthModalOpen: (open) => set({ authModalOpen: open, authModalMode: open ? (get().authModalMode || "login") : null }),
  authModalMode: null as "login" | "signup" | null,
  setAuthModalMode: (mode) => set({ authModalMode: mode, authModalOpen: mode !== null }),
  logout: () => {
    try {
      localStorage.removeItem("brandforge-user");
      localStorage.removeItem("brandforge-org");
      localStorage.removeItem("brandforge-brandname");
      localStorage.removeItem("brandforge-logo");
      localStorage.removeItem("brandforge-tagline");
      localStorage.removeItem("brandforge-configured");
    } catch {}
    set({
      user: null,
      organization: null,
      authModalOpen: false,
      authModalMode: null,
    });
  },
}));

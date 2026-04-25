// ============================================================================
// Brand Store — Brand identity, theming, branding settings
// ============================================================================
"use client";

import { create } from "zustand";

export interface BrandTheme {
  brandColor: string;
  brandGradient: string;
  brandBgColor: string;
}

export interface EventTheme {
  primary: string;
  secondary: string;
  accent: string;
  gradient: string;
  bgPattern: string;
  textOnPrimary: string;
  glow: string;
}

function getSavedBrandName(): string {
  try { return typeof window !== "undefined" ? localStorage.getItem("valtriox-brandname") || "" : ""; } catch { return ""; }
}
function getSavedBrandLogo(): string | null {
  try { return typeof window !== "undefined" ? localStorage.getItem("valtriox-logo") : null; } catch { return null; }
}
function getSavedBrandTagline(): string {
  try { return typeof window !== "undefined" ? localStorage.getItem("valtriox-tagline") || "" : ""; } catch { return ""; }
}
function getSavedBrandConfigured(): boolean {
  try { return typeof window !== "undefined" ? localStorage.getItem("valtriox-configured") === "true" : false; } catch { return false; }
}

interface BrandStore {
  brandName: string;
  setBrandName: (name: string) => void;
  brandTagline: string;
  setBrandTagline: (tagline: string) => void;
  brandColor: string;
  setBrandColor: (color: string) => void;
  brandGradient: string;
  setBrandGradient: (gradient: string) => void;
  brandBgColor: string;
  setBrandBgColor: (color: string) => void;
  setBrandTheme: (theme: Partial<BrandTheme>) => void;
  brandLogo: string | null;
  setBrandLogo: (logo: string | null) => void;
  brandConfigured: boolean;
  setBrandConfigured: (v: boolean) => void;
  // Event Theming
  activeEventTheme: EventTheme | null;
  setActiveEventTheme: (theme: EventTheme | null) => void;
  eventThemingEnabled: boolean;
  setEventThemingEnabled: (v: boolean) => void;
  floatingIconsEnabled: boolean;
  setFloatingIconsEnabled: (v: boolean) => void;
  // Country & Religion
  selectedCountry: string;
  setSelectedCountry: (c: string) => void;
  selectedReligion: string;
  setSelectedReligion: (r: string) => void;
}

export const useBrandStore = create<BrandStore>((set, get) => ({
  brandName: getSavedBrandName(),
  setBrandName: (name) => {
    try { localStorage.setItem("valtriox-brandname", name); } catch {}
    set({ brandName: name });
  },
  brandTagline: getSavedBrandTagline(),
  setBrandTagline: (tagline) => {
    try { localStorage.setItem("valtriox-tagline", tagline); } catch {}
    set({ brandTagline: tagline });
  },
  brandColor: "#C9A227",
  setBrandColor: (color) => set({ brandColor: color }),
  brandGradient: "linear-gradient(135deg, #C9A227 0%, #B8860B 100%)",
  setBrandGradient: (gradient) => set({ brandGradient: gradient }),
  brandBgColor: "#ffffff",
  setBrandBgColor: (color) => set({ brandBgColor: color }),
  setBrandTheme: (theme) =>
    set((s) => ({
      brandColor: theme.brandColor ?? s.brandColor,
      brandGradient: theme.brandGradient ?? s.brandGradient,
      brandBgColor: theme.brandBgColor ?? s.brandBgColor,
    })),
  brandLogo: getSavedBrandLogo(),
  setBrandLogo: (logo) => {
    try { localStorage.setItem("valtriox-logo", logo || ""); } catch {}
    set({ brandLogo: logo });
  },
  brandConfigured: getSavedBrandConfigured(),
  setBrandConfigured: (v) => {
    try { localStorage.setItem("valtriox-configured", v ? "true" : "false"); } catch {}
    set({ brandConfigured: v });
  },
  activeEventTheme: null,
  setActiveEventTheme: (theme) => set({ activeEventTheme: theme }),
  eventThemingEnabled: false,
  setEventThemingEnabled: (v) => set({ eventThemingEnabled: v }),
  floatingIconsEnabled: false,
  setFloatingIconsEnabled: (v) => set({ floatingIconsEnabled: v }),
  selectedCountry: "",
  setSelectedCountry: (c) => set({ selectedCountry: c }),
  selectedReligion: "",
  setSelectedReligion: (r) => set({ selectedReligion: r }),
}));

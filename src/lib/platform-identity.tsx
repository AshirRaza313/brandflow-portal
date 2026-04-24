"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// ============================================================================
// TYPES
// ============================================================================

interface PlatformIdentity {
  companyName: string;
  tagline: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  companyEmail: string;
  companyPhone: string | null;
  companyWebsite: string | null;
  loaded: boolean;
}

interface PlatformIdentityContextType {
  identity: PlatformIdentity;
  refreshIdentity: () => void;
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_IDENTITY: PlatformIdentity = {
  companyName: "BrandOnyx",
  tagline: "Command Your Brand",
  logoUrl: null,
  faviconUrl: null,
  primaryColor: "#d97706",
  secondaryColor: "#059669",
  companyEmail: "support@brandonix.pk",
  companyPhone: null,
  companyWebsite: null,
  loaded: false,
};

const CONTEXT = createContext<PlatformIdentityContextType>({
  identity: DEFAULT_IDENTITY,
  refreshIdentity: () => {},
});

// ============================================================================
// PROVIDER
// ============================================================================

export function PlatformIdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<PlatformIdentity>(DEFAULT_IDENTITY);
  const [loaded, setLoaded] = useState(false);

  const fetchIdentity = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) return;
      const data = await res.json();
      if (data) {
        const mapped: PlatformIdentity = {
          companyName: data.companyName || "BrandOnyx",
          tagline: "Command Your Brand",
          logoUrl: data.logoUrl || null,
          faviconUrl: data.faviconUrl || null,
          primaryColor: data.primaryBrandColor || "#d97706",
          secondaryColor: data.secondaryBrandColor || "#059669",
          companyEmail: data.companyEmail || "support@brandonix.pk",
          companyPhone: data.companyPhone || null,
          companyWebsite: data.companyWebsite || null,
          loaded: true,
        };
        setIdentity(mapped);

        // Update page title dynamically
        if (typeof document !== "undefined" && data.companyName) {
          document.title = `${data.companyName} — Command Your Brand`;
        }

        // Update favicon if custom
        if (typeof document !== "undefined" && data.faviconUrl) {
          const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
          if (link) link.href = data.faviconUrl;
        }
      }
    } catch {
      // Silently fail — use defaults
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    fetchIdentity();
  }, []);

  // Also refresh when user logs in (check localStorage periodically)
  useEffect(() => {
    const interval = setInterval(() => {
      const user = localStorage.getItem("brandonix-user");
      if (user && !loaded) {
        fetchIdentity();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [loaded]);

  return (
    <CONTEXT.Provider value={{ identity, refreshIdentity: fetchIdentity }}>
      {children}
    </CONTEXT.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function usePlatformIdentity() {
  return useContext(CONTEXT);
}

// ============================================================================
// HELPER: Dynamic "Powered by {name}" text
// ============================================================================

export function usePlatformName(): string {
  const { identity } = usePlatformIdentity();
  return identity.companyName;
}

export function usePlatformLogo(): string | null {
  const { identity } = usePlatformIdentity();
  return identity.logoUrl;
}

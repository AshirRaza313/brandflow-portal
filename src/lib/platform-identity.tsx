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
  founderImageUrl: string | null;
  founderBio: string | null;
  primaryColor: string;
  secondaryColor: string;
  companyEmail: string;
  companyPhone: string | null;
  companyWebsite: string | null;
  companyAddress: string | null;
  loaded: boolean;
  instagramUrl: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  discordUrl: string | null;
  redditUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  whatsappNumber: string | null;
  socialLinksVisible: boolean;
  // Individual platform toggles
  showInstagram: boolean;
  showFacebook: boolean;
  showTwitter: boolean;
  showLinkedin: boolean;
  showDiscord: boolean;
  showReddit: boolean;
  showYoutube: boolean;
  showTiktok: boolean;
  showWhatsApp: boolean;
}

interface PlatformIdentityContextType {
  identity: PlatformIdentity;
  refreshIdentity: () => void;
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_IDENTITY: PlatformIdentity = {
  companyName: "Valtriox",
  tagline: "COMMAND YOUR BRAND UNIVERSE",
  logoUrl: null,
  faviconUrl: null,
  founderImageUrl: null,
  founderBio: null,
  primaryColor: "#D4A73A",
  secondaryColor: "#D4A73A",
  companyEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "ashir@valtriox.com",
  companyPhone: "+92-318 3916019",
  companyWebsite: null,
  companyAddress: "Karachi, Pakistan",
  loaded: false,
  instagramUrl: null,
  facebookUrl: null,
  twitterUrl: null,
  linkedinUrl: null,
  discordUrl: null,
  redditUrl: null,
  youtubeUrl: null,
  tiktokUrl: null,
  whatsappNumber: null,
  socialLinksVisible: true,
  showInstagram: false,
  showFacebook: false,
  showTwitter: false,
  showLinkedin: false,
  showDiscord: false,
  showReddit: false,
  showYoutube: false,
  showTiktok: false,
  showWhatsApp: false,
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
      // Use PUBLIC API first (no auth needed for landing page visitors)
      const res = await fetch("/api/public/settings");
      if (res.ok) {
        const data = await res.json();
        const mapped: PlatformIdentity = {
          companyName: data.companyName || "Valtriox",
          tagline: data.tagline || "COMMAND YOUR BRAND UNIVERSE",
          logoUrl: data.logoUrl || null,
          faviconUrl: data.faviconUrl || null,
          founderImageUrl: data.founderImageUrl || null,
          founderBio: data.founderBio || null,
          primaryColor: data.primaryBrandColor || "#D4A73A",
          secondaryColor: data.secondaryBrandColor || "#D4A73A",
          companyEmail: data.companyEmail || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "ashir@valtriox.com",
          companyPhone: data.companyPhone || "+92-318 3916019",
          companyWebsite: data.companyWebsite || null,
          companyAddress: data.companyAddress || "Karachi, Pakistan",
          loaded: true,
          instagramUrl: data.instagramUrl || null,
          facebookUrl: data.facebookUrl || null,
          twitterUrl: data.twitterUrl || null,
          linkedinUrl: data.linkedinUrl || null,
          discordUrl: data.discordUrl || null,
          redditUrl: data.redditUrl || null,
          youtubeUrl: data.youtubeUrl || null,
          tiktokUrl: data.tiktokUrl || null,
          whatsappNumber: data.whatsappNumber || null,
          socialLinksVisible: data.socialLinksVisible !== false,
          showInstagram: data.showInstagram || false,
          showFacebook: data.showFacebook || false,
          showTwitter: data.showTwitter || false,
          showLinkedin: data.showLinkedin || false,
          showDiscord: data.showDiscord || false,
          showReddit: data.showReddit || false,
          showYoutube: data.showYoutube || false,
          showTiktok: data.showTiktok || false,
          showWhatsApp: data.showWhatsApp || false,
        };
        setIdentity(mapped);

        // Update page title dynamically
        if (typeof document !== "undefined" && data.companyName) {
          document.title = `${data.companyName} - COMMAND YOUR BRAND UNIVERSE`;
        }

        // Update favicon if custom
        if (typeof document !== "undefined" && data.faviconUrl) {
          const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
          if (link) link.href = data.faviconUrl;
        }
        return;
      }
    } catch {
      // Fall through to admin API
    }

    // Fallback: try admin API (for authenticated users / dashboard)
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) return;
      const data = await res.json();
      const s = data.settings || data;
      const mapped: PlatformIdentity = {
        companyName: s.companyName || "Valtriox",
        tagline: s.tagline || "COMMAND YOUR BRAND UNIVERSE",
        logoUrl: s.logoUrl || null,
        faviconUrl: s.faviconUrl || null,
        founderImageUrl: s.founderImageUrl || null,
        founderBio: s.founderBio || null,
        primaryColor: s.primaryBrandColor || "#D4A73A",
        secondaryColor: s.secondaryBrandColor || "#D4A73A",
        companyEmail: s.companyEmail || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "ashir@valtriox.com",
        companyPhone: s.companyPhone || "+92-318 3916019",
        companyWebsite: s.companyWebsite || null,
        companyAddress: s.companyAddress || "Karachi, Pakistan",
        loaded: true,
        instagramUrl: s.instagramUrl || null,
        facebookUrl: s.facebookUrl || null,
        twitterUrl: s.twitterUrl || null,
        linkedinUrl: s.linkedinUrl || null,
        discordUrl: s.discordUrl || null,
        redditUrl: s.redditUrl || null,
        youtubeUrl: s.youtubeUrl || null,
        tiktokUrl: s.tiktokUrl || null,
        whatsappNumber: s.whatsappNumber || null,
        socialLinksVisible: s.socialLinksVisible !== "false",
        showInstagram: s.showInstagram || false,
        showFacebook: s.showFacebook || false,
        showTwitter: s.showTwitter || false,
        showLinkedin: s.showLinkedin || false,
        showDiscord: s.showDiscord || false,
        showReddit: s.showReddit || false,
        showYoutube: s.showYoutube || false,
        showTiktok: s.showTiktok || false,
        showWhatsApp: s.showWhatsApp || false,
      };
      setIdentity(mapped);

      if (typeof document !== "undefined" && s.companyName) {
        document.title = `${s.companyName} - COMMAND YOUR BRAND UNIVERSE`;
      }
      if (typeof document !== "undefined" && s.faviconUrl) {
        const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
        if (link) link.href = s.faviconUrl;
      }
    } catch {
      // Silently fail - use defaults
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    fetchIdentity();
  }, []);

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
// HELPERS
// ============================================================================

export function usePlatformName(): string {
  const { identity } = usePlatformIdentity();
  return identity.companyName;
}

export function usePlatformLogo(): string | null {
  const { identity } = usePlatformIdentity();
  return identity.logoUrl;
}

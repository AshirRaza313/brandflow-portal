"use client";

import { useValtrioxStore } from "@/store/brandflow-store";
import { useShallow } from "zustand/shallow";

// ============================================================================
// Optimized Store Selector Hooks
//
// These hooks use `useShallow` from zustand to prevent unnecessary re-renders.
// Without useShallow, destructuring multiple properties from useValtrioxStore()
// causes the component to re-render on ANY state change, even if the selected
// properties haven't changed. useShallow performs a shallow comparison of the
// returned object to avoid this.
//
// Actions (functions) are stable references in zustand, so they don't need
// useShallow — but grouping them together is still cleaner than a bare
// useValtrioxStore() call that subscribes to everything.
// ============================================================================

// ── Auth slice ──────────────────────────────────────────────────────────────
export const useAuth = () =>
  useValtrioxStore(
    useShallow((state) => ({
      user: state.user,
      authStatus: state.authStatus,
      authError: state.authError,
      sessionHint: state.sessionHint,
    }))
  );

// ── UI slice ────────────────────────────────────────────────────────────────
export const useUI = () =>
  useValtrioxStore(
    useShallow((state) => ({
      view: state.view,
      activeSection: state.activeSection,
      appTheme: state.appTheme,
      sidebarCollapsed: state.sidebarCollapsed,
    }))
  );

// ── Organization slice ──────────────────────────────────────────────────────
export const useOrganization = () =>
  useValtrioxStore(
    useShallow((state) => ({
      organization: state.organization,
    }))
  );

// ── Branding slice ──────────────────────────────────────────────────────────
export const useBranding = () =>
  useValtrioxStore(
    useShallow((state) => ({
      brandName: state.brandName,
      brandTagline: state.brandTagline,
      brandLogo: state.brandLogo,
      brandConfigured: state.brandConfigured,
      brandColor: state.brandColor,
      brandGradient: state.brandGradient,
      brandBgColor: state.brandBgColor,
    }))
  );

// ── Event theme slice ───────────────────────────────────────────────────────
export const useEventTheme = () =>
  useValtrioxStore(
    useShallow((state) => ({
      activeEventTheme: state.activeEventTheme,
      eventThemingEnabled: state.eventThemingEnabled,
      floatingIconsEnabled: state.floatingIconsEnabled,
    }))
  );

// ── Sidebar / mobile overlay slice ─────────────────────────────────────────
export const useSidebar = () =>
  useValtrioxStore(
    useShallow((state) => ({
      sidebarOpen: state.sidebarOpen,
      sidebarCollapsed: state.sidebarCollapsed,
    }))
  );

// ── Notifications slice ─────────────────────────────────────────────────────
export const useNotifications = () =>
  useValtrioxStore(
    useShallow((state) => ({
      notificationCount: state.notificationCount,
    }))
  );

// ── Search slice ────────────────────────────────────────────────────────────
export const useSearch = () =>
  useValtrioxStore(
    useShallow((state) => ({
      searchQuery: state.searchQuery,
    }))
  );

// ── Localization slice ──────────────────────────────────────────────────────
export const useLocalization = () =>
  useValtrioxStore(
    useShallow((state) => ({
      language: state.language,
      selectedCountry: state.selectedCountry,
      selectedReligion: state.selectedReligion,
    }))
  );

// ── Auth modal slice ────────────────────────────────────────────────────────
export const useAuthModal = () =>
  useValtrioxStore(
    useShallow((state) => ({
      authModalOpen: state.authModalOpen,
      authModalMode: state.authModalMode,
    }))
  );

// ============================================================================
// Action-only hooks
//
// Actions are stable function references in zustand — they never change.
// We still group them in a selector so the component only subscribes to
// the actions it needs (not the entire store), but useShallow is not
// strictly necessary for these. We include it anyway for consistency.
// ============================================================================

export const useAuthActions = () =>
  useValtrioxStore(
    useShallow((state) => ({
      setAuthSession: state.setAuthSession,
      login: state.initializeAuth, // alias for convenience
      logout: state.logout,
    }))
  );

export const useUIActions = () =>
  useValtrioxStore(
    useShallow((state) => ({
      setView: state.setView,
      setActiveSection: state.setActiveSection,
      setAppTheme: state.setAppTheme,
      setSidebarCollapsed: state.setSidebarCollapsed,
      setAuthModalOpen: state.setAuthModalOpen,
      setAuthModalMode: state.setAuthModalMode,
    }))
  );

export const useBrandingActions = () =>
  useValtrioxStore(
    useShallow((state) => ({
      setBrandName: state.setBrandName,
      setBrandTagline: state.setBrandTagline,
      setBrandLogo: state.setBrandLogo,
      setBrandConfigured: state.setBrandConfigured,
      setBrandColor: state.setBrandColor,
      setBrandGradient: state.setBrandGradient,
      setBrandBgColor: state.setBrandBgColor,
      setBrandTheme: state.setBrandTheme,
    }))
  );

export const useOrganizationActions = () =>
  useValtrioxStore(
    useShallow((state) => ({
      setOrganization: state.setOrganization,
    }))
  );

export const useSidebarActions = () =>
  useValtrioxStore(
    useShallow((state) => ({
      setSidebarOpen: state.setSidebarOpen,
      toggleSidebar: state.toggleSidebar,
      setSidebarCollapsed: state.setSidebarCollapsed,
      toggleSidebarCollapsed: state.toggleSidebarCollapsed,
    }))
  );

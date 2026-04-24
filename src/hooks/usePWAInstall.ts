"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";

// ── Types ──

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface UsePWAInstallReturn {
  /** Whether the PWA can be installed (i.e., beforeinstallprompt was captured) */
  canInstall: boolean;
  /** Whether the app is installed (running as standalone) */
  isInstalled: boolean;
  /** Trigger the install prompt */
  install: () => Promise<void>;
  /** Dismiss the install prompt without installing */
  dismiss: () => void;
}

// ── Helpers ──

function getIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function subscribeToDisplayMode(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

// ── Hook ──

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const isInstalled = useSyncExternalStore(subscribeToDisplayMode, getIsStandalone);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Listen for the beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      // Prevent the default mini-infobar
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
      console.log("[PWA] App installed successfully");
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn("[PWA] Install prompt not available");
      return;
    }

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for user response
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("[PWA] User accepted the install prompt");
    } else {
      console.log("[PWA] User dismissed the install prompt");
    }

    // Clear the deferred prompt — can only be used once
    setDeferredPrompt(null);
    setCanInstall(false);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDeferredPrompt(null);
    setCanInstall(false);
  }, []);

  return {
    canInstall,
    isInstalled,
    install,
    dismiss,
  };
}

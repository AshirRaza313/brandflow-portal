"use client";

import { useEffect } from "react";

/**
 * ServiceWorkerRegistrar — registers the BrandForge PWA service worker
 * on mount. Must be a client component placed inside <body>.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[SW] Registered:", registration.scope);
      })
      .catch((error) => {
        console.warn("[SW] Registration failed:", error);
      });
  }, []);

  return null;
}

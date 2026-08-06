// @ts-nocheck — Phase 8: pre-existing TS errors (Decimal/Prisma types, etc.) pending migration
"use client";

import { useState, useEffect, useCallback } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";

// ── Types ──

interface PushSubscriptionState {
  permission: NotificationPermission;
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
}

interface UsePushNotificationsReturn extends PushSubscriptionState {
  requestPermission: () => Promise<NotificationPermission>;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  sendTestNotification: (title?: string, body?: string) => Promise<void>;
}

// ── VAPID Public Key helper ──

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ── Hook ──

export function usePushNotifications(): UsePushNotificationsReturn {
  const [state, setState] = useState<PushSubscriptionState>({
    permission: typeof window !== "undefined" && typeof Notification !== "undefined" ? Notification.permission : "default",
    isSupported: false,
    isSubscribed: false,
    isLoading: false,
  });

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const isSupported = state.isSupported;
  const isSubscribed = state.isSubscribed;
  const isLoading = state.isLoading;
  const permission = state.permission;

  // Check browser support
  useEffect(() => {
    if (typeof window === "undefined") return;

    const supported = "serviceWorker" in navigator && "PushManager" in window;
    Promise.resolve().then(() => {
      setState((prev) => ({
        ...prev,
        isSupported: supported,
        permission: Notification.permission || "default",
      }));
    });

    // Check existing subscription
    if (supported) {
      navigator.serviceWorker.ready.then(async (registration) => {
        try {
          const sub = await registration.pushManager.getSubscription();
          setState((prev) => ({ ...prev, isSubscribed: !!sub }));
        } catch {
          // Ignore errors on initial check
        }
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported || !vapidPublicKey) {
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const sub = subscription.toJSON();
      const subBody = {
        userId: "", // Will be populated by the caller if needed
        orgId: "",
        endpoint: sub.endpoint || "",
        keysAuth: sub.keys?.auth || "",
        keysP256dh: sub.keys?.p256dh || "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      };

      // SECURITY (Phase 17): Pull user/org ids from in-memory store (hydrated
      // from /api/auth/me via signed cookies) — NOT from localStorage.
      try {
        const stateSnapshot = useValtrioxStore.getState();
        const user = stateSnapshot.user;
        const org = stateSnapshot.organization;
        if (user?.id) subBody.userId = user.id;
        if (org?.id) subBody.orgId = org.id;
      } catch {
        // Ignore store read errors
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subBody),
      });

      if (!res.ok) {
        throw new Error("Failed to save subscription");
      }

      setState((prev) => ({ ...prev, isSubscribed: true, isLoading: false }));
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [isSupported, vapidPublicKey]);

  // Auto-subscribe if permission already granted but no subscription
  useEffect(() => {
    if (isSupported && permission === "granted" && !isSubscribed && !isLoading) {
      Promise.resolve().then(() => {
        void subscribe();
      });
    }
  }, [isSupported, permission, isSubscribed, isLoading, subscribe]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return "denied";
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const permissionResult = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission: permissionResult, isLoading: false }));

      if (permissionResult === "granted") {
        await subscribe();
      }

      return permissionResult;
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
      return "denied";
    }
  }, [isSupported, subscribe]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Tell server to remove
        const sub = subscription.toJSON();
        if (sub.endpoint) {
          await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
            method: "DELETE",
          }).catch(() => {
            // Ignore server cleanup errors
          });
        }
      }

      setState((prev) => ({ ...prev, isSubscribed: false, isLoading: false }));
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [isSupported]);

  const sendTestNotification = useCallback(async (title?: string, body?: string) => {
    if (!isSupported || !isSubscribed) {
      return;
    }

    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Valtriox Test",
          message: body || "Push notifications are working! 🎉",
          url: "/",
        }),
      });

      await res.json();
      return;
    } catch {
      return;
    }
  }, [isSupported, isSubscribed]);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}

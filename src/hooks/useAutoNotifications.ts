"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { useNotificationStore, type NotificationItem } from "@/store/notification-store";

// ── Types ──

interface UseAutoNotificationsOptions {
  /** Organization ID to poll notifications for */
  orgId?: string | null;
  /** User ID to filter notifications */
  userId?: string | null;
  /** Polling interval in milliseconds (default: 30000 = 30 seconds) */
  intervalMs?: number;
  /** Whether to show Sonner toasts for new notifications (default: true) */
  showToast?: boolean;
}

interface NotifRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
}

// ── Hook ──

export function useAutoNotifications({
  orgId,
  userId,
  intervalMs = 30000,
  showToast = true,
}: UseAutoNotificationsOptions) {
  const shownIdsRef = useRef<Set<string>>(new Set());
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const [shownCount, setShownCount] = useState(0);

  const { fetchNotifications, addNotification, notifications } = useNotificationStore();

  // Initialize shown IDs with current notifications to avoid duplicate toasts on mount
  useEffect(() => {
    if (notifications.length > 0) {
      notifications.forEach((n) => shownIdsRef.current.add(n.id));
    }
  }, []); // Only on mount

  // Map notification type to Sonner toast variant
  const getToastVariant = useCallback((type: string): "success" | "info" | "warning" | "error" => {
    switch (type) {
      case "success":
      case "payment_received":
        return "success";
      case "warning":
      case "low_stock":
        return "warning";
      case "error":
        return "error";
      default:
        return "info";
    }
  }, []);

  // Poll for new notifications
  const poll = useCallback(async () => {
    if (!orgId) return;

    try {
      const params = new URLSearchParams();
      params.set("orgId", orgId);
      if (userId) params.set("userId", userId);

      const res = await fetch(`/api/db-notifications?${params.toString()}`);
      if (!res.ok) return;

      const data = await res.json();
      const items: NotifRecord[] = data.notifications || [];

      for (const item of items) {
        // Skip if already shown
        if (shownIdsRef.current.has(item.id)) continue;

        // Mark as shown
        shownIdsRef.current.add(item.id);
        setShownCount(shownIdsRef.current.size);

        // Add to notification store
        const notifItem: NotificationItem = {
          id: item.id,
          orgId: undefined,
          userId: undefined,
          title: item.title,
          message: item.message,
          type: (item.type as NotificationItem["type"]) || "info",
          read: false,
          createdAt: item.createdAt,
        };
        addNotification(notifItem);

        // Show Sonner toast
        if (showToast && isMountedRef.current) {
          const variant = getToastVariant(item.type);
          const toastOptions: any = {
            description: item.message.length > 120 ? item.message.slice(0, 120) + "…" : item.message,
            duration: 5000,
          };

          switch (variant) {
            case "success":
              toast.success(item.title, toastOptions);
              break;
            case "warning":
              toast.warning(item.title, toastOptions);
              break;
            case "error":
              toast.error(item.title, toastOptions);
              break;
            default:
              toast.info(item.title, toastOptions);
              break;
          }
        }
      }
    } catch (err) {
      // Silently fail - don't spam console on network errors
      console.debug("[AutoNotif] Poll error:", err);
    }
  }, [orgId, userId, showToast, addNotification, getToastVariant]);

  // Start/stop polling
  useEffect(() => {
    if (!orgId) return;
    isMountedRef.current = true;

    // Initial fetch
    poll();

    // Set up polling interval
    pollingRef.current = setInterval(poll, intervalMs);

    return () => {
      isMountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [orgId, poll, intervalMs]);

  return {
    /** Manually trigger a poll */
    poll,
    /** Number of notifications that have been shown as toasts */
    shownCount,
  };
}

"use client";

import { create } from "zustand";

// ── Types ────────────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  orgId?: string;
  userId?: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "order" | "team" | "marketing";
  actionUrl?: string;
  icon?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationStore {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  lastFetched: number | null;

  // Actions
  setNotifications: (notifications: NotificationItem[]) => void;
  addNotification: (notification: NotificationItem) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  setLoading: (loading: boolean) => void;
  fetchNotifications: (orgId?: string, userId?: string) => Promise<void>;
  setLastFetched: (timestamp: number) => void;
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  lastFetched: null,

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount });
  },

  addNotification: (notification) => {
    set((state) => {
      const exists = state.notifications.some((n) => n.id === notification.id);
      if (exists) return state;
      const notifications = [notification, ...state.notifications].slice(0, 50);
      const unreadCount = notifications.filter((n) => !n.read).length;
      return { notifications, unreadCount };
    });
  },

  markAsRead: (id) => {
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      const unreadCount = notifications.filter((n) => !n.read).length;
      return { notifications, unreadCount };
    });

    // Fire-and-forget API call
    fetch(`/api/db-notifications/${id}`, {
      method: "PUT",
    }).catch(() => {
      // Silently fail - optimistic update already applied
    });
  },

  markAllAsRead: () => {
    const { notifications, unreadCount } = get();
    if (unreadCount === 0) return;

    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));

    // Fire-and-forget API call
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    Promise.allSettled(
      unreadIds.map((id) =>
        fetch(`/api/db-notifications/${id}`, { method: "PUT" })
      )
    ).catch(() => {});
  },

  setLoading: (loading) => set({ loading }),

  setLastFetched: (timestamp) => set({ lastFetched: timestamp }),

  fetchNotifications: async (orgId?: string, userId?: string) => {
    const { loading, lastFetched } = get();

    // Throttle: don't fetch if less than 5 seconds since last fetch
    if (loading) return;
    if (lastFetched && Date.now() - lastFetched < 5000) return;

    set({ loading: true });

    try {
      const params = new URLSearchParams();
      if (orgId) params.set("orgId", orgId);
      if (userId) params.set("userId", userId);
      params.set("limit", "20");

      const res = await fetch(`/api/db-notifications?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      const notifications: NotificationItem[] = (data.notifications || []).map(
        (n: any) => ({
          id: n.id,
          orgId: n.orgId,
          userId: n.userId,
          title: n.title,
          message: n.message,
          type: n.type || "info",
          actionUrl: n.actionUrl,
          icon: n.icon,
          read: n.read || false,
          createdAt: n.createdAt,
        })
      );

      set({
        notifications,
        unreadCount: data.unreadCount || notifications.filter((n: NotificationItem) => !n.read).length,
        lastFetched: Date.now(),
      });
    } catch (err) {
      console.error("[NotificationStore] fetchNotifications error:", err);
    } finally {
      set({ loading: false });
    }
  },
}));

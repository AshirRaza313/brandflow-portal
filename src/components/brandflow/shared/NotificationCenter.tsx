"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCheck,
  Clock,
  ShoppingCart,
  Package,
  AlertTriangle,
  CalendarClock,
  Banknote,
  X,
  Loader2,
  BellOff,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type NotificationType =
  | "new_order"
  | "status_change"
  | "low_stock"
  | "task_due"
  | "payment_received";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  referenceId?: string;
  referenceType?: string;
}

// ── Config ───────────────────────────────────────────────────────────────────

const NOTIFICATION_STYLES: Record<
  NotificationType,
  { icon: React.ReactNode; iconBg: string; dotColor: string }
> = {
  new_order: {
    icon: <ShoppingCart className="h-4 w-4" />,
    iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    dotColor: "bg-amber-500",
  },
  status_change: {
    icon: <Package className="h-4 w-4" />,
    iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    dotColor: "bg-blue-500",
  },
  low_stock: {
    icon: <AlertTriangle className="h-4 w-4" />,
    iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    dotColor: "bg-amber-500",
  },
  task_due: {
    icon: <CalendarClock className="h-4 w-4" />,
    iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    dotColor: "bg-amber-500",
  },
  payment_received: {
    icon: <Banknote className="h-4 w-4" />,
    iconBg: "bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400",
    dotColor: "bg-teal-500",
  },
};

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHr = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Notification Item ────────────────────────────────────────────────────────

function NotificationItem({
  notification,
  onMarkRead,
  isGold,
  isDark,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  isGold: boolean;
  isDark: boolean;
}) {
  const style = NOTIFICATION_STYLES[notification.type];

  return (
    <motion.button
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => !notification.read && onMarkRead(notification.id)}
      className={cn(
        "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all group",
        notification.read
          ? isDark
            ? "hover:bg-white/[0.03]"
            : "hover:bg-slate-50"
          : isGold
            ? "bg-amber-500/[0.06] hover:bg-amber-500/[0.1]"
            : isDark
              ? "bg-amber-500/[0.06] hover:bg-amber-500/[0.1]"
              : "bg-amber-50/60 hover:bg-amber-50"
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center mt-0.5 transition-colors",
          style.iconBg
        )}
      >
        {style.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "text-sm truncate leading-tight",
              notification.read
                ? isDark
                  ? "text-slate-400"
                  : "text-slate-500"
                : isDark
                  ? "text-slate-100 font-semibold"
                  : "text-slate-900 font-semibold"
            )}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <span className={cn("flex-shrink-0 h-2 w-2 rounded-full", style.dotColor)} />
          )}
        </div>
        <p
          className={cn(
            "text-xs mt-1 line-clamp-2 leading-relaxed",
            isDark ? "text-slate-400" : "text-slate-500"
          )}
        >
          {notification.description}
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <Clock className={cn("h-3 w-3", isDark ? "text-slate-400" : "text-slate-300")} />
          <span className={cn("text-[11px]", isDark ? "text-slate-400" : "text-slate-400")}>
            {getRelativeTime(notification.timestamp)}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────

function EmptyNotifications({ isDark }: { isDark: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div
        className={cn(
          "h-14 w-14 rounded-2xl flex items-center justify-center mb-4",
          isDark ? "bg-white/[0.04]" : "bg-slate-100"
        )}
      >
        <BellOff className={cn("h-6 w-6", isDark ? "text-slate-400" : "text-slate-400")} />
      </div>
      <p className={cn("text-sm font-medium", isDark ? "text-slate-300" : "text-slate-700")}>
        All caught up!
      </p>
      <p className={cn("text-xs mt-1 text-center max-w-[200px]", isDark ? "text-slate-400" : "text-slate-500")}>
        No new notifications right now. We&apos;ll let you know when something arrives.
      </p>
    </motion.div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function NotificationCenter() {
  const { organization, appTheme } = useValtrioxStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch notifications when panel opens (both generated and real db notifications)
  const fetchNotifications = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      // Fetch generated notifications and real db notifications in parallel
      const [generatedRes, dbRes] = await Promise.allSettled([
        fetch(`/api/notifications?orgId=${organization.id}`),
        fetch(`/api/db-notifications?orgId=${organization.id}`),
      ]);

      const allNotifications: Notification[] = [];

      // Merge generated notifications
      if (generatedRes.status === "fulfilled" && generatedRes.value.ok) {
        const data = await generatedRes.value.json();
        const generated = (data.notifications || []).map((n: any) => ({
          id: n.id,
          type: (n.type || "new_order") as NotificationType,
          title: n.title,
          description: n.description || n.message || "",
          timestamp: n.timestamp || n.createdAt || new Date().toISOString(),
          read: n.read || false,
          referenceId: n.referenceId,
          referenceType: n.referenceType,
        }));
        allNotifications.push(...generated);
      }

      // Merge real db notifications
      if (dbRes.status === "fulfilled" && dbRes.value.ok) {
        const data = await dbRes.value.json();
        const dbNotifs = (data.notifications || []).map((n: any) => ({
          id: `db_${n.id}`,
          type: (n.type || "new_order") as NotificationType,
          title: n.title,
          description: n.message || "",
          timestamp: n.createdAt || new Date().toISOString(),
          read: n.read || n.isRead || false,
        }));
        allNotifications.push(...dbNotifs);
      }

      // Sort by timestamp descending, deduplicate by title+timestamp
      const seen = new Set<string>();
      const deduped = allNotifications.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).filter((n) => {
        const key = `${n.title}_${n.timestamp}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setNotifications(deduped);
    } catch (err) {
      console.error("Fetch notifications error:", err);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Also check if the bell button was clicked
        const bellBtn = document.getElementById("notification-bell-btn");
        if (bellBtn && bellBtn.contains(e.target as Node)) {
          return; // Let the bell button handler deal with it
        }
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Panel styling
  const panelBg = isGold
    ? "bg-[#12121a] border-amber-500/10"
    : isDark
      ? "bg-[#1a1a2e] border-slate-700/60"
      : "bg-white border-slate-200";

  const headerBorder = isGold ? "border-amber-500/10" : isDark ? "border-slate-700/40" : "border-slate-100";

  return (
    <>
      {/* Bell Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            id="notification-bell-btn"
            variant="ghost"
            size="icon"
            onClick={() => setOpen(!open)}
            className={cn(
              "relative h-8 w-8 rounded-lg transition-colors",
              isDark ? "text-slate-400 hover:text-slate-200 hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100",
              open && (isGold ? "bg-amber-500/10 text-amber-400" : isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600")
            )}
          >
            <Bell className="h-4 w-4" />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none shadow-sm"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ""}
        </TooltipContent>
      </Tooltip>

      {/* Slide-out Panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop (mobile only) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.div
              ref={panelRef}
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={cn(
                "fixed top-0 right-0 h-full z-50 w-[340px] max-w-[90vw] shadow-2xl flex flex-col",
                panelBg,
                "border-l"
              )}
              style={{ borderTop: "none", borderBottom: "none" }}
            >
              {/* Panel Header */}
              <div
                className={cn(
                  "flex items-center justify-between px-5 py-4 border-b",
                  headerBorder
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center",
                      isGold
                        ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/20"
                        : isDark
                          ? "bg-amber-500/15"
                          : "bg-amber-50"
                    )}
                  >
                    <Bell
                      className={cn(
                        "h-4 w-4",
                        isGold ? "text-amber-400" : isDark ? "text-amber-400" : "text-amber-600"
                      )}
                    />
                  </div>
                  <div>
                    <h3
                      className={cn(
                        "text-sm font-bold",
                        isDark ? "text-slate-100" : "text-slate-900"
                      )}
                    >
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <p className={cn("text-[11px]", isDark ? "text-slate-400" : "text-slate-500")}>
                        {unreadCount} unread
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={markAllRead}
                          className={cn(
                            "h-7 w-7 rounded-lg",
                            isDark
                              ? "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                              : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Mark all as read</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchNotifications}
                        disabled={loading}
                        className={cn(
                          "h-7 w-7 rounded-lg",
                          isDark
                            ? "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Refresh</TooltipContent>
                  </Tooltip>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "h-7 w-7 rounded-lg",
                      isDark
                        ? "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Unread badge bar */}
              {unreadCount > 0 && (
                <div className="px-5 py-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
                      isGold
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        : isDark
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                    )}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {unreadCount} new
                    </span>
                    <button
                      onClick={markAllRead}
                      className={cn(
                        "text-[11px] font-medium transition-colors",
                        isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      Mark all read
                    </button>
                  </div>
                </div>
              )}

              {/* Notification List */}
              <div className="flex-1 overflow-hidden">
                {loading && notifications.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className={cn("h-6 w-6 animate-spin", isDark ? "text-slate-400" : "text-slate-300")} />
                  </div>
                ) : notifications.length === 0 ? (
                  <EmptyNotifications isDark={isDark} />
                ) : (
                  <ScrollArea className="h-full">
                    <div className="p-3 space-y-1">
                      {notifications.map((notif) => (
                        <NotificationItem
                          key={notif.id}
                          notification={notif}
                          onMarkRead={markRead}
                          isGold={isGold}
                          isDark={isDark}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Panel Footer */}
              {notifications.length > 0 && (
                <>
                  <Separator className={cn(headerBorder)} />
                  <div className={cn("px-5 py-3", isDark ? "bg-white/[0.03]" : "bg-slate-50/50")}>
                    <button
                      className={cn(
                        "w-full text-center text-xs font-medium py-2 rounded-lg transition-colors",
                        isDark
                          ? "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      View all notifications
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

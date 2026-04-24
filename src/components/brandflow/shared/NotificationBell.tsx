"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNotificationStore, type NotificationItem } from "@/store/notification-store";
import { useBrandFlowStore, type SidebarSection } from "@/store/brandflow-store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Clock,
  Package,
  Users,
  Megaphone,
  Info,
  AlertTriangle,
  XCircle,
  ShoppingCart,
  CheckCircle2,
  X,
  Loader2,
  BellOff,
  ArrowRight,
  Sparkles,
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

// ── Type Config ──────────────────────────────────────────────────────────────

type NotifType = NotificationItem["type"];

interface TypeConfig {
  icon: React.ReactNode;
  iconBg: string;
  dotColor: string;
  label: string;
}

const TYPE_CONFIG: Record<NotifType, TypeConfig> = {
  info: {
    icon: <Info className="h-4 w-4" />,
    iconBg: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
    dotColor: "bg-sky-500",
    label: "Info",
  },
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
    label: "Success",
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    dotColor: "bg-amber-500",
    label: "Warning",
  },
  error: {
    icon: <XCircle className="h-4 w-4" />,
    iconBg: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
    dotColor: "bg-red-500",
    label: "Error",
  },
  order: {
    icon: <ShoppingCart className="h-4 w-4" />,
    iconBg: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
    dotColor: "bg-sky-500",
    label: "Order",
  },
  team: {
    icon: <Users className="h-4 w-4" />,
    iconBg: "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
    dotColor: "bg-purple-500",
    label: "Team",
  },
  marketing: {
    icon: <Megaphone className="h-4 w-4" />,
    iconBg: "bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400",
    dotColor: "bg-pink-500",
    label: "Marketing",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function NotificationItemCard({
  notification,
  onClick,
  isGold,
  isDark,
}: {
  notification: NotificationItem;
  onClick: (n: NotificationItem) => void;
  isGold: boolean;
  isDark: boolean;
}) {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.info;

  return (
    <motion.button
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => onClick(notification)}
      className={cn(
        "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all group",
        notification.read
          ? isDark
            ? "hover:bg-white/[0.03]"
            : "hover:bg-slate-50"
          : isGold
            ? "bg-amber-500/[0.06] hover:bg-amber-500/[0.1]"
            : isDark
              ? "bg-emerald-500/[0.06] hover:bg-emerald-500/[0.1]"
              : "bg-emerald-50/60 hover:bg-emerald-50"
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center mt-0.5 transition-colors",
          config.iconBg
        )}
      >
        {config.icon}
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
            <span className={cn("flex-shrink-0 h-2 w-2 rounded-full", config.dotColor)} />
          )}
        </div>
        <p
          className={cn(
            "text-xs mt-1 line-clamp-2 leading-relaxed",
            isDark ? "text-slate-500" : "text-slate-400"
          )}
        >
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex items-center gap-1">
            <Clock className={cn("h-3 w-3", isDark ? "text-slate-600" : "text-slate-300")} />
            <span className={cn("text-[11px]", isDark ? "text-slate-600" : "text-slate-400")}>
              {getRelativeTime(notification.createdAt)}
            </span>
          </div>
          {!notification.read && notification.actionUrl && (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-[10px] font-medium",
              isGold ? "text-amber-400" : isDark ? "text-emerald-400" : "text-emerald-600"
            )}>
              <ArrowRight className="h-2.5 w-2.5" />
              View
            </span>
          )}
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
        <BellOff className={cn("h-6 w-6", isDark ? "text-slate-600" : "text-slate-400")} />
      </div>
      <p className={cn("text-sm font-medium", isDark ? "text-slate-300" : "text-slate-700")}>
        All caught up!
      </p>
      <p className={cn("text-xs mt-1 text-center max-w-[200px]", isDark ? "text-slate-500" : "text-slate-400")}>
        No new notifications. We&apos;ll let you know when something arrives.
      </p>
    </motion.div>
  );
}

// ── Main NotificationBell Component ─────────────────────────────────────────

export function NotificationBell() {
  const { organization, user, appTheme, setActiveSection } = useBrandFlowStore();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch notifications on mount and set up polling (every 30 seconds)
  useEffect(() => {
    if (!organization?.id) return;

    fetchNotifications(organization.id, user?.id);

    // Poll every 30 seconds for new notifications
    pollIntervalRef.current = setInterval(() => {
      fetchNotifications(organization.id, user?.id);
    }, 30000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [organization?.id, user?.id, fetchNotifications]);

  // Close panel on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const bellBtn = document.getElementById("push-notification-bell-btn");
        if (bellBtn && bellBtn.contains(e.target as Node)) return;
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open]);

  // Handle notification click: mark as read + navigate to actionUrl
  const handleNotificationClick = useCallback(
    (notification: NotificationItem) => {
      if (!notification.read) {
        markAsRead(notification.id);
      }

      // Navigate based on actionUrl
      if (notification.actionUrl) {
        // Parse actionUrl - could be a section name like "orders" or a URL
        const url = notification.actionUrl;
        if (url.startsWith("/")) {
          // It's a route URL
          window.location.href = url;
        } else {
          // Treat as a section name
          setActiveSection(url as SidebarSection);
        }
        setOpen(false);
      }
    },
    [markAsRead, setActiveSection]
  );

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
    toast.success("All notifications marked as read");
  }, [markAllAsRead]);

  // Panel styling
  const panelBg = isGold
    ? "bg-[#12121a] border-amber-500/10"
    : isDark
      ? "bg-[#1a1a2e] border-slate-700/60"
      : "bg-white border-slate-200";

  const headerBorder = isGold ? "border-amber-500/10" : isDark ? "border-slate-700/40" : "border-slate-100";

  // Animated bell icon when there are unread notifications
  const BellIcon = unreadCount > 0 ? BellRing : Bell;

  return (
    <>
      {/* ── Bell Button ── */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            id="push-notification-bell-btn"
            variant="ghost"
            size="icon"
            onClick={() => setOpen(!open)}
            className={cn(
              "relative h-8 w-8 rounded-lg transition-colors",
              isDark
                ? "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100",
              open &&
                (isGold
                  ? "bg-amber-500/10 text-amber-400"
                  : isDark
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-emerald-50 text-emerald-600")
            )}
          >
            <AnimatePresence mode="wait">
              {unreadCount > 0 && (
                <motion.div
                  key="ring-bell"
                  initial={false}
                  animate={{
                    rotate: [0, 15, -15, 10, -10, 0],
                  }}
                  transition={{
                    duration: 0.6,
                    ease: "easeInOut",
                    repeat: 2,
                    repeatDelay: 3,
                  }}
                >
                  <BellIcon className="h-4 w-4" />
                </motion.div>
              )}
              {unreadCount === 0 && (
                <motion.div
                  key="static-bell"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Bell className="h-4 w-4" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Unread badge */}
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className={cn(
                    "absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-white text-[10px] font-bold leading-none shadow-sm",
                    isGold ? "bg-amber-500" : "bg-red-500"
                  )}
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

      {/* ── Slide-out Panel ── */}
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
                "fixed top-0 right-0 h-full z-50 w-[380px] max-w-[92vw] shadow-2xl flex flex-col",
                panelBg,
                "border-l"
              )}
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
                          ? "bg-emerald-500/15"
                          : "bg-emerald-50"
                    )}
                  >
                    <Sparkles
                      className={cn(
                        "h-4 w-4",
                        isGold ? "text-amber-400" : isDark ? "text-emerald-400" : "text-emerald-600"
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
                      <p className={cn("text-[11px]", isDark ? "text-slate-500" : "text-slate-400")}>
                        {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
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
                          onClick={handleMarkAllRead}
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
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
                        isGold
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                          : isDark
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                      {unreadCount} new
                    </span>
                    <button
                      onClick={handleMarkAllRead}
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-medium transition-colors",
                        isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      <Check className="h-3 w-3" />
                      Mark all read
                    </button>
                  </div>
                </div>
              )}

              {/* Notification List */}
              <div className="flex-1 overflow-hidden">
                {loading && notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Loader2
                      className={cn(
                        "h-6 w-6 animate-spin",
                        isGold ? "text-amber-500/50" : isDark ? "text-slate-600" : "text-slate-300"
                      )}
                    />
                    <p className={cn("text-xs", isDark ? "text-slate-500" : "text-slate-400")}>
                      Loading notifications...
                    </p>
                  </div>
                ) : notifications.length === 0 ? (
                  <EmptyNotifications isDark={isDark} />
                ) : (
                  <ScrollArea className="h-full">
                    <div className="p-3 space-y-1">
                      {notifications.map((notif) => (
                        <NotificationItemCard
                          key={notif.id}
                          notification={notif}
                          onClick={handleNotificationClick}
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
                  <div className={cn("px-5 py-3", isDark ? "bg-white/[0.01]" : "bg-slate-50/50")}>
                    <div className="flex items-center justify-center gap-1.5">
                      {loading && (
                        <Loader2 className={cn("h-3 w-3 animate-spin", isDark ? "text-slate-500" : "text-slate-400")} />
                      )}
                      <span className={cn("text-[11px]", isDark ? "text-slate-600" : "text-slate-400")}>
                        Auto-refreshes every 30s
                      </span>
                    </div>
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

"use client";

import { useEffect, useState, useCallback } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  Package,
  Users,
  UserPlus,
  CreditCard,
  CheckCircle,
  Clock,
  Loader2,
  Activity,
  ArrowRight,
  Inbox,
  Rocket,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

// ── Types ──

interface ActivityItem {
  id: string;
  type: "order" | "product" | "customer" | "team" | "payment" | "coupon";
  action: string;
  description: string;
  details: string;
  icon: string;
  timestamp: string;
  actor?: string;
  meta?: Record<string, any>;
}

const iconMap: Record<string, any> = {
  ShoppingBag,
  Package,
  Users,
  UserPlus,
  CreditCard,
  CheckCircle,
  Activity,
};

const typeColorMap: Record<string, { bg: string; text: string; border: string }> = {
  order: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  product: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  customer: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
  team: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
  payment: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  coupon: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/20" },
};

const typeAvatarColors: Record<string, { bg: string; text: string }> = {
  order: { bg: "bg-blue-500/20", text: "text-blue-400" },
  product: { bg: "bg-amber-500/20", text: "text-amber-400" },
  customer: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  team: { bg: "bg-cyan-500/20", text: "text-cyan-400" },
  payment: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  coupon: { bg: "bg-pink-500/20", text: "text-pink-400" },
};

// ── Relative Time Helper ──

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins === 1) return "1 minute ago";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Actor Initials Helper ──

function getActorInitials(actor: string | undefined): string {
  if (!actor) return "?";
  return actor
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Component ──

export function ActivityFeed() {
  const { organization, appTheme, setActiveSection } = useValtrioxStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    const orgId = organization?.id;
    if (!orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/activity-feed?orgId=${encodeURIComponent(orgId)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (err) {
      console.error("Failed to fetch activity feed:", err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const cardClass = isGold
    ? "bg-slate-800/50 border-slate-700/50"
    : isDark
    ? "bg-slate-800/50 border-slate-700/50"
    : "bg-white border-slate-200";

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-400" : "text-muted-foreground";

  return (
    <Card className={cn("transition-all duration-300", cardClass)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className={cn("text-base font-semibold flex items-center gap-2", textPrimary)}>
          <Activity className={cn("h-4 w-4", isGold ? "text-amber-400" : "text-amber-500")} />
          Activity Feed
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "text-xs",
            isGold ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" : "text-amber-600 hover:text-amber-700"
          )}
          onClick={() => setActiveSection("audit-log")}
        >
          View All <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className={cn("h-6 w-6 animate-spin", isGold ? "text-amber-400" : "text-amber-500")} />
          </div>
        ) : activities.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-10 text-center"
          >
            {/* Premium empty state illustration */}
            <div className="relative mb-4">
              <div className={cn(
                "h-16 w-16 rounded-2xl flex items-center justify-center",
                isGold
                  ? "bg-gradient-to-br from-amber-500/10 to-amber-600/5 ring-1 ring-amber-500/10"
                  : isDark
                  ? "bg-slate-800/60"
                  : "bg-slate-100"
              )}>
                <Inbox className={cn("h-8 w-8", isDark ? "text-slate-600" : "text-slate-400")} />
              </div>
              <div className={cn(
                "absolute -top-1 -right-1 h-5 w-5 rounded-md flex items-center justify-center",
                isGold ? "bg-amber-500/10" : "bg-amber-100"
              )}>
                <Rocket className={cn("h-3 w-3", isGold ? "text-amber-400" : "text-amber-600")} />
              </div>
            </div>
            <h3 className={cn("text-sm font-semibold mb-1.5", textPrimary)}>No recent activity</h3>
            <p className={cn("text-xs max-w-[220px] leading-relaxed", textMuted)}>
              Activity will appear here as you manage orders, products, and your team.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "text-xs h-8 gap-1.5",
                  isGold
                    ? "border-amber-500/20 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                    : isDark
                    ? "border-slate-700/50 text-slate-400 hover:bg-white/[0.04]"
                    : ""
                )}
                onClick={() => setActiveSection("orders")}
              >
                <ShoppingBag className="w-3 h-3" />
                Create first order
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
            {activities.map((activity, idx) => {
              const IconComponent = iconMap[activity.icon] || Activity;
              const colors = typeColorMap[activity.type] || typeColorMap.order;
              const avatarColors = typeAvatarColors[activity.type] || typeAvatarColors.order;
              const initials = getActorInitials(activity.actor);

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * idx, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "flex items-start gap-3 p-2.5 rounded-lg transition-colors cursor-pointer group",
                    isDark ? "hover:bg-white/[0.04]" : "hover:bg-slate-50"
                  )}
                  onClick={() => {
                    if (activity.type === "order") setActiveSection("orders");
                    else if (activity.type === "product") setActiveSection("products");
                    else if (activity.type === "customer") setActiveSection("customers");
                    else if (activity.type === "team") setActiveSection("team-management");
                  }}
                >
                  {/* Type icon badge */}
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border transition-all duration-200 group-hover:scale-110",
                    colors.bg,
                    colors.border
                  )}>
                    <IconComponent className={cn("h-3.5 w-3.5", colors.text)} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {activity.actor && (
                        <span className={cn(
                          "inline-flex items-center justify-center h-4 px-1 rounded text-[9px] font-bold flex-shrink-0",
                          avatarColors.bg,
                          avatarColors.text
                        )}>
                          {initials}
                        </span>
                      )}
                      <p className={cn("text-sm font-medium truncate", textPrimary)}>
                        {activity.description}
                      </p>
                    </div>
                    <p className={cn("text-xs truncate mt-0.5", textSecondary)}>
                      {activity.details}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className={cn("h-3 w-3 flex-shrink-0", textMuted)} />
                      <p className={cn("text-[10px]", textMuted)}>
                        {getRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] px-1.5 py-0 border flex-shrink-0 capitalize transition-colors",
                      colors.bg,
                      colors.text,
                      colors.border
                    )}
                  >
                    {activity.type}
                  </Badge>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useBrandFlowStore } from "@/store/brandflow-store";
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
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ── Types ──

interface ActivityItem {
  id: string;
  type: "order" | "product" | "customer" | "team" | "payment" | "coupon";
  action: string;
  description: string;
  details: string;
  icon: string;
  timestamp: string;
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
  product: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  customer: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
  team: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
  payment: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  coupon: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/20" },
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
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Component ──

export function ActivityFeed() {
  const { organization, appTheme, setActiveSection } = useBrandFlowStore();
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
      const res = await fetch(`/api/activity-feed?orgId=${encodeURIComponent(orgId)}&limit=20`);
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
    ? "bg-white/[0.03] border-white/[0.06]"
    : isDark
    ? "bg-white/[0.03] border-white/[0.06]"
    : "bg-white border-slate-200";

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-500" : "text-muted-foreground";

  return (
    <Card className={cn("transition-all duration-300", cardClass)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className={cn("text-base font-semibold flex items-center gap-2", textPrimary)}>
          <Activity className={cn("h-4 w-4", isGold ? "text-amber-400" : "text-emerald-500")} />
          Activity Feed
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "text-xs",
            isGold ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" : "text-emerald-600 hover:text-emerald-700"
          )}
          onClick={() => setActiveSection("audit-log")}
        >
          View All <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className={cn("h-6 w-6 animate-spin", isGold ? "text-amber-400" : "text-emerald-500")} />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className={cn("h-10 w-10 mb-3", isDark ? "text-slate-700" : "text-slate-300")} />
            <p className={cn("text-sm font-medium", textPrimary)}>No recent activity</p>
            <p className={cn("text-xs mt-1", textMuted)}>
              Activity will appear here as you manage your brand.
            </p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
            {activities.map((activity, idx) => {
              const IconComponent = iconMap[activity.icon] || Activity;
              const colors = typeColorMap[activity.type] || typeColorMap.order;

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * idx }}
                  className={cn(
                    "flex items-start gap-3 p-2.5 rounded-lg transition-colors cursor-pointer",
                    isDark ? "hover:bg-white/[0.04]" : "hover:bg-slate-50"
                  )}
                  onClick={() => {
                    if (activity.type === "order") setActiveSection("orders");
                    else if (activity.type === "product") setActiveSection("products");
                    else if (activity.type === "customer") setActiveSection("customers");
                    else if (activity.type === "team") setActiveSection("team-management");
                  }}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border",
                    colors.bg,
                    colors.border
                  )}>
                    <IconComponent className={cn("h-3.5 w-3.5", colors.text)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium truncate", textPrimary)}>
                      {activity.description}
                    </p>
                    <p className={cn("text-xs truncate", textSecondary)}>
                      {activity.details}
                    </p>
                    <p className={cn("text-[10px] mt-0.5", textMuted)}>
                      {getRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] px-1.5 py-0 border flex-shrink-0 capitalize",
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

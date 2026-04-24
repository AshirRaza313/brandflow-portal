"use client";

import { useEffect, useState, useCallback } from "react";
import { useBrandFlowStore } from "@/store/brandflow-store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  Package,
  TrendingDown,
  Clock,
  Loader2,
  RefreshCw,
  Filter,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ──

type UrgencyLevel = "low" | "medium" | "high" | "critical";

interface StockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  avgDailySales: number;
  daysUntilOutOfStock: number | null;
  urgency: UrgencyLevel;
  category: string | null;
  price: number;
  imageUrl: string | null;
}

interface AlertSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

// ── Urgency Helpers ──

const urgencyConfig: Record<UrgencyLevel, {
  icon: any;
  bg: string;
  text: string;
  border: string;
  dot: string;
  label: string;
  pulse: boolean;
}> = {
  critical: {
    icon: AlertOctagon,
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
    dot: "bg-red-500",
    label: "Critical",
    pulse: true,
  },
  high: {
    icon: AlertTriangle,
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/20",
    dot: "bg-orange-500",
    label: "High",
    pulse: false,
  },
  medium: {
    icon: AlertCircle,
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    dot: "bg-amber-500",
    label: "Medium",
    pulse: false,
  },
  low: {
    icon: Info,
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
    dot: "bg-blue-500",
    label: "Low",
    pulse: false,
  },
};

// ── Component ──

export function StockAlertsPanel() {
  const { organization, appTheme } = useBrandFlowStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel | null>(null);

  const fetchAlerts = useCallback(async () => {
    const orgId = organization?.id;
    if (!orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ orgId });
      if (urgencyFilter) params.set("urgency", urgencyFilter);

      const res = await fetch(`/api/products/stock-alerts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        // Always use unfiltered summary
        if (!urgencyFilter) {
          setSummary(data.summary || null);
        }
      } else {
        toast.error("Failed to load stock alerts");
      }
    } catch (err) {
      console.error("Failed to fetch stock alerts:", err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id, urgencyFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Fetch summary when filter is cleared
  useEffect(() => {
    if (!urgencyFilter && organization?.id) {
      (async () => {
        try {
          const res = await fetch(`/api/products/stock-alerts?orgId=${encodeURIComponent(organization.id)}`);
          if (res.ok) {
            const data = await res.json();
            setSummary(data.summary || null);
          }
        } catch {}
      })();
    }
  }, [urgencyFilter, organization?.id]);

  const cardClass = isGold
    ? "bg-white/[0.03] border-white/[0.06]"
    : isDark
    ? "bg-white/[0.03] border-white/[0.06]"
    : "bg-white border-slate-200";

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-500" : "text-muted-foreground";
  const accentColor = isGold ? "text-amber-400" : "text-emerald-500";

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(urgencyConfig) as UrgencyLevel[]).map((level) => {
            const config = urgencyConfig[level];
            const count = summary[level];
            if (count === 0) return null;
            return (
              <motion.div
                key={level}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * (["critical", "high", "medium", "low"].indexOf(level)) }}
              >
                <Card className={cn(
                  "cursor-pointer transition-all hover:shadow-md border",
                  cardClass,
                  urgencyFilter === level && (isGold ? "border-amber-500/30" : "border-emerald-500/30")
                )} onClick={() => setUrgencyFilter(urgencyFilter === level ? null : level)}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", config.bg, "border", config.border)}>
                        <config.icon className={cn("h-4 w-4", config.text)} />
                      </div>
                      <div className={cn("flex items-center gap-1", config.dot, config.pulse && "animate-pulse")}>
                        <div className="h-2 w-2 rounded-full" />
                      </div>
                    </div>
                    <p className={cn("text-2xl font-bold mt-2", config.text)}>{count}</p>
                    <p className={cn("text-[10px] font-medium uppercase tracking-wider", textMuted)}>{config.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Filter Active Indicator */}
      {urgencyFilter && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-3 py-2 rounded-lg border"
          style={{
            background: urgencyConfig[urgencyFilter].bg,
            borderColor: urgencyConfig[urgencyFilter].border,
          }}
        >
          <span className={cn("text-sm font-medium flex items-center gap-2", urgencyConfig[urgencyFilter].text)}>
            <Filter className="h-3.5 w-3.5" />
            Showing {urgencyFilter} urgency only
          </span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setUrgencyFilter(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </motion.div>
      )}

      {/* Alerts List */}
      <Card className={cn("overflow-hidden", cardClass)}>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className={cn("h-6 w-6 animate-spin", accentColor)} />
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className={cn("h-12 w-12 mb-3", isDark ? "text-slate-700" : "text-slate-300")} />
              <p className={cn("text-sm font-semibold", textPrimary)}>All stock levels healthy</p>
              <p className={cn("text-xs mt-1", textMuted)}>
                {urgencyFilter
                  ? `No ${urgencyFilter} urgency alerts found.`
                  : "No products need restocking attention right now."}
              </p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              <AnimatePresence>
                {alerts.map((alert, idx) => {
                  const config = urgencyConfig[alert.urgency];
                  const IconComponent = config.icon;

                  return (
                    <motion.div
                      key={alert.productId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.03 * idx }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 border-b last:border-b-0 transition-colors",
                        isDark ? "border-white/[0.04]" : "border-slate-100",
                        isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50"
                      )}
                    >
                      {/* Urgency Icon */}
                      <div className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 border",
                        config.bg, config.border
                      )}>
                        <IconComponent className={cn("h-4 w-4", config.text)} />
                      </div>

                      {/* Product Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={cn("text-sm font-medium truncate", textPrimary)}>
                            {alert.productName}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] px-1.5 py-0 border capitalize flex-shrink-0",
                              config.bg, config.text, config.border
                            )}
                          >
                            {alert.urgency}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {alert.category && (
                            <span className={cn("text-[10px]", textMuted)}>{alert.category}</span>
                          )}
                          <span className={cn("text-[10px] font-medium", config.text)}>
                            Stock: {alert.currentStock}
                          </span>
                        </div>
                      </div>

                      {/* Prediction */}
                      <div className="flex-shrink-0 text-right">
                        {alert.daysUntilOutOfStock !== null ? (
                          <>
                            <div className="flex items-center gap-1 justify-end">
                              <Clock className={cn("h-3 w-3", config.text)} />
                              <span className={cn("text-xs font-bold", config.text)}>
                                {alert.daysUntilOutOfStock}d
                              </span>
                            </div>
                            <p className={cn("text-[10px]", textMuted)}>until out</p>
                            <p className={cn("text-[10px]", textMuted)}>
                              ~{alert.avgDailySales}/day
                            </p>
                          </>
                        ) : alert.currentStock === 0 ? (
                          <>
                            <span className={cn("text-xs font-bold text-red-400")}>OUT</span>
                            <p className={cn("text-[10px]", textMuted)}>of stock</p>
                          </>
                        ) : (
                          <>
                            <span className={cn("text-xs font-medium", textSecondary)}>
                              {alert.avgDailySales}/day
                            </span>
                            <p className={cn("text-[10px]", textMuted)}>avg sales</p>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingBag,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ── Types ──

interface DailySummary {
  date: string;
  today: {
    orders: number;
    revenue: number;
    revenueFormatted: string;
    newCustomers: number;
    pendingOrders: number;
    activeOrders: number;
  };
  yesterday: {
    orders: number;
    revenue: number;
    revenueFormatted: string;
    newCustomers: number;
  };
  changes: {
    orders: number;
    revenue: number;
    newCustomers: number;
  };
  topProducts: Array<{
    name: string;
    quantitySold: number;
    revenue: number;
  }>;
  lowStockProducts: Array<{
    id: string;
    name: string;
    stock: number;
    price: number;
  }>;
}

// ── Component ──

export function DailySummaryWidget() {
  const { organization, appTheme } = useValtrioxStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    const orgId = organization?.id;
    if (!orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/reports/daily-summary?orgId=${encodeURIComponent(orgId)}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Failed to fetch daily summary:", err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const cardClass = isGold
    ? "bg-white/[0.03] border-white/[0.06]"
    : isDark
    ? "bg-white/[0.03] border-white/[0.06]"
    : "bg-white border-slate-200";

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-500" : "text-muted-foreground";

  const accentColor = isGold ? "text-amber-400" : "text-amber-500";
  const accentBg = isGold ? "bg-amber-500/10" : "bg-amber-500/10";

  const ChangeIndicator = ({ value }: { value: number }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
      <span className={cn(
        "flex items-center text-[10px] font-medium",
        isPositive ? (isGold ? "text-amber-400" : "text-amber-500") : "text-red-400"
      )}>
        {isPositive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
        {Math.abs(value)}%
      </span>
    );
  };

  if (loading) {
    return (
      <Card className={cn("transition-all duration-300", cardClass)}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className={cn("h-6 w-6 animate-spin", accentColor)} />
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <Card className={cn("transition-all duration-300", cardClass)}>
      <CardHeader className="pb-3">
        <CardTitle className={cn("text-base font-semibold flex items-center gap-2", textPrimary)}>
          <BarChart3 className={cn("h-4 w-4", accentColor)} />
          Daily Summary
          <span className={cn("text-[10px] font-normal ml-auto", textMuted)}>
            {new Date(summary.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Orders */}
          <div className={cn("p-3 rounded-xl", isDark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-slate-50")}>
            <div className="flex items-center justify-between mb-1">
              <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", accentBg)}>
                <ShoppingBag className={cn("h-3.5 w-3.5", accentColor)} />
              </div>
              <ChangeIndicator value={summary.changes.orders} />
            </div>
            <p className={cn("text-lg font-bold", textPrimary)}>{summary.today.orders}</p>
            <p className={cn("text-[10px]", textMuted)}>vs {summary.yesterday.orders} yesterday</p>
          </div>

          {/* Revenue */}
          <div className={cn("p-3 rounded-xl", isDark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-slate-50")}>
            <div className="flex items-center justify-between mb-1">
              <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", accentBg)}>
                <DollarSign className={cn("h-3.5 w-3.5", accentColor)} />
              </div>
              <ChangeIndicator value={summary.changes.revenue} />
            </div>
            <p className={cn("text-lg font-bold", isGold ? "gold-gradient-text" : textPrimary)}>
              {summary.today.revenueFormatted}
            </p>
            <p className={cn("text-[10px]", textMuted)}>vs {summary.yesterday.revenueFormatted} yesterday</p>
          </div>

          {/* New Customers */}
          <div className={cn("p-3 rounded-xl", isDark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-slate-50")}>
            <div className="flex items-center justify-between mb-1">
              <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", accentBg)}>
                <Users className={cn("h-3.5 w-3.5", accentColor)} />
              </div>
              <ChangeIndicator value={summary.changes.newCustomers} />
            </div>
            <p className={cn("text-lg font-bold", textPrimary)}>{summary.today.newCustomers}</p>
            <p className={cn("text-[10px]", textMuted)}>vs {summary.yesterday.newCustomers} yesterday</p>
          </div>
        </div>

        {/* Bottom Row: Top Products + Low Stock */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Top Products */}
          {summary.topProducts.length > 0 && (
            <div className={cn("p-3 rounded-xl", isDark ? "bg-white/[0.02] border border-white/[0.04]" : "bg-slate-50")}>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className={cn("h-3 w-3", accentColor)} />
                <span className={cn("text-[10px] font-semibold uppercase tracking-wider", textMuted)}>Top Products</span>
              </div>
              <div className="space-y-1.5">
                {summary.topProducts.slice(0, 3).map((product, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className={cn("text-xs truncate max-w-[130px]", textSecondary)}>
                      <span className={cn("font-semibold mr-1", textPrimary)}>#{i + 1}</span>
                      {product.name}
                    </span>
                    <span className={cn("text-[10px] font-medium", textMuted)}>
                      x{product.quantitySold}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low Stock Alerts */}
          {summary.lowStockProducts.length > 0 && (
            <div className={cn("p-3 rounded-xl", isDark ? "bg-white/[0.02] border border-white/[0.04]" : "bg-slate-50")}>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3 w-3 text-red-400" />
                <span className={cn("text-[10px] font-semibold uppercase tracking-wider", textMuted)}>Low Stock Alerts</span>
              </div>
              <div className="space-y-1.5">
                {summary.lowStockProducts.slice(0, 3).map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <span className={cn("text-xs truncate max-w-[130px]", textSecondary)}>
                      <span className="text-red-400 font-semibold mr-1">{product.stock}×</span>
                      {product.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active & Pending Summary */}
        <div className={cn("flex items-center gap-4 pt-2 border-t", isDark ? "border-white/[0.06]" : "border-slate-200")}>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span className={cn("text-[10px]", textMuted)}>
              <span className={cn("font-semibold", textPrimary)}>{summary.today.pendingOrders}</span> pending
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-blue-400" />
            <span className={cn("text-[10px]", textMuted)}>
              <span className={cn("font-semibold", textPrimary)}>{summary.today.activeOrders}</span> active orders
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useBrandFlowStore } from "@/store/brandflow-store";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, BarChart3, TrendingUp, ShoppingBag, DollarSign, RotateCcw, Loader2, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

// ── Types ──

interface SalesStats {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  refunds: number;
  refundCount: number;
}

interface DailyBreakdown {
  date: string;
  revenue: number;
  orders: number;
}

interface SalesReportData {
  period: string;
  stats: SalesStats;
  statusBreakdown: Record<string, number>;
  dailyBreakdown: DailyBreakdown[];
  channelBreakdown: Record<string, { count: number; revenue: number }>;
  currency: { code: string; symbol: string };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-500/20 text-yellow-300" },
  confirmed: { label: "Confirmed", color: "bg-blue-500/20 text-blue-300" },
  packing: { label: "Packing", color: "bg-purple-500/20 text-purple-300" },
  dispatched: { label: "Dispatched", color: "bg-orange-500/20 text-orange-300" },
  delivered: { label: "Delivered", color: "bg-emerald-500/20 text-emerald-300" },
  cancelled: { label: "Cancelled", color: "bg-red-500/20 text-red-300" },
  returns: { label: "Returns", color: "bg-amber-500/20 text-amber-300" },
};

const TABS = ["daily", "weekly", "monthly"] as const;

export function SalesReportsPage() {
  const { organization, appTheme } = useBrandFlowStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";
  const accentColor = isGold ? "amber" : "emerald";

  const [activeTab, setActiveTab] = useState<string>("monthly");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<SalesReportData | null>(null);

  const fetchData = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/reports/sales?orgId=${organization.id}&period=${activeTab}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch sales report:", err);
    }
    setLoading(false);
  }, [organization, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    if (!organization?.id) return;
    setExporting(true);
    try {
      const res = await fetchWithAuth(
        `/api/reports/export?type=sales&orgId=${organization.id}&period=${activeTab}`
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sales-report-${activeTab}-${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        toast.error("Failed to export report. Please try again.");
      }
    } catch (err) {
      console.error("Export failed:", err);
    }
    setExporting(false);
  };

  const handleCSVExport = () => {
    if (!data) return;
    try {
      const rows = ["Date,Revenue,Orders"];
      data.dailyBreakdown.forEach((d) => {
        rows.push(`${d.date},${d.revenue},${d.orders}`);
      });
      rows.push("");
      rows.push("Status,Count");
      Object.entries(data.statusBreakdown).sort(([, a], [, b]) => b - a).forEach(([status, count]) => {
        rows.push(`${status},${count}`);
      });
      rows.push("");
      rows.push("Channel,Orders,Revenue");
      Object.entries(data.channelBreakdown).sort(([, a], [, b]) => b.revenue - a.revenue).forEach(([channel, info]) => {
        rows.push(`${channel},${info.count},${info.revenue}`);
      });
      const csv = rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-report-${activeTab}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully!");
    } catch (err) {
      console.error("CSV export failed:", err);
    }
  };

  const sym = data?.currency?.symbol || "Rs.";
  const cardBg = isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const accent = isGold ? "text-amber-400" : "text-emerald-400";
  const accentBg = isGold ? "bg-amber-500/10" : "bg-emerald-500/10";
  const accentBorder = isGold ? "border-amber-500/20" : "border-emerald-500/20";
  const accentTab = isGold ? "border-amber-500 text-amber-400" : "border-emerald-500 text-emerald-400";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl font-bold", textPrimary)}>Sales Reports</h1>
          <p className={cn("text-sm mt-1", textSecondary)}>Detailed sales analytics and trends</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn("gap-2 text-xs", isDark && "border-white/[0.1]")}
              disabled={loading || exporting}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exporting ? "Generating..." : "Export Report"}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExport}>
              <FileText className="h-4 w-4 mr-2 text-red-400" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCSVExport}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-green-400" />
              Export as CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className={cn(cardBg)}>
              <CardContent className="p-4">
                <div className="h-4 w-20 bg-slate-700/30 rounded animate-pulse mb-2" />
                <div className="h-6 w-28 bg-slate-700/20 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className={cn(cardBg)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className={cn("h-4 w-4", accent)} />
                  <p className={cn("text-xs", textSecondary)}>Total Revenue</p>
                </div>
                <p className={cn("text-xl font-bold", textPrimary)}>{sym} {data?.stats.totalRevenue.toLocaleString() || 0}</p>
              </CardContent>
            </Card>
            <Card className={cn(cardBg)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingBag className={cn("h-4 w-4", accent)} />
                  <p className={cn("text-xs", textSecondary)}>Total Orders</p>
                </div>
                <p className={cn("text-xl font-bold", textPrimary)}>{data?.stats.totalOrders || 0}</p>
              </CardContent>
            </Card>
            <Card className={cn(cardBg)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className={cn("h-4 w-4", accent)} />
                  <p className={cn("text-xs", textSecondary)}>Avg Order Value</p>
                </div>
                <p className={cn("text-xl font-bold", textPrimary)}>{sym} {data?.stats.avgOrderValue.toLocaleString() || 0}</p>
              </CardContent>
            </Card>
            <Card className={cn("border-red-500/20", isDark ? "bg-red-500/5" : "bg-red-50")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw className="h-4 w-4 text-red-400" />
                  <p className="text-xs text-red-400/80">Refunds</p>
                </div>
                <p className={cn("text-xl font-bold text-red-400")}>{sym} {data?.stats.refunds.toLocaleString() || 0}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Period Tabs */}
      <div className={cn("flex flex-wrap gap-1 border-b", isDark ? "border-white/[0.06]" : "border-slate-200")}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab
                ? accentTab
                : isDark
                  ? "border-transparent text-slate-500 hover:text-slate-300"
                  : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <Card className={cn(cardBg)}>
          <CardContent className="flex items-center justify-center py-20">
            <Loader2 className={cn("h-8 w-8 animate-spin", accent)} />
          </CardContent>
        </Card>
      ) : !data || data.stats.totalOrders === 0 ? (
        <Card className={cn(cardBg)}>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center mb-4", accentBg)}>
              <BarChart3 className={cn("h-8 w-8", isDark ? `${accentColor}-400/50` : "text-slate-400/50")} />
            </div>
            <h3 className={cn("text-lg font-semibold", textPrimary, "mb-1")}>No data available</h3>
            <p className={cn("text-sm", textSecondary, "max-w-md")}>Start selling to see your sales reports here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Order Status Breakdown */}
          <Card className={cn(cardBg)}>
            <CardContent className="p-5">
              <h3 className={cn("text-sm font-semibold mb-4", textPrimary)}>Order Status Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(data.statusBreakdown).sort(([, a], [, b]) => b - a).map(([status, count]) => {
                  const pct = data.stats.totalOrders > 0 ? (count / data.stats.totalOrders) * 100 : 0;
                  const statusInfo = STATUS_LABELS[status] || { label: status, color: "bg-slate-500/20 text-slate-300" };
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className="w-20">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", statusInfo.color)}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className={cn("flex-1 h-2 rounded-full overflow-hidden", isDark ? "bg-white/[0.05]" : "bg-slate-100")}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6 }}
                          className={cn("h-full rounded-full", isGold ? "bg-amber-500" : "bg-emerald-500")}
                        />
                      </div>
                      <span className={cn("text-xs font-mono w-8 text-right", textSecondary)}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Channel Breakdown */}
          <Card className={cn(cardBg)}>
            <CardContent className="p-5">
              <h3 className={cn("text-sm font-semibold mb-4", textPrimary)}>Sales by Channel</h3>
              <div className="space-y-3">
                {Object.entries(data.channelBreakdown).sort(([, a], [, b]) => b.revenue - a.revenue).map(([channel, info]) => (
                  <div key={channel} className={cn("p-3 rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-sm font-medium capitalize", textPrimary)}>{channel.replace(/_/g, " ")}</span>
                      <span className={cn("text-sm font-bold", accent)}>{sym} {info.revenue.toLocaleString()}</span>
                    </div>
                    <p className={cn("text-xs", textSecondary)}>{info.count} orders</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Breakdown Chart */}
          <Card className={cn(cardBg, "lg:col-span-2")}>
            <CardContent className="p-5">
              <h3 className={cn("text-sm font-semibold mb-4", textPrimary)}>Revenue Trend</h3>
              <div className="flex items-end gap-1 h-40">
                {data.dailyBreakdown.map((day, i) => {
                  const maxRevenue = Math.max(...data.dailyBreakdown.map((d) => d.revenue), 1);
                  const height = Math.max((day.revenue / maxRevenue) * 100, 2);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className={cn("text-[9px]", textSecondary)}>
                        {day.revenue > 0 ? `${sym}${day.revenue > 999 ? `${(day.revenue / 1000).toFixed(1)}k` : day.revenue}` : ""}
                      </span>
                      <div
                        className={cn(
                          "w-full rounded-t-sm transition-all",
                          day.revenue > 0
                            ? isGold ? "bg-amber-500/70 hover:bg-amber-500" : "bg-emerald-500/70 hover:bg-emerald-500"
                            : isDark ? "bg-white/[0.03]" : "bg-slate-100"
                        )}
                        style={{ height: `${height}%` }}
                        title={`${day.date}: ${sym} ${day.revenue.toLocaleString()}`}
                      />
                      <span className={cn("text-[8px]", textSecondary)}>{day.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

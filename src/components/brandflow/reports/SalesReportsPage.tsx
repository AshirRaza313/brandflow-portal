"use client";

import { useState, useEffect, useCallback } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, BarChart3, TrendingUp, ShoppingBag, DollarSign, RotateCcw, Loader2, Printer, FileSpreadsheet, ChevronDown } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
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
  packing: { label: "Packing", color: "bg-amber-500/20 text-amber-300" },
  dispatched: { label: "Dispatched", color: "bg-orange-500/20 text-orange-300" },
  delivered: { label: "Delivered", color: "bg-amber-500/20 text-amber-300" },
  cancelled: { label: "Cancelled", color: "bg-red-500/20 text-red-300" },
  returns: { label: "Returns", color: "bg-amber-500/20 text-amber-300" },
};

const PIE_COLORS = ["#D4AF37", "#f59e0b", "#ef4444", "#8b5cf6", "#f97316", "#06b6d4", "#ec4899"];

const TABS = ["daily", "weekly", "monthly"] as const;

export function SalesReportsPage() {
  const { organization, appTheme } = useValtrioxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";
  const accentColor = isGold ? "amber" : "emerald";

  const [activeTab, setActiveTab] = useState<string>("monthly");
  const [loading, setLoading] = useState(true);
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

  const handlePrintReport = () => {
    window.print();
    toast.success("Print dialog opened");
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
  const accent = isGold ? "text-amber-400" : "text-amber-400";
  const accentBg = isGold ? "bg-amber-500/10" : "bg-amber-500/10";
  const accentBorder = isGold ? "border-amber-500/20" : "border-amber-500/20";
  const accentTab = isGold ? "border-amber-500 text-amber-400" : "border-amber-500 text-amber-400";

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
              disabled={loading}
            >
              <Download className="h-4 w-4" />
              Export Report
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handlePrintReport}>
              <Printer className="h-4 w-4 mr-2 text-blue-400" />
              Print Report
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
          {/* Order Status Breakdown - PieChart */}
          <Card className={cn(cardBg)}>
            <CardContent className="p-5">
              <h3 className={cn("text-sm font-semibold mb-4", textPrimary)}>Order Status Breakdown</h3>
              <div className="flex items-center gap-6">
                <div className="w-[180px] h-[180px] flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(data.statusBreakdown).sort(([, a], [, b]) => b - a).map(([status, count]) => ({
                          name: (STATUS_LABELS[status] || { label: status }).label,
                          value: count,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {Object.entries(data.statusBreakdown).sort(([, a], [, b]) => b - a).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#1a1a2e" : "#fff",
                          border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: isDark ? "#e2e8f0" : "#1e293b",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  {Object.entries(data.statusBreakdown).sort(([, a], [, b]) => b - a).map(([status, count], i) => {
                    const pct = data.stats.totalOrders > 0 ? (count / data.stats.totalOrders) * 100 : 0;
                    const statusInfo = STATUS_LABELS[status] || { label: status, color: "bg-slate-500/20 text-slate-300" };
                    return (
                      <div key={status} className="flex items-center gap-2.5">
                        <div className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium w-20 flex-shrink-0", statusInfo.color)}>
                          {statusInfo.label}
                        </span>
                        <div className={cn("flex-1 h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/[0.05]" : "bg-slate-100")}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: i * 0.08 }}
                            className={cn("h-full rounded-full")}
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                        </div>
                        <span className={cn("text-xs font-mono w-8 text-right flex-shrink-0", textSecondary)}>{count}</span>
                      </div>
                    );
                  })}
                </div>
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

          {/* Revenue Trend - AreaChart */}
          <Card className={cn(cardBg, "lg:col-span-2")}>
            <CardContent className="p-5">
              <h3 className={cn("text-sm font-semibold mb-4", textPrimary)}>Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.dailyBreakdown} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isGold ? "#f59e0b" : "#D4AF37"} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={isGold ? "#f59e0b" : "#D4AF37"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9"} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => v.slice(5)}
                    tick={{ fontSize: 10, fill: isDark ? "#64748b" : "#94a3b8" }}
                    axisLine={{ stroke: isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: isDark ? "#64748b" : "#94a3b8" }}
                    axisLine={{ stroke: isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0" }}
                    tickLine={false}
                    tickFormatter={(v) => v > 999 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1a1a2e" : "#fff",
                      border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: isDark ? "#e2e8f0" : "#1e293b",
                    }}
                    formatter={(value: number) => [`${sym} ${value.toLocaleString()}`, "Revenue"]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={isGold ? "#f59e0b" : "#D4AF37"}
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    dot={data.dailyBreakdown.length <= 31}
                    activeDot={{ r: 5, fill: isGold ? "#f59e0b" : "#D4AF37", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

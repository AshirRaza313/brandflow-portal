"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useBrandFlowStore } from "@/store/brandflow-store";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { LoadingSkeleton } from "@/components/brandflow/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  Package,
  AlertTriangle,
  Plus,
  UserPlus,
  BarChart3,
  Activity,
  Zap,
  ShoppingBagIcon,
  Clock,
  AlertCircle,
  Database,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { ActivityFeed } from "./ActivityFeed";
import { DailySummaryWidget } from "./DailySummaryWidget";

const defaultPieColors = ["#059669", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];
const goldPieColors = ["#d4a017", "#f5d060", "#b8860b", "#8b6914", "#e8c547", "#c9a227", "#a67c00"];

interface DashboardStats {
  totalRevenue: number;
  revenueChange: number;
  orderCount: number;
  orderChange: number;
  activeOrders: number;
  customerCount: number;
  customerChange: number;
  newCustomers: number;
  conversionRate: number;
  avgOrderValue: number;
  lowStockProducts: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: string;
    customer?: { name: string } | null;
  }>;
  revenueChartData: Array<{ date: string; revenue: number }>;
  orderStatusData: Array<{ name: string; value: number; fill: string }>;
}

const statusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "delivered": return "default" as const;
    case "cancelled": return "destructive" as const;
    case "confirmed":
    case "packing":
    case "dispatched": return "secondary" as const;
    default: return "outline" as const;
  }
};

const statusBadgeClass = (status: string, isGold: boolean) => {
  switch (status.toLowerCase()) {
    case "delivered":
      return isGold
        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
        : "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "cancelled":
      return isGold
        ? "bg-red-500/15 text-red-400 border-red-500/30"
        : "bg-red-100 text-red-700 border-red-200";
    case "confirmed":
      return isGold
        ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
        : "bg-blue-100 text-blue-700 border-blue-200";
    case "packing":
      return isGold
        ? "bg-violet-500/15 text-violet-400 border-violet-500/30"
        : "bg-violet-100 text-violet-700 border-violet-200";
    case "dispatched":
      return isGold
        ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
        : "bg-cyan-100 text-cyan-700 border-cyan-200";
    default:
      return isGold
        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
        : "bg-amber-100 text-amber-700 border-amber-200";
  }
};

function AnimatedCounter({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(value);
  const prevValue = useRef(value);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (prevValue.current === value) return;
    prevValue.current = value;

    let current = 0;
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let step = 0;

    const animate = () => {
      step++;
      current = Math.min(step * increment, value);
      setCount(Math.floor(current));
      if (step < steps) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <span>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

export function DashboardHome() {
  const { setActiveSection, appTheme, brandName, organization } = useBrandFlowStore();
  const t = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || appTheme === "premium-dark";

  const fetchStats = useCallback(async () => {
    const orgId = organization?.id;
    if (!orgId) {
      setLoading(false);
      setError("No organization selected. Please complete your profile setup.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithAuth(`/api/dashboard/stats?orgId=${encodeURIComponent(orgId)}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || `Failed to fetch dashboard data (${res.status})`);
      }
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      const msg = err?.message || "Something went wrong while loading dashboard data.";
      setError(msg);
      toast.error("Dashboard Error", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Retry handler
  const handleRetry = () => {
    fetchStats();
  };

  if (loading) return <LoadingSkeleton />;

  // Error state
  const isDbConfigError = error?.includes('DATABASE_URL') || error?.includes('Service temporarily unavailable') || error?.includes('503');

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
            Dashboard
          </h1>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {t("welcomeBack")} {brandName || t("yourBusiness")}.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          {isDbConfigError ? (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5">
              <CardContent className="flex flex-col items-center text-center p-6">
                <Database className="h-10 w-10 text-amber-500 mb-3" />
                <h3 className="text-base font-semibold text-amber-800 dark:text-amber-300 mb-2">Database Not Configured</h3>
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-1">
                  The DATABASE_URL environment variable is missing.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mb-4">
                  Go to Vercel → Project → Settings → Environment Variables and add your DATABASE_URL.
                </p>
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className={`${isGold ? "bg-white/[0.03] border-white/[0.06]" : isDark ? "bg-slate-800/50 border-slate-700/50" : "bg-white border-slate-200"}`}>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-4 ${isGold ? "bg-red-500/10" : "bg-red-50"}`}>
                  <AlertCircle className={`h-7 w-7 ${isGold ? "text-red-400" : "text-red-500"}`} />
                </div>
                <h3 className={`text-base font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                  Unable to Load {t("dashboard")}
                </h3>
                <p className={`text-sm max-w-md mb-5 ${isDark ? "text-slate-400" : "text-muted-foreground"}`}>
                  {error}
                </p>
                <Button
                  onClick={handleRetry}
                  className={`rounded-xl ${isGold ? "btn-gold shadow-[0_0_20px_rgba(212,160,23,0.3)]" : "bg-emerald-600 hover:bg-emerald-700"}`}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> {t("retry")}
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    );
  }

  const quickActions = [
    { label: t("newOrder"), icon: ShoppingBag, section: "orders" as const },
    { label: t("addProduct"), icon: Package, section: "add-product" as const },
    { label: "Create Coupon", icon: Zap, section: "coupons" as const },
    { label: t("viewReports"), icon: BarChart3, section: "sales-reports" as const },
    { label: "Manage Team", icon: UserPlus, section: "team-management" as const },
    { label: t("broadcast"), icon: Activity, section: "broadcasts" as const },
  ];

  const kpis = [
    { title: t("totalRevenue"), value: stats?.totalRevenue || 0, prefix: "Rs. ", change: stats?.revenueChange || 0, icon: DollarSign, format: (v: number) => `Rs. ${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
    { title: t("activeOrders"), value: stats?.activeOrders || 0, change: stats?.orderChange || 0, icon: ShoppingBagIcon, format: (v: number) => v.toString() },
    { title: t("customerCount"), value: stats?.customerCount || 0, change: stats?.customerChange || 0, icon: Users, format: (v: number) => v.toLocaleString() },
    { title: t("conversionRate"), value: stats?.conversionRate || 0, suffix: "%", change: 0, icon: TrendingUp, format: (v: number) => `${v}%` },
    { title: t("avgOrderValue"), value: stats?.avgOrderValue || 0, prefix: "Rs. ", change: 0, icon: BarChart3, format: (v: number) => `Rs. ${v.toFixed(2)}` },
    { title: t("lowStockItems"), value: stats?.lowStockProducts || 0, icon: AlertTriangle, format: (v: number) => v.toString() },
  ];

  // Pie data: use real API data if available, fallback to placeholder
  const pieData = stats?.orderStatusData?.length
    ? stats.orderStatusData
    : [
        { name: "Delivered", value: 1, fill: "#059669" },
        { name: "Pending", value: 1, fill: "#f59e0b" },
        { name: "Confirmed", value: 1, fill: "#3b82f6" },
        { name: "Dispatched", value: 1, fill: "#06b6d4" },
        { name: "Cancelled", value: 1, fill: "#ef4444" },
      ];

  const pieColors = isGold ? goldPieColors : defaultPieColors;
  const chartStroke = isGold ? "#d4a017" : "#059669";
  const chartStopColor = isGold ? "#d4a017" : "#059669";
  const gridStroke = isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0";
  const tickStroke = isDark ? "#64748b" : "#94a3b8";
  const tooltipBg = isDark ? "#1a1a25" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0";
  const tooltipText = isDark ? "#f5f5f5" : "#1e293b";

  const hasRecentOrders = stats?.recentOrders && stats.recentOrders.length > 0;
  const hasRevenueData = stats?.revenueChartData && stats.revenueChartData.some((d) => d.revenue > 0);
  const hasPieData = stats?.orderStatusData && stats.orderStatusData.length > 0 && stats.orderStatusData.some((d) => d.value > 0);

  const formatCurrency = (val: number) => `Rs. ${val.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const formatOrderDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ─── Page Header ─── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
          {t("dashboard")}
        </h1>
        <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {t("welcomeBack")} {brandName || t("yourBusiness")}.
        </p>
      </motion.div>

      {/* ─── 6 KPI Cards ─── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {kpis.map((kpi) => (
          <Card
            key={kpi.title}
            className={`kpi-gold-shimmer relative overflow-hidden transition-all duration-300 ${
              isGold
                ? "bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm border-t-2 border-t-amber-500/30 hover:bg-white/[0.06] hover:border-amber-500/20 hover:shadow-[0_4px_20px_rgba(212,160,23,0.08)]"
                : isDark
                ? "bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:shadow-lg"
                : "bg-white border-slate-200 hover:shadow-lg hover:border-slate-300"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${isGold ? "bg-amber-500/10" : "bg-emerald-100"}`}>
                  <kpi.icon className={`h-4 w-4 ${isGold ? "text-amber-400" : "text-emerald-600"}`} />
                </div>
                {kpi.change !== 0 && (
                  <div className={`flex items-center text-xs font-medium ${kpi.change >= 0 ? (isGold ? "text-amber-400" : "text-emerald-600") : "text-red-500"}`}>
                    {kpi.change >= 0 ? "+" : ""}{kpi.change}%
                  </div>
                )}
              </div>
              <p className={`text-xs mb-1 ${isDark ? "text-slate-400" : "text-muted-foreground"}`}>{kpi.title}</p>
              <p className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                <AnimatedCounter value={kpi.value} prefix={kpi.prefix || ""} suffix={kpi.suffix || ""} />
              </p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* ─── Revenue Chart & Pie Chart ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Revenue Chart */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <Card className={`transition-all duration-300 ${
            isGold
              ? "bg-white/[0.03] border-white/[0.06]"
              : isDark
              ? "bg-slate-800/50 border-slate-700/50"
              : "bg-white border-slate-200"
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-base font-semibold flex items-center justify-between ${isDark ? "text-white" : "text-slate-900"}`}>
                {t("revenueLast7Days")}
                {hasRevenueData && (
                  <span className={`text-xs font-normal ${isDark ? "text-slate-500" : "text-muted-foreground"}`}>
                    Total: {formatCurrency(stats.revenueChartData.reduce((s, d) => s + d.revenue, 0))}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] sm:h-[250px] lg:h-72 flex items-center justify-center">
                {hasRevenueData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.revenueChartData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartStopColor} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={chartStopColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke={tickStroke} />
                      <YAxis tick={{ fontSize: 12 }} stroke={tickStroke} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: `1px solid ${tooltipBorder}`,
                          fontSize: "12px",
                          backgroundColor: tooltipBg,
                          color: tooltipText,
                        }}
                        formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke={chartStroke} strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-12">
                    <BarChart3 className={`h-10 w-10 mb-3 ${isGold ? "text-amber-500/30" : "text-muted-foreground/30"}`} />
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-muted-foreground"}`}>{t("noRevenueData")}</p>
                    <p className={`text-xs ${isDark ? "text-slate-500" : "text-muted-foreground/60"} mt-1`}>{t("noRevenueDesc")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie Chart */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className={`h-full transition-all duration-300 ${
            isGold
              ? "bg-white/[0.03] border-white/[0.06]"
              : isDark
              ? "bg-slate-800/50 border-slate-700/50"
              : "bg-white border-slate-200"
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-base font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{t("orderStatus")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="h-36 w-36 sm:h-44 sm:w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill || pieColors[idx % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: `1px solid ${tooltipBorder}`,
                        fontSize: "12px",
                        backgroundColor: tooltipBg,
                        color: tooltipText,
                      }}
                      formatter={(value: number, name: string) => [`${value} order${value !== 1 ? "s" : ""}`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
                {pieData.map((entry, idx) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.fill || pieColors[idx] }} />
                    <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                      {entry.name}: <span className="font-semibold">{entry.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Quick Actions & Recent Orders ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className={`transition-all duration-300 ${
            isGold
              ? "bg-white/[0.03] border-white/[0.06]"
              : isDark
              ? "bg-slate-800/50 border-slate-700/50"
              : "bg-white border-slate-200"
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-base font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{t("quickActions")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className={`h-auto flex flex-col items-center gap-2 py-4 rounded-xl transition-all duration-200 ${
                    isGold
                      ? "bg-white/[0.05] border-white/[0.08] text-slate-300 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400 hover:shadow-[0_0_15px_rgba(212,160,23,0.1)]"
                      : isDark
                      ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600 hover:text-white"
                      : "border-slate-200 hover:border-transparent bg-emerald-600 hover:bg-emerald-700 text-white hover:text-white"
                  }`}
                  onClick={() => setActiveSection(action.section)}
                >
                  <action.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{action.label}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Orders */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className={`h-full transition-all duration-300 ${
            isGold
              ? "bg-white/[0.03] border-white/[0.06]"
              : isDark
              ? "bg-slate-800/50 border-slate-700/50"
              : "bg-white border-slate-200"
          }`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className={`text-base font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{t("recentOrders")}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className={isGold ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" : "text-emerald-600 hover:text-emerald-700"}
                onClick={() => setActiveSection("orders")}
              >
                {t("viewAll")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              {hasRecentOrders ? (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  <AnimatePresence>
                    {stats.recentOrders.map((order, idx) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * idx }}
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                          isGold ? "hover:bg-white/[0.04]" : isDark ? "hover:bg-slate-700/50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isGold ? "bg-amber-500/10" : "bg-emerald-50"
                          }`}>
                            <ShoppingBag className={`h-4 w-4 ${isGold ? "text-amber-400" : "text-emerald-600"}`} />
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                              #{order.orderNumber}
                            </p>
                            <p className={`text-xs truncate ${isDark ? "text-slate-500" : "text-muted-foreground"}`}>
                              {order.customer?.name || t("noOrderNumber")} · {formatOrderDate(order.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <Badge variant={statusBadgeVariant(order.status)} className={`text-[10px] px-2 py-0 border ${statusBadgeClass(order.status, isGold)}`}>
                            {order.status}
                          </Badge>
                          <span className={`text-xs font-semibold whitespace-nowrap ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                            {formatCurrency(order.total)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-center">
                  <div>
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${isGold ? "bg-amber-500/10" : "bg-muted/50"}`}>
                      <ShoppingBag className={`h-6 w-6 ${isGold ? "text-amber-400/50" : "text-muted-foreground/50"}`} />
                    </div>
                    <h3 className={`text-sm font-semibold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>{t("noOrdersYet")}</h3>
                    <p className={`text-xs max-w-xs mb-3 ${isDark ? "text-slate-400" : "text-muted-foreground"}`}>
                      {t("noOrdersDesc")}
                    </p>
                    <Button
                      size="sm"
                      className={`rounded-xl ${isGold ? "btn-gold shadow-[0_0_20px_rgba(212,160,23,0.3)]" : "bg-emerald-600 hover:bg-emerald-700"}`}
                      onClick={() => setActiveSection("orders")}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> {t("newOrder")}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Daily Summary Widget ─── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <DailySummaryWidget />
      </motion.div>

      {/* ─── Activity Feed / Business Overview ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-1">
          <Card className={`transition-all duration-300 h-full ${
            isGold
              ? "bg-white/[0.03] border-white/[0.06]"
              : isDark
              ? "bg-slate-800/50 border-slate-700/50"
              : "bg-white border-slate-200"
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-base font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{t("businessOverview")}</CardTitle>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="space-y-3">
                  <div className={`p-3 rounded-xl ${isGold ? "bg-white/[0.03] border border-white/[0.06]" : isDark ? "bg-slate-700/30" : "bg-slate-50"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className={`h-3.5 w-3.5 ${isGold ? "text-amber-400" : "text-emerald-600"}`} />
                      <span className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? "text-slate-400" : "text-muted-foreground"}`}>{t("thisMonth")}</span>
                    </div>
                    <p className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{stats.orderCount} {t("ordersLabel")}</p>
                    <p className={`text-xs ${isDark ? "text-slate-500" : "text-muted-foreground"}`}>
                      {formatCurrency(stats.totalRevenue)} {t("revenue")}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${isGold ? "bg-white/[0.03] border border-white/[0.06]" : isDark ? "bg-slate-700/30" : "bg-slate-50"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Users className={`h-3.5 w-3.5 ${isGold ? "text-amber-400" : "text-emerald-600"}`} />
                      <span className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? "text-slate-400" : "text-muted-foreground"}`}>{t("customerGrowth")}</span>
                    </div>
                    <p className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>+{stats.newCustomers} {t("newLabel")}</p>
                    <p className={`text-xs ${isDark ? "text-slate-500" : "text-muted-foreground"}`}>
                      {stats.customerCount} {t("totalCustomers")}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${isGold ? "bg-white/[0.03] border border-white/[0.06]" : isDark ? "bg-slate-700/30" : "bg-slate-50"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className={`h-3.5 w-3.5 ${isGold ? "text-amber-400" : "text-emerald-600"}`} />
                      <span className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? "text-slate-400" : "text-muted-foreground"}`}>{t("performance")}</span>
                    </div>
                    <p className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{stats.conversionRate}% {t("conversion")}</p>
                    <p className={`text-xs ${isDark ? "text-slate-500" : "text-muted-foreground"}`}>
                      {t("avgOrder")}: {formatCurrency(stats.avgOrderValue)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-center">
                  <div>
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${isGold ? "bg-amber-500/10" : "bg-muted/50"}`}>
                      <Clock className={`h-6 w-6 ${isGold ? "text-amber-400/50" : "text-muted-foreground/50"}`} />
                    </div>
                    <h3 className={`text-sm font-semibold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>{t("noActivityYet")}</h3>
                    <p className={`text-xs max-w-xs ${isDark ? "text-slate-400" : "text-muted-foreground"}`}>
                      {t("noActivityDesc")}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Feed */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2">
          <ActivityFeed />
        </motion.div>
      </div>
    </div>
  );
}

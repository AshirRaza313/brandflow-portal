"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useBrandFlowStore } from "@/store/brandflow-store";
import { useTranslation } from "@/lib/i18n";
import { LoadingSkeleton } from "@/components/brandflow/shared/LoadingSkeleton";
import { isPlatformRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ShoppingCart,
  RefreshCw,
  Package,
  Edit3,
  UserPlus,
  UserCog,
  Mail,
  Settings,
  Shield,
  Clock,
  Search,
  Download,
  List,
  LayoutList,
  AlertTriangle,
  RefreshCcw,
  FileText,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

interface AuditEntry {
  id: string;
  action: string;
  description: string;
  user: string;
  timestamp: string;
  module: "orders" | "products" | "customers" | "team" | "settings";
  details: string;
}

interface AuditStats {
  total: number;
  byModule: {
    orders: number;
    products: number;
    customers: number;
    team: number;
    settings: number;
  };
}

// ============================================================================
// Activity type config: icon, color, label
// ============================================================================

const ACTIVITY_CONFIG: Record<
  string,
  { icon: React.ReactNode; colorClass: string; dotColor: string }
> = {
  "order.created": {
    icon: <ShoppingCart className="h-4 w-4" />,
    colorClass: "text-emerald-600 bg-emerald-50 border-emerald-200",
    dotColor: "bg-emerald-500",
  },
  "order.status_changed": {
    icon: <RefreshCw className="h-4 w-4" />,
    colorClass: "text-blue-600 bg-blue-50 border-blue-200",
    dotColor: "bg-blue-500",
  },
  "product.created": {
    icon: <Package className="h-4 w-4" />,
    colorClass: "text-purple-600 bg-purple-50 border-purple-200",
    dotColor: "bg-purple-500",
  },
  "product.updated": {
    icon: <Edit3 className="h-4 w-4" />,
    colorClass: "text-amber-600 bg-amber-50 border-amber-200",
    dotColor: "bg-amber-500",
  },
  "customer.created": {
    icon: <UserPlus className="h-4 w-4" />,
    colorClass: "text-teal-600 bg-teal-50 border-teal-200",
    dotColor: "bg-teal-500",
  },
  "customer.updated": {
    icon: <UserCog className="h-4 w-4" />,
    colorClass: "text-cyan-600 bg-cyan-50 border-cyan-200",
    dotColor: "bg-cyan-500",
  },
  "team.invited": {
    icon: <Mail className="h-4 w-4" />,
    colorClass: "text-indigo-600 bg-indigo-50 border-indigo-200",
    dotColor: "bg-indigo-500",
  },
  "settings.updated": {
    icon: <Settings className="h-4 w-4" />,
    colorClass: "text-slate-600 bg-slate-50 border-slate-200",
    dotColor: "bg-slate-500",
  },
};

// Dark variants for premium-dark theme
const DARK_ACTIVITY_CONFIG: Record<
  string,
  { icon: React.ReactNode; colorClass: string; dotColor: string }
> = {
  "order.created": {
    icon: <ShoppingCart className="h-4 w-4" />,
    colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    dotColor: "bg-emerald-500",
  },
  "order.status_changed": {
    icon: <RefreshCw className="h-4 w-4" />,
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    dotColor: "bg-blue-500",
  },
  "product.created": {
    icon: <Package className="h-4 w-4" />,
    colorClass: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    dotColor: "bg-purple-500",
  },
  "product.updated": {
    icon: <Edit3 className="h-4 w-4" />,
    colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    dotColor: "bg-amber-500",
  },
  "customer.created": {
    icon: <UserPlus className="h-4 w-4" />,
    colorClass: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    dotColor: "bg-teal-500",
  },
  "customer.updated": {
    icon: <UserCog className="h-4 w-4" />,
    colorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    dotColor: "bg-cyan-500",
  },
  "team.invited": {
    icon: <Mail className="h-4 w-4" />,
    colorClass: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    dotColor: "bg-indigo-500",
  },
  "settings.updated": {
    icon: <Settings className="h-4 w-4" />,
    colorClass: "text-slate-400 bg-slate-500/10 border-slate-500/20",
    dotColor: "bg-slate-500",
  },
};

// Module icons for stats cards
const MODULE_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  orders: { icon: <ShoppingCart className="h-4 w-4" />, color: "emerald" },
  products: { icon: <Package className="h-4 w-4" />, color: "purple" },
  customers: { icon: <UserPlus className="h-4 w-4" />, color: "teal" },
  team: { icon: <Mail className="h-4 w-4" />, color: "indigo" },
  settings: { icon: <Settings className="h-4 w-4" />, color: "slate" },
};

// ============================================================================
// Format helpers
// ============================================================================

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatFullTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ============================================================================
// Export to CSV
// ============================================================================

function exportToCSV(activities: AuditEntry[]) {
  if (activities.length === 0) {
    toast.error("No data to export");
    return;
  }

  const headers = ["Timestamp", "User", "Action", "Module", "Description", "Details"];
  const rows = activities.map((a) => [
    formatFullTimestamp(a.timestamp),
    a.user,
    a.action,
    a.module,
    `"${a.description}"`,
    `"${a.details}"`,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success("CSV exported successfully");
}

// ============================================================================
// Access Denied Component
// ============================================================================

function AccessDenied() {
  const { appTheme } = useBrandFlowStore();
  const t = useTranslation();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className={cn(
          "h-20 w-20 rounded-2xl flex items-center justify-center mb-6",
          isGold ? "bg-red-500/10" : "bg-red-50"
        )}
      >
        <Shield
          className={cn(
            "h-10 w-10",
            isGold ? "text-red-400" : "text-red-500"
          )}
        />
      </div>
      <h2
        className={cn(
          "text-2xl font-bold mb-2",
          isDark ? "text-white" : "text-slate-900"
        )}
      >
        {t("accessDenied")}
      </h2>
      <p
        className={cn(
          "text-sm max-w-md mb-6",
          isDark ? "text-slate-400" : "text-muted-foreground"
        )}
      >
        {t("accessDeniedDesc")}
      </p>
      <Badge
        variant="outline"
        className={cn(
          "px-4 py-1.5 text-xs font-semibold",
          isGold
            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
            : "bg-emerald-100 text-emerald-700 border-emerald-200"
        )}
      >
        <Shield className="h-3 w-3 mr-1.5" />
        {t("adminOnly")}
      </Badge>
    </div>
  );
}

// ============================================================================
// Main AuditLogPage Component
// ============================================================================

export function AuditLogPage() {
  const { user, organization, appTheme } = useBrandFlowStore();
  const t = useTranslation();

  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  // ── Access Control ──
  const isAdmin = isPlatformRole(user?.role || "");

  // ── Local state ──
  const [activities, setActivities] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("last30days");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // ── Fetch activities ──
  const fetchActivities = useCallback(async () => {
    const orgId = organization?.id;
    if (!orgId) {
      setLoading(false);
      setError("No organization selected.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        orgId,
        module: moduleFilter,
        dateRange,
        search: searchQuery,
        page: page.toString(),
        limit: "20",
      });

      const res = await fetch(`/api/admin/audit-log?${params}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || `Failed to fetch (${res.status})`);
      }
      const data = await res.json();
      setActivities(data.activities || []);
      setStats(data.stats || null);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err: any) {
      console.error("Audit log fetch error:", err);
      setError(err?.message || "Failed to load activity log.");
      toast.error("Audit Log Error", { description: err?.message });
    } finally {
      setLoading(false);
    }
  }, [organization?.id, moduleFilter, dateRange, searchQuery, page]);

  useEffect(() => {
    if (isAdmin) fetchActivities();
  }, [fetchActivities, isAdmin]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [moduleFilter, dateRange, searchQuery]);

  if (!isAdmin) return <AccessDenied />;
  if (loading) return <LoadingSkeleton />;

  // ── Error state ──
  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1
            className={cn(
              "text-xl sm:text-2xl font-bold",
              isDark ? "text-white" : "text-slate-900"
            )}
          >
            {t("auditLogTitle")}
          </h1>
          <p className={cn("text-sm mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
            {t("auditLogDesc")}
          </p>
        </motion.div>
        <Card
          className={cn(
            isGold
              ? "bg-white/[0.03] border-white/[0.06]"
              : isDark
              ? "bg-slate-800/50 border-slate-700/50"
              : "bg-white border-slate-200"
          )}
        >
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className={cn(
                "h-14 w-14 rounded-2xl flex items-center justify-center mb-4",
                isGold ? "bg-red-500/10" : "bg-red-50"
              )}
            >
              <AlertTriangle
                className={cn("h-7 w-7", isGold ? "text-red-400" : "text-red-500")}
              />
            </div>
            <h3
              className={cn(
                "text-base font-semibold mb-2",
                isDark ? "text-white" : "text-slate-900"
              )}
            >
              {t("error")}
            </h3>
            <p className={cn("text-sm max-w-md mb-5", isDark ? "text-slate-400" : "text-muted-foreground")}>
              {error}
            </p>
            <Button
              onClick={fetchActivities}
              className={cn(
                "rounded-xl",
                isGold
                  ? "btn-gold shadow-[0_0_20px_rgba(212,160,23,0.3)]"
                  : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              <RefreshCcw className="mr-2 h-4 w-4" /> {t("retry")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getConfig = (action: string) =>
    isDark ? DARK_ACTIVITY_CONFIG[action] || DARK_ACTIVITY_CONFIG["settings.updated"] : ACTIVITY_CONFIG[action] || ACTIVITY_CONFIG["settings.updated"];

  // ── Pagination numbers ──
  const getVisiblePages = () => {
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ─── Page Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h1 className={cn("text-xl sm:text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>
            {t("auditLogTitle")}
          </h1>
          <p className={cn("text-sm mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
            {t("auditLogDesc")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchActivities}
            className={cn(
              "rounded-lg",
              isGold
                ? "bg-white/[0.05] border-white/[0.08] text-slate-300 hover:bg-amber-500/10 hover:border-amber-500/30"
                : isDark
                ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                : "border-slate-200 hover:bg-slate-50"
            )}
          >
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
            {t("refresh")}
          </Button>
          <Button
            size="sm"
            onClick={() => exportToCSV(activities)}
            className={cn(
              "rounded-lg",
              isGold
                ? "btn-gold shadow-[0_0_15px_rgba(212,160,23,0.2)]"
                : "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {t("exportCSV")}
          </Button>
        </div>
      </motion.div>

      {/* ─── Stats Cards ─── */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          <Card className={cn(
            "transition-all",
            isGold ? "bg-white/[0.03] border-white/[0.06]" : isDark ? "bg-slate-800/50 border-slate-700/50" : "bg-white border-slate-200"
          )}>
            <CardContent className="p-3 text-center">
              <p className={cn("text-xs mb-1", isDark ? "text-slate-400" : "text-muted-foreground")}>{t("totalItems")}</p>
              <p className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>{stats.total}</p>
            </CardContent>
          </Card>
          {Object.entries(stats.byModule).map(([mod, count]) => {
            const modIcon = MODULE_ICONS[mod];
            return (
              <Card key={mod} className={cn(
                "transition-all",
                isGold ? "bg-white/[0.03] border-white/[0.06]" : isDark ? "bg-slate-800/50 border-slate-700/50" : "bg-white border-slate-200"
              )}>
                <CardContent className="p-3 flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-md", isGold ? "bg-white/[0.06]" : "bg-slate-50")}>
                    {modIcon?.icon}
                  </div>
                  <div>
                    <p className={cn("text-[10px] uppercase tracking-wider", isDark ? "text-slate-500" : "text-muted-foreground")}>
                      {t(`module${mod.charAt(0).toUpperCase() + mod.slice(1)}`)}
                    </p>
                    <p className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>{count}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>
      )}

      {/* ─── Filters Bar ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className={cn(
          "transition-all",
          isGold ? "bg-white/[0.03] border-white/[0.06]" : isDark ? "bg-slate-800/50 border-slate-700/50" : "bg-white border-slate-200"
        )}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none", isDark ? "text-slate-500" : "text-slate-400")} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("searchActivity")}
                  className={cn(
                    "pl-8 h-9 text-sm",
                    isGold
                      ? "bg-white/[0.05] border-white/[0.08] text-slate-200 placeholder:text-slate-600 focus-visible:ring-amber-500/30 focus-visible:border-amber-500/30"
                      : isDark
                      ? "bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
                      : ""
                  )}
                />
              </div>

              {/* Module Filter */}
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className={cn("w-full sm:w-[160px] h-9 text-sm", isGold ? "bg-white/[0.05] border-white/[0.08] text-slate-300" : isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "")}>
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allModules")}</SelectItem>
                  <SelectItem value="orders">{t("moduleOrders")}</SelectItem>
                  <SelectItem value="products">{t("moduleProducts")}</SelectItem>
                  <SelectItem value="customers">{t("moduleCustomers")}</SelectItem>
                  <SelectItem value="team">{t("moduleTeam")}</SelectItem>
                  <SelectItem value="settings">{t("moduleSettings")}</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range */}
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className={cn("w-full sm:w-[150px] h-9 text-sm", isGold ? "bg-white/[0.05] border-white/[0.08] text-slate-300" : isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "")}>
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{t("today")}</SelectItem>
                  <SelectItem value="last7days">{t("last7Days")}</SelectItem>
                  <SelectItem value="last30days">{t("last30Days")}</SelectItem>
                  <SelectItem value="last90days">{t("last90Days")}</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className={cn("flex rounded-lg border overflow-hidden", isGold ? "border-white/[0.08]" : isDark ? "border-slate-700" : "border-slate-200")}>
                <button
                  onClick={() => setViewMode("timeline")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 h-9 text-xs font-medium transition-colors",
                    viewMode === "timeline"
                      ? isGold
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-emerald-600 text-white"
                      : isDark
                      ? "text-slate-400 hover:bg-slate-700"
                      : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  {t("timelineView")}
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 h-9 text-xs font-medium transition-colors",
                    viewMode === "table"
                      ? isGold
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-emerald-600 text-white"
                      : isDark
                      ? "text-slate-400 hover:bg-slate-700"
                      : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                  {t("tableView")}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Content ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {activities.length === 0 ? (
          <Card className={cn(
            isGold ? "bg-white/[0.03] border-white/[0.06]" : isDark ? "bg-slate-800/50 border-slate-700/50" : "bg-white border-slate-200"
          )}>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center mb-4", isGold ? "bg-white/[0.04]" : "bg-muted/50")}>
                <FileText className={cn("h-7 w-7", isGold ? "text-slate-600" : "text-muted-foreground/50")} />
              </div>
              <h3 className={cn("text-base font-semibold mb-1", isDark ? "text-white" : "text-slate-900")}>
                {t("noActivityFound")}
              </h3>
              <p className={cn("text-sm max-w-md", isDark ? "text-slate-400" : "text-muted-foreground")}>
                {t("noActivityDesc")}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === "timeline" ? (
          /* ── Timeline View ── */
          <Card className={cn(
            isGold ? "bg-white/[0.03] border-white/[0.06]" : isDark ? "bg-slate-800/50 border-slate-700/50" : "bg-white border-slate-200"
          )}>
            <CardContent className="p-4 sm:p-6">
              <div className="relative">
                {/* Vertical line */}
                <div className={cn("absolute left-[18px] top-3 bottom-3 w-[2px]", isGold ? "bg-white/[0.06]" : isDark ? "bg-slate-700" : "bg-slate-100")} />

                <AnimatePresence>
                  <div className="space-y-0">
                    {activities.map((entry, idx) => {
                      const config = getConfig(entry.action);
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.03 * idx }}
                          className="relative flex gap-4 pb-5 last:pb-0"
                        >
                          {/* Dot */}
                          <div className="relative z-10 flex-shrink-0 mt-1">
                            <div className={cn(
                              "h-9 w-9 rounded-full flex items-center justify-center border",
                              config.colorClass
                            )}>
                              {config.icon}
                            </div>
                          </div>

                          {/* Content */}
                          <div className={cn("flex-1 min-w-0 rounded-lg p-3 transition-colors", isGold ? "hover:bg-white/[0.02]" : isDark ? "hover:bg-slate-700/30" : "hover:bg-slate-50")}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-900")}>
                                  {entry.description}
                                </p>
                                <p className={cn("text-xs mt-1", isDark ? "text-slate-500" : "text-muted-foreground")}>
                                  {entry.details}
                                </p>
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={cn("text-[11px] whitespace-nowrap flex-shrink-0 flex items-center gap-1", isDark ? "text-slate-500" : "text-slate-400")}>
                                    <Clock className="h-3 w-3" />
                                    {formatTimestamp(entry.timestamp)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {formatFullTimestamp(entry.timestamp)}
                                </TooltipContent>
                              </Tooltip>
                            </div>

                            {/* Meta row */}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", isGold ? "border-white/[0.08] text-slate-500" : isDark ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500")}>
                                {entry.user}
                              </Badge>
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", isGold ? "border-white/[0.08] text-slate-500" : isDark ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500")}>
                                {t(`module${entry.module.charAt(0).toUpperCase() + entry.module.slice(1)}`)}
                              </Badge>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* ── Table View ── */
          <Card className={cn(
            "overflow-hidden",
            isGold ? "bg-white/[0.03] border-white/[0.06]" : isDark ? "bg-slate-800/50 border-slate-700/50" : "bg-white border-slate-200"
          )}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={cn("border-b", isGold ? "border-white/[0.06]" : isDark ? "border-slate-700" : "border-slate-200")}>
                      <th className={cn("text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-500")}>{t("columnTimestamp")}</th>
                      <th className={cn("text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-500")}>{t("columnUser")}</th>
                      <th className={cn("text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-500")}>{t("columnAction")}</th>
                      <th className={cn("text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell", isDark ? "text-slate-400" : "text-slate-500")}>{t("columnModule")}</th>
                      <th className={cn("text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell", isDark ? "text-slate-400" : "text-slate-500")}>{t("columnDetails")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((entry, idx) => {
                      const config = getConfig(entry.action);
                      return (
                        <motion.tr
                          key={entry.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.02 * idx }}
                          className={cn(
                            "border-b last:border-0 transition-colors",
                            isGold ? "border-white/[0.04] hover:bg-white/[0.02]" : isDark ? "border-slate-700/50 hover:bg-slate-700/20" : "border-slate-100 hover:bg-slate-50"
                          )}
                        >
                          <td className={cn("px-4 py-3 whitespace-nowrap", isDark ? "text-slate-300" : "text-slate-600")}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center gap-1 cursor-default">
                                  <Clock className="h-3 w-3" />
                                  {formatTimestamp(entry.timestamp)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{formatFullTimestamp(entry.timestamp)}</TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{entry.user}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={cn("p-1 rounded-md border flex-shrink-0", config.colorClass)}>
                                {config.icon}
                              </div>
                              <span className={cn("text-xs", isDark ? "text-slate-300" : "text-slate-600")}>
                                {entry.description}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <Badge variant="outline" className={cn("text-[10px] border", isGold ? "border-white/[0.08] text-slate-500" : isDark ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500")}>
                              {t(`module${entry.module.charAt(0).toUpperCase() + entry.module.slice(1)}`)}
                            </Badge>
                          </td>
                          <td className={cn("px-4 py-3 hidden lg:table-cell text-xs max-w-xs truncate", isDark ? "text-slate-500" : "text-slate-400")}>
                            {entry.details}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <p className={cn("text-xs", isDark ? "text-slate-500" : "text-slate-400")}>
            {t("showing")} {(page - 1) * 20 + 1}–{Math.min(page * 20, totalCount)} {t("of")} {totalCount}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className={cn(
                "h-8 px-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40",
                isGold
                  ? "text-slate-400 hover:bg-white/[0.04] hover:text-slate-300"
                  : isDark
                  ? "text-slate-400 hover:bg-slate-700 hover:text-slate-300"
                  : "text-slate-500 hover:bg-slate-100"
              )}
            >
              {t("previous")}
            </button>
            {getVisiblePages().map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  "h-8 w-8 rounded-lg text-xs font-medium transition-colors",
                  p === page
                    ? isGold
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-emerald-600 text-white"
                    : isGold
                    ? "text-slate-400 hover:bg-white/[0.04]"
                    : isDark
                    ? "text-slate-400 hover:bg-slate-700"
                    : "text-slate-500 hover:bg-slate-100"
                )}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className={cn(
                "h-8 px-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40",
                isGold
                  ? "text-slate-400 hover:bg-white/[0.04] hover:text-slate-300"
                  : isDark
                  ? "text-slate-400 hover:bg-slate-700 hover:text-slate-300"
                  : "text-slate-500 hover:bg-slate-100"
              )}
            >
              {t("next")}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

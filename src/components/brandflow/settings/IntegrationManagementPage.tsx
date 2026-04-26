"use client";

import { useState, useEffect, useCallback } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plug,
  RefreshCw,
  Shield,
  Search,
  Eye,
  Unplug,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Smartphone,
  CreditCard,
  ShoppingCart,
  Activity,
  Store,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isPlatformRole } from "@/lib/roles";

// ─── Types ──────────────────────────────────────────────────────────────

interface IntegrationItem {
  orgId: string;
  orgName: string;
  orgEmail: string | null;
  plan: string;
  integrationType: string;
  status: "connected" | "disconnected" | "error" | "pending";
  connectedDate: string;
  lastSynced: string | null;
}

interface IntegrationStats {
  totalConnected: number;
  orgsWithIntegrations: number;
  totalOrganizations: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  mostPopular: string;
}

interface MarketplaceItem {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  connectedOrgs: number;
  status: "active" | "beta" | "coming-soon";
}

// ─── Access Denied ──────────────────────────────────────────────────────

function AccessDenied() {
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme !== "light";

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className={cn("max-w-md w-full", isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200")}>
        <CardContent className="flex flex-col items-center text-center p-8">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-red-500" />
          </div>
          <h2 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>
            Access Denied
          </h2>
          <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
            This page is restricted to platform administrators only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function IntegrationManagementPage() {
  const { user, appTheme } = useValtrioxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  // ── State ──
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [stats, setStats] = useState<IntegrationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationItem | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);

  // ── Access check (hooks cannot be after early return) ──
  const hasAccess = Boolean(user?.role && isPlatformRole(user.role));

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-white/[0.04] border-white/[0.08]" : "bg-white border-slate-200";

  // ─── Fetch integrations ──────────────────────────────────────────────
  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/integrations");
      if (!res.ok) throw new Error("Failed to fetch integration data");
      const data = await res.json();
      setIntegrations(data.integrations || []);
      setStats(data.statistics || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // ─── Admin action handler ────────────────────────────────────────────
  const performAction = useCallback(async (integration: IntegrationItem, action: string) => {
    setSelectedIntegration(integration);
    setSelectedAction(action);
    setActionDialogOpen(true);
  }, []);

  const confirmAction = useCallback(async () => {
    if (!selectedIntegration || !selectedAction) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/integrations/${selectedIntegration.orgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: selectedAction,
          integrationType: selectedIntegration.integrationType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      toast.success(data.message || `Action "${selectedAction}" completed`);
      setActionDialogOpen(false);
      fetchIntegrations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }, [selectedIntegration, selectedAction, fetchIntegrations]);

  // ─── Filter integrations ─────────────────────────────────────────────
  const filteredIntegrations = integrations.filter((item) => {
    if (typeFilter !== "all" && item.integrationType !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.orgName.toLowerCase().includes(q) ||
        item.orgEmail?.toLowerCase().includes(q) ||
        item.integrationType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ─── Helpers ─────────────────────────────────────────────────────────
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      connected: isGold ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-emerald-100 text-emerald-700 border-emerald-200",
      disconnected: isGold ? "bg-slate-500/15 text-slate-400 border-slate-500/25" : "bg-slate-100 text-slate-600 border-slate-200",
      error: isGold ? "bg-red-500/15 text-red-400 border-red-500/25" : "bg-red-100 text-red-700 border-red-200",
      pending: isGold ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" : "bg-yellow-100 text-yellow-700 border-yellow-200",
    };
    const icons: Record<string, React.ReactNode> = {
      connected: <CheckCircle2 className="h-3 w-3 mr-1" />,
      disconnected: <XCircle className="h-3 w-3 mr-1" />,
      error: <AlertTriangle className="h-3 w-3 mr-1" />,
      pending: <Clock className="h-3 w-3 mr-1" />,
    };
    return (
      <Badge variant="outline" className={cn("text-[10px] font-semibold border inline-flex items-center", styles[status] || styles.disconnected)}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, { className: string; icon: React.ReactNode }> = {
      whatsapp: { className: isGold ? "bg-green-500/15 text-green-400 border-green-500/25" : "bg-green-100 text-green-700 border-green-200", icon: <Smartphone className="h-3 w-3 mr-1" /> },
      payments: { className: isGold ? "bg-amber-500/15 text-amber-400 border-amber-500/25" : "bg-amber-100 text-amber-700 border-amber-200", icon: <CreditCard className="h-3 w-3 mr-1" /> },
      ecommerce: { className: isGold ? "bg-purple-500/15 text-purple-400 border-purple-500/25" : "bg-purple-100 text-purple-700 border-purple-200", icon: <ShoppingCart className="h-3 w-3 mr-1" /> },
      analytics: { className: isGold ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/25" : "bg-cyan-100 text-cyan-700 border-cyan-200", icon: <BarChart3 className="h-3 w-3 mr-1" /> },
    };
    const style = styles[type] || styles.whatsapp;
    return (
      <Badge variant="outline" className={cn("text-[10px] font-semibold border inline-flex items-center", style.className)}>
        {style.icon}
        {type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ")}
      </Badge>
    );
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "enterprise":
        return isGold ? "bg-amber-500/15 text-amber-400 border-amber-500/25" : "bg-amber-100 text-amber-800 border-amber-200";
      case "growth":
        return isGold ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-emerald-100 text-emerald-800 border-emerald-200";
      default:
        return isGold ? "bg-white/[0.06] text-slate-400 border-white/[0.08]" : "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  // ─── Marketplace data ────────────────────────────────────────────────
  const marketplaceItems: MarketplaceItem[] = [
    { id: "woocommerce", name: "WooCommerce", category: "E-Commerce", description: "Sync products, orders, and inventory with your WooCommerce store.", icon: <Store className="h-5 w-5" />, connectedOrgs: stats?.byType?.ecommerce || 0, status: "active" },
    { id: "daraz", name: "Daraz", category: "E-Commerce", description: "Connect your Daraz seller account for automated order sync.", icon: <ShoppingCart className="h-5 w-5" />, connectedOrgs: stats?.byType?.ecommerce || 0, status: "active" },
    { id: "shopify", name: "Shopify", category: "E-Commerce", description: "Integrate your Shopify store with real-time data synchronization.", icon: <Layers className="h-5 w-5" />, connectedOrgs: stats?.byType?.ecommerce || 0, status: "beta" },
    { id: "stripe", name: "Stripe", category: "Payments", description: "Accept international card payments securely.", icon: <CreditCard className="h-5 w-5" />, connectedOrgs: stats?.byType?.payments || 0, status: "active" },
    { id: "jazzcash", name: "JazzCash", category: "Payments", description: "Enable JazzCash payments for your customers.", icon: <Smartphone className="h-5 w-5" />, connectedOrgs: stats?.byType?.payments || 0, status: "active" },
    { id: "easypaisa", name: "EasyPaisa", category: "Payments", description: "Process EasyPaisa payments and transfers.", icon: <CreditCard className="h-5 w-5" />, connectedOrgs: stats?.byType?.payments || 0, status: "active" },
    { id: "facebook", name: "Facebook Pixel", category: "Marketing", description: "Track conversions and optimize your Facebook ad campaigns.", icon: <Activity className="h-5 w-5" />, connectedOrgs: 0, status: "beta" },
    { id: "google", name: "Google Analytics", category: "Analytics", description: "Monitor traffic, user behavior, and conversion funnels.", icon: <BarChart3 className="h-5 w-5" />, connectedOrgs: stats?.byType?.analytics || 0, status: "active" },
  ];

  const getMarketplaceStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: isGold ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-emerald-100 text-emerald-700 border-emerald-200",
      beta: isGold ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" : "bg-yellow-100 text-yellow-700 border-yellow-200",
      "coming-soon": isGold ? "bg-slate-500/15 text-slate-400 border-slate-500/25" : "bg-slate-100 text-slate-600 border-slate-200",
    };
    const labels: Record<string, string> = { active: "Active", beta: "Beta", "coming-soon": "Coming Soon" };
    return (
      <Badge variant="outline" className={cn("text-[10px] font-semibold border", styles[status])}>
        {labels[status] || status}
      </Badge>
    );
  };

  // ─── Bar chart config ────────────────────────────────────────────────
  const barChartData = [
    { label: "WhatsApp", value: stats?.byType?.whatsapp || 0, color: "bg-green-500" },
    { label: "Payments", value: stats?.byType?.payments || 0, color: "bg-amber-500" },
    { label: "E-Commerce", value: stats?.byType?.ecommerce || 0, color: "bg-purple-500" },
    { label: "Analytics", value: stats?.byType?.analytics || 0, color: "bg-cyan-500" },
  ];
  const maxBarValue = Math.max(...barChartData.map((d) => d.value), 1);

  // ─── Render ──────────────────────────────────────────────────────────
  if (!hasAccess) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl font-bold", textPrimary)}>
            Integration Management
          </h1>
          <p className={cn("text-sm mt-0.5", textSecondary)}>
            Monitor and manage all platform integrations across organizations
          </p>
        </div>
        <Button variant="outline" onClick={fetchIntegrations} disabled={loading} className="gap-2">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TABS
          ═══════════════════════════════════════════════════════════════════ */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className={cn("flex-wrap", isDark ? "bg-white/[0.04]" : "bg-slate-100")}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="connected">Connected Integrations</TabsTrigger>
          <TabsTrigger value="marketplace">Integration Marketplace</TabsTrigger>
          <TabsTrigger value="logs">Integration Logs</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 1: INTEGRATION OVERVIEW
            ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { title: "Total Connected", value: stats?.totalConnected || 0, icon: <Plug className="h-5 w-5" />, color: "text-amber-500", bgColor: isGold ? "bg-amber-500/10" : "bg-amber-50" },
              { title: "WhatsApp", value: stats?.byType?.whatsapp || 0, icon: <Smartphone className="h-5 w-5" />, color: "text-green-500", bgColor: isGold ? "bg-green-500/10" : "bg-green-50" },
              { title: "Payments", value: stats?.byType?.payments || 0, icon: <CreditCard className="h-5 w-5" />, color: "text-amber-500", bgColor: isGold ? "bg-amber-500/10" : "bg-amber-50" },
              { title: "E-Commerce", value: stats?.byType?.ecommerce || 0, icon: <ShoppingCart className="h-5 w-5" />, color: "text-purple-500", bgColor: isGold ? "bg-purple-500/10" : "bg-purple-50" },
              { title: "Analytics", value: stats?.byType?.analytics || 0, icon: <BarChart3 className="h-5 w-5" />, color: "text-cyan-500", bgColor: isGold ? "bg-cyan-500/10" : "bg-cyan-50" },
            ].map((stat) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className={cn(cardBg)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={cn("text-xs font-medium uppercase tracking-wider", textSecondary)}>{stat.title}</p>
                        <p className={cn("text-2xl font-bold mt-1", textPrimary)}>{stat.value}</p>
                      </div>
                      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", stat.bgColor)}>
                        <span className={stat.color}>{stat.icon}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Bar Chart — Integrations by Type */}
          <Card className={cn(cardBg)}>
            <CardHeader className="pb-3">
              <CardTitle className={cn("text-base font-semibold", textPrimary)}>
                Integrations by Type
              </CardTitle>
              <CardDescription className={textSecondary}>
                Distribution of connected integrations across categories
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className={cn("h-4 w-24 rounded animate-pulse", isDark ? "bg-white/[0.06]" : "bg-slate-200")} />
                      <div className="flex-1 h-8 rounded-md animate-pulse" style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#e2e8f0" }} />
                      <div className={cn("h-4 w-8 rounded animate-pulse", isDark ? "bg-white/[0.06]" : "bg-slate-200")} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {barChartData.map((bar) => (
                    <div key={bar.label} className="flex items-center gap-4">
                      <span className={cn("text-sm font-medium w-24 text-right", textSecondary)}>{bar.label}</span>
                      <div className="flex-1">
                        <div className={cn("h-8 rounded-md overflow-hidden", isDark ? "bg-white/[0.04]" : "bg-slate-100")}>
                          <motion.div
                            className={cn("h-full rounded-md", bar.color)}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max((bar.value / maxBarValue) * 100, bar.value > 0 ? 8 : 0)}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                      <span className={cn("text-sm font-bold w-8 text-right", textPrimary)}>{bar.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick stats */}
              {stats && (
                <div className="mt-6 pt-4 border-t border-white/[0.06]">
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div>
                      <span className={textSecondary}>Orgs with integrations: </span>
                      <span className={cn("font-semibold", textPrimary)}>{stats.orgsWithIntegrations}</span>
                      <span className={textSecondary}> / {stats.totalOrganizations}</span>
                    </div>
                    <div>
                      <span className={textSecondary}>Most popular: </span>
                      <span className={cn("font-semibold", isGold ? "text-amber-400" : "text-amber-600")}>
                        {stats.mostPopular.charAt(0).toUpperCase() + stats.mostPopular.slice(1)}
                      </span>
                    </div>
                    <div>
                      <span className={textSecondary}>With errors: </span>
                      <span className={cn("font-semibold", isGold ? "text-red-400" : "text-red-600")}>{stats.byStatus?.error || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Connected", count: stats?.byStatus?.connected || 0, color: "text-emerald-500", bg: isGold ? "bg-emerald-500/10" : "bg-emerald-50", border: isGold ? "border-emerald-500/20" : "border-emerald-200", icon: <CheckCircle2 className="h-4 w-4" /> },
              { label: "Disconnected", count: stats?.byStatus?.disconnected || 0, color: "text-slate-500", bg: isGold ? "bg-white/[0.04]" : "bg-slate-50", border: isGold ? "border-white/[0.08]" : "border-slate-200", icon: <XCircle className="h-4 w-4" /> },
              { label: "Pending", count: stats?.byStatus?.pending || 0, color: "text-yellow-500", bg: isGold ? "bg-yellow-500/10" : "bg-yellow-50", border: isGold ? "border-yellow-500/20" : "border-yellow-200", icon: <Clock className="h-4 w-4" /> },
              { label: "Error", count: stats?.byStatus?.error || 0, color: "text-red-500", bg: isGold ? "bg-red-500/10" : "bg-red-50", border: isGold ? "border-red-500/20" : "border-red-200", icon: <AlertTriangle className="h-4 w-4" /> },
            ].map((item) => (
              <Card key={item.label} className={cn(cardBg, item.border)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", item.bg)}>
                      <span className={item.color}>{item.icon}</span>
                    </div>
                    <div>
                      <p className={cn("text-xs", textSecondary)}>{item.label}</p>
                      <p className={cn("text-lg font-bold", textPrimary)}>{item.count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 2: CONNECTED INTEGRATIONS
            ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="connected" className="space-y-4">
          <Card className={cn(cardBg)}>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className={cn("text-base font-semibold", textPrimary)}>
                    All Connected Integrations
                  </CardTitle>
                  <CardDescription className={textSecondary}>
                    Showing {filteredIntegrations.length} of {integrations.length} integrations
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search integrations..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className={cn("pl-8 h-9 w-full sm:w-[200px] text-sm", inputBg)}
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className={cn("h-9 w-[140px] text-sm", inputBg)}>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="payments">Payments</SelectItem>
                      <SelectItem value="ecommerce">E-Commerce</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className={isDark ? "border-white/[0.06] hover:bg-transparent" : ""}>
                      <TableHead className="text-xs">Organization</TableHead>
                      <TableHead className="text-xs">Plan</TableHead>
                      <TableHead className="text-xs">Integration Type</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Connected Date</TableHead>
                      <TableHead className="text-xs">Last Synced</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <TableCell key={j} className="py-3">
                              <div className={cn("h-4 w-16 rounded animate-pulse", isDark ? "bg-white/[0.04]" : "bg-slate-200")} />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredIntegrations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Plug className={cn("h-8 w-8", textSecondary)} />
                            <p className={textSecondary}>No integrations found matching your filter.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredIntegrations.map((item, i) => (
                        <motion.tr
                          key={`${item.orgId}-${item.integrationType}`}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className={cn(
                            "border-b transition-colors",
                            isDark ? "border-white/[0.04] hover:bg-white/[0.02]" : "border-slate-100 hover:bg-slate-50"
                          )}
                        >
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0",
                                "bg-gradient-to-br from-amber-500 to-amber-700"
                              )}>
                                {item.orgName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className={cn("text-sm font-medium truncate max-w-[150px]", textPrimary)}>{item.orgName}</p>
                                <p className="text-xs text-slate-400 truncate max-w-[150px]">{item.orgEmail || "—"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge variant="outline" className={cn("text-[10px] font-semibold border", getPlanBadge(item.plan))}>
                              {item.plan.charAt(0).toUpperCase() + item.plan.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3">{getTypeBadge(item.integrationType)}</TableCell>
                          <TableCell className="py-3">{getStatusBadge(item.status)}</TableCell>
                          <TableCell className="py-3">
                            <p className="text-xs text-slate-400">{formatDate(item.connectedDate)}</p>
                          </TableCell>
                          <TableCell className="py-3">
                            <p className="text-xs text-slate-400">{item.lastSynced ? formatDate(item.lastSynced) : "—"}</p>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                title="View Details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {item.status === "connected" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-400"
                                  title="Force Disconnect"
                                  onClick={() => performAction(item, "force-disconnect")}
                                >
                                  <Unplug className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {item.status !== "connected" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-400"
                                  title="Force Enable"
                                  onClick={() => performAction(item, "enable")}
                                >
                                  <Zap className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {item.status === "error" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-orange-500 hover:text-orange-400"
                                  title="Reset Credentials"
                                  onClick={() => performAction(item, "reset-credentials")}
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-2 p-3">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={cn("rounded-lg p-3 animate-pulse", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                      <div className={cn("h-4 w-32 rounded mb-2", isDark ? "bg-white/[0.04]" : "bg-slate-200")} />
                      <div className={cn("h-3 w-24 rounded", isDark ? "bg-white/[0.04]" : "bg-slate-200")} />
                    </div>
                  ))
                ) : filteredIntegrations.map((item) => (
                  <div
                    key={`${item.orgId}-${item.integrationType}`}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      isDark ? "border-white/[0.06] hover:bg-white/[0.02]" : "border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-xs font-bold text-white">
                          {item.orgName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={cn("text-sm font-semibold", textPrimary)}>{item.orgName}</p>
                          <p className="text-[11px] text-slate-400">{item.plan}</p>
                        </div>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeBadge(item.integrationType)}
                      </div>
                      <div className="flex items-center gap-1">
                        {item.status === "connected" && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500 hover:text-red-400 text-xs gap-1"
                            onClick={() => performAction(item, "force-disconnect")}>
                            <Unplug className="h-3 w-3" /> Disconnect
                          </Button>
                        )}
                        {item.status !== "connected" && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-emerald-500 hover:text-emerald-400 text-xs gap-1"
                            onClick={() => performAction(item, "enable")}>
                            <Zap className="h-3 w-3" /> Enable
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 3: INTEGRATION MARKETPLACE
            ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="marketplace" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {marketplaceItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className={cn(cardBg, "hover:shadow-md transition-shadow")}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                        isGold ? "bg-white/[0.06] text-amber-400" : "bg-amber-50 text-amber-600"
                      )}>
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={cn("text-sm font-semibold", textPrimary)}>{item.name}</h3>
                          {getMarketplaceStatusBadge(item.status)}
                        </div>
                        <p className="text-[11px] text-slate-400">{item.category}</p>
                      </div>
                    </div>
                    <p className={cn("text-xs mb-3 line-clamp-2", textSecondary)}>{item.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs", textSecondary)}>
                        <Plug className="h-3 w-3 inline mr-1" />
                        {item.connectedOrgs} connected
                      </span>
                      <Button
                        size="sm"
                        variant={item.status === "coming-soon" ? "ghost" : "outline"}
                        disabled={item.status === "coming-soon"}
                        className="h-7 text-xs gap-1"
                      >
                        {item.status === "coming-soon" ? "Coming Soon" : "Configure"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 4: INTEGRATION LOGS (placeholder)
            ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="logs" className="space-y-4">
          <Card className={cn(cardBg)}>
            <CardHeader className="pb-3">
              <CardTitle className={cn("text-base font-semibold", textPrimary)}>
                Integration Activity Logs
              </CardTitle>
              <CardDescription className={textSecondary}>
                Track integration sync, errors, and configuration changes
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center text-center py-8">
                <div className={cn("h-16 w-16 rounded-full flex items-center justify-center mb-4",
                  isGold ? "bg-white/[0.04]" : "bg-slate-100"
                )}>
                  <Activity className={cn("h-8 w-8", textSecondary)} />
                </div>
                <h3 className={cn("text-base font-semibold mb-2", textPrimary)}>
                  No Activity Yet
                </h3>
                <p className={cn("text-sm max-w-md", textSecondary)}>
                  Integration activity logs will appear here once integrations are connected and actively syncing data.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════
          ACTION CONFIRMATION DIALOG
          ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={cn(textPrimary)}>
              {selectedAction === "force-disconnect" && "Force Disconnect Integration"}
              {selectedAction === "enable" && "Force Enable Integration"}
              {selectedAction === "disable" && "Disable Integration"}
              {selectedAction === "reset-credentials" && "Reset Integration Credentials"}
            </DialogTitle>
            <DialogDescription className={textSecondary}>
              {selectedAction === "force-disconnect" && `Are you sure you want to force-disconnect ${selectedIntegration?.integrationType} for ${selectedIntegration?.orgName}? This will immediately terminate the active connection.`}
              {selectedAction === "enable" && `Force-enable ${selectedIntegration?.integrationType} for ${selectedIntegration?.orgName}? This will override any plan restrictions.`}
              {selectedAction === "disable" && `Disable ${selectedIntegration?.integrationType} for ${selectedIntegration?.orgName}? The organization will lose access to this integration.`}
              {selectedAction === "reset-credentials" && `Reset ${selectedIntegration?.integrationType} credentials for ${selectedIntegration?.orgName}? They will need to re-authenticate.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant={selectedAction === "force-disconnect" || selectedAction === "disable" ? "destructive" : "default"}
              onClick={confirmAction}
              disabled={actionLoading}
              className={cn(
                selectedAction !== "force-disconnect" && selectedAction !== "disable" && "bg-amber-600 hover:bg-amber-700"
              )}
            >
              {actionLoading && <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />}
              {selectedAction === "force-disconnect" && "Disconnect"}
              {selectedAction === "enable" && "Force Enable"}
              {selectedAction === "disable" && "Disable"}
              {selectedAction === "reset-credentials" && "Reset Credentials"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

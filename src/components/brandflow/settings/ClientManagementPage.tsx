"use client";

import { useState, useEffect, useCallback } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Search,
  RefreshCw,
  Building2,
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  Shield,
  Ban,
  Unlock,
  Send,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Clock,
  Mail,
  Phone,
  Globe,
  MapPin,
  UserCog,
  Activity,
  Eye,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Bell,
  FileText,
  CreditCard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isPlatformRole } from "@/lib/roles";

// ─── Types ──────────────────────────────────────────────────────────────

interface ClientListItem {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  plan: string;
  currency: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string; email: string; role: string } | null;
  memberCount: number;
  productCount: number;
  orderCount: number;
  customerCount: number;
  expenseCount: number;
  revenueTotal: number;
  ordersThisMonth: number;
  lastActivity: string;
}

interface ClientDetail {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    plan: string;
    currency: string;
    timezone: string;
    country: string | null;
    religion: string | null;
    brandTagline: string | null;
    brandColor: string | null;
    brandDescription: string | null;
    address: string | null;
    taxId: string | null;
    isActive: boolean;
    isBanned: boolean;
    banReason: string | null;
    bannedAt: string | null;
    paymentRejectionCount: number;
    createdAt: string;
    updatedAt: string;
  };
  stats: {
    memberCount: number;
    productCount: number;
    orderCount: number;
    customerCount: number;
    expenseCount: number;
    taskCount: number;
    couponCount: number;
    revenueTotal: number;
  };
  owner: { id: string; name: string; email: string; role: string } | null;
  teamMembers: Array<{
    id: string;
    userId: string;
    name: string;
    email: string;
    role: string;
    image: string | null;
    joinedAt: string;
    isOwner: boolean;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    channel: string;
    customer: { id: string; name: string; email: string } | null;
    createdAt: string;
  }>;
  subscription: {
    id: string;
    status: string;
    planName: string;
    planId: string;
    billingCycle: string;
    currentPeriodEnd: string | null;
    trialStartsAt: string;
    trialEndsAt: string;
  } | null;
}

interface ClientOrdersResponse {
  organization: { id: string; name: string };
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    subtotal: number;
    discount: number;
    total: number;
    channel: string;
    courier: string | null;
    trackingNumber: string | null;
    customer: { id: string; name: string; email: string; phone: string | null } | null;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  statusCounts: Record<string, number>;
  revenueSummary: {
    totalRevenue: number;
    totalSubtotal: number;
    totalDiscount: number;
  };
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

export function ClientManagementPage() {
  const { user, appTheme } = useValtrioxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  // ── Tab & selection state ──
  const [mainTab, setMainTab] = useState("directory");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // ── Directory state ──
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "revenue" | "orders" | "date">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ── Detail state ──
  const [clientDetail, setClientDetail] = useState<ClientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSubTab, setDetailSubTab] = useState("overview");

  // ── Orders state (for detail view) ──
  const [clientOrders, setClientOrders] = useState<ClientOrdersResponse | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersStatusFilter, setOrdersStatusFilter] = useState("all");

  // ── Dialog state ──
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyType, setNotifyType] = useState("info");
  const [actionLoading, setActionLoading] = useState(false);
  const [planChangeDialogOpen, setPlanChangeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");

  // ── Formatters ──
  const formatCurrency = (amount: number) =>
    `Rs. ${amount.toLocaleString("en-PK", { minimumFractionDigits: 0 })}`;
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });

  // ── Access check flag (hooks cannot be after early return) ──
  const hasAccess = Boolean(user?.role && isPlatformRole(user.role));

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200";

  // ─── Fetch clients (directory) ────────────────────────────────────────
  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/clients");
      if (!res.ok) throw new Error("Failed to fetch clients");
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ─── Fetch client detail ──────────────────────────────────────────────
  const fetchClientDetail = useCallback(async (clientId: string) => {
    setDetailLoading(true);
    setDetailSubTab("overview");
    setOrdersPage(1);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`);
      if (!res.ok) throw new Error("Failed to fetch client details");
      const data = await res.json();
      setClientDetail(data);
      setMainTab("detail");
    } catch (err) {
      toast.error("Failed to load client details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ─── Fetch client orders (paginated) ──────────────────────────────────
  const fetchClientOrders = useCallback(async (clientId: string, page: number, status?: string) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (status && status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/clients/${clientId}/orders?${params}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setClientOrders(data);
    } catch {
      toast.error("Failed to load orders");
    }
  }, []);

  // When detailSubTab changes to orders, fetch orders
  useEffect(() => {
    if (selectedClientId && detailSubTab === "orders") {
      fetchClientOrders(selectedClientId, ordersPage, ordersStatusFilter);
    }
  }, [selectedClientId, detailSubTab, ordersPage, ordersStatusFilter, fetchClientOrders]);

  // ─── Admin action handler ────────────────────────────────────────────
  const performAction = useCallback(async (clientId: string, action: string, extraData?: Record<string, any>) => {
    setActionLoading(true);
    try {
      const body: Record<string, any> = { action };
      if (extraData) Object.assign(body, extraData);
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      toast.success(data.message || `Action "${action}" completed`);
      // Refresh data
      fetchClients();
      if (selectedClientId === clientId) {
        fetchClientDetail(clientId);
      }
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [fetchClients, fetchClientDetail, selectedClientId]);

  // ─── Filter & Sort clients ────────────────────────────────────────────
  const filteredClients = clients
    .filter((c) => {
      if (planFilter !== "all" && c.plan !== planFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.owner?.email?.toLowerCase().includes(q) ||
          c.owner?.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name) * dir;
        case "revenue": return (a.revenueTotal - b.revenueTotal) * dir;
        case "orders": return (a.orderCount - b.orderCount) * dir;
        case "date": return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
        default: return 0;
      }
    });

  // ─── Support clients (banned + suspended) ─────────────────────────────
  const supportClients = clients.filter((c) => !c.isActive || (c as any).isBanned);

  // ─── Plan badge color ────────────────────────────────────────────────
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

  const getStatusBadge = (client: ClientListItem) => {
    if ((client as any).isBanned) return { label: "Banned", className: "bg-red-500/15 text-red-400 border-red-500/25" };
    if (!client.isActive) return { label: "Suspended", className: "bg-orange-500/15 text-orange-400 border-orange-500/25" };
    return { label: "Active", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" };
  };

  const getOrderStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: isGold ? "bg-yellow-500/15 text-yellow-400" : "bg-yellow-100 text-yellow-700",
      confirmed: isGold ? "bg-blue-500/15 text-blue-400" : "bg-blue-100 text-blue-700",
      packing: isGold ? "bg-purple-500/15 text-purple-400" : "bg-purple-100 text-purple-700",
      dispatched: isGold ? "bg-cyan-500/15 text-cyan-400" : "bg-cyan-100 text-cyan-700",
      delivered: isGold ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-100 text-emerald-700",
      cancelled: isGold ? "bg-red-500/15 text-red-400" : "bg-red-100 text-red-700",
    };
    return styles[status] || (isGold ? "bg-slate-500/15 text-slate-400" : "bg-slate-100 text-slate-600");
  };

  // ─── Render ───────────────────────────────────────────────────────────
  if (!hasAccess) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {mainTab === "detail" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setMainTab("directory"); setSelectedClientId(null); setClientDetail(null); }}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <div>
            <h1 className={cn("text-2xl font-bold", textPrimary)}>
              {mainTab === "detail" && clientDetail ? clientDetail.organization.name : "Client Management"}
            </h1>
            <p className={cn("text-sm mt-0.5", textSecondary)}>
              {mainTab === "directory" && "View and manage all platform clients"}
              {mainTab === "detail" && "Client details and management"}
              {mainTab === "support" && "Clients requiring attention"}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchClients} disabled={loading} className="gap-2">
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
          TAB 1: CLIENT DIRECTORY
          ═══════════════════════════════════════════════════════════════════ */}
      {mainTab === "directory" && (
        <Card className={cn(cardBg)}>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className={cn("text-base font-semibold", textPrimary)}>Client Directory</CardTitle>
                <CardDescription className={textSecondary}>
                  Showing {filteredClients.length} of {clients.length} clients
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search clients..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9 w-full sm:w-[200px] text-sm"
                  />
                </div>
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="h-9 w-[130px] text-sm">
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="h-9 w-[130px] text-sm">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Latest</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="orders">Orders</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-9 px-2" onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}>
                  {sortDir === "asc" ? "↑" : "↓"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className={isDark ? "border-white/[0.06] hover:bg-transparent" : ""}>
                    <TableHead className="text-xs">Client</TableHead>
                    <TableHead className="text-xs">Plan</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Owner</TableHead>
                    <TableHead className="text-xs text-right">Revenue</TableHead>
                    <TableHead className="text-xs text-right">Orders</TableHead>
                    <TableHead className="text-xs">Members</TableHead>
                    <TableHead className="text-xs">Joined</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j} className="py-3">
                            <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center">
                        <p className={textSecondary}>No clients found.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client, i) => {
                      const status = getStatusBadge(client);
                      return (
                        <motion.tr
                          key={client.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className={cn(
                            "border-b transition-colors cursor-pointer",
                            isDark ? "border-white/[0.04] hover:bg-white/[0.02]" : "border-slate-100 hover:bg-slate-50"
                          )}
                          onClick={() => { setSelectedClientId(client.id); fetchClientDetail(client.id); }}
                        >
                          <TableCell className="font-medium py-3">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white",
                                "bg-gradient-to-br from-amber-500 to-amber-700"
                              )}>
                                {client.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className={cn("text-sm font-medium truncate max-w-[150px]", textPrimary)}>{client.name}</p>
                                <p className="text-xs text-slate-400 truncate max-w-[150px]">{client.email || "—"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge variant="outline" className={cn("text-[10px] font-semibold border", getPlanBadge(client.plan))}>
                              {client.plan.charAt(0).toUpperCase() + client.plan.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge variant="outline" className={cn("text-[10px] font-semibold border", status.className)}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3">
                            <p className={cn("text-sm", textPrimary)}>{client.owner?.name || "—"}</p>
                            <p className="text-xs text-slate-400">{client.owner?.email || ""}</p>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <p className={cn("text-sm font-semibold", isGold ? "text-amber-400" : "text-amber-600")}>
                              {formatCurrency(client.revenueTotal)}
                            </p>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <p className={cn("text-sm", textPrimary)}>{client.orderCount}</p>
                          </TableCell>
                          <TableCell className="py-3">
                            <p className={cn("text-sm", textPrimary)}>{client.memberCount}</p>
                          </TableCell>
                          <TableCell className="py-3">
                            <p className="text-xs text-slate-400">{formatDate(client.createdAt)}</p>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => { setSelectedClientId(client.id); fetchClientDetail(client.id); }}
                                title="View Details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {!client.isActive && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-400"
                                  onClick={() => performAction(client.id, "activate")}
                                  title="Activate"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {client.isActive && !(client as any).isBanned && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-orange-500 hover:text-orange-400"
                                  onClick={() => performAction(client.id, "suspend")}
                                  title="Suspend"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {(client as any).isBanned ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-400"
                                  onClick={() => performAction(client.id, "unban")}
                                  title="Unban"
                                >
                                  <Unlock className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-400"
                                  onClick={() => { setSelectedClientId(client.id); setBanDialogOpen(true); }}
                                  title="Ban"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2 p-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={cn("rounded-lg p-3 animate-pulse", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                    <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
                    <div className="h-3 w-24 bg-slate-200 rounded" />
                  </div>
                ))
              ) : filteredClients.map((client) => {
                const status = getStatusBadge(client);
                return (
                  <div
                    key={client.id}
                    className={cn(
                      "rounded-lg border p-3 cursor-pointer transition-colors",
                      isDark ? "border-white/[0.06] hover:bg-white/[0.02]" : "border-slate-200 hover:bg-slate-50"
                    )}
                    onClick={() => { setSelectedClientId(client.id); fetchClientDetail(client.id); }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-xs font-bold text-white">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={cn("text-sm font-semibold", textPrimary)}>{client.name}</p>
                          <p className="text-[11px] text-slate-400">{client.owner?.name || "—"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] border", status.className)}>
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{client.plan}</span>
                      <span>{client.orderCount} orders</span>
                      <span>{formatCurrency(client.revenueTotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB 2: CLIENT DETAIL
          ═══════════════════════════════════════════════════════════════════ */}
      {mainTab === "detail" && (
        <>
          {detailLoading ? (
            <div className="space-y-4">
              <div className={cn("h-32 rounded-xl animate-pulse", isDark ? "bg-white/[0.03]" : "bg-slate-100")} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={cn("h-24 rounded-xl animate-pulse", isDark ? "bg-white/[0.03]" : "bg-slate-100")} />
                ))}
              </div>
            </div>
          ) : clientDetail ? (
            <div className="space-y-6">
              {/* ── Client Profile Header ── */}
              <Card className={cn(cardBg)}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-14 w-14 rounded-xl flex items-center justify-center text-xl font-bold text-white shrink-0",
                        "bg-gradient-to-br from-amber-500 to-amber-700"
                      )}>
                        {clientDetail.organization.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className={cn("text-xl font-bold", textPrimary)}>{clientDetail.organization.name}</h2>
                          <Badge variant="outline" className={cn("text-[10px] font-semibold border", getPlanBadge(clientDetail.organization.plan))}>
                            {clientDetail.organization.plan.charAt(0).toUpperCase() + clientDetail.organization.plan.slice(1)}
                          </Badge>
                          {!clientDetail.organization.isActive && (
                            <Badge variant="outline" className="text-[10px] font-semibold border bg-orange-500/15 text-orange-400 border-orange-500/25">
                              Suspended
                            </Badge>
                          )}
                          {clientDetail.organization.isBanned && (
                            <Badge variant="outline" className="text-[10px] font-semibold border bg-red-500/15 text-red-400 border-red-500/25">
                              Banned
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-slate-400">
                          {clientDetail.owner && (
                            <span className={cn("flex items-center gap-1", textSecondary)}>
                              <Users className="h-3 w-3" />
                              {clientDetail.owner.name} ({clientDetail.owner.email})
                            </span>
                          )}
                          {clientDetail.organization.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {clientDetail.organization.email}
                            </span>
                          )}
                          {clientDetail.organization.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {clientDetail.organization.phone}
                            </span>
                          )}
                          {clientDetail.organization.website && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" /> {clientDetail.organization.website}
                            </span>
                          )}
                          {clientDetail.organization.country && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {clientDetail.organization.country}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {clientDetail.organization.isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-orange-500 border-orange-500/30 hover:bg-orange-500/10 gap-1"
                          onClick={() => performAction(clientDetail.organization.id, "suspend")}
                          disabled={actionLoading}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Suspend
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 gap-1"
                          onClick={() => performAction(clientDetail.organization.id, "activate")}
                          disabled={actionLoading}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Activate
                        </Button>
                      )}
                      {clientDetail.organization.isBanned ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 gap-1"
                          onClick={() => performAction(clientDetail.organization.id, "unban")}
                          disabled={actionLoading}
                        >
                          <Unlock className="h-3.5 w-3.5" /> Unban
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 border-red-500/30 hover:bg-red-500/10 gap-1"
                          onClick={() => { setSelectedClientId(clientDetail.organization.id); setBanDialogOpen(true); }}
                          disabled={actionLoading}
                        >
                          <Ban className="h-3.5 w-3.5" /> Ban
                        </Button>
                      )}
                      <Dialog open={planChangeDialogOpen} onOpenChange={setPlanChangeDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1">
                            <CreditCard className="h-3.5 w-3.5" /> Change Plan
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className={textPrimary}>Change Subscription Plan</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-2">
                            <div>
                              <p className={cn("text-sm mb-2", textSecondary)}>
                                Current plan: <span className="font-semibold text-white">{clientDetail.organization.plan}</span>
                              </p>
                              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select new plan" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="starter">Starter</SelectItem>
                                  <SelectItem value="growth">Growth</SelectItem>
                                  <SelectItem value="enterprise">Enterprise</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              onClick={async () => {
                                if (!selectedPlan) return;
                                const ok = await performAction(selectedClientId!, "change-plan", { plan: selectedPlan, planId: selectedPlanId || undefined });
                                if (ok) setPlanChangeDialogOpen(false);
                              }}
                              disabled={actionLoading || !selectedPlan}
                              className="w-full"
                            >
                              {actionLoading ? "Changing..." : "Change Plan"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1">
                            <Send className="h-3.5 w-3.5" /> Notify
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className={textPrimary}>Send Notification</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-2">
                            <Input
                              placeholder="Notification title"
                              value={notifyTitle}
                              onChange={(e) => setNotifyTitle(e.target.value)}
                            />
                            <Textarea
                              placeholder="Notification message"
                              value={notifyMessage}
                              onChange={(e) => setNotifyMessage(e.target.value)}
                              rows={3}
                            />
                            <Select value={notifyType} onValueChange={setNotifyType}>
                              <SelectTrigger>
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="info">Info</SelectItem>
                                <SelectItem value="success">Success</SelectItem>
                                <SelectItem value="warning">Warning</SelectItem>
                                <SelectItem value="error">Error</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={async () => {
                                if (!notifyTitle || !notifyMessage) { toast.error("Title and message required"); return; }
                                const ok = await performAction(selectedClientId!, "send-notification", { title: notifyTitle, message: notifyMessage, type: notifyType });
                                if (ok) { setNotifyDialogOpen(false); setNotifyTitle(""); setNotifyMessage(""); }
                              }}
                              disabled={actionLoading || !notifyTitle || !notifyMessage}
                              className="w-full"
                            >
                              {actionLoading ? "Sending..." : "Send Notification"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Stats Cards ── */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { icon: ShoppingBag, label: "Orders", value: clientDetail.stats.orderCount, color: "text-amber-500" },
                  { icon: DollarSign, label: "Revenue", value: formatCurrency(clientDetail.stats.revenueTotal), color: isGold ? "text-amber-400" : "text-amber-600" },
                  { icon: Package, label: "Products", value: clientDetail.stats.productCount, color: "text-emerald-500" },
                  { icon: Users, label: "Customers", value: clientDetail.stats.customerCount, color: "text-blue-500" },
                  { icon: UserCog, label: "Team", value: clientDetail.stats.memberCount, color: "text-purple-500" },
                ].map((stat, i) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className={cn(cardBg)}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <stat.icon className={cn("h-4 w-4", stat.color)} />
                          <p className={cn("text-[11px] font-medium uppercase tracking-wider", textSecondary)}>{stat.label}</p>
                        </div>
                        <p className={cn("text-xl font-bold", textPrimary)}>{stat.value}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* ── Detail Sub-Tabs ── */}
              <Tabs value={detailSubTab} onValueChange={setDetailSubTab}>
                <TabsList className={cn(isDark ? "bg-white/[0.04]" : "bg-slate-100")}>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="orders">Orders</TabsTrigger>
                  <TabsTrigger value="team">Team</TabsTrigger>
                  <TabsTrigger value="subscription">Subscription</TabsTrigger>
                  <TabsTrigger value="recent-activity">Activity</TabsTrigger>
                </TabsList>

                {/* ── Overview Sub-Tab ── */}
                <TabsContent value="overview" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Org Info */}
                    <Card className={cn(cardBg)}>
                      <CardHeader className="pb-3">
                        <CardTitle className={cn("text-sm font-semibold flex items-center gap-2", textPrimary)}>
                          <Building2 className="h-4 w-4 text-amber-500" />
                          Organization Info
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {[
                          { label: "Slug", value: clientDetail.organization.slug },
                          { label: "Currency", value: clientDetail.organization.currency },
                          { label: "Timezone", value: clientDetail.organization.timezone },
                          { label: "Country", value: clientDetail.organization.country || "—" },
                          { label: "Address", value: clientDetail.organization.address || "—" },
                          { label: "Tax ID", value: clientDetail.organization.taxId || "—" },
                          { label: "Joined", value: formatDate(clientDetail.organization.createdAt) },
                          { label: "Last Updated", value: formatDate(clientDetail.organization.updatedAt) },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center justify-between py-1">
                            <span className={cn("text-xs", textSecondary)}>{item.label}</span>
                            <span className={cn("text-xs font-medium", textPrimary)}>{item.value}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    {/* Billing Security */}
                    <Card className={cn(cardBg)}>
                      <CardHeader className="pb-3">
                        <CardTitle className={cn("text-sm font-semibold flex items-center gap-2", textPrimary)}>
                          <Shield className="h-4 w-4 text-amber-500" />
                          Billing Security
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between py-1">
                          <span className={cn("text-xs", textSecondary)}>Payment Rejections</span>
                          <span className={cn("text-xs font-medium", clientDetail.organization.paymentRejectionCount > 0 ? "text-orange-400" : "text-emerald-400")}>
                            {clientDetail.organization.paymentRejectionCount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className={cn("text-xs", textSecondary)}>Banned</span>
                          <span className={cn("text-xs font-medium", clientDetail.organization.isBanned ? "text-red-400" : "text-emerald-400")}>
                            {clientDetail.organization.isBanned ? "Yes" : "No"}
                          </span>
                        </div>
                        {clientDetail.organization.isBanned && (
                          <>
                            <div className="flex items-center justify-between py-1">
                              <span className={cn("text-xs", textSecondary)}>Ban Reason</span>
                              <span className="text-xs font-medium text-red-400 max-w-[200px] text-right truncate">
                                {clientDetail.organization.banReason || "—"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                              <span className={cn("text-xs", textSecondary)}>Banned At</span>
                              <span className="text-xs font-medium text-red-400">
                                {clientDetail.organization.bannedAt ? formatDate(clientDetail.organization.bannedAt) : "—"}
                              </span>
                            </div>
                          </>
                        )}
                        <Separator className={cn(isDark ? "bg-white/[0.06]" : "bg-slate-200")} />
                        <div className="flex items-center justify-between py-1">
                          <span className={cn("text-xs", textSecondary)}>Active</span>
                          <span className={cn("text-xs font-medium", clientDetail.organization.isActive ? "text-emerald-400" : "text-orange-400")}>
                            {clientDetail.organization.isActive ? "Yes" : "No"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className={cn("text-xs", textSecondary)}>Expenses</span>
                          <span className={cn("text-xs font-medium", textPrimary)}>{clientDetail.stats.expenseCount}</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className={cn("text-xs", textSecondary)}>Tasks</span>
                          <span className={cn("text-xs font-medium", textPrimary)}>{clientDetail.stats.taskCount}</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className={cn("text-xs", textSecondary)}>Coupons</span>
                          <span className={cn("text-xs font-medium", textPrimary)}>{clientDetail.stats.couponCount}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* ── Orders Sub-Tab ── */}
                <TabsContent value="orders" className="mt-4">
                  <Card className={cn(cardBg)}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <CardTitle className={cn("text-sm font-semibold flex items-center gap-2", textPrimary)}>
                            <FileText className="h-4 w-4 text-amber-500" />
                            Client Orders
                          </CardTitle>
                          {clientOrders && (
                            <CardDescription className={textSecondary}>
                              {clientOrders.pagination.total} total orders · {formatCurrency(clientOrders.revenueSummary.totalRevenue)} revenue
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={ordersStatusFilter} onValueChange={(v) => { setOrdersStatusFilter(v); setOrdersPage(1); }}>
                            <SelectTrigger className="h-8 w-[130px] text-xs">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Statuses</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="packing">Packing</SelectItem>
                              <SelectItem value="dispatched">Dispatched</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className={isDark ? "border-white/[0.06] hover:bg-transparent" : ""}>
                              <TableHead className="text-xs">Order #</TableHead>
                              <TableHead className="text-xs">Customer</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs">Channel</TableHead>
                              <TableHead className="text-xs text-right">Total</TableHead>
                              <TableHead className="text-xs">Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {!clientOrders ? (
                              <TableRow>
                                <TableCell colSpan={6} className="py-8 text-center">
                                  <div className="animate-spin h-5 w-5 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-2" />
                                  <p className="text-xs text-slate-400">Loading orders...</p>
                                </TableCell>
                              </TableRow>
                            ) : clientOrders.orders.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="py-8 text-center">
                                  <p className="text-sm text-slate-400">No orders found</p>
                                </TableCell>
                              </TableRow>
                            ) : (
                              clientOrders.orders.map((order) => (
                                <TableRow key={order.id} className={cn(
                                  "border-b transition-colors",
                                  isDark ? "border-white/[0.04] hover:bg-white/[0.02]" : "border-slate-100 hover:bg-slate-50"
                                )}>
                                  <TableCell className="py-2.5">
                                    <p className={cn("text-xs font-mono font-medium", textPrimary)}>#{order.orderNumber}</p>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <p className={cn("text-xs", textPrimary)}>{order.customer?.name || "Walk-in"}</p>
                                    <p className="text-[10px] text-slate-400">{order.customer?.email || ""}</p>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <Badge variant="outline" className={cn("text-[10px] border", getOrderStatusBadge(order.status))}>
                                      {order.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <p className="text-xs text-slate-400">{order.channel}</p>
                                  </TableCell>
                                  <TableCell className="py-2.5 text-right">
                                    <p className={cn("text-xs font-semibold", isGold ? "text-amber-400" : "text-amber-600")}>
                                      {formatCurrency(order.total)}
                                    </p>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <p className="text-[10px] text-slate-400">{formatDate(order.createdAt)}</p>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      {/* Pagination */}
                      {clientOrders && clientOrders.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
                          <p className="text-xs text-slate-400">
                            Page {clientOrders.pagination.page} of {clientOrders.pagination.totalPages}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              disabled={!clientOrders.pagination.hasPrev}
                              onClick={() => setOrdersPage((p) => p - 1)}
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              disabled={!clientOrders.pagination.hasNext}
                              onClick={() => setOrdersPage((p) => p + 1)}
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Team Sub-Tab ── */}
                <TabsContent value="team" className="mt-4">
                  <Card className={cn(cardBg)}>
                    <CardHeader className="pb-3">
                      <CardTitle className={cn("text-sm font-semibold flex items-center gap-2", textPrimary)}>
                        <UserCog className="h-4 w-4 text-amber-500" />
                        Team Members ({clientDetail.teamMembers.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className={isDark ? "border-white/[0.06] hover:bg-transparent" : ""}>
                            <TableHead className="text-xs">Name</TableHead>
                            <TableHead className="text-xs">Email</TableHead>
                            <TableHead className="text-xs">Role</TableHead>
                            <TableHead className="text-xs">Joined</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientDetail.teamMembers.map((member) => (
                            <TableRow key={member.id} className={cn(
                              "border-b transition-colors",
                              isDark ? "border-white/[0.04] hover:bg-white/[0.02]" : "border-slate-100 hover:bg-slate-50"
                            )}>
                              <TableCell className="py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                                    member.isOwner ? "bg-gradient-to-br from-amber-500 to-amber-700" : "bg-slate-600"
                                  )}>
                                    {member.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className={cn("text-xs font-medium", textPrimary)}>{member.name}</p>
                                    {member.isOwner && (
                                      <span className="text-[10px] text-amber-500">Owner</span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <p className="text-xs text-slate-400">{member.email}</p>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <Badge variant="outline" className={cn("text-[10px] border", getPlanBadge(member.role))}>
                                  {member.role}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <p className="text-[10px] text-slate-400">{formatDate(member.joinedAt)}</p>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Subscription Sub-Tab ── */}
                <TabsContent value="subscription" className="mt-4">
                  <Card className={cn(cardBg)}>
                    <CardHeader className="pb-3">
                      <CardTitle className={cn("text-sm font-semibold flex items-center gap-2", textPrimary)}>
                        <CreditCard className="h-4 w-4 text-amber-500" />
                        Subscription
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {clientDetail.subscription ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {[
                              { label: "Status", value: clientDetail.subscription.status },
                              { label: "Plan", value: clientDetail.subscription.planName },
                              { label: "Billing Cycle", value: clientDetail.subscription.billingCycle },
                              { label: "Trial Start", value: formatDate(clientDetail.subscription.trialStartsAt) },
                              { label: "Trial End", value: formatDate(clientDetail.subscription.trialEndsAt) },
                              { label: "Period End", value: clientDetail.subscription.currentPeriodEnd ? formatDate(clientDetail.subscription.currentPeriodEnd) : "—" },
                              { label: "Reminders Sent", value: String(clientDetail.subscription.reminderCount) },
                            ].map((item) => (
                              <div key={item.label} className={cn(
                                "rounded-lg border p-3",
                                isDark ? "border-white/[0.06] bg-white/[0.01]" : "border-slate-200 bg-slate-50"
                              )}>
                                <p className={cn("text-[11px] uppercase tracking-wider mb-1", textSecondary)}>{item.label}</p>
                                <p className={cn("text-sm font-semibold", textPrimary)}>
                                  {item.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                          <CreditCard className="h-10 w-10 text-slate-500 mb-2 opacity-30" />
                          <p className={cn("text-sm", textSecondary)}>No subscription found</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Recent Activity Sub-Tab ── */}
                <TabsContent value="recent-activity" className="mt-4">
                  <Card className={cn(cardBg)}>
                    <CardHeader className="pb-3">
                      <CardTitle className={cn("text-sm font-semibold flex items-center gap-2", textPrimary)}>
                        <Activity className="h-4 w-4 text-amber-500" />
                        Recent Orders (Last 10)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {clientDetail.recentOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <Clock className="h-10 w-10 text-slate-500 mb-2 opacity-30" />
                          <p className={cn("text-sm", textSecondary)}>No recent activity</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {clientDetail.recentOrders.map((order) => (
                            <div key={order.id} className={cn(
                              "flex items-center justify-between rounded-lg border px-3 py-2",
                              isDark ? "border-white/[0.06] bg-white/[0.01]" : "border-slate-200 bg-slate-50"
                            )}>
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className={cn("text-[10px] border", getOrderStatusBadge(order.status))}>
                                  {order.status}
                                </Badge>
                                <div>
                                  <p className={cn("text-xs font-medium", textPrimary)}>
                                    #{order.orderNumber} — {order.customer?.name || "Walk-in"}
                                  </p>
                                  <p className="text-[10px] text-slate-400">{order.channel}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={cn("text-xs font-semibold", isGold ? "text-amber-400" : "text-amber-600")}>
                                  {formatCurrency(order.total)}
                                </p>
                                <p className="text-[10px] text-slate-400">{formatDate(order.createdAt)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <Card className={cn(cardBg)}>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-slate-500 mb-3 opacity-30" />
                <p className={cn("text-sm font-medium", textPrimary)}>Select a client to view details</p>
                <p className="text-xs text-slate-400 mt-1">Click on a client from the directory</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB 3: SUPPORT CENTER
          ═══════════════════════════════════════════════════════════════════ */}
      {mainTab === "support" && (
        <Card className={cn(cardBg)}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className={cn("text-base font-semibold flex items-center gap-2", textPrimary)}>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Support Center
                </CardTitle>
                <CardDescription className={textSecondary}>
                  {supportClients.length} clients requiring attention
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {supportClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3 opacity-40" />
                <p className={cn("text-sm font-medium", textPrimary)}>All clear!</p>
                <p className="text-xs text-slate-400 mt-1">No clients currently require attention</p>
              </div>
            ) : (
              <div className="space-y-2">
                {supportClients.map((client) => (
                  <div key={client.id} className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4 transition-colors",
                    isDark ? "border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03]" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className={cn("text-sm font-semibold", textPrimary)}>{client.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {!client.isActive && (
                            <Badge variant="outline" className="text-[10px] border bg-orange-500/15 text-orange-400 border-orange-500/25">
                              Suspended
                            </Badge>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {client.plan} · {client.orderCount} orders · {formatCurrency(client.revenueTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => { setSelectedClientId(client.id); fetchClientDetail(client.id); }}
                      >
                        <Eye className="h-3.5 w-3.5" /> Details
                      </Button>
                      {!client.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                          onClick={() => performAction(client.id, "activate")}
                          disabled={actionLoading}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Reactivate
                        </Button>
                      )}
                      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => setSelectedClientId(client.id)}
                          >
                            <Bell className="h-3.5 w-3.5" /> Warn
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className={textPrimary}>Send Warning</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-2">
                            <Input
                              placeholder="Warning title"
                              value={notifyTitle}
                              onChange={(e) => setNotifyTitle(e.target.value)}
                            />
                            <Textarea
                              placeholder="Warning message"
                              value={notifyMessage}
                              onChange={(e) => setNotifyMessage(e.target.value)}
                              rows={3}
                            />
                            <Select value={notifyType} onValueChange={setNotifyType}>
                              <SelectTrigger>
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="info">Info</SelectItem>
                                <SelectItem value="warning">Warning</SelectItem>
                                <SelectItem value="error">Error</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={async () => {
                                if (!notifyTitle || !notifyMessage) { toast.error("Title and message required"); return; }
                                const ok = await performAction(selectedClientId!, "send-notification", { title: notifyTitle, message: notifyMessage, type: notifyType });
                                if (ok) { setNotifyDialogOpen(false); setNotifyTitle(""); setNotifyMessage(""); }
                              }}
                              disabled={actionLoading || !notifyTitle || !notifyMessage}
                              className="w-full"
                            >
                              {actionLoading ? "Sending..." : "Send Warning"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Bottom Tab Switcher ── */}
      {mainTab !== "detail" && (
        <div className="flex justify-center pt-2">
          <Tabs value={mainTab} onValueChange={setMainTab}>
            <TabsList className={cn(isDark ? "bg-white/[0.04]" : "bg-slate-100")}>
              <TabsTrigger value="directory" className="gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Directory
              </TabsTrigger>
              <TabsTrigger value="support" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Support ({supportClients.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* ── Ban Dialog ── */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={cn("text-red-400 flex items-center gap-2")}>
              <Ban className="h-4 w-4" /> Ban Organization
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className={cn("text-sm", textSecondary)}>
              This will immediately ban the organization and prevent all access. Please provide a reason.
            </p>
            <Textarea
              placeholder="Reason for banning..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              rows={3}
              className="border-red-500/30 focus-visible:ring-red-500/30"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setBanDialogOpen(false); setBanReason(""); }}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={async () => {
                  if (!banReason.trim()) { toast.error("Ban reason is required"); return; }
                  const ok = await performAction(selectedClientId!, "ban", { banReason: banReason.trim() });
                  if (ok) { setBanDialogOpen(false); setBanReason(""); }
                }}
                disabled={actionLoading || !banReason.trim()}
              >
                {actionLoading ? "Banning..." : "Confirm Ban"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

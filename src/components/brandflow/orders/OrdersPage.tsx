"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBrandForgeStore } from "@/store/brandflow-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  RefreshCw,
  Loader2,
  Eye,
  Package,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { LoadingSkeleton } from "@/components/brandflow/shared/LoadingSkeleton";
import { StatsCard } from "@/components/brandflow/shared/StatsCard";
import { OrderModal } from "./OrderModal";
import { InvoiceGenerator } from "./InvoiceGenerator";
import { AutoStatusRules } from "./AutoStatusRules";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  channel: string;
  courier?: string | null;
  trackingNumber?: string | null;
  notes?: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
  customer: { name: string; email?: string | null; phone?: string | null } | null;
  items: OrderItem[];
}

interface OrderStats {
  total: number;
  pending: number;
  confirmed: number;
  dispatched: number;
  delivered: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

type SortField = "createdAt" | "total" | "status" | "orderNumber";
type SortDir = "asc" | "desc";

// ── Constants ──────────────────────────────────────────────────────────────

const statusTabs = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "packed", label: "Packing" },
  { id: "dispatched", label: "Dispatched" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
  { id: "returns", label: "Returns" },
];

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "packed", label: "Packed" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returns", label: "Returns" },
];

const ORDERS_PER_PAGE = 10;

const getStatusBadgeClasses = (status: string, isGold: boolean, isDark: boolean) => {
  const base = "px-2 py-0.5 rounded-full text-xs font-medium";
  switch (status) {
    case "pending":
      return isGold
        ? cn(base, "bg-amber-500/15 text-amber-400 border border-amber-500/20")
        : isDark
          ? cn(base, "bg-amber-500/15 text-amber-400 border border-amber-500/20")
          : cn(base, "bg-amber-50 text-amber-700 border border-amber-200");
    case "confirmed":
      return isGold
        ? cn(base, "bg-blue-500/15 text-blue-400 border border-blue-500/20")
        : isDark
          ? cn(base, "bg-blue-500/15 text-blue-400 border border-blue-500/20")
          : cn(base, "bg-blue-50 text-blue-700 border border-blue-200");
    case "packed":
      return isGold
        ? cn(base, "bg-purple-500/15 text-purple-400 border border-purple-500/20")
        : isDark
          ? cn(base, "bg-purple-500/15 text-purple-400 border border-purple-500/20")
          : cn(base, "bg-purple-50 text-purple-700 border border-purple-200");
    case "dispatched":
      return isGold
        ? cn(base, "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20")
        : isDark
          ? cn(base, "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20")
          : cn(base, "bg-cyan-50 text-cyan-700 border border-cyan-200");
    case "delivered":
      return isGold
        ? cn(base, "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20")
        : isDark
          ? cn(base, "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20")
          : cn(base, "bg-emerald-50 text-emerald-700 border border-emerald-200");
    case "cancelled":
      return isGold
        ? cn(base, "bg-red-500/15 text-red-400 border border-red-500/20")
        : isDark
          ? cn(base, "bg-red-500/15 text-red-400 border border-red-500/20")
          : cn(base, "bg-red-50 text-red-700 border border-red-200");
    case "returns":
      return isGold
        ? cn(base, "bg-orange-500/15 text-orange-400 border border-orange-500/20")
        : isDark
          ? cn(base, "bg-orange-500/15 text-orange-400 border border-orange-500/20")
          : cn(base, "bg-orange-50 text-orange-700 border border-orange-200");
    default:
      return isDark ? cn(base, "bg-white/5 text-slate-400") : cn(base, "bg-slate-100 text-slate-600");
  }
};

const getChannelBadgeClasses = (channel: string, isGold: boolean, isDark: boolean) => {
  const base = "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider";
  switch (channel) {
    case "whatsapp":
      return isGold ? cn(base, "bg-green-500/10 text-green-400") : isDark ? cn(base, "bg-green-500/10 text-green-400") : cn(base, "bg-green-50 text-green-700");
    case "instagram":
      return isGold ? cn(base, "bg-pink-500/10 text-pink-400") : isDark ? cn(base, "bg-pink-500/10 text-pink-400") : cn(base, "bg-pink-50 text-pink-700");
    case "website":
      return isGold ? cn(base, "bg-indigo-500/10 text-indigo-400") : isDark ? cn(base, "bg-indigo-500/10 text-indigo-400") : cn(base, "bg-indigo-50 text-indigo-700");
    default:
      return isDark ? cn(base, "bg-white/5 text-slate-500") : cn(base, "bg-slate-100 text-slate-500");
  }
};

// ── Component ──────────────────────────────────────────────────────────────

export function OrdersPage() {
  const { organization, appTheme } = useBrandForgeStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats>({ total: 0, pending: 0, confirmed: 0, dispatched: 0, delivered: 0 });
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: ORDERS_PER_PAGE, totalCount: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch Orders ──────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        orgId: organization.id,
        page: currentPage.toString(),
        limit: ORDERS_PER_PAGE.toString(),
        sortBy,
        sortDir,
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/orders?${params}`);
      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error("Failed to parse response");
      }
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch orders");
      }
      setOrders(data.orders || []);
      setPagination(data.pagination || { page: 1, limit: ORDERS_PER_PAGE, totalCount: 0, totalPages: 0 });
      setStats(data.stats || { total: 0, pending: 0, confirmed: 0, dispatched: 0, delivered: 0 });
    } catch (err: any) {
      console.error("Fetch orders error:", err);
      setError(err.message || "Something went wrong");
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [organization?.id, statusFilter, search, currentPage, sortBy, sortDir]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Debounced Search ──────────────────────────────────────────────────

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(value);
      setCurrentPage(1);
    }, 400);
  };

  // ── Status Filter Change ──────────────────────────────────────────────

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // ── Sorting ───────────────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  // ── Delete Order ──────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deletingOrderId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/orders/${deletingOrderId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Order deleted successfully");
      setDeletingOrderId(null);
      fetchOrders();
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err.message || "Failed to delete order");
    } finally {
      setDeleting(false);
    }
  };

  // ── Change Status ─────────────────────────────────────────────────────

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setStatusChangingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }
      toast.success(`Order status updated to ${newStatus}`);
      fetchOrders();
    } catch (err: any) {
      console.error("Status change error:", err);
      toast.error(err.message || "Failed to update status");
    } finally {
      setStatusChangingId(null);
    }
  };

  // ── Export to CSV ─────────────────────────────────────────────────────

  const handleExportCSV = () => {
    if (orders.length === 0) {
      toast.error("No orders to export");
      return;
    }

    const headers = ["Order #", "Customer", "Items", "Total (Rs.)", "Status", "Channel", "Date"];
    const rows = orders.map((o) => [
      o.orderNumber,
      o.customer?.name || "Walk-in",
      o.items.map((i) => `${i.productName} x${i.quantity}`).join("; "),
      o.total.toLocaleString(),
      o.status,
      o.channel,
      new Date(o.createdAt).toLocaleDateString("en-PK"),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Orders exported to CSV");
  };

  // ── Computed Values ───────────────────────────────────────────────────

  const totalItems = useMemo(() => {
    return orders.reduce((sum, o) => sum + o.items.length, 0);
  }, [orders]);

  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, o) => sum + o.total, 0);
  }, [orders]);

  // ── Render ────────────────────────────────────────────────────────────

  const cardClass = isGold
    ? "bg-white/[0.03] border-white/[0.06]"
    : isDark
      ? "bg-white/[0.03] border-white/[0.06]"
      : "bg-white";

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-500" : "text-muted-foreground";
  const borderColor = isGold ? "border-white/[0.06]" : isDark ? "border-white/[0.06]" : "border-slate-200";
  const hoverBg = isGold ? "hover:bg-amber-500/5" : isDark ? "hover:bg-white/[0.03]" : "hover:bg-slate-50";
  const headerBg = isGold ? "bg-white/[0.02]" : isDark ? "bg-white/[0.02]" : "bg-slate-50/80";

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-xl sm:text-2xl font-bold", textPrimary)}>Orders</h1>
          <p className={cn("text-sm mt-1", textSecondary)}>Manage and track all your orders</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={loading || orders.length === 0}
            className={cn(
              isGold && "border-amber-500/20 text-amber-400 hover:bg-amber-500/10",
              isDark && !isGold && "border-white/10 text-slate-300 hover:bg-white/5"
            )}
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders()}
            disabled={loading}
            className={cn(
              isGold && "border-amber-500/20 text-amber-400 hover:bg-amber-500/10",
              isDark && !isGold && "border-white/10 text-slate-300 hover:bg-white/5"
            )}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            className={isGold
              ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black hover:shadow-[0_4px_20px_rgba(212,160,23,0.3)] hover:-translate-y-0.5"
              : "bg-emerald-600 hover:bg-emerald-700"
            }
            onClick={() => setOrderModalOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> New Order
          </Button>
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatsCard
          title="Total Orders"
          value={stats.total}
          icon={ShoppingBag}
          loading={loading}
          variant="default"
        />
        <StatsCard
          title="Pending"
          value={stats.pending}
          icon={Package}
          loading={loading}
          variant="warning"
        />
        <StatsCard
          title="Confirmed"
          value={stats.confirmed}
          icon={Eye}
          loading={loading}
          variant="default"
        />
        <StatsCard
          title="Dispatched"
          value={stats.dispatched}
          icon={Package}
          loading={loading}
          variant="default"
        />
        <StatsCard
          title="Delivered"
          value={stats.delivered}
          icon={ShoppingBag}
          loading={loading}
          variant="success"
        />
      </div>

      {/* ── Status Tabs ─────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto pb-1 tab-bar-scroll">
        {statusTabs.map((tab) => {
          const count = tab.id === "all"
            ? stats.total
            : tab.id === "dispatched"
              ? stats.dispatched
              : stats[tab.id as keyof OrderStats];
          return (
            <button
              key={tab.id}
              onClick={() => handleStatusFilterChange(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all",
                statusFilter === tab.id
                  ? isGold
                    ? "bg-gradient-to-r from-amber-600/20 to-yellow-500/20 text-amber-400 border border-amber-500/30"
                    : isDark
                      ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-900 text-white"
                  : isDark
                    ? "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full",
                  statusFilter === tab.id
                    ? isGold
                      ? "bg-amber-500/30 text-amber-300"
                      : isDark
                        ? "bg-emerald-500/30 text-emerald-300"
                        : "bg-white/20 text-white/80"
                    : isDark
                      ? "bg-white/10 text-slate-500"
                      : "bg-slate-200 text-slate-500"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Search + Summary ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders by #, customer, phone..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={cn(
              "pl-9",
              isGold && "border-white/10 bg-white/[0.03] focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20 placeholder:text-slate-500",
              isDark && !isGold && "border-white/10 bg-white/[0.03] focus-visible:border-emerald-500/50 placeholder:text-slate-500"
            )}
          />
        </div>
        {!loading && orders.length > 0 && (
          <div className={cn("text-xs flex gap-3 flex-shrink-0", textMuted)}>
            <span>{pagination.totalCount} order{pagination.totalCount !== 1 ? "s" : ""}</span>
            <span>•</span>
            <span>{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
            <span>•</span>
            <span>Rs. {totalRevenue.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* ── Loading Skeleton ────────────────────────────────────────── */}
      {loading && <LoadingSkeleton />}

      {/* ── Error State ─────────────────────────────────────────────── */}
      {!loading && error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={cn(cardClass, "border-red-500/30")}>
            <CardContent className="p-6 text-center">
              <p className="text-red-500 font-medium mb-2">Failed to load orders</p>
              <p className={cn("text-sm mb-4", textMuted)}>{error}</p>
              <Button variant="outline" onClick={() => fetchOrders()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Try Again
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Empty State ─────────────────────────────────────────────── */}
      {!loading && !error && orders.length === 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${statusFilter}-${search}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className={cardClass}>
              <CardContent className="p-4">
                <EmptyState
                  icon={ShoppingBag}
                  title={search ? "No matching orders" : statusFilter !== "all" ? `No ${statusFilter} orders` : "No orders yet"}
                  description={
                    search
                      ? `No orders match "${search}". Try a different search term.`
                      : statusFilter !== "all"
                        ? `There are no ${statusFilter} orders right now.`
                        : "When customers place orders, they'll appear here."
                  }
                  action={
                    !search && statusFilter === "all"
                      ? { label: "Create First Order", onClick: () => setOrderModalOpen(true) }
                      : undefined
                  }
                />
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── Orders Table ────────────────────────────────────────────── */}
      {!loading && !error && orders.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${statusFilter}-${search}-${currentPage}-${sortBy}-${sortDir}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className={cn(cardClass, "overflow-hidden")}>
              <CardContent className="p-0">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className={cn("border-b", borderColor, headerBg)}>
                        <TableHead
                          className={cn("cursor-pointer select-none text-xs font-semibold uppercase tracking-wider", textMuted)}
                          onClick={() => handleSort("orderNumber")}
                        >
                          <span className="flex items-center">Order # <SortIcon field="orderNumber" /></span>
                        </TableHead>
                        <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>
                          Customer
                        </TableHead>
                        <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>
                          Items
                        </TableHead>
                        <TableHead
                          className={cn("cursor-pointer select-none text-xs font-semibold uppercase tracking-wider", textMuted)}
                          onClick={() => handleSort("total")}
                        >
                          <span className="flex items-center">Total <SortIcon field="total" /></span>
                        </TableHead>
                        <TableHead
                          className={cn("cursor-pointer select-none text-xs font-semibold uppercase tracking-wider", textMuted)}
                          onClick={() => handleSort("status")}
                        >
                          <span className="flex items-center">Status <SortIcon field="status" /></span>
                        </TableHead>
                        <TableHead
                          className={cn("cursor-pointer select-none text-xs font-semibold uppercase tracking-wider", textMuted)}
                          onClick={() => handleSort("createdAt")}
                        >
                          <span className="flex items-center">Date <SortIcon field="createdAt" /></span>
                        </TableHead>
                        <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order, index) => (
                        <TableRow
                          key={order.id}
                          className={cn(
                            "border-b transition-colors",
                            borderColor,
                            hoverBg,
                            isDark && "hover:bg-white/[0.02]"
                          )}
                        >
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className={cn("font-semibold text-sm", textPrimary)}>{order.orderNumber}</span>
                              <span className={cn("text-[10px]", getChannelBadgeClasses(order.channel, isGold, isDark))}>
                                {order.channel}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className={cn("text-sm font-medium", textPrimary)}>
                                {order.customer?.name || "Walk-in"}
                              </span>
                              {order.customer?.phone && (
                                <span className={cn("text-xs", textMuted)}>{order.customer.phone}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              <span className={cn("text-xs", textSecondary)}>
                                {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                              </span>
                              <div className={cn("text-xs mt-0.5 truncate", textMuted)}>
                                {order.items.slice(0, 2).map((i) => `${i.productName} x${i.quantity}`).join(", ")}
                                {order.items.length > 2 && ` +${order.items.length - 2} more`}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={cn("font-semibold text-sm", textPrimary)}>
                              Rs. {order.total.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={order.status}
                              onValueChange={(val) => handleStatusChange(order.id, val)}
                              disabled={statusChangingId === order.id}
                            >
                              <SelectTrigger
                                className={cn(
                                  "w-[120px] h-7 text-xs border-0 p-0 px-2",
                                  statusChangingId === order.id && "opacity-60"
                                )}
                              >
                                {statusChangingId === order.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <span className={getStatusBadgeClasses(order.status, isGold, isDark)}>
                                    {statusOptions.find((s) => s.value === order.status)?.label || order.status}
                                  </span>
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <span className={cn("text-xs", textSecondary)}>
                              {new Date(order.createdAt).toLocaleDateString("en-PK", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span className={cn("block text-[10px]", textMuted)}>
                              {new Date(order.createdAt).toLocaleTimeString("en-PK", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-8 w-8", isDark && "text-slate-400 hover:text-slate-200 hover:bg-white/5")}
                                onClick={() => setSelectedOrderForDetails(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn("h-8 w-8", isDark && "text-slate-400 hover:text-slate-200 hover:bg-white/5")}
                                    onClick={() => setInvoiceOrder(order)}
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Generate Invoice</TooltipContent>
                              </Tooltip>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                    onClick={() => setDeletingOrderId(order.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Order {order.orderNumber}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the order
                                      &quot;{order.orderNumber}&quot; and restore the product stock. Customer
                                      stats will also be adjusted.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setDeletingOrderId(null)}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={handleDelete}
                                      disabled={deleting}
                                      className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                    >
                                      {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                      Delete Order
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y max-h-[600px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className={cn("p-4 space-y-3", borderColor, "border-b last:border-b-0")}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={cn("font-semibold text-sm", textPrimary)}>{order.orderNumber}</span>
                          <span className={cn("ml-2 text-[10px]", getChannelBadgeClasses(order.channel, isGold, isDark))}>
                            {order.channel}
                          </span>
                          <div className={cn("text-xs mt-0.5", textMuted)}>
                            {new Date(order.createdAt).toLocaleDateString("en-PK", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}
                          </div>
                        </div>
                        <span className={getStatusBadgeClasses(order.status, isGold, isDark)}>
                          {statusOptions.find((s) => s.value === order.status)?.label || order.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={cn("text-sm font-medium", textPrimary)}>
                            {order.customer?.name || "Walk-in"}
                          </p>
                          {order.customer?.phone && (
                            <p className={cn("text-xs", textMuted)}>{order.customer.phone}</p>
                          )}
                        </div>
                        <span className={cn("font-bold text-sm", textPrimary)}>
                          Rs. {order.total.toLocaleString()}
                        </span>
                      </div>
                      <div className={cn("text-xs", textMuted)}>
                        {order.items.slice(0, 3).map((i) => `${i.productName} x${i.quantity}`).join(", ")}
                        {order.items.length > 3 && ` +${order.items.length - 3} more`}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <Select
                          value={order.status}
                          onValueChange={(val) => handleStatusChange(order.id, val)}
                          disabled={statusChangingId === order.id}
                        >
                          <SelectTrigger className={cn(
                            "w-[130px] h-8 text-xs",
                            isDark && "border-white/10 bg-white/[0.03]"
                          )}>
                            {statusChangingId === order.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8", isDark && "text-slate-400 hover:text-slate-200")}
                            onClick={() => setSelectedOrderForDetails(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8", isDark && "text-slate-400 hover:text-slate-200")}
                            onClick={() => setInvoiceOrder(order)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                                onClick={() => setDeletingOrderId(order.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Order {order.orderNumber}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the order and restore stock. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setDeletingOrderId(null)}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleDelete}
                                  disabled={deleting}
                                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                >
                                  {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── Pagination ──────────────────────────────────────────────── */}
      {!loading && !error && orders.length > 0 && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className={cn("text-xs", textMuted)}>
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{" "}
            {pagination.totalCount} orders
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                isGold && "border-amber-500/20 text-amber-400 hover:bg-amber-500/10",
                isDark && !isGold && "border-white/10 text-slate-300 hover:bg-white/5"
              )}
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 w-8 p-0 text-xs",
                    currentPage === pageNum
                      ? isGold
                        ? "bg-gradient-to-r from-amber-600 to-yellow-500 text-black"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                      : isGold
                        ? "border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                        : isDark
                          ? "border-white/10 text-slate-300 hover:bg-white/5"
                          : ""
                  )}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                isGold && "border-amber-500/20 text-amber-400 hover:bg-amber-500/10",
                isDark && !isGold && "border-white/10 text-slate-300 hover:bg-white/5"
              )}
              disabled={currentPage >= pagination.totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Order Details Sheet / Modal ─────────────────────────────── */}
      {selectedOrderForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedOrderForDetails(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "rounded-xl border shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto",
              isGold
                ? "bg-zinc-900 border-amber-500/20"
                : isDark
                  ? "bg-zinc-900 border-white/10"
                  : "bg-white border-slate-200"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className={cn("text-lg font-bold", textPrimary)}>
                  {selectedOrderForDetails.orderNumber}
                </h2>
                <span className={getStatusBadgeClasses(selectedOrderForDetails.status, isGold, isDark)}>
                  {statusOptions.find((s) => s.value === selectedOrderForDetails.status)?.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className={cn("text-xs font-medium uppercase tracking-wider mb-1", textMuted)}>Customer</p>
                  <p className={textPrimary}>{selectedOrderForDetails.customer?.name || "Walk-in"}</p>
                  {selectedOrderForDetails.customer?.phone && (
                    <p className={textSecondary}>{selectedOrderForDetails.customer.phone}</p>
                  )}
                </div>
                <div>
                  <p className={cn("text-xs font-medium uppercase tracking-wider mb-1", textMuted)}>Channel</p>
                  <p className={cn("capitalize", textPrimary)}>{selectedOrderForDetails.channel}</p>
                </div>
                <div>
                  <p className={cn("text-xs font-medium uppercase tracking-wider mb-1", textMuted)}>Date</p>
                  <p className={textPrimary}>
                    {new Date(selectedOrderForDetails.createdAt).toLocaleDateString("en-PK", {
                      day: "2-digit", month: "long", year: "numeric",
                    })}
                  </p>
                  <p className={textSecondary}>
                    {new Date(selectedOrderForDetails.createdAt).toLocaleTimeString("en-PK", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                {selectedOrderForDetails.courier && (
                  <div>
                    <p className={cn("text-xs font-medium uppercase tracking-wider mb-1", textMuted)}>Courier</p>
                    <p className={textPrimary}>{selectedOrderForDetails.courier}</p>
                  </div>
                )}
                {selectedOrderForDetails.trackingNumber && (
                  <div>
                    <p className={cn("text-xs font-medium uppercase tracking-wider mb-1", textMuted)}>Tracking</p>
                    <p className={textPrimary}>{selectedOrderForDetails.trackingNumber}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <p className={cn("text-xs font-medium uppercase tracking-wider mb-2", textMuted)}>Items</p>
                <div className={cn("rounded-lg border overflow-hidden", borderColor)}>
                  <div className={cn("grid grid-cols-3 gap-2 px-3 py-2 text-xs font-medium", textMuted, headerBg)}>
                    <span>Product</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Price</span>
                  </div>
                  {selectedOrderForDetails.items.map((item, i) => (
                    <div key={i} className={cn("grid grid-cols-3 gap-2 px-3 py-2 text-sm border-t", borderColor)}>
                      <span className={cn("truncate", textPrimary)}>{item.productName}</span>
                      <span className={cn("text-right", textSecondary)}>x{item.quantity}</span>
                      <span className={cn("text-right font-medium", textPrimary)}>Rs. {item.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1 pt-2 border-t" style={{ borderColor: borderColor }}>
                <div className="flex justify-between text-sm">
                  <span className={textMuted}>Subtotal</span>
                  <span className={textPrimary}>Rs. {selectedOrderForDetails.subtotal.toLocaleString()}</span>
                </div>
                {selectedOrderForDetails.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-500">Discount</span>
                    <span className="text-emerald-500">- Rs. {selectedOrderForDetails.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-1 border-t" style={{ borderColor: borderColor }}>
                  <span className={textPrimary}>Total</span>
                  <span className={isGold ? "text-amber-400" : "text-emerald-600"}>
                    Rs. {selectedOrderForDetails.total.toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedOrderForDetails.notes && (
                <div>
                  <p className={cn("text-xs font-medium uppercase tracking-wider mb-1", textMuted)}>Notes</p>
                  <p className={cn("text-sm rounded-lg p-3", isDark ? "bg-white/5 text-slate-300" : "bg-slate-50 text-slate-700")}>
                    {selectedOrderForDetails.notes}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setSelectedOrderForDetails(null)}>
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Auto-Status Rules Section ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <AutoStatusRules />
      </motion.div>

      {/* ── Order Modal ── */}
      {organization && (
        <OrderModal
          open={orderModalOpen}
          onClose={() => setOrderModalOpen(false)}
          onCreated={() => {
            setOrderModalOpen(false);
            toast.success("Order created successfully!");
            fetchOrders();
          }}
          organizationId={organization.id}
        />
      )}

      {/* ── Invoice Generator ── */}
      <InvoiceGenerator
        order={invoiceOrder}
        open={!!invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
      />
    </div>
  );
}

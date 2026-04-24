"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useBrandFlowStore } from "@/store/brandflow-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Search, Plus, Users, Download, Edit2, Trash2, ChevronLeft, ChevronRight,
  Crown, Star, Award, Loader2, Mail, Phone, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { LoadingSkeleton } from "@/components/brandflow/shared/LoadingSkeleton";
import { ConfirmDialog } from "@/components/brandflow/shared/ConfirmDialog";
import { CustomerModal } from "./CustomerModal";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  loyaltyTier: string;
  totalSpent: number;
  orderCount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CustomerStats {
  totalCustomers: number;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  vipCount: number;
  tierCounts: {
    new: number;
    bronze: number;
    silver: number;
    gold: number;
  };
}

// ─── Constants ───────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const subTabs = [
  { id: "all", label: "All Customers" },
  { id: "vip", label: "VIP" },
  { id: "segments", label: "Segments" },
  { id: "notes", label: "Notes" },
];

const TIER_CONFIG: Record<string, { icon: typeof Crown; color: string; bg: string; border: string; darkBg: string; darkColor: string; darkBorder: string }> = {
  new: { icon: Star, color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200", darkBg: "bg-white/5", darkColor: "text-slate-400", darkBorder: "border-white/10" },
  bronze: { icon: Award, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", darkBg: "bg-amber-500/10", darkColor: "text-amber-400", darkBorder: "border-amber-500/20" },
  silver: { icon: Star, color: "text-slate-500", bg: "bg-slate-100", border: "border-slate-300", darkBg: "bg-slate-400/10", darkColor: "text-slate-300", darkBorder: "border-slate-400/20" },
  gold: { icon: Crown, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-300", darkBg: "bg-amber-500/10", darkColor: "text-amber-400", darkBorder: "border-amber-500/20" },
};

// ─── Helpers ─────────────────────────────────────────────────────────

function formatPKR(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function exportToCSV(customers: Customer[], stats: CustomerStats) {
  const headers = ["Name", "Email", "Phone", "City", "Orders", "Total Spent (PKR)", "Loyalty Tier", "Created At"];
  const rows = customers.map((c) => [
    c.name,
    c.email || "",
    c.phone || "",
    c.city || "",
    String(c.orderCount),
    String(c.totalSpent),
    c.loyaltyTier,
    new Date(c.createdAt).toLocaleDateString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `customers_export_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast.success("CSV exported successfully!");
}

// ─── Component ───────────────────────────────────────────────────────

export function CustomersPage() {
  const { organization, appTheme } = useBrandFlowStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  // State
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Notes
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState<{ id: number; text: string; createdAt: string }[]>([]);

  // ─── Fetch Customers ─────────────────────────────────────────────

  const fetchCustomers = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers?orgId=${organization.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCustomers(data.customers || []);
      setStats(data.stats || null);
    } catch {
      setError("Failed to load customers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Reset page when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab]);

  // ─── Filtered & Paginated Data ───────────────────────────────────

  const filteredCustomers = useMemo(() => {
    let list = [...customers];

    // VIP tab: only gold & silver
    if (activeTab === "vip") {
      list = list.filter((c) => c.loyaltyTier === "gold" || c.loyaltyTier === "silver");
    }

    // Client-side search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (c.city && c.city.toLowerCase().includes(q))
      );
    }

    return list;
  }, [customers, activeTab, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCustomers.slice(start, start + PAGE_SIZE);
  }, [filteredCustomers, currentPage]);

  // ─── Actions ────────────────────────────────────────────────────

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`"${deleteTarget.name}" has been deleted`);
        setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        setDeleteTarget(null);
        // Refresh stats
        fetchCustomers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete customer");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleModalClose = () => {
    setCustomerModalOpen(false);
    setEditingCustomer(null);
  };

  const handleModalSaved = () => {
    setCustomerModalOpen(false);
    setEditingCustomer(null);
    fetchCustomers();
  };

  // ─── Theme Classes ──────────────────────────────────────────────

  const cardClass = cn(
    "border rounded-xl transition-all",
    isGold
      ? "bg-white/[0.02] border-white/[0.06] hover:border-amber-500/20 hover:shadow-[0_2px_20px_rgba(212,160,23,0.05)]"
      : isDark
        ? "bg-white/[0.03] border-white/[0.06] hover:border-emerald-500/20"
        : "bg-white hover:shadow-md"
  );

  const statCardClass = cn(
    "border rounded-xl transition-all hover:shadow-md",
    isGold
      ? "bg-white/[0.02] border-white/[0.06] hover:border-amber-500/20"
      : isDark
        ? "bg-white/[0.03] border-white/[0.06] hover:border-emerald-500/20"
        : "bg-white border-slate-200"
  );

  const textPrimary = cn(isDark ? "text-white" : "text-slate-900");
  const textSecondary = cn(isDark ? "text-slate-400" : "text-slate-500");
  const textMuted = cn(isDark ? "text-slate-500" : "text-muted-foreground");
  const inputClass = cn(
    isGold && "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-500 focus:border-amber-500/50",
    isDark && !isGold && "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-500"
  );

  // ─── Render: Loading ────────────────────────────────────────────

  if (loading) return <LoadingSkeleton />;

  // ─── Render: Error ──────────────────────────────────────────────

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className={cn("text-xl sm:text-2xl font-bold", textPrimary)}>Customers</h1>
            <p className={cn("text-sm mt-1", textSecondary)}>Manage your customer relationships</p>
          </div>
        </div>
        <Card className="border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/20">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <Button variant="outline" onClick={fetchCustomers} className="mt-4">
              <Loader2 className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Render: Main ───────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-xl sm:text-2xl font-bold", textPrimary)}>Customers</h1>
          <p className={cn("text-sm mt-1", textSecondary)}>Manage your customer relationships</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToCSV(filteredCustomers, stats!)}
            disabled={filteredCustomers.length === 0}
            className={cn(isGold && "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white")}
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => setCustomerModalOpen(true)}
            className={cn(
              isGold
                ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black hover:shadow-[0_4px_20px_rgba(212,160,23,0.3)]"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            )}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className={cn("flex gap-1 border-b overflow-x-auto tab-bar-scroll", isDark ? "border-white/[0.06]" : "border-slate-200")}>
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? isGold
                  ? "border-amber-500 text-amber-400"
                  : "border-emerald-600 text-emerald-600"
                : isDark
                  ? "border-transparent text-slate-500 hover:text-slate-300"
                  : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ═══ ALL / VIP TAB ═══ */}
        {(activeTab === "all" || activeTab === "vip") && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Total Customers */}
                <Card className={statCardClass}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-medium uppercase tracking-wider", textMuted)}>
                          Total Customers
                        </p>
                        <p className={cn("text-2xl font-bold mt-1", textPrimary)}>
                          {stats.totalCustomers}
                        </p>
                      </div>
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        isGold ? "bg-amber-500/10 text-amber-400" : isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-100 text-emerald-600"
                      )}>
                        <Users className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Revenue */}
                <Card className={statCardClass}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-medium uppercase tracking-wider", textMuted)}>
                          Total Revenue
                        </p>
                        <p className={cn("text-2xl font-bold mt-1", textPrimary)}>
                          {formatPKR(stats.totalRevenue)}
                        </p>
                      </div>
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        isGold ? "bg-amber-500/10 text-amber-400" : isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-100 text-emerald-600"
                      )}>
                        <Star className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Avg Order Value */}
                <Card className={statCardClass}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-medium uppercase tracking-wider", textMuted)}>
                          Avg Order Value
                        </p>
                        <p className={cn("text-2xl font-bold mt-1", textPrimary)}>
                          {formatPKR(stats.avgOrderValue)}
                        </p>
                      </div>
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        isGold ? "bg-amber-500/10 text-amber-400" : isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-100 text-emerald-600"
                      )}>
                        <Award className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* VIP Customers */}
                <Card className={cn(
                  statCardClass,
                  isGold
                    ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/30"
                    : isDark
                      ? "bg-purple-500/5 border-purple-500/20 hover:border-purple-500/30"
                      : "bg-purple-50 border-purple-200"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs font-medium uppercase tracking-wider",
                          isGold ? "text-amber-400" : isDark ? "text-purple-400" : "text-purple-600"
                        )}>
                          VIP Customers
                        </p>
                        <p className={cn(
                          "text-2xl font-bold mt-1",
                          isGold ? "text-amber-400" : isDark ? "text-purple-400" : "text-purple-700"
                        )}>
                          {stats.vipCount}
                        </p>
                      </div>
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        isGold ? "bg-amber-500/10 text-amber-400" : "bg-purple-100 text-purple-600"
                      )}>
                        <Crown className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", textMuted)} />
                <Input
                  placeholder="Search by name, email, phone, or city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={cn("pl-9", inputClass)}
                />
              </div>
              <div className={cn("text-xs px-3 py-2 rounded-lg flex items-center", isDark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500")}>
                {filteredCustomers.length} result{filteredCustomers.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Customer List */}
            {filteredCustomers.length === 0 ? (
              <Card className={cardClass}>
                <CardContent>
                  <EmptyState
                    icon={Users}
                    title={search ? "No matching customers" : "No customers yet"}
                    description={search
                      ? `No customers match "${search}". Try a different search.`
                      : "Customers will appear here when they place their first order or are added manually."
                    }
                    action={!search ? { label: "Add Customer", onClick: () => setCustomerModalOpen(true) } : undefined}
                  />
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Card className={cn(cardClass, "overflow-hidden")}>
                    <div className="max-h-[520px] overflow-y-auto overflow-x-auto">
                      <table className="w-full min-w-[700px]">
                        <thead>
                          <tr className={cn("border-b text-left", isDark ? "border-white/[0.06]" : "border-slate-200")}>
                            <th className={cn("px-4 py-3 text-xs font-medium uppercase tracking-wider", textMuted)}>Customer</th>
                            <th className={cn("px-4 py-3 text-xs font-medium uppercase tracking-wider", textMuted)}>Contact</th>
                            <th className={cn("px-4 py-3 text-xs font-medium uppercase tracking-wider", textMuted)}>City</th>
                            <th className={cn("px-4 py-3 text-xs font-medium uppercase tracking-wider text-right", textMuted)}>Orders</th>
                            <th className={cn("px-4 py-3 text-xs font-medium uppercase tracking-wider text-right", textMuted)}>Total Spent</th>
                            <th className={cn("px-4 py-3 text-xs font-medium uppercase tracking-wider", textMuted)}>Tier</th>
                            <th className={cn("px-4 py-3 text-xs font-medium uppercase tracking-wider text-right", textMuted)}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedCustomers.map((customer, idx) => {
                            const tier = TIER_CONFIG[customer.loyaltyTier] || TIER_CONFIG.new;
                            const TierIcon = tier.icon;
                            return (
                              <tr
                                key={customer.id}
                                className={cn(
                                  "transition-colors",
                                  isDark
                                    ? "border-b border-white/[0.04] hover:bg-white/[0.02]"
                                    : "border-b border-slate-100 hover:bg-slate-50"
                                )}
                              >
                                {/* Name */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0",
                                      isGold
                                        ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/20 text-amber-400"
                                        : isDark
                                          ? "bg-emerald-500/10 text-emerald-400"
                                          : "bg-emerald-100 text-emerald-700"
                                    )}>
                                      {customer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className={cn("text-sm font-medium truncate", textPrimary)}>{customer.name}</p>
                                      <p className={cn("text-xs", textMuted)}>
                                        Joined {new Date(customer.createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                {/* Contact */}
                                <td className="px-4 py-3">
                                  <div className="space-y-1">
                                    {customer.email && (
                                      <div className="flex items-center gap-1.5">
                                        <Mail className={cn("h-3 w-3 flex-shrink-0", textMuted)} />
                                        <span className={cn("text-xs truncate max-w-[160px]", textSecondary)}>{customer.email}</span>
                                      </div>
                                    )}
                                    {customer.phone && (
                                      <div className="flex items-center gap-1.5">
                                        <Phone className={cn("h-3 w-3 flex-shrink-0", textMuted)} />
                                        <span className={cn("text-xs", textSecondary)}>{customer.phone}</span>
                                      </div>
                                    )}
                                    {!customer.email && !customer.phone && (
                                      <span className={cn("text-xs", textMuted)}>—</span>
                                    )}
                                  </div>
                                </td>

                                {/* City */}
                                <td className="px-4 py-3">
                                  {customer.city ? (
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className={cn("h-3 w-3", textMuted)} />
                                      <span className={cn("text-xs", textSecondary)}>{customer.city}</span>
                                    </div>
                                  ) : (
                                    <span className={cn("text-xs", textMuted)}>—</span>
                                  )}
                                </td>

                                {/* Orders */}
                                <td className={cn("px-4 py-3 text-sm font-medium text-right", textPrimary)}>
                                  {customer.orderCount}
                                </td>

                                {/* Total Spent */}
                                <td className={cn("px-4 py-3 text-sm font-semibold text-right", textPrimary)}>
                                  {formatPKR(customer.totalSpent)}
                                </td>

                                {/* Tier */}
                                <td className="px-4 py-3">
                                  <div className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                                    isDark ? `${tier.darkBg} ${tier.darkColor}` : `${tier.bg} ${tier.color}`
                                  )}>
                                    <TierIcon className="h-3 w-3" />
                                    {customer.loyaltyTier.charAt(0).toUpperCase() + customer.loyaltyTier.slice(1)}
                                  </div>
                                </td>

                                {/* Actions */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => handleEdit(customer)}
                                      className={cn(
                                        "p-1.5 rounded-lg transition-colors",
                                        isDark
                                          ? "hover:bg-white/10 text-slate-400 hover:text-white"
                                          : "hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                                      )}
                                      title="Edit"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setDeleteTarget(customer)}
                                      className={cn(
                                        "p-1.5 rounded-lg transition-colors",
                                        "hover:bg-red-500/10 text-slate-400 hover:text-red-500"
                                      )}
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {paginatedCustomers.map((customer) => {
                    const tier = TIER_CONFIG[customer.loyaltyTier] || TIER_CONFIG.new;
                    const TierIcon = tier.icon;
                    return (
                      <Card key={customer.id} className={cardClass}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0",
                                isGold
                                  ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/20 text-amber-400"
                                  : isDark
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-emerald-100 text-emerald-700"
                              )}>
                                {customer.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className={cn("text-sm font-semibold truncate", textPrimary)}>{customer.name}</p>
                                <div className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium mt-0.5",
                                  isDark ? `${tier.darkBg} ${tier.darkColor}` : `${tier.bg} ${tier.color}`
                                )}>
                                  <TierIcon className="h-2.5 w-2.5" />
                                  {customer.loyaltyTier.charAt(0).toUpperCase() + customer.loyaltyTier.slice(1)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleEdit(customer)}
                                className={cn("p-1.5 rounded-lg", isDark ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-500")}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(customer)}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                            <div>
                              <p className={cn("text-[10px] uppercase tracking-wider", textMuted)}>Orders</p>
                              <p className={cn("text-sm font-bold mt-0.5", textPrimary)}>{customer.orderCount}</p>
                            </div>
                            <div>
                              <p className={cn("text-[10px] uppercase tracking-wider", textMuted)}>Spent</p>
                              <p className={cn("text-sm font-bold mt-0.5", textPrimary)}>{formatPKR(customer.totalSpent)}</p>
                            </div>
                            <div>
                              <p className={cn("text-[10px] uppercase tracking-wider", textMuted)}>City</p>
                              <p className={cn("text-sm mt-0.5", textSecondary)}>{customer.city || "—"}</p>
                            </div>
                          </div>

                          {(customer.email || customer.phone) && (
                            <div className={cn("space-y-1 pt-2 border-t", isDark ? "border-white/[0.04]" : "border-slate-100")}>
                              {customer.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className={cn("h-3 w-3", textMuted)} />
                                  <span className={cn("text-xs truncate", textSecondary)}>{customer.email}</span>
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className={cn("h-3 w-3", textMuted)} />
                                  <span className={cn("text-xs", textSecondary)}>{customer.phone}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className={cn("text-xs", textMuted)}>
                      Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredCustomers.length)} of {filteredCustomers.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn("h-8 w-8", isGold && "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white")}
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="icon"
                            className={cn(
                              "h-8 w-8 text-xs",
                              currentPage === pageNum
                                ? isGold
                                  ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black"
                                  : "bg-emerald-600 text-white hover:bg-emerald-700"
                                : isGold && "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
                            )}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn("h-8 w-8", isGold && "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white")}
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ═══ SEGMENTS TAB ═══ */}
        {activeTab === "segments" && (
          <motion.div key="segments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(["new", "bronze", "silver", "gold"] as const).map((tier) => {
                  const tierConf = TIER_CONFIG[tier];
                  const TierIcon = tierConf.icon;
                  const count = stats.tierCounts[tier];
                  const total = stats.totalCustomers || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <Card key={tier} className={statCardClass}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center",
                            isDark ? tierConf.darkBg : tierConf.bg
                          )}>
                            <TierIcon className={cn("h-4 w-4", isDark ? tierConf.darkColor : tierConf.color)} />
                          </div>
                          <div>
                            <p className={cn("text-xs font-medium capitalize", isDark ? tierConf.darkColor : tierConf.color)}>{tier}</p>
                            <p className={cn("text-lg font-bold", textPrimary)}>{count}</p>
                          </div>
                        </div>
                        <div className={cn("w-full h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-slate-100")}>
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              tier === "gold" && "bg-yellow-500",
                              tier === "silver" && "bg-slate-400",
                              tier === "bronze" && "bg-amber-700",
                              tier === "new" && "bg-slate-300"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className={cn("text-[10px] mt-1", textMuted)}>{pct}% of customers</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ NOTES TAB ═══ */}
        {activeTab === "notes" && (
          <motion.div key="notes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => setNoteOpen(true)}
                className={cn(
                  isGold
                    ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Note
              </Button>
            </div>
            {notes.length === 0 ? (
              <Card className={cardClass}>
                <CardContent>
                  <EmptyState
                    icon={Users}
                    title="No notes yet"
                    description="Add notes about your customers to remember important details."
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {notes.map((note) => (
                  <Card key={note.id} className={cardClass}>
                    <CardContent className="p-3">
                      <p className={cn("text-sm", textPrimary)}>{note.text}</p>
                      <p className={cn("text-xs mt-1", textMuted)}>{note.createdAt}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customer Modal */}
      {organization && (
        <CustomerModal
          open={customerModalOpen}
          onClose={handleModalClose}
          onSaved={handleModalSaved}
          organizationId={organization.id}
          customer={editingCustomer}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Customer"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone and will also remove their associated order references.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Note Dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className={cn("sm:max-w-md", isGold && "bg-[#15151e] border-white/[0.08]")}>
          <DialogHeader>
            <DialogTitle className={cn(isDark && "text-white")}>Add Note</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!noteText.trim()) { toast.error("Note text is required"); return; }
              setNotes((prev) => [
                { id: Date.now(), text: noteText.trim(), createdAt: new Date().toLocaleString() },
                ...prev,
              ]);
              setNoteText("");
              setNoteOpen(false);
              toast.success("Note added successfully!");
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>Note</Label>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write a note about your customer..."
                rows={4}
                autoFocus
                className={cn(
                  isGold && "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-500",
                  isDark && !isGold && "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-500"
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setNoteOpen(false)}
                className={cn(isGold && "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className={cn(
                  isGold
                    ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
              >
                Add Note
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

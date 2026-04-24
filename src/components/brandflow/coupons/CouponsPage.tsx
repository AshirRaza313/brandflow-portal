"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBrandForgeStore } from "@/store/brandflow-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search, Ticket, Gift, Plus, Pencil, Trash2, RefreshCw, Loader2, Tag, Percent, Banknote, CalendarDays, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CouponModal } from "./CouponModal";
import { ConfirmDialog } from "@/components/brandflow/shared/ConfirmDialog";
import { LoadingSkeleton } from "@/components/brandflow/shared/LoadingSkeleton";
import { StatsCard } from "@/components/brandflow/shared/StatsCard";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrder: number | null;
  usageLimit: number | null;
  usageCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const subTabs = [
  { id: "active", label: "Active" },
  { id: "expired", label: "Expired" },
];

// ── Component ──────────────────────────────────────────────────────────────

export function CouponsPage() {
  const { organization, appTheme } = useBrandForgeStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  // State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deletingCouponId, setDeletingCouponId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch Coupons ─────────────────────────────────────────────────────

  const fetchCoupons = useCallback(async () => {
    if (!organization?.id) { setLoading(false); return; }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/coupons?orgId=${organization.id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch coupons");
      }
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch (err: any) {
      console.error("Fetch coupons error:", err);
      setError(err.message || "Something went wrong");
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  // ── Debounced Search ──────────────────────────────────────────────────

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => { setSearch(value); }, 300);
  };

  // ── Filtered Coupons ──────────────────────────────────────────────────

  const filteredCoupons = useMemo(() => {
    const now = new Date();
    let filtered = coupons;

    // Tab filter
    if (activeTab === "active") {
      filtered = coupons.filter((c) => c.isActive && (!c.expiresAt || new Date(c.expiresAt) >= now));
    } else {
      filtered = coupons.filter((c) => !c.isActive || (c.expiresAt && new Date(c.expiresAt) < now));
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((c) => c.code.toLowerCase().includes(q));
    }

    return filtered;
  }, [coupons, activeTab, search]);

  // ── Stats ─────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const now = new Date();
    const active = coupons.filter((c) => c.isActive && (!c.expiresAt || new Date(c.expiresAt) >= now));
    const totalRedeemed = coupons.reduce((s, c) => s + c.usageCount, 0);
    const totalSavings = coupons.reduce((s, c) => s + (c.type === "percentage" ? 0 : c.value * c.usageCount), 0);
    return {
      active: active.length,
      total: coupons.length,
      totalRedeemed,
      totalSavings,
    };
  }, [coupons]);

  // ── Delete ────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deletingCouponId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/coupons/${deletingCouponId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Coupon deleted");
      setDeletingCouponId(null);
      fetchCoupons();
    } catch {
      toast.error("Failed to delete coupon");
    } finally {
      setDeleting(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCouponModalOpen(true);
  };

  const openCreate = () => {
    setEditingCoupon(null);
    setCouponModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setCouponModalOpen(open);
    if (!open) setEditingCoupon(null);
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      toast.success(coupon.isActive ? "Coupon deactivated" : "Coupon activated");
      fetchCoupons();
    } catch {
      toast.error("Failed to update coupon");
    }
  };

  // ── Theme Classes ────────────────────────────────────────────────────

  const cardClass = isGold
    ? "bg-white/[0.03] border-white/[0.06]"
    : isDark
      ? "bg-white/[0.03] border-white/[0.06]"
      : "bg-white";

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-500" : "text-muted-foreground";
  const borderColor = isGold ? "border-white/[0.06]" : isDark ? "border-white/[0.06]" : "border-slate-200";

  const getCouponCardBg = () => {
    if (isGold) return "bg-white/[0.03] border-white/[0.06] hover:border-amber-500/20";
    if (isDark) return "bg-white/[0.03] border-white/[0.06] hover:border-emerald-500/20";
    return "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm";
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-xl sm:text-2xl font-bold", textPrimary)}>Coupons & Offers</h1>
          <p className={cn("text-sm mt-1", textSecondary)}>Create and manage discount codes</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => fetchCoupons()} disabled={loading}
            className={cn(isGold && "border-amber-500/20 text-amber-400 hover:bg-amber-500/10", isDark && !isGold && "border-white/10 text-slate-300 hover:bg-white/5")}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            className={isGold ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black hover:shadow-[0_4px_20px_rgba(212,160,23,0.3)] hover:-translate-y-0.5" : "bg-emerald-600 hover:bg-emerald-700"}
            onClick={openCreate}
          >
            <Plus className="mr-2 h-4 w-4" /> Create Coupon
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatsCard title="Active Coupons" value={stats.active} icon={Ticket} loading={loading} variant="success" />
        <StatsCard title="Total Coupons" value={stats.total} icon={Gift} loading={loading} />
        <StatsCard title="Total Redeemed" value={stats.totalRedeemed} icon={Tag} loading={loading} />
        <StatsCard title="Total Savings (Rs.)" value={stats.totalSavings.toLocaleString()} icon={Banknote} loading={loading} variant="warning" />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b overflow-x-auto tab-bar-scroll" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
        {subTabs.map((tab) => {
          const count = tab.id === "active" ? stats.active : stats.total - stats.active;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? isGold
                    ? "border-amber-500 text-amber-400"
                    : isDark
                      ? "border-emerald-500 text-emerald-400"
                      : "border-emerald-600 text-emerald-600"
                  : isDark
                    ? "border-transparent text-slate-500 hover:text-slate-300"
                    : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {tab.label}
              <span className={cn(
                "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full",
                activeTab === tab.id
                  ? isGold
                    ? "bg-amber-500/20 text-amber-300"
                    : isDark
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-emerald-50 text-emerald-700"
                  : isDark
                    ? "bg-white/5 text-slate-500"
                    : "bg-slate-100 text-slate-500"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by coupon code..."
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className={cn("pl-9", isDark && "border-white/10 bg-white/[0.03] focus-visible:border-emerald-500/50 placeholder:text-slate-500")}
        />
      </div>

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* Error */}
      {!loading && error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={cn(cardClass, "border-red-500/30")}>
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-500 font-medium mb-1">Failed to load coupons</p>
              <p className={cn("text-sm mb-4", textMuted)}>{error}</p>
              <Button variant="outline" onClick={() => fetchCoupons()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Try Again
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Coupon Cards ─────────────────────────────────────────────── */}
      {!loading && !error && filteredCoupons.length === 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${search}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className={cardClass}>
              <CardContent className="p-4">
                <EmptyState
                  icon={Ticket}
                  title={search ? "No matching coupons" : activeTab === "active" ? "No active coupons" : "No expired coupons"}
                  description={
                    search
                      ? `No coupons match "${search}".`
                      : activeTab === "active"
                        ? "Create your first discount code to attract customers."
                        : "Expired coupons will appear here."
                  }
                  action={activeTab === "active" && !search ? { label: "Create Coupon", onClick: openCreate } : undefined}
                />
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {!loading && !error && filteredCoupons.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${search}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredCoupons.map((coupon, index) => {
              const now = new Date();
              const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < now;
              const isUsedUp = coupon.usageLimit && coupon.usageCount >= coupon.usageLimit;

              return (
                <motion.div
                  key={coupon.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "group rounded-xl border p-4 transition-all",
                    getCouponCardBg(),
                    isExpired && "opacity-60"
                  )}
                >
                  {/* Coupon Code & Type */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        isGold ? "bg-amber-500/10" : isDark ? "bg-emerald-500/10" : "bg-emerald-100"
                      )}>
                        {coupon.type === "percentage" ? (
                          <Percent className={cn("h-5 w-5", isDark ? "text-amber-400" : "text-emerald-600")} />
                        ) : (
                          <Banknote className={cn("h-5 w-5", isDark ? "text-amber-400" : "text-emerald-600")} />
                        )}
                      </div>
                      <div>
                        <h3 className={cn("font-mono font-bold text-sm tracking-wider", textPrimary)}>
                          {coupon.code}
                        </h3>
                        <p className={cn("text-[10px] font-medium uppercase", textMuted)}>
                          {coupon.type === "percentage" ? "Percentage" : "Fixed Amount"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        onClick={() => openEdit(coupon)}
                        className={cn("h-7 w-7 rounded flex items-center justify-center", isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400")}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setDeletingCouponId(coupon.id)}
                        className="h-7 w-7 rounded flex items-center justify-center hover:bg-red-500/10 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Discount Value */}
                  <div className={cn(
                    "text-2xl font-bold mb-3",
                    isGold ? "text-amber-400" : "text-emerald-600"
                  )}>
                    {coupon.type === "percentage"
                      ? `${coupon.value}%`
                      : `Rs. ${coupon.value.toLocaleString()}`
                    }
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    {/* Min Order */}
                    {coupon.minOrder && (
                      <div className={cn("flex items-center justify-between text-xs", textSecondary)}>
                        <span>Min Order</span>
                        <span className={cn("font-medium", textPrimary)}>Rs. {coupon.minOrder.toLocaleString()}</span>
                      </div>
                    )}

                    {/* Usage */}
                    <div className={cn("flex items-center justify-between text-xs", textSecondary)}>
                      <span>Usage</span>
                      <div className="flex items-center gap-2">
                        <span className={cn("font-medium", isUsedUp ? "text-red-500" : textPrimary)}>
                          {coupon.usageCount}
                        </span>
                        {coupon.usageLimit && (
                          <span className={cn("text-[10px]", textMuted)}>
                            / {coupon.usageLimit}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    {coupon.usageLimit && (
                      <div className={cn("h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-slate-100")}>
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            isUsedUp ? "bg-red-500" : isGold ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min((coupon.usageCount / coupon.usageLimit) * 100, 100)}%` }}
                        />
                      </div>
                    )}

                    {/* Expiry */}
                    {coupon.expiresAt && (
                      <div className={cn("flex items-center gap-1 text-xs", isExpired ? "text-red-500" : textSecondary)}>
                        <CalendarDays className="h-3 w-3" />
                        <span>{new Date(coupon.expiresAt).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        {isExpired && <span className="text-[10px] font-medium ml-1">EXPIRED</span>}
                      </div>
                    )}
                  </div>

                  {/* Status Toggle */}
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
                    <div className="flex items-center justify-between">
                      <span className={cn("text-[10px] uppercase font-medium tracking-wider", textMuted)}>Status</span>
                      <button
                        onClick={() => toggleActive(coupon)}
                        className={cn(
                          "text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors",
                          coupon.isActive
                            ? isGold
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                              : isDark
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isDark
                              ? "bg-white/5 text-slate-500 border-white/10"
                              : "bg-slate-50 text-slate-500 border-slate-200"
                        )}
                      >
                        {coupon.isActive ? "Active" : "Inactive"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Coupon Modal */}
      {organization && (
        <CouponModal
          open={couponModalOpen}
          onOpenChange={handleModalClose}
          organizationId={organization.id}
          editCoupon={editingCoupon}
          onSaved={() => fetchCoupons()}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!deletingCouponId}
        onOpenChange={(open) => { if (!open) setDeletingCouponId(null); }}
        title="Delete Coupon"
        description="Are you sure you want to delete this coupon? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

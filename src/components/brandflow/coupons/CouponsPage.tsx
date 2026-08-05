"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search, Ticket, Gift, Plus, Pencil, Trash2, RefreshCw, Loader2, Tag, Percent, Banknote, CalendarDays, AlertCircle, Clock, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CouponModal } from "./CouponModal";
import { ConfirmDialog } from "@/components/brandflow/shared/ConfirmDialog";
import { LoadingSkeleton } from "@/components/brandflow/shared/LoadingSkeleton";
import { StatsCard } from "@/components/brandflow/shared/StatsCard";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

// ── Types ────────────────────────────────────────────────────────────[...]

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

// ── Constants ──────────────────────────────────────────────────────────��[...]

const subTabs = [
  { id: "active", label: "Active" },
  { id: "usedup", label: "Used Up" },
  { id: "expired", label: "Expired" },
  { id: "inactive", label: "Inactive" },
];

// ── Component ──────────────────────────────────────────────────────────��[...]

export function CouponsPage() {
  const { organization, appTheme } = useValtrioxStore();
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
      const res = await fetchWithAuth(`/api/coupons?orgId=${organization.id}`);
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

  // ── Clean up debounce on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, []);

  // ── Debounced Search ──────────────────────────────────────────────────

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => { setSearch(value); }, 300);
  };

  // ── Helpers for status checks (use epoch compare to avoid TZ issues) --
  const isCouponExpired = (c: Coupon) => {
    if (!c.expiresAt) return false;
    const ts = Date.parse(c.expiresAt);
    if (Number.isNaN(ts)) return false;
    return ts < Date.now();
  };

  const isCouponUsedUp = (c: Coupon) => {
    return typeof c.usageLimit === 'number' && c.usageLimit > 0 && c.usageCount >= c.usageLimit;
  };

  // formatting helpers
  const fmtNumber = (n: number | null | undefined) => (typeof n === 'number' ? n.toLocaleString() : '0');

  // ── Filtered Coupons ──────────────────────────────────────────────────

  const filteredCoupons = useMemo(() => {
    const now = Date.now();
    let filtered = coupons;

    switch (activeTab) {
      case 'active':
        filtered = coupons.filter((c) => c.isActive && (!c.expiresAt || Date.parse(c.expiresAt) >= now) && !isCouponUsedUp(c));
        break;
      case 'usedup':
        filtered = coupons.filter((c) => isCouponUsedUp(c));
        break;
      case 'expired':
        filtered = coupons.filter((c) => c.expiresAt && Date.parse(c.expiresAt) < now);
        break;
      case 'inactive':
        filtered = coupons.filter((c) => !c.isActive);
        break;
      default:
        filtered = coupons;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((c) => (c.code || "").toLowerCase().includes(q));
    }

    return filtered;
  }, [coupons, activeTab, search]);

  // ── Stats ───────────────────────────────────────────────────────────[...]

  const stats = useMemo(() => {
    const now = Date.now();
    const active = coupons.filter((c) => c.isActive && (!c.expiresAt || Date.parse(c.expiresAt) >= now) && !isCouponUsedUp(c));
    const usedUp = coupons.filter((c) => isCouponUsedUp(c));
    const expired = coupons.filter((c) => c.expiresAt && Date.parse(c.expiresAt) < now);
    const inactive = coupons.filter((c) => !c.isActive);
    const totalRedeemed = coupons.reduce((s, c) => s + (c.usageCount || 0), 0);
    const totalSavings = coupons.reduce((s, c) => s + (c.type === "percentage" ? 0 : ((c.value || 0) * (c.usageCount || 0))), 0);
    return {
      active: active.length,
      usedUp: usedUp.length,
      expired: expired.length,
      inactive: inactive.length,
      total: coupons.length,
      totalRedeemed,
      totalSavings,
    };
  }, [coupons]);

  // ── Delete (optimistic) ─────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deletingCouponId) return;
    setDeleting(true);
    const prev = coupons;
    // optimistic remove
    setCoupons((prevList) => prevList.filter((c) => c.id !== deletingCouponId));

    try {
      const res = await fetchWithAuth(`/api/coupons/${deletingCouponId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Coupon deleted");
      setDeletingCouponId(null);
    } catch (err) {
      // revert
      setCoupons(prev);
      toast.error("Failed to delete coupon");
    } finally {
      setDeleting(false);
    }
  };

  // ── Toggle Active (optimistic) ──────────────────────────────────────

  const toggleActive = async (coupon: Coupon) => {
    const prev = coupons;
    // optimistic update
    setCoupons((prevList) => prevList.map(c => c.id === coupon.id ? { ...c, isActive: !c.isActive } : c));
    try {
      const res = await fetchWithAuth(`/api/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      toast.success(coupon.isActive ? "Coupon deactivated" : "Coupon activated");
    } catch (err) {
      // revert on error
      setCoupons(prev);
      toast.error("Failed to update coupon");
    }
  };

  // ── Modal helpers ───────────────────────────────────────────────────
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

  // ── Theme Classes ───────────────────────────────────────────────────

  const cardClass = isGold
    ? "bg-white/[0.03] border-white/[0.06]"
    : isDark
      ? "bg-white/[0.03] border-white/[0.06]"
      : "bg-white";

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-400" : "text-muted-foreground";
  const borderColor = isGold ? "border-white/[0.06]" : isDark ? "border-white/[0.06]" : "border-slate-200";

  const getCouponCardBg = () => {
    if (isGold) return "bg-white/[0.03] border-white/[0.06] hover:border-amber-500/20";
    if (isDark) return "bg-white/[0.03] border-white/[0.06] hover:border-amber-500/20";
    return "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm";
  };

  // ── Render ──────────────────────────────────────────────────────────��[...]

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
            className={isGold ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black hover:shadow-[0_4px_20px_rgba(211,166,56,0.3)] hover:-translate-y-0.5" : "bg-amber-600 hover:bg-amber-700 text-white"}
            onClick={openCreate}
          >
            <Plus className="mr-2 h-4 w-4" /> Create Coupon
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatsCard title="Active Coupons" value={stats.active} icon={Ticket} loading={loading} variant="success" />
        <StatsCard title="Used Up" value={stats.usedUp} icon={Tag} loading={loading} />
        <StatsCard title="Expired" value={stats.expired} icon={Clock} loading={loading} />
        <StatsCard title="Inactive" value={stats.inactive} icon={Gift} loading={loading} variant="warning" />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b overflow-x-auto tab-bar-scroll" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
        {subTabs.map((tab) => {
          let count = 0;
          if (tab.id === "active") count = stats.active;
          else if (tab.id === "usedup") count = stats.usedUp;
          else if (tab.id === "expired") count = stats.expired;
          else if (tab.id === "inactive") count = stats.inactive;

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
                      ? "border-amber-500 text-amber-400"
                      : "border-amber-600 text-amber-600"
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
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-amber-50 text-amber-700"
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
          className={cn("pl-9", isDark && "border-white/10 bg-white/[0.03] focus-visible:border-amber-500/50 placeholder:text-slate-500")}
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
            <Card className={cn(cardClass, "overflow-hidden")}>
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col items-center text-center">
                  <div className={cn(
                    "h-16 w-16 rounded-2xl flex items-center justify-center mb-4",
                    isGold ? "bg-gradient-to-br from-amber-500/15 to-yellow-500/10" : isDark ? "bg-amber-500/10" : "bg-amber-50"
                  )}>
                    <Ticket className={cn("h-8 w-8", isGold ? "text-amber-400" : isDark ? "text-amber-400" : "text-amber-600")} />
                  </div>
                  <h3 className={cn("text-lg font-semibold", textPrimary)}>
                    {search ? "No matching coupons" : activeTab === "active" ? "No active coupons" : activeTab === 'usedup' ? 'No used up coupons' : activeTab === 'expired' ? 'No expired coupons' : 'No inactive coupons'}
                  </h3>
                  <p className={cn("text-sm mt-1.5 max-w-sm", textSecondary)}>
                    {search
                      ? `No coupons match "${search}".`
                      : activeTab === "active"
                        ? "Create your first discount code to attract customers and boost sales."
                        : activeTab === 'usedup'
                          ? 'Coupons that reached their usage limit will appear here.'
                          : activeTab === 'expired'
                            ? 'Expired coupons will appear here.'
                            : 'Inactive (manually disabled) coupons appear here.'
                    }
                  </p>
                  {activeTab === "active" && !search ? (
                    <Button
                      className={cn(
                        "mt-5",
                        isGold
                          ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black hover:shadow-[0_4px_20px_rgba(211,166,56,0.3)] hover:-translate-y-0.5"
                          : "bg-amber-600 hover:bg-amber-700"
                      )}
                      onClick={openCreate}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Create First Coupon
                    </Button>
                  ) : (
                    search && (
                      <Button variant="outline" className="mt-5" onClick={() => { setSearchInput(""); setSearch(""); }}>
                        <Search className="mr-2 h-4 w-4" /> Clear Search
                      </Button>
                    )
                  )}
                </div>
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
              const now = Date.now();
              const expired = coupon.expiresAt && Date.parse(coupon.expiresAt) < now;
              const isUsed = isCouponUsedUp(coupon);
              const status = (function() {
                if (!coupon.isActive) return { label: "Inactive", variant: "inactive" as const };
                if (expired) return { label: "Expired", variant: "expired" as const };
                if (isUsed) return { label: "Used Up", variant: "usedup" as const };
                return { label: "Active", variant: "active" as const };
              })();
              const usagePercent = coupon.usageLimit ? Math.round((coupon.usageCount / coupon.usageLimit) * 100) : null;

              return (
                <motion.div
                  key={coupon.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "group rounded-xl border overflow-hidden transition-all",
                    getCouponCardBg(),
                    expired && "opacity-60"
                  )}
                >
                  {/* Top accent strip */}
                  <div className={cn(
                    "h-1",
                    status.variant === "active"
                      ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"
                      : status.variant === "expired"
                        ? "bg-gradient-to-r from-slate-400 to-slate-500"
                        : status.variant === "usedup"
                          ? "bg-gradient-to-r from-red-500 to-red-400"
                          : isDark ? "bg-white/10" : "bg-slate-200"
                  )} />

                  <div className="p-4">
                    {/* Coupon Code & Type + Status Badge */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "h-11 w-11 rounded-xl flex items-center justify-center",
                          isGold ? "bg-gradient-to-br from-amber-500/15 to-yellow-500/10" : isDark ? "bg-amber-500/10" : "bg-amber-100"
                        )}>
                          {coupon.type === "percentage" ? (
                            <Percent className={cn("h-5 w-5", isDark ? "text-amber-400" : "text-amber-600")} />
                          ) : (
                            <Banknote className={cn("h-5 w-5", isDark ? "text-amber-400" : "text-amber-600")} />
                          )}
                        </div>
                        <div>
                          <h3 className={cn("font-mono font-bold text-sm tracking-wider", textPrimary)}>
                            {coupon.code}
                          </h3>
                          <p className={cn("text-[10px] font-medium uppercase", textMuted)}>
                            {coupon.type === "percentage" ? "Percentage Off" : "Fixed Amount"}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
                        // reuse existing badge classes
                        status.variant === "active"
                          ? (isGold ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : isDark ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border border-emerald-200")
                          : status.variant === "expired"
                            ? (isGold ? "bg-slate-500/15 text-slate-400 border border-slate-500/20" : isDark ? "bg-slate-500/15 text-slate-400 border border-slate-500/20" : "bg-slate-100 text-slate-500 border border-slate-200")
                            : status.variant === "usedup"
                              ? (isGold ? "bg-red-500/15 text-red-400 border border-red-500/20" : isDark ? "bg-red-500/15 text-red-400 border border-red-500/20" : "bg-red-50 text-red-600 border border-red-200")
                              : (isGold ? "bg-white/5 text-slate-500 border border-white/10" : isDark ? "bg-white/5 text-slate-500 border border-white/10" : "bg-slate-50 text-slate-500 border border-slate-200")
                      )}>
                        {status.label}
                      </span>
                    </div>

                    {/* Discount Value */}
                    <div className={cn(
                      "text-3xl font-bold mb-3",
                      isGold ? "text-amber-400" : "text-amber-600"
                    )}>
                      {coupon.type === "percentage"
                        ? `${typeof coupon.value === 'number' ? coupon.value : 0}%`
                        : `Rs. ${fmtNumber(coupon.value)`}
                      }
                    </div>

                    {/* Details */}
                    <div className="space-y-2.5">
                      {/* Min Order */}
                      {typeof coupon.minOrder === 'number' && (
                        <div className={cn("flex items-center justify-between text-xs", textSecondary)}>
                          <span>Min. Order</span>
                          <span className={cn("font-medium", textPrimary)}>Rs. {fmtNumber(coupon.minOrder)}</span>
                        </div>
                      )}

                      {/* Usage with percentage */}
                      <div className={cn("flex items-center justify-between text-xs", textSecondary)}>
                        <div className="flex items-center gap-1.5">
                          <Zap className="h-3 w-3" />
                          <span>Redemptions</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("font-semibold", isUsed ? "text-red-500" : textPrimary)}>
                            {coupon.usageCount || 0}
                          </span>
                          {typeof coupon.usageLimit === 'number' && (
                            <span className={cn("text-[10px]", textMuted)}>
                              / {fmtNumber(coupon.usageLimit)}
                            </span>
                          )}
                          {usagePercent !== null && (
                            <span className={cn(
                              "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                              usagePercent >= 80
                                ? "bg-red-500/10 text-red-500"
                                : usagePercent >= 50
                                  ? "bg-amber-500/10 text-amber-500"
                                  : "bg-emerald-500/10 text-emerald-500"
                            )}>
                              {usagePercent}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      {typeof coupon.usageLimit === 'number' && (
                        <div className="space-y-1">
                          <div className={cn("h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-slate-100")}>
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                isUsed
                                  ? "bg-gradient-to-r from-red-500 to-red-400"
                                  : usagePercent && usagePercent >= 80
                                    ? "bg-gradient-to-r from-amber-500 to-yellow-500"
                                    : "bg-gradient-to-r from-amber-500 to-yellow-400"
                              )}
                              style={{ width: `${Math.min((coupon.usageCount / (coupon.usageLimit || 1)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Expiry */}
                      {coupon.expiresAt && (
                        <div className={cn(
                          "flex items-center gap-1.5 text-xs",
                          expired ? "text-red-500" : textSecondary
                        )}>
                          <Clock className="h-3 w-3" />
                          <span>{new Date(coupon.expiresAt).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          {expired && <span className="text-[10px] font-semibold ml-1">EXPIRED</span>}
                        </div>
                      )}
                    </div>

                    {/* Quick Toggle */}
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
                      <div className="flex items-center justify-between">
                        <span className={cn("text-[10px] uppercase font-medium tracking-wider", textMuted)}>Quick Toggle</span>
                        <button
                          onClick={() => toggleActive(coupon)}
                          className={cn(
                            "text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all",
                            coupon.isActive
                              ? isGold
                                ? "bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/25"
                                : isDark
                                  ? "bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/25"
                                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                              : isDark
                                ? "bg-white/5 text-slate-500 border-white/10 hover:bg-white/10"
                                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                          )}
                        >
                          {coupon.isActive ? "Active" : "Inactive"}
                        </button>
                      </div>
                    </div>

                    {/* Hover Actions */}
                    <div className={cn(
                      "mt-3 flex items-center gap-1 pt-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
                      isDark ? "border-t border-white/[0.04]" : "border-t border-slate-100"
                    )}>
                      <button
                        onClick={() => openEdit(coupon)}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors flex-1 justify-center",
                          isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500"
                        )}
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => setDeletingCouponId(coupon.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors flex-1 justify-center hover:bg-red-500/10 text-slate-400 hover:text-red-50",
                        )}
                      >
                        <Trash2 className="h-3 w-3" /> Delete
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

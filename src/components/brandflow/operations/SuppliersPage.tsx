"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, ShoppingCart, DollarSign, Truck, Star, Award, TrendingUp, AlertTriangle, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";
import { useValtrioxStore } from "@/store/brandflow-store";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Supplier interface — MUST match API response (Prisma Supplier model)
// Field names match the Prisma schema exactly: email (not contactEmail)
// ─────────────────────────────────────────────────────────────────────────────
interface Supplier {
  id: string;
  name: string;
  email?: string | null; // Prisma: email String? — nullable
  phone?: string | null;
  contactPerson?: string | null;
  category?: string;
  address?: string | null;
  notes?: string | null;
  status: "active" | "inactive" | "blacklisted";
  rating: number | null; // 1-5 or null (unrated) — matches API tri-state
  createdAt: string;
  updatedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Server-provided aggregate statistics — returned by GET /api/operations/suppliers/stats
// Used for org-wide summary (not calculated from the locally loaded page)
// ─────────────────────────────────────────────────────────────────────────────
// G07: aligned with SupplierStatsResponse from src/lib/supplier-access.ts.
// avgRating and topPerformer.rating are tri-state (null when no rated suppliers).
interface SupplierStats {
  totalSuppliers: number;
  ratedCount: number;
  avgRating: number | null;
  topPerformer: {
    id: string;
    name: string;
    rating: number | null;
  } | null;
  needsAttentionCount: number;
}


// Inline star rating — matches ReviewsPage convention (fill-amber-400) with
// dark-theme-aware empty stars and optional click-to-rate interactivity.
// Clicking the currently-selected star clears the rating (sends null to API).
function StarRating({
  rating,
  onChange,
  isDark,
  size = "h-4 w-4",
  disabled,
}: {
  rating: number | null;
  onChange?: (r: number | null) => void;
  isDark: boolean;
  size?: string;
  disabled?: boolean;
}) {
  const current = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Supplier rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange || disabled}
          onClick={() => onChange?.(star === current ? null : star)}
          className={cn(
            "transition-transform",
            onChange && !disabled ? "cursor-pointer hover:scale-110" : "cursor-default disabled:opacity-100"
          )}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          aria-checked={star === current}
          role="radio"
        >
          <Star
            className={cn(
              size,
              star <= current
                ? "fill-amber-400 text-amber-400"
                : isDark
                  ? "text-slate-600"
                  : "text-slate-300"
            )}
          />
        </button>
      ))}
    </div>
  );
}

// Rating tier badge — maps a numeric rating to a { label, classes } tier.
// null/0 → "Not Rated"
function getRatingTier(rating: number | null, isDark: boolean) {
  const r = rating ?? 0;
  if (r >= 4.5) return { label: "Excellent", classes: isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-100 text-emerald-700" };
  if (r >= 3.5) return { label: "Good", classes: isDark ? "bg-sky-500/15 text-sky-400" : "bg-sky-100 text-sky-700" };
  if (r >= 2.5) return { label: "Average", classes: isDark ? "bg-amber-500/15 text-amber-400" : "bg-amber-100 text-amber-700" };
  if (r >= 1) return { label: "Needs Improvement", classes: isDark ? "bg-orange-500/15 text-orange-400" : "bg-orange-100 text-orange-700" };
  return { label: "Not Rated", classes: isDark ? "bg-slate-500/15 text-slate-400" : "bg-slate-100 text-slate-500" };
}

// Status badge — maps supplier.status (returned by the API) to a { label, classes } pair.
// Falls back to "Unknown" for any unexpected value so we never silently mislabel a row.
function getStatusBadge(status: string | undefined | null, isDark: boolean) {
  switch (status) {
    case "active":
      return { label: "Active", classes: isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-100 text-emerald-700" };
    case "inactive":
      return { label: "Inactive", classes: isDark ? "bg-slate-500/15 text-slate-400" : "bg-slate-200 text-slate-600" };
    case "blacklisted":
      return { label: "Blacklisted", classes: isDark ? "bg-red-500/15 text-red-400" : "bg-red-100 text-red-700" };
    default:
      return { label: "Unknown", classes: isDark ? "bg-slate-500/15 text-slate-400" : "bg-slate-100 text-slate-500" };
  }
}

const PAGE_SIZE = 50; // API enforces max 100; 50 keeps initial load snappy

// Tolerant of 3 API response shapes (nested pagination object, flat, or legacy just-data).
// C02: hasMore is computed page-based (page < totalPages) when available,
// falling back to API-provided hasMore, then to legacy data.length < total.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePagination(json: any): {
  data: Supplier[];
  total: number | null;
  hasMore: boolean;
  access: { canRead: boolean; canWrite: boolean } | null;
} {
  const data: Supplier[] = Array.isArray(json?.suppliers)
    ? json.suppliers
    : Array.isArray(json?.data)
      ? json.data
      : [];

  const p = json?.pagination;
  const total = typeof p?.totalCount === "number"
    ? p.totalCount
    : typeof p?.total === "number"
      ? p.total
      : typeof json?.totalCount === "number"
        ? json.totalCount
        : typeof json?.total === "number"
          ? json.total
          : null;

  const totalPages = typeof p?.totalPages === "number"
    ? p.totalPages
    : null;
  const currentPage = typeof p?.page === "number"
    ? p.page
    : typeof json?.page === "number"
      ? json.page
      : 1;

  // C02 fix: page-based termination is the primary signal.
  // 1. Prefer API-provided hasMore (computed server-side as page < totalPages).
  // 2. Fall back to local page < totalPages computation (defensive).
  // 3. Legacy fallback: data.length < total (kept for backward compat).
  // 4. Default: false (no more pages).
  const hasMore = typeof p?.hasMore === "boolean"
    ? p.hasMore
    : typeof json?.hasMore === "boolean"
      ? json.hasMore
      : totalPages !== null
        ? currentPage < totalPages
        : total !== null
          ? data.length < total
          : false;

  // Server returns access: { canRead, canWrite } alongside the list.
  // This is the authoritative source for write permission (replaces hardcoded WRITE_ROLES).
  const accessRaw = json?.access;
  const access = accessRaw && typeof accessRaw === "object"
    ? {
        canRead: Boolean(accessRaw.canRead),
        canWrite: Boolean(accessRaw.canWrite),
      }
    : null;

  return { data, total, hasMore, access };
}
function LoadMoreButton({ onLoadMore, loading, hasMore, isDark }: {
  onLoadMore: () => void;
  loading: boolean;
  hasMore: boolean;
  isDark: boolean;
}) {
  if (!hasMore) return null;
  return (
    <div className="flex justify-center pt-4">
      <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loading}
        className={isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : ""}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : "Load More"}
      </Button>
    </div>
  );
}

// Loading skeleton rows — shown during initial fetch / manual retry
function SupplierSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center justify-between p-3 rounded-lg animate-pulse",
            isDark ? "bg-white/[0.03]" : "bg-slate-50"
          )}
        >
          <div className="space-y-2">
            <div className={cn("h-4 w-40 rounded", isDark ? "bg-slate-700" : "bg-slate-200")} />
            <div className={cn("h-3 w-56 rounded", isDark ? "bg-slate-700" : "bg-slate-200")} />
          </div>
          <div className={cn("h-6 w-16 rounded-full", isDark ? "bg-slate-700" : "bg-slate-200")} />
        </div>
      ))}
    </div>
  );
}

export function SuppliersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [stats, setStats] = useState<SupplierStats | null>(null);
  // True when stats fetch failed (403/404/500/network). UI must NOT silently
  // show 0/"-" as if those were genuine values — show an Unavailable state instead.
  const [statsError, setStatsError] = useState(false);
  // G08: distinct loading states so the UI does not flash "Unavailable" on
  // first mount, and so the Retry button can be disabled while in-flight
  // (prevents spam-clicking during a slow network).
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsRetrying, setStatsRetrying] = useState(false);
  // Server-returned access flags — authoritative source for read/write permission.
  // Replaces the legacy hardcoded WRITE_ROLES list (Issue #2).
  const [access, setAccess] = useState<{ canRead: boolean; canWrite: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingRatingId, setUpdatingRatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", category: "", address: "" });
  const [activeTab, setActiveTab] = useState<"directory" | "ratings">("directory");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { appTheme } = useValtrioxStore() as any;
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  // Write permission comes from the server's resolveSupplierAccess() check.
  // Until the first GET resolves, default to false (safest — hides Add/Delete buttons).
  const canWrite = access?.canWrite ?? false;

  // ───────────────────────────────────────────────────────────────────────────
  // fetchInitial — GET /api/operations/suppliers?page=1&limit=50
  // Response shape: { suppliers, stats, pagination }
  // We store both suppliers (for list rendering) AND stats (for org-wide summary).
  // ───────────────────────────────────────────────────────────────────────────
    const fetchInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    // C01 v2: Clear previous access at the START of every fetch attempt.
    setAccess(null);
    try {
      const res = await fetch(`/api/operations/suppliers?page=1&limit=${PAGE_SIZE}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      const json = await res.json();
      const { data, total, hasMore: more, access: accessFromServer } = normalizePagination(json);
      setSuppliers(data);
      setTotalCount(total);
      setHasMore(more);
      setAccess(accessFromServer);
      setPage(1);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/operations/suppliers?page=${nextPage}&limit=${PAGE_SIZE}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      const json = await res.json();
      const { data, hasMore: more, access: accessFromServer } = normalizePagination(json);
      setSuppliers(prev => {
        const ids = new Set(prev.map(s => s.id));
        return [...prev, ...data.filter(s => !ids.has(s.id))];
      });
      setPage(nextPage);
      setHasMore(more);
      // G06 + Point 6: refresh access on every page load. Fail-CLOSED:
      // if the response lacks an access field (403, network error, or
      // malformed payload), setAccess(null) so canWrite defaults to
      // false. Never retain stale write access from a previous page.
      setAccess(accessFromServer);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to load more suppliers");
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore]);

  const fetchStats = useCallback(async (isRetry = false) => {
    // G08: set the appropriate loading flag upfront so the UI can show
    // a loading state instead of flashing "Unavailable" on first mount,
    // and so Retry can be disabled while in-flight.
    if (isRetry) {
      setStatsRetrying(true);
    } else {
      setStatsLoading(true);
    }
    try {
      const res = await fetch("/api/operations/suppliers/stats", { cache: "no-store" });
      if (!res.ok) {
        // Stats unavailable (403/404/500). Mark failed so UI shows the truth,
        // not silent 0/"-" values. The list itself is unaffected.
        setStatsError(true);
        return;
      }
      const json = await res.json();
      setStats(json ?? null);
      setStatsError(false);
    } catch (error: unknown) {
      // Network/parse error — same truthful-unavailable handling.
      setStatsError(true);
      // eslint-disable-next-line no-console
      console.warn("Failed to fetch supplier stats", error);
    } finally {
      if (isRetry) {
        setStatsRetrying(false);
      } else {
        setStatsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Defer to microtask to avoid synchronous setState-in-effect
    // (React 19 + react-hooks/set-state-in-effect rule).
    // fetchInitial/fetchStats call setState before their first await,
    // which triggers the rule when called directly in the effect body.
    Promise.resolve().then(() => {
      fetchInitial();
      fetchStats();
    });
  }, [fetchInitial, fetchStats]);

  // ───────────────────────────────────────────────────────────────────────────
  // handleSubmit — POST /api/operations/suppliers
  // Body: { name, email, phone?, category?, address? }
  // Response: { supplier: Supplier } — must unwrap .supplier
  // ───────────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!formData.name) { toast.error("Supplier name is required"); return; }

    // Email is OPTIONAL. Normalize: trim → lowercase. Blank/whitespace → null.
    // (HTML5 type="email" validation does not fire on button-click, so validate format in JS.)
    const rawEmail = (formData.email ?? "").trim();
    let emailPayload: string | null = null;
    if (rawEmail !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(rawEmail)) {
        toast.error("Invalid email format");
        return;
      }
      emailPayload = rawEmail.toLowerCase();
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/operations/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: emailPayload,
          phone: formData.phone || undefined,
          category: formData.category || undefined,
          address: formData.address || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Failed to create (${res.status})`);
      }
      const json = await res.json();
      // POST returns { supplier: {...} } — unwrap it
      const created: Supplier = json.supplier;
      setSuppliers(prev => [created, ...prev]);
      setTotalCount((current) => current === null ? 1 : current + 1);
      // Refresh aggregate stats after create (total count changed)
      fetchStats();
      setCreateOpen(false);
      setFormData({ name: "", email: "", phone: "", category: "", address: "" });
      toast.success("Supplier added successfully!");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create supplier");
    } finally {
      setSubmitting(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // setSupplierRating — PATCH /api/operations/suppliers/[id]
  // Body: { rating: number | null } (tri-state: set, clear, omit)
  // Response: { supplier: Supplier } — must unwrap .supplier
  // ───────────────────────────────────────────────────────────────────────────
  const setSupplierRating = async (id: string, rating: number | null) => {
    const supplier = suppliers.find(s => s.id === id);
    if (!supplier) return;
    setUpdatingRatingId(id);
    // Optimistic update — instant UI feedback
    const prevRating = supplier.rating;
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, rating } : s));
    try {
      const res = await fetch(`/api/operations/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Failed to update (${res.status})`);
      }
      const json = await res.json();
      // PATCH returns { supplier: {...} } — unwrap it
      const updated: Supplier = json.supplier;
      setSuppliers(prev => prev.map(s => s.id === id ? updated : s));
      // Refresh aggregate stats after rating change (average / rated / top performer changed)
      fetchStats();
      if (rating === null) {
        toast.info(`Rating cleared for ${supplier.name}`);
      } else {
        toast.success(`${supplier.name} rated ${rating} star${rating !== 1 ? "s" : ""}`);
      }
    } catch (error: unknown) {
      // Revert on failure
      setSuppliers(prev => prev.map(s => s.id === id ? { ...s, rating: prevRating } : s));
      toast.error(error instanceof Error ? error.message : "Failed to update rating");
    } finally {
      setUpdatingRatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    const supplier = suppliers.find(s => s.id === id);
    if (!supplier) return;
    if (!confirm(`Delete "${supplier.name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/operations/suppliers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Failed to delete (${res.status})`);
      }
      setSuppliers(prev => prev.filter(s => s.id !== id));
      setTotalCount((current) => current === null ? null : Math.max(current - 1, 0));
      // Refresh aggregate stats after delete (total / top performer / needs attention changed)
      fetchStats();
      toast.success(`${supplier.name} deleted`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete supplier");
    } finally {
      setDeletingId(null);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Summary metrics — server-side aggregate API is authoritative.
  // The local page is a read-through subset and must never drive these values.
  // ───────────────────────────────────────────────────────────────────────────
  const totalSuppliers = stats?.totalSuppliers ?? totalCount ?? suppliers.length;
  // G07: stats.avgRating is now number | null per API contract.
  // Treat null as 0 for numeric display logic (avgRating > 0 check below).
  const avgRating = stats?.avgRating ?? 0;
  const ratedCount = stats?.ratedCount ?? 0;
  const topPerformer = stats?.topPerformer ?? null;
  const needsAttention = stats?.needsAttentionCount ?? 0;
    return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={isDark ? "text-2xl font-bold text-white" : "text-2xl font-bold text-slate-900"}>Supplier Management</h1>
          <p className={isDark ? "text-sm text-slate-400 mt-1" : "text-sm text-slate-500 mt-1"}>Manage vendors, track orders, and monitor supplier performance</p>
        </div>
        {canWrite && (
          <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setCreateOpen(true)}>
            <Building2 className="mr-2 h-4 w-4" /> Add Supplier
          </Button>
        )}
      </div>

      {/* Stats — uses server-provided stats.total (Issue 5 fix) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Suppliers", value: statsError ? "Unavailable" : statsLoading ? "..." : String(totalSuppliers), icon: Building2 },
          { title: "Active Orders", value: statsError ? "Unavailable" : "0", icon: ShoppingCart },
          { title: "Pending Payments", value: "Rs. 0", icon: DollarSign },
          { title: "On-Time Delivery", value: "-", icon: Truck },
        ].map((stat) => (
          <Card key={stat.title} className="border-slate-200">
            <CardContent className="p-4">
              <p className={isDark ? "text-xs font-medium text-slate-400 uppercase tracking-wider" : "text-xs font-medium text-slate-500 uppercase tracking-wider"}>{stat.title}</p>
              <p className={isDark ? "text-2xl font-bold text-white mt-1" : "text-2xl font-bold text-slate-900 mt-1"}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error banner with retry */}
      {error && !loading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div>
                <p className={isDark ? "text-sm font-medium text-red-300" : "text-sm font-medium text-red-700"}>Failed to load suppliers</p>
                <p className={isDark ? "text-xs text-red-400/80" : "text-xs text-red-600/80"}>{error}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchInitial}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tab Toggle */}
      <div className={isDark ? "flex flex-wrap gap-1 border-b border-slate-700/60" : "flex flex-wrap gap-1 border-b border-slate-200"}>
        <button
          onClick={() => setActiveTab("directory")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
            activeTab === "directory"
              ? "border-amber-600 text-amber-600"
              : isDark
                ? "border-transparent text-slate-400 hover:text-slate-200"
                : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Supplier Directory
        </button>
        <button
          onClick={() => setActiveTab("ratings")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
            activeTab === "ratings"
              ? "border-amber-600 text-amber-600"
              : isDark
                ? "border-transparent text-slate-400 hover:text-slate-200"
                : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Performance Ratings
        </button>
      </div>

      {/* Directory View */}
      {activeTab === "directory" && (
        <Card className="border-slate-200">
          <CardContent className="p-8">
            {loading ? (
              <SupplierSkeleton isDark={isDark} />
            ) : suppliers.length > 0 ? (
              <div className="space-y-3">
                <p className={isDark ? "text-base font-semibold text-white mb-4" : "text-base font-semibold text-slate-900 mb-4"}>Supplier Directory</p>
                {suppliers.map((supplier) => {
                  const status = getStatusBadge(supplier.status, isDark);
                  return (
                    <div key={supplier.id} className={isDark ? "flex items-center justify-between p-3 bg-white/[0.03] rounded-lg" : "flex items-center justify-between p-3 bg-slate-50 rounded-lg"}>
                      <div className="min-w-0">
                        <p className={isDark ? "text-sm font-medium text-white" : "text-sm font-medium text-slate-900"}>{supplier.name}</p>
                        <p className={isDark ? "text-xs text-slate-400 truncate" : "text-xs text-slate-500 truncate"}>{supplier.email || "No email"} · {supplier.category || "No category"}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn("px-2 py-1 text-xs font-medium rounded-full", status.classes)}>{status.label}</span>
                        {canWrite && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(supplier.id)}
                            disabled={deletingId === supplier.id}
                            className={isDark ? "text-slate-400 hover:text-red-400 hover:bg-red-500/10" : "text-slate-500 hover:text-red-600 hover:bg-red-50"}
                            aria-label={`Delete ${supplier.name}`}
                          >
                            {deletingId === supplier.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <LoadMoreButton onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} isDark={isDark} />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                <p className={isDark ? "text-sm font-medium text-red-300" : "text-sm font-medium text-red-700"}>Failed to load suppliers</p>
                <p className={isDark ? "text-xs text-red-400/80 mt-1" : "text-xs text-red-600/80 mt-1"}>Click the Retry button above to try again.</p>
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title="No suppliers added yet"
                description="Add suppliers to manage purchase orders, track deliveries, and monitor quality."
                action={canWrite ? { label: "Add Supplier", onClick: () => setCreateOpen(true) } : undefined}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Performance Ratings View — uses server-provided stats (Issue 5 fix) */}
      {activeTab === "ratings" && (
        <>
          {/* Ratings Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { title: "Average Rating", value: statsError ? "Unavailable" : statsLoading ? "..." : avgRating > 0 ? avgRating.toFixed(1) : "-", icon: Star, sub: statsError ? "Stats failed to load" : statsLoading ? "Loading..." : `${ratedCount} rated` },
              { title: "Total Rated", value: statsError ? "Unavailable" : statsLoading ? "..." : String(ratedCount), icon: Award, sub: statsError ? "Stats failed to load" : statsLoading ? "Loading..." : `of ${totalSuppliers} suppliers` },
              { title: "Top Performer", value: statsError ? "Unavailable" : statsLoading ? "..." : topPerformer ? topPerformer.name : "-", icon: TrendingUp, sub: statsError ? "Stats failed to load" : statsLoading ? "Loading..." : topPerformer ? `${topPerformer.rating} stars` : "No ratings yet" },
              { title: "Needs Attention", value: statsError ? "Unavailable" : statsLoading ? "..." : String(needsAttention), icon: AlertTriangle, sub: statsError ? "Stats failed to load" : statsLoading ? "Loading..." : "below 3 stars" },
            ].map((stat) => (
              <Card key={stat.title} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className={isDark ? "text-xs font-medium text-slate-400 uppercase tracking-wider" : "text-xs font-medium text-slate-500 uppercase tracking-wider"}>{stat.title}</p>
                    <stat.icon className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className={isDark ? "text-xl font-bold text-white truncate" : "text-xl font-bold text-slate-900 truncate"}>{stat.value}</p>
                  <p className={isDark ? "text-xs text-slate-500 mt-1" : "text-xs text-slate-400 mt-1"}>{stat.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Stats unavailable banner — C04 truthful failure state */}
          {statsError && !loading && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <p className={isDark ? "text-xs text-amber-300" : "text-xs text-amber-700"}>
                    Stats unavailable. Showing "Unavailable" above — try again.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchStats(true)}
                  disabled={statsRetrying}
                >
                  {statsRetrying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1" /> Retry Stats
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Rating List */}
          <Card className="border-slate-200">
            <CardContent className="p-8">
              {loading ? (
                <SupplierSkeleton isDark={isDark} />
              ) : suppliers.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <p className={isDark ? "text-base font-semibold text-white" : "text-base font-semibold text-slate-900"}>Supplier Performance</p>
                    <p className={isDark ? "text-xs text-slate-400" : "text-xs text-slate-500"}>{canWrite ? "Click stars to rate" : "Read-only"}</p>
                  </div>
                  {suppliers.map((supplier) => {
                    const rating = supplier.rating;
                    const tier = getRatingTier(rating, isDark);
                    return (
                      <div key={supplier.id} className={isDark ? "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/[0.03] rounded-lg" : "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg"}>
                        <div className="min-w-0">
                          <p className={isDark ? "text-sm font-medium text-white" : "text-sm font-medium text-slate-900"}>{supplier.name}</p>
                          <p className={isDark ? "text-xs text-slate-400" : "text-xs text-slate-500"}>{supplier.category || "No category"}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={cn("px-2 py-1 text-xs font-medium rounded-full", tier.classes)}>{tier.label}</span>
                          <StarRating
                            rating={rating}
                            onChange={canWrite ? (r) => setSupplierRating(supplier.id, r) : undefined}
                            isDark={isDark}
                            disabled={updatingRatingId === supplier.id}
                          />
                          <span className={isDark ? "text-xs font-medium text-slate-300 w-12 text-right" : "text-xs font-medium text-slate-700 w-12 text-right"}>{(rating ?? 0).toFixed(1)} / 5</span>
                        </div>
                      </div>
                    );
                  })}
                  <LoadMoreButton onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} isDark={isDark} />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                  <p className={isDark ? "text-sm font-medium text-red-300" : "text-sm font-medium text-red-700"}>Failed to load suppliers</p>
                  <p className={isDark ? "text-xs text-red-400/80 mt-1" : "text-xs text-red-600/80 mt-1"}>Click the Retry button above to try again.</p>
                </div>
              ) : (
                <EmptyState
                  icon={Star}
                  title="No suppliers to rate yet"
                  description="Add suppliers first, then come back here to track their performance ratings."
                  action={canWrite ? { label: "Add Supplier", onClick: () => { setActiveTab("directory"); setCreateOpen(true); } } : undefined}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Order History — always visible below both tab views */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <p className={isDark ? "text-base font-semibold text-white mb-4 flex items-center gap-2" : "text-base font-semibold text-slate-900 mb-4 flex items-center gap-2"}><ShoppingCart className="h-4 w-4 text-amber-600" /> Order History</p>
          <EmptyState icon={ShoppingCart} title="No orders placed yet" description="Purchase orders will appear here once you place orders with suppliers." />
        </CardContent>
      </Card>

      {/* Create Supplier Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={isDark ? "bg-slate-800 border-slate-700 text-slate-100" : ""}>
          <DialogHeader>
            <DialogTitle className={isGold ? "text-amber-400" : isDark ? "text-slate-100" : "text-slate-900"}>Add New Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Supplier Name</Label>
              <Input
                placeholder="Enter supplier name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
                disabled={submitting}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Contact Email (Optional)</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Phone</Label>
                <Input
                  placeholder="+971 50 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Category</Label>
              <Input
                placeholder="e.g. Skincare, Packaging, Raw Materials"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Address</Label>
              <Textarea
                placeholder="Enter supplier address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                rows={2}
                className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
                disabled={submitting}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} className={isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : ""} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-amber-600 hover:bg-amber-700 text-white" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
                  </>
                ) : (
                  "Add Supplier"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
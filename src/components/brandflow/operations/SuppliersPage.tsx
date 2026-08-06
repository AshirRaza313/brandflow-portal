// @ts-nocheck — Phase 8: pre-existing TS errors (Decimal/Prisma types, etc.) pending migration
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
// Server-provided statistics — from GET /api/operations/suppliers response
// Used for org-wide summary (not calculated from local page)
// ─────────────────────────────────────────────────────────────────────────────
interface SupplierStats {
  total: number;
  active: number;
  inactive: number;
  blacklisted: number;
  ratedCount: number;
  averageRating: number;
}

// NOTE: Write roles will be replaced in Issue 2 with dynamic permission check.
// For now, keeping legacy roles — Issue 2 will fix this properly.
const WRITE_ROLES = ["owner", "admin", "manager", "brand_owner", "brand_admin", "operations_manager"];

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingRatingId, setUpdatingRatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", contactEmail: "", phone: "", category: "", address: "" });
  const [activeTab, setActiveTab] = useState<"directory" | "ratings">("directory");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { appTheme, user } = useValtrioxStore() as any;
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  // Role-based write permission — NOTE: Issue 2 will replace this with
  // a dynamic DB-backed permission check. For now, expanded to include
  // Valtriox real roles (brand_owner, brand_admin, operations_manager).
  const userRole = (user?.role ?? "").toString().toLowerCase();
  const canWrite = WRITE_ROLES.includes(userRole);

  // ───────────────────────────────────────────────────────────────────────────
  // fetchSuppliers — GET /api/operations/suppliers?limit=200
  // Response shape: { suppliers: Supplier[], stats: SupplierStats, pagination: {...} }
  // We store both suppliers (for list rendering) AND stats (for org-wide summary).
  // ───────────────────────────────────────────────────────────────────────────
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/operations/suppliers?limit=200", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      const json = await res.json();
      // API returns { suppliers, stats, pagination } — NOT { data: [...] }
      setSuppliers(Array.isArray(json?.suppliers) ? json.suppliers : []);
      setStats(json?.stats ?? null);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // ───────────────────────────────────────────────────────────────────────────
  // handleSubmit — POST /api/operations/suppliers
  // Body: { name, email, phone?, category?, address? }
  // Response: { supplier: Supplier } — must unwrap .supplier
  // ───────────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!formData.name) { toast.error("Supplier name is required"); return; }
    if (!formData.contactEmail) { toast.error("Contact email is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/operations/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          // API schema field is "email", NOT "contactEmail"
          email: formData.contactEmail,
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
      // Refresh stats after create (total count changed)
      fetchSuppliers();
      setCreateOpen(false);
      setFormData({ name: "", contactEmail: "", phone: "", category: "", address: "" });
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
      // Refresh stats after rating change (averageRating / ratedCount changed)
      fetchSuppliers();
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
      // Refresh stats after delete (total count changed)
      fetchSuppliers();
      toast.success(`${supplier.name} deleted`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete supplier");
    } finally {
      setDeletingId(null);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Summary metrics — use SERVER-PROVIDED stats for org-wide aggregates.
  // topPerformer and needsAttention still need local supplier objects,
  // but total/averageRating/ratedCount come from the server (Issue 5 fix).
  // ───────────────────────────────────────────────────────────────────────────
  const totalSuppliers = stats?.total ?? suppliers.length;
  const avgRating = stats?.averageRating ?? 0;
  const ratedCount = stats?.ratedCount ?? 0;
  const ratedSuppliers = suppliers.filter(s => s.rating !== null && s.rating > 0);
  const topPerformer = ratedSuppliers.length > 0
    ? ratedSuppliers.reduce((top, s) => (s.rating ?? 0) > (top.rating ?? 0) ? s : top)
    : null;
  const needsAttention = suppliers.filter(s => s.rating !== null && s.rating > 0 && s.rating < 3).length;

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
          { title: "Total Suppliers", value: String(totalSuppliers), icon: Building2 },
          { title: "Active Orders", value: "0", icon: ShoppingCart },
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
            <Button variant="outline" size="sm" onClick={fetchSuppliers}>
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
                {suppliers.map((supplier) => (
                  <div key={supplier.id} className={isDark ? "flex items-center justify-between p-3 bg-white/[0.03] rounded-lg" : "flex items-center justify-between p-3 bg-slate-50 rounded-lg"}>
                    <div className="min-w-0">
                      <p className={isDark ? "text-sm font-medium text-white" : "text-sm font-medium text-slate-900"}>{supplier.name}</p>
                      <p className={isDark ? "text-xs text-slate-400 truncate" : "text-xs text-slate-500 truncate"}>{supplier.email || "No email"} · {supplier.category || "No category"}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={isDark ? "px-2 py-1 text-xs font-medium bg-amber-500/15 text-amber-400 rounded-full" : "px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full"}>Active</span>
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
                ))}
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
              { title: "Average Rating", value: avgRating > 0 ? avgRating.toFixed(1) : "-", icon: Star, sub: `${ratedCount} rated` },
              { title: "Total Rated", value: String(ratedCount), icon: Award, sub: `of ${totalSuppliers} suppliers` },
              { title: "Top Performer", value: topPerformer ? topPerformer.name : "-", icon: TrendingUp, sub: topPerformer ? `${topPerformer.rating} stars` : "No ratings yet" },
              { title: "Needs Attention", value: String(needsAttention), icon: AlertTriangle, sub: "below 3 stars" },
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
                <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Contact Email</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
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
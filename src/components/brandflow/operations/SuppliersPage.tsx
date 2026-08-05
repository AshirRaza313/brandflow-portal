// @ts-nocheck — Phase 8: pre-existing TS errors (Decimal/Prisma types, etc.) pending migration
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, ShoppingCart, DollarSign, Truck, Star, Award, TrendingUp, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";
import { useValtrioxStore } from "@/store/brandflow-store";
import { cn } from "@/lib/utils";

interface Supplier {
  id: number;
  name: string;
  contactEmail: string;
  phone: string;
  category: string;
  address: string;
  createdAt: string;
  rating?: number; // 0-5, whole stars
}

// Inline star rating — matches ReviewsPage convention (fill-amber-400) with
// dark-theme-aware empty stars and optional click-to-rate interactivity.
function StarRating({
  rating,
  onChange,
  isDark,
  size = "h-4 w-4",
}: {
  rating: number;
  onChange?: (r: number) => void;
  isDark: boolean;
  size?: string;
}) {
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Supplier rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(star === rating ? 0 : star)}
          className={cn(
            "transition-transform",
            onChange ? "cursor-pointer hover:scale-110" : "cursor-default disabled:opacity-100"
          )}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          aria-checked={star === rating}
          role="radio"
        >
          <Star
            className={cn(
              size,
              star <= rating
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
function getRatingTier(rating: number, isDark: boolean) {
  if (rating >= 4.5) return { label: "Excellent", classes: isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-100 text-emerald-700" };
  if (rating >= 3.5) return { label: "Good", classes: isDark ? "bg-sky-500/15 text-sky-400" : "bg-sky-100 text-sky-700" };
  if (rating >= 2.5) return { label: "Average", classes: isDark ? "bg-amber-500/15 text-amber-400" : "bg-amber-100 text-amber-700" };
  if (rating >= 1) return { label: "Needs Improvement", classes: isDark ? "bg-orange-500/15 text-orange-400" : "bg-orange-100 text-orange-700" };
  return { label: "Not Rated", classes: isDark ? "bg-slate-500/15 text-slate-400" : "bg-slate-100 text-slate-500" };
}

export function SuppliersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState({ name: "", contactEmail: "", phone: "", category: "", address: "" });
  const [activeTab, setActiveTab] = useState<"directory" | "ratings">("directory");
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  const handleSubmit = () => {
    if (!formData.name) { toast.error("Supplier name is required"); return; }
    if (!formData.contactEmail) { toast.error("Contact email is required"); return; }
    setSuppliers(prev => [
      { id: Date.now(), ...formData, createdAt: new Date().toISOString(), rating: 0 },
      ...prev,
    ]);
    setCreateOpen(false);
    setFormData({ name: "", contactEmail: "", phone: "", category: "", address: "" });
    toast.success("Supplier added successfully!");
  };

  const setSupplierRating = (id: number, rating: number) => {
    const supplier = suppliers.find(s => s.id === id);
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, rating } : s));
    if (supplier) {
      if (rating === 0) {
        toast.info(`Rating cleared for ${supplier.name}`);
      } else {
        toast.success(`${supplier.name} rated ${rating} star${rating !== 1 ? "s" : ""}`);
      }
    }
  };

  // Ratings summary metrics
  const ratedSuppliers = suppliers.filter(s => (s.rating ?? 0) > 0);
  const avgRating = ratedSuppliers.length > 0
    ? ratedSuppliers.reduce((sum, s) => sum + (s.rating ?? 0), 0) / ratedSuppliers.length
    : 0;
  const topPerformer = ratedSuppliers.length > 0
    ? ratedSuppliers.reduce((top, s) => (s.rating ?? 0) > (top.rating ?? 0) ? s : top)
    : null;
  const needsAttention = suppliers.filter(s => (s.rating ?? 0) > 0 && (s.rating ?? 0) < 3).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={isDark ? "text-2xl font-bold text-white" : "text-2xl font-bold text-slate-900"}>Supplier Management</h1>
          <p className={isDark ? "text-sm text-slate-400 mt-1" : "text-sm text-slate-500 mt-1"}>Manage vendors, track orders, and monitor supplier performance</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setCreateOpen(true)}>
          <Building2 className="mr-2 h-4 w-4" /> Add Supplier
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Suppliers", value: String(suppliers.length), icon: Building2 },
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
            {suppliers.length > 0 ? (
              <div className="space-y-3">
                <p className={isDark ? "text-base font-semibold text-white mb-4" : "text-base font-semibold text-slate-900 mb-4"}>Supplier Directory</p>
                {suppliers.map((supplier) => (
                  <div key={supplier.id} className={isDark ? "flex items-center justify-between p-3 bg-white/[0.03] rounded-lg" : "flex items-center justify-between p-3 bg-slate-50 rounded-lg"}>
                    <div>
                      <p className={isDark ? "text-sm font-medium text-white" : "text-sm font-medium text-slate-900"}>{supplier.name}</p>
                      <p className={isDark ? "text-xs text-slate-400" : "text-xs text-slate-500"}>{supplier.contactEmail} · {supplier.category || "No category"}</p>
                    </div>
                    <span className={isDark ? "px-2 py-1 text-xs font-medium bg-amber-500/15 text-amber-400 rounded-full" : "px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full"}>Active</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title="No suppliers added yet"
                description="Add suppliers to manage purchase orders, track deliveries, and monitor quality."
                action={{ label: "Add Supplier", onClick: () => setCreateOpen(true) }}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Performance Ratings View */}
      {activeTab === "ratings" && (
        <>
          {/* Ratings Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { title: "Average Rating", value: avgRating > 0 ? avgRating.toFixed(1) : "-", icon: Star, sub: `${ratedSuppliers.length} rated` },
              { title: "Total Rated", value: String(ratedSuppliers.length), icon: Award, sub: `of ${suppliers.length} suppliers` },
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
              {suppliers.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <p className={isDark ? "text-base font-semibold text-white" : "text-base font-semibold text-slate-900"}>Supplier Performance</p>
                    <p className={isDark ? "text-xs text-slate-400" : "text-xs text-slate-500"}>Click stars to rate</p>
                  </div>
                  {suppliers.map((supplier) => {
                    const rating = supplier.rating ?? 0;
                    const tier = getRatingTier(rating, isDark);
                    return (
                      <div key={supplier.id} className={isDark ? "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/[0.03] rounded-lg" : "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg"}>
                        <div className="min-w-0">
                          <p className={isDark ? "text-sm font-medium text-white" : "text-sm font-medium text-slate-900"}>{supplier.name}</p>
                          <p className={isDark ? "text-xs text-slate-400" : "text-xs text-slate-500"}>{supplier.category || "No category"}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={cn("px-2 py-1 text-xs font-medium rounded-full", tier.classes)}>{tier.label}</span>
                          <StarRating rating={rating} onChange={(r) => setSupplierRating(supplier.id, r)} isDark={isDark} />
                          <span className={isDark ? "text-xs font-medium text-slate-300 w-12 text-right" : "text-xs font-medium text-slate-700 w-12 text-right"}>{rating.toFixed(1)} / 5</span>
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
                  action={{ label: "Add Supplier", onClick: () => { setActiveTab("directory"); setCreateOpen(true); } }}
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
                />
              </div>
              <div className="space-y-2">
                <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Phone</Label>
                <Input
                  placeholder="+971 50 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
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
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} className={isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : ""}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-amber-600 hover:bg-amber-700 text-white">
                Add Supplier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

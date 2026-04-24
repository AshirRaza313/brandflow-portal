"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useBrandForgeStore } from "@/store/brandflow-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, Search, Package, LayoutGrid, List, Trash2, Pencil,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Loader2, AlertCircle, ImageIcon, MoreHorizontal, Tag, RefreshCw, TrendingDown,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { ConfirmDialog } from "@/components/brandflow/shared/ConfirmDialog";
import { ProductModal } from "./ProductModal";
import { StockAlertsPanel } from "./StockAlertsPanel";

// ── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  price: number;
  costPrice?: number | null;
  stock: number;
  category?: string | null;
  status: string;
  imageUrl?: string | null;
  createdAt: string;
}

interface ProductStats {
  total: number;
  active: number;
  lowStock: number;
  totalValue: number;
}

const ITEMS_PER_PAGE = 12;

const CATEGORY_COLORS = [
  { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", accent: "from-emerald-600 to-emerald-400" },
  { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", accent: "from-violet-600 to-violet-400" },
  { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/20", accent: "from-pink-600 to-pink-400" },
  { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/20", accent: "from-sky-600 to-sky-400" },
  { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", accent: "from-orange-600 to-orange-400" },
  { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", accent: "from-rose-600 to-rose-400" },
  { bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/20", accent: "from-teal-600 to-teal-400" },
  { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20", accent: "from-cyan-600 to-cyan-400" },
];

const subTabs = [
  { id: "all", label: "All Products" },
  { id: "categories", label: "Categories" },
  { id: "inventory", label: "Inventory" },
  { id: "gallery", label: "Gallery" },
];

// ── Format helpers ───────────────────────────────────────────────────────────

function formatPKR(amount: number): string {
  if (amount >= 1000000) return `Rs. ${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 100000) return `Rs. ${(amount / 1000).toFixed(0)}K`;
  return `Rs. ${amount.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPrice(price: number): string {
  return `Rs. ${price.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ProductsPage() {
  const { organization, appTheme } = useBrandForgeStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const orgId = organization?.id;

  if (!orgId) return null;

  // ── State ──
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Category dialog
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);

  // ── Fetch products ──
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products?orgId=${encodeURIComponent(orgId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
      }
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ── Filtered products ──
  const filteredProducts = useMemo(() => {
    let result = products;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    return result;
  }, [products, search, statusFilter]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // ── Selection logic ──
  const allOnPageSelected = paginatedProducts.length > 0 && paginatedProducts.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedProducts.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedProducts.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Handlers ──
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setProductModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setProductModalOpen(true);
  };

  const handleSaved = () => {
    setProductModalOpen(false);
    setEditingProduct(null);
    fetchProducts();
  };

  const handleDeleteSingle = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`"${deleteTarget.name}" deleted`);
        setSelectedIds((prev) => { const next = new Set(prev); next.delete(deleteTarget.id); return next; });
        fetchProducts();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete product");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    let successCount = 0;
    let failCount = 0;

    for (const id of ids) {
      try {
        const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    if (failCount === 0) {
      toast.success(`${successCount} product${successCount > 1 ? "s" : ""} deleted`);
    } else {
      toast.warning(`${successCount} deleted, ${failCount} failed`);
    }

    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    setBulkDeleting(false);
    fetchProducts();
  };

  // ── Status badge color ──
  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "draft":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "archived":
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
      default:
        return "bg-slate-500/10 text-slate-400";
    }
  };

  // ── Stock badge ──
  const stockBadge = (stock: number) => {
    if (stock === 0) return "text-red-400";
    if (stock <= 5) return "text-amber-400";
    if (stock <= 20) return "text-yellow-400";
    return isDark ? "text-slate-300" : "text-slate-600";
  };

  // ── Loading Skeleton ──
  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className={cn("h-7 w-32 rounded", isDark ? "bg-white/5" : "bg-muted")} />
            <div className={cn("h-4 w-48 mt-2 rounded", isDark ? "bg-white/5" : "bg-muted")} />
          </div>
          <div className={cn("h-9 w-32 rounded-lg", isDark ? "bg-white/5" : "bg-muted")} />
        </div>
        <div className="flex gap-1 border-b pb-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn("h-9 w-24 rounded mb-[-1px]", isDark ? "bg-white/5" : "bg-muted")} />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn("h-24 rounded-lg", isDark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-muted")} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cn("h-40 rounded-lg", isDark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-muted")} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "'Cinzel', serif" }}>Products</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your product catalog</p>
          </div>
        </div>
        <Card className={cn(
          isGold ? "bg-white/[0.03] border-white/[0.06]" : isDark ? "bg-white/[0.03] border-white/[0.06]" : ""
        )}>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className={cn("h-12 w-12 mb-4", isDark ? "text-red-400/50" : "text-red-400")} />
            <h3 className={cn("text-lg font-semibold mb-1", isDark ? "text-white" : "")}>{error}</h3>
            <Button onClick={fetchProducts} variant="outline" className="mt-4">
              <Loader2 className="mr-2 h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "'Cinzel', serif" }}>Products</h1>
          <p className={cn("text-sm mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
            Manage your product catalog
          </p>
        </div>
        <Button
          className={isGold ? "btn-gold" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
          onClick={handleOpenCreate}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-slate-200 pb-0 overflow-x-auto tab-bar-scroll">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? isGold
                  ? "border-amber-500 text-amber-400"
                  : "border-emerald-500 text-emerald-600"
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
        {/* ═══════════════════════ ALL PRODUCTS TAB ═══════════════════════ */}
        {activeTab === "all" && (
          <motion.div
            key="all"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Total Products */}
              <Card className={cn(
                "border transition-all hover:shadow-md",
                isGold
                  ? "bg-white/[0.03] border-white/[0.06] hover:border-amber-500/20"
                  : isDark
                    ? "bg-white/[0.03] border-white/[0.06] hover:border-emerald-500/20"
                    : "bg-white border"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className={cn("text-xs font-medium uppercase tracking-wider", isDark ? "text-slate-400" : "text-muted-foreground")}>
                        Total Products
                      </p>
                      <p className={cn("text-2xl font-bold mt-1", isDark ? "text-white" : "")}>
                        {stats?.total ?? products.length}
                      </p>
                    </div>
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      isGold ? "bg-amber-500/10" : "bg-emerald-500/10"
                    )}>
                      <Package className={cn("h-5 w-5", isGold ? "text-amber-400" : "text-emerald-400")} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active */}
              <Card className={cn(
                "border transition-all hover:shadow-md",
                isGold
                  ? "bg-white/[0.03] border-white/[0.06] hover:border-amber-500/20"
                  : isDark
                    ? "bg-white/[0.03] border-white/[0.06] hover:border-emerald-500/20"
                    : "bg-emerald-50 border-emerald-200"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className={cn("text-xs font-medium uppercase tracking-wider", isDark ? "text-slate-400" : "text-muted-foreground")}>
                        Active
                      </p>
                      <p className={cn("text-2xl font-bold mt-1", isGold ? "text-amber-400" : isDark ? "text-emerald-400" : "text-emerald-600")}>
                        {stats?.active ?? products.filter((p) => p.status === "active").length}
                      </p>
                    </div>
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      isGold ? "bg-amber-500/10" : "bg-emerald-500/10"
                    )}>
                      <Package className={cn("h-5 w-5", isGold ? "text-amber-400" : "text-emerald-400")} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Low Stock */}
              <Card className={cn(
                "border transition-all hover:shadow-md",
                isGold
                  ? "bg-white/[0.03] border-white/[0.06] hover:border-amber-500/20"
                  : isDark
                    ? "bg-white/[0.03] border-white/[0.06] hover:border-emerald-500/20"
                    : "bg-red-50 border-red-200"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className={cn("text-xs font-medium uppercase tracking-wider", isDark ? "text-slate-400" : "text-muted-foreground")}>
                        Low / Out of Stock
                      </p>
                      <p className={cn("text-2xl font-bold mt-1", isDark ? "text-red-400" : "text-red-600")}>
                        {stats?.lowStock ?? products.filter((p) => p.stock <= 5).length}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Value */}
              <Card className={cn(
                "border transition-all hover:shadow-md",
                isGold
                  ? "bg-white/[0.03] border-white/[0.06] hover:border-amber-500/20"
                  : isDark
                    ? "bg-white/[0.03] border-white/[0.06] hover:border-emerald-500/20"
                    : "bg-white border"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className={cn("text-xs font-medium uppercase tracking-wider", isDark ? "text-slate-400" : "text-muted-foreground")}>
                        Total Value
                      </p>
                      <p className={cn("text-xl font-bold mt-1", isGold ? "gold-gradient-text" : isDark ? "text-white" : "")}>
                        {stats ? formatPKR(stats.totalValue) : formatPKR(products.reduce((s, p) => s + (p.price * p.stock), 0))}
                      </p>
                    </div>
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      isGold ? "bg-amber-500/10" : "bg-emerald-500/10"
                    )}>
                      <span className={cn("text-lg font-bold", isGold ? "text-amber-400" : "text-emerald-400")}>Rs.</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", isDark ? "text-slate-500" : "text-slate-400")} />
                <Input
                  placeholder="Search by name, SKU, or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={cn(
                    "pl-9",
                    isGold && "premium-input",
                    isDark && !isGold && "premium-input"
                  )}
                />
              </div>
              <div className="flex gap-2">
                {/* Status filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className={cn(
                    "w-[130px] h-9",
                    isGold && "bg-white/5 border-white/10 text-white",
                    isDark && !isGold && "bg-white/5 border-white/10 text-white"
                  )}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>

                {/* View toggle */}
                <div className="flex border rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setViewMode("table")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Bulk actions bar */}
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex items-center justify-between px-4 py-2.5 rounded-lg border",
                  isGold
                    ? "bg-amber-500/5 border-amber-500/20"
                    : isDark
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-emerald-50 border-emerald-200"
                )}
              >
                <span className={cn("text-sm font-medium", isDark ? "text-slate-300" : "text-slate-700")}>
                  {selectedIds.size} product{selectedIds.size > 1 ? "s" : ""} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                    className={cn("text-xs", isDark && "text-slate-400 hover:text-white")}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteOpen(true)}
                    className="text-xs"
                  >
                    <Trash2 className="mr-1 h-3 w-3" /> Delete Selected
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Product count */}
            {filteredProducts.length > 0 && (
              <div className="flex items-center justify-between">
                <p className={cn("text-sm", isDark ? "text-slate-500" : "text-muted-foreground")}>
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length}
                </p>
              </div>
            )}

            {/* ── Product List ── */}
            {filteredProducts.length === 0 && !search && statusFilter === "all" ? (
              /* Empty state — no products at all */
              <Card className={cn(isGold ? "premium-card" : isDark ? "premium-card" : "")}>
                <CardContent>
                  <EmptyState
                    icon={Package}
                    title="No products yet"
                    description="Add your first product to start selling!"
                    action={{ label: "Add Product", onClick: handleOpenCreate }}
                  />
                </CardContent>
              </Card>
            ) : filteredProducts.length === 0 ? (
              /* No results from search/filter */
              <Card className={cn(isGold ? "premium-card" : isDark ? "premium-card" : "")}>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Search className={cn("h-12 w-12 mb-4", isDark ? "text-slate-600" : "text-slate-300")} />
                  <h3 className={cn("text-lg font-semibold mb-1", isDark ? "text-white" : "")}>No results found</h3>
                  <p className={cn("text-sm max-w-sm", isDark ? "text-slate-400" : "text-muted-foreground")}>
                    Try adjusting your search or filter criteria
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => { setSearch(""); setStatusFilter("all"); }}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : viewMode === "grid" ? (
              /* ══════════════════ GRID VIEW ══════════════════ */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedProducts.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.2 }}
                  >
                    <Card
                      className={cn(
                        "group relative transition-all hover:shadow-lg cursor-pointer",
                        isGold
                          ? "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-amber-500/20"
                          : isDark
                            ? "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-emerald-500/20"
                            : "bg-white border hover:border-emerald-200",
                        selectedIds.has(product.id) && (isGold ? "ring-2 ring-amber-500/50 border-amber-500/30" : "ring-2 ring-emerald-500/50 border-emerald-500/30")
                      )}
                      onClick={() => handleOpenEdit(product)}
                    >
                      <CardContent className="p-4">
                        {/* Checkbox + Status */}
                        <div className="flex items-center justify-between mb-3">
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedIds.has(product.id)}
                              onCheckedChange={() => toggleSelect(product.id)}
                              className={cn(
                                isGold && "data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                              )}
                            />
                          </div>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] font-medium px-2 py-0.5", statusBadge(product.status))}
                          >
                            {product.status}
                          </Badge>
                        </div>

                        {/* Image placeholder */}
                        {product.imageUrl ? (
                          <div className="w-full h-32 rounded-lg overflow-hidden mb-3 bg-muted">
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className={cn(
                            "w-full h-32 rounded-lg flex items-center justify-center mb-3",
                            isGold ? "bg-white/[0.02]" : isDark ? "bg-white/[0.02]" : "bg-muted/50"
                          )}>
                            <ImageIcon className={cn("h-10 w-10", isDark ? "text-slate-700" : "text-slate-300")} />
                          </div>
                        )}

                        {/* Product info */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className={cn(
                              "text-sm font-semibold truncate",
                              isDark ? "text-white" : "text-foreground"
                            )}>
                              {product.name}
                            </h3>
                            <p className={cn("text-xs mt-0.5 truncate", isDark ? "text-slate-500" : "text-slate-400")}>
                              {product.sku || product.category || "No SKU"}
                            </p>
                          </div>
                          {/* Actions menu */}
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEdit(product)}>
                                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-500 focus:text-red-500"
                                  onClick={() => setDeleteTarget(product)}
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Price & Stock */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                          <span className={cn(
                            "text-lg font-bold",
                            isGold ? "gold-gradient-text" : isDark ? "text-white" : ""
                          )}>
                            {formatPrice(product.price)}
                          </span>
                          <div className="text-right">
                            <span className={cn("text-xs font-medium", stockBadge(product.stock))}>
                              {product.stock === 0 ? "Out of stock" : `Stock: ${product.stock}`}
                            </span>
                            {product.costPrice != null && product.costPrice > 0 && (
                              <p className={cn("text-[10px]", isDark ? "text-slate-600" : "text-slate-400")}>
                                Cost: {formatPrice(product.costPrice)}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* ══════════════════ TABLE VIEW ══════════════════ */
              <Card className={cn(
                "overflow-hidden",
                isGold ? "bg-white/[0.03] border-white/[0.06]" : isDark ? "bg-white/[0.03] border-white/[0.06]" : ""
              )}>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className={cn(
                        "hover:bg-transparent",
                        isGold
                          ? "bg-white/[0.03] border-b border-white/[0.06]"
                          : isDark
                            ? "bg-white/[0.03] border-b border-white/[0.06]"
                            : ""
                      )}>
                        <TableHead className="w-10 pl-4">
                          <Checkbox
                            checked={allOnPageSelected}
                            onCheckedChange={toggleSelectAll}
                            className={cn(
                              isGold && "data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                            )}
                          />
                        </TableHead>
                        <TableHead className={cn(isDark && "text-slate-400")}>Product</TableHead>
                        <TableHead className={cn(isDark && "text-slate-400")}>SKU</TableHead>
                        <TableHead className={cn(isDark && "text-slate-400")}>Category</TableHead>
                        <TableHead className={cn("text-right", isDark && "text-slate-400")}>Price</TableHead>
                        <TableHead className={cn("text-right", isDark && "text-slate-400")}>Stock</TableHead>
                        <TableHead className={cn(isDark && "text-slate-400")}>Status</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProducts.map((product) => (
                        <TableRow
                          key={product.id}
                          className={cn(
                            "cursor-pointer group",
                            isDark ? "border-b border-white/[0.04] hover:bg-white/[0.02]" : "hover:bg-muted/50",
                            selectedIds.has(product.id) && (isGold ? "bg-amber-500/5" : "bg-emerald-500/5")
                          )}
                          onClick={() => handleOpenEdit(product)}
                        >
                          <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(product.id)}
                              onCheckedChange={() => toggleSelect(product.id)}
                              className={cn(
                                isGold && "data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0",
                                isGold ? "bg-amber-500/10" : isDark ? "bg-white/5" : "bg-muted"
                              )}>
                                {product.imageUrl ? (
                                  <img src={product.imageUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
                                ) : (
                                  <Package className={cn("h-4 w-4", isGold ? "text-amber-400/50" : "text-slate-400")} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className={cn("text-sm font-medium truncate max-w-[200px]", isDark ? "text-white" : "")}>
                                  {product.name}
                                </p>
                                {product.description && (
                                  <p className={cn("text-xs truncate max-w-[200px]", isDark ? "text-slate-500" : "text-muted-foreground")}>
                                    {product.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className={cn("text-sm", isDark ? "text-slate-400" : "text-muted-foreground")}>
                            {product.sku || "—"}
                          </TableCell>
                          <TableCell className={cn("text-sm", isDark ? "text-slate-400" : "text-muted-foreground")}>
                            {product.category || "—"}
                          </TableCell>
                          <TableCell className={cn(
                            "text-sm text-right font-semibold tabular-nums",
                            isGold ? "gold-gradient-text" : isDark ? "text-white" : ""
                          )}>
                            {formatPrice(product.price)}
                          </TableCell>
                          <TableCell className={cn("text-sm text-right font-medium tabular-nums", stockBadge(product.stock))}>
                            {product.stock === 0 ? "Out of stock" : product.stock}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] font-medium px-2 py-0.5", statusBadge(product.status))}
                            >
                              {product.status}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEdit(product)}>
                                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-500 focus:text-red-500"
                                  onClick={() => setDeleteTarget(product)}
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {/* ══════════════════ PAGINATION ══════════════════ */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className={cn("text-sm", isDark ? "text-slate-500" : "text-muted-foreground")}>
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="icon"
                        className={cn(
                          "h-8 w-8 text-sm",
                          page === currentPage && (isGold ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black" : "bg-emerald-600 text-white hover:bg-emerald-700")
                        )}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════ CATEGORIES TAB ═══════════════════════ */}
        {activeTab === "categories" && (
          <motion.div key="categories" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <p className={cn("text-sm", isDark ? "text-slate-400" : "text-muted-foreground")}>
                {products.length} product{products.length !== 1 ? "s" : ""} across {(() => {
                  const cats = new Set(products.map(p => p.category || "Uncategorized"));
                  return cats.size;
                })()} categor{(() => {
                  const cats = new Set(products.map(p => p.category || "Uncategorized"));
                  return cats.size === 1 ? "y" : "ies";
                })()}
              </p>
              <Button
                className={isGold ? "btn-gold" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
                onClick={() => toast.info("Category management coming soon!")}
              >
                <Plus className="mr-2 h-4 w-4" /> Create Category
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(() => {
                const catMap = new Map<string, { name: string; count: number; revenue: number; stock: number }>();
                products.forEach(p => {
                  const key = p.category || "Uncategorized";
                  const existing = catMap.get(key) || { name: key, count: 0, revenue: 0, stock: 0 };
                  existing.count++;
                  existing.revenue += p.price * p.stock;
                  existing.stock += p.stock;
                  catMap.set(key, existing);
                });
                return Array.from(catMap.values()).sort((a, b) => b.revenue - a.revenue);
              })().map((cat, idx) => {
                const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                return (
                  <motion.div
                    key={cat.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <Card className={cn(
                      "group transition-all hover:shadow-lg cursor-pointer",
                      isGold
                        ? "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-amber-500/20"
                        : isDark
                          ? "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-emerald-500/20"
                          : "bg-white border hover:border-emerald-200"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center",
                            color.bg
                          )}>
                            <Tag className={cn("h-5 w-5", color.text)} />
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-medium px-2 py-0.5",
                              isDark ? "bg-white/[0.05] border-white/[0.1] text-slate-400" : ""
                            )}
                          >
                            {cat.count} item{cat.count !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <h3 className={cn(
                          "text-sm font-semibold truncate mb-1",
                          isDark ? "text-white" : "text-foreground"
                        )}>
                          {cat.name}
                        </h3>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                          <div>
                            <p className={cn("text-[10px] uppercase tracking-wider", isDark ? "text-slate-500" : "text-muted-foreground")}>
                              Revenue
                            </p>
                            <p className={cn(
                              "text-sm font-bold mt-0.5",
                              isGold ? color.text : isDark ? color.text : "text-foreground"
                            )}>
                              {formatPKR(cat.revenue)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={cn("text-[10px] uppercase tracking-wider", isDark ? "text-slate-500" : "text-muted-foreground")}>
                              Total Stock
                            </p>
                            <p className={cn(
                              "text-sm font-bold mt-0.5",
                              isDark ? "text-slate-300" : "text-foreground"
                            )}>
                              {cat.stock.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
            {products.length === 0 && (
              <Card className={cn(isGold ? "premium-card" : isDark ? "premium-card" : "")}>
                <CardContent>
                  <EmptyState
                    icon={Package}
                    title="No categories yet"
                    description="Add products with categories to see them here."
                  />
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════ INVENTORY TAB ═══════════════════════ */}
        {activeTab === "inventory" && (
          <motion.div key="inventory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Stock Summary */}
            <div className="grid grid-cols-3 gap-3">
              <Card className={cn(
                "border",
                isGold ? "bg-white/[0.03] border-white/[0.06]" : isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-red-50 border-red-200"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <p className={cn("text-[10px] font-medium uppercase tracking-wider", isDark ? "text-slate-400" : "text-muted-foreground")}>Out of Stock</p>
                  </div>
                  <p className={cn("text-2xl font-bold", isDark ? "text-red-400" : "text-red-600")}>
                    {products.filter(p => p.stock === 0).length}
                  </p>
                </CardContent>
              </Card>
              <Card className={cn(
                "border",
                isGold ? "bg-white/[0.03] border-white/[0.06]" : isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-orange-50 border-orange-200"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                    <p className={cn("text-[10px] font-medium uppercase tracking-wider", isDark ? "text-slate-400" : "text-muted-foreground")}>Low Stock</p>
                  </div>
                  <p className={cn("text-2xl font-bold", isDark ? "text-orange-400" : "text-orange-600")}>
                    {products.filter(p => p.stock >= 1 && p.stock <= 10).length}
                  </p>
                </CardContent>
              </Card>
              <Card className={cn(
                "border",
                isGold ? "bg-white/[0.03] border-white/[0.06]" : isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-emerald-50 border-emerald-200"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <p className={cn("text-[10px] font-medium uppercase tracking-wider", isDark ? "text-slate-400" : "text-muted-foreground")}>In Stock</p>
                  </div>
                  <p className={cn("text-2xl font-bold", isDark ? "text-emerald-400" : "text-emerald-600")}>
                    {products.filter(p => p.stock > 10).length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Stock Alerts */}
            <StockAlertsPanel />

            {/* Inventory Table */}
            <Card className={cn(
              "overflow-hidden",
              isGold ? "bg-white/[0.03] border-white/[0.06]" : isDark ? "bg-white/[0.03] border-white/[0.06]" : ""
            )}>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className={cn(
                        "hover:bg-transparent",
                        isDark ? "bg-white/[0.03] border-b border-white/[0.06]" : ""
                      )}>
                        <TableHead className={cn(isDark && "text-slate-400")}>Product</TableHead>
                        <TableHead className={cn(isDark && "text-slate-400")}>SKU</TableHead>
                        <TableHead className={cn("text-right", isDark && "text-slate-400")}>Price</TableHead>
                        <TableHead className={cn("text-right", isDark && "text-slate-400")}>Stock</TableHead>
                        <TableHead className={cn(isDark && "text-slate-400")}>Status</TableHead>
                        <TableHead className={cn("text-right", isDark && "text-slate-400")}>Value</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => {
                        const stockLevel = product.stock === 0 ? "out" : product.stock <= 10 ? "low" : "ok";
                        const stockColor = stockLevel === "out"
                          ? "text-red-400"
                          : stockLevel === "low"
                            ? "text-orange-400"
                            : isDark ? "text-emerald-400" : "text-emerald-600";
                        const stockBg = stockLevel === "out"
                          ? "bg-red-500/10 border-red-500/20"
                          : stockLevel === "low"
                            ? "bg-orange-500/10 border-orange-500/20"
                            : "bg-emerald-500/10 border-emerald-500/20";
                        return (
                          <TableRow
                            key={product.id}
                            className={cn(
                              isDark ? "border-b border-white/[0.04] hover:bg-white/[0.02]" : "hover:bg-muted/50"
                            )}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                  isGold ? "bg-amber-500/10" : isDark ? "bg-white/5" : "bg-muted"
                                )}>
                                  {product.imageUrl ? (
                                    <img src={product.imageUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                                  ) : (
                                    <Package className={cn("h-3.5 w-3.5", isDark ? "text-slate-500" : "text-slate-400")} />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className={cn("text-sm font-medium truncate max-w-[180px]", isDark ? "text-white" : "")}>
                                    {product.name}
                                  </p>
                                  {product.category && (
                                    <p className={cn("text-[10px] truncate max-w-[180px]", isDark ? "text-slate-500" : "text-muted-foreground")}>
                                      {product.category}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className={cn("text-sm font-mono", isDark ? "text-slate-400" : "text-muted-foreground")}>
                              {product.sku || "—"}
                            </TableCell>
                            <TableCell className={cn("text-sm text-right font-semibold tabular-nums", isGold ? "gold-gradient-text" : isDark ? "text-white" : "")}>
                              {formatPrice(product.price)}
                            </TableCell>
                            <TableCell className={cn("text-right", isDark ? "" : "")}>
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] font-bold px-2 py-0.5 border", stockBg, stockColor)}
                              >
                                {product.stock === 0 ? "Out of stock" : product.stock}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] font-medium px-2 py-0.5", statusBadge(product.status))}
                              >
                                {product.status}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn("text-sm text-right font-semibold tabular-nums", isDark ? "text-slate-300" : "")}>
                              {formatPKR(product.price * product.stock)}
                            </TableCell>
                            <TableCell className="pr-4">
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "text-[10px] h-7 gap-1",
                                  stockLevel === "out" && "border-red-500/30 text-red-400 hover:bg-red-500/10",
                                  stockLevel === "low" && "border-orange-500/30 text-orange-400 hover:bg-orange-500/10",
                                  stockLevel === "ok" && (isDark ? "border-white/[0.1] text-slate-400 hover:bg-white/[0.05]" : "")
                                )}
                                onClick={() => toast.info(`Restock request for "${product.name}" — coming soon!`)}
                              >
                                <RefreshCw className="h-3 w-3" /> Restock
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ═══════════════════════ GALLERY TAB ═══════════════════════ */}
        {activeTab === "gallery" && (
          <motion.div key="gallery" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {products.length === 0 ? (
              <Card className={cn(isGold ? "premium-card" : isDark ? "premium-card" : "")}>
                <CardContent>
                  <EmptyState
                    icon={Package}
                    title="No product images"
                    description="Product images will appear here after you add products."
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.03, duration: 0.25 }}
                  >
                    <Card
                      className={cn(
                        "group overflow-hidden cursor-pointer transition-all duration-300",
                        isGold
                          ? "bg-white/[0.03] border-white/[0.06] hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5"
                          : isDark
                            ? "bg-white/[0.03] border-white/[0.06] hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
                            : "bg-white border hover:border-emerald-200 hover:shadow-lg"
                      )}
                      onClick={() => handleOpenEdit(product)}
                    >
                      {/* Image Area */}
                      <div className={cn(
                        "relative aspect-square overflow-hidden",
                        isDark ? "bg-white/[0.02]" : "bg-muted/50"
                      )}>
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <ImageIcon className={cn("h-10 w-10", isDark ? "text-slate-700" : "text-slate-300")} />
                            <span className={cn("text-[10px] font-medium", isDark ? "text-slate-600" : "text-slate-400")}>
                              No image
                            </span>
                          </div>
                        )}
                        {/* Hover Overlay */}
                        <div className={cn(
                          "absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent",
                          "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                          "flex items-end p-3"
                        )}>
                          <div className="w-full">
                            <p className="text-white text-xs font-semibold truncate">{product.name}</p>
                            <p className="text-white/80 text-[10px] font-medium">{formatPrice(product.price)}</p>
                          </div>
                        </div>
                        {/* Stock Badge on image */}
                        {product.stock === 0 && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-red-500/90 text-white text-[9px] px-1.5 py-0 border-0">
                              Out of stock
                            </Badge>
                          </div>
                        )}
                      </div>
                      {/* Card Footer */}
                      <div className="p-2.5">
                        <h3 className={cn(
                          "text-xs font-semibold truncate",
                          isDark ? "text-white" : "text-foreground"
                        )}>
                          {product.name}
                        </h3>
                        <div className="flex items-center justify-between mt-1">
                          <span className={cn(
                            "text-xs font-bold",
                            isGold ? "gold-gradient-text" : isDark ? "text-white" : ""
                          )}>
                            {formatPrice(product.price)}
                          </span>
                          {product.category && (
                            <span className={cn("text-[9px] truncate max-w-[80px]", isDark ? "text-slate-500" : "text-muted-foreground")}>
                              {product.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════ PRODUCT MODAL (Create/Edit) ══════════════════ */}
      <ProductModal
        open={productModalOpen}
        onClose={() => { setProductModalOpen(false); setEditingProduct(null); }}
        onSaved={handleSaved}
        organizationId={orgId}
        product={editingProduct}
      />

      {/* ══════════════════ DELETE CONFIRMATION DIALOG ══════════════════ */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone. Any orders containing this product will also be affected.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        variant="destructive"
        onConfirm={handleDeleteSingle}
      />

      {/* ══════════════════ BULK DELETE CONFIRMATION ══════════════════ */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Delete Selected Products"
        description={`You are about to delete ${selectedIds.size} product${selectedIds.size > 1 ? "s" : ""}. This action cannot be undone.`}
        confirmLabel={bulkDeleting ? "Deleting..." : `Delete ${selectedIds.size} Items`}
        variant="destructive"
        onConfirm={handleBulkDelete}
      />

      {/* ══════════════════ CATEGORY CREATION DIALOG ══════════════════ */}
      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent className={cn(
          "sm:max-w-md",
          isGold && "bg-[#15151e] border-white/[0.08]"
        )}>
          <DialogHeader>
            <DialogTitle className={cn(isDark && "text-white")}>Add Category</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!categoryName.trim()) { toast.error("Category name is required"); return; }
              setCategories((prev) => [{ id: Date.now(), name: categoryName.trim() }, ...prev]);
              setCategoryName("");
              setCategoryOpen(false);
              toast.success("Category created successfully!");
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>Category Name</Label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g. T-Shirts, Electronics..."
                autoFocus
                className={cn(
                  isGold && "bg-white/5 border-white/10 text-white",
                  isDark && !isGold && "bg-white/5 border-white/10 text-white"
                )}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCategoryOpen(false)}
                className={cn(
                  "flex-1",
                  isGold && "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className={cn(
                  "flex-1",
                  isGold ? "btn-gold" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
              >
                Create Category
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

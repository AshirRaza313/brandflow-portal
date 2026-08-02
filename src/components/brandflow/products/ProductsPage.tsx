// @ts-nocheck — Phase 8: pre-existing TS errors (Decimal/Prisma types, etc.) pending migration
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { useValtrioxStore } from "@/store/brandflow-store";
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
  Loader2, AlertCircle, ImageIcon, MoreHorizontal, Tag, RefreshCw,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  isUncategorizedProductCategory,
  type ProductCategorySummary,
} from "@/lib/product-categories";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { ConfirmDialog } from "@/components/brandflow/shared/ConfirmDialog";
import { ProductModal } from "./ProductModal";
import { StockAlertsPanel } from "./StockAlertsPanel";

type ProductsTab = "all" | "categories" | "inventory" | "gallery";

interface ProductsPageProps {
  initialTab?: ProductsTab;
  openCreateOnMount?: boolean;
}

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
  { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", accent: "from-amber-600 to-amber-400" },
  { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20", accent: "from-yellow-600 to-yellow-400" },
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

async function getApiError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => null) as {
    error?: string;
    errors?: Array<{ message?: string }>;
  } | null;
  return data?.errors?.[0]?.message || data?.error || fallback;
}

// ── Component ────────────────────────────────────────────────────────────────

import { useTranslation } from "@/lib/i18n";

export function ProductsPage({
  initialTab = "all",
  openCreateOnMount = false,
}: ProductsPageProps = {}) {
  const { organization, appTheme, setActiveSection } = useValtrioxStore();
  const t = useTranslation();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const orgId = organization?.id;

  // ── State ──
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [activeTab, setActiveTab] = useState<ProductsTab>(initialTab);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [productModalOpen, setProductModalOpen] = useState(openCreateOnMount);
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
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<string | null>(null);
  const [categories, setCategories] = useState<ProductCategorySummary[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryDeleting, setCategoryDeleting] = useState(false);

  // ── Fetch products ──
  const fetchProducts = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/products?orgId=${encodeURIComponent(orgId)}&limit=100`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.fallback) {
        throw new Error("Product data is temporarily unavailable");
      }
      if (data.products) {
        setProducts(data.products);
      }
      if (data.stats) {
        setStats(data.stats);
      }
    } catch {
      setError("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchProducts(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchProducts]);

  const fetchCategories = useCallback(async () => {
    if (!orgId) {
      setCategoriesLoading(false);
      return;
    }

    setCategoriesLoading(true);
    setCategoryError(null);
    try {
      const res = await fetchWithAuth("/api/product-categories", { cache: "no-store" });
      if (!res.ok) throw new Error(await getApiError(res, "Failed to load categories"));
      const data = await res.json();
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setCategoriesLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchCategories(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchCategories]);

  // ── Category counts ──
  const categoryCounts = useMemo(() => {
    return Object.fromEntries(categories.map((category) => [category.name, category.count]));
  }, [categories]);

  const uniqueCategories = useMemo(() => {
    return categories.map((category) => category.name);
  }, [categories]);

  const assignableCategories = useMemo(() => {
    return uniqueCategories.filter((category) => !isUncategorizedProductCategory(category));
  }, [uniqueCategories]);

  // ── Filtered products ──
  const filteredProducts = useMemo(() => {
    let result = products;

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((p) => {
        const cat = p.category || "Uncategorized";
        return cat === categoryFilter;
      });
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    return result;
  }, [products, search, statusFilter, categoryFilter]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentPage(1), 0);
    return () => window.clearTimeout(timer);
  }, [search, statusFilter, categoryFilter]);

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
    if (openCreateOnMount) {
      setActiveSection("products");
      return;
    }
    fetchProducts();
    fetchCategories();
  };

  const handleCloseProductModal = () => {
    setProductModalOpen(false);
    setEditingProduct(null);
    if (openCreateOnMount) {
      setActiveSection("products");
    }
  };

  const handleDeleteSingle = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/products/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`"${deleteTarget.name}" deleted`);
        setSelectedIds((prev) => { const next = new Set(prev); next.delete(deleteTarget.id); return next; });
        await Promise.all([fetchProducts(), fetchCategories()]);
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
        const res = await fetchWithAuth(`/api/products/${id}`, { method: "DELETE" });
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
    if (successCount > 0) {
      await Promise.all([fetchProducts(), fetchCategories()]);
    } else {
      await fetchProducts();
    }
  };

  // ── Category management handlers ──
  const handleCreateCategory = async (name: string) => {
    if (!name.trim()) { toast.error("Category name is required"); return; }
    const trimmed = name.trim();
    setCategorySaving(true);
    try {
      const res = await fetchWithAuth("/api/product-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error(await getApiError(res, "Failed to create category"));
      await fetchCategories();
      setCategoryName("");
      setCategoryOpen(false);
      setEditingCategory(null);
      toast.success(`Category "${trimmed}" created! Assign it to products via product edit.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setCategorySaving(false);
    }
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    if (!newName.trim()) { toast.error("Category name is required"); return; }
    if (isUncategorizedProductCategory(oldName)) { toast.error("Cannot rename Uncategorized"); return; }
    const trimmed = newName.trim();
    if (trimmed === oldName) { setCategoryOpen(false); setEditingCategory(null); return; }
    
    setCategorySaving(true);
    try {
      const res = await fetchWithAuth("/api/product-categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName, newName: trimmed }),
      });
      if (!res.ok) throw new Error(await getApiError(res, "Failed to rename category"));
      await Promise.all([fetchCategories(), fetchProducts()]);
      setCategoryName("");
      setCategoryOpen(false);
      setEditingCategory(null);
      toast.success(`Category renamed to "${trimmed}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename category");
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = async (catName: string) => {
    if (categoryDeleting) return;
    if (isUncategorizedProductCategory(catName)) { toast.error("Cannot delete Uncategorized"); return; }
    setCategoryDeleting(true);
    try {
      const res = await fetchWithAuth("/api/product-categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName }),
      });
      if (!res.ok) throw new Error(await getApiError(res, "Failed to delete category"));
      const data = await res.json();
      await Promise.all([fetchCategories(), fetchProducts()]);
      setDeleteCategoryTarget(null);
      toast.success(`Category "${catName}" deleted. ${data.movedProducts || 0} product(s) moved to Uncategorized.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setCategoryDeleting(false);
    }
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

  // ── Stock status helper ──
  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Out of Stock", dotClass: "bg-red-500", textClass: "text-red-500" };
    if (stock <= 5) return { label: "Low Stock", dotClass: "bg-amber-500", textClass: "text-amber-500" };
    return { label: "In Stock", dotClass: "bg-emerald-500", textClass: isDark ? "text-emerald-400" : "text-emerald-600" };
  };

  // ── Early return if no org ──
  if (!orgId) return null;

  // ── Loading Skeleton ──
  if (loading && !openCreateOnMount) {
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
  if (error && !openCreateOnMount) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "'Cinzel', serif" }}>{t("productsTitle")}</h1>
            <p className="text-sm text-slate-500 mt-1">{t("productsDesc")}</p>
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
          className={isGold ? "btn-gold" : "bg-amber-600 hover:bg-amber-700 text-white"}
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
                  : "border-amber-500 text-amber-600"
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
                    ? "bg-white/[0.03] border-white/[0.06] hover:border-amber-500/20"
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
                      isGold ? "bg-amber-500/10" : "bg-amber-500/10"
                    )}>
                      <Package className={cn("h-5 w-5", isGold ? "text-amber-400" : "text-amber-400")} />
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
                    ? "bg-white/[0.03] border-white/[0.06] hover:border-amber-500/20"
                    : "bg-amber-50 border-amber-200"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className={cn("text-xs font-medium uppercase tracking-wider", isDark ? "text-slate-400" : "text-muted-foreground")}>
                        Active
                      </p>
                      <p className={cn("text-2xl font-bold mt-1", isGold ? "text-amber-400" : isDark ? "text-amber-400" : "text-amber-600")}>
                        {stats?.active ?? products.filter((p) => p.status === "active").length}
                      </p>
                    </div>
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      isGold ? "bg-amber-500/10" : "bg-amber-500/10"
                    )}>
                      <Package className={cn("h-5 w-5", isGold ? "text-amber-400" : "text-amber-400")} />
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
                    ? "bg-white/[0.03] border-white/[0.06] hover:border-amber-500/20"
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
                    ? "bg-white/[0.03] border-white/[0.06] hover:border-amber-500/20"
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
                      isGold ? "bg-amber-500/10" : "bg-amber-500/10"
                    )}>
                      <span className={cn("text-lg font-bold", isGold ? "text-amber-400" : "text-amber-400")}>Rs.</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Filter Chips */}
            {uniqueCategories.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 tab-bar-scroll">
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                    categoryFilter === "all"
                      ? isGold
                        ? "bg-gradient-to-r from-amber-600/20 to-yellow-500/20 text-amber-400 border border-amber-500/30"
                        : isDark
                          ? "bg-amber-600/20 text-amber-400 border border-amber-500/30"
                          : "bg-slate-900 text-white"
                      : isDark
                        ? "bg-white/5 text-slate-400 hover:bg-white/10 border border-white/[0.06]"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                  )}
                >
                  All
                  <span className={cn(
                    "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]",
                    categoryFilter === "all"
                      ? isGold ? "bg-amber-500/30 text-amber-300" : isDark ? "bg-amber-500/30 text-amber-300" : "bg-white/20 text-white/80"
                      : isDark ? "bg-white/10 text-slate-500" : "bg-slate-200 text-slate-500"
                  )}>{products.length}</span>
                </button>
                {uniqueCategories.slice(0, 6).map((cat, idx) => {
                  const colorIdx = idx % CATEGORY_COLORS.length;
                  const cc = CATEGORY_COLORS[colorIdx];
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                        categoryFilter === cat
                          ? isDark ? `${cc.bg} ${cc.text} ${cc.border}` : `${cc.bg} ${cc.text} ${cc.border}`
                          : isDark
                            ? "bg-white/5 text-slate-400 hover:bg-white/10 border-white/[0.06]"
                            : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"
                      )}
                    >
                      {cat}
                      <span className={cn(
                        "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]",
                        categoryFilter === cat
                          ? isDark ? `bg-white/10 ${cc.text}` : `${cc.bg} ${cc.text}`
                          : isDark ? "bg-white/10 text-slate-500" : "bg-slate-100 text-slate-500"
                      )}>{categoryCounts[cat]}</span>
                    </button>
                  );
                })}
                {uniqueCategories.length > 6 && (
                  <span className={cn("px-2 py-1 text-[10px] self-center", textMuted)}>
                    +{uniqueCategories.length - 6} more
                  </span>
                )}
              </div>
            )}

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", isDark ? "text-slate-400" : "text-slate-500")} />
                <Input
                  placeholder={t("search")}
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

                {/* Category filter dropdown */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className={cn(
                    "w-[140px] h-9",
                    isGold && "bg-white/5 border-white/10 text-white",
                    isDark && !isGold && "bg-white/5 border-white/10 text-white"
                  )}>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
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
                      ? "bg-amber-500/5 border-amber-500/20"
                      : "bg-amber-50 border-amber-200"
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
                <p className={cn("text-sm", isDark ? "text-slate-400" : "text-muted-foreground")}>
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length}
                </p>
              </div>
            )}

            {/* ── Product List ── */}
            {filteredProducts.length === 0 && !search && statusFilter === "all" ? (
              /* Empty state - no products at all */
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
                  <Search className={cn("h-12 w-12 mb-4", isDark ? "text-slate-400" : "text-slate-300")} />
                  <h3 className={cn("text-lg font-semibold mb-1", isDark ? "text-white" : "")}>{t("noResults")}</h3>
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
                            ? "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-amber-500/20"
                            : "bg-white border hover:border-amber-200",
                        selectedIds.has(product.id) && (isGold ? "ring-2 ring-amber-500/50 border-amber-500/30" : "ring-2 ring-amber-500/50 border-amber-500/30")
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
                          <div className="relative w-full h-32 rounded-lg overflow-hidden mb-3 bg-muted">
                            <Image
                              src={product.imageUrl}
                              alt={`${product.name} product image`}
                              fill
                              sizes="(max-width: 768px) 100vw, 300px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className={cn(
                            "w-full h-32 rounded-lg flex items-center justify-center mb-3 relative overflow-hidden",
                            isGold ? "bg-gradient-to-br from-amber-500/[0.04] to-yellow-500/[0.02]" : isDark ? "bg-gradient-to-br from-amber-500/[0.04] to-transparent" : "bg-gradient-to-br from-amber-50 to-slate-50"
                          )}>
                            <div className={cn("absolute inset-0", isDark ? "opacity-20" : "opacity-30",
                              "bg-[radial-gradient(circle_at_30%_40%,_var(--tw-gradient-stops))]",
                              isGold ? "from-amber-500/10 to-transparent" : "from-amber-500/5 to-transparent"
                            )} />
                            <ImageIcon className={cn("h-10 w-10 relative", isGold ? "text-amber-500/20" : isDark ? "text-slate-600" : "text-slate-300")} />
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
                            <p className={cn("text-xs mt-0.5 truncate", isDark ? "text-slate-400" : "text-slate-500")}>
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
                            <div className="flex items-center justify-end gap-1.5">
                              <span className={cn("h-1.5 w-1.5 rounded-full", getStockStatus(product.stock).dotClass)} />
                              <span className={cn("text-xs font-medium", getStockStatus(product.stock).textClass)}>
                                {product.stock === 0 ? "Out of Stock" : product.stock <= 5 ? `Low: ${product.stock}` : `${product.stock} in stock`}
                              </span>
                            </div>
                            {product.costPrice != null && product.costPrice > 0 && (
                              <p className={cn("text-[10px] mt-0.5", isDark ? "text-slate-400" : "text-slate-400")}>
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
                            selectedIds.has(product.id) && (isGold ? "bg-amber-500/5" : "bg-amber-500/5")
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
                                  <Image
                                    src={product.imageUrl}
                                    alt={`${product.name} thumbnail`}
                                    width={36}
                                    height={36}
                                    className="h-9 w-9 rounded-lg object-cover"
                                  />
                                ) : (
                                  <Package className={cn("h-4 w-4", isGold ? "text-amber-400/50" : "text-slate-400")} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className={cn("text-sm font-medium truncate max-w-[200px]", isDark ? "text-white" : "")}>
                                  {product.name}
                                </p>
                                {product.description && (
                                  <p className={cn("text-xs truncate max-w-[200px]", isDark ? "text-slate-400" : "text-muted-foreground")}>
                                    {product.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className={cn("text-sm", isDark ? "text-slate-400" : "text-muted-foreground")}>
                            {product.sku || "-"}
                          </TableCell>
                          <TableCell className={cn("text-sm", isDark ? "text-slate-400" : "text-muted-foreground")}>
                            {product.category || "-"}
                          </TableCell>
                          <TableCell className={cn(
                            "text-sm text-right font-semibold tabular-nums",
                            isGold ? "gold-gradient-text" : isDark ? "text-white" : ""
                          )}>
                            {formatPrice(product.price)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", getStockStatus(product.stock).dotClass)} />
                              <span className={cn("text-sm font-medium tabular-nums", getStockStatus(product.stock).textClass)}>
                                {product.stock === 0 ? "Out of stock" : product.stock}
                              </span>
                            </div>
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
                <p className={cn("text-sm", isDark ? "text-slate-400" : "text-muted-foreground")}>
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
                          page === currentPage && (isGold ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black" : "bg-amber-600 text-white hover:bg-amber-700")
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className={cn("text-sm", isDark ? "text-slate-400" : "text-muted-foreground")}>
                {stats?.total ?? products.length} product{(stats?.total ?? products.length) !== 1 ? "s" : ""} across {categories.length} categor{categories.length === 1 ? "y" : "ies"}
              </p>
              <Button
                className={cn(
                  "w-full sm:w-auto",
                  isGold ? "btn-gold" : "bg-amber-600 hover:bg-amber-700 text-white",
                )}
                onClick={() => { setCategoryName(""); setEditingCategory(null); setCategoryOpen(true); }}
                disabled={categoriesLoading}
              >
                <Plus className="mr-2 h-4 w-4" /> Create Category
              </Button>
            </div>
            {categoriesLoading ? (
              <Card className={cn(isGold ? "premium-card" : isDark ? "premium-card" : "")}>
                <CardContent className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                  <span className={cn("ml-2 text-sm", isDark ? "text-slate-400" : "text-slate-500")}>Loading categories...</span>
                </CardContent>
              </Card>
            ) : categoryError ? (
              <Card className={cn(isGold ? "premium-card" : isDark ? "premium-card" : "")}>
                <CardContent className="flex flex-col items-center justify-center py-14 text-center">
                  <AlertCircle className="h-9 w-9 text-red-400 mb-3" />
                  <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-900")}>{categoryError}</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={fetchCategories}>
                    <RefreshCw className="mr-2 h-3.5 w-3.5" /> Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : categories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categories.map((cat, idx) => {
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
                          ? "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-amber-500/20"
                          : "bg-white border hover:border-amber-200"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center",
                            color.bg
                          )}>
                            <Tag className={cn("h-5 w-5", color.text)} />
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-medium px-2 py-0.5",
                                isDark ? "bg-white/[0.05] border-white/[0.1] text-slate-400" : ""
                              )}
                            >
                              {cat.count} item{cat.count !== 1 ? "s" : ""}
                            </Badge>
                            {!isUncategorizedProductCategory(cat.name) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className={cn(
                                    "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
                                    isDark ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                                  )}>
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className={cn(
                                  "w-36",
                                  isDark ? "bg-[#1D2437] border-white/[0.08]" : ""
                                )}>
                                  <DropdownMenuItem
                                    onClick={() => { setEditingCategory(cat.name); setCategoryName(cat.name); setCategoryOpen(true); }}
                                    className={cn("cursor-pointer text-xs", isDark ? "text-slate-300 focus:bg-white/[0.04]" : "")}
                                  >
                                    <Pencil className="mr-2 h-3 w-3" /> Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeleteCategoryTarget(cat.name)}
                                    className={cn("cursor-pointer text-xs text-red-400 focus:text-red-400", isDark ? "focus:bg-red-500/10" : "")}
                                  >
                                    <Trash2 className="mr-2 h-3 w-3" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                        <h3 className={cn(
                          "text-sm font-semibold truncate mb-1",
                          isDark ? "text-white" : "text-foreground"
                        )}>
                          {cat.name}
                        </h3>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                          <div>
                            <p className={cn("text-[10px] uppercase tracking-wider", isDark ? "text-slate-400" : "text-muted-foreground")}>
                              Products
                            </p>
                            <p className={cn(
                              "text-sm font-bold mt-0.5",
                              isGold ? color.text : isDark ? color.text : "text-foreground"
                            )}>
                              {cat.count.toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={cn("text-[10px] uppercase tracking-wider", isDark ? "text-slate-400" : "text-muted-foreground")}>
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
            ) : (
              <Card className={cn(isGold ? "premium-card" : isDark ? "premium-card" : "")}>
                <CardContent>
                  <EmptyState
                    icon={Package}
                    title="No categories yet"
                    description="Create your first category, then assign it from Add or Edit Product."
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
                    <p className={cn("text-[10px] font-medium uppercase tracking-wider", isDark ? "text-slate-400" : "text-muted-foreground")}>{t("outOfStock")}</p>
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
                isGold ? "bg-white/[0.03] border-white/[0.06]" : isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-amber-50 border-amber-200"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <p className={cn("text-[10px] font-medium uppercase tracking-wider", isDark ? "text-slate-400" : "text-muted-foreground")}>In Stock</p>
                  </div>
                  <p className={cn("text-2xl font-bold", isDark ? "text-amber-400" : "text-amber-600")}>
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
                            : isDark ? "text-amber-400" : "text-amber-600";
                        const stockBg = stockLevel === "out"
                          ? "bg-red-500/10 border-red-500/20"
                          : stockLevel === "low"
                            ? "bg-orange-500/10 border-orange-500/20"
                            : "bg-amber-500/10 border-amber-500/20";
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
                                    <Image
                                      src={product.imageUrl}
                                      alt={`${product.name} thumbnail`}
                                      width={32}
                                      height={32}
                                      className="h-8 w-8 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <Package className={cn("h-3.5 w-3.5", isDark ? "text-slate-400" : "text-slate-500")} />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className={cn("text-sm font-medium truncate max-w-[180px]", isDark ? "text-white" : "")}>
                                    {product.name}
                                  </p>
                                  {product.category && (
                                    <p className={cn("text-[10px] truncate max-w-[180px]", isDark ? "text-slate-400" : "text-muted-foreground")}>
                                      {product.category}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className={cn("text-sm font-mono", isDark ? "text-slate-400" : "text-muted-foreground")}>
                              {product.sku || "-"}
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
                                disabled
                                className={cn(
                                  "text-[10px] h-7 gap-1 opacity-60",
                                  stockLevel === "out" && "border-red-500/30 text-red-400",
                                  stockLevel === "low" && "border-orange-500/30 text-orange-400",
                                  stockLevel === "ok" && (isDark ? "border-white/[0.1] text-slate-400" : "")
                                )}
                                onClick={() => toast.info(`Restock request for "${product.name}" - coming soon!`)}
                              >
                                <RefreshCw className="h-3 w-3" /> Restock
                                <span className="ml-1 text-[10px] bg-muted/50 px-1 py-0.5 rounded">Soon</span>
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
                            ? "bg-white/[0.03] border-white/[0.06] hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5"
                            : "bg-white border hover:border-amber-200 hover:shadow-lg"
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
                            <span className={cn("text-[10px] font-medium", isDark ? "text-slate-400" : "text-slate-400")}>
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
                            <span className={cn("text-[9px] truncate max-w-[80px]", isDark ? "text-slate-400" : "text-muted-foreground")}>
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
        onClose={handleCloseProductModal}
        onSaved={handleSaved}
        product={editingProduct}
        categories={assignableCategories}
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

      {/* ══════════════════ CATEGORY DELETE CONFIRMATION ══════════════════ */}
      <ConfirmDialog
        open={!!deleteCategoryTarget}
        onOpenChange={(open) => { if (!open) setDeleteCategoryTarget(null); }}
        title="Delete Category"
        description={`Are you sure you want to delete "${deleteCategoryTarget}"? Products in this category will show as "Uncategorized".`}
        confirmLabel={categoryDeleting ? "Deleting..." : "Delete"}
        variant="destructive"
        onConfirm={() => { if (deleteCategoryTarget) handleDeleteCategory(deleteCategoryTarget); }}
      />

      {/* ══════════════════ CATEGORY CREATION/EDIT DIALOG ══════════════════ */}
      <Dialog
        open={categoryOpen}
        onOpenChange={(open) => {
          setCategoryOpen(open);
          if (!open && !categorySaving) {
            setCategoryName("");
            setEditingCategory(null);
          }
        }}
      >
        <DialogContent className={cn(
          "sm:max-w-md",
          isGold && "bg-[#1D2437] border-white/[0.08]"
        )}>
          <DialogHeader>
            <DialogTitle className={cn(isDark && "text-white")}>
              {editingCategory ? "Rename Category" : "Add Category"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!categoryName.trim()) { toast.error("Category name is required"); return; }
              if (editingCategory) {
                handleRenameCategory(editingCategory, categoryName);
              } else {
                handleCreateCategory(categoryName);
              }
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
                disabled={categorySaving}
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
                onClick={() => { setCategoryOpen(false); setEditingCategory(null); }}
                disabled={categorySaving}
                className={cn(
                  "flex-1",
                  isGold && "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={categorySaving}
                className={cn(
                  "flex-1",
                  isGold ? "btn-gold" : "bg-amber-600 hover:bg-amber-700 text-white"
                )}
              >
                {categorySaving
                  ? editingCategory ? "Renaming..." : "Creating..."
                  : editingCategory ? "Rename Category" : "Create Category"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Package, ShoppingCart, TrendingUp, AlertTriangle, Loader2, Printer, FileSpreadsheet, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

// ── Types ──

interface ProductReportData {
  stats: {
    totalProducts: number;
    totalSold: number;
    avgMargin: number;
    outOfStock: number;
    lowStockCount: number;
  };
  bestSellers: Array<{
    id: string;
    name: string;
    category: string;
    price: number;
    quantitySold: number;
    revenue: number;
  }>;
  lowStock: Array<{
    id: string;
    name: string;
    category: string;
    price: number;
    stock: number;
  }>;
  categories: Record<string, { count: number; sold: number; revenue: number }>;
  currency: { code: string; symbol: string };
}

const TABS = ["best-sellers", "low-stock", "categories"] as const;

export function ProductReportsPage() {
  const { organization, appTheme } = useValtrioxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";
  const accent = isGold ? "amber" : "emerald";

  const [activeTab, setActiveTab] = useState<string>("best-sellers");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProductReportData | null>(null);

  const fetchData = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/reports/products?orgId=${organization.id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch product report:", err);
    }
    setLoading(false);
  }, [organization]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCSVExport = () => {
    if (!data) return;
    try {
      const rows = ["Name,Category,Price,Qty Sold,Revenue"];
      data.bestSellers.forEach((p) => {
        rows.push(`"${p.name}","${p.category}",${p.price},${p.quantitySold},${p.revenue}`);
      });
      rows.push("");
      rows.push("Category,Products,Sold,Revenue");
      Object.entries(data.categories).forEach(([cat, info]) => {
        rows.push(`"${cat}",${info.count},${info.sold},${info.revenue}`);
      });
      rows.push("");
      rows.push("Low Stock Product,Category,Price,Stock Remaining");
      data.lowStock.forEach((p) => {
        rows.push(`"${p.name}","${p.category}",${p.price},${p.stock}`);
      });
      const csv = rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `product-report-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully!");
    } catch (err) {
      console.error("CSV export failed:", err);
    }
  };

  const handlePrintReport = () => {
    window.print();
    toast.success("Print dialog opened");
  };

  const sym = data?.currency?.symbol || "Rs.";
  const cardBg = isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const accentColor = isGold ? "text-amber-400" : "text-amber-400";
  const accentBg = isGold ? "bg-amber-500/10" : "bg-amber-500/10";
  const accentTab = isGold ? "border-amber-500 text-amber-400" : "border-amber-500 text-amber-400";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl font-bold", textPrimary)}>Product Reports</h1>
          <p className={cn("text-sm mt-1", textSecondary)}>Product performance analytics</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn("gap-2 text-xs", isDark && "border-white/[0.1]")}
              disabled={loading}
            >
              <Download className="h-4 w-4" />
              Export Report
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handlePrintReport}>
              <Printer className="h-4 w-4 mr-2 text-blue-400" />
              Print Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCSVExport}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-green-400" />
              Export as CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className={cn(cardBg)}>
              <CardContent className="p-4">
                <div className="h-4 w-20 bg-slate-700/30 rounded animate-pulse mb-2" />
                <div className="h-6 w-28 bg-slate-700/20 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className={cn(cardBg)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Package className={cn("h-4 w-4", accentColor)} />
                  <p className={cn("text-xs", textSecondary)}>Products</p>
                </div>
                <p className={cn("text-xl font-bold", textPrimary)}>{data?.stats.totalProducts || 0}</p>
              </CardContent>
            </Card>
            <Card className={cn(cardBg)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingCart className={cn("h-4 w-4", accentColor)} />
                  <p className={cn("text-xs", textSecondary)}>Total Sold</p>
                </div>
                <p className={cn("text-xl font-bold", textPrimary)}>{data?.stats.totalSold || 0}</p>
              </CardContent>
            </Card>
            <Card className={cn(cardBg)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className={cn("h-4 w-4", accentColor)} />
                  <p className={cn("text-xs", textSecondary)}>Avg Margin</p>
                </div>
                <p className={cn("text-xl font-bold", textPrimary)}>{data?.stats.avgMargin || 0}%</p>
              </CardContent>
            </Card>
            <Card className={cn("border-red-500/20", isDark ? "bg-red-500/5" : "bg-red-50")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <p className="text-xs text-red-400/80">Out of Stock</p>
                </div>
                <p className="text-xl font-bold text-red-400">{data?.stats.outOfStock || 0}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className={cn("flex flex-wrap gap-1 border-b", isDark ? "border-white/[0.06]" : "border-slate-200")}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab
                ? accentTab
                : isDark
                  ? "border-transparent text-slate-500 hover:text-slate-300"
                  : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
          </button>
        ))}
      </div>

      {loading ? (
        <Card className={cn(cardBg)}>
          <CardContent className="flex items-center justify-center py-20">
            <Loader2 className={cn("h-8 w-8 animate-spin", accentColor)} />
          </CardContent>
        </Card>
      ) : !data || data.stats.totalProducts === 0 ? (
        <Card className={cn(cardBg)}>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center mb-4", accentBg)}>
              <Package className={cn("h-8 w-8", isDark ? `${accent}-400/50` : "text-slate-400/50")} />
            </div>
            <h3 className={cn("text-lg font-semibold mb-1", textPrimary)}>No data available</h3>
            <p className={cn("text-sm max-w-md", textSecondary)}>Start selling to see your product reports here.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Best Sellers Tab */}
          {activeTab === "best-sellers" && (
            <Card className={cn(cardBg)}>
              <CardContent className="p-5">
                <h3 className={cn("text-sm font-semibold mb-4", textPrimary)}>Best Selling Products</h3>
                {data.bestSellers.length === 0 ? (
                  <p className={cn("text-sm py-8 text-center", textSecondary)}>No sales data yet.</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {data.bestSellers.map((p, i) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg",
                          isDark ? "bg-white/[0.02]" : "bg-slate-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center",
                            i === 0 ? (isGold ? "bg-amber-500/20 text-amber-300" : "bg-amber-500/20 text-amber-300") :
                            i === 1 ? (isGold ? "bg-amber-500/10 text-amber-400" : "bg-amber-500/10 text-amber-400") :
                            "bg-slate-500/10 text-slate-400"
                          )}>
                            {i + 1}
                          </span>
                          <div>
                            <p className={cn("text-sm font-medium", textPrimary)}>{p.name}</p>
                            <p className={cn("text-xs", textSecondary)}>{p.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-sm font-bold", accentColor)}>{sym} {p.revenue.toLocaleString()}</p>
                          <p className={cn("text-xs", textSecondary)}>{p.quantitySold} sold</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Low Stock Tab */}
          {activeTab === "low-stock" && (
            <Card className={cn(cardBg)}>
              <CardContent className="p-5">
                <h3 className={cn("text-sm font-semibold mb-4", textPrimary)}>
                  Low Stock Products
                  {data.stats.lowStockCount > 0 && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300">
                      {data.stats.lowStockCount} items
                    </span>
                  )}
                </h3>
                {data.lowStock.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-center">
                    <Package className={cn("h-10 w-10 mb-3", textSecondary)} />
                    <p className={cn("text-sm", textSecondary)}>All products are well stocked.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {data.lowStock.map((p) => (
                      <div
                        key={p.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg",
                          isDark ? "bg-red-500/[0.03] border border-red-500/10" : "bg-red-50 border border-red-100"
                        )}
                      >
                        <div>
                          <p className={cn("text-sm font-medium", textPrimary)}>{p.name}</p>
                          <p className={cn("text-xs", textSecondary)}>{p.category} · {sym} {p.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-bold px-2 py-0.5 rounded",
                            p.stock <= 0 ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"
                          )}>
                            {p.stock} left
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Categories Tab */}
          {activeTab === "categories" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className={cn(cardBg)}>
                <CardContent className="p-5">
                  <h3 className={cn("text-sm font-semibold mb-4", textPrimary)}>Categories by Revenue</h3>
                  <div className="space-y-3">
                    {Object.entries(data.categories)
                      .sort(([, a], [, b]) => b.revenue - a.revenue)
                      .map(([cat, info]) => {
                        const maxRevenue = Math.max(...Object.values(data.categories).map((c) => c.revenue), 1);
                        const pct = (info.revenue / maxRevenue) * 100;
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className={cn("text-sm font-medium", textPrimary)}>{cat}</span>
                              <span className={cn("text-xs font-medium", accentColor)}>{sym} {info.revenue.toLocaleString()}</span>
                            </div>
                            <div className={cn("h-2 rounded-full overflow-hidden", isDark ? "bg-white/[0.05]" : "bg-slate-100")}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6 }}
                                className={cn("h-full rounded-full", isGold ? "bg-amber-500" : "bg-amber-500")}
                              />
                            </div>
                            <p className={cn("text-[10px]", textSecondary)}>{info.count} products · {info.sold} sold</p>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              <Card className={cn(cardBg)}>
                <CardContent className="p-5">
                  <h3 className={cn("text-sm font-semibold mb-4", textPrimary)}>Categories by Units Sold</h3>
                  <div className="space-y-3">
                    {Object.entries(data.categories)
                      .sort(([, a], [, b]) => b.sold - a.sold)
                      .map(([cat, info]) => {
                        const maxSold = Math.max(...Object.values(data.categories).map((c) => c.sold), 1);
                        const pct = (info.sold / maxSold) * 100;
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className={cn("text-sm font-medium", textPrimary)}>{cat}</span>
                              <span className={cn("text-xs font-medium", accentColor)}>{info.sold.toLocaleString()} units</span>
                            </div>
                            <div className={cn("h-2 rounded-full overflow-hidden", isDark ? "bg-white/[0.05]" : "bg-slate-100")}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6 }}
                                className={cn("h-full rounded-full", isGold ? "bg-amber-500/70" : "bg-amber-500/70")}
                              />
                            </div>
                            <p className={cn("text-[10px]", textSecondary)}>{info.count} products · {sym} {info.revenue.toLocaleString()}</p>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

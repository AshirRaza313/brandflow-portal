"use client";

import { useState, useEffect, useCallback } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Users, UserPlus, Heart, Wallet, Loader2, BarChart3, Printer, FileSpreadsheet, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

// ── Types ──

interface CustomerReportData {
  stats: {
    totalCustomers: number;
    newThisMonth: number;
    retentionRate: number;
    avgLTV: number;
    totalSpent: number;
  };
  recentCustomers: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    totalSpent: number;
    orderCount: number;
    loyaltyTier: string;
    createdAt: string;
  }>;
  tierBreakdown: Record<string, number>;
  cityBreakdown: Record<string, number>;
  topCustomers: Array<{
    name: string;
    totalSpent: number;
    orderCount: number;
    loyaltyTier: string;
  }>;
  currency: { code: string; symbol: string };
}

const TIER_COLORS: Record<string, string> = {
  new: "bg-slate-500/20 text-slate-300",
  bronze: "bg-orange-500/20 text-orange-300",
  silver: "bg-slate-400/20 text-slate-200",
  gold: "bg-amber-500/20 text-amber-300",
  platinum: "bg-amber-500/20 text-amber-300",
  vip: "bg-amber-500/20 text-amber-300",
};

export function CustomerReportsPage() {
  const { organization, appTheme } = useValtrioxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";
  const accent = isGold ? "amber" : "emerald";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CustomerReportData | null>(null);

  const fetchData = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/reports/customers?orgId=${organization.id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch customer report:", err);
    }
    setLoading(false);
  }, [organization]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCSVExport = () => {
    if (!data) return;
    try {
      const rows = ["Name,Email,Phone,City,Total Spent,Orders,Tier,Joined"];
      data.recentCustomers.forEach((c) => {
        rows.push(`"${c.name}","${c.email || ''}","${c.phone || ''}","${c.city || ''}",${c.totalSpent},${c.orderCount},${c.loyaltyTier},${c.createdAt}`);
      });
      rows.push("");
      rows.push("Tier,Count");
      Object.entries(data.tierBreakdown).forEach(([tier, count]) => {
        rows.push(`${tier},${count}`);
      });
      rows.push("");
      rows.push("Top Customer,Total Spent,Orders,Tier");
      data.topCustomers.forEach((c) => {
        rows.push(`"${c.name}",${c.totalSpent},${c.orderCount},${c.loyaltyTier}`);
      });
      const csv = rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customer-report-${new Date().toISOString().split("T")[0]}.csv`;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl font-bold", textPrimary)}>Customer Reports</h1>
          <p className={cn("text-sm mt-1", textSecondary)}>Customer analytics and insights</p>
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
                  <Users className={cn("h-4 w-4", accentColor)} />
                  <p className={cn("text-xs", textSecondary)}>Total Customers</p>
                </div>
                <p className={cn("text-xl font-bold", textPrimary)}>{data?.stats.totalCustomers || 0}</p>
              </CardContent>
            </Card>
            <Card className={cn(cardBg)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <UserPlus className={cn("h-4 w-4", accentColor)} />
                  <p className={cn("text-xs", textSecondary)}>New (This Month)</p>
                </div>
                <p className={cn("text-xl font-bold", textPrimary)}>{data?.stats.newThisMonth || 0}</p>
              </CardContent>
            </Card>
            <Card className={cn(cardBg)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Heart className={cn("h-4 w-4", accentColor)} />
                  <p className={cn("text-xs", textSecondary)}>Retention Rate</p>
                </div>
                <p className={cn("text-xl font-bold", textPrimary)}>{data?.stats.retentionRate || 0}%</p>
              </CardContent>
            </Card>
            <Card className={cn(cardBg)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className={cn("h-4 w-4", accentColor)} />
                  <p className={cn("text-xs", textSecondary)}>Avg LTV</p>
                </div>
                <p className={cn("text-xl font-bold", textPrimary)}>{sym} {data?.stats.avgLTV.toLocaleString() || 0}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {loading ? (
        <Card className={cn(cardBg)}>
          <CardContent className="flex items-center justify-center py-20">
            <Loader2 className={cn("h-8 w-8 animate-spin", accentColor)} />
          </CardContent>
        </Card>
      ) : !data || data.stats.totalCustomers === 0 ? (
        <Card className={cn(cardBg)}>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center mb-4", accentBg)}>
              <Users className={cn("h-8 w-8", isDark ? `${accent}-400/50` : "text-slate-400/50")} />
            </div>
            <h3 className={cn("text-lg font-semibold mb-1", textPrimary)}>No data available</h3>
            <p className={cn("text-sm max-w-md", textSecondary)}>Customer insights will appear as you acquire more customers.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top Customers */}
          <Card className={cn(cardBg, "lg:col-span-2")}>
            <CardContent className="p-5">
              <h3 className={cn("text-sm font-semibold mb-4", textPrimary)}>Top Customers by Spend</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {data.topCustomers.map((c, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg",
                      isDark ? "bg-white/[0.02]" : "bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn("text-xs font-bold w-6 text-center", textSecondary)}>{i + 1}</span>
                      <div>
                        <p className={cn("text-sm font-medium", textPrimary)}>{c.name}</p>
                        <p className={cn("text-xs", textSecondary)}>{c.orderCount} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-bold", accentColor)}>{sym} {c.totalSpent.toLocaleString()}</p>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded", TIER_COLORS[c.loyaltyTier] || "bg-slate-500/20 text-slate-300")}>
                        {c.loyaltyTier}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tier Breakdown */}
          <Card className={cn(cardBg)}>
            <CardContent className="p-5">
              <h3 className={cn("text-sm font-semibold mb-4", textPrimary)}>Loyalty Tier Distribution</h3>
              <div className="space-y-3">
                {Object.entries(data.tierBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([tier, count]) => {
                    const pct = ((count / data.stats.totalCustomers) * 100).toFixed(0);
                    return (
                      <div key={tier} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={cn("text-sm font-medium capitalize", textPrimary)}>{tier}</span>
                          <span className={cn("text-xs", textSecondary)}>{count} ({pct}%)</span>
                        </div>
                        <div className={cn("h-2 rounded-full overflow-hidden", isDark ? "bg-white/[0.05]" : "bg-slate-100")}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6 }}
                            className={cn(
                              "h-full rounded-full",
                              tier === "gold" ? "bg-amber-500" :
                              tier === "platinum" ? "bg-amber-500" :
                              tier === "silver" ? "bg-slate-400" :
                              tier === "bronze" ? "bg-orange-500" :
                              tier === "vip" ? "bg-amber-500" :
                              isGold ? "bg-amber-500/40" : "bg-amber-500/40"
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>

              {Object.keys(data.cityBreakdown).length > 0 && (
                <div className="mt-6">
                  <h4 className={cn("text-xs font-semibold mb-3", textSecondary)}>TOP CITIES</h4>
                  <div className="space-y-1">
                    {Object.entries(data.cityBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([city, count]) => (
                        <div key={city} className="flex items-center justify-between">
                          <span className={cn("text-xs", textSecondary)}>{city}</span>
                          <span className={cn("text-xs font-mono", textSecondary)}>{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Customer Acquisition */}
          <Card className={cn(cardBg, "lg:col-span-3")}>
            <CardContent className="p-5">
              <h3 className={cn("text-sm font-semibold mb-4", textPrimary)}>Recent Customer Acquisition</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={cn("border-b", isDark ? "border-white/[0.06]" : "border-slate-200")}>
                      <th className={cn("text-left text-[10px] font-bold uppercase tracking-wider pb-3 pr-4", textSecondary)}>Name</th>
                      <th className={cn("text-left text-[10px] font-bold uppercase tracking-wider pb-3 pr-4", textSecondary)}>Phone</th>
                      <th className={cn("text-left text-[10px] font-bold uppercase tracking-wider pb-3 pr-4", textSecondary)}>City</th>
                      <th className={cn("text-right text-[10px] font-bold uppercase tracking-wider pb-3 pr-4", textSecondary)}>Spent</th>
                      <th className={cn("text-right text-[10px] font-bold uppercase tracking-wider pb-3", textSecondary)}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentCustomers.slice(0, 10).map((c) => (
                      <tr key={c.id} className={cn("border-b", isDark ? "border-white/[0.03]" : "border-slate-100")}>
                        <td className={cn("py-2.5 pr-4 text-sm", textPrimary)}>{c.name}</td>
                        <td className={cn("py-2.5 pr-4 text-xs", textSecondary)}>{c.phone || "—"}</td>
                        <td className={cn("py-2.5 pr-4 text-xs", textSecondary)}>{c.city || "—"}</td>
                        <td className={cn("py-2.5 pr-4 text-sm font-medium text-right", accentColor)}>{sym} {c.totalSpent.toLocaleString()}</td>
                        <td className={cn("py-2.5 text-xs text-right", textSecondary)}>
                          {new Date(c.createdAt).toLocaleDateString("en-PK", { month: "short", day: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

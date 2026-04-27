"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap, Plus, Clock, Eye, TrendingUp, DollarSign, BarChart3,
  Flame, Users, AlertTriangle, Trophy, Timer, Search,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useValtrioxStore } from "@/store/brandflow-store";

// ── Types ──
interface FlashSale {
  id: string;
  name: string;
  description: string;
  productId?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  startAt: string;
  endAt: string;
  status: "draft" | "active" | "expired" | "cancelled";
  viewerCount: number;
  redemptionCount: number;
  maxRedemptions?: number;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; darkColor: string }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700 border-slate-200", darkColor: "bg-slate-500/15 text-slate-400 border border-slate-500/25" },
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700 border-emerald-200", darkColor: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" },
  expired: { label: "Expired", color: "bg-slate-100 text-slate-500 border-slate-200", darkColor: "bg-slate-500/15 text-slate-500 border border-slate-500/25" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-600 border-red-200", darkColor: "bg-red-500/15 text-red-400 border border-red-500/25" },
};

// ── Countdown Timer Component ──
function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true }); return; }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        isExpired: false,
      });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.isExpired) {
    return <span className="text-xs text-red-400 font-medium">Ended</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <Timer className="h-3 w-3 text-amber-500" />
      {timeLeft.days > 0 && (
        <span className="text-xs font-mono font-bold text-amber-400">{timeLeft.days}d</span>
      )}
      <span className="text-xs font-mono font-bold text-amber-400">
        {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
      </span>
    </div>
  );
}

export function FlashSalesPage() {
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme === "premium-dark" || appTheme === "dark";

  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    productId: "",
    discountType: "percentage" as FlashSale["discountType"],
    discountValue: "",
    startAt: "",
    endAt: "",
    maxRedemptions: "",
  });

  const fetchFlashSales = useCallback(async () => {
    try {
      const res = await fetch("/api/flash-sales");
      if (res.ok) {
        const data = await res.json();
        setFlashSales(data.flashSales || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFlashSales(); }, [fetchFlashSales]);

  // Refresh active tab every 5s for countdown
  useEffect(() => {
    if (activeTab !== "active") return;
    const interval = setInterval(fetchFlashSales, 5000);
    return () => clearInterval(interval);
  }, [activeTab, fetchFlashSales]);

  const handleCreate = async () => {
    if (!formData.name.trim()) { toast.error("Sale name is required"); return; }
    if (!formData.startAt || !formData.endAt) { toast.error("Start and end times are required"); return; }
    try {
      const res = await fetch("/api/flash-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          productId: formData.productId || undefined,
          discountType: formData.discountType,
          discountValue: parseFloat(formData.discountValue) || 0,
          startAt: formData.startAt,
          endAt: formData.endAt,
          maxRedemptions: formData.maxRedemptions ? parseInt(formData.maxRedemptions) : undefined,
        }),
      });
      if (res.ok) {
        toast.success("Flash sale created!");
        setCreateOpen(false);
        setFormData({ name: "", description: "", productId: "", discountType: "percentage", discountValue: "", startAt: "", endAt: "", maxRedemptions: "" });
        fetchFlashSales();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create flash sale");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch("/api/flash-sales", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "cancelled" }),
      });
      if (res.ok) {
        toast.success("Flash sale cancelled");
        fetchFlashSales();
      }
    } catch {
      toast.error("Failed to cancel flash sale");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/flash-sales?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Flash sale deleted");
        fetchFlashSales();
      }
    } catch {
      toast.error("Failed to delete flash sale");
    }
  };

  // ── Computed stats ──
  const activeSales = flashSales.filter((s) => s.status === "active");
  const totalRevenue = flashSales.reduce((s, sale) => {
    if (sale.status === "active" || sale.status === "expired") {
      return s + sale.redemptionCount * (sale.discountType === "fixed" ? sale.discountValue : 50);
    }
    return s;
  }, 0);
  const avgDiscount = flashSales.length > 0
    ? flashSales.reduce((s, sale) => s + sale.discountValue, 0) / flashSales.length
    : 0;
  const conversionRate = activeSales.length > 0
    ? activeSales.reduce((s, sale) => {
        const total = sale.viewerCount;
        return s + (total > 0 ? (sale.redemptionCount / total) * 100 : 0);
      }, 0) / activeSales.length
    : 0;
  const topSale = flashSales.reduce((best, cur) => cur.redemptionCount > best.redemptionCount ? cur : best, flashSales[0]);

  const filteredAllSales = flashSales.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
    }
    return true;
  });

  const cardClass = isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-white border-slate-200";
  const primaryText = isDark ? "text-white" : "text-slate-900";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-500";
  const inputCls = isDark ? "bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500" : "";
  const labelCls = isDark ? "text-slate-300" : "";

  // Urgency indicator
  const getUrgency = (sale: FlashSale) => {
    const diff = new Date(sale.endAt).getTime() - Date.now();
    const hoursLeft = diff / (1000 * 60 * 60);
    if (hoursLeft <= 1) return { label: "Ending soon!", color: "text-red-400" };
    if (hoursLeft <= 6) return { label: "Hurry!", color: "text-orange-400" };
    if (sale.maxRedemptions && sale.redemptionCount >= sale.maxRedemptions * 0.8) return { label: "Limited stock!", color: "text-amber-400" };
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${primaryText}`}>Flash Sales</h1>
          <p className={`text-sm mt-1 ${secondaryText}`}>Create time-limited deals with live tracking</p>
        </div>
        <Button
          className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" /> New Flash Sale
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`w-full sm:w-auto ${isDark ? "bg-white/[0.05]" : "bg-slate-100"}`}>
          <TabsTrigger value="active" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
            <Flame className="mr-1.5 h-3.5 w-3.5" /> Active
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
            <Zap className="mr-1.5 h-3.5 w-3.5" /> All Sales
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Performance
          </TabsTrigger>
        </TabsList>

        {/* ═══ ACTIVE TAB ═══ */}
        <TabsContent value="active" className="mt-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : activeSales.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <AnimatePresence>
                {activeSales.map((sale) => {
                  const urgency = getUrgency(sale);
                  const redemptionPct = sale.maxRedemptions
                    ? Math.min((sale.redemptionCount / sale.maxRedemptions) * 100, 100)
                    : 0;
                  return (
                    <motion.div
                      key={sale.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`p-5 rounded-xl border ${cardClass} relative overflow-hidden`}
                    >
                      {/* Active indicator stripe */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-600" />

                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Flame className="h-4 w-4 text-amber-500" />
                            <h3 className={`font-bold text-base truncate ${primaryText}`}>{sale.name}</h3>
                          </div>
                          {sale.description && (
                            <p className={`text-xs line-clamp-2 ${secondaryText}`}>{sale.description}</p>
                          )}
                        </div>
                        <Badge className={isDark ? STATUS_CONFIG.active.darkColor : STATUS_CONFIG.active.color}>
                          Live
                        </Badge>
                      </div>

                      {/* Discount badge */}
                      <div className="mb-4">
                        <span className={`text-2xl font-black ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                          {sale.discountType === "percentage"
                            ? `${sale.discountValue}% OFF`
                            : `$${sale.discountValue} OFF`}
                        </span>
                      </div>

                      {/* Countdown */}
                      <div className={`flex items-center justify-between p-3 rounded-lg mb-3 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
                        <div>
                          <span className={`text-xs ${secondaryText}`}>Ends in</span>
                          <div>
                            <CountdownTimer targetDate={sale.endAt} />
                          </div>
                        </div>
                        {urgency && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className={`h-3.5 w-3.5 ${urgency.color}`} />
                            <span className={`text-xs font-semibold ${urgency.color}`}>{urgency.label}</span>
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5 text-sky-400" />
                          <span className={`text-xs ${secondaryText}`}>{sale.viewerCount.toLocaleString()} views</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-emerald-400" />
                          <span className={`text-xs ${secondaryText}`}>{sale.redemptionCount} redeemed</span>
                        </div>
                      </div>

                      {/* Redemption progress */}
                      {sale.maxRedemptions && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${secondaryText}`}>Redemptions</span>
                            <span className={`text-xs font-medium ${primaryText}`}>
                              {sale.redemptionCount}/{sale.maxRedemptions}
                            </span>
                          </div>
                          <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${redemptionPct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-full ${redemptionPct > 80 ? "bg-red-500" : "bg-gradient-to-r from-amber-500 to-amber-600"}`}
                            />
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4 pt-3 border-t border-white/[0.06]">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                          onClick={() => {
                            const newViewers = sale.viewerCount + Math.floor(Math.random() * 10);
                            fetch("/api/flash-sales", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: sale.id, viewerCount: newViewers }),
                            }).then(fetchFlashSales);
                          }}
                        >
                          <Eye className="mr-1 h-3 w-3" /> Simulate View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => handleCancel(sale.id)}
                        >
                          Cancel Sale
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <Card className={cardClass}>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? "bg-white/[0.05]" : "bg-slate-100"}`}>
                  <Zap className={`h-8 w-8 ${secondaryText}`} />
                </div>
                <h3 className={`text-lg font-semibold mb-1 ${primaryText}`}>No active flash sales</h3>
                <p className={`text-sm ${secondaryText} max-w-sm mb-4`}>
                  Create a flash sale to drive urgency and boost conversions!
                </p>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create Flash Sale
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ ALL SALES TAB ═══ */}
        <TabsContent value="all" className="mt-6 space-y-4">
          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${secondaryText}`} />
              <Input
                placeholder="Search flash sales..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`pl-9 ${inputCls}`}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={`w-full sm:w-40 ${inputCls}`}>
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredAllSales.length > 0 ? (
            <div className="grid gap-3">
              <AnimatePresence>
                {filteredAllSales.map((sale) => {
                  const stCfg = STATUS_CONFIG[sale.status];
                  return (
                    <motion.div
                      key={sale.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`p-4 rounded-xl border ${cardClass} hover:border-amber-500/30 transition-colors`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                          <Zap className={`h-5 w-5 ${sale.status === "active" ? "text-amber-500" : sale.status === "expired" ? "text-slate-400" : "text-slate-500"}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold truncate ${primaryText}`}>{sale.name}</h3>
                            <Badge variant="outline" className={isDark ? stCfg.darkColor : stCfg.color}>
                              {stCfg.label}
                            </Badge>
                          </div>
                          {sale.description && (
                            <p className={`text-xs truncate ${secondaryText}`}>{sale.description}</p>
                          )}
                          <div className={`flex flex-wrap items-center gap-3 mt-2 text-xs ${secondaryText}`}>
                            <span className={`font-bold ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                              {sale.discountType === "percentage" ? `${sale.discountValue}% OFF` : `$${sale.discountValue} OFF`}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {new Date(sale.startAt).toLocaleDateString()} → {new Date(sale.endAt).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> {sale.redemptionCount} redeemed
                            </span>
                            {sale.maxRedemptions && (
                              <span className="flex items-center gap-1">
                                <Trophy className="h-3 w-3" /> {sale.redemptionCount}/{sale.maxRedemptions}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {sale.status !== "cancelled" && sale.status !== "expired" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => handleCancel(sale.id)}
                            >
                              Cancel
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => handleDelete(sale.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <Card className={cardClass}>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-3 ${isDark ? "bg-white/[0.05]" : "bg-slate-100"}`}>
                  <Zap className={`h-6 w-6 ${secondaryText}`} />
                </div>
                <p className={`text-sm ${secondaryText}`}>No flash sales found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ PERFORMANCE TAB ═══ */}
        <TabsContent value="performance" className="mt-6 space-y-6">
          <div>
            <h2 className={`text-lg font-bold mb-1 ${primaryText}`}>Flash Sale Performance</h2>
            <p className={`text-sm ${secondaryText}`}>Revenue, conversions, and top performing deals</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: <DollarSign className="h-5 w-5 text-emerald-500" />, sub: "from all flash sales" },
              { label: "Avg Discount", value: `${avgDiscount.toFixed(1)}%`, icon: <TrendingUp className="h-5 w-5 text-amber-500" />, sub: "across all sales" },
              { label: "Conversion Rate", value: `${conversionRate.toFixed(1)}%`, icon: <BarChart3 className="h-5 w-5 text-sky-500" />, sub: "active sales avg" },
              { label: "Total Redemptions", value: flashSales.reduce((s, sale) => s + sale.redemptionCount, 0).toString(), icon: <Trophy className="h-5 w-5 text-rose-500" />, sub: "all time" },
            ].map((stat) => (
              <Card key={stat.label} className={cardClass}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-medium uppercase tracking-wider ${secondaryText}`}>{stat.label}</span>
                    {stat.icon}
                  </div>
                  <p className={`text-2xl font-bold ${primaryText}`}>{stat.value}</p>
                  <p className={`text-xs mt-1 ${secondaryText}`}>{stat.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Top Performing Sale */}
          {topSale && (
            <Card className={cardClass}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <h3 className={`text-sm font-semibold ${primaryText}`}>Top Performing Sale</h3>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${isDark ? "bg-amber-500/10" : "bg-amber-100"}`}>
                    <Zap className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-bold ${primaryText}`}>{topSale.name}</h4>
                    <p className={`text-sm ${secondaryText}`}>
                      {topSale.discountType === "percentage" ? `${topSale.discountValue}% OFF` : `$${topSale.discountValue} OFF`}
                      {" · "}{topSale.redemptionCount} redemptions
                      {" · "}{topSale.viewerCount} views
                    </p>
                  </div>
                  <Badge className={isDark ? STATUS_CONFIG[topSale.status]?.darkColor : STATUS_CONFIG[topSale.status]?.color}>
                    {STATUS_CONFIG[topSale.status]?.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══ CREATE DIALOG ═══ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700/50" : ""}`}>
          <DialogHeader>
            <DialogTitle className={primaryText}>Create Flash Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelCls}>Sale Name</Label>
              <Input
                placeholder="e.g., Midnight Flash Deal"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Description</Label>
              <Textarea
                placeholder="Brief description of the flash sale..."
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={labelCls}>Discount Type</Label>
                <Select value={formData.discountType} onValueChange={(v) => setFormData({ ...formData, discountType: v as FlashSale["discountType"] })}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Discount Value</Label>
                <Input
                  type="number"
                  placeholder={formData.discountType === "percentage" ? "e.g., 25" : "e.g., 10"}
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={labelCls}>Start Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.startAt}
                  onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>End Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.endAt}
                  onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Max Redemptions (optional)</Label>
              <Input
                type="number"
                placeholder="e.g., 100"
                value={formData.maxRedemptions}
                onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                className={inputCls}
              />
              <p className={`text-xs ${secondaryText}`}>Leave empty for unlimited redemptions</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleCreate}>
              Create Flash Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

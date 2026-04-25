"use client";

import { useState, useEffect, useCallback } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Shield,
  Crown,
  Zap,
  Users,
  CreditCard,
  RefreshCw,
  Ban,
  Unlock,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Eye,
  Trash2,
  Plus,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──
interface SubItem {
  id: string;
  status: string;
  billingCycle: string;
  trialEndsAt: string;
  currentPeriodEnd: string;
  reminderCount: number;
  createdAt: string;
  updatedAt: string;
  organization: {
    id: string; name: string; email?: string; phone?: string; logo?: string;
    plan: string; isBanned: boolean; banReason?: string;
    paymentRejectionCount: number; createdAt: string;
  };
  plan: { id: string; name: string; price: number; annualPrice: number; period: string };
  recentPayments: Array<{ id: string; status: string; amount: number; planName: string; billingCycle: string; createdAt: string }>;
}

interface SubStats {
  total: number; trial: number; active: number; pending_payment: number;
  expired: number; cancelled: number; banned: number;
  monthly_active: number; annual_active: number;
  monthly_revenue: number; annual_revenue: number;
}

// ── Main Component ──
export function AdminSubscriptionsPage() {
  const { user, appTheme } = useValtrioxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<SubItem[]>([]);
  const [stats, setStats] = useState<SubStats | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // ── Modal State ──
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionModalSub, setActionModalSub] = useState<SubItem | null>(null);
  const [actionType, setActionType] = useState("");
  const [actionForm, setActionForm] = useState({ planName: "", billingCycle: "monthly", extendDays: "", banReason: "" });

  // ── Fetch ──
  const fetchSubscriptions = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        userId: user?.id || "",
        status: statusFilter,
        limit: "50",
      });
      const res = await fetch(`/api/admin/subscriptions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, [user?.id, statusFilter]);

  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  // ── Execute Action ──
  const executeAction = async (subId: string, action: string, extraData: Record<string, any> = {}) => {
    setActionLoading((p) => ({ ...p, [subId]: true }));
    try {
      const res = await fetch(`/api/admin/subscriptions/${subId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminUserId: user?.id,
          ...extraData,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setShowActionModal(false);
        await fetchSubscriptions();
      } else {
        toast.error(data.error || "Action failed");
      }
    } catch {
      toast.error("Action failed. Please try again.");
    }
    setActionLoading((p) => ({ ...p, [subId]: false }));
  };

  // ── Generate Invoice + Download PDF ──
  const handleGenerateInvoice = async (sub: SubItem) => {
    setActionLoading((p) => ({ ...p, [sub.id]: true }));
    try {
      // Find latest approved payment proof ID for this subscription
      const latestApprovedPayment = sub.recentPayments?.find((p) => p.status === "approved");
      const paymentProofId = latestApprovedPayment?.id || undefined;

      // Step 1: Create invoice in DB
      const createRes = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: sub.organization.id,
          subscriptionId: sub.id,
          paymentProofId,
          planName: sub.plan.name,
          amount: sub.billingCycle === "annually" && sub.plan.annualPrice > 0 ? sub.plan.annualPrice : sub.plan.price,
          billingCycle: sub.billingCycle,
          status: sub.status === "active" ? "paid" : "pending",
        }),
      });
      const createData = await createRes.json();

      if (!createRes.ok) {
        toast.error(createData.error || "Failed to generate invoice");
        setActionLoading((p) => ({ ...p, [sub.id]: false }));
        return;
      }

      const newInvoice = createData.invoice;
      toast.success(`Invoice ${newInvoice.invoiceNumber} created! Downloading PDF...`);

      // Step 2: Download the PDF
      try {
        const dlRes = await fetch(`/api/invoices/${newInvoice.id}/download`);
        if (dlRes.ok) {
          const blob = await dlRes.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${newInvoice.invoiceNumber}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success(`Invoice ${newInvoice.invoiceNumber} PDF downloaded!`);
        } else {
          const errData = await dlRes.json().catch(() => ({}));
          toast.error(errData.error || errData.details || "PDF download failed");
          console.error("Invoice download error:", errData);
        }
      } catch (dlErr) {
        console.error("Invoice download network error:", dlErr);
        toast.error("Invoice created but PDF download failed. You can download it from Invoice Management tab.");
      }
    } catch (err) {
      console.error("Generate invoice error:", err);
      toast.error("Failed to generate invoice");
    }
    setActionLoading((p) => ({ ...p, [sub.id]: false }));
  };

  // ── Open Action Modal ──
  const openActionModal = (sub: SubItem, action: string) => {
    setActionModalSub(sub);
    setActionType(action);
    setActionForm({ planName: "", billingCycle: "monthly", extendDays: "", banReason: "" });
    setShowActionModal(true);
  };

  // ── Status Badge ──
  const getStatusBadge = (status: string, isBanned: boolean) => {
    if (isBanned) return <Badge className="bg-red-500/20 text-red-300 border-red-500/30 gap-1"><Ban className="h-3 w-3" /> Banned</Badge>;
    switch (status) {
      case "trial": return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1"><Clock className="h-3 w-3" /> Trial</Badge>;
      case "active": return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1"><CheckCircle2 className="h-3 w-3" /> Active</Badge>;
      case "pending_payment": return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "expired": return <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/30 gap-1"><XCircle className="h-3 w-3" /> Expired</Badge>;
      case "cancelled": return <Badge className="bg-red-500/20 text-red-300 border-red-500/30 gap-1"><XCircle className="h-3 w-3" /> Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // ── Loading ──
  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-amber-400" /></div>;
  }

  const cardBg = isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl font-bold", textPrimary)}>Subscription Management</h1>
          <p className={cn("text-sm mt-1", textSecondary)}>Manage all organization subscriptions, plans, and billing</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={cn("w-40", isDark ? "border-white/[0.1] bg-white/[0.03]" : "")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({stats?.total || 0})</SelectItem>
              <SelectItem value="trial">Trial ({stats?.trial || 0})</SelectItem>
              <SelectItem value="active">Active ({stats?.active || 0})</SelectItem>
              <SelectItem value="pending_payment">Pending ({stats?.pending_payment || 0})</SelectItem>
              <SelectItem value="expired">Expired ({stats?.expired || 0})</SelectItem>
              <SelectItem value="cancelled">Cancelled ({stats?.cancelled || 0})</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchSubscriptions} className={cn("gap-2", isDark ? "border-white/[0.1]" : "")}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Total", value: stats.total, color: textPrimary, icon: Users },
            { label: "Active", value: stats.active, color: "text-amber-400", icon: CheckCircle2 },
            { label: "Trial", value: stats.trial, color: "text-amber-400", icon: Clock },
            { label: "Monthly", value: stats.monthly_active, color: "text-blue-400", icon: Calendar },
            { label: "Annual", value: stats.annual_active, color: "text-amber-400", icon: Calendar },
            { label: "Banned", value: stats.banned, color: "text-red-400", icon: Ban },
          ].map((stat) => (
            <Card key={stat.label} className={cn(cardBg)}>
              <CardContent className="p-3 text-center">
                <stat.icon className={cn("h-4 w-4 mx-auto mb-1", stat.color)} />
                <p className={cn("text-xl font-bold", stat.color)}>{stat.value}</p>
                <p className={cn("text-[10px]", textSecondary)}>{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Revenue Summary */}
      {stats && (stats.monthly_revenue > 0 || stats.annual_revenue > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className={cn(cardBg, "border-amber-500/20")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("text-xs", textSecondary)}>Monthly Recurring Revenue</p>
                  <p className="text-2xl font-bold text-amber-400">Rs. {stats.monthly_revenue.toLocaleString()}</p>
                </div>
                <ArrowUpRight className="h-8 w-8 text-amber-400/30" />
              </div>
            </CardContent>
          </Card>
          <Card className={cn(cardBg, "border-amber-500/20")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("text-xs", textSecondary)}>Annual Revenue</p>
                  <p className="text-2xl font-bold text-amber-400">Rs. {stats.annual_revenue.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-amber-400/30" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subscriptions List */}
      {subscriptions.length === 0 ? (
        <Card className={cn(cardBg)}>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-slate-400/50 mb-3" />
            <h3 className={cn("font-semibold", textPrimary)}>No Subscriptions Found</h3>
            <p className={cn("text-sm mt-1", textSecondary)}>No subscriptions match the selected filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => (
            <motion.div key={sub.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
              <Card className={cn("overflow-hidden", cardBg, sub.organization.isBanned && "border-red-500/30")}>
                <CardContent className="p-0">
                  {/* Header Row */}
                  <div className="p-4 cursor-pointer flex items-center justify-between gap-4"
                    onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}>
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm",
                        isDark ? "bg-white/[0.06] text-white" : "bg-slate-100 text-slate-700"
                      )}>
                        {sub.organization.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("font-semibold text-sm truncate", textPrimary)}>{sub.organization.name}</span>
                          {getStatusBadge(sub.status, sub.organization.isBanned)}
                          <Badge className={cn("text-[10px] px-1.5 py-0", sub.billingCycle === "annually" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300")}>
                            {sub.billingCycle === "annually" ? "Annual" : "Monthly"}
                          </Badge>
                        </div>
                        <div className={cn("flex items-center gap-3 text-xs mt-0.5", textSecondary)}>
                          <span className="capitalize">{sub.plan.name}</span>
                          {sub.plan.price > 0 && (
                            <span>Rs. {(sub.billingCycle === "annually" && sub.plan.annualPrice > 0 ? sub.plan.annualPrice : sub.plan.price).toLocaleString()}</span>
                          )}
                          {sub.organization.email && <span>{sub.organization.email}</span>}
                          {sub.organization.paymentRejectionCount > 0 && (
                            <span className="text-red-400 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> {sub.organization.paymentRejectionCount} rejections
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-xs hidden sm:block", textSecondary)}>
                        {new Date(sub.updatedAt).toLocaleDateString("en-PK", { month: "short", day: "numeric" })}
                      </span>
                      {expandedId === sub.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedId === sub.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                        <Separator className={isDark ? "bg-white/[0.06]" : "bg-slate-200"} />
                        <div className="p-4 space-y-4">
                          {/* Info Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className={cn("p-3 rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                              <p className={cn("text-[10px]", textSecondary)}>Plan</p>
                              <p className={cn("text-sm font-semibold capitalize", textPrimary)}>{sub.plan.name}</p>
                            </div>
                            <div className={cn("p-3 rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                              <p className={cn("text-[10px]", textSecondary)}>Status</p>
                              <p className={cn("text-sm font-semibold capitalize", textPrimary)}>{sub.status.replace("_", " ")}</p>
                            </div>
                            <div className={cn("p-3 rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                              <p className={cn("text-[10px]", textSecondary)}>Period End</p>
                              <p className="text-sm font-semibold text-primary">
                                {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
                              </p>
                            </div>
                            <div className={cn("p-3 rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                              <p className={cn("text-[10px]", textSecondary)}>Reminders Sent</p>
                              <p className="text-sm font-semibold text-primary">{sub.reminderCount || 0}</p>
                            </div>
                          </div>

                          {/* Banned Info */}
                          {sub.organization.isBanned && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                              <p className="text-sm font-semibold text-red-300 flex items-center gap-2">
                                <Ban className="h-4 w-4" /> Banned
                              </p>
                              {sub.organization.banReason && <p className="text-xs text-red-200/70 mt-1">Reason: {sub.organization.banReason}</p>}
                            </div>
                          )}

                          {/* Recent Payments */}
                          {sub.recentPayments.length > 0 && (
                            <div>
                              <p className={cn("text-xs font-medium mb-2", textSecondary)}>Recent Payments</p>
                              <div className="space-y-1">
                                {sub.recentPayments.map((p) => (
                                  <div key={p.id} className={cn("flex items-center justify-between p-2 rounded text-xs", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                                    <div className="flex items-center gap-2">
                                      <span className="capitalize">{p.planName}</span>
                                      <span className={cn("px-1.5 py-0.5 rounded text-[10px]",
                                        p.status === "approved" ? "bg-amber-500/20 text-amber-300" :
                                        p.status === "rejected" ? "bg-red-500/20 text-red-300" : "bg-yellow-500/20 text-yellow-300"
                                      )}>{p.status}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span>Rs. {p.amount.toLocaleString()}</span>
                                      <span className={textSecondary}>{new Date(p.createdAt).toLocaleDateString("en-PK", { month: "short", day: "numeric" })}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Admin Actions */}
                          <Separator className={isDark ? "bg-white/[0.06]" : "bg-slate-200"} />
                          <div>
                            <p className={cn("text-xs font-medium mb-3", textSecondary)}>Admin Actions</p>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" className={cn("gap-1 text-xs", isDark ? "border-white/[0.1]" : "")}
                                onClick={() => handleGenerateInvoice(sub)}
                                disabled={!!actionLoading[sub.id]}>
                                {actionLoading[sub.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                                Generate Invoice
                              </Button>
                              <Button size="sm" variant="outline" className={cn("gap-1 text-xs", isDark ? "border-white/[0.1]" : "")}
                                onClick={() => openActionModal(sub, "change_plan")}>
                                <Shield className="h-3 w-3" /> Change Plan
                              </Button>
                              <Button size="sm" variant="outline" className={cn("gap-1 text-xs", isDark ? "border-white/[0.1]" : "")}
                                onClick={() => openActionModal(sub, "extend")}>
                                <Plus className="h-3 w-3" /> Extend Period
                              </Button>
                              <Button size="sm" variant="outline" className={cn("gap-1 text-xs", isDark ? "border-white/[0.1]" : "")}
                                onClick={() => { if (confirm("Reset this subscription to Starter trial?")) executeAction(sub.id, "reset"); }}>
                                <RefreshCw className="h-3 w-3" /> Reset to Starter
                              </Button>
                              {sub.organization.isBanned ? (
                                <Button size="sm" className="gap-1 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                                  onClick={() => executeAction(sub.id, "unban")}>
                                  <Unlock className="h-3 w-3" /> Unban
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="gap-1 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                                  onClick={() => openActionModal(sub, "ban")}>
                                  <Ban className="h-3 w-3" /> Ban Org
                                </Button>
                              )}
                              {sub.organization.paymentRejectionCount > 0 && (
                                <Button size="sm" variant="outline" className={cn("gap-1 text-xs", isDark ? "border-white/[0.1]" : "")}
                                  onClick={() => executeAction(sub.id, "reset_rejections")}>
                                  <RefreshCw className="h-3 w-3" /> Reset Rejections ({sub.organization.paymentRejectionCount})
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Action Modal */}
      <AnimatePresence>
        {showActionModal && actionModalSub && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowActionModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className={cn("w-full max-w-md rounded-xl border p-6", isDark ? "bg-[#0a0a0f] border-white/[0.1]" : "bg-white border-slate-200")}
              onClick={(e) => e.stopPropagation()}>
              <h3 className={cn("text-lg font-bold mb-4", textPrimary)}>
                {actionType === "change_plan" && "Change Plan"}
                {actionType === "extend" && "Extend Subscription"}
                {actionType === "ban" && "Ban Organization"}
              </h3>
              <p className={cn("text-sm mb-4", textSecondary)}>
                For: <span className="font-semibold text-white">{actionModalSub.organization.name}</span>
                (currently: <span className="capitalize">{actionModalSub.plan.name}</span>)
              </p>

              {actionType === "change_plan" && (
                <div className="space-y-3">
                  <div>
                    <Label className={cn("text-sm mb-1 block", textSecondary)}>New Plan</Label>
                    <Select value={actionForm.planName} onValueChange={(v) => setActionForm((p) => ({ ...p, planName: v }))}>
                      <SelectTrigger className={isDark ? "border-white/[0.1]" : ""}><SelectValue placeholder="Select plan" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starter">Starter (Free)</SelectItem>
                        <SelectItem value="growth">Growth (Rs. 4,999/month)</SelectItem>
                        <SelectItem value="enterprise">Enterprise (Rs. 14,999/month)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className={cn("text-sm mb-1 block", textSecondary)}>Billing Cycle</Label>
                    <Select value={actionForm.billingCycle} onValueChange={(v) => setActionForm((p) => ({ ...p, billingCycle: v }))}>
                      <SelectTrigger className={isDark ? "border-white/[0.1]" : ""}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {actionType === "extend" && (
                <div>
                  <Label className={cn("text-sm mb-1 block", textSecondary)}>Days to Extend</Label>
                  <Input type="number" min="1" max="365" placeholder="e.g. 30" value={actionForm.extendDays}
                    onChange={(e) => setActionForm((p) => ({ ...p, extendDays: e.target.value }))}
                    className={isDark ? "border-white/[0.1] bg-white/[0.03]" : ""} />
                </div>
              )}

              {actionType === "ban" && (
                <div>
                  <Label className={cn("text-sm mb-1 block", textSecondary)}>Ban Reason (required)</Label>
                  <Textarea placeholder="Enter reason for banning this organization..."
                    value={actionForm.banReason} onChange={(e) => setActionForm((p) => ({ ...p, banReason: e.target.value }))}
                    className={cn("min-h-[80px]", isDark ? "border-white/[0.1] bg-white/[0.03]" : "")} />
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => {
                    if (actionType === "change_plan" && !actionForm.planName) { toast.error("Select a plan"); return; }
                    if (actionType === "extend" && (!actionForm.extendDays || parseInt(actionForm.extendDays) <= 0)) { toast.error("Enter valid days"); return; }
                    if (actionType === "ban" && !actionForm.banReason) { toast.error("Enter ban reason"); return; }
                    executeAction(actionModalSub.id, actionType, actionForm);
                  }}
                  disabled={actionLoading[actionModalSub.id]}
                  className={actionType === "ban" ? "bg-red-600 hover:bg-red-700 text-white gap-2" : "bg-amber-600 hover:bg-amber-700 text-white gap-2"}>
                  {actionLoading[actionModalSub.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {actionType === "change_plan" && "Change Plan"}
                  {actionType === "extend" && "Extend"}
                  {actionType === "ban" && "Ban Organization"}
                </Button>
                <Button variant="outline" onClick={() => setShowActionModal(false)} className={cn(isDark ? "border-white/[0.1]" : "")}>Cancel</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

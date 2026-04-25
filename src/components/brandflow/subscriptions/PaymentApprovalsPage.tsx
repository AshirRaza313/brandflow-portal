"use client";

import { useState, useEffect, useCallback } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Eye,
  CreditCard,
  Building2,
  Filter,
  RefreshCw,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Ban,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──

interface PaymentItem {
  id: string;
  planName: string;
  amount: number;
  transactionId: string;
  paymentMethod: string;
  screenshotUrl?: string;
  status: string;
  billingCycle: string;
  adminNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    email?: string;
    phone?: string;
    logo?: string;
    plan?: string;
    isBanned?: boolean;
    paymentRejectionCount?: number;
  } | null;
  subscriptionPlan: {
    name: string;
    price: number;
    annualPrice: number;
    period: string;
  } | null;
}

interface PaymentStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

// ── Animation ──
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

// ── Main Component ──

export function PaymentApprovalsPage() {
  const { user, appTheme } = useValtrioxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  // ── State ──
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [stats, setStats] = useState<PaymentStats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState<Record<string, boolean>>({});
  const [screenshotModal, setScreenshotModal] = useState<string | null>(null);

  // ── Fetch Payments ──
  const fetchPayments = useCallback(async () => {
    try {
      const params = new URLSearchParams({ userId: user?.id || "" });
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/payments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch payments:", err);
      toast.error("Failed to load payment proofs");
    } finally {
      setLoading(false);
    }
  }, [user?.id, statusFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // ── Review Payment ──
  const handleReview = async (paymentId: string, status: "approved" | "rejected") => {
    const note = reviewNotes[paymentId] || "";
    setReviewing((prev) => ({ ...prev, [paymentId]: true }));

    try {
      const res = await fetch(`/api/admin/payments/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminNote: note,
          adminUserId: user?.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        await fetchPayments();
      } else {
        toast.error(data.error || "Failed to review payment");
      }
    } catch (err) {
      toast.error("Failed to review payment");
    }
    setReviewing((prev) => ({ ...prev, [paymentId]: false }));
  };

  // ── Status Badge ──
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "approved":
        return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/30 gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  const cardBg = isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl font-bold", textPrimary)}>Payment Approvals</h1>
          <p className={cn("text-sm mt-1", textSecondary)}>
            Review and manage payment proof submissions
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchPayments}
          className={cn("gap-2", isDark ? "border-white/[0.1] text-slate-300" : "")}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className={cn(cardBg)}>
          <CardContent className="p-4 text-center">
            <p className={cn("text-3xl font-bold", textPrimary)}>{stats.total}</p>
            <p className={cn("text-xs mt-1", textSecondary)}>Total</p>
          </CardContent>
        </Card>
        <Card className={cn(cardBg)}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
            <p className={cn("text-xs mt-1", textSecondary)}>Pending</p>
          </CardContent>
        </Card>
        <Card className={cn(cardBg)}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-400">{stats.approved}</p>
            <p className={cn("text-xs mt-1", textSecondary)}>Approved</p>
          </CardContent>
        </Card>
        <Card className={cn(cardBg)}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-400">{stats.rejected}</p>
            <p className={cn("text-xs mt-1", textSecondary)}>Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className={cn("h-4 w-4", textSecondary)} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className={cn("w-40", isDark ? "border-white/[0.1] bg-white/[0.03]" : "")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments List */}
      {payments.length === 0 ? (
        <Card className={cn(cardBg)}>
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-amber-400/50 mb-3" />
            <h3 className={cn("font-semibold", textPrimary)}>No Payments Found</h3>
            <p className={cn("text-sm mt-1", textSecondary)}>
              {statusFilter === "pending"
                ? "All payment proofs have been reviewed. Great work!"
                : "No payment proofs match the selected filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <motion.div
              key={payment.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Card className={cn("overflow-hidden", cardBg)}>
                <CardContent className="p-0">
                  {/* Header Row */}
                  <div
                    className="p-4 cursor-pointer flex items-center justify-between gap-4"
                    onClick={() => setExpandedId(expandedId === payment.id ? null : payment.id)}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Org Avatar */}
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm",
                        isDark ? "bg-white/[0.06] text-white" : "bg-slate-100 text-slate-700"
                      )}>
                        {payment.organization?.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("font-semibold text-sm truncate", textPrimary)}>
                            {payment.organization?.name || "Unknown Organization"}
                          </span>
                          {getStatusBadge(payment.status)}
                        </div>
                        <div className={cn("flex items-center gap-3 text-xs mt-0.5 flex-wrap", textSecondary)}>
                          <span className="flex items-center gap-1">
                            <span className="text-[10px]">🇵🇰</span> {payment.amount.toLocaleString()}
                          </span>
                          <span className="capitalize">{payment.planName}</span>
                          <Badge className={cn("text-[10px] px-1.5 py-0", payment.billingCycle === "annually" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300")}>
                            {payment.billingCycle === "annually" ? "Annual" : "Monthly"}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            {payment.paymentMethod.replace(/_/g, " ")}
                          </span>
                          <span>Ref: {payment.transactionId}</span>
                          {payment.organization?.paymentRejectionCount ? (
                            <span className="text-red-400 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> {payment.organization.paymentRejectionCount} prior rejection{payment.organization.paymentRejectionCount > 1 ? "s" : ""}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-xs hidden sm:block", textSecondary)}>
                        {new Date(payment.createdAt).toLocaleDateString("en-PK", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      {expandedId === payment.id ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedId === payment.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Separator className={isDark ? "bg-white/[0.06]" : "bg-slate-200"} />
                        <div className="p-4 space-y-4">
                          {/* Payment Details Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <p className={cn("text-xs font-medium mb-1", textSecondary)}>Organization</p>
                              <p className={cn("text-sm", textPrimary)}>{payment.organization?.name}</p>
                              {payment.organization?.email && (
                                <p className={cn("text-xs mt-0.5", textSecondary)}>{payment.organization.email}</p>
                              )}
                              {payment.organization?.phone && (
                                <p className={cn("text-xs", textSecondary)}>{payment.organization.phone}</p>
                              )}
                            </div>
                            <div>
                              <p className={cn("text-xs font-medium mb-1", textSecondary)}>Transaction Details</p>
                              <p className={cn("text-sm", textPrimary)}>
                                ID: <span className="font-mono">{payment.transactionId}</span>
                              </p>
                              <p className={cn("text-xs mt-0.5", textSecondary)}>
                                Method: <span className="capitalize">{payment.paymentMethod.replace(/_/g, " ")}</span>
                              </p>
                              <p className={cn("text-xs", textSecondary)}>
                                Submitted: {new Date(payment.createdAt).toLocaleString("en-PK")}
                              </p>
                            </div>
                          </div>

                          {/* Screenshot */}
                          {payment.screenshotUrl && (
                            <div>
                              <p className={cn("text-xs font-medium mb-2", textSecondary)}>Payment Screenshot</p>
                              <div
                                className={cn(
                                  "inline-block rounded-lg border cursor-pointer overflow-hidden",
                                  isDark ? "border-white/[0.06]" : "border-slate-200"
                                )}
                                onClick={() => setScreenshotModal(payment.screenshotUrl!)}
                              >
                                <img
                                  src={payment.screenshotUrl}
                                  alt="Payment screenshot"
                                  className="max-h-48 object-contain"
                                />
                              </div>
                            </div>
                          )}

                          {/* Review Actions (only for pending) */}
                          {payment.status === "pending" && (
                            <>
                              <Separator className={isDark ? "bg-white/[0.06]" : "bg-slate-200"} />
                              <div>
                                <p className={cn("text-xs font-medium mb-2", textSecondary)}>
                                  Admin Note (optional — required for rejection)
                                </p>
                                <Textarea
                                  placeholder={payment.status === "rejected" ? "Reason for rejection..." : "Add a note..."}
                                  value={reviewNotes[payment.id] || ""}
                                  onChange={(e) =>
                                    setReviewNotes((prev) => ({ ...prev, [payment.id]: e.target.value }))
                                  }
                                  className={cn("min-h-[60px] text-sm", isDark ? "border-white/[0.1] bg-white/[0.03]" : "")}
                                />
                                <div className="flex flex-wrap gap-3 mt-3">
                                  <Button
                                    size="sm"
                                    onClick={() => handleReview(payment.id, "approved")}
                                    disabled={reviewing[payment.id]}
                                    className="gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                                  >
                                    {reviewing[payment.id] ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    )}
                                    {reviewing[payment.id] ? "Processing..." : "Approve"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleReview(payment.id, "rejected")}
                                    disabled={reviewing[payment.id]}
                                    className="gap-1"
                                  >
                                    {reviewing[payment.id] ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <XCircle className="h-3.5 w-3.5" />
                                    )}
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}

                          {/* Review Info (for reviewed) */}
                          {payment.status !== "pending" && payment.reviewedAt && (
                            <div className={cn(
                              "p-3 rounded-lg text-xs",
                              payment.status === "approved"
                                ? isDark ? "bg-amber-500/5 text-amber-300" : "bg-amber-50 text-amber-700"
                                : isDark ? "bg-red-500/5 text-red-300" : "bg-red-50 text-red-700"
                            )}>
                              <p className="font-medium">
                                {payment.status === "approved" ? "Approved" : "Rejected"} on{" "}
                                {new Date(payment.reviewedAt).toLocaleString("en-PK")}
                              </p>
                              {payment.adminNote && (
                                <p className="mt-1">Note: {payment.adminNote}</p>
                              )}
                            </div>
                          )}
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

      {/* Screenshot Modal */}
      <AnimatePresence>
        {screenshotModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setScreenshotModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-4xl max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={screenshotModal}
                alt="Payment proof"
                className="max-w-full rounded-lg"
              />
              <div className="flex justify-center mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScreenshotModal(null)}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

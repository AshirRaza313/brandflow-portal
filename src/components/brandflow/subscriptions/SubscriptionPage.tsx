"use client";

import { useState, useEffect, useCallback } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
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
  CreditCard,
  Check,
  X,
  Clock,
  Upload,
  ArrowRight,
  Shield,
  Zap,
  Crown,
  Users,
  Package,
  ShoppingCart,
  Loader2,
  Eye,
  Copy,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Building2,
  Phone,
  Mail,
  Globe,
  FileText,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { SubscriptionInvoiceView } from "./SubscriptionInvoiceView";
import { isPlatformRole, canEditBillingPlans, canSetPaymentMethods } from "@/lib/roles";
import { getCurrencyForCountry } from "@/lib/currency";

// ── Types ──

interface Plan {
  id: string;
  name: string;
  price: number;
  annualPrice: number;
  annualSavings: number;
  period: string;
  features: string[];
  teamLimit: number;
  orderLimit: number;
  productLimit: number;
  trialDays: number;
}

interface PaymentRecord {
  id: string;
  planName: string;
  amount: number;
  transactionId: string;
  paymentMethod: string;
  billingCycle: string;
  status: string;
  adminNote?: string;
  createdAt: string;
  reviewedAt?: string;
}

interface SubscriptionData {
  id: string;
  status: string;
  billingCycle: string;
  trialStartsAt: string;
  trialEndsAt: string;
  trialDaysRemaining: number;
  isTrialActive: boolean;
  currentPeriodEnd?: string;
  plan: Plan;
  payments: PaymentRecord[];
}

interface PlatformSettings {
  companyName: string;
  companyEmail: string;
  companyPhone?: string;
  supportHours?: string;
  whatsappNumber?: string;
  paymentMethods: Array<{
    name: string;
    accountNumber: string;
    bankName: string;
    title: string;
  }>;
  currency: string;
  companyAddress?: string;
}

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  planName: string;
  amount: number;
  billingCycle: string;
  status: string;
  currencySymbol: string;
  issuedAt: string;
  paidAt?: string;
  createdAt: string;
}

const PLAN_ICONS: Record<string, any> = {
  starter: Zap,
  growth: Shield,
  enterprise: Crown,
};

const PLAN_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  starter: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-300",
  },
  growth: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-300",
  },
  enterprise: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-300",
  },
};

// ── Animation ──
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

// ── Main Component ──

export function SubscriptionPage() {
  const { user, organization, appTheme } = useValtrioxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";
  const isPlatform = isPlatformRole(user?.role || "");

  // ── State ──
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [showUpgradeForm, setShowUpgradeForm] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [billingToggle, setBillingToggle] = useState<"monthly" | "annually">("monthly");

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    planId: "",
    amount: "",
    transactionId: "",
    paymentMethod: "bank_transfer",
    screenshotUrl: "",
    billingCycle: "monthly",
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceRecord | null>(null);

  // ── Fetch Data ──
  const fetchSubscription = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const res = await fetch(`/api/subscriptions/current?orgId=${organization.id}`);
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
        setPlatformSettings(data.platformSettings);
      }
    } catch (err) {
      console.error("Failed to fetch subscription:", err);
    }
  }, [organization]);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/subscriptions/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans);
      }
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSubscription(), fetchPlans()]);
      setLoading(false);
    };
    init();
  }, [fetchSubscription, fetchPlans]);

  // ── Fetch Invoices ──
  const fetchInvoices = useCallback(async () => {
    if (!organization?.id) return;
    setLoadingInvoices(true);
    try {
      const res = await fetch(`/api/invoices?orgId=${organization.id}`);
      if (res.ok) {
        const json = await res.json();
        setInvoices(json.invoices || []);
      }
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    }
    setLoadingInvoices(false);
  }, [organization]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // ── Screenshot Upload Handler ──
  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Screenshot must be less than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setScreenshotPreview(base64);
      setPaymentForm((prev) => ({ ...prev, screenshotUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // ── Submit Payment ──
  const handleSubmitPayment = async () => {
    if (!paymentForm.planId || !paymentForm.amount || !paymentForm.transactionId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetchWithAuth("/api/subscriptions/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: organization?.id,
          userId: user?.id,
          ...paymentForm,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setPaymentForm({ planId: "", amount: "", transactionId: "", paymentMethod: "bank_transfer", screenshotUrl: "", billingCycle: "monthly" });
        setScreenshotPreview(null);
        setShowUpgradeForm(false);
        await fetchSubscription();
      } else {
        toast.error(data.error || "Failed to submit payment");
      }
    } catch (err) {
      toast.error("Failed to submit payment proof");
    }
    setSubmittingPayment(false);
  };

  // ── Copy to clipboard ──
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // ── View Invoice ──
  const handleViewInvoice = (invoice: InvoiceRecord) => {
    setViewingInvoice(invoice);
  };

  // ── Status helpers ──
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "trial":
        return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Trial</Badge>;
      case "active":
        return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Active</Badge>;
      case "pending_payment":
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">Pending Payment</Badge>;
      case "expired":
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Expired</Badge>;
      case "cancelled":
        return <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/30">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-300">Pending</Badge>;
      case "approved":
        return <Badge className="bg-amber-500/20 text-amber-300">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-300">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-300">Pending</Badge>;
      case "paid":
      case "approved":
        return <Badge className="bg-amber-500/20 text-amber-300">Paid</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-300">Cancelled</Badge>;
      case "refunded":
        return <Badge className="bg-amber-500/20 text-amber-300">Refunded</Badge>;
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

  const currentPlan = subscription?.plan;
  const upgradePlans = plans.filter((p) => p.price > 0 && p.name !== currentPlan?.name);
  const cardBg = isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl font-bold", textPrimary)}>Billing & Plans</h1>
          <p className={cn("text-sm mt-1", textSecondary)}>Manage your subscription, payments, and billing</p>
        </div>
        {subscription?.status === "trial" && (
          <Button
            onClick={() => setShowAllPlans(true)}
            className={cn(
              "gap-2",
              isGold
                ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
                : "bg-amber-600 hover:bg-amber-700 text-white"
            )}
          >
            <ArrowRight className="h-4 w-4" /> Upgrade Plan
          </Button>
        )}
        {subscription?.status === "active" && (
          <Button
            onClick={() => setShowAllPlans(true)}
            variant="outline"
            className={cn("gap-2 border-white/[0.1]", isDark ? "text-slate-300 hover:bg-white/[0.05]" : "")}
          >
            Change Plan
          </Button>
        )}
        {subscription?.status === "pending_payment" && (
          <Button
            disabled
            variant="outline"
            className={cn("gap-2 border-yellow-500/20 text-yellow-400 cursor-not-allowed opacity-60")}
          >
            <Clock className="h-4 w-4" /> Payment Under Review
          </Button>
        )}
      </div>

      {/* Current Plan Overview */}
      {currentPlan && (
        <motion.div initial="initial" animate="animate" variants={pageVariants} transition={{ duration: 0.2 }}>
          <Card className={cn("overflow-hidden", cardBg)}>
            <div className={cn(
              "p-6 border-b",
              isDark ? "border-white/[0.06]" : "border-slate-200"
            )}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-xl",
                    PLAN_COLORS[currentPlan.name]?.bg || "bg-slate-500/10"
                  )}>
                    {(() => {
                      const Icon = PLAN_ICONS[currentPlan.name] || CreditCard;
                      return <Icon className={cn("h-6 w-6", PLAN_COLORS[currentPlan.name]?.text || "text-slate-400")} />;
                    })()}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className={cn("text-xl font-bold capitalize", textPrimary)}>{currentPlan.name}</h2>
                      {getStatusBadge(subscription!.status)}
                    </div>
                    <div className={cn("flex items-center gap-1.5 mt-1 text-sm", textSecondary)}>
                      <span className="text-[10px]">🇵🇰</span>
                      {currentPlan.price === 0 ? "Free forever" : (() => { const c = getCurrencyForCountry(organization?.country || "PK"); const cycle = subscription?.billingCycle || "monthly"; const price = cycle === "annually" && currentPlan.annualPrice > 0 ? currentPlan.annualPrice : currentPlan.price; return `${c.flag} ${c.symbol} ${price.toLocaleString()}/${cycle === "annually" ? "year" : "month"}`; })()}
                      {subscription?.billingCycle === "annually" && (
                        <Badge className="text-[9px] px-1 py-0 bg-amber-500/20 text-amber-300">Annual</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Trial Countdown */}
                {subscription!.isTrialActive && (
                  <div className={cn(
                    "px-4 py-2 rounded-xl border",
                    isDark ? "bg-amber-500/5 border-amber-500/20" : "bg-amber-50 border-amber-200"
                  )}>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-amber-400" />
                      <span className={isDark ? "text-amber-300" : "text-amber-700"}>
                        <span className="font-bold">{subscription!.trialDaysRemaining}</span> days left in trial
                      </span>
                    </div>
                  </div>
                )}

                {/* Active Period */}
                {subscription!.status === "active" && subscription!.currentPeriodEnd && (
                  <div className={cn(
                    "px-4 py-2 rounded-xl border",
                    isDark ? "bg-amber-500/5 border-amber-500/20" : "bg-amber-50 border-amber-200"
                  )}>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-amber-400" />
                      <span className={isDark ? "text-amber-300" : "text-amber-700"}>
                        Renews {new Date(subscription!.currentPeriodEnd).toLocaleDateString("en-PK", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Plan Features */}
            <div className="p-6">
              <h3 className={cn("text-sm font-semibold mb-4", textSecondary)}>Plan Limits & Features</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className={cn("p-3 rounded-lg", isDark ? "bg-white/[0.03]" : "bg-slate-50")}>
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-amber-400" />
                    <span className={cn("text-xs", textSecondary)}>Team Members</span>
                  </div>
                  <p className={cn("text-lg font-bold", textPrimary)}>
                    {currentPlan.teamLimit === -1 ? "Unlimited" : currentPlan.teamLimit}
                  </p>
                </div>
                <div className={cn("p-3 rounded-lg", isDark ? "bg-white/[0.03]" : "bg-slate-50")}>
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingCart className="h-4 w-4 text-amber-400" />
                    <span className={cn("text-xs", textSecondary)}>Orders (Total)</span>
                  </div>
                  <p className={cn("text-lg font-bold", textPrimary)}>
                    {currentPlan.orderLimit === -1 ? "Unlimited" : currentPlan.orderLimit.toLocaleString()}
                  </p>
                </div>
                <div className={cn("p-3 rounded-lg", isDark ? "bg-white/[0.03]" : "bg-slate-50")}>
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-amber-400" />
                    <span className={cn("text-xs", textSecondary)}>Products</span>
                  </div>
                  <p className={cn("text-lg font-bold", textPrimary)}>
                    {currentPlan.productLimit === -1 ? "Unlimited" : currentPlan.productLimit.toLocaleString()}
                  </p>
                </div>
                <div className={cn("p-3 rounded-lg", isDark ? "bg-white/[0.03]" : "bg-slate-50")}>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4 text-amber-400" />
                    <span className={cn("text-xs", textSecondary)}>Features</span>
                  </div>
                  <p className={cn("text-lg font-bold", textPrimary)}>{currentPlan.features.length}</p>
                </div>
              </div>

              {/* Features list */}
              <div className="mt-6">
                <h3 className={cn("text-sm font-semibold mb-3", textSecondary)}>What&apos;s Included</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentPlan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-amber-400 shrink-0" />
                      <span className={cn("text-sm", textSecondary)}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Payment Instructions & Upgrade */}
      <AnimatePresence mode="wait">
        {showAllPlans && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Available Plans */}
            <Card className={cn("mb-6", cardBg)}>
              <CardHeader>
                <CardTitle className={cn("text-base", textPrimary)}>Available Plans</CardTitle>
                <CardDescription className={textSecondary}>
                  Choose a plan that best fits your business needs
                </CardDescription>
                {/* Monthly / Annual Toggle */}
                <div className="flex items-center justify-center mt-3">
                  <div className={cn(
                    "flex items-center rounded-full p-1 gap-1",
                    isDark ? "bg-white/[0.05]" : "bg-slate-100"
                  )}>
                    <button
                      onClick={() => setBillingToggle("monthly")}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                        billingToggle === "monthly"
                          ? isGold
                            ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black"
                            : "bg-amber-600 text-white"
                          : textSecondary
                      )}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingToggle("annually")}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                        billingToggle === "annually"
                          ? isGold
                            ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black"
                            : "bg-amber-600 text-white"
                          : textSecondary
                      )}
                    >
                      Annually
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-white/20">
                        Save ~17%
                      </span>
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plans.map((plan) => {
                    const isCurrent = plan.name === currentPlan?.name;
                    const colors = PLAN_COLORS[plan.name] || PLAN_COLORS.starter;
                    const Icon = PLAN_ICONS[plan.name] || CreditCard;

                    return (
                      <div
                        key={plan.id}
                        className={cn(
                          "relative rounded-xl border-2 p-5 transition-all",
                          isCurrent
                            ? `${colors.border} ${colors.bg}`
                            : isDark
                              ? "border-white/[0.06] hover:border-white/[0.12]"
                              : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {isCurrent && (
                          <div className={cn("absolute -top-3 left-4 px-2 py-0.5 rounded-full text-xs font-bold", colors.badge)}>
                            Current Plan
                          </div>
                        )}
                        <div className="flex items-center gap-3 mb-4">
                          <div className={cn("p-2 rounded-lg", colors.bg)}>
                            <Icon className={cn("h-5 w-5", colors.text)} />
                          </div>
                          <div>
                            <h3 className={cn("font-bold capitalize", textPrimary)}>{plan.name}</h3>
                            <div className="flex items-center gap-1">
                              {plan.price === 0 ? (
                                <span className={cn("text-sm font-medium", textSecondary)}>Free</span>
                              ) : billingToggle === "annually" && plan.annualPrice > 0 ? (
                                <>
                                  <span className="text-[10px]">🇵🇰</span>
                                  <span className="text-sm font-bold text-amber-400">{plan.annualPrice.toLocaleString()}</span>
                                  <span className={cn("text-xs", textSecondary)}>/year</span>
                                  <span className="text-[10px] line-through text-slate-500 ml-1">{(plan.price * 12).toLocaleString()}</span>
                                  {plan.annualSavings > 0 && (
                                    <Badge className="text-[9px] px-1 py-0 bg-amber-500/20 text-amber-300 ml-1">
                                      Save {plan.annualSavings}%
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span className="text-[10px]">🇵🇰</span>
                                  <span className="text-sm font-bold text-amber-400">{plan.price.toLocaleString()}</span>
                                  <span className={cn("text-xs", textSecondary)}>/month</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          {plan.features.slice(0, 5).map((f, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <Check className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <span className={cn("text-xs", textSecondary)}>{f}</span>
                            </div>
                          ))}
                          {plan.features.length > 5 && (
                            <span className={cn("text-xs", textSecondary)}>+{plan.features.length - 5} more features</span>
                          )}
                        </div>

                        {!isCurrent && plan.price > 0 && (
                          <Button
                            size="sm"
                            className={cn(
                              "w-full gap-1",
                              subscription?.status === "pending_payment"
                                ? "bg-slate-600 text-slate-300 cursor-not-allowed opacity-50"
                                : isGold
                                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
                                  : "bg-amber-600 hover:bg-amber-700 text-white"
                            )}
                            disabled={subscription?.status === "pending_payment"}
                            onClick={() => {
                              if (subscription?.status === "pending_payment") {
                                toast.error("Payment already under review. Please wait for admin approval.");
                                return;
                              }
                              setPaymentForm((prev) => ({
                                ...prev,
                                planId: plan.id,
                                amount: (billingToggle === "annually" && plan.annualPrice > 0 ? plan.annualPrice : plan.price).toString(),
                                billingCycle: billingToggle,
                              }));
                              setShowUpgradeForm(true);
                              setShowAllPlans(false);
                            }}
                          >
                            Select Plan <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end mb-4">
              <Button variant="ghost" onClick={() => setShowAllPlans(false)} className="gap-2">
                <X className="h-4 w-4" /> Close Plans
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Proof Submission Form */}
      <AnimatePresence mode="wait">
        {showUpgradeForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className={cn("mb-6", cardBg)}>
              <CardHeader>
                <CardTitle className={cn("flex items-center gap-2 text-base", textPrimary)}>
                  <CreditCard className="h-5 w-5 text-amber-400" />
                  Submit Payment Proof
                </CardTitle>
                <CardDescription className={textSecondary}>
                  Send payment to the account details below, then upload your proof here
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Details Toggle */}
                <div>
                  <Button
                    variant="outline"
                    onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                    className={cn("w-full justify-between gap-2", isDark ? "border-white/[0.1]" : "")}
                  >
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {showPaymentDetails ? "Hide" : "Show"} Payment Details
                    </span>
                    <Eye className="h-4 w-4" />
                  </Button>

                  <AnimatePresence>
                    {showPaymentDetails && platformSettings?.paymentMethods && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 space-y-3"
                      >
                        {platformSettings.paymentMethods.map((method, i) => (
                          <div
                            key={i}
                            className={cn(
                              "p-4 rounded-lg border",
                              isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-slate-50 border-slate-200"
                            )}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className={cn("font-semibold text-sm", textPrimary)}>{method.name}</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(method.accountNumber)}
                                className="h-7 w-7 p-0"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="space-y-1">
                              <p className={cn("text-sm font-mono", textPrimary)}>{method.accountNumber}</p>
                              <p className={cn("text-xs", textSecondary)}>
                                Bank: {method.bankName} | Title: {method.title}
                              </p>
                            </div>
                          </div>
                        ))}

                        {/* Contact info */}
                        {(platformSettings.companyPhone || platformSettings.whatsappNumber) && (
                          <div className={cn("p-3 rounded-lg border flex items-center gap-3", isDark ? "bg-amber-500/5 border-amber-500/20" : "bg-amber-50 border-amber-200")}>
                            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                            <span className={cn("text-xs", isDark ? "text-amber-300" : "text-amber-700")}>
                              After payment, share the screenshot via WhatsApp at {platformSettings.whatsappNumber || platformSettings.companyPhone} or upload below.
                            </span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Separator className={isDark ? "bg-white/[0.06]" : "bg-slate-200"} />

                {/* Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className={cn("text-sm mb-1.5 block", textSecondary)}>Plan</Label>
                    <Select
                      value={paymentForm.planId}
                      onValueChange={(v) => {
                        const plan = plans.find((p) => p.id === v);
                        setPaymentForm((prev) => ({
                          ...prev,
                          planId: v,
                          amount: plan?.price?.toString() || "",
                        }));
                      }}
                    >
                      <SelectTrigger className={isDark ? "border-white/[0.1] bg-white/[0.03]" : ""}>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {upgradePlans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="capitalize">{p.name}</span> — {getCurrencyForCountry(organization?.country || "PK").symbol} {p.price.toLocaleString()}/{p.period}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className={cn("text-sm mb-1.5 block", textSecondary)}>Amount ({getCurrencyForCountry(organization?.country || "PK").code})</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] leading-none">{getCurrencyForCountry(organization?.country || "PK").flag} {getCurrencyForCountry(organization?.country || "PK").symbol}</span>
                      <Input
                        type="number"
                        placeholder="4999"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                        className={cn("pl-14", isDark ? "border-white/[0.1] bg-white/[0.03] text-slate-300" : "")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className={cn("text-sm mb-1.5 block", textSecondary)}>Transaction ID / Reference</Label>
                    <Input
                      placeholder="e.g. TRX-123456789"
                      value={paymentForm.transactionId}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, transactionId: e.target.value }))}
                      className={isDark ? "border-white/[0.1] bg-white/[0.03]" : ""}
                    />
                  </div>

                  <div>
                    <Label className={cn("text-sm mb-1.5 block", textSecondary)}>Payment Method</Label>
                    <Select
                      value={paymentForm.paymentMethod}
                      onValueChange={(v) => setPaymentForm((prev) => ({ ...prev, paymentMethod: v }))}
                    >
                      <SelectTrigger className={isDark ? "border-white/[0.1] bg-white/[0.03]" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="jazzcash">JazzCash</SelectItem>
                        <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <Label className={cn("text-sm mb-1.5 block", textSecondary)}>
                      Payment Screenshot (optional)
                    </Label>
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                        isDark
                          ? "border-white/[0.1] hover:border-amber-500/40 bg-white/[0.02]"
                          : "border-slate-300 hover:border-amber-500/40 bg-slate-50"
                      )}
                      onClick={() => document.getElementById("screenshot-input")?.click()}
                    >
                      {screenshotPreview ? (
                        <div className="space-y-2">
                          <img
                            src={screenshotPreview}
                            alt="Screenshot preview"
                            className="max-h-48 mx-auto rounded-lg"
                          />
                          <p className={cn("text-xs", textSecondary)}>Click to change screenshot</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto text-slate-400" />
                          <p className={cn("text-sm", textSecondary)}>
                            Click to upload screenshot or drag and drop
                          </p>
                          <p className="text-xs text-slate-500">PNG, JPG up to 5MB</p>
                        </div>
                      )}
                      <input
                        id="screenshot-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleScreenshotUpload}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleSubmitPayment}
                    disabled={submittingPayment}
                    className={cn(
                      "gap-2",
                      isGold
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
                        : "bg-amber-600 hover:bg-amber-700 text-white"
                    )}
                  >
                    {submittingPayment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {submittingPayment ? "Submitting..." : "Submit Payment Proof"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowUpgradeForm(false);
                      setScreenshotPreview(null);
                    }}
                    className={cn(isDark ? "border-white/[0.1]" : "")}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment History */}
      {subscription?.payments && subscription.payments.length > 0 && (
        <Card className={cn(cardBg)}>
          <CardHeader>
            <CardTitle className={cn("text-base", textPrimary)}>Payment History</CardTitle>
            <CardDescription className={textSecondary}>
              Track your previous payment submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {subscription.payments.map((payment) => (
                <div
                  key={payment.id}
                  className={cn(
                    "p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                    isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-slate-50 border-slate-200"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-semibold capitalize text-sm", textPrimary)}>{payment.planName}</span>
                      {getPaymentStatusBadge(payment.status)}
                    </div>
                    <div className={cn("flex items-center gap-4 text-xs", textSecondary)}>
                      <span className="flex items-center gap-1">
                        <span className="text-[10px]">🇵🇰</span> {payment.amount.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        {payment.paymentMethod.replace("_", " ")}
                      </span>
                      {payment.billingCycle && (
                        <Badge className={cn("text-[10px] px-1 py-0",
                          payment.billingCycle === "annually" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"
                        )}>
                          {payment.billingCycle}
                        </Badge>
                      )}
                      <span>Ref: {payment.transactionId}</span>
                    </div>
                    <p className={cn("text-xs", textSecondary)}>
                      {new Date(payment.createdAt).toLocaleDateString("en-PK", {
                        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {payment.adminNote && (
                    <div className={cn(
                      "text-xs px-3 py-1.5 rounded-lg max-w-xs",
                      payment.status === "rejected"
                        ? isDark ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-600"
                        : isDark ? "bg-amber-500/10 text-amber-300" : "bg-amber-50 text-amber-600"
                    )}>
                      <span className="font-medium">{payment.status === "rejected" ? "Reason" : "Note"}:</span>{" "}
                      {payment.adminNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices Section */}
      {invoices.length > 0 && (
        <Card className={cn(cardBg)}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className={cn("flex items-center gap-2 text-base", textPrimary)}>
                  <FileText className="h-5 w-5" style={{ color: isGold ? "#C9A227" : "#D4AF37" }} />
                  Invoices
                </CardTitle>
                <CardDescription className={textSecondary}>
                  Download PDF invoices for your subscription payments
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className={cn(
                    "p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                    isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-slate-50 border-slate-200"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-mono text-xs font-bold", isGold ? "text-amber-400" : "text-amber-400")}>
                        {invoice.invoiceNumber}
                      </span>
                      {getInvoiceStatusBadge(invoice.status)}
                    </div>
                    <div className={cn("flex items-center gap-4 text-xs", textSecondary)}>
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        <span className="capitalize">{invoice.planName}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        {invoice.currencySymbol} {invoice.amount.toLocaleString()}
                      </span>
                      <span className="capitalize">{invoice.billingCycle}</span>
                      <span>
                        {new Date(invoice.issuedAt).toLocaleDateString("en-PK", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "gap-1.5 text-xs shrink-0",
                      isGold
                        ? "border-amber-500/20 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                        : "border-amber-500/20 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                    )}
                    onClick={() => handleViewInvoice(invoice)}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print Invoice
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Payment Alert */}
      {subscription?.status === "pending_payment" && (
        <Card className={cn("border-yellow-500/30 bg-yellow-500/5")}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-300 text-sm">Payment Under Review</h3>
                <p className="text-yellow-200/70 text-xs mt-1">
                  Your payment proof is being reviewed. This usually takes up to 24 hours during business days.
                  You will be notified once the payment is approved or if any additional information is needed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expired Trial Alert */}
      {subscription?.status === "expired" && (
        <Card className={cn("border-red-500/30 bg-red-500/5")}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-300 text-sm">Trial Expired</h3>
                <p className="text-red-200/70 text-xs mt-1">
                  Your free trial has expired. Upgrade to continue using all features.
                </p>
                <Button
                  size="sm"
                  onClick={() => setShowAllPlans(true)}
                  className="mt-3 bg-amber-600 hover:bg-amber-700 text-white gap-1"
                >
                  Upgrade Now <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <SubscriptionInvoiceView
        invoice={viewingInvoice}
        open={!!viewingInvoice}
        onClose={() => setViewingInvoice(null)}
      />
    </div>
  );
}

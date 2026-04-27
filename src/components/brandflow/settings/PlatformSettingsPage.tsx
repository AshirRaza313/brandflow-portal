"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  User,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  MessageCircle,
  Instagram,
  Facebook,
  Twitter,
  CreditCard,
  Palette,
  DollarSign,
  Save,
  Upload,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Shield,
  ImageIcon,
  Type,
  FileText,
  QrCode,
  Check,
  ArrowLeftRight,
  Hash,
  ShieldCheck,
  Users,
  Package,
  ShoppingCart,
  Timer,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { isPlatformRole } from "@/lib/roles";
import { getFeaturesByPlan } from "@/lib/feature-lock";

// ============================================================================
// Types
// ============================================================================

interface PlatformSettingsData {
  id?: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string;
  companyAddress: string;
  supportHours: string;
  whatsappNumber: string;
  instagramUrl: string;
  facebookUrl: string;
  twitterUrl: string;
  paymentMethods: PaymentMethod[];
  currency: string;
  logoUrl: string;
  faviconUrl: string;
  primaryBrandColor: string;
  secondaryBrandColor: string;
  currencySymbol: string;
  customCss: string;
  emailFooterText: string;
  invoiceHeaderText: string;
}

interface PaymentMethod {
  id: string;
  methodName: string;
  accountTitle: string;
  accountNumber: string;
  bankName: string;
  iban: string;
  qrCodeUrl: string;
  isActive: boolean;
}

// ============================================================================
// Sub-tabs Configuration
// ============================================================================

const subTabs = [
  { id: "personal", label: "Personal Details", icon: User },
  { id: "company", label: "Company Info", icon: Building2 },
  { id: "contact", label: "Contact & Support", icon: Phone },
  { id: "plans", label: "Plans & Pricing", icon: DollarSign },
  { id: "payment", label: "Payment Methods", icon: CreditCard },
  { id: "branding", label: "Branding", icon: Palette },
];

// ============================================================================
// Animation Variants
// ============================================================================

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const presetColors = [
  "#C9A227", "#C9A227", "#dc2626", "#7c3aed", "#ec4899",
  "#0891b2", "#475569", "#ea580c", "#0d9488", "#2563eb",
  "#db2777", "#65a30d",
];

// ============================================================================
// Access Denied Component
// ============================================================================

function AccessDenied() {
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme !== "light";

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className={cn("max-w-md w-full", isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200")}>
        <CardContent className="flex flex-col items-center text-center p-8">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-red-500" />
          </div>
          <h2 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>
            Access Denied
          </h2>
          <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
            Platform settings are restricted to platform owners and administrators only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PlatformSettingsPage() {
  const { user, appTheme, setActiveSection } = useValtrioxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Settings State ──────────────────────────────────────────────────────

  const [settings, setSettings] = useState<PlatformSettingsData>({
    companyName: "",
    companyEmail: "",
    companyPhone: "",
    companyWebsite: "",
    companyAddress: "",
    supportHours: "Mon-Fri: 9AM-6PM PKT",
    whatsappNumber: "",
    instagramUrl: "",
    facebookUrl: "",
    twitterUrl: "",
    paymentMethods: [],
    currency: "PKR",
    logoUrl: "",
    faviconUrl: "",
    primaryBrandColor: "#C9A227",
    secondaryBrandColor: "#C9A227",
    currencySymbol: "Rs.",
    customCss: "",
    emailFooterText: "",
    invoiceHeaderText: "",
  });

  // ── Personal Details State ──────────────────────────────────────────────

  const [personalDetails, setPersonalDetails] = useState({
    fullName: "",
    email: "",
    phone: "",
    bio: "",
    position: "",
    profilePicture: "",
  });

  // ── Plans & Pricing State ───────────────────────────────────────────────
  const [plans, setPlans] = useState<Array<any>>([]);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPlanForm, setEditPlanForm] = useState({
    price: "",
    annualPrice: "",
    orderLimit: "",
    teamLimit: "",
    productLimit: "",
    trialDays: "",
  });
  const [savingPlan, setSavingPlan] = useState(false);

  // ── Feature Toggles State ───────────────────────────────────────────────
  const [lockedGrowth, setLockedGrowth] = useState<string[]>([]);
  const [lockedEnterprise, setLockedEnterprise] = useState<string[]>([]);
  const [loadingToggles, setLoadingToggles] = useState(false);
  const [savingToggles, setSavingToggles] = useState(false);
  const growthFeatures = getFeaturesByPlan("growth");
  const enterpriseFeatures = getFeaturesByPlan("enterprise");

  // ── Payment Method Dialog ───────────────────────────────────────────────

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [paymentForm, setPaymentForm] = useState<Omit<PaymentMethod, "id">>({
    methodName: "",
    accountTitle: "",
    accountNumber: "",
    bankName: "",
    iban: "",
    qrCodeUrl: "",
    isActive: true,
  });

  // ── Logo/Favicon upload refs ────────────────────────────────────────────

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  // ── Access Check ────────────────────────────────────────────────────────

  const isPlatformAdmin = isPlatformRole(user?.role || "");

  // ── Theme Helpers ───────────────────────────────────────────────────────

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200";
  const inputBg = isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200";
  const accentClass = isGold
    ? "text-amber-400 bg-amber-500/10"
    : "text-amber-400 bg-amber-500/10";
  const accentBtn = isGold
    ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black hover:opacity-90"
    : "bg-amber-600 text-white hover:bg-amber-700";
  const accentBorder = isGold
    ? "border-amber-500"
    : "border-amber-500";
  const accentText = isGold ? "text-amber-400" : "text-amber-400";

  // ============================================================================
  // Fetch Settings
  // ============================================================================

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch settings");
      }
      const data = await res.json();
      const s = data.settings || {};
      setSettings({
        id: s.id,
        companyName: s.companyName || "",
        companyEmail: s.companyEmail || "",
        companyPhone: s.companyPhone || "",
        companyWebsite: s.companyWebsite || "",
        companyAddress: s.companyAddress || "",
        supportHours: s.supportHours || "Mon-Fri: 9AM-6PM PKT",
        whatsappNumber: s.whatsappNumber || "",
        instagramUrl: s.instagramUrl || "",
        facebookUrl: s.facebookUrl || "",
        twitterUrl: s.twitterUrl || "",
        paymentMethods: s.paymentMethods || [],
        currency: s.currency || "PKR",
        logoUrl: s.logoUrl || "",
        faviconUrl: s.faviconUrl || "",
        primaryBrandColor: s.primaryBrandColor || "#C9A227",
        secondaryBrandColor: s.secondaryBrandColor || "#C9A227",
        currencySymbol: s.currencySymbol || "Rs.",
        customCss: s.customCss || "",
        emailFooterText: s.emailFooterText || "",
        invoiceHeaderText: s.invoiceHeaderText || "",
      });
      // Set personal details from current user
      if (user) {
        setPersonalDetails({
          fullName: user.name || "",
          email: user.email || "",
          phone: s.companyPhone || "",
          bio: "",
          position: user.role === "platform_owner" ? "Platform Owner" : user.role === "platform_admin" ? "Platform Admin" : "Administrator",
          profilePicture: user.image || "",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ── Fetch Plans ─────────────────────────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/plans?userId=${user?.id}`);
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    }
  }, [user?.id]);

  // ── Start Editing Plan ─────────────────────────────────────────────────
  const startEditingPlan = (plan: any) => {
    setEditingPlanId(plan.id);
    setEditPlanForm({
      price: String(plan.price ?? ""),
      annualPrice: String(plan.annualPrice ?? ""),
      orderLimit: String(plan.orderLimit ?? ""),
      teamLimit: String(plan.teamLimit ?? ""),
      productLimit: String(plan.productLimit ?? ""),
      trialDays: String(plan.trialDays ?? ""),
    });
  };

  const cancelEditingPlan = () => {
    setEditingPlanId(null);
    setEditPlanForm({ price: "", annualPrice: "", orderLimit: "", teamLimit: "", productLimit: "", trialDays: "" });
  };

  // ── Save Plan Properties ────────────────────────────────────────────────
  const savePlan = async (planId: string) => {
    const { price, annualPrice, orderLimit, teamLimit, productLimit, trialDays } = editPlanForm;
    if (!price || isNaN(Number(price)) || Number(price) < 0) {
      toast.error("Please enter a valid monthly price");
      return;
    }
    if (annualPrice && (isNaN(Number(annualPrice)) || Number(annualPrice) < 0)) {
      toast.error("Please enter a valid annual price");
      return;
    }
    setSavingPlan(true);
    try {
      const body: any = { planId, price: Number(price), userId: user?.id };
      if (annualPrice !== "") body.annualPrice = Number(annualPrice);
      if (orderLimit !== "") body.orderLimit = Number(orderLimit);
      if (teamLimit !== "") body.teamLimit = Number(teamLimit);
      if (productLimit !== "") body.productLimit = Number(productLimit);
      if (trialDays !== "") body.trialDays = Number(trialDays);

      const res = await fetch("/api/admin/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success("Plan updated successfully!");
        cancelEditingPlan();
        await fetchPlans();
      } else {
        toast.error("Failed to update plan");
      }
    } catch {
      toast.error("Failed to update plan");
    }
    setSavingPlan(false);
  };

  // ── Feature Toggles ─────────────────────────────────────────────────────
  const fetchFeatureToggles = useCallback(async () => {
    setLoadingToggles(true);
    try {
      const res = await fetch("/api/admin/feature-toggles");
      if (res.ok) {
        const data = await res.json();
        setLockedGrowth(data.lockedGrowth || []);
        setLockedEnterprise(data.lockedEnterprise || []);
      }
    } catch (err) {
      console.error("Failed to fetch feature toggles:", err);
    }
    setLoadingToggles(false);
  }, []);

  const toggleGrowthFeature = (featureId: string) => {
    setLockedGrowth((prev) =>
      prev.includes(featureId) ? prev.filter((f) => f !== featureId) : [...prev, featureId]
    );
  };

  const toggleEnterpriseFeature = (featureId: string) => {
    setLockedEnterprise((prev) =>
      prev.includes(featureId) ? prev.filter((f) => f !== featureId) : [...prev, featureId]
    );
  };

  const saveFeatureToggles = async () => {
    setSavingToggles(true);
    try {
      const res = await fetch("/api/admin/feature-toggles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lockedGrowth, lockedEnterprise }),
      });
      if (res.ok) {
        toast.success("Feature toggles saved!");
      } else {
        toast.error("Failed to save feature toggles");
      }
    } catch {
      toast.error("Failed to save feature toggles");
    }
    setSavingToggles(false);
  };

  useEffect(() => {
    if (isPlatformAdmin) {
      fetchSettings();
      fetchPlans();
      fetchFeatureToggles();
    }
  }, [isPlatformAdmin, fetchSettings, fetchPlans, fetchFeatureToggles]);

  // ============================================================================
  // Save Settings
  // ============================================================================

  const saveSettings = useCallback(async (section?: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          ...settings,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save settings");
      }
      toast.success(section ? `${section} saved successfully!` : "Settings saved successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }, [settings, user?.id]);

  // ============================================================================
  // File Upload Helpers — Convert to base64 data URLs for DB persistence
  // ============================================================================

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }
    try {
      const dataUrl = await fileToBase64(file);
      setSettings((prev) => ({ ...prev, logoUrl: dataUrl }));
      toast.success("Logo uploaded! Save to apply.");
    } catch {
      toast.error("Failed to process image");
    }
  }, []);

  const handleFaviconUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) {
      toast.error("Favicon must be less than 1MB");
      return;
    }
    try {
      const dataUrl = await fileToBase64(file);
      setSettings((prev) => ({ ...prev, faviconUrl: dataUrl }));
      toast.success("Favicon uploaded! Save to apply.");
    } catch {
      toast.error("Failed to process image");
    }
  }, []);

  const handleProfilePicUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }
    try {
      const dataUrl = await fileToBase64(file);
      setPersonalDetails((prev) => ({ ...prev, profilePicture: dataUrl }));
      toast.success("Profile picture updated!");
    } catch {
      toast.error("Failed to process image");
    }
  }, []);

  // ============================================================================
  // Payment Method CRUD
  // ============================================================================

  const openPaymentDialog = (method?: PaymentMethod) => {
    if (method) {
      setEditingPayment(method);
      setPaymentForm({
        methodName: method.methodName,
        accountTitle: method.accountTitle,
        accountNumber: method.accountNumber,
        bankName: method.bankName,
        iban: method.iban,
        qrCodeUrl: method.qrCodeUrl,
        isActive: method.isActive,
      });
    } else {
      setEditingPayment(null);
      setPaymentForm({
        methodName: "",
        accountTitle: "",
        accountNumber: "",
        bankName: "",
        iban: "",
        qrCodeUrl: "",
        isActive: true,
      });
    }
    setPaymentDialogOpen(true);
  };

  const savePaymentMethod = () => {
    if (!paymentForm.methodName.trim()) {
      toast.error("Method name is required");
      return;
    }
    if (!paymentForm.accountNumber.trim()) {
      toast.error("Account number is required");
      return;
    }

    const newMethod: PaymentMethod = {
      id: editingPayment?.id || `pm_${Date.now()}`,
      ...paymentForm,
    };

    let updatedMethods: PaymentMethod[];
    if (editingPayment) {
      updatedMethods = settings.paymentMethods.map((m) =>
        m.id === editingPayment.id ? newMethod : m
      );
    } else {
      updatedMethods = [...settings.paymentMethods, newMethod];
    }

    setSettings((prev) => ({ ...prev, paymentMethods: updatedMethods }));
    setPaymentDialogOpen(false);
    toast.success(editingPayment ? "Payment method updated" : "Payment method added");
  };

  const deletePaymentMethod = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.filter((m) => m.id !== id),
    }));
    toast.success("Payment method deleted");
  };

  const togglePaymentMethodStatus = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.map((m) =>
        m.id === id ? { ...m, isActive: !m.isActive } : m
      ),
    }));
  };

  // ============================================================================
  // Access Check Render
  // ============================================================================

  if (!isPlatformAdmin) {
    return <AccessDenied />;
  }

  // ============================================================================
  // Loading State
  // ============================================================================

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-36 bg-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <Card className={cardBg}>
          <CardContent className="p-6 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-200 rounded animate-pulse" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl font-bold", textPrimary)}>Platform Settings</h1>
          <p className={cn("text-sm mt-1", textSecondary)}>
            Configure platform owner profile, company info, and branding
          </p>
        </div>
        <Button
          onClick={() => saveSettings()}
          disabled={saving}
          className={cn("gap-2", accentBtn)}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save All Changes
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4">
            <X className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
            <Button variant="ghost" size="sm" onClick={fetchSettings} className="ml-auto">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sub-tabs */}
      <div className={cn("flex gap-1 border-b overflow-x-auto", isDark ? "border-white/[0.06]" : "border-slate-200")}>
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? isGold
                  ? "border-amber-400 text-amber-400"
                  : isDark
                    ? "border-amber-400 text-amber-400"
                    : "border-amber-600 text-amber-600"
                : isDark
                  ? "border-transparent text-slate-500 hover:text-slate-300"
                  : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ================================================================ */}
        {/* TAB 1: PERSONAL DETAILS                                          */}
        {/* ================================================================ */}
        {activeTab === "personal" && (
          <motion.div
            key="personal"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-6 max-w-3xl"
          >
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className={cn("text-base flex items-center gap-2", textPrimary)}>
                  <User className="h-4 w-4" />
                  Owner Profile
                </CardTitle>
                <CardDescription className={textSecondary}>
                  Your personal information as the platform owner
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Profile Picture */}
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className={cn(
                      "h-20 w-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white overflow-hidden",
                      personalDetails.profilePicture
                        ? "bg-gradient-to-br from-amber-500 to-amber-700"
                        : isGold
                          ? "bg-gradient-to-br from-amber-500 to-amber-700"
                          : "bg-gradient-to-br from-amber-500 to-amber-700"
                    )}>
                      {personalDetails.profilePicture ? (
                        <img
                          src={personalDetails.profilePicture}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        personalDetails.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "AD"
                      )}
                    </div>
                    <button
                      onClick={() => profilePicInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white dark:bg-slate-800 border-2 border-white dark:border-slate-700 flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                    >
                      <Upload className="h-3 w-3 text-slate-600 dark:text-slate-300" />
                    </button>
                    <input
                      ref={profilePicInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePicUpload}
                    />
                  </div>
                  <div>
                    <p className={cn("text-sm font-semibold", textPrimary)}>
                      {personalDetails.fullName || "Platform Owner"}
                    </p>
                    <p className={cn("text-xs", textSecondary)}>
                      {personalDetails.position || "Administrator"}
                    </p>
                    <Badge variant="outline" className={cn("mt-1 text-[10px]", accentClass)}>
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Platform Admin
                    </Badge>
                  </div>
                </div>

                <Separator className={isDark ? "border-white/[0.06]" : "border-slate-200"} />

                {/* Full Name */}
                <div className="space-y-2">
                  <Label className={cn(isDark && "text-slate-300")}>
                    <User className="h-3.5 w-3.5 mr-1.5 inline" />
                    Full Name
                  </Label>
                  <Input
                    placeholder="Enter your full name"
                    value={personalDetails.fullName}
                    onChange={(e) => setPersonalDetails((p) => ({ ...p, fullName: e.target.value }))}
                    className={inputBg}
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label className={cn(isDark && "text-slate-300")}>
                    <Mail className="h-3.5 w-3.5 mr-1.5 inline" />
                    Email Address
                  </Label>
                  <Input
                    type="email"
                    placeholder="owner@valtriox.pk"
                    value={personalDetails.email}
                    onChange={(e) => setPersonalDetails((p) => ({ ...p, email: e.target.value }))}
                    className={inputBg}
                  />
                </div>

                {/* Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={cn(isDark && "text-slate-300")}>
                      <Phone className="h-3.5 w-3.5 mr-1.5 inline" />
                      Phone Number
                    </Label>
                    <Input
                      placeholder="+92 300 1234567"
                      value={personalDetails.phone}
                      onChange={(e) => setPersonalDetails((p) => ({ ...p, phone: e.target.value }))}
                      className={inputBg}
                    />
                  </div>

                  {/* Position/Title */}
                  <div className="space-y-2">
                    <Label className={cn(isDark && "text-slate-300")}>
                      <ShieldCheck className="h-3.5 w-3.5 mr-1.5 inline" />
                      Position / Title
                    </Label>
                    <Input
                      placeholder="Platform Owner"
                      value={personalDetails.position}
                      onChange={(e) => setPersonalDetails((p) => ({ ...p, position: e.target.value }))}
                      className={inputBg}
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label className={cn(isDark && "text-slate-300")}>
                    <FileText className="h-3.5 w-3.5 mr-1.5 inline" />
                    Bio / About
                  </Label>
                  <Textarea
                    placeholder="Tell clients about yourself and the platform..."
                    rows={4}
                    value={personalDetails.bio}
                    onChange={(e) => setPersonalDetails((p) => ({ ...p, bio: e.target.value }))}
                    className={cn(inputBg, "resize-none")}
                  />
                  <p className={cn("text-xs", textSecondary)}>
                    {personalDetails.bio.length}/500 characters
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ================================================================ */}
        {/* TAB 2: COMPANY INFORMATION                                       */}
        {/* ================================================================ */}
        {activeTab === "company" && (
          <motion.div
            key="company"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-6 max-w-3xl"
          >
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className={cn("text-base flex items-center gap-2", textPrimary)}>
                  <Building2 className="h-4 w-4" />
                  Company Information
                </CardTitle>
                <CardDescription className={textSecondary}>
                  Business details shown across the portal and in communications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Company Name */}
                <div className="space-y-2">
                  <Label className={cn(isDark && "text-slate-300")}>
                    <Building2 className="h-3.5 w-3.5 mr-1.5 inline" />
                    Company Name
                  </Label>
                  <Input
                    placeholder="Valtriox"
                    value={settings.companyName}
                    onChange={(e) => setSettings((p) => ({ ...p, companyName: e.target.value }))}
                    className={inputBg}
                  />
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={cn(isDark && "text-slate-300")}>
                      <Mail className="h-3.5 w-3.5 mr-1.5 inline" />
                      Company Email
                    </Label>
                    <Input
                      type="email"
                      placeholder="support@valtriox.pk"
                      value={settings.companyEmail}
                      onChange={(e) => setSettings((p) => ({ ...p, companyEmail: e.target.value }))}
                      className={inputBg}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={cn(isDark && "text-slate-300")}>
                      <Phone className="h-3.5 w-3.5 mr-1.5 inline" />
                      Company Phone
                    </Label>
                    <Input
                      placeholder="+92 300 1234567"
                      value={settings.companyPhone}
                      onChange={(e) => setSettings((p) => ({ ...p, companyPhone: e.target.value }))}
                      className={inputBg}
                    />
                  </div>
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <Label className={cn(isDark && "text-slate-300")}>
                    <Globe className="h-3.5 w-3.5 mr-1.5 inline" />
                    Company Website
                  </Label>
                  <Input
                    placeholder="https://valtriox.pk"
                    value={settings.companyWebsite}
                    onChange={(e) => setSettings((p) => ({ ...p, companyWebsite: e.target.value }))}
                    className={inputBg}
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label className={cn(isDark && "text-slate-300")}>
                    <MapPin className="h-3.5 w-3.5 mr-1.5 inline" />
                    Company Address
                  </Label>
                  <Textarea
                    placeholder="123 Business Street, Lahore, Pakistan"
                    rows={2}
                    value={settings.companyAddress}
                    onChange={(e) => setSettings((p) => ({ ...p, companyAddress: e.target.value }))}
                    className={cn(inputBg, "resize-none")}
                  />
                </div>

                <Separator className={isDark ? "border-white/[0.06]" : "border-slate-200"} />

                {/* Logo & Favicon Uploads */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Logo */}
                  <div className="space-y-3">
                    <Label className={cn(isDark && "text-slate-300")}>
                      <ImageIcon className="h-3.5 w-3.5 mr-1.5 inline" />
                      Company Logo
                    </Label>
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      className={cn(
                        "h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors",
                        isDark
                          ? "border-white/10 hover:border-white/20 bg-white/[0.02]"
                          : "border-slate-200 hover:border-slate-300 bg-slate-50"
                      )}
                    >
                      {settings.logoUrl ? (
                        <img
                          src={settings.logoUrl}
                          alt="Logo"
                          className="h-full w-full object-contain rounded-xl p-2"
                        />
                      ) : (
                        <>
                          <Upload className={cn("h-6 w-6 mb-1", textSecondary)} />
                          <p className={cn("text-xs", textSecondary)}>Click to upload logo</p>
                          <p className={cn("text-[10px]", textSecondary)}>SVG, PNG, JPG (max 2MB)</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </div>

                  {/* Favicon */}
                  <div className="space-y-3">
                    <Label className={cn(isDark && "text-slate-300")}>
                      <ImageIcon className="h-3.5 w-3.5 mr-1.5 inline" />
                      Favicon
                    </Label>
                    <div
                      onClick={() => faviconInputRef.current?.click()}
                      className={cn(
                        "h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors",
                        isDark
                          ? "border-white/10 hover:border-white/20 bg-white/[0.02]"
                          : "border-slate-200 hover:border-slate-300 bg-slate-50"
                      )}
                    >
                      {settings.faviconUrl ? (
                        <img
                          src={settings.faviconUrl}
                          alt="Favicon"
                          className="h-12 w-12 object-contain rounded"
                        />
                      ) : (
                        <>
                          <Upload className={cn("h-6 w-6 mb-1", textSecondary)} />
                          <p className={cn("text-xs", textSecondary)}>Click to upload favicon</p>
                          <p className={cn("text-[10px]", textSecondary)}>ICO, PNG (max 1MB)</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFaviconUpload}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ================================================================ */}
        {/* TAB 3: CONTACT & SUPPORT                                         */}
        {/* ================================================================ */}
        {activeTab === "contact" && (
          <motion.div
            key="contact"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-6 max-w-3xl"
          >
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className={cn("text-base flex items-center gap-2", textPrimary)}>
                  <Phone className="h-4 w-4" />
                  Contact & Support
                </CardTitle>
                <CardDescription className={textSecondary}>
                  Support channels and social media links for your customers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Support Hours */}
                <div className="space-y-2">
                  <Label className={cn(isDark && "text-slate-300")}>
                    <Clock className="h-3.5 w-3.5 mr-1.5 inline" />
                    Support Hours
                  </Label>
                  <Input
                    placeholder="Mon-Fri: 9AM-6PM PKT"
                    value={settings.supportHours}
                    onChange={(e) => setSettings((p) => ({ ...p, supportHours: e.target.value }))}
                    className={inputBg}
                  />
                  <p className={cn("text-xs", textSecondary)}>
                    Displayed on the landing page and client dashboard
                  </p>
                </div>

                {/* WhatsApp */}
                <div className="space-y-2">
                  <Label className={cn(isDark && "text-slate-300")}>
                    <MessageCircle className="h-3.5 w-3.5 mr-1.5 inline" />
                    WhatsApp Number
                  </Label>
                  <Input
                    placeholder="+92 300 1234567"
                    value={settings.whatsappNumber}
                    onChange={(e) => setSettings((p) => ({ ...p, whatsappNumber: e.target.value }))}
                    className={inputBg}
                  />
                  <p className={cn("text-xs", textSecondary)}>
                    Used for customer support and order notifications
                  </p>
                </div>

                <Separator className={isDark ? "border-white/[0.06]" : "border-slate-200"} />

                {/* Social Media Links */}
                <p className={cn("text-sm font-medium", textPrimary)}>Social Media Links</p>

                {/* Instagram */}
                <div className="space-y-2">
                  <Label className={cn(isDark && "text-slate-300")}>
                    <Instagram className="h-3.5 w-3.5 mr-1.5 inline text-pink-500" />
                    Instagram URL
                  </Label>
                  <Input
                    placeholder="https://instagram.com/valtriox"
                    value={settings.instagramUrl}
                    onChange={(e) => setSettings((p) => ({ ...p, instagramUrl: e.target.value }))}
                    className={inputBg}
                  />
                </div>

                {/* Facebook */}
                <div className="space-y-2">
                  <Label className={cn(isDark && "text-slate-300")}>
                    <Facebook className="h-3.5 w-3.5 mr-1.5 inline text-blue-500" />
                    Facebook URL
                  </Label>
                  <Input
                    placeholder="https://facebook.com/valtriox"
                    value={settings.facebookUrl}
                    onChange={(e) => setSettings((p) => ({ ...p, facebookUrl: e.target.value }))}
                    className={inputBg}
                  />
                </div>

                {/* Twitter/X */}
                <div className="space-y-2">
                  <Label className={cn(isDark && "text-slate-300")}>
                    <Twitter className="h-3.5 w-3.5 mr-1.5 inline" />
                    Twitter / X URL
                  </Label>
                  <Input
                    placeholder="https://x.com/valtriox"
                    value={settings.twitterUrl}
                    onChange={(e) => setSettings((p) => ({ ...p, twitterUrl: e.target.value }))}
                    className={inputBg}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ================================================================ */}
        {/* TAB 4: PLANS & PRICING                                           */}
        {/* ================================================================ */}
        {activeTab === "plans" && (
          <motion.div
            key="plans"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-6 max-w-4xl"
          >
            {/* ── Plan Cards ────────────────────────────────────────────────── */}
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className={cn("text-base flex items-center gap-2", textPrimary)}>
                  <DollarSign className="h-4 w-4" />
                  Subscription Plans & Pricing
                </CardTitle>
                <CardDescription className={textSecondary}>
                  Manage plan properties shown to clients. Changes apply immediately.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plans.map((plan: any) => {
                    const colors: Record<string, { bg: string; text: string; border: string }> = {
                      starter: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
                      growth: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
                      enterprise: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
                    };
                    const c = colors[plan.name] || colors.starter;
                    const features = typeof plan.features === "string" ? JSON.parse(plan.features) : (plan.features || []);
                    const isEditing = editingPlanId === plan.id;

                    return (
                      <div key={plan.id} className={cn(
                        "p-4 sm:p-5 rounded-xl border transition-all",
                        isEditing
                          ? isDark
                            ? "border-amber-500/30 bg-amber-500/[0.03]"
                            : "border-amber-300 bg-amber-50/50"
                          : isDark
                            ? "border-white/[0.06] hover:border-white/[0.12]"
                            : "border-slate-200 hover:border-slate-300"
                      )}>
                        {/* Plan Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                          <div className="flex items-start sm:items-center gap-3">
                            <div className={cn("p-2 sm:p-2.5 rounded-lg shrink-0", c.bg)}>
                              <DollarSign className={cn("h-4 w-4 sm:h-5 sm:w-5", c.text)} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className={cn("font-bold capitalize text-sm sm:text-base", textPrimary)}>{plan.name}</h3>
                                <Badge className={cn("text-[9px] font-semibold", c.bg, c.text, c.border)}>{plan.period}</Badge>
                              </div>
                              {/* Summary line (non-editing mode) */}
                              {!isEditing && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] sm:text-xs mt-1 text-slate-400">
                                  <span className={cn("font-medium", accentText)}>
                                    {plan.price === 0 ? "Free" : `Rs. ${plan.price.toLocaleString()}/mo`}
                                  </span>
                                  {plan.annualPrice > 0 && (
                                    <span>
                                      Annual: Rs. {plan.annualPrice.toLocaleString()}
                                    </span>
                                  )}
                                  <span><Users className="h-3 w-3 inline mr-0.5" />{plan.teamLimit === -1 ? "Unlimited" : plan.teamLimit} team</span>
                                  <span><ShoppingCart className="h-3 w-3 inline mr-0.5" />{plan.orderLimit === -1 ? "Unlimited" : plan.orderLimit} orders</span>
                                  <span><Package className="h-3 w-3 inline mr-0.5" />{plan.productLimit === -1 ? "Unlimited" : plan.productLimit} products</span>
                                  <span><Timer className="h-3 w-3 inline mr-0.5" />{plan.trialDays}-day trial</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 pl-12 sm:pl-0">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => savePlan(plan.id)}
                                  disabled={savingPlan}
                                  className={cn("h-8 gap-1 text-xs", accentBtn)}
                                >
                                  {savingPlan ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                  Save All
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={cancelEditingPlan}
                                  className="h-8 text-slate-400 hover:text-white"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditingPlan(plan)}
                                className={cn("h-8 gap-1 text-xs", isDark ? "border-white/[0.1] text-slate-300 hover:bg-white/[0.05]" : "")}
                              >
                                <Pencil className="h-3 w-3" />
                                Edit
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Editable Fields Grid */}
                        {isEditing && (
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* Monthly Price */}
                            <div className={cn("space-y-1.5 p-3 rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                              <Label className={cn("text-[11px] font-medium", textSecondary)}>
                                <DollarSign className="h-3 w-3 inline mr-1" />Monthly Price (PKR)
                              </Label>
                              <Input
                                type="number"
                                value={editPlanForm.price}
                                onChange={(e) => setEditPlanForm((p) => ({ ...p, price: e.target.value }))}
                                className={cn("h-8 text-sm", inputBg)}
                                min={0}
                                placeholder="0"
                              />
                            </div>

                            {/* Annual Price */}
                            <div className={cn("space-y-1.5 p-3 rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                              <Label className={cn("text-[11px] font-medium", textSecondary)}>
                                <DollarSign className="h-3 w-3 inline mr-1" />Annual Price (PKR)
                              </Label>
                              <Input
                                type="number"
                                value={editPlanForm.annualPrice}
                                onChange={(e) => setEditPlanForm((p) => ({ ...p, annualPrice: e.target.value }))}
                                className={cn("h-8 text-sm", inputBg)}
                                min={0}
                                placeholder="0 = no annual"
                              />
                            </div>

                            {/* Team Limit */}
                            <div className={cn("space-y-1.5 p-3 rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                              <Label className={cn("text-[11px] font-medium", textSecondary)}>
                                <Users className="h-3 w-3 inline mr-1" />Team Member Limit
                              </Label>
                              <Input
                                type="number"
                                value={editPlanForm.teamLimit}
                                onChange={(e) => setEditPlanForm((p) => ({ ...p, teamLimit: e.target.value }))}
                                className={cn("h-8 text-sm", inputBg)}
                                placeholder="-1 = Unlimited"
                              />
                            </div>

                            {/* Order Limit */}
                            <div className={cn("space-y-1.5 p-3 rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                              <Label className={cn("text-[11px] font-medium", textSecondary)}>
                                <ShoppingCart className="h-3 w-3 inline mr-1" />Order Limit (total)
                              </Label>
                              <Input
                                type="number"
                                value={editPlanForm.orderLimit}
                                onChange={(e) => setEditPlanForm((p) => ({ ...p, orderLimit: e.target.value }))}
                                className={cn("h-8 text-sm", inputBg)}
                                placeholder="-1 = Unlimited"
                              />
                            </div>

                            {/* Product Limit */}
                            <div className={cn("space-y-1.5 p-3 rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                              <Label className={cn("text-[11px] font-medium", textSecondary)}>
                                <Package className="h-3 w-3 inline mr-1" />Product Limit
                              </Label>
                              <Input
                                type="number"
                                value={editPlanForm.productLimit}
                                onChange={(e) => setEditPlanForm((p) => ({ ...p, productLimit: e.target.value }))}
                                className={cn("h-8 text-sm", inputBg)}
                                placeholder="-1 = Unlimited"
                              />
                            </div>

                            {/* Trial Days */}
                            <div className={cn("space-y-1.5 p-3 rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                              <Label className={cn("text-[11px] font-medium", textSecondary)}>
                                <Timer className="h-3 w-3 inline mr-1" />Trial Days
                              </Label>
                              <Input
                                type="number"
                                value={editPlanForm.trialDays}
                                onChange={(e) => setEditPlanForm((p) => ({ ...p, trialDays: e.target.value }))}
                                className={cn("h-8 text-sm", inputBg)}
                                min={0}
                                placeholder="14"
                              />
                            </div>
                          </div>
                        )}

                        {/* Features list */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {features.map((f: string, i: number) => (
                            <span key={i} className={cn("text-[11px] px-2 py-0.5 rounded-full", isDark ? "bg-white/[0.04] text-slate-400" : "bg-slate-100 text-slate-500")}>
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {plans.length === 0 && (
                  <div className={cn("text-center py-12", textSecondary)}>
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No plans found</p>
                    <p className="text-xs mt-1">Run the seed script to create default plans</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Feature Toggles ────────────────────────────────────────────── */}
            <Card className={cardBg}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className={cn("text-base flex items-center gap-2", textPrimary)}>
                      <Lock className="h-4 w-4" />
                      Feature Toggles
                    </CardTitle>
                    <CardDescription className={textSecondary}>
                      Lock or unlock plan-specific features for all clients
                    </CardDescription>
                  </div>
                  <Button
                    onClick={saveFeatureToggles}
                    disabled={savingToggles}
                    className={cn("gap-2", accentBtn)}
                  >
                    {savingToggles ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Toggles
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Warning */}
                <div className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border",
                  isDark
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-amber-50 border-amber-200"
                )}>
                  <AlertTriangle className={cn("h-4 w-4 mt-0.5 shrink-0", isGold ? "text-amber-400" : "text-amber-600")} />
                  <p className={cn("text-xs leading-relaxed", isDark ? "text-amber-300/80" : "text-amber-700")}>
                    Toggling a feature <strong>OFF</strong> will lock it for <strong>ALL clients</strong> on that plan.
                    Toggling a feature <strong>ON</strong> will unlock it again.
                  </p>
                </div>

                {loadingToggles ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className={cn("h-6 w-6 animate-spin", textSecondary)} />
                  </div>
                ) : (
                  <>
                    {/* Growth Features */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-[10px] font-semibold", accentClass, "border border-amber-500/20")}>
                            GROWTH
                          </Badge>
                          <span className={cn("text-xs font-medium", textPrimary)}>
                            {growthFeatures.length} features
                          </span>
                        </div>
                        <span className={cn("text-[11px]", textSecondary)}>
                          {lockedGrowth.length} locked
                        </span>
                      </div>
                      <div className={cn("rounded-lg border p-1", isDark ? "border-white/[0.06]" : "border-slate-200")}>
                        <div className="max-h-64 overflow-y-auto">
                          {growthFeatures.map((feature) => {
                            const isLocked = lockedGrowth.includes(feature.id);
                            return (
                              <div
                                key={feature.id}
                                className={cn(
                                  "flex items-center justify-between px-3 py-2 rounded-md transition-colors",
                                  isDark ? "hover:bg-white/[0.03]" : "hover:bg-slate-50",
                                  isLocked && isDark && "opacity-60"
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Lock className={cn("h-3.5 w-3.5 shrink-0", isLocked ? "text-red-400" : isDark ? "text-slate-400" : "text-slate-500")} />
                                  <span className={cn("text-sm truncate", isLocked ? textSecondary : textPrimary)}>
                                    {feature.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={cn("text-[10px] font-medium", isLocked ? "text-red-400" : isDark ? "text-slate-400" : "text-slate-500")}>
                                    {isLocked ? "Locked" : "Active"}
                                  </span>
                                  <Switch
                                    checked={!isLocked}
                                    onCheckedChange={() => toggleGrowthFeature(feature.id)}
                                    className={cn(isLocked && "data-[state=checked]:bg-red-500")}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <Separator className={isDark ? "border-white/[0.06]" : "border-slate-200"} />

                    {/* Enterprise Features */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-[10px] font-semibold", "text-amber-400 bg-amber-500/10 border border-amber-500/20")}>
                            ENTERPRISE
                          </Badge>
                          <span className={cn("text-xs font-medium", textPrimary)}>
                            {enterpriseFeatures.length} features
                          </span>
                        </div>
                        <span className={cn("text-[11px]", textSecondary)}>
                          {lockedEnterprise.length} locked
                        </span>
                      </div>
                      <div className={cn("rounded-lg border p-1", isDark ? "border-white/[0.06]" : "border-slate-200")}>
                        <div className="max-h-64 overflow-y-auto">
                          {enterpriseFeatures.map((feature) => {
                            const isLocked = lockedEnterprise.includes(feature.id);
                            return (
                              <div
                                key={feature.id}
                                className={cn(
                                  "flex items-center justify-between px-3 py-2 rounded-md transition-colors",
                                  isDark ? "hover:bg-white/[0.03]" : "hover:bg-slate-50",
                                  isLocked && isDark && "opacity-60"
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Lock className={cn("h-3.5 w-3.5 shrink-0", isLocked ? "text-red-400" : isDark ? "text-slate-400" : "text-slate-500")} />
                                  <span className={cn("text-sm truncate", isLocked ? textSecondary : textPrimary)}>
                                    {feature.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={cn("text-[10px] font-medium", isLocked ? "text-red-400" : isDark ? "text-slate-400" : "text-slate-500")}>
                                    {isLocked ? "Locked" : "Active"}
                                  </span>
                                  <Switch
                                    checked={!isLocked}
                                    onCheckedChange={() => toggleEnterpriseFeature(feature.id)}
                                    className={cn(isLocked && "data-[state=checked]:bg-red-500")}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ================================================================ */}
        {/* TAB 5: PAYMENT METHODS                                           */}
        {/* ================================================================ */}
        {activeTab === "payment" && (
          <motion.div
            key="payment"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-6 max-w-4xl"
          >
            <Card className={cardBg}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className={cn("text-base flex items-center gap-2", textPrimary)}>
                      <CreditCard className="h-4 w-4" />
                      Payment Methods
                    </CardTitle>
                    <CardDescription className={textSecondary}>
                      Configure payment methods clients use for payment proofs
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => openPaymentDialog()}
                    className={cn("gap-2", accentBtn)}
                  >
                    <Plus className="h-4 w-4" />
                    Add Method
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {settings.paymentMethods.length === 0 ? (
                  <div className={cn("text-center py-12", textSecondary)}>
                    <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No payment methods configured</p>
                    <p className="text-xs mt-1">
                      Add payment methods so clients can submit payment proofs
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {settings.paymentMethods.map((method, idx) => (
                      <motion.div
                        key={method.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={cn(
                          "rounded-xl border p-4 transition-all",
                          isDark
                            ? "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
                            : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
                          !method.isActive && "opacity-60"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={cn(
                              "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                              method.isActive
                                ? isGold
                                  ? "bg-amber-500/10"
                                  : "bg-amber-500/10"
                                : "bg-slate-100 dark:bg-white/[0.03]"
                            )}>
                              <CreditCard className={cn(
                                "h-5 w-5",
                                method.isActive
                                  ? isGold ? "text-amber-400" : "text-amber-500"
                                  : "text-slate-400"
                              )} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={cn("text-sm font-semibold truncate", textPrimary)}>
                                  {method.methodName}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] px-2 py-0",
                                    method.isActive
                                      ? isDark
                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                      : isDark
                                        ? "bg-slate-500/10 text-slate-500 border-slate-500/20"
                                        : "bg-slate-100 text-slate-500 border-slate-200"
                                  )}
                                >
                                  {method.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <div className="mt-1 space-y-0.5">
                                <p className={cn("text-xs", textSecondary)}>
                                  <span className="font-medium">Title:</span> {method.accountTitle || "—"}
                                </p>
                                <p className={cn("text-xs", textSecondary)}>
                                  <span className="font-medium">Account:</span> {method.accountNumber}
                                </p>
                                {method.bankName && (
                                  <p className={cn("text-xs", textSecondary)}>
                                    <span className="font-medium">Bank:</span> {method.bankName}
                                  </p>
                                )}
                                {method.iban && (
                                  <p className={cn("text-xs", textSecondary)}>
                                    <span className="font-medium">IBAN:</span> {method.iban}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => togglePaymentMethodStatus(method.id)}
                              className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                                isDark ? "hover:bg-white/10" : "hover:bg-slate-100"
                              )}
                              title={method.isActive ? "Deactivate" : "Activate"}
                            >
                              {method.isActive ? (
                                <Check className={cn("h-4 w-4", isGold ? "text-amber-400" : "text-amber-500")} />
                              ) : (
                                <X className="h-4 w-4 text-slate-400" />
                              )}
                            </button>
                            <button
                              onClick={() => openPaymentDialog(method)}
                              className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                                isDark ? "hover:bg-white/10" : "hover:bg-slate-100"
                              )}
                            >
                              <Pencil className="h-3.5 w-3.5 text-slate-400" />
                            </button>
                            <button
                              onClick={() => deletePaymentMethod(method.id)}
                              className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                                isDark ? "hover:bg-red-500/10" : "hover:bg-red-50"
                              )}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            </button>
                          </div>
                        </div>

                        {/* QR Code Preview */}
                        {method.qrCodeUrl && (
                          <div className="mt-3 pt-3 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
                            <div className="flex items-center gap-2">
                              <QrCode className={cn("h-4 w-4", textSecondary)} />
                              <span className={cn("text-xs font-medium", textSecondary)}>QR Code</span>
                            </div>
                            <img
                              src={method.qrCodeUrl}
                              alt="QR Code"
                              className="h-20 w-20 mt-2 rounded-lg border" 
                              style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}
                            />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ================================================================ */}
        {/* TAB 5: BRANDING & APPEARANCE                                     */}
        {/* ================================================================ */}
        {activeTab === "branding" && (
          <motion.div
            key="branding"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-6 max-w-3xl"
          >
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className={cn("text-base flex items-center gap-2", textPrimary)}>
                  <Palette className="h-4 w-4" />
                  Brand Colors
                </CardTitle>
                <CardDescription className={textSecondary}>
                  Define the visual identity of your platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Primary Brand Color */}
                <div className="space-y-3">
                  <Label className={cn(isDark && "text-slate-300")}>
                    <Palette className="h-3.5 w-3.5 mr-1.5 inline" />
                    Primary Brand Color
                  </Label>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg border-2 cursor-pointer"
                      style={{
                        backgroundColor: settings.primaryBrandColor,
                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0",
                      }}
                    />
                    <Input
                      type="text"
                      value={settings.primaryBrandColor}
                      onChange={(e) => setSettings((p) => ({ ...p, primaryBrandColor: e.target.value }))}
                      className={cn("w-32 font-mono text-sm", inputBg)}
                      placeholder="#C9A227"
                    />
                    <input
                      type="color"
                      value={settings.primaryBrandColor}
                      onChange={(e) => setSettings((p) => ({ ...p, primaryBrandColor: e.target.value }))}
                      className="h-10 w-10 rounded-lg cursor-pointer border-0"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSettings((p) => ({ ...p, primaryBrandColor: color }))}
                        className={cn(
                          "h-7 w-7 rounded-lg transition-transform hover:scale-110",
                          settings.primaryBrandColor === color && "ring-2 ring-offset-2 ring-offset-transparent scale-110"
                        )}
                        style={{
                          backgroundColor: color,
                          ringColor: color,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="space-y-3">
                  <Label className={cn(isDark && "text-slate-300")}>
                    <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5 inline" />
                    Secondary Color
                  </Label>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg border-2 cursor-pointer"
                      style={{
                        backgroundColor: settings.secondaryBrandColor,
                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0",
                      }}
                    />
                    <Input
                      type="text"
                      value={settings.secondaryBrandColor}
                      onChange={(e) => setSettings((p) => ({ ...p, secondaryBrandColor: e.target.value }))}
                      className={cn("w-32 font-mono text-sm", inputBg)}
                      placeholder="#C9A227"
                    />
                    <input
                      type="color"
                      value={settings.secondaryBrandColor}
                      onChange={(e) => setSettings((p) => ({ ...p, secondaryBrandColor: e.target.value }))}
                      className="h-10 w-10 rounded-lg cursor-pointer border-0"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSettings((p) => ({ ...p, secondaryBrandColor: color }))}
                        className={cn(
                          "h-7 w-7 rounded-lg transition-transform hover:scale-110",
                          settings.secondaryBrandColor === color && "ring-2 ring-offset-2 ring-offset-transparent scale-110"
                        )}
                        style={{
                          backgroundColor: color,
                          ringColor: color,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Color Preview */}
                <div className="space-y-2">
                  <Label className={cn(isDark && "text-slate-300")}>Gradient Preview</Label>
                  <div
                    className="h-16 rounded-xl flex items-center justify-center text-white font-semibold text-sm"
                    style={{
                      background: `linear-gradient(135deg, ${settings.primaryBrandColor} 0%, ${settings.secondaryBrandColor} 100%)`,
                    }}
                  >
                    Valtriox Portal
                  </div>
                </div>

                <Separator className={isDark ? "border-white/[0.06]" : "border-slate-200"} />

                {/* Currency Symbol */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={cn(isDark && "text-slate-300")}>
                      <DollarSign className="h-3.5 w-3.5 mr-1.5 inline" />
                      Currency Symbol
                    </Label>
                    <Input
                      placeholder="Rs."
                      value={settings.currencySymbol}
                      onChange={(e) => setSettings((p) => ({ ...p, currencySymbol: e.target.value }))}
                      className={inputBg}
                    />
                    <p className={cn("text-xs", textSecondary)}>
                      Displayed on invoices and reports
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className={cn(isDark && "text-slate-300")}>
                      <Hash className="h-3.5 w-3.5 mr-1.5 inline" />
                      Currency Code
                    </Label>
                    <Input
                      placeholder="PKR"
                      value={settings.currency}
                      onChange={(e) => setSettings((p) => ({ ...p, currency: e.target.value }))}
                      className={inputBg}
                    />
                  </div>
                </div>

                <Separator className={isDark ? "border-white/[0.06]" : "border-slate-200"} />

                {/* Email Footer Text */}
                <div className="space-y-2">
                  <Label className={cn(isDark && "text-slate-300")}>
                    <Type className="h-3.5 w-3.5 mr-1.5 inline" />
                    Email Footer Text
                  </Label>
                  <Textarea
                    placeholder="Powered by Valtriox | https://valtriox.pk"
                    rows={2}
                    value={settings.emailFooterText}
                    onChange={(e) => setSettings((p) => ({ ...p, emailFooterText: e.target.value }))}
                    className={cn(inputBg, "resize-none")}
                  />
                  <p className={cn("text-xs", textSecondary)}>
                    Appended to all outgoing platform emails
                  </p>
                </div>

                {/* Invoice Header Text */}
                <div className="space-y-2">
                  <Label className={cn(isDark && "text-slate-300")}>
                    <FileText className="h-3.5 w-3.5 mr-1.5 inline" />
                    Invoice Header Text
                  </Label>
                  <Textarea
                    placeholder="BRANDFLOW - Official Invoice"
                    rows={2}
                    value={settings.invoiceHeaderText}
                    onChange={(e) => setSettings((p) => ({ ...p, invoiceHeaderText: e.target.value }))}
                    className={cn(inputBg, "resize-none")}
                  />
                </div>

                <Separator className={isDark ? "border-white/[0.06]" : "border-slate-200"} />

                {/* Custom CSS */}
                <div className="space-y-2">
                  <Label className={cn(isDark && "text-slate-300")}>
                    <Type className="h-3.5 w-3.5 mr-1.5 inline" />
                    Custom CSS
                    <span className={cn("ml-2 text-[10px] px-1.5 py-0.5 rounded", isDark ? "bg-white/5 text-slate-500" : "bg-slate-100 text-slate-500")}>
                      Advanced
                    </span>
                  </Label>
                  <Textarea
                    placeholder="/* Custom CSS for advanced styling */&#10;.my-class { color: red; }"
                    rows={6}
                    value={settings.customCss}
                    onChange={(e) => setSettings((p) => ({ ...p, customCss: e.target.value }))}
                    className={cn(inputBg, "font-mono text-xs resize-none")}
                  />
                  <p className={cn("text-xs", textSecondary)}>
                    Injected into the portal for advanced customizations. Use with caution.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================== */}
      {/* Payment Method Dialog                                              */}
      {/* ================================================================== */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className={cn("sm:max-w-lg max-h-[90vh] overflow-y-auto", isGold && "bg-[#15151e] border-white/[0.08]")}>
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2", isDark && "text-white")}>
              <CreditCard className="h-5 w-5" />
              {editingPayment ? "Edit Payment Method" : "Add Payment Method"}
            </DialogTitle>
            <DialogDescription className={cn(isDark && "text-slate-400")}>
              {editingPayment
                ? "Update payment method details"
                : "Add a new payment method for clients"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Method Name */}
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>
                Method Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g., HBL Bank Transfer, JazzCash, EasyPaisa"
                value={paymentForm.methodName}
                onChange={(e) => setPaymentForm((p) => ({ ...p, methodName: e.target.value }))}
                className={inputBg}
              />
            </div>

            {/* Account Title & Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={cn(isDark && "text-slate-300")}>
                  Account Title
                </Label>
                <Input
                  placeholder="Account holder name"
                  value={paymentForm.accountTitle}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, accountTitle: e.target.value }))}
                  className={inputBg}
                />
              </div>
              <div className="space-y-2">
                <Label className={cn(isDark && "text-slate-300")}>
                  Account Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Account number"
                  value={paymentForm.accountNumber}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, accountNumber: e.target.value }))}
                  className={inputBg}
                />
              </div>
            </div>

            {/* Bank Name & IBAN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={cn(isDark && "text-slate-300")}>
                  Bank Name
                </Label>
                <Input
                  placeholder="e.g., HBL, Meezan Bank"
                  value={paymentForm.bankName}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, bankName: e.target.value }))}
                  className={inputBg}
                />
              </div>
              <div className="space-y-2">
                <Label className={cn(isDark && "text-slate-300")}>
                  IBAN (optional)
                </Label>
                <Input
                  placeholder="PK36SCBL0000001234567890"
                  value={paymentForm.iban}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, iban: e.target.value }))}
                  className={inputBg}
                />
              </div>
            </div>

            {/* QR Code URL */}
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>
                <QrCode className="h-3.5 w-3.5 mr-1.5 inline" />
                QR Code Image URL (optional)
              </Label>
              <Input
                placeholder="https://example.com/qr-code.png"
                value={paymentForm.qrCodeUrl}
                onChange={(e) => setPaymentForm((p) => ({ ...p, qrCodeUrl: e.target.value }))}
                className={inputBg}
              />
              {paymentForm.qrCodeUrl && (
                <div className="mt-2">
                  <img
                    src={paymentForm.qrCodeUrl}
                    alt="QR Preview"
                    className="h-20 w-20 rounded-lg border"
                    style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
              <div>
                <Label className={cn("text-sm", textPrimary)}>Active</Label>
                <p className={cn("text-xs", textSecondary)}>
                  Inactive methods won&apos;t be shown to clients
                </p>
              </div>
              <Switch
                checked={paymentForm.isActive}
                onCheckedChange={(checked) => setPaymentForm((p) => ({ ...p, isActive: checked }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              className={cn(isGold && "border-white/10 text-slate-300 hover:bg-white/5")}
            >
              Cancel
            </Button>
            <Button onClick={savePaymentMethod} className={cn("gap-2", accentBtn)}>
              <Check className="h-4 w-4" />
              {editingPayment ? "Update" : "Add"} Method
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

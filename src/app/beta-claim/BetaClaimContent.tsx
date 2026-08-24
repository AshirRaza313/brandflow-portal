"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Lock, ArrowRight, Check, AlertTriangle,
  Loader2, Eye, EyeOff, User, Building2, ArrowLeft, Crown,
  Sparkles, Gift, Zap, Heart, Phone,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

type Step = "verify" | "details" | "success" | "error";

interface InviteDetails {
  plan: string;
  trialDays: number;
  expiresAt: string | null;
  platformName: string;
}

const planColors: Record<string, { bg: string; text: string; border: string }> = {
  enterprise: { bg: "from-amber-500/15 to-amber-700/5", text: "text-amber-400", border: "border-amber-500/20" },
  professional: { bg: "from-purple-500/15 to-purple-700/5", text: "text-purple-400", border: "border-purple-500/20" },
  growth: { bg: "from-emerald-500/15 to-emerald-700/5", text: "text-emerald-400", border: "border-emerald-500/20" },
  starter: { bg: "from-sky-500/15 to-sky-700/5", text: "text-sky-400", border: "border-sky-500/20" },
};

const planFeatures: Record<string, string[]> = {
  enterprise: ["Custom Resource Limits", "Configured Analytics Workspace", "Priority Support Queue", "Branding Scope by Agreement", "Team Management", "Connector Scope by Agreement", "SEO Tools", "API Access by Agreement"],
  professional: ["Plan-Configured Orders & Products", "Advanced Analytics", "Priority Support Queue", "Custom Branding", "Up to 15 Team Members", "Connector Settings", "SEO Tools", "Email Marketing Tools"],
  growth: ["Up to 500 Orders/Month", "Standard Analytics", "Priority Support Queue", "Branding Controls", "Up to 8 Team Members", "Social Media Tools", "Loyalty Program"],
  starter: ["Up to 100 Orders/Month", "Basic Dashboard", "Business Hours Support", "Branding Controls", "Up to 3 Team Members", "Product Catalog"],
};

export default function BetaClaimContent() {
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email") || "";
  const codeFromUrl = searchParams.get("code") || "";

  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState(codeFromUrl);
  const [name, setName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("verify");
  const [errorMessage, setErrorMessage] = useState("");
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);

  // Auto-verify if both email and code are in URL
  useEffect(() => {
    if (emailFromUrl && codeFromUrl) {
      handleVerify();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVerify() {
    if (!email.trim() || !code.trim()) {
      toast.error("Please enter your email and invitation code");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/beta-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email: email.toLowerCase().trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteDetails({
          plan: data.plan,
          trialDays: data.trialDays,
          expiresAt: data.expiresAt,
          platformName: data.platformName || "Valtriox",
        });
        setStep("details");
      } else {
        setStep("error");
        setErrorMessage(data.error || "Invalid invitation");
      }
    } catch {
      setStep("error");
      setErrorMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleClaim = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (!brandName.trim()) { toast.error("Please enter your brand name"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }

    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/beta-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          email: email.toLowerCase().trim(),
          code: code.trim(),
          name: name.trim(),
          brandName: brandName.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // Auto sign in
        try {
          const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email.toLowerCase().trim(),
              password,
            }),
          });
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            const { useValtrioxStore } = await import("@/store/brandflow-store");
            const store = useValtrioxStore.getState();
            if (loginData.user) {
              store.setAuthSession(loginData.user, loginData.organization ?? null);
            }
            if (loginData.organization) {
              store.setBrandName(loginData.organization.name);
              store.setBrandConfigured(true);
            }
          }
        } catch { /* non-critical */ }

        setStep("success");
      } else {
        setStep("error");
        setErrorMessage(data.error || "Failed to create account");
      }
    } catch {
      setStep("error");
      setErrorMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const colors = planColors[inviteDetails?.plan || "enterprise"] || planColors.enterprise;
  const features = planFeatures[inviteDetails?.plan || "enterprise"] || planFeatures.enterprise;

  return (
    <div className="min-h-screen bg-[#161B26] flex items-center justify-center p-4 relative overflow-hidden">
      {/* ── Ultra Premium Background ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-amber-500/[0.04] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-amber-500/[0.02] rounded-full blur-[100px]" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: "linear-gradient(rgba(211,166,56,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(211,166,56,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-[calc(100vw-2rem)] min-w-0 max-w-[480px] relative z-10"
      >
        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-amber-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Valtriox
          </Link>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl bg-[#12121a]/95 backdrop-blur-xl border border-white/[0.06] overflow-hidden shadow-2xl shadow-black/40">

          {/* ── HEADER ── */}
          <div className="relative p-5 pb-0 sm:p-8 sm:pb-0 text-center overflow-hidden">
            {/* Gold gradient bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.08] via-transparent to-purple-500/[0.03]" />
            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-amber-500/20 rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-amber-500/20 rounded-tr-2xl" />

            <div className="relative z-10">
              {/* Logo */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="relative w-24 h-24 mx-auto mb-5 flex items-center justify-center overflow-hidden"
              >
                <Image src="/valtriox-logo-vertical.png" alt="Valtriox" fill sizes="96px" className="object-contain" priority />
              </motion.div>

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-3">
                  <Crown className="h-3 w-3" />
                  Exclusive Beta Access
                </div>
                <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
                  {step === "success" ? "Welcome Aboard!" : step === "details" ? "Create Your Account" : "Claim Your Access"}
                </h1>
                <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                  {step === "verify" && "Verify the invitation to review the beta plan and trial terms assigned to you."}
                  {step === "details" && "Set up your account and brand to start the invited beta configuration."}
                  {step === "success" && `Your ${inviteDetails?.plan || "Enterprise"} beta account is active. You can now review the available workspace tools.`}
                  {step === "error" && errorMessage}
                </p>
              </motion.div>
            </div>
          </div>

          {/* ── CONTENT ── */}
          <div className="p-5 sm:p-8">
            <AnimatePresence mode="wait">

              {/* ═══ STEP: VERIFY ═══ */}
              {step === "verify" && (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                      <input
                        id="beta-claim-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-amber-500/40 focus:bg-white/[0.05] transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invitation Code</label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                      <input
                        id="beta-claim-code"
                        name="code"
                        type="text"
                        autoComplete="off"
                        placeholder="ABC123XY"
                        maxLength={8}
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-600 text-sm font-mono tracking-[3px] text-center focus:outline-none focus:border-amber-500/40 focus:bg-white/[0.05] transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-slate-600 text-center">
                      Use the 8-character code provided with your invitation
                    </p>
                  </div>

                  <button
                    onClick={handleVerify}
                    disabled={loading || !email.trim() || !code.trim()}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-[#161B26] font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Verify Invitation
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              {/* ═══ STEP: DETAILS ═══ */}
              {step === "details" && inviteDetails && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  {/* Verified Badge */}
                  <div className={`p-3.5 rounded-xl bg-gradient-to-r ${colors.bg} border ${colors.border} flex items-center gap-3`}>
                    <div className="w-8 h-8 rounded-lg bg-green-500/15 border border-green-500/30 flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-green-400">Invitation Verified</p>
                      <p className="text-[11px] text-slate-500">
                        <span className={colors.text}>{inviteDetails.plan.charAt(0).toUpperCase() + inviteDetails.plan.slice(1)}</span> Plan
                        {" "}&middot;{" "}
                        {inviteDetails.trialDays} Day Trial
                      </p>
                    </div>
                  </div>

                  {/* Plan Preview */}
                  <div className="rounded-xl bg-[#161B26] border border-white/[0.06] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Your Plan Includes</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
                        {inviteDetails.plan.charAt(0).toUpperCase() + inviteDetails.plan.slice(1)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {features.slice(0, 5).map((f, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                            <Check className="h-2.5 w-2.5 text-amber-400" />
                          </div>
                          <span className="text-xs text-slate-400">{f}</span>
                        </div>
                      ))}
                      {features.length > 5 && (
                        <span className="text-[11px] text-slate-600 pl-6">+{features.length - 5} more features</span>
                      )}
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                      <input
                        id="beta-claim-name"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        placeholder="Your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-amber-500/40 focus:bg-white/[0.05] transition-all"
                      />
                    </div>
                  </div>

                  {/* Brand Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Brand Name</label>
                    <div className="relative group">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                      <input
                        id="beta-claim-brand"
                        name="brandName"
                        type="text"
                        autoComplete="organization"
                        placeholder="Your brand or company name"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-amber-500/40 focus:bg-white/[0.05] transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Create Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                      <input
                        id="beta-claim-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Minimum 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-12 pl-11 pr-11 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-amber-500/40 focus:bg-white/[0.05] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirm Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                      <input
                        id="beta-claim-confirm-password"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-amber-500/40 focus:bg-white/[0.05] transition-all"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => { setStep("verify"); setInviteDetails(null); }}
                      className="h-12 px-5 rounded-xl border border-white/[0.08] text-slate-400 text-sm hover:text-white hover:border-white/20 transition-all"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleClaim}
                      disabled={loading || !name.trim() || !brandName.trim() || !password.trim() || password !== confirmPassword}
                      className="flex-1 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-[#161B26] font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Activate Account
                          <Sparkles className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ═══ STEP: SUCCESS ═══ */}
              {step === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6 py-4"
                >
                  {/* Animated checkmark */}
                  <div className="relative w-20 h-20 mx-auto">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="absolute inset-0 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-2 border-green-500/30 flex items-center justify-center"
                    >
                      <Check className="h-10 w-10 text-green-400" />
                    </motion.div>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">
                      Your Brand Empire Starts Here
                    </h2>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                      Your {inviteDetails?.plan || "Enterprise"} account is active with the {inviteDetails?.trialDays || 14}-day trial assigned to this invitation. Features remain subject to the beta configuration shown above.
                    </p>
                  </div>

                  {/* Informational next-step cards (not interactive controls) */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {[
                      { icon: Zap, label: "Dashboard Access", color: "text-amber-400" },
                      { icon: Gift, label: "Configured Features", color: "text-purple-400" },
                      { icon: Heart, label: "Brand Settings", color: "text-rose-400" },
                      { icon: Phone, label: "Support Details", color: "text-emerald-400" },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                      >
                        <item.icon className={`h-5 w-5 ${item.color} mx-auto mb-1.5`} />
                        <p className="text-[11px] text-slate-500">{item.label}</p>
                      </motion.div>
                    ))}
                  </div>

                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 h-12 px-10 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-[#161B26] font-bold text-sm transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30"
                  >
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              )}

              {/* ═══ STEP: ERROR ═══ */}
              {step === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6 py-4"
                >
                  <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="h-10 w-10 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">Something Went Wrong</h2>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">{errorMessage}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { setStep("verify"); setErrorMessage(""); }}
                      className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white text-sm transition-all"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Try Again
                    </button>
                    <Link
                      href="/"
                      className="inline-flex items-center justify-center gap-2 text-sm text-amber-400/70 hover:text-amber-400 transition-colors"
                    >
                      Back to Valtriox Home
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 pt-0 sm:px-8 sm:pb-6 text-center">
            <div className="border-t border-white/[0.04] pt-4">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-sm font-bold text-amber-500/60">Valtriox</span>
                <span className="text-[10px] text-slate-600">COMMAND YOUR BRAND UNIVERSE</span>
              </div>
              <p className="text-[10px] text-slate-700">
                &copy; {new Date().getFullYear()} Valtriox. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

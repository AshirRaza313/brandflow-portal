"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Mail, Lock, ArrowRight, Check, X, AlertTriangle,
  Loader2, Eye, EyeOff, User, ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type Step = "email" | "details" | "success" | "error";

interface StepState {
  step: Step;
  message: string;
}

export default function ValtrioxJoinContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [email, setEmail] = useState("");
  const [token, setToken] = useState(tokenFromUrl);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stepState, setStepState] = useState<StepState>({ step: "email", message: "" });

  const canProceed = email.trim() && token.trim().length === 6;

  const handleVerifyEmail = async () => {
    if (!canProceed) return;
    setLoading(true);
    try {
      const res = await fetch("/api/valtriox-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          email: email.toLowerCase(),
          token,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStepState({ step: "details", message: data.name || "" });
        if (data.name) setName(data.name);
      } else {
        setStepState({ step: "error", message: data.error || "Invalid invitation" });
      }
    } catch {
      setStepState({ step: "error", message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!name.trim() || !password.trim()) {
      toast.error("Name and password are required");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // Single API call: creates user + accepts invitation
      const acceptRes = await fetch("/api/valtriox-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          email: email.toLowerCase(),
          token,
          name: name.trim(),
          password,
        }),
      });

      const acceptData = await acceptRes.json();

      if (acceptRes.ok) {
        // Auto sign in via our login API to properly set user + org in store
        try {
          const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email.toLowerCase(),
              password,
            }),
          });
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            // Import and set store values
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
        } catch {
          // Login might fail, but invitation was accepted - user can login manually
        }
        setStepState({ step: "success", message: acceptData.message || "Welcome to the team!" });
      } else {
        setStepState({ step: "error", message: acceptData.error || "Failed to accept invitation" });
      }
    } catch {
      setStepState({ step: "error", message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#161B26] flex items-center justify-center p-4">
      {/* Background subtle gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-amber-500/[0.03] via-transparent to-transparent pointer-events-none" />
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Back to home */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-amber-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Valtriox
          </Link>
        </div>

        {/* Main card */}
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] overflow-hidden">
          {/* Header */}
          <div className="p-8 pb-0 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/20 flex items-center justify-center">
              <Shield className="h-8 w-8 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">
              {stepState.step === "success" ? "Welcome to Valtriox" : "Accept Your Invitation"}
            </h1>
            <p className="text-sm text-slate-500">
              {stepState.step === "email" && "Enter your email and invitation token to get started."}
              {stepState.step === "details" && "Create your account to join the Valtriox team."}
              {stepState.step === "success" && "You've successfully joined the Valtriox team."}
              {stepState.step === "error" && stepState.message}
            </p>
          </div>

          {/* Steps */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              {/* STEP 1: Email + Token Verification */}
              {stepState.step === "email" && (
                <motion.div
                  key="step-email"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        id="valtriox-join-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Invitation Token</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        id="valtriox-join-token"
                        name="token"
                        type="text"
                        autoComplete="off"
                        placeholder="000000"
                        maxLength={6}
                        value={token}
                        onChange={(e) => setToken(e.target.value.replace(/[^0-9]/g, ""))}
                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 text-sm font-mono tracking-[4px] text-center focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Your 6-digit token was provided in your invitation email.
                    </p>
                  </div>

                  <button
                    onClick={handleVerifyEmail}
                    disabled={loading || !canProceed}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

              {/* STEP 2: Account Details */}
              {stepState.step === "details" && (
                <motion.div
                  key="step-details"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  {/* Verified info */}
                  <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/15 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400 shrink-0" />
                    <span className="text-xs text-green-400">
                      Invitation verified for <strong>{email}</strong>
                      {stepState.message && ` - {stepState.message}`}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        id="valtriox-join-name"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        placeholder="Your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Create Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        id="valtriox-join-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Minimum 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-11 pl-10 pr-10 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Confirm Password</label>
                    <input
                      id="valtriox-join-confirm-password"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStepState({ step: "email", message: "" })}
                      className="h-11 px-4 rounded-xl border border-white/10 text-slate-400 text-sm hover:text-white transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleAcceptInvite}
                      disabled={loading || !name.trim() || !password.trim()}
                      className="flex-1 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Join Team
                          <Check className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* SUCCESS */}
              {stepState.step === "success" && (
                <motion.div
                  key="step-success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6"
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <Check className="h-8 w-8 text-green-400" />
                  </div>

                  <div>
                    <p className="text-lg font-semibold text-white mb-2">{stepState.message}</p>
                    <p className="text-sm text-slate-500">
                      Your Valtriox team account is now active. You can sign in and access the platform dashboard.
                    </p>
                  </div>

                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium text-sm transition-all"
                  >
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              )}

              {/* ERROR */}
              {stepState.step === "error" && (
                <motion.div
                  key="step-error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6"
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-red-400" />
                  </div>

                  <div>
                    <p className="text-lg font-semibold text-white mb-2">Invitation Failed</p>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto">{stepState.message}</p>
                  </div>

                  <button
                    onClick={() => setStepState({ step: "email", message: "" })}
                    className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 hover:text-white text-sm transition-all"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Try Again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <p className="text-[11px] text-slate-600">
              &copy; {new Date().getFullYear()} Valtriox. All rights reserved.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

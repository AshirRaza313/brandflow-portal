"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useValtrioxStore } from "@/store/brandflow-store";
import { usePlatformIdentity } from "@/lib/platform-identity";
import { useAuthHandlers } from "@/hooks/useAuthHandlers";
import { GoldParticleCanvas } from "./GoldParticleCanvas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { KeyRound, Users, ArrowLeft, Sparkles, Shield, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { ForgotPasswordFlow } from "./ForgotPasswordFlow";

export function AuthModal() {
  const {
    authModalOpen,
    setAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    setAuthSession,
    setBrandName,
    setBrandConfigured,
    brandName,
    brandTagline,
  } = useValtrioxStore();

  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [pinLoginData, setPinLoginData] = useState({ email: "", pin: "" });
  const [showTeamLogin, setShowTeamLogin] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const { identity: platformIdentity } = usePlatformIdentity();

  // Auth screens: ALWAYS use /valtriox-logo-vertical.png directly — no flicker, no API dependency
  const displayLogo = "/valtriox-logo-vertical.png";

  const defaultTab = "login";

  useEffect(() => {
    if (authModalOpen) {
      setLoginData({ email: "", password: "" });
      setPinLoginData({ email: "", pin: "" });
      setShowPassword(false);
      setShowPin(false);
      setShowTeamLogin(false);
      setShowForgotPassword(false);
    }
  }, [authModalOpen]);

  const closeModal = () => {
    setAuthModalOpen(false);
    setAuthModalMode(null);
  };

  const { handleLogin: doLogin, handlePinLogin: doPinLogin, isLoading: loading } = useAuthHandlers({
    onSuccess: (data) => {
      setAuthSession(data.user, data.organization ?? null);
      if (data.organization) {
        setBrandName(data.organization.name);
        setBrandConfigured(true);
      }
      closeModal();
      toast.success(`Welcome, ${data.user.name}!`);
    },
    onError: (msg) => {
      toast.error(msg);
    },
  });

  const onLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error("Please fill in all fields");
      return;
    }
    await doLogin(loginData.email, loginData.password);
  };

  const onPinLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinLoginData.email || !pinLoginData.pin) {
      toast.error("Please enter your email and PIN");
      return;
    }
    if (!/^\d{6}$/.test(pinLoginData.pin)) {
      toast.error("PIN must be exactly 6 digits");
      return;
    }
    await doPinLogin(pinLoginData.email, pinLoginData.pin);
  };


  return (
    <Dialog open={authModalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent backdrop-blur-none max-h-[90vh] overflow-y-auto">
        {/* Canvas particle background */}
        <GoldParticleCanvas className="absolute inset-0 overflow-hidden rounded-2xl" particleCount={35} />

        {/* Ultra Premium Dark Glassmorphism Container */}
        <div className="relative rounded-2xl overflow-hidden">
          {/* Outer glow border */}
          <div className="absolute -inset-px rounded-2xl opacity-50" style={{
            background: "linear-gradient(135deg, rgba(211,166,56,0.3), rgba(255,255,255,0.05), rgba(211,166,56,0.15))",
          }} />

          {/* Inner card */}
          <div className="relative rounded-2xl bg-[#0c0c14]/95 backdrop-blur-2xl border border-white/[0.06]">
            {/* Top gold accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

            <div className="p-6 sm:p-8">
              {/* Logo + Brand Identity */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center px-2">
                  <Image
                    src={displayLogo}
                    alt="Valtriox logo"
                    width={64}
                    height={64}
                    className="h-16 w-auto object-contain"
                    priority
                  />
                </div>
                {/* Tagline below vertical logo */}
                <p className="text-sm text-slate-500 mt-3">
                  {platformIdentity.tagline || "COMMAND YOUR BRAND UNIVERSE"}
                </p>
              </div>

              {/* ── Forgot Password / Team Login / Login Views ── */}
              {showForgotPassword ? (
                <ForgotPasswordFlow onBack={() => setShowForgotPassword(false)} isModal />
              ) : showTeamLogin ? (
                <>
                  <DialogHeader className="mb-5">
                    <DialogTitle className="text-xl font-semibold text-white text-center flex items-center justify-center gap-2" style={{ fontFamily: "'Cinzel', serif" }}>
                      <Shield className="h-5 w-5 text-amber-400" />
                      Team Member Login
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-400 text-center">
                      Enter your email and the PIN provided by your team admin
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={onPinLoginSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pin-login-email" className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                        Email Address
                      </Label>
                      <Input
                        id="pin-login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={pinLoginData.email}
                        onChange={(e) => setPinLoginData({ ...pinLoginData, email: e.target.value })}
                        className="premium-input h-11 rounded-xl"
                        autoComplete="email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pin-login-pin" className="text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5" />
                        6-Digit PIN
                      </Label>
                      <div className="relative">
                        <Input
                          id="pin-login-pin"
                          type={showPin ? "text" : "password"}
                          placeholder="Enter your 6-digit PIN"
                          value={pinLoginData.pin}
                          onChange={(e) => setPinLoginData({ ...pinLoginData, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                          className="premium-input h-12 rounded-xl pr-10 text-center text-lg font-mono tracking-[0.3em] font-bold"
                          maxLength={6}
                          autoComplete="off"
                          inputMode="numeric"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition-colors"
                        >
                          {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Your PIN was provided by your team admin when you were invited.
                      </p>
                    </div>

                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <Button
                        type="submit"
                        className="btn-gold w-full h-11 rounded-xl text-sm shadow-[0_0_25px_rgba(211,166,56,0.25)] flex items-center justify-center gap-2"
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                        Login with PIN
                      </Button>
                    </motion.div>

                    <button
                      type="button"
                      onClick={() => setShowTeamLogin(false)}
                      className="w-full text-center text-sm text-slate-500 hover:text-amber-400 transition-colors flex items-center justify-center gap-1.5 pt-1"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to Sign In
                    </button>
                  </form>
                </>
              ) : (
                <>
                  {/* Header */}
                  <DialogHeader className="mb-5">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      </div>
                      <DialogTitle className="text-xl font-semibold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
                        Welcome Back
                      </DialogTitle>
                    </div>
                    <DialogDescription className="text-sm text-slate-400 text-center">
                      Sign in to your workspace
                    </DialogDescription>
                  </DialogHeader>

                  {/* Login Form */}
                  <div>
                      <form onSubmit={onLoginSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="modal-login-email" className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                            Email
                          </Label>
                          <Input
                            id="modal-login-email"
                            type="email"
                            placeholder="you@example.com"
                            value={loginData.email}
                            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                            className="premium-input h-11 rounded-xl"
                            autoComplete="email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="modal-login-password" className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                            Password
                          </Label>
                          <div className="relative">
                            <Input
                              id="modal-login-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              value={loginData.password}
                              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                              className="premium-input h-11 rounded-xl pr-10"
                              autoComplete="current-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition-colors"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                          <Button
                            type="submit"
                            className="btn-gold w-full h-11 rounded-xl text-sm shadow-[0_0_25px_rgba(211,166,56,0.25)] flex items-center justify-center gap-2"
                            disabled={loading}
                          >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                            Sign In
                          </Button>
                        </motion.div>
                      </form>
                  </div>

                  {/* Forgot Password Link */}
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* ── Team Member Login Link ── */}
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setShowTeamLogin(true)}
                      className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-amber-400 transition-colors py-1"
                    >
                      <Users className="h-4 w-4" />
                      Are you a team member? Click here to login with PIN
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Bottom gold shimmer line */}
            <div className="h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

            {/* Powered by */}
            <div className="py-4 text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-500/20" />
                <p className="text-[10px] text-slate-600 tracking-[0.15em] uppercase">
                  Powered by {platformIdentity.companyName}
                </p>
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-500/20" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

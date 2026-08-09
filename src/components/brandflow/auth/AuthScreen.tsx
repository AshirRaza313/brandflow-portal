"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useValtrioxStore } from "@/store/brandflow-store";
import { usePlatformIdentity } from "@/lib/platform-identity";
import { useAuthHandlers } from "@/hooks/useAuthHandlers";
import { GoldParticleCanvas } from "./GoldParticleCanvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ForgotPasswordFlow } from "./ForgotPasswordFlow";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Sparkles, Shield, ArrowRight, ArrowLeft, KeyRound } from "lucide-react";

export function AuthScreen() {
  const { setView, setAuthSession, setBrandName, setBrandConfigured, brandName, brandTagline, authModalMode } = useValtrioxStore();
  const [defaultTab, setDefaultTab] = useState<string>("login");

  // Sync default tab with store's authModalMode
  useEffect(() => {
    setDefaultTab("login");
  }, [authModalMode]);
  const { identity } = usePlatformIdentity();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [pinLoginData, setPinLoginData] = useState({ email: "", pin: "" });

  // Auth screens: ALWAYS use /valtriox-logo-vertical.png directly — no flicker, no API dependency
  // The identity.logoUrl from API may return an old/stale uploaded logo from DB,
  // causing a flicker (new logo shows → API responds → old logo replaces it).
  // Auth screens are for the VALTRIOX platform itself, so always show the default logo.
  const displayLogo = "/valtriox-logo-vertical.png";
  const displayName = identity.companyName || "Valtriox";
  const displayTagline = identity.tagline || "COMMAND YOUR BRAND UNIVERSE";

  const { handleLogin: doLogin, handlePinLogin: doPinLogin, isLoading: loading } = useAuthHandlers({
    onSuccess: (data) => {
      setAuthSession(data.user, data.organization ?? null);
      if (data.organization) {
        setBrandName(data.organization.name);
        setBrandConfigured(true);
      }
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
      toast.error("Please enter email and PIN");
      return;
    }
    await doPinLogin(pinLoginData.email, pinLoginData.pin);
  };


  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Canvas particle system */}
      <GoldParticleCanvas />

      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 20% 40%, rgba(211,166,56,0.06) 0%, transparent 70%), " +
              "radial-gradient(ellipse 60% 60% at 80% 20%, rgba(183,144,40,0.04) 0%, transparent 70%), " +
              "radial-gradient(ellipse 70% 40% at 50% 90%, rgba(245,208,96,0.03) 0%, transparent 70%)",
          }}
        />
        {/* Animated gradient orbs */}
        <motion.div
          className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(211,166,56,0.3), transparent 70%)" }}
          animate={{
            x: [0, 100, -50, 0],
            y: [0, -80, 40, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-72 h-72 rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(183,144,40,0.3), transparent 70%)" }}
          animate={{
            x: [0, -80, 60, 0],
            y: [0, 60, -40, 0],
            scale: [1, 0.8, 1.1, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Vertical gold line accents */}
      <div className="absolute left-[10%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-amber-500/10 to-transparent pointer-events-none z-0" />
      <div className="absolute right-[10%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-amber-500/10 to-transparent pointer-events-none z-0" />

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10 px-2 sm:px-0"
      >
        {/* Back to Home button */}
        <motion.button
          onClick={() => setView("landing")}
          className="flex items-center gap-2 text-slate-500 hover:text-amber-400 transition-colors mb-4 sm:mb-6 text-xs group"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Home</span>
        </motion.button>

        {/* Logo + Brand Identity */}
        <motion.div
          className="text-center mb-6 sm:mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="inline-flex items-center justify-center px-4">
            <Image src={displayLogo} alt="Valtriox logo" width={120} height={80} className="h-16 sm:h-20 w-auto object-contain" priority />
          </div>

          {/* Tagline below vertical logo */}
          <motion.p
            className="text-sm text-slate-500 tracking-wide mt-4 sm:mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {displayTagline}
          </motion.p>
        </motion.div>

        {/* Auth Card - Ultra Premium Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="relative"
        >
          {/* Card outer glow */}
          <div className="absolute -inset-px rounded-2xl opacity-60" style={{
            background: "linear-gradient(135deg, rgba(211,166,56,0.3) 0%, rgba(255,255,255,0.05) 30%, rgba(211,166,56,0.15) 60%, rgba(255,255,255,0.03) 100%)",
          }} />
          <div className="absolute -inset-px rounded-2xl opacity-30 blur-sm" style={{
            background: "linear-gradient(135deg, rgba(211,166,56,0.4), transparent, rgba(211,166,56,0.2))",
          }} />

          {/* Card inner */}
          <div className="relative rounded-2xl bg-[#0c0c14]/90 backdrop-blur-2xl border border-white/[0.06] overflow-hidden">
            {/* Top gold shimmer line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

            {/* Corner gold accents */}
            <div className="absolute top-0 left-0 w-16 h-px bg-gradient-to-r from-amber-500/30 to-transparent" />
            <div className="absolute top-0 right-0 w-16 h-px bg-gradient-to-l from-amber-500/30 to-transparent" />

            <div className="p-5 sm:p-7 md:p-9">
              {/* Header with sparkle icon */}
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
                    Welcome
                  </h2>
                  <p className="text-xs text-slate-500">Sign in to your workspace</p>
                </div>
              </div>

              {showForgotPassword ? (
                <ForgotPasswordFlow
                  onBack={() => setShowForgotPassword(false)}
                  onAutoLogin={async (loginEmail, loginPassword) => {
                    await doLogin(loginEmail, loginPassword);
                  }}
                />
              ) : (
              <>
                <Tabs value={defaultTab} onValueChange={setDefaultTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-5 sm:mb-7 bg-white/[0.04] border border-white/[0.06] rounded-xl h-10 sm:h-11 p-1">
                    <TabsTrigger
                      value="login"
                      className="text-slate-500 data-[state=active]:text-amber-300 data-[state=active]:bg-amber-500/10 data-[state=active]:shadow-[0_0_15px_rgba(211,166,56,0.1)] rounded-lg transition-all text-[10px] sm:text-xs font-medium"
                    >
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger
                      value="pin-login"
                      className="text-slate-500 data-[state=active]:text-amber-300 data-[state=active]:bg-amber-500/10 data-[state=active]:shadow-[0_0_15px_rgba(211,166,56,0.1)] rounded-lg transition-all text-[10px] sm:text-xs font-medium"
                    >
                      Team Login
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" forceMount={true} hidden={defaultTab !== "login"}>
                    <form onSubmit={onLoginSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-slate-400 text-xs font-medium uppercase tracking-wider">Email</Label>
                        <Input
                          id="login-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          className="premium-input h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="text-slate-400 text-xs font-medium uppercase tracking-wider">Password</Label>
                        <div className="relative">
                          <Input
                            id="login-password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="Enter your password"
                            value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                            className="premium-input h-11 rounded-xl pr-10"
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
                          className="btn-gold w-full h-11 rounded-xl text-sm shadow-[0_0_30px_rgba(211,166,56,0.25)] flex items-center justify-center gap-2"
                          disabled={loading}
                        >
                          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                          Sign In
                        </Button>
                      </motion.div>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-medium text-amber-400/80 hover:text-amber-400 bg-amber-500/[0.04] hover:bg-amber-500/[0.08] border border-amber-500/10 hover:border-amber-500/20 rounded-xl transition-all duration-200"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Forgot Password
                        </button>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="pin-login" forceMount={true} hidden={defaultTab !== "pin-login"}>
                    <form onSubmit={onPinLoginSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="pin-email" className="text-slate-400 text-xs font-medium uppercase tracking-wider">Email</Label>
                        <Input
                          id="pin-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          placeholder="team@company.com"
                          value={pinLoginData.email}
                          onChange={(e) => setPinLoginData({ ...pinLoginData, email: e.target.value })}
                          className="premium-input h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="pin-code" className="text-slate-400 text-xs font-medium uppercase tracking-wider">6-Digit PIN</Label>
                          <Shield className="h-3 w-3 text-amber-500/50" />
                        </div>
                        <Input
                          id="pin-code"
                          name="pin"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={6}
                          placeholder="Enter your 6-digit PIN"
                          value={pinLoginData.pin}
                          onChange={(e) => setPinLoginData({ ...pinLoginData, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                          className="premium-input h-11 rounded-xl text-center text-xl tracking-[0.5em] font-mono"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">Your PIN was provided by your team admin when you were added.</p>
                      </div>
                      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                        <Button
                          type="submit"
                          className="btn-gold w-full h-11 rounded-xl text-sm shadow-[0_0_30px_rgba(211,166,56,0.25)] flex items-center justify-center gap-2"
                          disabled={loading}
                        >
                          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                          Sign In with PIN
                        </Button>
                      </motion.div>
                    </form>
                  </TabsContent>
                </Tabs>
              </>
              )}
            </div>

            {/* Bottom gold shimmer line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
          </div>
        </motion.div>

        {/* Powered by */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-500/30" />
            <p className="text-[10px] text-slate-600 tracking-[0.2em] uppercase font-medium">
              Secured by {identity.companyName}
            </p>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-500/30" />
          </div>
          <p className="text-[10px] text-slate-600 text-center mt-3">
            Made by{" "}
            <a
              href="https://www.linkedin.com/in/muhammad-ashir-raza"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-500/70 hover:text-amber-400 transition-colors font-medium"
            >
              Muhammad Ashir Raza
            </a>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { usePlatformIdentity } from "@/lib/platform-identity";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { KeyRound, Users, ArrowLeft, Sparkles, Shield, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

// ── Canvas-based Premium Gold Particle System (Modal version) ──

function GoldParticleCanvasModal() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = container.offsetWidth;
    let height = canvas.height = container.offsetHeight;

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; opacityDir: number; hue: number;
      life: number; maxLife: number;
      type: "dot" | "spark" | "ring";
    }

    const particles: Particle[] = [];
    const PARTICLE_COUNT = 35;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle());
    }

    function createParticle(): Particle {
      const type = Math.random() < 0.6 ? "dot" : Math.random() < 0.8 ? "spark" : "ring";
      return {
        x: Math.random() * width, y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2, vy: -Math.random() * 0.3 - 0.05,
        size: type === "ring" ? 6 + Math.random() * 14 : type === "spark" ? 1 + Math.random() * 1.5 : 1 + Math.random() * 2.5,
        opacity: Math.random() * 0.5 + 0.1,
        opacityDir: Math.random() > 0.5 ? 0.002 : -0.002,
        hue: 38 + Math.random() * 20,
        life: 0, maxLife: 200 + Math.random() * 400, type,
      };
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      // Background glows
      const glow1 = ctx.createRadialGradient(width * 0.3, height * 0.4, 0, width * 0.3, height * 0.4, width * 0.4);
      glow1.addColorStop(0, "rgba(212, 160, 23, 0.04)");
      glow1.addColorStop(1, "transparent");
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.opacity += p.opacityDir;
        if (p.opacity > 0.6 || p.opacity < 0.03) p.opacityDir *= -1;
        p.opacity = Math.max(0.02, Math.min(0.6, p.opacity));

        if (p.life > p.maxLife || p.y < -20 || p.x < -20 || p.x > width + 20) {
          particles[i] = createParticle();
          particles[i].y = height + 10;
          continue;
        }

        if (p.type === "dot") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 80%, 55%, ${p.opacity})`;
          ctx.fill();
          const glowSize = p.size * 3;
          const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
          glowGrad.addColorStop(0, `hsla(${p.hue}, 80%, 55%, ${p.opacity * 0.25})`);
          glowGrad.addColorStop(1, "transparent");
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === "spark") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, ${p.opacity * 0.7})`;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${p.hue}, 70%, 50%, ${p.opacity * 0.12})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden rounded-2xl">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export function AuthModal() {
  const {
    authModalOpen,
    setAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    setUser,
    setOrganization,
    setBrandName,
    setBrandConfigured,
    setView,
    brandConfigured,
    brandLogo,
    brandName,
    brandTagline,
  } = useValtrioxStore();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [pinLoginData, setPinLoginData] = useState({ email: "", pin: "" });
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    brandName: "",
    password: "",
    confirmPassword: "",
  });
  const [showTeamLogin, setShowTeamLogin] = useState(false);

  const { identity: platformIdentity } = usePlatformIdentity();

  const showBrandIdentity = brandConfigured && brandName;
  const displayLogo = showBrandIdentity ? brandLogo : "/valtriox-logo.png";
  const displayName = showBrandIdentity ? brandName : platformIdentity.companyName;

  const defaultTab = authModalMode === "signup" ? "register" : "login";

  useEffect(() => {
    if (authModalOpen) {
      setLoginData({ email: "", password: "" });
      setPinLoginData({ email: "", pin: "" });
      setRegisterData({ name: "", email: "", brandName: "", password: "", confirmPassword: "" });
      setShowPassword(false);
      setShowConfirmPassword(false);
      setShowPin(false);
      setShowTeamLogin(false);
    }
  }, [authModalOpen]);

  const closeModal = () => {
    setAuthModalOpen(false);
    setAuthModalMode(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setUser(data.user);
        if (data.organization) {
          setOrganization(data.organization);
          setBrandName(data.organization.name);
          setBrandConfigured(true);
        }
        setView("dashboard");
        closeModal();
        toast.success(`Welcome back, ${data.user.name}!`);
        return;
      }

      toast.error(data.error || "Invalid email or password");
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinLoginData.email || !pinLoginData.pin) {
      toast.error("Please enter your email and PIN");
      return;
    }
    if (!/^\d{6}$/.test(pinLoginData.pin)) {
      toast.error("PIN must be exactly 6 digits");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pinLoginData.email,
          pin: pinLoginData.pin,
          loginType: "pin",
        }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setUser(data.user);
        if (data.organization) {
          setOrganization(data.organization);
          setBrandName(data.organization.name);
          setBrandConfigured(true);
        }
        setView("dashboard");
        closeModal();
        toast.success(`Welcome, ${data.user.name}!`);
        return;
      }

      toast.error(data.error || "Invalid email or PIN");
    } catch (err) {
      console.error("PIN login error:", err);
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, brandName, password, confirmPassword } = registerData;

    if (!name || !email || !brandName || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, brandName, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setUser(data.user);
        setOrganization(data.organization);
        setBrandName(registerData.brandName);
        setBrandConfigured(true);
        setView("dashboard");
        closeModal();
        toast.success("Account created successfully!");
      } else {
        toast.error(data.error || "Registration failed");
      }
    } catch (err) {
      toast.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={authModalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent backdrop-blur-none max-h-[90vh] overflow-y-auto">
        {/* Canvas particle background */}
        <GoldParticleCanvasModal />

        {/* Ultra Premium Dark Glassmorphism Container */}
        <div className="relative rounded-2xl overflow-hidden">
          {/* Outer glow border */}
          <div className="absolute -inset-px rounded-2xl opacity-50" style={{
            background: "linear-gradient(135deg, rgba(212,160,23,0.3), rgba(255,255,255,0.05), rgba(212,160,23,0.15))",
          }} />

          {/* Inner card */}
          <div className="relative rounded-2xl bg-[#0c0c14]/95 backdrop-blur-2xl border border-white/[0.06]">
            {/* Top gold accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

            <div className="p-6 sm:p-8">
              {/* Logo + Brand Identity */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  {/* Logo glow */}
                  <div className="absolute -inset-1.5 rounded-2xl opacity-40 blur-lg" style={{
                    background: "conic-gradient(from 0deg, rgba(212,160,23,0.3), rgba(184,134,11,0.1), rgba(245,208,96,0.3), rgba(184,134,11,0.1), rgba(212,160,23,0.3))",
                  }} />
                  <div
                    className="relative inline-flex items-center justify-center h-16 w-16 rounded-2xl overflow-hidden"
                    style={{
                      background: showBrandIdentity
                        ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
                        : "linear-gradient(135deg, #b8860b 0%, #d4a017 30%, #f5d060 50%, #d4a017 70%, #b8860b 100%)",
                      backgroundSize: showBrandIdentity ? "100%" : "200% 200%",
                      animation: showBrandIdentity ? "none" : "gradient-shift 4s ease infinite",
                    }}
                  >
                    <img src={displayLogo || undefined} alt="Logo" className="h-11 w-11 object-contain" />
                  </div>
                </div>
                <h1
                  className="text-2xl font-bold mb-1 mt-4"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  <span className="gold-gradient-text">{displayName}</span>
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {showBrandIdentity && brandTagline ? brandTagline : "Command Your Brand"}
                </p>
              </div>

              {/* ── Team Login View (PIN) ── */}
              {showTeamLogin ? (
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

                  <form onSubmit={handlePinLogin} className="space-y-4">
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
                        className="btn-gold w-full h-11 rounded-xl text-sm shadow-[0_0_25px_rgba(212,160,23,0.25)] flex items-center justify-center gap-2"
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
                      Back to Sign In / Create Account
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
                        {defaultTab === "register" ? "Create Account" : "Welcome Back"}
                      </DialogTitle>
                    </div>
                    <DialogDescription className="text-sm text-slate-400 text-center">
                      {defaultTab === "register"
                        ? "Sign up for your workspace"
                        : "Sign in to your workspace"}
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs defaultValue={defaultTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/[0.04] border border-white/[0.06] rounded-xl h-11 p-1">
                      <TabsTrigger
                        value="login"
                        className="text-slate-500 data-[state=active]:text-amber-300 data-[state=active]:bg-amber-500/10 data-[state=active]:shadow-[0_0_15px_rgba(212,160,23,0.1)] rounded-lg transition-all text-xs font-medium"
                      >
                        Sign In
                      </TabsTrigger>
                      <TabsTrigger
                        value="register"
                        className="text-slate-500 data-[state=active]:text-amber-300 data-[state=active]:bg-amber-500/10 data-[state=active]:shadow-[0_0_15px_rgba(212,160,23,0.1)] rounded-lg transition-all text-xs font-medium"
                      >
                        Create Account
                      </TabsTrigger>
                    </TabsList>

                    {/* Login Tab */}
                    <TabsContent value="login">
                      <form onSubmit={handleLogin} className="space-y-4">
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
                            className="btn-gold w-full h-11 rounded-xl text-sm shadow-[0_0_25px_rgba(212,160,23,0.25)] flex items-center justify-center gap-2"
                            disabled={loading}
                          >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                            Sign In
                          </Button>
                        </motion.div>
                      </form>
                    </TabsContent>

                    {/* Register Tab */}
                    <TabsContent value="register">
                      <form onSubmit={handleRegister} className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="modal-reg-name" className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                            Full Name
                          </Label>
                          <Input
                            id="modal-reg-name"
                            placeholder="John Doe"
                            value={registerData.name}
                            onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                            className="premium-input h-11 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="modal-reg-email" className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                            Email
                          </Label>
                          <Input
                            id="modal-reg-email"
                            type="email"
                            placeholder="you@example.com"
                            value={registerData.email}
                            onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                            className="premium-input h-11 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="modal-reg-brand" className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                            Brand / Business Name
                          </Label>
                          <Input
                            id="modal-reg-brand"
                            placeholder="My Awesome Brand"
                            value={registerData.brandName}
                            onChange={(e) => setRegisterData({ ...registerData, brandName: e.target.value })}
                            className="premium-input h-11 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="modal-reg-password" className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                            Password
                          </Label>
                          <div className="relative">
                            <Input
                              id="modal-reg-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Min. 6 characters"
                              value={registerData.password}
                              onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
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
                        <div className="space-y-2">
                          <Label htmlFor="modal-reg-confirm" className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                            Confirm Password
                          </Label>
                          <div className="relative">
                            <Input
                              id="modal-reg-confirm"
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Repeat password"
                              value={registerData.confirmPassword}
                              onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                              className="premium-input h-11 rounded-xl pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                          <Button
                            type="submit"
                            className="btn-gold w-full h-11 rounded-xl text-sm shadow-[0_0_25px_rgba(212,160,23,0.25)] flex items-center justify-center gap-2"
                            disabled={loading}
                          >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            Create Account
                          </Button>
                        </motion.div>
                      </form>
                    </TabsContent>
                  </Tabs>

                  {/* ── Team Member Login Link ── */}
                  <div className="mt-5 pt-4 border-t border-white/[0.06]">
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

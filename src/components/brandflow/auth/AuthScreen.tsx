"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { usePlatformIdentity } from "@/lib/platform-identity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Sparkles, Shield, ArrowRight, ArrowLeft } from "lucide-react";

// ── Canvas-based Premium Gold Particle System ──

function GoldParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      opacityDir: number;
      hue: number;
      life: number;
      maxLife: number;
      type: "dot" | "spark" | "ring";
    }

    const particles: Particle[] = [];
    const PARTICLE_COUNT = 60;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle());
    }

    function createParticle(): Particle {
      const type = Math.random() < 0.6 ? "dot" : Math.random() < 0.8 ? "spark" : "ring";
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.5 - 0.1,
        size: type === "ring" ? 8 + Math.random() * 20 : type === "spark" ? 1 + Math.random() * 2 : 1 + Math.random() * 3,
        opacity: Math.random() * 0.6 + 0.1,
        opacityDir: Math.random() > 0.5 ? 0.003 : -0.003,
        hue: 38 + Math.random() * 20,
        life: 0,
        maxLife: 300 + Math.random() * 500,
        type,
      };
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      // Draw radial background glows
      const glow1 = ctx.createRadialGradient(width * 0.2, height * 0.3, 0, width * 0.2, height * 0.3, width * 0.4);
      glow1.addColorStop(0, "rgba(212, 160, 23, 0.04)");
      glow1.addColorStop(1, "transparent");
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, width, height);

      const glow2 = ctx.createRadialGradient(width * 0.8, height * 0.7, 0, width * 0.8, height * 0.7, width * 0.35);
      glow2.addColorStop(0, "rgba(184, 134, 11, 0.03)");
      glow2.addColorStop(1, "transparent");
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, width, height);

      const glow3 = ctx.createRadialGradient(width * 0.5, height * 0.1, 0, width * 0.5, height * 0.1, width * 0.3);
      glow3.addColorStop(0, "rgba(245, 208, 96, 0.02)");
      glow3.addColorStop(1, "transparent");
      ctx.fillStyle = glow3;
      ctx.fillRect(0, 0, width, height);

      // Draw grid dots pattern
      ctx.fillStyle = "rgba(212, 160, 23, 0.015)";
      const gridSize = 40;
      for (let gx = 0; gx < width; gx += gridSize) {
        for (let gy = 0; gy < height; gy += gridSize) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        // Oscillate opacity
        p.opacity += p.opacityDir;
        if (p.opacity > 0.7 || p.opacity < 0.05) p.opacityDir *= -1;
        p.opacity = Math.max(0.02, Math.min(0.7, p.opacity));

        // Reset if out of bounds or expired
        if (p.life > p.maxLife || p.y < -20 || p.x < -20 || p.x > width + 20) {
          particles[i] = createParticle();
          particles[i].y = height + 10;
          continue;
        }

        // Draw particle
        if (p.type === "dot") {
          // Gold dot with glow
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 80%, 55%, ${p.opacity})`;
          ctx.fill();

          // Outer glow
          const glowSize = p.size * 4;
          const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
          glowGrad.addColorStop(0, `hsla(${p.hue}, 80%, 55%, ${p.opacity * 0.3})`);
          glowGrad.addColorStop(1, "transparent");
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === "spark") {
          // Small bright spark
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, ${p.opacity * 0.8})`;
          ctx.fill();
        } else if (p.type === "ring") {
          // Fading ring
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${p.hue}, 70%, 50%, ${p.opacity * 0.15})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // Draw subtle connecting lines between close particles
      ctx.strokeStyle = "rgba(212, 160, 23, 0.02)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.04;
            ctx.strokeStyle = `rgba(212, 160, 23, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export function AuthScreen() {
  const { setView, setUser, setOrganization, setBrandName, setBrandConfigured, brandConfigured, brandLogo, brandName, brandTagline, authModalMode } = useValtrioxStore();
  const [defaultTab, setDefaultTab] = useState<string>("login");

  // Sync default tab with store's authModalMode (set from landing page click)
  useEffect(() => {
    if (authModalMode === "signup") {
      setDefaultTab("register");
    } else {
      setDefaultTab("login");
    }
  }, [authModalMode]);
  const { identity } = usePlatformIdentity();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [pinLoginData, setPinLoginData] = useState({ email: "", pin: "" });
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    brandName: "",
    password: "",
    confirmPassword: "",
  });

  // Use brand identity if configured, otherwise default Valtriox
  const showBrandIdentity = brandConfigured && brandName;
  const displayLogo = showBrandIdentity ? brandLogo : "/valtriox-logo.png";
  const displayName = showBrandIdentity ? brandName : identity.companyName;
  const displayTagline = showBrandIdentity && brandTagline ? brandTagline : "Command Your Brand";

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinLoginData.email || !pinLoginData.pin) {
      toast.error("Please enter email and PIN");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pinLoginData, loginType: "pin" }),
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
    <div className="min-h-screen bg-[#050508] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Canvas particle system */}
      <GoldParticleCanvas />

      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 20% 40%, rgba(212,160,23,0.06) 0%, transparent 70%), " +
              "radial-gradient(ellipse 60% 60% at 80% 20%, rgba(184,134,11,0.04) 0%, transparent 70%), " +
              "radial-gradient(ellipse 70% 40% at 50% 90%, rgba(245,208,96,0.03) 0%, transparent 70%)",
          }}
        />
        {/* Animated gradient orbs */}
        <motion.div
          className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(212,160,23,0.3), transparent 70%)" }}
          animate={{
            x: [0, 100, -50, 0],
            y: [0, -80, 40, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-72 h-72 rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(184,134,11,0.3), transparent 70%)" }}
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
        className="w-full max-w-md relative z-10"
      >
        {/* Back to Home button */}
        <motion.button
          onClick={() => setView("landing")}
          className="flex items-center gap-2 text-slate-500 hover:text-amber-400 transition-colors mb-6 text-xs group"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Home</span>
        </motion.button>

        {/* Logo + Brand Identity */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="relative inline-block">
            {/* Logo glow ring */}
            <div
              className="absolute -inset-2 rounded-3xl opacity-50 blur-xl"
              style={{
                background: "conic-gradient(from 0deg, rgba(212,160,23,0.3), rgba(184,134,11,0.1), rgba(245,208,96,0.3), rgba(184,134,11,0.1), rgba(212,160,23,0.3))",
                animation: "gradient-shift 6s linear infinite",
              }}
            />
            <div
              className="relative inline-flex items-center justify-center h-20 w-20 rounded-2xl overflow-hidden"
              style={{
                background: showBrandIdentity
                  ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
                  : "linear-gradient(135deg, #b8860b 0%, #d4a017 30%, #f5d060 50%, #d4a017 70%, #b8860b 100%)",
                backgroundSize: showBrandIdentity ? "100%" : "200% 200%",
                animation: showBrandIdentity ? "none" : "gradient-shift 4s ease infinite",
              }}
            >
              <img src={displayLogo} alt="Logo" className="h-14 w-14 object-contain" />
            </div>
          </div>

          <motion.h1
            className="text-4xl font-bold mb-2 mt-6"
            style={{ fontFamily: "'Cinzel', serif" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span className="gold-gradient-text">{displayName}</span>
          </motion.h1>
          <motion.p
            className="text-sm text-slate-500 tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {displayTagline}
          </motion.p>
        </motion.div>

        {/* Auth Card — Ultra Premium Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="relative"
        >
          {/* Card outer glow */}
          <div className="absolute -inset-px rounded-2xl opacity-60" style={{
            background: "linear-gradient(135deg, rgba(212,160,23,0.3) 0%, rgba(255,255,255,0.05) 30%, rgba(212,160,23,0.15) 60%, rgba(255,255,255,0.03) 100%)",
          }} />
          <div className="absolute -inset-px rounded-2xl opacity-30 blur-sm" style={{
            background: "linear-gradient(135deg, rgba(212,160,23,0.4), transparent, rgba(212,160,23,0.2))",
          }} />

          {/* Card inner */}
          <div className="relative rounded-2xl bg-[#0c0c14]/90 backdrop-blur-2xl border border-white/[0.06] overflow-hidden">
            {/* Top gold shimmer line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

            {/* Corner gold accents */}
            <div className="absolute top-0 left-0 w-16 h-px bg-gradient-to-r from-amber-500/30 to-transparent" />
            <div className="absolute top-0 right-0 w-16 h-px bg-gradient-to-l from-amber-500/30 to-transparent" />

            <div className="p-7 sm:p-9">
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

              <Tabs value={defaultTab} onValueChange={setDefaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-7 bg-white/[0.04] border border-white/[0.06] rounded-xl h-11 p-1">
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
                  <TabsTrigger
                    value="pin-login"
                    className="text-slate-500 data-[state=active]:text-amber-300 data-[state=active]:bg-amber-500/10 data-[state=active]:shadow-[0_0_15px_rgba(212,160,23,0.1)] rounded-lg transition-all text-xs font-medium"
                  >
                    Team Login
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" forceMount={true} hidden={defaultTab !== "login"}>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-slate-400 text-xs font-medium uppercase tracking-wider">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
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
                          type={showPassword ? "text" : "password"}
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
                        className="btn-gold w-full h-11 rounded-xl text-sm shadow-[0_0_30px_rgba(212,160,23,0.25)] flex items-center justify-center gap-2"
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                        Sign In
                      </Button>
                    </motion.div>
                  </form>
                </TabsContent>

                <TabsContent value="register" forceMount={true} hidden={defaultTab !== "register"}>
                  <form onSubmit={handleRegister} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name" className="text-slate-400 text-xs font-medium uppercase tracking-wider">Full Name</Label>
                      <Input
                        id="reg-name"
                        placeholder="John Doe"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                        className="premium-input h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email" className="text-slate-400 text-xs font-medium uppercase tracking-wider">Email</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="you@example.com"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        className="premium-input h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-brand" className="text-slate-400 text-xs font-medium uppercase tracking-wider">Brand / Business Name</Label>
                      <Input
                        id="reg-brand"
                        placeholder="My Awesome Brand"
                        value={registerData.brandName}
                        onChange={(e) => setRegisterData({ ...registerData, brandName: e.target.value })}
                        className="premium-input h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-slate-400 text-xs font-medium uppercase tracking-wider">Password</Label>
                      <div className="relative">
                        <Input
                          id="reg-password"
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
                      <Label htmlFor="reg-confirm" className="text-slate-400 text-xs font-medium uppercase tracking-wider">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="reg-confirm"
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
                        className="btn-gold w-full h-11 rounded-xl text-sm shadow-[0_0_30px_rgba(212,160,23,0.25)] flex items-center justify-center gap-2"
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Create Account
                      </Button>
                    </motion.div>
                  </form>
                </TabsContent>

                <TabsContent value="pin-login" forceMount={true} hidden={defaultTab !== "pin-login"}>
                  <form onSubmit={handlePinLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pin-email" className="text-slate-400 text-xs font-medium uppercase tracking-wider">Email</Label>
                      <Input
                        id="pin-email"
                        type="email"
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
                        type="text"
                        inputMode="numeric"
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
                        className="btn-gold w-full h-11 rounded-xl text-sm shadow-[0_0_30px_rgba(212,160,23,0.25)] flex items-center justify-center gap-2"
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                        Sign In with PIN
                      </Button>
                    </motion.div>
                  </form>
                </TabsContent>
              </Tabs>
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
        </motion.div>
      </motion.div>
    </div>
  );
}

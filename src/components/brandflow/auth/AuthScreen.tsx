"use client";

import { useState, useMemo } from "react";
import { useBrandForgeStore } from "@/store/brandflow-store";
import { usePlatformIdentity } from "@/lib/platform-identity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export function AuthScreen() {
  const { setView, setUser, setOrganization, setBrandName, setBrandConfigured, brandConfigured, brandLogo, brandName, brandTagline } = useBrandForgeStore();
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

  // Use brand identity if configured, otherwise default BrandForge
  const showBrandIdentity = brandConfigured && brandName;
  const displayLogo = showBrandIdentity ? brandLogo : "/brandforge-logo.png";
  const displayName = showBrandIdentity ? brandName : identity.companyName;
  const displayTagline = showBrandIdentity && brandTagline ? brandTagline : "Forge Your Brand Empire";

  // Generate floating gold particle positions
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 4}s`,
      duration: `${3 + Math.random() * 3}s`,
      size: `${2 + Math.random() * 4}px`,
    }));
  }, []);

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
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial gold glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(212,160,23,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(184,134,11,0.05) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(245,208,96,0.04) 0%, transparent 50%)",
        }}
      />

      {/* Floating gold particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="gold-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo + Brand Identity */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl mb-5 shadow-[0_0_30px_rgba(212,160,23,0.3)] overflow-hidden"
            style={{
              background: showBrandIdentity
                ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
                : "linear-gradient(135deg, #d4a017 0%, #f5d060 50%, #b8860b 100%)",
            }}
          >
            <img src={displayLogo} alt="Logo" className="h-12 w-12 object-contain" />
          </div>
          <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: "'Cinzel', serif" }}>
            <span className="gold-gradient-text">{displayName}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{displayTagline}</p>
        </div>

        {/* Auth Card — Glassmorphism */}
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_0_60px_rgba(0,0,0,0.5)] premium-shimmer">
          <div className="p-6 sm:p-8">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-white" style={{ fontFamily: "'Cinzel', serif" }}>Welcome</h2>
              <p className="text-sm text-slate-400 mt-1">Sign in to your workspace or create a new one</p>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/[0.05] border border-white/[0.08] rounded-xl h-11">
                <TabsTrigger
                  value="login"
                  className="text-slate-400 data-[state=active]:text-white data-[state=active]:bg-white/[0.08] data-[state=active]:shadow-none rounded-lg border-b-2 border-b-transparent data-[state=active]:border-b-amber-500/50 transition-all"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="text-slate-400 data-[state=active]:text-white data-[state=active]:bg-white/[0.08] data-[state=active]:shadow-none rounded-lg border-b-2 border-b-transparent data-[state=active]:border-b-amber-500/50 transition-all"
                >
                  Create Account
                </TabsTrigger>
                <TabsTrigger
                  value="pin-login"
                  className="text-slate-400 data-[state=active]:text-white data-[state=active]:bg-white/[0.08] data-[state=active]:shadow-none rounded-lg border-b-2 border-b-transparent data-[state=active]:border-b-amber-500/50 transition-all"
                >
                  Team Login
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-slate-400 text-sm">Email</Label>
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
                    <Label htmlFor="login-password" className="text-slate-400 text-sm">Password</Label>
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
                  <Button
                    type="submit"
                    className="btn-gold w-full h-11 rounded-xl text-sm shadow-[0_0_20px_rgba(212,160,23,0.3)]"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className="text-slate-400 text-sm">Full Name</Label>
                    <Input
                      id="reg-name"
                      placeholder="John Doe"
                      value={registerData.name}
                      onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      className="premium-input h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-slate-400 text-sm">Email</Label>
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
                    <Label htmlFor="reg-brand" className="text-slate-400 text-sm">Brand / Business Name</Label>
                    <Input
                      id="reg-brand"
                      placeholder="My Awesome Brand"
                      value={registerData.brandName}
                      onChange={(e) => setRegisterData({ ...registerData, brandName: e.target.value })}
                      className="premium-input h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-slate-400 text-sm">Password</Label>
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
                    <Label htmlFor="reg-confirm" className="text-slate-400 text-sm">Confirm Password</Label>
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
                  <Button
                    type="submit"
                    className="btn-gold w-full h-11 rounded-xl text-sm shadow-[0_0_20px_rgba(212,160,23,0.3)]"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create Account
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="pin-login">
                <form onSubmit={handlePinLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pin-email" className="text-slate-400 text-sm">Email</Label>
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
                    <Label htmlFor="pin-code" className="text-slate-400 text-sm">6-Digit PIN</Label>
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
                  <Button
                    type="submit"
                    className="btn-gold w-full h-11 rounded-xl text-sm shadow-[0_0_20px_rgba(212,160,23,0.3)]"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Sign In with PIN
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Powered by */}
        <p className="text-center text-[10px] text-slate-600 mt-6 tracking-wider uppercase">
          Powered by {identity.companyName}
        </p>
      </motion.div>
    </div>
  );
}

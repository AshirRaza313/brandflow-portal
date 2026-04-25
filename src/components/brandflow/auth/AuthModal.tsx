"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Activity, KeyRound, Users, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

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
  // Team member login view state
  const [showTeamLogin, setShowTeamLogin] = useState(false);

  const { identity: platformIdentity } = usePlatformIdentity();

  // Use brand identity if configured, otherwise default to platform identity
  const showBrandIdentity = brandConfigured && brandName;
  const displayLogo = showBrandIdentity ? brandLogo : "/valtriox-logo.png";
  const displayName = showBrandIdentity ? brandName : platformIdentity.companyName;

  // Sync tab with authModalMode
  const defaultTab = authModalMode === "signup" ? "register" : "login";

  // Generate floating gold particle positions
  const particles = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 4}s`,
      duration: `${3 + Math.random() * 3}s`,
      size: `${2 + Math.random() * 3}px`,
    }));
  }, []);

  // Reset form state when modal opens
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
        {/* Background radial gold glows */}
        <div
          className="absolute inset-0 pointer-events-none -z-10"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(212,160,23,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(184,134,11,0.05) 0%, transparent 50%)",
          }}
        />

        {/* Floating gold particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="gold-particle absolute -z-10"
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

        {/* Premium dark glassmorphism container */}
        <div className="rounded-2xl bg-[#0a0a0f] border border-white/[0.08] shadow-[0_0_60px_rgba(0,0,0,0.5)] premium-shimmer">
          <div className="p-6 sm:p-8">
            {/* Logo + Brand Identity */}
            <div className="text-center mb-6">
              <div
                className="inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-4 shadow-[0_0_30px_rgba(212,160,23,0.3)] overflow-hidden"
                style={{
                  background: showBrandIdentity
                    ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
                    : "linear-gradient(135deg, #d4a017 0%, #f5d060 50%, #b8860b 100%)",
                }}
              >
                <img src={displayLogo || undefined} alt="Logo" className="h-10 w-10 object-contain" />
              </div>
              <h1
                className="text-2xl font-bold mb-1"
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
                    <KeyRound className="h-5 w-5 text-amber-400" />
                    Team Member Login
                  </DialogTitle>
                  <DialogDescription className="text-sm text-slate-400 text-center">
                    Enter your email and the PIN provided by your team admin
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handlePinLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pin-login-email" className="text-slate-400 text-sm">
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
                    <Label htmlFor="pin-login-pin" className="text-slate-400 text-sm flex items-center gap-1.5">
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

                  <Button
                    type="submit"
                    className="btn-gold w-full h-11 rounded-xl text-sm shadow-[0_0_20px_rgba(212,160,23,0.3)]"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                    Login with PIN
                  </Button>

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
                  <DialogTitle className="text-xl font-semibold text-white text-center" style={{ fontFamily: "'Cinzel', serif" }}>
                    {defaultTab === "register" ? "Create Account" : "Welcome Back"}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-slate-400 text-center">
                    {defaultTab === "register"
                      ? "Sign up for your workspace"
                      : "Sign in to your workspace"}
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue={defaultTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/[0.05] border border-white/[0.08] rounded-xl h-11">
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
                  </TabsList>

                  {/* Login Tab */}
                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="modal-login-email" className="text-slate-400 text-sm">
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
                        <Label htmlFor="modal-login-password" className="text-slate-400 text-sm">
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

                  {/* Register Tab */}
                  <TabsContent value="register">
                    <form onSubmit={handleRegister} className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="modal-reg-name" className="text-slate-400 text-sm">
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
                        <Label htmlFor="modal-reg-email" className="text-slate-400 text-sm">
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
                        <Label htmlFor="modal-reg-brand" className="text-slate-400 text-sm">
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
                        <Label htmlFor="modal-reg-password" className="text-slate-400 text-sm">
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
                        <Label htmlFor="modal-reg-confirm" className="text-slate-400 text-sm">
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

          {/* Powered by */}
          <p className="text-center text-[10px] text-slate-600 pb-6 tracking-wider uppercase">
            Powered by {platformIdentity.companyName}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

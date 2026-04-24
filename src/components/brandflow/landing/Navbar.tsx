"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformIdentity } from "@/lib/platform-identity";

interface NavbarProps {
  onAuthClick: (mode: "login" | "signup") => void;
}

function splitBrandName(name: string) {
  const mid = Math.ceil(name.length / 2);
  const first = name.slice(0, mid);
  const rest = name.slice(mid);
  return <>{first}<span className="text-amber-400">{rest}</span></>;
}

export function Navbar({ onAuthClick }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" },
  ];

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-br opacity-80 blur-[0.5px]"
                style={{ background: "linear-gradient(135deg, #d4a017, #f5d060, #b8860b)" }} />
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 shadow-lg overflow-hidden">
                <img src="/brandflow-logo.png" alt={companyName} className="h-7 w-7 object-contain" />
              </div>
            </div>
            <span className="text-xl font-bold text-white">
              {splitBrandName(companyName)}
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollTo(link.href)}
                className="text-sm font-medium text-slate-400 hover:text-amber-400 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => onAuthClick("login")}
              className="border-white/[0.1] text-slate-300 hover:bg-white/[0.05] hover:text-white rounded-xl"
            >
              Login
            </Button>
            <Button
              onClick={() => onAuthClick("signup")}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl shadow-[0_0_16px_rgba(212,160,23,0.25)]"
            >
              Get Started Free
            </Button>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/[0.05] transition-colors text-slate-300"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0a0a0f] border-t border-white/[0.06] overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href)}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-3 border-t border-white/[0.06] space-y-2">
                <Button
                  variant="outline"
                  className="w-full border-white/[0.1] text-slate-300 rounded-xl"
                  onClick={() => { onAuthClick("login"); setMobileOpen(false); }}
                >
                  Login
                </Button>
                <Button
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl"
                  onClick={() => { onAuthClick("signup"); setMobileOpen(false); }}
                >
                  Get Started Free
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

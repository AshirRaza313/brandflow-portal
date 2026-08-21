"use client";

import { motion } from "framer-motion";
import { Play, Shield, CreditCard, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { usePlatformIdentity } from "@/lib/platform-identity";

interface HeroProps {
  onAuthClick: (mode: "login" | "signup") => void;
}

export function Hero({ onAuthClick }: HeroProps) {
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;

  return (
    <section className="relative min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Gradient Mesh Background */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(5,150,105,0.2),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(217,119,6,0.1),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 sm:pt-32 sm:pb-20 lg:pt-40 lg:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4 sm:mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs sm:text-sm text-amber-300 font-medium">COMMAND YOUR BRAND UNIVERSE</span>
            </motion.div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              Run Your Entire Brand From{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4A73A] via-[#E8BD58] to-[#D4A73A]">
                One Dashboard
              </span>
            </h1>

            <p className="mt-2 inline-flex items-center gap-1.5 text-xs sm:text-sm text-amber-300/80 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Invite-only Beta | Guided Onboarding
            </p>

            <p className="mt-4 sm:mt-6 text-sm sm:text-base md:text-lg text-slate-400 max-w-xl leading-relaxed">
              {companyName} is the all-in-one operations portal for modern businesses. Manage orders, track inventory, empower your team, and grow - all in one place.
            </p>

            {/* CTA Buttons — SEO: rendered as <a href> for crawler discovery */}
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <a
                href="/contact"
                className="inline-flex items-center justify-center bg-amber-600 hover:bg-amber-700 text-white text-base px-8 h-12 rounded-xl shadow-lg shadow-amber-600/25 transition-colors"
              >
                Apply for Beta
              </a>
              <a
                href="#features"
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById("features");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="inline-flex items-center justify-center border border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white text-base px-8 h-12 rounded-xl transition-colors"
              >
                <Play className="w-4 h-4 mr-2" />
                Watch Demo
              </a>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-400">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span>Built for Pakistani Brands</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span>14-Day Free Trial</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span>14-Day Trial Included</span>
              </div>
            </div>
          </motion.div>

          {/* Right - Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-amber-900/20">
              <Image
                src="/dashboard-preview.png"
                alt={`${companyName} Dashboard Preview`}
                width={1344}
                height={768}
                className="w-full h-auto"
                priority
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 to-transparent" />
            </div>
            {/* Floating elements */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -right-4 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-xl px-4 py-3 shadow-xl hidden lg:block"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <span className="text-amber-400 text-sm font-bold">+$</span>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Workspace</p>
                  <p className="text-sm font-bold text-white">Unified</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -bottom-4 -left-4 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-xl px-4 py-3 shadow-xl hidden lg:block"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <span className="text-amber-400 text-sm">⭐</span>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Access</p>
                  <p className="text-sm font-bold text-white">Invite-only beta</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#161B26] to-transparent" />
    </section>
  );
}

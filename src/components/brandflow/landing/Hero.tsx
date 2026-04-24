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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 lg:pt-40 lg:pb-28">
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
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-sm text-amber-300 font-medium">Now available in 50+ countries</span>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              Run Your Entire Brand From{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
                One Dashboard
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-xl leading-relaxed">
              {companyName} is the all-in-one operations portal for modern businesses. Manage orders, track inventory, empower your team, and grow — all in one place.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={() => onAuthClick("signup")}
                className="bg-amber-600 hover:bg-amber-700 text-white text-base px-8 h-12 rounded-xl shadow-lg shadow-amber-600/25"
              >
                Start Free Today
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white text-base px-8 h-12 rounded-xl"
              >
                <Play className="w-4 h-4 mr-2" />
                Watch Demo
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Trusted by 500+ Brands</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Free Forever Plan</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>No Credit Card Required</span>
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
                  <p className="text-xs text-slate-400">Revenue</p>
                  <p className="text-sm font-bold text-white">+24.5%</p>
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
                  <p className="text-xs text-slate-400">Satisfaction</p>
                  <p className="text-sm font-bold text-white">4.8/5.0</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
    </section>
  );
}

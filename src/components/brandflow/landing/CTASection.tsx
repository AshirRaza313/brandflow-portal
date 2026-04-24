"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { usePlatformIdentity } from "@/lib/platform-identity";

interface CTASectionProps {
  onAuthClick: (mode: "login" | "signup") => void;
}

export function CTASection({ onAuthClick }: CTASectionProps) {
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;

  return (
    <section className="py-24 bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600/20 via-amber-700/10 to-slate-900/50 border border-amber-500/20 px-8 py-16 sm:px-16 sm:py-20 text-center"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,160,23,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(212,160,23,0.08),transparent_50%)]" />

          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white max-w-3xl mx-auto leading-tight">
              Ready to Transform Your Brand Operations?
            </h2>
            <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto">
              Join 500+ businesses already using {companyName} to streamline their operations and accelerate growth.
            </p>
            <div className="mt-10">
              <Button
                size="lg"
                onClick={() => onAuthClick("signup")}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-lg px-10 h-14 rounded-xl shadow-[0_0_30px_rgba(212,160,23,0.3)] hover:shadow-[0_0_40px_rgba(212,160,23,0.4)] transition-all duration-300"
              >
                Start Free Today
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              No credit card required · Free forever plan available
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import { Lock, Crown, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrandOnyxStore } from "@/store/brandflow-store";
import { getFeatureLock, getLockedFeatures, FEATURE_LOCKS } from "@/lib/feature-lock";
import { useMemo } from "react";

interface FeatureLockedOverlayProps {
  featureId: string;
  featureLabel: string;
  requiredPlan: string;
  currentPlan: string;
}

/** List of key features included in each paid plan */
const PLAN_BENEFITS: Record<string, string[]> = {
  growth: [
    "All Starter features",
    "Campaigns & Broadcasts",
    "SEO & Social Media tools",
    "Email & Ad management",
    "AI Tools & WA Business API",
    "Revenue & Traffic analytics",
    "Import/Export data",
    "Marketing Calendar",
  ],
  enterprise: [
    "All Growth features",
    "Custom Integrations (API/Webhooks)",
    "SLA Engine & Support Tickets",
    "Warehouse Management",
    "Audit Log & Compliance",
    "Priority support",
    "Dedicated account manager",
    "Custom onboarding",
  ],
};

export function FeatureLockedOverlay({
  featureId,
  featureLabel,
  requiredPlan,
  currentPlan,
}: FeatureLockedOverlayProps) {
  const { setActiveSection, appTheme } = useBrandOnyxStore();
  const isGold = appTheme === "premium-dark";

  const planLabel = requiredPlan === "growth" ? "Growth" : "Enterprise";
  const benefits = PLAN_BENEFITS[requiredPlan] || [];

  // Count how many features unlock with this plan
  const unlockCount = useMemo(() => {
    if (requiredPlan === "growth") {
      return FEATURE_LOCKS.filter((f) => f.minPlan === "growth").length;
    }
    return FEATURE_LOCKS.length; // enterprise unlocks all
  }, [requiredPlan]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="max-w-md w-full mx-4 rounded-2xl p-8 text-center"
        style={{
          background: isGold
            ? "linear-gradient(145deg, rgba(10,10,15,0.97), rgba(15,15,25,0.95))"
            : "linear-gradient(145deg, rgba(15,23,42,0.97), rgba(10,15,30,0.95))",
          border: isGold
            ? "1px solid rgba(212,160,23,0.2)"
            : "1px solid rgba(16,185,129,0.2)",
          boxShadow: isGold
            ? "0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(212,160,23,0.08)"
            : "0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(16,185,129,0.08)",
        }}
      >
        {/* Lock Icon */}
        <div
          className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
            isGold ? "bg-amber-500/10" : "bg-emerald-500/10"
          }`}
          style={{
            boxShadow: isGold
              ? "inset 0 1px 0 rgba(212,160,23,0.15), 0 4px 20px rgba(212,160,23,0.1)"
              : "inset 0 1px 0 rgba(16,185,129,0.15), 0 4px 20px rgba(16,185,129,0.1)",
          }}
        >
          <Lock
            className={`w-8 h-8 ${isGold ? "text-amber-400" : "text-emerald-400"}`}
          />
        </div>

        {/* Feature Label */}
        <h2 className="text-xl font-bold text-white mb-2">{featureLabel}</h2>

        {/* Requirement Text */}
        <p
          className={`text-sm mb-1 ${
            isGold ? "text-amber-200/80" : "text-emerald-200/80"
          }`}
        >
          This feature requires the{" "}
          <span className="font-bold text-white">{planLabel}</span> plan
        </p>
        <p className="text-xs text-slate-400 mb-6">
          Upgrade your plan to unlock {featureLabel} and{" "}
          <span className="font-semibold">
            {unlockCount - 1} more powerful features
          </span>
        </p>

        {/* Benefits List */}
        <div className="text-left mb-6 rounded-xl p-4" style={{
          background: isGold ? "rgba(212,160,23,0.04)" : "rgba(16,185,129,0.04)",
          border: isGold ? "1px solid rgba(212,160,23,0.08)" : "1px solid rgba(16,185,129,0.08)",
        }}>
          <p
            className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${
              isGold ? "text-amber-500/70" : "text-emerald-500/70"
            }`}
          >
            {planLabel} plan includes
          </p>
          <ul className="space-y-2">
            {benefits.map((benefit, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                <Check
                  className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                    isGold ? "text-amber-400" : "text-emerald-400"
                  }`}
                />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <Button
          onClick={() => setActiveSection("subscriptions")}
          className={`w-full h-12 rounded-xl font-semibold text-sm transition-all ${
            isGold
              ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30"
              : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
          }`}
        >
          <Crown className="w-4 h-4 mr-2" />
          Upgrade to {planLabel}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        {/* Back Link */}
        <button
          onClick={() => setActiveSection("dashboard")}
          className="mt-4 text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1"
        >
          <ArrowRight className="w-3 h-3 rotate-180" />
          Back to Dashboard
        </button>
      </motion.div>
    </motion.div>
  );
}

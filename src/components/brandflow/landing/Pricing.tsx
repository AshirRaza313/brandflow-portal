"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Crown, Building2, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingProps {
  onAuthClick: (mode: "login" | "signup") => void;
}

const billingToggle = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
] as const;

type BillingPeriod = (typeof billingToggle)[number]["value"];

const annualDiscount = { monthly: 0, quarterly: 10, annual: 20 };

const getPrice = (baseMonthly: number, period: BillingPeriod) => {
  if (period === "monthly") return baseMonthly;
  if (period === "quarterly") return Math.round(baseMonthly * 3 * (1 - annualDiscount.quarterly / 100));
  return Math.round(baseMonthly * 12 * (1 - annualDiscount.annual / 100));
};

const getSavingsLabel = (period: BillingPeriod) => {
  if (period === "monthly") return "";
  if (period === "quarterly") return "Save 10%";
  return "Save 20%";
};

const plans = [
  {
    name: "Starter",
    icon: Sparkles,
    baseMonthly: 7999,
    periodLabel: "/month",
    description: "Launch your brand with powerful essentials. Perfect for startups and small businesses ready to make their mark.",
    badge: "Best Value",
    features: [
      "Brand Dashboard",
      "Up to 50 Products",
      "100 Orders/Month",
      "Up to 3 Team Members",
      "5 GB Cloud Storage",
      "3 Marketing Channels",
      "500 Emails/Month",
      "2 Third-Party Integrations",
      "Business Hours Support",
      "Read-Only API Access",
      "14-Day Free Trial",
    ],
    setupFee: 4999,
    cta: "Get Started",
    highlighted: false,
    popular: false,
  },
  {
    name: "Growth",
    icon: TrendingUp,
    baseMonthly: 14999,
    periodLabel: "/month",
    description: "Scale your brand with expanded channels, campaigns, and automation. Built for growing businesses that need more power.",
    badge: "For Growing Teams",
    features: [
      "Advanced Brand Dashboard",
      "Up to 200 Products",
      "500 Orders/Month",
      "Up to 8 Team Members",
      "20 GB Cloud Storage",
      "5 Marketing Channels",
      "Campaign Management (5)",
      "2,000 Emails/Month",
      "Coupon Management (15)",
      "Priority Queue Support",
      "Unlimited Invoices",
      "14-Day Free Trial",
    ],
    setupFee: 9999,
    cta: "Get Started",
    highlighted: true,
    popular: true,
  },
  {
    name: "Professional",
    icon: Crown,
    baseMonthly: 24999,
    periodLabel: "/month",
    description: "Supercharge your growth with advanced tools, analytics, and unlimited marketing power. Built for scaling brands.",
    badge: "Powerhouse",
    features: [
      "Unlimited Orders & Products",
      "Up to 15 Team Members",
      "50 GB Cloud Storage",
      "8 Marketing Channels",
      "Campaign Management (10)",
      "5,000 Emails/Month",
      "Full API Access",
      "Custom Branding",
      "AI-Powered Insights",
      "SEO & Social Media Tools",
      "Email Marketing & Ad Manager",
      "Priority 24/7 Support",
      "14-Day Free Trial",
    ],
    setupFee: 14999,
    cta: "Get Started",
    highlighted: true,
    popular: false,
  },
  {
    name: "Enterprise",
    icon: Building2,
    baseMonthly: 0,
    periodLabel: "",
    description: "Full-scale brand domination with unlimited everything, dedicated support, and custom integrations tailored to your empire.",
    badge: "Custom",
    features: [
      "Unlimited Everything",
      "Full Suite AI Dashboard",
      "Dedicated Account Manager",
      "White-Label Portal",
      "Custom Integrations & Development",
      "Full API + Webhooks",
      "Contractual Availability Terms",
      "Warehouse Management",
      "Audit Log & SLA Engine",
    ],
    setupFee: 29999,
    cta: "Contact Sales",
    highlighted: false,
    popular: false,
  },
];

const betaHighlights = [
  { label: "Connected Operations", value: "One Workspace" },
  { label: "Your Own Baseline", value: "Measurable" },
  { label: "Beta Onboarding", value: "Guided" },
  { label: "Product Feedback", value: "Direct" },
];

export function Pricing({ onAuthClick }: PricingProps) {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");

  return (
    <section id="pricing" className="py-24 bg-[#111827]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
            Pricing & Plans
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">
            Invest in Your Brand&apos;s{" "}
            <span className="text-amber-400">Future</span>
          </h2>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-amber-300 font-medium">Beta Launch | All plans include a 14-day free trial</span>
          </div>
          <p className="mt-4 text-lg text-slate-400">
            Transparent pricing with no hidden fees. Every plan includes a 14-day free trial.
            Scale up anytime as your brand grows.
          </p>
        </motion.div>

        {/* Beta highlights */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-12 max-w-4xl mx-auto"
        >
          {betaHighlights.map((stat) => (
            <div key={stat.label} className="text-center px-3 sm:px-4">
              <p className="text-lg sm:text-xl font-bold text-amber-400">{stat.value}</p>
              <p className="text-[11px] sm:text-xs text-slate-500">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex items-center justify-center gap-1 mb-10"
        >
          {billingToggle.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setBilling(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billing === opt.value
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-300 border border-transparent"
              }`}
            >
              {opt.label}
              {opt.value !== "monthly" && (
                <span className="ml-1.5 text-[10px] font-semibold text-emerald-400">
                  {getSavingsLabel(opt.value)}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Plan Cards - 4 cards in 2x2 on lg */}
        <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            const isEnterprise = plan.name === "Enterprise";
            const displayPrice = isEnterprise
              ? "Custom"
              : `Rs. ${getPrice(plan.baseMonthly, billing).toLocaleString("en-PK")}`;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              >
                <div
                  className={`h-full flex flex-col rounded-2xl transition-all duration-300 ${
                    plan.highlighted
                      ? "bg-white/[0.05] backdrop-blur-sm border-2 border-amber-500/50 shadow-xl shadow-amber-500/10 lg:scale-105 relative"
                      : "bg-white/[0.03] border border-white/[0.08] hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5"
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-semibold rounded-full shadow-[0_0_12px_rgba(211,166,56,0.4)]">
                      {plan.badge}
                    </div>
                  )}

                  {/* Header */}
                  <div className="pb-4 pt-6 px-6">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${plan.highlighted ? "bg-amber-500/15" : "bg-white/[0.06]"}`}>
                        <Icon className={`w-5 h-5 ${plan.highlighted ? "text-amber-400" : "text-slate-400"}`} />
                      </div>
                      <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                    </div>
                    <div className="mt-3">
                      <span className="text-3xl lg:text-2xl font-bold text-white">{displayPrice}</span>
                      {!isEnterprise && (
                        <span className="text-slate-500 text-sm ml-1">
                          {billing === "monthly"
                            ? plan.periodLabel
                            : billing === "quarterly"
                              ? "/quarter"
                              : "/year"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">{plan.description}</p>
                    {plan.setupFee && (
                      <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500/60" />
                        One-time setup: Rs. {plan.setupFee.toLocaleString("en-PK")}{isEnterprise ? "+" : ""}
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <div className="flex-1 pb-4 px-6">
                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5 text-sm">
                          <Check className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${plan.highlighted ? "text-amber-400" : "text-emerald-400"}`} />
                          <span className="text-slate-300 text-xs lg:text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  <div className="pb-6 px-6">
                    <Button
                      className={`w-full rounded-xl group text-sm ${
                        plan.highlighted
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-[0_0_20px_rgba(211,166,56,0.3)]"
                          : "bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] hover:border-amber-500/30"
                      }`}
                      onClick={() => { window.location.href = '/contact'; }}
                    >
                      {plan.cta}
                      {!isEnterprise && <ArrowRight className="ml-2 w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />}
                    </Button>
                    <p className="text-[11px] text-slate-500 text-center mt-2">
                      14-day free trial included with all plans
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center max-w-2xl mx-auto"
        >
          <p className="text-slate-400 text-sm">
            All plans include a one-time setup fee. Quarterly billing saves 10%. Annual billing saves <span className="text-amber-400 font-semibold">20%</span>.
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Payment methods: Bank Transfer, JazzCash, EasyPaisa, SWIFT, PayPal | Currency: PKR (USD for international clients)
          </p>
        </motion.div>
      </div>
    </section>
  );
}

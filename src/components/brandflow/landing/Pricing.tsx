"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingProps {
  onAuthClick: (mode: "login" | "signup") => void;
}

const plans = [
  {
    name: "Starter",
    price: "🇵🇰 Rs. 0",
    period: "/forever",
    description: "Perfect for small businesses getting started.",
    features: [
      "Up to 3 team members",
      "100 orders (lifetime limit)",
      "Basic analytics",
      "5 AI queries/day",
      "Email support",
    ],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "🇵🇰 Rs. 4,999",
    period: "/month",
    description: "For growing brands that need more power.",
    features: [
      "Everything in Starter",
      "Unlimited orders (lifetime)",
      "Advanced analytics",
      "AI tools",
      "Seasonal campaigns",
      "WhatsApp API",
      "Priority support",
      "50 products",
      "10 team members",
      "Custom branding",
      "Email marketing",
      "SEO tools",
    ],
    cta: "Start 14-Day Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "🇵🇰 Rs. 14,999",
    period: "/month",
    description: "For established brands at scale.",
    features: [
      "Everything in Growth",
      "White-label portal",
      "Custom API integrations",
      "Dedicated account manager",
      "Unlimited products",
      "Unlimited team members",
      "Automated reports",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export function Pricing({ onAuthClick }: PricingProps) {
  return (
    <section id="pricing" className="py-24 bg-[#060610]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
            Pricing
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">
            Simple, Transparent{" "}
            <span className="text-amber-400">Pricing</span>
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Start free and scale as you grow. No hidden fees, no surprises.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div
                className={`h-full flex flex-col rounded-2xl transition-all duration-300 ${
                  plan.highlighted
                    ? "bg-white/[0.05] backdrop-blur-sm border-2 border-amber-500/50 shadow-xl shadow-amber-500/10 scale-[1.02] lg:scale-105 relative"
                    : "bg-white/[0.03] border border-white/[0.08] hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-semibold rounded-full shadow-[0_0_12px_rgba(212,160,23,0.4)]">
                    Most Popular
                  </div>
                )}
                <div className="pb-4 pt-6 px-6">
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <div className="mt-3">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-slate-500 text-sm ml-1">{plan.period}</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-2">{plan.description}</p>
                </div>
                <div className="flex-1 pb-4 px-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <span className="text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pb-6 px-6">
                  <Button
                    className={`w-full rounded-xl ${
                      plan.highlighted
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-[0_0_20px_rgba(212,160,23,0.3)]"
                        : "bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] hover:border-amber-500/30"
                    }`}
                    onClick={() => onAuthClick("signup")}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

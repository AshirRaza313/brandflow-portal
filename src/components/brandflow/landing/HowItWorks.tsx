"use client";

import { motion } from "framer-motion";
import { UserPlus, Rocket, LayoutDashboard } from "lucide-react";
import { usePlatformIdentity } from "@/lib/platform-identity";

const steps = [
  {
    number: "01",
    icon: Rocket,
    title: "Sign Up in 60 Seconds",
    description: "Create your free account and set up your brand workspace. No credit card required.",
  },
  {
    number: "02",
    icon: UserPlus,
    title: "Invite Your Team",
    description: "Add team members and assign roles with granular permissions and access controls.",
  },
  {
    number: "03",
    icon: LayoutDashboard,
    title: "Manage Everything",
    description: "Start handling orders, inventory, marketing, and analytics from one place.",
  },
];

export function HowItWorks() {
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
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
            How It Works
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">
            Up and Running in{" "}
            <span className="text-amber-400">3 Simple Steps</span>
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Getting started with {companyName} is effortless. Here&apos;s how.
          </p>
        </motion.div>

        <div className="relative">
          {/* Connecting line - desktop */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-900/30 via-amber-500/40 to-amber-900/30" />

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative text-center"
              >
                {/* Step number circle */}
                <div className="relative inline-flex mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center mx-auto">
                    <step.icon className="w-8 h-8 text-amber-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white text-xs font-bold flex items-center justify-center shadow-[0_0_12px_rgba(212,160,23,0.4)]">
                    {step.number}
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-400 leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

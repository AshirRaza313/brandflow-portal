"use client";

import { motion } from "framer-motion";
import { Target, Eye, Heart, Globe, Zap, Award, Users, TrendingUp, Shield, Linkedin, Mail, Code2, Database } from "lucide-react";
import { usePlatformIdentity } from "@/lib/platform-identity";

export function About() {
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;

  const values = [
    {
      icon: Target,
      title: "Mission-Driven",
      description: "We are testing whether a connected workspace can make everyday brand operations easier for early adopters.",
    },
    {
      icon: Eye,
      title: "Vision-Led",
      description: "Our direction is to connect more operational workflows over time, guided by evidence from beta use.",
    },
    {
      icon: Heart,
      title: "Feedback-Led",
      description: "Early-adopter feedback helps us decide what to refine, document, or build next.",
    },
    {
      icon: Globe,
      title: "Pakistan and Beyond",
      description: "Built in Pakistan with multi-currency and language settings. The invite-only beta starts locally; any regional expansion will follow validated feedback.",
    },
  ];

  const stats = [
    { value: "Beta", label: "Early Access Open", icon: Users },
    { value: "Founder-Led", label: "Product & Onboarding", icon: Shield },
    { value: "Pakistan", label: "Starting Market", icon: Globe },
    { value: "Feedback", label: "Guided Roadmap", icon: Award },
  ];

  const milestones = [
    { year: "2024", event: "Idea born. The problem was clear and the vision for a unified brand OS took shape.", icon: Zap },
    { year: "2025", event: "Planning and architecture. Database schema, 40+ feature modules, tech stack chosen.", icon: Database },
    { year: "2026", event: "Built daily for months, then launched in beta in the 2nd half of the year.", icon: TrendingUp },
    { year: "2027", event: "Potential upgrades remain on the roadmap and will be prioritized from beta evidence.", icon: Globe },
  ];

  return (
    <section id="about" className="relative bg-[#161B26] py-24 sm:py-32">
      {/* Background accents */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(211,166,56,0.04),transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16 sm:mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
            <span className="text-sm text-amber-300 font-medium">About Us</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            The Story Behind{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
              {companyName}
            </span>
          </h2>
          <p className="mt-5 text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            {companyName} is an invite-only beta that brings selected brand-operation
            workflows into one workspace. Early-adopter feedback guides what is refined next.
          </p>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-20"
        >
          {stats.map((stat, i) => (
            <div
              key={i}
              className="text-center p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/20 transition-colors"
            >
              <stat.icon className="h-5 w-5 text-amber-400 mx-auto mb-3" />
              <p className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Values Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-xl sm:text-2xl font-bold text-white text-center mb-10">
            Our Core Values
          </h3>
          <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
            {values.map((value, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group p-6 sm:p-7 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/20 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <value.icon className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-white mb-2">{value.title}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">{value.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-20"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-white text-center mb-10">
            Our Journey
          </h3>
          <div className="max-w-2xl mx-auto">
            {milestones.map((milestone, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.15 }}
                className="relative pl-10 pb-8 last:pb-0"
              >
                {/* Timeline line */}
                {i < milestones.length - 1 && (
                  <div className="absolute left-[15px] top-8 bottom-0 w-px bg-gradient-to-b from-amber-500/30 to-transparent" />
                )}
                {/* Timeline dot */}
                <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <milestone.icon className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div className="ml-1">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">{milestone.year}</span>
                  <p className="text-sm text-slate-300 mt-1 leading-relaxed">{milestone.event}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Founder Section — Muhammad Ashir Raza */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-20 max-w-4xl mx-auto"
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/[0.08] via-white/[0.02] to-transparent border border-amber-500/15 p-8 sm:p-12">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
              {/* Avatar */}
              <div className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center text-4xl font-bold text-white shadow-2xl shadow-amber-600/30">
                AR
              </div>
              {/* Bio */}
              <div className="flex-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-3">
                  <Code2 className="h-3 w-3 text-amber-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Founder &amp; Developer</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Muhammad Ashir Raza
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-5">
                  Muhammad Ashir Raza founded {companyName} and led its product and engineering work.
                  The current invite-only beta brings selected operational modules into one workspace,
                  with scope and pricing presented before onboarding.
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <a
                    href="https://www.linkedin.com/in/muhammad-ashir-raza"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-medium hover:from-amber-600 hover:to-amber-700 transition-all"
                  >
                    <Linkedin className="h-4 w-4" />
                    Connect on LinkedIn
                  </a>
                  <a
                    href={`mailto:${identity.companyEmail || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "ashir@valtriox.com"}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/5 hover:text-white transition-all"
                  >
                    <Mail className="h-4 w-4" />
                    Email Founder
                  </a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

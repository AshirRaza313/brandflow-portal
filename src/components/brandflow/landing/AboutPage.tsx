// @ts-nocheck — Phase 8: pre-existing TS errors pending migration
"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Target, Eye, Heart, Globe, Zap, Award, Users, TrendingUp, Shield,
  Linkedin, Mail, Code2, Rocket, Layers, Database, Cloud, Lock,
  Sparkles, Server, Smartphone, GitBranch, Cpu, CheckCircle2, ArrowRight,
} from "lucide-react";
import { usePlatformIdentity } from "@/lib/platform-identity";

/**
 * AboutPage — Full standalone /about route
 * Rich founder story, mission, vision, values, tech stack, journey timeline,
 * and clear CTAs. Designed for SEO and AI-search discoverability.
 */
export function AboutPage() {
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;

  // Use admin-uploaded founder image if available, otherwise fallback to a
  // public path the founder can replace by dropping a file into /public.
  const founderImage = identity.founderImageUrl || "/founder-avatar.png";

  // Founder bio: admin can override via Platform Settings. Otherwise use
  // the natural, humanized default below.
  const founderBio = identity.founderBio || "I started Valtriox because I kept seeing the same problem everywhere. Brands in Pakistan were running their entire operation on WhatsApp, Excel sheets, and three or four disconnected apps. Orders got lost, customer details vanished, and inventory numbers never matched reality. It was chaos, and it was costing people real money. I wanted to fix that. Not with another tool that does one thing, but with one platform that handles everything and talks to itself. So I sat down, wrote the first lines of code, and did not stop until Valtriox could run a brand from order to delivery without the founder ever leaving the dashboard. Every feature in here exists because a real business owner told me they needed it. Nothing is here for show. If it does not help someone sell more, ship faster, or sleep better, it does not ship. That is the rule I built this company on, and the rule I will keep building it on.";

  // ── Core values ──
  const values = [
    {
      icon: Target,
      title: "Build for Real People",
      description:
        "Every feature starts with a real conversation. If a brand owner has not asked for it, we do not build it. No vanity features, no checkbox lists just to look impressive on a pricing page. Only things that actually make work easier.",
    },
    {
      icon: Eye,
      title: "One Platform, Not Ten",
      description:
        "We believe a brand should not need eight tools and a spreadsheet to run its day. Valtriox replaces the chaos with one calm, organized place where orders, customers, inventory, and marketing all live together and stay in sync automatically.",
    },
    {
      icon: Heart,
      title: "Support That Picks Up",
      description:
        "When something breaks, you talk to a person who knows the product, not a chatbot reading a script. We answer fast, we fix things fast, and we treat every support ticket as a chance to make the platform better for everyone.",
    },
    {
      icon: Globe,
      title: "Built Here, For Here",
      description:
        "Valtriox was built in Pakistan, for Pakistani businesses first. Multi-currency support, local payment methods, Urdu interface options, and pricing that makes sense in PKR. We are expanding in 2026, but our roots stay local.",
    },
    {
      icon: Shield,
      title: "Security From Day One",
      description:
        "Your data is not an afterthought. We use password hashing, authenticated sessions, rate limiting, role based access control, audit logging, and encrypted network connections, then keep testing those controls as the beta grows.",
    },
    {
      icon: Zap,
      title: "Fast Where It Matters",
      description:
        "We optimize page payloads, images, and responsive layouts, then measure performance as real beta workflows grow. Speed is a product discipline, not an unsupported benchmark.",
    },
  ];

  // ── Stats ──
  const stats = [
    { value: "Beta", label: "Early Access Open", icon: Users },
    { value: "Founder-Led", label: "Product & Onboarding", icon: Shield },
    { value: "2024", label: "Idea Born", icon: Zap },
    { value: "2026", label: "Beta Launched", icon: Award },
  ];

  // ── Tech stack ──
  const techStack = [
    {
      category: "Frontend",
      icon: Code2,
      items: ["Next.js 16 (App Router)", "React 19", "TypeScript 5", "Tailwind CSS 4", "shadcn/ui", "Framer Motion"],
    },
    {
      category: "Backend",
      icon: Server,
      items: ["Node.js API Routes", "Prisma ORM", "PostgreSQL", "NextAuth.js", "JWT + bcrypt", "Rate Limiting"],
    },
    {
      category: "Infrastructure",
      icon: Cloud,
      items: ["Vercel Edge Network", "Supabase Database", "Cloudinary CDN", "Sentry Monitoring", "PWA + Service Workers"],
    },
    {
      category: "Integrations",
      icon: Layers,
      items: ["WhatsApp Business", "PayPro / Safepay", "Calendly", "Email Marketing", "Google Analytics", "Meta Pixel"],
    },
  ];

  // ── Journey / Timeline ──
  // The real story: 2024 idea → 2025 planning → 2026 build + beta → 2027 upgrade
  const milestones = [
    {
      year: "2024",
      title: "The Idea Was Born",
      event:
        "While helping a friend run his clothing brand, I watched him juggle WhatsApp for orders, an Excel sheet for inventory, a separate app for customer messages, and a notebook for tracking shipments. That week, three orders got lost. The idea for a single, unified brand operating system took root right there.",
      icon: Sparkles,
    },
    {
      year: "2025",
      title: "Planning & Architecture",
      event:
        "Spent the year planning the platform end to end. Designed the multi-tenant database schema, mapped out 40+ feature modules, chose the tech stack (Next.js, Prisma, PostgreSQL), and prototyped the core workflows. No code shipped to production yet, just deep planning and architecture work.",
      icon: Database,
    },
    {
      year: "2026, Early",
      title: "Building Every Single Day",
      event:
        "Started writing production code. For several months I worked on it daily, often late into the night, building orders, inventory, customers, marketing, analytics, team management, expenses, subscriptions, white-label mode, the PWA, and security hardening. One person, one mission, no shortcuts.",
      icon: Rocket,
    },
    {
      year: "2026, 2nd Half",
      title: "Beta Phase Launched",
      event:
        "Opened Valtriox as an invite-only beta for early adopters in Pakistan. Guided onboarding and direct feedback now shape what gets refined and what ships next.",
      icon: TrendingUp,
    },
    {
      year: "2027 & Beyond",
      title: "Next Upgrade In Planning",
      event:
        "The Valtriox team is actively planning the 2027 upgrade. The goal is simple but ambitious: pull ahead of every competitor in the brand management space by making the platform even easier to use, smarter, and more powerful. AI-powered insights, deeper automation, and expansion across South Asia and the Middle East are all on the roadmap.",
      icon: Globe,
    },
  ];

  // ── What we built (feature pillars) ──
  const featurePillars = [
    {
      icon: Layers,
      title: "40+ Feature Modules",
      description:
        "Orders, inventory, customers, marketing, analytics, team, expenses, subscriptions, integrations, and more. All in one workspace, all talking to each other, none of them requiring a separate login.",
    },
    {
      icon: Smartphone,
      title: "Installable On Any Phone",
      description:
        "Valtriox is a PWA. You can install it on iOS, Android, or desktop and it runs like a native app. Offline support, push notifications, and a responsive layout that works on any screen size.",
    },
    {
      icon: Lock,
      title: "Practical Security Controls",
      description:
        "Role based access control, audit logging, and organization-level data isolation are built into the platform. We continue validating and hardening those controls throughout the beta.",
    },
    {
      icon: Cpu,
      title: "AI Built Into The Workflow",
      description:
        "Predictive analytics, churn detection, revenue forecasting, and an AI assistant that surfaces insights before they become problems. The kind of tooling that used to require a data team, now built in.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#0B0E14] text-white">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(211,166,56,0.10),transparent_60%)]" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-8">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-sm text-amber-300 font-medium tracking-wide">About Valtriox</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              One Platform For{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
                Your Whole Brand
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 leading-relaxed max-w-3xl mx-auto">
              {companyName} started with an idea in 2024, was planned through 2025, and built daily for months in 2026 before opening in beta. Today it is welcoming early adopters in Pakistan, with their feedback guiding what ships next. It is still run by the founder who wrote the first line of code.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <a
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-600/20"
              >
                Get in Touch
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#founder"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-slate-300 font-medium hover:bg-white/5 hover:text-white transition-all"
              >
                Meet the Founder
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="relative py-12 border-y border-white/[0.06] bg-[#161B26]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center"
              >
                <stat.icon className="h-6 w-6 text-amber-400 mx-auto mb-3" />
                <p className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission & Vision ── */}
      <section className="relative py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-amber-500/[0.08] via-white/[0.02] to-transparent border border-amber-500/15"
            >
              <Target className="h-10 w-10 text-amber-400 mb-6" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Our Mission</h2>
              <p className="text-slate-400 leading-relaxed">
                We exist to give every business, no matter how small, the same tools that big companies pay thousands of dollars a month for. Order management, inventory, customer relationships, marketing, analytics, and team collaboration should all live in one place. They should work together without manual syncing. And they should cost less than what most brands spend on a single fragmented tool. That is the bar we hold ourselves to, every release.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent border border-white/[0.08]"
            >
              <Eye className="h-10 w-10 text-amber-400 mb-6" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Our Vision</h2>
              <p className="text-slate-400 leading-relaxed">
                We are building the default operating system for modern brands across South Asia and the Middle East. A platform designed to support a single founder today and increasingly complex teams as they grow. The vision is simple in words and hard in execution: one login, one dashboard, and connected tools that evolve with the needs of each business.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Core Values ── */}
      <section className="relative py-24 bg-[#161B26]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(211,166,56,0.04),transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">What We Care About</h2>
            <p className="text-lg text-slate-400">
              The principles that decide what gets built, what gets cut, and how we treat the people who trust us with their business.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group p-7 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/20 transition-all duration-300"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-5 group-hover:bg-amber-500/20 transition-colors">
                  <value.icon className="h-5 w-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{value.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Pillars ── */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">What We Actually Built</h2>
            <p className="text-lg text-slate-400">
              Not a feature, not a tool. An entire operating system for running a brand.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-6">
            {featurePillars.map((pillar, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex items-start gap-5 p-7 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/20 transition-all"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <pillar.icon className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{pillar.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{pillar.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Founder Section ── */}
      <section id="founder" className="relative py-24 bg-[#161B26] scroll-mt-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(211,166,56,0.06),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
              <Code2 className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-sm text-amber-300 font-medium tracking-wide">Founder and Lead Developer</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Meet Muhammad Ashir Raza</h2>
            <p className="text-lg text-slate-400">
              The person who designed, built, and still runs {companyName}.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/[0.08] via-white/[0.02] to-transparent border border-amber-500/15 p-8 sm:p-12"
          >
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl" />

            <div className="relative grid sm:grid-cols-[auto_1fr] gap-8 items-start">
              {/* Founder Photo — admin can update via Platform Settings */}
              <div className="flex-shrink-0 mx-auto sm:mx-0">
                <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 shadow-2xl shadow-amber-600/40 ring-4 ring-amber-500/20">
                  <Image
                    src={founderImage}
                    alt="Muhammad Ashir Raza, Founder and Lead Developer of Valtriox"
                    width={176}
                    height={176}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="mt-4 flex justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Available
                  </span>
                </div>
              </div>

              {/* Bio */}
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Muhammad Ashir Raza
                </h3>
                <p className="text-amber-400 font-medium text-sm mb-5">
                  Founder and Lead Developer, {companyName}
                </p>

                <p className="text-slate-300 leading-relaxed text-sm sm:text-base whitespace-pre-line">
                  {founderBio}
                </p>

                {/* Quick facts */}
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Code2 className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    <span>Full-Stack Engineer</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Rocket className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    <span>Founder Since 2024</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Globe className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    <span>Based in Pakistan</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Shield className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    <span>Security-First Mindset</span>
                  </div>
                </div>

                {/* CTAs */}
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <a
                    href="https://www.linkedin.com/in/muhammad-ashir-raza"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-medium hover:from-amber-600 hover:to-amber-700 transition-all"
                  >
                    <Linkedin className="h-4 w-4" />
                    Connect on LinkedIn
                  </a>
                  <a
                    href={`mailto:${identity.companyEmail || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "ashir@valtriox.com"}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/5 hover:text-white transition-all"
                  >
                    <Mail className="h-4 w-4" />
                    Email Founder
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Built on Modern Technology</h2>
            <p className="text-lg text-slate-400">
              The stack behind {companyName}. Chosen for performance, security, and the ability to scale without rewriting everything in two years.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {techStack.map((stack, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/20 transition-all"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <stack.icon className="h-4 w-4 text-amber-400" />
                  </div>
                  <h3 className="text-base font-semibold text-white">{stack.category}</h3>
                </div>
                <ul className="space-y-2">
                  {stack.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-400">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Journey Timeline ── */}
      <section className="relative py-24 bg-[#161B26]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(211,166,56,0.04),transparent_70%)]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How We Got Here</h2>
            <p className="text-lg text-slate-400">From one person with an idea to an invite-only beta built alongside early adopters.</p>
          </motion.div>
          <div className="relative">
            {milestones.map((milestone, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative pl-12 pb-10 last:pb-0"
              >
                {/* Vertical line */}
                {i < milestones.length - 1 && (
                  <div className="absolute left-[18px] top-12 bottom-0 w-px bg-gradient-to-b from-amber-500/40 via-amber-500/20 to-transparent" />
                )}
                {/* Dot */}
                <div className="absolute left-0 top-0 w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <milestone.icon className="h-4 w-4 text-amber-400" />
                </div>
                <div className="ml-2">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">
                    {milestone.year}
                  </span>
                  <h3 className="text-lg font-semibold text-white mt-1 mb-2">{milestone.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{milestone.event}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="relative py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="p-10 sm:p-14 rounded-3xl bg-gradient-to-br from-amber-500/[0.10] via-white/[0.02] to-transparent border border-amber-500/20"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Want to See What Valtriox Can Do For Your Brand?
            </h2>
            <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
              Book a free 30-minute walkthrough. We will show you the platform, answer your questions, and help you figure out if it fits your business. No pressure, no sales scripts, just a real conversation.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-600/20"
              >
                Book a Free Walkthrough
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-slate-300 font-medium hover:bg-white/5 hover:text-white transition-all"
              >
                Explore Features
              </a>
            </div>
            <p className="mt-8 text-sm text-slate-500">
              Built and maintained by Muhammad Ashir Raza
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}

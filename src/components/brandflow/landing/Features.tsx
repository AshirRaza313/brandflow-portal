"use client";

import { motion } from "framer-motion";
import {
  ShoppingCart,
  Brain,
  Users,
  Package,
  Megaphone,
  BarChart3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { usePlatformIdentity } from "@/lib/platform-identity";

const features = [
  {
    icon: ShoppingCart,
    title: "Order Management",
    description:
      "Track every order from placement to delivery with SLA monitoring and priority scoring.",
    color: "emerald",
  },
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description:
      "Get daily briefings, sales forecasts, and smart recommendations powered by AI.",
    color: "amber",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Role-based access for 8+ team roles with real-time sync and task boards.",
    color: "emerald",
  },
  {
    icon: Package,
    title: "Inventory Control",
    description:
      "Multi-location stock tracking with low-stock alerts and AI restock predictions.",
    color: "amber",
  },
  {
    icon: Megaphone,
    title: "Marketing Hub",
    description:
      "AI content writer, seasonal campaigns, influencer tracking, and WhatsApp integration.",
    color: "emerald",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Revenue tracking, expense management, PDF reports, and team leaderboards.",
    color: "amber",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function Features() {
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;

  return (
    <section id="features" className="py-24 bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
            Features
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">
            Everything Your Brand Needs.{" "}
            <span className="text-amber-400">One Platform.</span>
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            From order tracking to AI-powered insights, {companyName} gives you every tool to run your brand efficiently.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={cardVariants}>
              <Card className="group h-full border-white/10 bg-white/[0.03] backdrop-blur-sm hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 cursor-default">
                <CardContent className="p-6">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                      feature.color === "emerald"
                        ? "bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white"
                        : "bg-yellow-100 text-yellow-600 group-hover:bg-yellow-600 group-hover:text-white"
                    } transition-colors duration-300`}
                  >
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

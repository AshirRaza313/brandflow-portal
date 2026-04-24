"use client";

import { motion } from "framer-motion";
import { DollarSign, ShoppingCart, Users, Star, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useBrandForgeStore } from "@/store/brandflow-store";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function KPICards() {
  const { appTheme } = useBrandForgeStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || appTheme === "premium-dark";

  const kpis = [
    {
      label: "Total Revenue",
      value: "Rs. 0.00",
      change: "0%",
      trend: "neutral" as const,
      icon: DollarSign,
      iconBg: isGold ? "bg-amber-500/10" : "bg-emerald-100",
      iconColor: isGold ? "text-amber-400" : "text-emerald-600",
    },
    {
      label: "Active Orders",
      value: "0",
      change: "0",
      trend: "neutral" as const,
      icon: ShoppingCart,
      iconBg: isGold ? "bg-amber-500/10" : "bg-amber-100",
      iconColor: isGold ? "text-amber-400" : "text-amber-600",
    },
    {
      label: "Customers",
      value: "0",
      change: "0",
      trend: "neutral" as const,
      icon: Users,
      iconBg: isGold ? "bg-amber-500/10" : "bg-blue-100",
      iconColor: isGold ? "text-amber-400" : "text-blue-600",
    },
    {
      label: "Satisfaction",
      value: "—",
      change: "No data",
      trend: "neutral" as const,
      icon: Star,
      iconBg: isGold ? "bg-amber-500/10" : "bg-purple-100",
      iconColor: isGold ? "text-amber-400" : "text-purple-600",
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
    >
      {kpis.map((kpi) => (
        <motion.div key={kpi.label} variants={cardVariants}>
          <Card
            className={`kpi-gold-shimmer overflow-hidden transition-all duration-300 ${
              isGold
                ? "bg-white/[0.03] border border-white/[0.06] border-t-2 border-t-amber-500/30 backdrop-blur-sm hover:bg-white/[0.06] hover:border-amber-500/20 hover:shadow-[0_4px_20px_rgba(212,160,23,0.08)]"
                : isDark
                ? "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:shadow-lg"
                : "bg-white border-slate-200 hover:shadow-lg hover:border-slate-300"
            }`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${kpi.iconBg} flex items-center justify-center`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{kpi.value}</p>
              <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{kpi.label}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

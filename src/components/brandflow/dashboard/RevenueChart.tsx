"use client";

import { useValtrioxStore } from "@/store/brandflow-store";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export function RevenueChart() {
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme === "dark" || appTheme === "premium-dark";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className={isDark ? "text-base font-semibold text-white" : "text-base font-semibold text-slate-900"}>
              Revenue Trend
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full flex items-center justify-center">
            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <h3 className={isDark ? "text-sm font-semibold text-slate-300 mb-1" : "text-sm font-semibold text-slate-700 mb-1"}>No revenue data yet</h3>
              <p className="text-xs text-muted-foreground">Start selling to see your revenue trend here.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

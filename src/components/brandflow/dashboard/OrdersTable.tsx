"use client";

import { useValtrioxStore } from "@/store/brandflow-store";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag } from "lucide-react";

export function OrdersTable() {
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme === "dark" || appTheme === "premium-dark";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className={isDark ? "text-base font-semibold text-white" : "text-base font-semibold text-slate-900"}>
              Recent Orders
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <ShoppingBag className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No orders yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">When customers place orders, they&apos;ll appear here.</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

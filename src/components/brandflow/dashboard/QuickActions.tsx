"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, FileBarChart, Brain } from "lucide-react";
import { useBrandForgeStore } from "@/store/brandflow-store";
import { toast } from "sonner";

const actions = [
  { label: "New Order", icon: ShoppingCart, section: "orders", color: "bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white" },
  { label: "Add Product", icon: Plus, section: "add-product", color: "bg-amber-100 text-amber-600 hover:bg-amber-600 hover:text-white" },
  { label: "View Reports", icon: FileBarChart, section: "sales-reports", color: "bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white" },
  { label: "AI Chat", icon: Brain, section: "ai-assistant", color: "bg-purple-100 text-purple-600 hover:bg-purple-600 hover:text-white" },
];

export function QuickActions() {
  const { setActiveSection } = useBrandForgeStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {actions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className={`h-auto py-4 flex-col gap-2 border-slate-200 ${action.color} transition-all duration-200`}
                onClick={() => setActiveSection(action.section)}
              >
                <action.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

"use client";

import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent } from "@/components/ui/card";
import { Warehouse, Package, ArrowDown, ArrowUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function WarehouseStatsWidget() {
  const { appTheme, setActiveSection } = useValtrioxStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const cardClass = isGold
    ? "bg-slate-800/50 border-slate-700/50"
    : isDark
      ? "bg-slate-800/50 border-slate-700/50"
      : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textMuted = isDark ? "text-slate-400" : "text-muted-foreground";
  const accentColor = isGold ? "text-amber-400" : "text-amber-500";
  const accentBg = isGold ? "bg-amber-500/10" : "bg-amber-100";

  const metrics = [
    { icon: Package, label: "In Stock", value: "2,340", color: accentColor },
    { icon: ArrowDown, label: "Inbound", value: "156", color: isGold ? "text-cyan-400" : "text-cyan-600" },
    { icon: ArrowUp, label: "Outbound", value: "89", color: isGold ? "text-emerald-400" : "text-emerald-600" },
    { icon: Clock, label: "Pending", value: "23", color: isGold ? "text-amber-400" : "text-amber-500" },
  ];

  return (
    <Card className={cn("transition-all duration-300", cardClass)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", accentBg)}>
            <Warehouse className={cn("h-4 w-4", accentColor)} />
          </div>
          <div>
            <p className={cn("text-xs font-semibold", textPrimary)}>Warehouse</p>
            <p className={cn("text-[10px]", textMuted)}>Inventory status</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {metrics.map((m) => (
            <div key={m.label} className={cn("p-2 rounded-lg", isDark ? "bg-white/[0.02] border border-white/[0.04]" : "bg-slate-50")}>
              <m.icon className={cn("h-3 w-3 mb-1", m.color)} />
              <p className={cn("text-sm font-bold", textPrimary)}>{m.value}</p>
              <p className={cn("text-[10px]", textMuted)}>{m.label}</p>
            </div>
          ))}
        </div>
        <button className={cn("w-full text-[10px] font-medium text-center py-1 rounded-md transition-colors", isDark ? "text-amber-400 hover:bg-amber-500/10" : "text-amber-600 hover:bg-amber-50")} onClick={() => setActiveSection("warehouse")}>
          Manage Warehouse →
        </button>
      </CardContent>
    </Card>
  );
}

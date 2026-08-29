"use client";

import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function SLAMonitorWidget() {
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

 return (
    <Card className={cn("transition-all duration-300", cardClass)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", accentBg)}>
            <ShieldCheck className={cn("h-4 w-4", accentColor)} />
          </div>
          <div>
            <p className={cn("text-xs font-semibold", textPrimary)}>SLA Monitor</p>
            <p className={cn("text-[10px]", textMuted)}>Compliance tracking</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-4 space-y-2">
          <Clock className={cn("h-6 w-6", textMuted)} />
          <p className={cn("text-xs text-center", textMuted)}>No SLA rules configured yet</p>
          <p className={cn("text-[10px] text-center", textMuted)}>Set up SLA rules from the operations panel</p>
        </div>
        <button className={cn("w-full text-[10px] font-medium text-center py-1 rounded-md transition-colors", isDark ? "text-amber-400 hover:bg-amber-500/10" : "text-amber-600 hover:bg-amber-50")} onClick={() => setActiveSection("sla-engine")}>
          Configure SLA →
        </button>
      </CardContent>
    </Card>
  );
}

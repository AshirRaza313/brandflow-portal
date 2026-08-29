"use client";

import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
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

  const slaRules = [
    { name: "Order Dispatch", sla: "99.9%", met: true },
    { name: "Delivery SLA", sla: "99.5%", met: true },
    { name: "Support Response", sla: "95%", met: false },
    { name: "Return Processing", sla: "98%", met: true },
  ];

  return (
    <Card className={cn("transition-all duration-300", cardClass)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", accentBg)}>
            <ShieldCheck className={cn("h-4 w-4", accentColor)} />
          </div>
          <div>
            <p className={cn("text-xs font-semibold", textPrimary)}>SLA Monitor</p>
            <p className={cn("text-[10px]", textMuted)}>{slaRules.filter(r => r.met).length}/{slaRules.length} compliant</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {slaRules.map((rule) => (
            <div key={rule.name} className={cn("flex items-center justify-between p-2 rounded-lg", isDark ? "bg-white/[0.02] border border-white/[0.04]" : "bg-slate-50")}>
              <div className="flex items-center gap-2">
                {rule.met ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-red-400" />
                )}
                <span className={cn("text-xs", textPrimary)}>{rule.name}</span>
              </div>
              <span className={cn("text-[10px] font-mono font-medium", rule.met ? (isGold ? "text-emerald-400" : "text-emerald-600") : (isGold ? "text-red-400" : "text-red-600"))}>
                {rule.sla}
              </span>
            </div>
          ))}
        </div>
        <button className={cn("w-full text-[10px] font-medium text-center py-1 rounded-md transition-colors", isDark ? "text-amber-400 hover:bg-amber-500/10" : "text-amber-600 hover:bg-amber-50")} onClick={() => setActiveSection("sla-engine")}>
          SLA Details →
        </button>
      </CardContent>
    </Card>
  );
}

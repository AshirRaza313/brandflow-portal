"use client";

import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { TIER_COLORS, getNextPlanTier } from "@/lib/dashboard-tiers";

interface WidgetLockedCardProps {
  widgetLabel: string;
  requiredPlan: string;
  currentPlan: string;
}

export function WidgetLockedCard({ widgetLabel, requiredPlan, currentPlan }: WidgetLockedCardProps) {
  const { setActiveSection, appTheme } = useValtrioxStore();
  const t = useTranslation();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const cardClass = isGold
    ? "bg-slate-800/50 border-slate-700/50"
    : isDark
    ? "bg-slate-800/50 border-slate-700/50"
    : "bg-white border-slate-200";

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textMuted = isDark ? "text-slate-400" : "text-muted-foreground";

  const tierColors = TIER_COLORS[requiredPlan] || TIER_COLORS.starter;
  const nextPlan = getNextPlanTier(currentPlan);
  const planDisplayName = requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1);

  return (
    <Card className={cn("transition-all duration-300 relative overflow-hidden group", cardClass)}>
      {/* Glass overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 gap-2 backdrop-blur-sm bg-gradient-to-b from-white/5 to-transparent">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", tierColors.bg, `border ${tierColors.border}`)}>
          <Lock className={cn("h-4 w-4", tierColors.text)} />
        </div>
        <p className={cn("text-xs font-semibold", textPrimary)}>{widgetLabel}</p>
        <p className={cn("text-[10px] text-center", textMuted)}>
          {t("requiresPlan", { plan: planDisplayName })}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-3 text-[10px] rounded-lg gap-1 mt-1 transition-all",
            isGold
              ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
              : "bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700"
          )}
          onClick={() => setActiveSection("subscriptions")}
        >
          <Crown className="h-3 w-3" />
          {nextPlan ? t("upgradeToPlan", { plan: nextPlan.charAt(0).toUpperCase() + nextPlan.slice(1) }) : t("upgradePlan")}
          <ArrowRight className="h-2.5 w-2.5" />
        </Button>
      </div>
      {/* Blurred content behind (empty placeholder) */}
      <CardContent className="p-4 opacity-20 blur-[1px]">
        <div className="space-y-2">
          <div className={cn("h-3 w-20 rounded", isDark ? "bg-white/10" : "bg-slate-200")} />
          <div className={cn("h-8 w-16 rounded", isDark ? "bg-white/10" : "bg-slate-200")} />
          <div className={cn("h-2 w-full rounded", isDark ? "bg-white/5" : "bg-slate-100")} />
          <div className={cn("h-2 w-3/4 rounded", isDark ? "bg-white/5" : "bg-slate-100")} />
        </div>
      </CardContent>
    </Card>
  );
}





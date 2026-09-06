"use client";

import { useMemo } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { useSubscriptionSync } from "@/hooks/useSubscriptionSync";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import {
  getAvailableWidgets,
  getLockedWidgets,
  ALL_WIDGETS,
  TIER_COLORS,
  getNextPlanTier,
  countNewWidgetsOnUpgrade,
  type DashboardWidgetDef,
} from "@/lib/dashboard-tiers";
import { isPlatformBypassRole } from "@/lib/feature-lock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, ArrowUpRight, Sparkles, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

// ── Widget Components ──
import { StorageUsageWidget } from "./widgets/StorageUsageWidget";
import { CampaignPerformanceWidget } from "./widgets/CampaignPerformanceWidget";
import { CouponAnalyticsWidget } from "./widgets/CouponAnalyticsWidget";
import { AIInsightsWidget } from "./widgets/AIInsightsWidget";
import { SEOMetricsWidget } from "./widgets/SEOMetricsWidget";
import { TaskProgressWidget } from "./widgets/TaskProgressWidget";
import { EmailStatsWidget } from "./widgets/EmailStatsWidget";
import { SocialAnalyticsWidget } from "./widgets/SocialAnalyticsWidget";
import { MarketingCalendarWidget } from "./widgets/MarketingCalendarWidget";
import { WarehouseStatsWidget } from "./widgets/WarehouseStatsWidget";
import { SLAMonitorWidget } from "./widgets/SLAMonitorWidget";
import { AuditLogWidget } from "./widgets/AuditLogWidget";
import { PredictiveAnalyticsWidget } from "./widgets/PredictiveAnalyticsWidget";
import { RevenueForecastWidget } from "./widgets/RevenueForecastWidget";
import { WidgetLockedCard } from "./widgets/WidgetLockedCard";

// ── Widget Renderer Registry ──
// Maps widget IDs to their components. Widgets without a renderer show locked state.

interface WidgetRendererMap {
  [key: string]: React.ComponentType;
}

const WIDGET_RENDERERS: WidgetRendererMap = {
  "storage-usage": StorageUsageWidget,
  "campaign-performance": CampaignPerformanceWidget,
  "coupon-analytics": CouponAnalyticsWidget,
  "ai-insights": AIInsightsWidget,
  "seo-metrics": SEOMetricsWidget,
  "task-progress": TaskProgressWidget,
  "email-stats": EmailStatsWidget,
  "social-analytics": SocialAnalyticsWidget,
  "marketing-calendar": MarketingCalendarWidget,
  "warehouse-stats": WarehouseStatsWidget,
  "sla-monitor": SLAMonitorWidget,
  "audit-log": AuditLogWidget,
  "predictive-analytics": PredictiveAnalyticsWidget,
  "revenue-forecast": RevenueForecastWidget,
};

// ============================================================================
// DashboardGrid - Main Component
// ============================================================================

export function DashboardGrid() {
  const { appTheme, setActiveSection } = useValtrioxStore();
  const t = useTranslation();
  const user = useValtrioxStore(s => s.user);
  const { subscriptionPlan } = useSubscriptionSync();
  const isPlatformRole = isPlatformBypassRole(user?.role || "");
  const effectivePlan = isPlatformRole ? "enterprise" : subscriptionPlan;

  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textMuted = isDark ? "text-slate-400" : "text-muted-foreground";

  // Available and locked widgets for the current plan
  const availableWidgets = useMemo(
    () => getAvailableWidgets(effectivePlan),
    [effectivePlan]
  );
  const lockedWidgets = useMemo(
    () => getLockedWidgets(effectivePlan),
    [effectivePlan]
  );

  const nextPlan = useMemo(
    () => getNextPlanTier(effectivePlan),
    [effectivePlan]
  );
  const newWidgetCount = useMemo(
    () => nextPlan ? countNewWidgetsOnUpgrade(effectivePlan, nextPlan) : 0,
    [effectivePlan, nextPlan]
  );

  // Plan badge styling
  const planColors = TIER_COLORS[effectivePlan] || TIER_COLORS.starter;
  const planDisplayName = effectivePlan.charAt(0).toUpperCase() + effectivePlan.slice(1);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ─── Section Header with Plan Badge ─── */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-2"
      >
        <div className="flex items-center gap-3">
          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", planColors.bg, `border ${planColors.border}`)}>
            <Sparkles className={cn("h-4 w-4", planColors.text)} />
          </div>
          <div>
            <h2 className={cn("text-sm font-bold", textPrimary)}>
              Dashboard Widgets
            </h2>
            <p className={cn("text-[10px]", textMuted)}>
              {t("widgetsActiveTotal", { active: availableWidgets.length, total: ALL_WIDGETS.length })}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border font-medium",
              planColors.bg,
              planColors.text,
              planColors.border
            )}
          >
            {planDisplayName}
          </Badge>
        </div>

        {/* Upgrade CTA for non-enterprise users */}
        {nextPlan && newWidgetCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-3 text-[11px] rounded-lg gap-1.5",
              isGold
                ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
                : "bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700"
            )}
            onClick={() => setActiveSection("subscriptions")}
          >
            <Crown className="h-3 w-3" />
            {t("unlockMoreWidgets", { count: newWidgetCount })}
            <ArrowUpRight className="h-3 w-3" />
          </Button>
        )}
      </motion.div>

      {/* ─── Available Widgets Grid ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {availableWidgets.map((widget, idx) => {
          const WidgetComponent = WIDGET_RENDERERS[widget.id];
          if (WidgetComponent) {
            return (
              <motion.div
                key={widget.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.3 }}
              >
                <WidgetComponent />
              </motion.div>
            );
          }
          // If no renderer exists, skip (these are handled by the main dashboard)
          return null;
        })}
      </div>

      {/* ─── Locked Widgets Section (show up to 4) ─── */}
      {lockedWidgets.length > 0 && nextPlan && (
        <div className="mt-6 space-y-3">
          {/* Locked section header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("h-6 w-6 rounded-md flex items-center justify-center", TIER_COLORS[nextPlan].bg, `border ${TIER_COLORS[nextPlan].border}`)}>
                <Crown className={cn("h-3 w-3", TIER_COLORS[nextPlan].text)} />
              </div>
              <p className={cn("text-xs font-semibold", textPrimary)}>
                {t("unlockWithPlan", { plan: nextPlan.charAt(0).toUpperCase() + nextPlan.slice(1) })}
              </p>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] px-1.5 py-0 rounded-full border",
                  TIER_COLORS[nextPlan].bg,
                  TIER_COLORS[nextPlan].text,
                  TIER_COLORS[nextPlan].border
                )}
              >
                +{newWidgetCount} widgets
              </Badge>
            </div>
            <button
              className={cn(
                "text-[10px] font-medium flex items-center gap-0.5",
                isDark ? "text-amber-400 hover:text-amber-300" : "text-amber-600 hover:text-amber-700"
              )}
              onClick={() => setActiveSection("subscriptions")}
            >
              Upgrade <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {/* Locked widget cards (show up to 4) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {lockedWidgets.slice(0, 4).map((widget, idx) => (
              <motion.div
                key={`locked-${widget.id}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                <WidgetLockedCard
                  widgetLabel={widget.label}
                  requiredPlan={widget.minTier}
                  currentPlan={effectivePlan}
                />
              </motion.div>
            ))}
          </div>

          {/* "Show all locked" link */}
          {lockedWidgets.length > 4 && (
            <div className="text-center">
              <button
                className={cn(
                  "text-[10px] font-medium inline-flex items-center gap-0.5",
                  isDark ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-600"
                )}
                onClick={() => setActiveSection("subscriptions")}
              >
                {t("moreWidgetsAvailable", { count: lockedWidgets.length - 4 })}
                <ArrowUpRight className="h-2.5 w-2.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}




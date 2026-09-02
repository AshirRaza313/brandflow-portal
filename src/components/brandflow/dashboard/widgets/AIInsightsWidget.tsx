"use client";

import { useEffect, useState, useCallback } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, TrendingUp, Mail, Users, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useTranslation } from "@/lib/i18n";

interface AIInsight {
  id: string;
  icon: "trending" | "mail" | "users" | "revenue";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
}

// No hardcoded fallbacks — only real AI insights or empty state

export function AIInsightsWidget() {
  const { organization, appTheme } = useValtrioxStore();
  const t = useTranslation();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAIGenerated, setIsAIGenerated] = useState(false);

  const fetchInsights = useCallback(async () => {
    const orgId = organization?.id;
    if (!orgId) {
      setInsights([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Only source of truth is the AI endpoint
      const aiRes = await fetchWithAuth(`/api/ai/insights?orgId=${encodeURIComponent(orgId)}`);
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        if (Array.isArray(aiData.insights) && aiData.insights.length > 0) {
          setInsights(aiData.insights);
          setIsAIGenerated(true);
          setLoading(false);
          return;
        }
      }
    } catch {
      // AI endpoint not available
    }
    setInsights([]);
    setLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const cardClass = isGold
    ? "bg-slate-800/50 border-slate-700/50"
    : isDark
    ? "bg-slate-800/50 border-slate-700/50"
    : "bg-white border-slate-200";

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-400" : "text-muted-foreground";
  const accentColor = isGold ? "text-amber-400" : "text-amber-500";
  const accentBg = isGold ? "bg-amber-500/10" : "bg-amber-100";

  const getIconForType = (type: string) => {
    switch (type) {
      case "mail": return Mail;
      case "users": return Users;
      case "revenue":
      case "trending": return TrendingUp;
      default: return Sparkles;
    }
  };

  const getImpactStyle = (impact: string) => {
    switch (impact) {
      case "high":
        return isDark
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
          : "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "medium":
        return isDark
          ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
          : "bg-amber-50 text-amber-600 border-amber-200";
      default:
        return isDark
          ? "bg-slate-500/15 text-slate-400 border-slate-500/20"
          : "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  if (loading) {
    return (
      <Card className={cn("transition-all duration-300", cardClass)}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="flex items-center gap-2">
            <Sparkles className={cn("h-4 w-4 animate-pulse", accentColor)} />
            <span className={cn("text-xs", textMuted)}>{t("aiGenerating")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("transition-all duration-300", cardClass)}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", accentBg)}>
              <Sparkles className={cn("h-4 w-4", accentColor)} />
            </div>
            <div>
              <p className={cn("text-xs font-semibold", textPrimary)}>{t("aiInsights")}</p>
              {isAIGenerated && (
                <p className={cn("text-[10px]", textMuted)}>{t("aiPowered")}</p>
              )}
            </div>
          </div>
          <button
            onClick={fetchInsights}
            className={cn("p-1.5 rounded-md transition-colors", isDark ? "hover:bg-white/[0.06]" : "hover:bg-slate-100")}
          >
            <RefreshCw className={cn("h-3 w-3", textMuted)} />
          </button>
        </div>

        {/* Insights list */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {insights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 px-3">
              <Sparkles className={cn("h-5 w-5 mb-2", textMuted)} />
              <p className={cn("text-[11px] text-center", textMuted)}>
                {t("aiInsightsNoData")}
              </p>
            </div>
          ) : insights.map((insight) => {
            const Icon = getIconForType(insight.icon);
            return (
              <div
                key={insight.id}
                className={cn("p-2.5 rounded-lg flex gap-2.5", isDark ? "bg-white/[0.02] border border-white/[0.04]" : "bg-slate-50")}
              >
                <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0", accentBg)}>
                  <Icon className={cn("h-3.5 w-3.5", accentColor)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className={cn("text-xs font-medium", textPrimary)}>{insight.title}</p>
                    <span className={cn(
                      "text-[9px] px-1.5 py-px rounded-full border font-medium capitalize",
                      getImpactStyle(insight.impact)
                    )}>
                      {insight.impact}
                    </span>
                  </div>
                  <p className={cn("text-[10px] leading-relaxed", textMuted)}>{insight.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}





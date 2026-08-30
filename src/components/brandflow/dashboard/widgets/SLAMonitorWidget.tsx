"use client";

import { useEffect, useState, useCallback } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Clock, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useTranslation } from "@/lib/i18n";

interface SLARule {
  id: string;
  name: string;
  fromStatus: string;
  toStatus: string;
  timeLimitHours: number;
  responsibleRole: string;
  escalationAction: string;
  enabled: boolean;
}

export function SLAMonitorWidget() {
  const { organization, appTheme, setActiveSection } = useValtrioxStore();
  const t = useTranslation();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const [rules, setRules] = useState<SLARule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchRules = useCallback(async () => {
    const orgId = organization?.id;
    if (!orgId) {
      setRules([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const res = await fetchWithAuth(`/api/sla/rules?orgId=${encodeURIComponent(orgId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rules)) {
          setRules(data.rules);
          setLoading(false);
          return;
        }
      }
      setError(true);
    } catch {
      setError(true);
    }
    setRules([]);
    setLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const cardClass = isGold
    ? "bg-slate-800/50 border-slate-700/50"
    : isDark
      ? "bg-slate-800/50 border-slate-700/50"
      : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textMuted = isDark ? "text-slate-400" : "text-muted-foreground";
  const accentColor = isGold ? "text-amber-400" : "text-amber-500";
  const accentBg = isGold ? "bg-amber-500/10" : "bg-amber-100";
  const activeCount = rules.filter((r) => r.enabled).length;

  if (error) {
    return (
      <Card className={cn("transition-all duration-300", cardClass)}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", accentBg)}>
              <ShieldCheck className={cn("h-4 w-4", accentColor)} />
            </div>
            <div>
              <p className={cn("text-xs font-semibold", textPrimary)}>{t("slaRules")}</p>
              <p className={cn("text-[10px]", textMuted)}>{t("slaRulesDesc")}</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-4 space-y-2">
            <Clock className={cn("h-6 w-6", textMuted)} />
            <p className={cn("text-xs text-center", textMuted)}>{t("slaError")}</p>
            <button
              className={cn("text-[10px] font-medium px-3 py-1 rounded-md transition-colors", isDark ? "text-amber-400 hover:bg-amber-500/10" : "text-amber-600 hover:bg-amber-50")}
              onClick={fetchRules}
            >
              {t("slaRetry")}
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={cn("transition-all duration-300", cardClass)}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="flex items-center gap-2">
            <Loader2 className={cn("h-4 w-4 animate-spin", textMuted)} />
            <span className={cn("text-xs", textMuted)}>{t("slaLoading")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("transition-all duration-300", cardClass)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", accentBg)}>
              <ShieldCheck className={cn("h-4 w-4", accentColor)} />
            </div>
            <div>
              <p className={cn("text-xs font-semibold", textPrimary)}>{t("slaRules")}</p>
              <p className={cn("text-[10px]", textMuted)}>{t("slaRulesDesc")}</p>
            </div>
          </div>
          {rules.length > 0 && (
            <span className={cn("text-[10px] font-medium", isDark ? "text-emerald-400" : "text-emerald-600")}>
              {activeCount}/{rules.length} {t("slaActive")}
            </span>
          )}
        </div>
        {rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 space-y-2">
            <Clock className={cn("h-6 w-6", textMuted)} />
            <p className={cn("text-xs text-center", textMuted)}>{t("slaNoRules")}</p>
            <p className={cn("text-[10px] text-center", textMuted)}>{t("slaNoRulesDesc")}</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {rules.slice(0, 4).map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  "p-2 rounded-lg flex items-center justify-between gap-2",
                  isDark ? "bg-white/[0.02] border border-white/[0.04]" : "bg-slate-50"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[11px] font-medium truncate", textPrimary)}>{rule.name}</p>
                  <div className={cn("flex items-center gap-1 mt-0.5 text-[10px]", textMuted)}>
                    <span>{rule.fromStatus}</span>
                    <ArrowRight className="h-2.5 w-2.5" />
                    <span>{rule.toStatus}</span>
                    <span className="ml-1">· {rule.timeLimitHours}h</span>
                  </div>
                </div>
                <span
                  className={cn(
                    "text-[8px] px-1.5 py-px rounded-full border font-medium",
                    rule.enabled
                      ? isDark
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                        : "bg-emerald-50 text-emerald-600 border-emerald-200"
                      : isDark
                        ? "bg-slate-500/15 text-slate-400 border-slate-500/20"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                  )}
                >
                  {rule.enabled ? t("slaEnabled") : t("slaDisabled")}
                </span>
              </div>
            ))}
          </div>
        )}
        <button
          className={cn(
            "w-full text-[10px] font-medium text-center py-1 rounded-md transition-colors",
            isDark ? "text-amber-400 hover:bg-amber-500/10" : "text-amber-600 hover:bg-amber-50"
          )}
          onClick={() => setActiveSection("sla-engine")}
        >
          {t("slaConfigure")} →
        </button>
      </CardContent>
    </Card>
  );
}
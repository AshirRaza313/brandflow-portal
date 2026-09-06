"use client";

import { useEffect, useState, useCallback } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone, Eye, MousePointerClick, Loader2, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { motion } from "framer-motion";

interface CampaignData {
  activeCampaigns: number;
  totalReach: number;
  conversionRate: number;
  recentCampaigns: Array<{
    id: string;
    name: string;
    status: string;
    reach: number;
    conversions: number;
  }>;
}

export function CampaignPerformanceWidget() {
  const { organization, appTheme, setActiveSection } = useValtrioxStore();
  const t = useTranslation();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const [data, setData] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    const orgId = organization?.id;
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Campaign data from broadcasts API
      const brRes = await fetchWithAuth(`/api/broadcasts?orgId=${encodeURIComponent(orgId)}&limit=5`);
      if (brRes.ok) {
        const brData = await brRes.json();
        // Build campaign summary from available data
        const broadcasts = Array.isArray(brData) ? brData : brData.broadcasts || [];
        setData({
          activeCampaigns: broadcasts.filter((b: any) => b.status === "active" || b.status === "sent").length || 0,
          totalReach: broadcasts.reduce((sum: number, b: any) => sum + (b.recipientCount || 0), 0),
          conversionRate: 0,
          recentCampaigns: broadcasts.slice(0, 3).map((b: any) => ({
            id: b.id,
            name: b.name || b.title || "Campaign",
            status: b.status || "sent",
            reach: b.recipientCount || 0,
            conversions: 0,
          })),
        });
      } else {
        // Fallback placeholder data
        setData({
          activeCampaigns: 0,
          totalReach: 0,
          conversionRate: 0,
          recentCampaigns: [],
        });
      }
    } catch {
      setData({
        activeCampaigns: 0,
        totalReach: 0,
        conversionRate: 0,
        recentCampaigns: [],
      });
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

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

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  if (loading) {
    return (
      <Card className={cn("transition-all duration-300", cardClass)}>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className={cn("h-5 w-5 animate-spin", accentColor)} />
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
              <Megaphone className={cn("h-4 w-4", accentColor)} />
            </div>
            <p className={cn("text-xs font-semibold", textPrimary)}>{t("campaignPerformanceTitle")}</p>
          </div>
          <button
            className={cn("text-[10px] font-medium flex items-center gap-0.5", isDark ? "text-amber-400 hover:text-amber-300" : "text-amber-600 hover:text-amber-700")}
            onClick={() => setActiveSection("broadcasts")}
          >
            View All <ArrowUpRight className="h-2.5 w-2.5" />
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className={cn("p-2 rounded-lg", isDark ? "bg-white/[0.03]" : "bg-slate-50")}>
            <p className={cn("text-[10px]", textMuted)}>{t("campaignPerformanceActive")}</p>
            <p className={cn("text-base font-bold", textPrimary)}>{data?.activeCampaigns || 0}</p>
          </div>
          <div className={cn("p-2 rounded-lg", isDark ? "bg-white/[0.03]" : "bg-slate-50")}>
            <div className="flex items-center gap-1">
              <Eye className={cn("h-2.5 w-2.5", textMuted)} />
              <p className={cn("text-[10px]", textMuted)}>{t("campaignPerformanceReach")}</p>
            </div>
            <p className={cn("text-base font-bold", textPrimary)}>{formatNumber(data?.totalReach || 0)}</p>
          </div>
          <div className={cn("p-2 rounded-lg", isDark ? "bg-white/[0.03]" : "bg-slate-50")}>
            <div className="flex items-center gap-1">
              <MousePointerClick className={cn("h-2.5 w-2.5", textMuted)} />
              <p className={cn("text-[10px]", textMuted)}>{t("campaignPerformanceConv")}</p>
            </div>
            <p className={cn("text-base font-bold", textPrimary)}>{data?.conversionRate || 0}%</p>
          </div>
        </div>

        {/* Recent campaigns list */}
        {data?.recentCampaigns && data.recentCampaigns.length > 0 && (
          <div className="space-y-1.5">
            {data.recentCampaigns.map((c) => (
              <div key={c.id} className={cn("flex items-center justify-between p-2 rounded-lg", isDark ? "hover:bg-white/[0.03]" : "hover:bg-slate-50")}>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-xs font-medium truncate", textPrimary)}>{c.name}</p>
                  <p className={cn("text-[10px]", textMuted)}>Reach: {formatNumber(c.reach)}</p>
                </div>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize",
                  c.status === "active"
                    ? (isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-600")
                    : (isDark ? "bg-slate-500/15 text-slate-400" : "bg-slate-50 text-slate-600")
                )}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {(!data || data.activeCampaigns === 0) && (
          <div className="text-center py-2">
            <p className={cn("text-xs", textMuted)}>{t("noCampaigns")}</p>
            <button
              className={cn("text-[10px] font-medium mt-1 rounded-md px-2 py-1 transition-colors", isDark ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50")}
              onClick={() => setActiveSection("broadcasts")}
            >
              Create your first campaign →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


"use client";

import { useEffect, useState, useCallback } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent } from "@/components/ui/card";
import { Ticket, Percent, Users, ArrowUpRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface CouponData {
  activeCoupons: number;
  totalRedeemed: number;
  averageDiscount: number;
  topCoupon?: {
    name: string;
    code: string;
    usageCount: number;
  };
}

export function CouponAnalyticsWidget() {
  const { organization, appTheme, setActiveSection } = useValtrioxStore();
  const t = useTranslation();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const [data, setData] = useState<CouponData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCoupons = useCallback(async () => {
    const orgId = organization?.id;
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/coupons?orgId=${encodeURIComponent(orgId)}&limit=50`);
      if (res.ok) {
        const coupons = await res.json();
        const list = Array.isArray(coupons) ? coupons : coupons.coupons || [];
        const active = list.filter((c: any) => c.status === "active" || c.isActive).length;
        const redeemed = list.reduce((sum: number, c: any) => sum + (c.usedCount || c.usageCount || 0), 0);
        const discounts = list.map((c: any) => c.discountValue || c.discount || 0).filter(Boolean);
        const avgDiscount = discounts.length > 0 ? Math.round(discounts.reduce((a: number, b: number) => a + b, 0) / discounts.length) : 0;
        const sorted = [...list].sort((a: any, b: any) => (b.usedCount || b.usageCount || 0) - (a.usedCount || a.usageCount || 0));

        setData({
          activeCoupons: active,
          totalRedeemed: redeemed,
          averageDiscount: avgDiscount,
          topCoupon: sorted[0] ? { name: sorted[0].name || sorted[0].code, code: sorted[0].code, usageCount: sorted[0].usedCount || sorted[0].usageCount || 0 } : undefined,
        });
      } else {
        setData({ activeCoupons: 0, totalRedeemed: 0, averageDiscount: 0 });
      }
    } catch {
      setData({ activeCoupons: 0, totalRedeemed: 0, averageDiscount: 0 });
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

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
              <Ticket className={cn("h-4 w-4", accentColor)} />
            </div>
            <p className={cn("text-xs font-semibold", textPrimary)}>Coupons</p>
          </div>
          <button
            className={cn("text-[10px] font-medium flex items-center gap-0.5", isDark ? "text-amber-400 hover:text-amber-300" : "text-amber-600 hover:text-amber-700")}
            onClick={() => setActiveSection("coupons")}
          >
            Manage <ArrowUpRight className="h-2.5 w-2.5" />
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className={cn("p-2 rounded-lg text-center", isDark ? "bg-white/[0.03]" : "bg-slate-50")}>
            <Ticket className={cn("h-3.5 w-3.5 mx-auto mb-1", accentColor)} />
            <p className={cn("text-base font-bold", textPrimary)}>{data?.activeCoupons || 0}</p>
            <p className={cn("text-[10px]", textMuted)}>Active</p>
          </div>
          <div className={cn("p-2 rounded-lg text-center", isDark ? "bg-white/[0.03]" : "bg-slate-50")}>
            <Users className={cn("h-3.5 w-3.5 mx-auto mb-1", accentColor)} />
            <p className={cn("text-base font-bold", textPrimary)}>{data?.totalRedeemed || 0}</p>
            <p className={cn("text-[10px]", textMuted)}>Redeemed</p>
          </div>
          <div className={cn("p-2 rounded-lg text-center", isDark ? "bg-white/[0.03]" : "bg-slate-50")}>
            <Percent className={cn("h-3.5 w-3.5 mx-auto mb-1", accentColor)} />
            <p className={cn("text-base font-bold", textPrimary)}>{data?.averageDiscount || 0}%</p>
            <p className={cn("text-[10px]", textMuted)}>Avg. Disc.</p>
          </div>
        </div>

        {/* Top Coupon */}
        {data?.topCoupon && (
          <div className={cn("p-2 rounded-lg flex items-center justify-between", isDark ? "bg-white/[0.02] border border-white/[0.04]" : "bg-slate-50")}>
            <div className="min-w-0 flex-1">
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider", textMuted)}>Top Coupon</p>
              <p className={cn("text-xs font-medium truncate", textPrimary)}>{data.topCoupon.name}</p>
            </div>
            <span className={cn(
              "text-[10px] font-mono px-2 py-0.5 rounded-md",
              isGold ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"
            )}>
              {data.topCoupon.code}
            </span>
          </div>
        )}

        {(!data || data.activeCoupons === 0) && (
          <div className="text-center py-2">
            <p className={cn("text-xs", textMuted)}>{t("noCoupons")}</p>
            <button
              className={cn("text-[10px] font-medium mt-1", isDark ? "text-amber-400" : "text-amber-600")}
              onClick={() => setActiveSection("coupons")}
            >
              Create your first coupon →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

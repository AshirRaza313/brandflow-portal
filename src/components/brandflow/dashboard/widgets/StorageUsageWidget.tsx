"use client";

import { useEffect, useState, useCallback } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HardDrive, ArrowUpRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { motion } from "framer-motion";

interface StorageData {
  usedMb: number;
  limitMb: number;
  limitGb: number;
  percent: number;
  status: "ok" | "warning" | "critical";
}

export function StorageUsageWidget() {
  const { organization, appTheme, setActiveSection } = useValtrioxStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const [storage, setStorage] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStorage = useCallback(async () => {
    const orgId = organization?.id;
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/usage/storage");
      if (res.ok) {
        const data = await res.json();
        setStorage(data);
      }
    } catch (err) {
      console.error("Failed to fetch storage usage:", err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchStorage();
  }, [fetchStorage]);

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

  // Color for usage bar
  const getBarColor = (status: string, percent: number) => {
    if (status === "critical" || percent > 90) return "bg-red-500";
    if (status === "warning" || percent > 70) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getBarGlow = (status: string, percent: number) => {
    if (status === "critical" || percent > 90) return "shadow-red-500/30";
    if (status === "warning" || percent > 70) return "shadow-amber-500/30";
    return "shadow-emerald-500/30";
  };

  const getTextColor = (status: string, percent: number) => {
    if (status === "critical" || percent > 90) return isGold ? "text-red-400" : "text-red-600";
    if (status === "warning" || percent > 70) return accentColor;
    return isGold ? "text-emerald-400" : "text-emerald-600";
  };

  const getStatusLabel = (status: string) => {
    if (status === "critical") return "Critical";
    if (status === "warning") return "Warning";
    return "Healthy";
  };

  const formatMb = (mb: number) => {
    if (mb < 1) return `${Math.round(mb * 1024)} KB`;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
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

  if (!storage) return null;

  // Safe defaults for NaN/null values
  const safeUsedMb = storage.usedMb ?? 0;
  const safeLimitMb = storage.limitMb ?? 0;
  const safeLimitGb = storage.limitGb ?? 0;
  const safePercent = Number.isFinite(storage.percent) ? storage.percent : 0;
  const isUnlimited = safeLimitGb === -1 || safeLimitMb === -1;
  const percent = isUnlimited ? -1 : safePercent;

  return (
    <Card className={cn("transition-all duration-300", cardClass)}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", accentBg)}>
              <HardDrive className={cn("h-4 w-4", accentColor)} />
            </div>
            <div>
              <p className={cn("text-xs font-semibold", textPrimary)}>Storage <span className={cn("text-[9px] font-normal", textMuted)}>(est.)</span></p>
              <p className={cn("text-[10px]", textMuted)}>
                {isUnlimited ? "Unlimited" : `${formatMb(safeUsedMb)} / ${safeLimitGb} GB`}
              </p>
            </div>
          </div>
          {!isUnlimited && (
            <span className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full",
              getTextColor(storage.status, percent),
              isDark ? (storage.status === "critical" ? "bg-red-500/15" : storage.status === "warning" ? "bg-amber-500/15" : "bg-emerald-500/15") : (storage.status === "critical" ? "bg-red-50" : storage.status === "warning" ? "bg-amber-50" : "bg-emerald-50")
            )}>
              {getStatusLabel(storage.status)}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {!isUnlimited && (
          <div className="space-y-1.5">
            <div className={cn("h-2 rounded-full overflow-hidden", isDark ? "bg-white/[0.06]" : "bg-slate-100")}>
              <motion.div
                className={cn("h-full rounded-full shadow-sm", getBarColor(storage.status, percent), getBarGlow(storage.status, percent))}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(percent, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <div className="flex items-center justify-between">
            <span className={cn("text-[10px]", textMuted)}>{percent}% used</span>
              <span className={cn("text-[10px]", textMuted)}>
                {formatMb(Math.max(0, safeLimitMb - safeUsedMb))} free
              </span>
            </div>
          </div>
        )}

        {/* Upgrade CTA */}
        {!isUnlimited && percent >= 70 && (
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full h-8 text-xs rounded-lg gap-1.5", isDark ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50")}
            onClick={() => setActiveSection("subscriptions")}
          >
            Upgrade Plan
            <ArrowUpRight className="h-3 w-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

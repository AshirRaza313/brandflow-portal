"use client";

import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ArrowUpRight, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function SEOMetricsWidget() {
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", accentBg)}>
              <Search className={cn("h-4 w-4", accentColor)} />
            </div>
            <div>
              <p className={cn("text-xs font-semibold", textPrimary)}>SEO Metrics</p>
              <p className={cn("text-[10px]", textMuted)}>Last 30 days</p>
            </div>
          </div>
          <button
            className={cn("text-[10px] font-medium flex items-center gap-0.5", isDark ? "text-amber-400 hover:text-amber-300" : "text-amber-600 hover:text-amber-700")}
            onClick={() => setActiveSection("seo-manager")}
          >
            Details <ArrowUpRight className="h-2.5 w-2.5" />
          </button>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Globe className={cn("h-8 w-8 mb-2", textMuted)} style={{ opacity: 0.3 }} />
          <p className={cn("text-xs", textMuted)}>Connect Google Search Console to see SEO metrics</p>
          <button
            className={cn("mt-2 text-[10px] font-medium px-3 py-1.5 rounded-md transition-colors", isDark ? "text-amber-400 hover:bg-amber-500/10" : "text-amber-600 hover:bg-amber-50")}
            onClick={() => setActiveSection("seo-manager")}
          >
            Connect Google Search Console
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

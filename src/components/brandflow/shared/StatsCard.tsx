"use client";

import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useValtrioxStore } from "@/store/brandflow-store";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  changeLabel?: string;
  variant?: "default" | "danger" | "success" | "warning";
  loading?: boolean;
}

export function StatsCard({ title, value, icon: Icon, change, changeLabel, variant = "default", loading }: StatsCardProps) {
  const { appTheme } = useValtrioxStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const cardClasses = cn(
    "border transition-all hover:shadow-md",
    isGold
      ? "bg-white/[0.03] border-white/[0.06] hover:border-amber-500/20"
      : isDark
        ? "bg-white/[0.03] border-white/[0.06] hover:border-amber-500/20"
        : variant === "danger"
          ? "bg-red-50 border-red-200"
          : variant === "success"
            ? "bg-amber-50 border-amber-200"
            : variant === "warning"
              ? "bg-amber-50 border-amber-200"
              : "bg-white"
  );

  const iconClasses = cn(
    "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
    isGold
      ? "bg-amber-500/10 text-amber-400"
      : isDark
        ? variant === "danger"
          ? "bg-red-500/10 text-red-400"
          : variant === "warning"
            ? "bg-amber-500/10 text-amber-400"
            : "bg-amber-500/10 text-amber-400"
        : variant === "danger"
          ? "bg-red-100 text-red-600"
          : variant === "success"
            ? "bg-amber-100 text-amber-600"
            : variant === "warning"
              ? "bg-amber-100 text-amber-600"
              : "bg-amber-100 text-amber-600"
  );

  if (loading) {
    return (
      <Card className={cardClasses}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className={cn("h-4 w-24", isDark ? "bg-white/5" : "")} />
              <Skeleton className={cn("h-8 w-20", isDark ? "bg-white/5" : "")} />
            </div>
            <Skeleton className={cn("h-10 w-10 rounded-lg", isDark ? "bg-white/5" : "")} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClasses}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-xs font-medium uppercase tracking-wider truncate",
              isDark ? "text-slate-400" : "text-muted-foreground"
            )}>
              {title}
            </p>
            <p className={cn("text-2xl font-bold mt-1 truncate", isDark ? "text-white" : "")}>
              {value}
            </p>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                {change >= 0 ? (
                  <TrendingUp className={cn("h-3 w-3", isDark ? "text-amber-400" : "text-amber-500")} />
                ) : (
                  <TrendingDown className={cn("h-3 w-3", isDark ? "text-red-400" : "text-red-500")} />
                )}
                <span className={cn(
                  "text-xs font-medium",
                  change >= 0
                    ? isDark ? "text-amber-400" : "text-amber-600"
                    : isDark ? "text-red-400" : "text-red-600"
                )}>
                  {change >= 0 ? "+" : ""}{change}%
                </span>
                {changeLabel && (
                  <span className={cn("text-xs", isDark ? "text-slate-400" : "text-muted-foreground")}>
                    {changeLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className={iconClasses}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

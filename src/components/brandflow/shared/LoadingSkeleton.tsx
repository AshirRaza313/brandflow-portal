"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useValtrioxStore } from "@/store/brandflow-store";
import { cn } from "@/lib/utils";

export function LoadingSkeleton() {
  const { appTheme } = useValtrioxStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const skeletonBg = isGold ? "bg-amber-500/10" : isDark ? "bg-white/5" : "";

  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className={cn("h-8 w-40", skeletonBg)} />
        <Skeleton className={cn("h-9 w-28", skeletonBg)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className={cn("h-24 rounded-lg", skeletonBg)} />
        ))}
      </div>
      <Skeleton className={cn("h-64 rounded-lg", skeletonBg)} />
      <Skeleton className={cn("h-48 rounded-lg", skeletonBg)} />
    </div>
  );
}

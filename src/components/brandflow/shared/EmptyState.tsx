"use client";
import { useValtrioxStore } from "@/store/brandflow-store";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  const { appTheme } = useValtrioxStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={cn(
        "h-16 w-16 rounded-2xl flex items-center justify-center mb-4",
        isGold ? "bg-amber-500/10" : isDark ? "bg-white/5" : "bg-muted/50"
      )}>
        <Icon className={cn(
          "h-8 w-8",
          isGold ? "text-amber-400/50" : isDark ? "text-slate-500/50" : "text-muted-foreground/50"
        )} />
      </div>
      <h3 className={cn("text-lg font-semibold mb-1", isDark ? "text-white" : "text-foreground")}>
        {title}
      </h3>
      <p className={cn("text-sm max-w-sm mb-4", isDark ? "text-slate-400" : "text-muted-foreground")}>
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
            isGold
              ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black hover:shadow-[0_4px_20px_rgba(212,160,23,0.3)] hover:-translate-y-0.5"
              : "bg-amber-600 hover:bg-amber-700 text-white"
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

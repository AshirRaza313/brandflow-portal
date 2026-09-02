"use client";

import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent } from "@/components/ui/card";
import { ListTodo, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useEffect, useState, useCallback } from "react";

export function TaskProgressWidget() {
  const { organization, appTheme, setActiveSection } = useValtrioxStore();
  const t = useTranslation();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const [stats, setStats] = useState<{ total: number; completed: number; inProgress: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    const orgId = organization?.id;
    if (!orgId) { setLoading(false); return; }
    try {
      const res = await fetchWithAuth(`/api/tasks?orgId=${encodeURIComponent(orgId)}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.tasks || [];
        setStats({
          total: list.length,
          completed: list.filter((t: any) => t.status === "completed" || t.status === "done").length,
          inProgress: list.filter((t: any) => t.status === "in_progress" || t.status === "in-progress").length,
        });
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [organization?.id]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const cardClass = isGold ? "bg-slate-800/50 border-slate-700/50" : isDark ? "bg-slate-800/50 border-slate-700/50" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textMuted = isDark ? "text-slate-400" : "text-muted-foreground";
  const accentColor = isGold ? "text-amber-400" : "text-amber-500";
  const accentBg = isGold ? "bg-amber-500/10" : "bg-amber-100";

  const percent = stats ? Math.round((stats.completed / Math.max(stats.total, 1)) * 100) : 0;

  return (
    <Card className={cn("transition-all duration-300", cardClass)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", accentBg)}>
            <ListTodo className={cn("h-4 w-4", accentColor)} />
          </div>
          <div>
            <p className={cn("text-xs font-semibold", textPrimary)}>{t("taskProgressTitle")}</p>
            <p className={cn("text-[10px]", textMuted)}>{stats ? `${stats.completed}/${stats.total} done` : "Loading..."}</p>
          </div>
        </div>
        {stats && (
          <>
            <div className={cn("h-2 rounded-full overflow-hidden", isDark ? "bg-white/[0.06]" : "bg-slate-100")}>
              <div className={cn("h-full rounded-full", percent >= 80 ? "bg-emerald-500" : percent >= 50 ? "bg-amber-500" : "bg-slate-400")} style={{ width: `${percent}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className={cn("text-sm font-bold", textPrimary)}>{stats.total}</p>
                <p className={cn("text-[10px]", textMuted)}>{t("taskProgressTotal")}</p>
              </div>
              <div>
                <p className={cn("text-sm font-bold", "text-amber-400")}>{stats.inProgress}</p>
                <p className={cn("text-[10px]", textMuted)}>{t("taskProgressActive")}</p>
              </div>
              <div>
                <p className={cn("text-sm font-bold", "text-emerald-400")}>{stats.completed}</p>
                <p className={cn("text-[10px]", textMuted)}>{t("taskProgressDone")}</p>
              </div>
            </div>
          </>
        )}
        <button className={cn("w-full text-[10px] font-medium text-center py-1 rounded-md transition-colors", isDark ? "text-amber-400 hover:bg-amber-500/10" : "text-amber-600 hover:bg-amber-50")} onClick={() => setActiveSection("tasks")}>
          View Tasks →
        </button>
      </CardContent>
    </Card>
  );
}


"use client";

import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Users, Clock, MousePointerClick } from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";

export function TrafficAnalyticsPage() {
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme === "dark" || appTheme === "premium-dark";
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={isDark ? "text-2xl font-bold text-slate-200" : "text-2xl font-bold text-slate-800"}>Traffic Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor visitor behavior, traffic sources, and geographic distribution</p>
        </div>
        <button
          onClick={() => toast.info("Export will be available once traffic data exists")}
          className="px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
        >
          Export Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Page Views", value: "0", icon: Eye },
          { title: "Unique Visitors", value: "0", icon: Users },
          { title: "Avg Session", value: "—", icon: Clock },
          { title: "Bounce Rate", value: "—", icon: MousePointerClick },
        ].map((stat) => (
          <Card key={stat.title} className="border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.title}</p>
                  <p className={isDark ? "text-2xl font-bold text-slate-200 mt-1" : "text-2xl font-bold text-slate-800 mt-1"}>{stat.value}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-8">
          <EmptyState
            icon={Eye}
            title="No traffic data yet"
            description="Traffic data will appear here once your store is live and receiving visitors. Connect your website or storefront to start tracking."
            actionLabel="Set Up Integrations"
            onAction={() => toast.info("Navigate to Integrations from the sidebar")}
          />
        </CardContent>
      </Card>
    </div>
  );
}

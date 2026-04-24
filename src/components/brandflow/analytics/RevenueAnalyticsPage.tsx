"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Percent, BarChart3, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";

export function RevenueAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Revenue Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Comprehensive revenue tracking, profit analysis, and forecasting</p>
        </div>
        <button
          onClick={() => toast.info("Export will be available once revenue data exists")}
          className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
        >
          Export Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Revenue", value: "PKR 0", icon: DollarSign },
          { title: "Net Profit", value: "PKR 0", icon: TrendingUp },
          { title: "Profit Margin", value: "0%", icon: Percent },
          { title: "MRR / ARR", value: "PKR 0", sub: "PKR 0", icon: BarChart3 },
        ].map((stat) => (
          <Card key={stat.title} className="border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
                  {stat.sub && <p className="text-sm text-slate-600">{stat.sub}</p>}
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-8">
          <EmptyState
            icon={TrendingUp}
            title="No revenue data yet"
            description="Revenue data will appear here once you start receiving orders. Connect your sales channels to begin tracking."
            actionLabel="View Orders"
            onAction={() => toast.info("Navigate to Orders from the sidebar")}
          />
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Clock, CheckCircle2, Timer, Play } from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";

export function PackagingPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Packaging Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage packing workflow, materials, and quality control</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => toast.info("No orders in packing queue")}>
          <Package className="mr-2 h-4 w-4" /> Start Packing
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { title: "Orders to Pack", value: "0", icon: Package },
          { title: "In Progress", value: "0", icon: Play },
          { title: "Completed Today", value: "0", icon: CheckCircle2 },
          { title: "Avg Time/Package", value: "—", icon: Timer },
        ].map((stat) => (
          <Card key={stat.title} className="border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.title}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-4">
          <p className="text-base font-semibold text-slate-900 mb-4">Packing Queue</p>
          <EmptyState
            icon={Package}
            title="No orders to pack"
            description="Orders will appear here once they are ready for packaging."
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-base font-semibold text-slate-900 mb-4">Material Inventory</p>
            <EmptyState icon={Package} title="No materials tracked" description="Material inventory will appear once you set up your warehouse." />
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" /> QC Checklist
              </p>
              <span className="text-xs text-slate-400">0/0</span>
            </div>
            <EmptyState icon={CheckCircle2} title="No QC items" description="Quality check items will appear when packing orders." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

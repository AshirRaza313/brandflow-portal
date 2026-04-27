"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RotateCcw, Clock, CheckCircle2, DollarSign, PackageCheck, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";
import { useValtrioxStore } from "@/store/brandflow-store";

interface ReturnPolicy {
  id: number;
  returnWindow: string;
  refundMethod: string;
  restockingFee: string;
}

export function ReturnsPage() {
  const [filterStatus, setFilterStatus] = useState("all");
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  const [policyOpen, setPolicyOpen] = useState(false);
  const [policies, setPolicies] = useState<ReturnPolicy[]>([]);
  const [policyForm, setPolicyForm] = useState({ returnWindow: "", refundMethod: "", restockingFee: "" });

  const handlePolicySubmit = () => {
    if (!policyForm.returnWindow || !policyForm.refundMethod) {
      toast.error("Return window and refund method are required");
      return;
    }
    setPolicies(prev => [
      { id: Date.now(), ...policyForm },
      ...prev,
    ]);
    setPolicyOpen(false);
    setPolicyForm({ returnWindow: "", refundMethod: "", restockingFee: "" });
    toast.success("Return policy saved successfully!");
  };

  const currentPolicy = policies.length > 0 ? policies[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={isDark ? "text-2xl font-bold text-white" : "text-2xl font-bold text-slate-900"}>Returns Management</h1>
          <p className="text-sm text-slate-500 mt-1">Track, process and manage product returns</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => toast.info("Return processing queue is empty")}>
          <RotateCcw className="mr-2 h-4 w-4" /> Process Returns
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Returns", value: "0", icon: RotateCcw },
          { title: "Pending Review", value: "0", icon: Clock },
          { title: "Processing", value: "0", icon: Clock },
          { title: "Refund Amount", value: "Rs. 0", icon: DollarSign },
        ].map((stat) => (
          <Card key={stat.title} className="border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.title}</p>
              <p className={isDark ? "text-2xl font-bold text-white mt-1" : "text-2xl font-bold text-slate-900 mt-1"}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <p className={isDark ? "text-base font-semibold text-white" : "text-base font-semibold text-slate-900"}>Return Requests</p>
                <div className="flex gap-1 flex-wrap">
                  {["all", "pending", "processing", "approved", "completed", "rejected"].map((s) => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${filterStatus === s ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <EmptyState
                icon={RotateCcw}
                title="No return requests yet"
                description="Return requests will appear here when customers initiate product returns."
              />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <p className={isDark ? "text-base font-semibold text-white mb-4" : "text-base font-semibold text-slate-900 mb-4"}>Return Reasons</p>
              <EmptyState
                icon={RotateCcw}
                title="No data"
                description="Reason breakdown will appear once returns are processed."
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className={isDark ? "text-base font-semibold text-white mb-4 flex items-center gap-2" : "text-base font-semibold text-slate-900 mb-4 flex items-center gap-2"}>
              <PackageCheck className="h-5 w-5 text-amber-600" /> Quality Check
            </p>
            <EmptyState icon={PackageCheck} title="No QC data" description="Quality check data will appear after returns are processed." />
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <p className={isDark ? "text-base font-semibold text-white flex items-center gap-2" : "text-base font-semibold text-slate-900 flex items-center gap-2"}>
                <ShieldCheck className="h-5 w-5 text-amber-600" /> Return Policy Settings
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-600">Return Window</span>
                <span className={isDark ? "text-xs font-semibold text-white" : "text-xs font-semibold text-slate-900"}>{currentPolicy?.returnWindow || "Not configured"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-600">Refund Method</span>
                <span className={isDark ? "text-xs font-semibold text-white" : "text-xs font-semibold text-slate-900"}>{currentPolicy?.refundMethod || "Not configured"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-xs text-slate-600">Restocking Fee</span>
                <span className={isDark ? "text-xs font-semibold text-white" : "text-xs font-semibold text-slate-900"}>{currentPolicy?.restockingFee || "Not configured"}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full border-amber-200 text-amber-700 hover:bg-amber-50 text-xs" onClick={() => setPolicyOpen(true)}>
              Edit Return Policy
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Return Policy Dialog */}
      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent className={isDark ? "bg-slate-800 border-slate-700 text-slate-100" : ""}>
          <DialogHeader>
            <DialogTitle className={isGold ? "text-amber-400" : isDark ? "text-slate-100" : "text-slate-900"}>Edit Return Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className={isDark ? `text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-300"}` : `text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Return Window (e.g. 30 days)</Label>
              <Input
                placeholder="e.g. 30 days"
                value={policyForm.returnWindow}
                onChange={(e) => setPolicyForm(prev => ({ ...prev, returnWindow: e.target.value }))}
                className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label className={isDark ? `text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-300"}` : `text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Refund Method</Label>
              <Input
                placeholder="e.g. Original payment method, Store credit"
                value={policyForm.refundMethod}
                onChange={(e) => setPolicyForm(prev => ({ ...prev, refundMethod: e.target.value }))}
                className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label className={isDark ? `text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-300"}` : `text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Restocking Fee (%)</Label>
              <Input
                placeholder="e.g. 10"
                value={policyForm.restockingFee}
                onChange={(e) => setPolicyForm(prev => ({ ...prev, restockingFee: e.target.value }))}
                className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setPolicyOpen(false)} className={isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : ""}>
                Cancel
              </Button>
              <Button onClick={handlePolicySubmit} className="bg-amber-600 hover:bg-amber-700 text-white">
                Save Policy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

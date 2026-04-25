"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Gauge, Clock, AlertTriangle, Bell, Plus, Shield, Timer } from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";

export function SLAEnginePage() {
  const [showRuleForm, setShowRuleForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SLA Engine</h1>
          <p className="text-sm text-slate-500 mt-1">Configure and monitor service level agreements</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowRuleForm(!showRuleForm)}>
          <Plus className="mr-2 h-4 w-4" /> New SLA Rule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { title: "SLA Compliance", value: "—", icon: Gauge },
          { title: "Avg Response Time", value: "—", icon: Clock },
          { title: "Breaches This Week", value: "0", icon: AlertTriangle },
          { title: "Critical Alerts", value: "0", icon: Bell },
        ].map((stat) => (
          <Card key={stat.title} className="border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.title}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SLA Rules */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-base font-semibold text-slate-900">SLA Rules (0 active)</p>
          </div>
          <EmptyState
            icon={Shield}
            title="No SLA rules configured"
            description="Create SLA rules to define response and resolution targets for each channel."
            actionLabel="Create First Rule"
            onAction={() => setShowRuleForm(true)}
          />
        </CardContent>
      </Card>

      {/* Rule Builder Form */}
      {showRuleForm && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-amber-600" />New SLA Rule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-700">Rule Name</Label>
                <Input placeholder="e.g., WhatsApp VIP" className="text-xs h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-700">Channel</Label>
                <Select>
                  <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select channel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-700">Response Time (min)</Label>
                <Input type="number" placeholder="30" className="text-xs h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-700">Resolution Time (hrs)</Label>
                <Input type="number" placeholder="4" className="text-xs h-9" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-700">Priority Level</Label>
                <Select>
                  <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-700">Escalation Matrix</Label>
                <Select>
                  <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select matrix" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard 5-Level</SelectItem>
                    <SelectItem value="express">Express 3-Level</SelectItem>
                    <SelectItem value="vip">VIP 2-Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white text-xs" onClick={() => { setShowRuleForm(false); toast.success("SLA rule created!"); }}>Create Rule</Button>
              <Button variant="outline" className="text-xs" onClick={() => setShowRuleForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" /> Breach Alerts
            </p>
            <EmptyState icon={AlertTriangle} title="No breach alerts" description="Alerts will appear when SLA targets are missed." />
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" /> Compliance Dashboard
            </p>
            <EmptyState icon={Gauge} title="No compliance data" description="Compliance metrics will appear once SLA rules are active." />
          </CardContent>
        </Card>
      </div>

      {/* Escalation Matrix */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <p className="text-base font-semibold text-slate-900 mb-4">Escalation Matrix</p>
          <div className="space-y-3">
            {["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"].map((level, i) => (
              <div key={level} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <span className="text-sm font-medium text-slate-700">{level}</span>
                <span className="text-xs text-slate-400">Configure in SLA rules</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

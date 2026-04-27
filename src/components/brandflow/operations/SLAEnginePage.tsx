"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Gauge, Clock, AlertTriangle, Bell, Plus, Timer, ArrowRight,
  RefreshCw, Filter, TrendingUp, Activity, Zap, AlertCircle, CheckCircle2,
  XCircle, ArrowUpRight, ChevronRight, Loader2, Save, Pencil, Trash2,
  Users, Target, BarChart3, Eye, Send, Flame, ShieldCheck, ZapOff,
} from "lucide-react";

// ── Types ──

interface SLARule {
  id: string;
  name: string;
  fromStatus: string;
  toStatus: string;
  timeLimitHours: number;
  responsibleRole: string;
  escalationAction: string;
  enabled: boolean;
}

interface PriorityOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string | null;
  total: number;
  channel: string;
  status: string;
  priorityScore: number;
  priorityLevel: string;
  priorityBreakdown: { revenue: number; age: number; channel: number; status: number };
  ageFormatted: string;
  createdAt: string;
  updatedAt: string;
}

interface SLACheckResult {
  complianceRate: number;
  totalOrders: number;
  compliantOrders: number;
  breachedOrders: number;
  warningOrders: number;
  breachesToday: number;
  criticalAlerts: number;
  approachingBreach: any[];
  breached: any[];
  avgTimesPerStatus: { status: string; count: number; avgAgeMs: number; avgAgeFormatted: string }[];
  teamPerformance: { role: string; total: number; breached: number; warning: number; compliant: number; complianceRate: number }[];
}

// ── Constants ──

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  packed: "Packed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-500 border-amber-500/20",
  confirmed: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  packed: "bg-violet-500/15 text-violet-500 border-violet-500/20",
  dispatched: "bg-teal-500/15 text-teal-500 border-teal-500/20",
  delivered: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
};

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: typeof Flame }> = {
  critical: { label: "Critical", bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", icon: Flame },
  high: { label: "High", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", icon: AlertTriangle },
  medium: { label: "Medium", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", icon: Zap },
  low: { label: "Low", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", icon: CheckCircle2 },
};

const PRIORITY_LIGHT: Record<string, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: "Critical", bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
  high: { label: "High", bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  medium: { label: "Medium", bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  low: { label: "Low", bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
};

const ROLE_LABELS: Record<string, string> = {
  sales_manager: "Sales Manager",
  warehouse_manager: "Warehouse Manager",
  support_agent: "Support Agent",
  inventory_clerk: "Inventory Clerk",
  operations_lead: "Operations Lead",
  logistics_coordinator: "Logistics Coordinator",
};

const PIPELINE_STAGES = [
  { status: "pending", label: "Pending", icon: Clock },
  { status: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { status: "packed", label: "Packed", icon: Target },
  { status: "dispatched", label: "Dispatched", icon: ArrowUpRight },
  { status: "delivered", label: "Delivered", icon: ShieldCheck },
];

// ── Component ──

export function SLAEnginePage() {
  const { organization, appTheme } = useValtrioxStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  // Theme classes
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-500" : "text-slate-400";
  const cardClass = isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-white border-slate-200";
  const cardClassHover = isDark ? "bg-white/[0.03] border-white/[0.08] hover:border-amber-500/20" : "bg-white border-slate-200 hover:border-slate-300";
  const borderColor = isDark ? "border-white/[0.08]" : "border-slate-200";
  const inputClass = isDark ? "border-white/[0.08] bg-white/[0.03] focus-visible:border-amber-500/50 placeholder:text-slate-600" : "";
  const goldBtn = isGold ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black hover:shadow-[0_4px_20px_rgba(212,160,23,0.3)] hover:-translate-y-0.5" : "bg-amber-600 hover:bg-amber-700 text-white";

  // ── Tab State ──
  const [activeTab, setActiveTab] = useState("rules");

  // ── SLA Rules State ──
  const [rules, setRules] = useState<SLARule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<SLARule | null>(null);
  const [newRule, setNewRule] = useState({ name: "", fromStatus: "pending", toStatus: "confirmed", timeLimitHours: 24, responsibleRole: "sales_manager", escalationAction: "" });

  // ── Priority Queue State ──
  const [priorityOrders, setPriorityOrders] = useState<PriorityOrder[]>([]);
  const [priorityLoading, setPriorityLoading] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [prioritySummary, setPrioritySummary] = useState({ total: 0, critical: 0, high: 0, medium: 0, low: 0 });

  // ── SLA Dashboard State ──
  const [slaCheck, setSlaCheck] = useState<SLACheckResult | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  // ── Fetch SLA Rules ──
  const fetchRules = useCallback(async () => {
    if (!organization?.id) return;
    setRulesLoading(true);
    try {
      const res = await fetch(`/api/sla/rules?orgId=${organization.id}`);
      if (!res.ok) throw new Error("Failed to fetch SLA rules");
      const data = await res.json();
      setRules(data.rules || []);
    } catch {
      toast.error("Failed to load SLA rules");
    } finally {
      setRulesLoading(false);
    }
  }, [organization?.id]);

  // ── Fetch Priority Orders ──
  const fetchPriorityOrders = useCallback(async () => {
    if (!organization?.id) return;
    setPriorityLoading(true);
    try {
      const res = await fetch(`/api/orders/priority?orgId=${organization.id}`);
      if (!res.ok) throw new Error("Failed to fetch priority orders");
      const data = await res.json();
      setPriorityOrders(data.orders || []);
      setPrioritySummary(data.summary || { total: 0, critical: 0, high: 0, medium: 0, low: 0 });
    } catch {
      toast.error("Failed to load priority queue");
    } finally {
      setPriorityLoading(false);
    }
  }, [organization?.id]);

  // ── Fetch SLA Dashboard ──
  const fetchSLADashboard = useCallback(async () => {
    if (!organization?.id) return;
    setDashLoading(true);
    try {
      const res = await fetch(`/api/sla/check?orgId=${organization.id}`);
      if (!res.ok) throw new Error("Failed to fetch SLA dashboard");
      const data = await res.json();
      setSlaCheck(data);
    } catch {
      toast.error("Failed to load SLA dashboard");
    } finally {
      setDashLoading(false);
    }
  }, [organization?.id]);

  // ── Load data on tab change ──
  useEffect(() => { fetchRules(); }, [fetchRules]);
  useEffect(() => {
    if (activeTab === "priority") fetchPriorityOrders();
    if (activeTab === "dashboard") fetchSLADashboard();
  }, [activeTab, fetchPriorityOrders, fetchSLADashboard]);

  // ── Rule CRUD ──
  const handleSaveRule = async () => {
    if (!newRule.name.trim()) { toast.error("Rule name is required"); return; }
    if (!organization?.id) return;

    setRulesSaving(true);
    try {
      if (editingRule) {
        // Update: save all rules
        const updated = rules.map((r) => r.id === editingRule.id ? { ...r, ...newRule, timeLimitHours: Number(newRule.timeLimitHours) } : r);
        const res = await fetch(`/api/sla/rules?orgId=${organization.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId: organization.id, rules: updated }),
        });
        if (!res.ok) throw new Error("Failed to update rule");
        const data = await res.json();
        setRules(data.rules);
        toast.success("SLA rule updated");
      } else {
        // Create
        const res = await fetch(`/api/sla/rules?orgId=${organization.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId: organization.id, ...newRule }),
        });
        if (!res.ok) throw new Error("Failed to create rule");
        const data = await res.json();
        setRules(data.rules);
        toast.success("SLA rule created");
      }
      setShowRuleForm(false);
      setEditingRule(null);
      setNewRule({ name: "", fromStatus: "pending", toStatus: "confirmed", timeLimitHours: 24, responsibleRole: "sales_manager", escalationAction: "" });
    } catch {
      toast.error("Failed to save SLA rule");
    } finally {
      setRulesSaving(false);
    }
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    if (!organization?.id) return;
    const updated = rules.map((r) => r.id === ruleId ? { ...r, enabled } : r);
    try {
      const res = await fetch(`/api/sla/rules?orgId=${organization.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: organization.id, rules: updated }),
      });
      if (!res.ok) throw new Error("Failed to toggle rule");
      const data = await res.json();
      setRules(data.rules);
      toast.success(enabled ? "Rule enabled" : "Rule disabled");
    } catch {
      toast.error("Failed to toggle rule");
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!organization?.id) return;
    const updated = rules.filter((r) => r.id !== ruleId);
    try {
      const res = await fetch(`/api/sla/rules?orgId=${organization.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: organization.id, rules: updated }),
      });
      if (!res.ok) throw new Error("Failed to delete rule");
      const data = await res.json();
      setRules(data.rules);
      toast.success("Rule deleted");
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  const openEditRule = (rule: SLARule) => {
    setEditingRule(rule);
    setNewRule({
      name: rule.name,
      fromStatus: rule.fromStatus,
      toStatus: rule.toStatus,
      timeLimitHours: rule.timeLimitHours,
      responsibleRole: rule.responsibleRole,
      escalationAction: rule.escalationAction,
    });
    setShowRuleForm(true);
  };

  const openNewRule = () => {
    setEditingRule(null);
    setNewRule({ name: "", fromStatus: "pending", toStatus: "confirmed", timeLimitHours: 24, responsibleRole: "sales_manager", escalationAction: "" });
    setShowRuleForm(true);
  };

  // ── Escalate handler ──
  const handleEscalate = (order: PriorityOrder) => {
    toast.success(`Order ${order.orderNumber} escalated to team lead`);
  };

  // ── Filtered priority orders ──
  const filteredPriorityOrders = useMemo(() => {
    if (priorityFilter === "all") return priorityOrders;
    return priorityOrders.filter((o) => o.priorityLevel === priorityFilter);
  }, [priorityOrders, priorityFilter]);

  // ── Render: Priority Badge ──
  const PriorityBadge = ({ level, score }: { level: string; score: number }) => {
    const cfg = isDark ? PRIORITY_CONFIG[level] : null;
    const lightCfg = PRIORITY_LIGHT[level] || PRIORITY_LIGHT.low;
    if (isDark && cfg) {
      return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border", cfg.bg, cfg.text, cfg.border)}>
          <cfg.icon className="h-3 w-3" />
          {cfg.label} ({score})
        </span>
      );
    }
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border", lightCfg.bg, lightCfg.text, lightCfg.border)}>
        {lightCfg.label} ({score})
      </span>
    );
  };

  // ── Pipeline visualization ──
  const PipelineTimeline = () => {
    const activeRules = rules.filter((r) => r.enabled);
    const getRuleForStage = (toStatus: string) => activeRules.find((r) => r.toStatus === toStatus);

    return (
      <div className={cn("rounded-xl border p-6", cardClass)}>
        <h3 className={cn("text-sm font-semibold mb-6 flex items-center gap-2", textPrimary)}>
          <Activity className="h-4 w-4 text-amber-500" />
          Order Pipeline with SLA Targets
        </h3>
        <div className="relative">
          <div className="flex items-center justify-between">
            {PIPELINE_STAGES.map((stage, idx) => {
              const rule = getRuleForStage(stage.status);
              return (
                <div key={stage.status} className="flex items-center flex-1">
                  <div className="flex flex-col items-center text-center flex-1">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center border mb-2 transition-all",
                      isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-600"
                    )}>
                      <stage.icon className="h-5 w-5" />
                    </div>
                    <p className={cn("text-xs font-semibold", textPrimary)}>{stage.label}</p>
                    {rule ? (
                      <div className="mt-1">
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-700")}>
                          {rule.timeLimitHours}h
                        </span>
                        <p className={cn("text-[10px] mt-1", textMuted)}>{ROLE_LABELS[rule.responsibleRole] || rule.responsibleRole}</p>
                      </div>
                    ) : (
                      <p className={cn("text-[10px] mt-1", textMuted)}>&mdash;</p>
                    )}
                  </div>
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <div className="flex-shrink-0 px-2">
                      <div className={cn("h-px w-8 sm:w-12 lg:w-16", isDark ? "bg-gradient-to-r from-amber-500/30 to-amber-500/10" : "bg-gradient-to-r from-amber-300 to-amber-100")} />
                      <ChevronRight className={cn("h-3 w-3 mx-auto -mt-1", isDark ? "text-amber-500/30" : "text-amber-300")} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── Render: SLA Rules Tab ──
  const RulesTab = () => (
    <div className="space-y-6">
      {/* Pipeline Timeline */}
      <PipelineTimeline />

      {/* Rules Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={cn("text-lg font-bold", textPrimary)}>SLA Rules</h2>
          <p className={cn("text-sm", textSecondary)}>
            {rules.filter((r) => r.enabled).length} active rules managing order flow
          </p>
        </div>
        <Button className={goldBtn} onClick={openNewRule}>
          <Plus className="mr-2 h-4 w-4" /> New SLA Rule
        </Button>
      </div>

      {/* Rules Grid */}
      {rulesLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className={cn("border animate-pulse h-44", cardClass)}>
              <CardContent className="p-5" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rules.map((rule, idx) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className={cn(
                "border transition-all duration-200",
                !rule.enabled && "opacity-50",
                isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-white border-slate-200"
              )}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0",
                        isDark ? "bg-amber-500/10" : "bg-amber-50"
                      )}>
                        <Timer className={cn("h-4 w-4", isDark ? "text-amber-400" : "text-amber-600")} />
                      </div>
                      <div className="min-w-0">
                        <h3 className={cn("text-sm font-semibold truncate", textPrimary)}>{rule.name}</h3>
                        <p className={cn("text-[11px]", textMuted)}>{rule.timeLimitHours}h target</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditRule(rule)}
                        className={cn("h-8 w-8 rounded-lg flex items-center justify-center", isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(v) => handleToggleRule(rule.id, v)}
                        className="ml-1"
                      />
                    </div>
                  </div>

                  {/* Status Transition */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn(
                      "inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border",
                      STATUS_COLORS[rule.fromStatus] || (isDark ? "bg-slate-500/15 text-slate-400 border-slate-500/20" : "bg-slate-50 text-slate-600 border-slate-200")
                    )}>
                      {STATUS_LABELS[rule.fromStatus] || rule.fromStatus}
                    </span>
                    <ArrowRight className={cn("h-3.5 w-3.5", isDark ? "text-slate-500" : "text-slate-400")} />
                    <span className={cn(
                      "inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border",
                      STATUS_COLORS[rule.toStatus] || (isDark ? "bg-slate-500/15 text-slate-400 border-slate-500/20" : "bg-slate-50 text-slate-600 border-slate-200")
                    )}>
                      {STATUS_LABELS[rule.toStatus] || rule.toStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Users className={cn("h-3 w-3", textMuted)} />
                      <span className={cn("text-[11px]", textSecondary)}>{ROLE_LABELS[rule.responsibleRole] || rule.responsibleRole}</span>
                    </div>
                    <div className={cn("text-[10px] px-2 py-0.5 rounded-full", isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-700")}>
                      {rule.timeLimitHours >= 24 ? `${Math.floor(rule.timeLimitHours / 24)}d ${rule.timeLimitHours % 24}h` : `${rule.timeLimitHours}h`}
                    </div>
                  </div>

                  {rule.escalationAction && (
                    <p className={cn("text-[11px] mt-2 pt-2 border-t", textMuted, borderColor)}>
                      {rule.escalationAction}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Rule Form Dialog */}
      <Dialog open={showRuleForm} onOpenChange={(open) => { setShowRuleForm(open); if (!open) setEditingRule(null); }}>
        <DialogContent className={cn("sm:max-w-lg", isDark && "bg-slate-900 border-white/[0.08]")}>
          <DialogHeader>
            <DialogTitle className={cn(textPrimary)}>{editingRule ? "Edit SLA Rule" : "New SLA Rule"}</DialogTitle>
            <DialogDescription className={textSecondary}>
              {editingRule ? "Update the SLA rule configuration" : "Define a new service level agreement rule for order processing"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className={cn("text-xs font-medium", textSecondary)}>Rule Name</Label>
              <Input value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} placeholder="e.g., VIP Order Confirmation" className={cn("h-9 text-sm", inputClass)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className={cn("text-xs font-medium", textSecondary)}>From Status</Label>
                <Select value={newRule.fromStatus} onValueChange={(v) => setNewRule({ ...newRule, fromStatus: v })}>
                  <SelectTrigger className={cn("h-9 text-sm", inputClass)}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).filter(([k]) => k !== "delivered" && k !== "cancelled").map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={cn("text-xs font-medium", textSecondary)}>To Status</Label>
                <Select value={newRule.toStatus} onValueChange={(v) => setNewRule({ ...newRule, toStatus: v })}>
                  <SelectTrigger className={cn("h-9 text-sm", inputClass)}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).filter(([k]) => k !== "pending" && k !== "cancelled").map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className={cn("text-xs font-medium", textSecondary)}>Time Limit (hours)</Label>
                <Input type="number" value={newRule.timeLimitHours} onChange={(e) => setNewRule({ ...newRule, timeLimitHours: Number(e.target.value) })} placeholder="24" className={cn("h-9 text-sm", inputClass)} />
              </div>
              <div className="space-y-2">
                <Label className={cn("text-xs font-medium", textSecondary)}>Responsible Role</Label>
                <Select value={newRule.responsibleRole} onValueChange={(v) => setNewRule({ ...newRule, responsibleRole: v })}>
                  <SelectTrigger className={cn("h-9 text-sm", inputClass)}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className={cn("text-xs font-medium", textSecondary)}>Escalation Action</Label>
              <Textarea
                value={newRule.escalationAction}
                onChange={(e) => setNewRule({ ...newRule, escalationAction: e.target.value })}
                placeholder="Describe what happens when SLA is breached..."
                className={cn("text-sm min-h-[60px]", inputClass)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleForm(false)} className={isDark && "border-white/10 text-slate-300 hover:bg-white/5"}>
              Cancel
            </Button>
            <Button className={goldBtn} onClick={handleSaveRule} disabled={rulesSaving}>
              {rulesSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {editingRule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // ── Render: Priority Queue Tab ──
  const PriorityTab = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Critical", count: prioritySummary.critical, color: "from-red-500/20 to-red-500/5", textColor: "text-red-400", icon: Flame, border: "border-red-500/20" },
          { label: "High", count: prioritySummary.high, color: "from-amber-500/20 to-amber-500/5", textColor: "text-amber-400", icon: AlertTriangle, border: "border-amber-500/20" },
          { label: "Medium", count: prioritySummary.medium, color: "from-blue-500/20 to-blue-500/5", textColor: "text-blue-400", icon: Zap, border: "border-blue-500/20" },
          { label: "Low", count: prioritySummary.low, color: "from-emerald-500/20 to-emerald-500/5", textColor: "text-emerald-400", icon: CheckCircle2, border: "border-emerald-500/20" },
        ].map((s) => (
          <Card key={s.label} className={cn("border overflow-hidden", isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-white border-slate-200")}>
            <CardContent className={cn("p-4 bg-gradient-to-br", s.color)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("text-[10px] font-medium uppercase tracking-wider", isDark ? "text-slate-500" : "text-slate-400")}>{s.label}</p>
                  <p className={cn("text-2xl font-bold mt-0.5", isDark ? s.textColor : s.textColor.replace("400", "600"))}>{s.count}</p>
                </div>
                <s.icon className={cn("h-6 w-6", isDark ? s.textColor : s.textColor.replace("400", "600"))} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter & Refresh */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className={cn("flex gap-1 rounded-lg p-1 flex-wrap", isDark ? "bg-white/5" : "bg-slate-100")}>
          {[
            { id: "all", label: "All" },
            { id: "critical", label: "Critical" },
            { id: "high", label: "High" },
            { id: "medium", label: "Medium" },
            { id: "low", label: "Low" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setPriorityFilter(f.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                priorityFilter === f.id
                  ? isDark ? "bg-amber-600/20 text-amber-400" : "bg-white text-slate-900 shadow-sm"
                  : isDark ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button
          variant="outline" size="sm"
          onClick={fetchPriorityOrders} disabled={priorityLoading}
          className={cn(isDark && "border-white/10 text-slate-300 hover:bg-white/5")}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", priorityLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Priority Table */}
      {priorityLoading ? (
        <Card className={cn(cardClass)}>
          <CardContent className="p-8 text-center">
            <Loader2 className={cn("h-8 w-8 animate-spin mx-auto", isDark ? "text-amber-400" : "text-amber-600")} />
            <p className={cn("text-sm mt-2", textSecondary)}>Calculating priority scores...</p>
          </CardContent>
        </Card>
      ) : filteredPriorityOrders.length === 0 ? (
        <Card className={cn(cardClass)}>
          <CardContent className="p-8 text-center">
            <Target className={cn("h-10 w-10 mx-auto mb-2", isDark ? "text-slate-600" : "text-slate-300")} />
            <p className={cn("font-medium", textPrimary)}>No orders found</p>
            <p className={cn("text-sm mt-1", textSecondary)}>Priority scores will appear when orders are created.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className={cn("border overflow-hidden", cardClass)}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className={cn("border-b", borderColor, isDark && "bg-white/[0.02]")}>
                    <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Order #</TableHead>
                    <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Customer</TableHead>
                    <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted, "hidden sm:table-cell")}>Amount</TableHead>
                    <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted, "hidden md:table-cell")}>Channel</TableHead>
                    <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Status</TableHead>
                    <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Priority</TableHead>
                    <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted, "hidden lg:table-cell")}>Age</TableHead>
                    <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPriorityOrders.map((order, idx) => (
                    <TableRow key={order.id} className={cn("border-b", borderColor, isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50")}>
                      <TableCell>
                        <span className={cn("text-sm font-mono font-semibold", isDark ? "text-amber-400" : "text-amber-600")}>{order.orderNumber}</span>
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-sm font-medium", textPrimary)}>{order.customerName}</span>
                      </TableCell>
                      <TableCell className={cn("hidden sm:table-cell text-sm", textSecondary)}>
                        {order.total.toLocaleString()}
                      </TableCell>
                      <TableCell className={cn("hidden md:table-cell text-sm capitalize", textSecondary)}>
                        {order.channel}
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border", STATUS_COLORS[order.status] || (isDark ? "bg-slate-500/15 text-slate-400 border-slate-500/20" : "bg-slate-50 text-slate-600 border-slate-200"))}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <PriorityBadge level={order.priorityLevel} score={order.priorityScore} />
                      </TableCell>
                      <TableCell className={cn("hidden lg:table-cell text-sm", textSecondary)}>
                        {order.ageFormatted}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost" size="sm"
                          className={cn("h-7 text-[11px] font-medium", isDark ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50")}
                          onClick={() => handleEscalate(order)}
                        >
                          <Send className="mr-1 h-3 w-3" /> Escalate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ── Render: SLA Dashboard Tab ──
  const DashboardTab = () => {
    if (dashLoading || !slaCheck) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className={cn("border animate-pulse h-28", cardClass)}>
                <CardContent className="p-4" />
              </Card>
            ))}
          </div>
        </div>
      );
    }

    const complianceColor = slaCheck.complianceRate >= 90 ? (isDark ? "text-emerald-400" : "text-emerald-600") : slaCheck.complianceRate >= 70 ? (isDark ? "text-amber-400" : "text-amber-600") : (isDark ? "text-red-400" : "text-red-600");
    const complianceBarColor = slaCheck.complianceRate >= 90 ? "bg-emerald-500" : slaCheck.complianceRate >= 70 ? "bg-amber-500" : "bg-red-500";

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className={cn("border overflow-hidden", cardClass)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className={cn("text-[10px] font-medium uppercase tracking-wider", textMuted)}>Compliance Rate</p>
                <Gauge className={cn("h-4 w-4", isDark ? "text-amber-400" : "text-amber-600")} />
              </div>
              <p className={cn("text-2xl font-bold", complianceColor)}>{slaCheck.complianceRate}%</p>
              <Progress value={slaCheck.complianceRate} className={cn("mt-2 h-1.5", isDark ? "[&>div]:bg-amber-500" : "")} />
            </CardContent>
          </Card>
          <Card className={cn("border overflow-hidden", cardClass)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className={cn("text-[10px] font-medium uppercase tracking-wider", textMuted)}>Avg Response Time</p>
                <Clock className={cn("h-4 w-4", isDark ? "text-amber-400" : "text-amber-600")} />
              </div>
              <p className={cn("text-2xl font-bold", textPrimary)}>
                {slaCheck.avgTimesPerStatus.length > 0 ? slaCheck.avgTimesPerStatus[0].avgAgeFormatted : "—"}
              </p>
              <p className={cn("text-[11px] mt-1", textMuted)}>{slaCheck.avgTimesPerStatus[0]?.status || "No data"}</p>
            </CardContent>
          </Card>
          <Card className={cn("border overflow-hidden", cardClass)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className={cn("text-[10px] font-medium uppercase tracking-wider", textMuted)}>Breaches Today</p>
                <AlertCircle className={cn("h-4 w-4", isDark ? "text-red-400" : "text-red-600")} />
              </div>
              <p className={cn("text-2xl font-bold", slaCheck.breachesToday > 0 ? (isDark ? "text-red-400" : "text-red-600") : (isDark ? "text-emerald-400" : "text-emerald-600"))}>
                {slaCheck.breachesToday}
              </p>
              <p className={cn("text-[11px] mt-1", textMuted)}>{slaCheck.breachedOrders} total breached</p>
            </CardContent>
          </Card>
          <Card className={cn("border overflow-hidden", cardClass)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className={cn("text-[10px] font-medium uppercase tracking-wider", textMuted)}>Critical Alerts</p>
                <Zap className={cn("h-4 w-4", isDark ? "text-amber-400" : "text-amber-600")} />
              </div>
              <p className={cn("text-2xl font-bold", slaCheck.criticalAlerts > 0 ? (isDark ? "text-amber-400" : "text-amber-600") : textPrimary)}>
                {slaCheck.criticalAlerts}
              </p>
              <p className={cn("text-[11px] mt-1", textMuted)}>{slaCheck.warningOrders} warnings + {slaCheck.breachedOrders} breaches</p>
            </CardContent>
          </Card>
        </div>

        {/* Breach Timeline & Warnings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Breaches */}
          <Card className={cn("border", cardClass)}>
            <CardContent className="p-5">
              <h3 className={cn("text-sm font-semibold mb-4 flex items-center gap-2", textPrimary)}>
                <XCircle className={cn("h-4 w-4", isDark ? "text-red-400" : "text-red-500")} />
                SLA Breaches
                {slaCheck.breached.length > 0 && (
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", isDark ? "bg-red-500/15 text-red-400" : "bg-red-50 text-red-600")}>
                    {slaCheck.breached.length}
                  </span>
                )}
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                {slaCheck.breached.length === 0 ? (
                  <div className="text-center py-6">
                    <ShieldCheck className={cn("h-8 w-8 mx-auto mb-2", isDark ? "text-emerald-400" : "text-emerald-500")} />
                    <p className={cn("text-sm", textSecondary)}>No SLA breaches! Great job.</p>
                  </div>
                ) : (
                  slaCheck.breached.map((b: any) => (
                    <div key={b.id} className={cn("rounded-lg border p-3", isDark ? "bg-red-500/5 border-red-500/15" : "bg-red-50/50 border-red-200")}>
                      <div className="flex items-center justify-between">
                        <span className={cn("text-xs font-mono font-semibold", isDark ? "text-amber-400" : "text-amber-600")}>{b.orderNumber}</span>
                        <span className="text-[10px] font-medium text-red-500">+{b.breachByFormatted}</span>
                      </div>
                      <p className={cn("text-[11px] mt-0.5", textSecondary)}>{b.customerName} &middot; {STATUS_LABELS[b.status] || b.status}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          <Card className={cn("border", cardClass)}>
            <CardContent className="p-5">
              <h3 className={cn("text-sm font-semibold mb-4 flex items-center gap-2", textPrimary)}>
                <AlertTriangle className={cn("h-4 w-4", isDark ? "text-amber-400" : "text-amber-500")} />
                Approaching Breach
                {slaCheck.approachingBreach.length > 0 && (
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", isDark ? "bg-amber-500/15 text-amber-400" : "bg-amber-50 text-amber-600")}>
                    {slaCheck.approachingBreach.length}
                  </span>
                )}
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                {slaCheck.approachingBreach.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle2 className={cn("h-8 w-8 mx-auto mb-2", isDark ? "text-emerald-400" : "text-emerald-500")} />
                    <p className={cn("text-sm", textSecondary)}>No orders approaching breach.</p>
                  </div>
                ) : (
                  slaCheck.approachingBreach.map((w: any) => (
                    <div key={w.id} className={cn("rounded-lg border p-3", isDark ? "bg-amber-500/5 border-amber-500/15" : "bg-amber-50/50 border-amber-200")}>
                      <div className="flex items-center justify-between">
                        <span className={cn("text-xs font-mono font-semibold", isDark ? "text-amber-400" : "text-amber-600")}>{w.orderNumber}</span>
                        <span className={cn("text-[10px] font-medium", isDark ? "text-amber-400" : "text-amber-600")}>{w.remainingFormatted} left</span>
                      </div>
                      <p className={cn("text-[11px] mt-0.5", textSecondary)}>{w.customerName} &middot; {ROLE_LABELS[w.responsibleRole] || w.responsibleRole}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance by Team Role */}
        <Card className={cn("border", cardClass)}>
          <CardContent className="p-5">
            <h3 className={cn("text-sm font-semibold mb-4 flex items-center gap-2", textPrimary)}>
              <BarChart3 className={cn("h-4 w-4", isDark ? "text-amber-400" : "text-amber-600")} />
              Performance by Team Role
            </h3>
            {slaCheck.teamPerformance.length === 0 ? (
              <div className="text-center py-6">
                <Users className={cn("h-8 w-8 mx-auto mb-2", isDark ? "text-slate-600" : "text-slate-300")} />
                <p className={cn("text-sm", textSecondary)}>No team performance data yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {slaCheck.teamPerformance.map((team) => {
                  const roleComplianceColor = team.complianceRate >= 90 ? (isDark ? "text-emerald-400" : "text-emerald-600") : team.complianceRate >= 70 ? (isDark ? "text-amber-400" : "text-amber-600") : (isDark ? "text-red-400" : "text-red-600");
                  return (
                    <div key={team.role} className={cn("rounded-lg border p-4", isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-slate-50 border-slate-200")}>
                      <div className="flex items-center justify-between mb-2">
                        <p className={cn("text-xs font-semibold", textPrimary)}>{ROLE_LABELS[team.role] || team.role}</p>
                        <p className={cn("text-lg font-bold", roleComplianceColor)}>{team.complianceRate}%</p>
                      </div>
                      <Progress value={team.complianceRate} className="h-1.5 mb-2" />
                      <div className="flex gap-3">
                        <div className="flex items-center gap-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span className={cn("text-[10px]", textMuted)}>{team.compliant} ok</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          <span className={cn("text-[10px]", textMuted)}>{team.warning} warn</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          <span className={cn("text-[10px]", textMuted)}>{team.breached} breach</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Avg Times per Status */}
        {slaCheck.avgTimesPerStatus.length > 0 && (
          <Card className={cn("border", cardClass)}>
            <CardContent className="p-5">
              <h3 className={cn("text-sm font-semibold mb-4 flex items-center gap-2", textPrimary)}>
                <TrendingUp className={cn("h-4 w-4", isDark ? "text-amber-400" : "text-amber-600")} />
                Average Time per Status
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className={cn("border-b", borderColor)}>
                      <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Status</TableHead>
                      <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Orders</TableHead>
                      <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Avg Age</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slaCheck.avgTimesPerStatus.map((s) => (
                      <TableRow key={s.status} className={cn("border-b", borderColor, isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50")}>
                        <TableCell>
                          <span className={cn("inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border", STATUS_COLORS[s.status] || (isDark ? "bg-slate-500/15 text-slate-400 border-slate-500/20" : "bg-slate-50 text-slate-600 border-slate-200"))}>
                            {STATUS_LABELS[s.status] || s.status}
                          </span>
                        </TableCell>
                        <TableCell className={cn("text-sm", textPrimary)}>{s.count}</TableCell>
                        <TableCell className={cn("text-sm", textSecondary)}>{s.avgAgeFormatted}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // ── Main Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl font-bold", textPrimary)}>SLA Engine</h1>
          <p className={cn("text-sm mt-1", textSecondary)}>Service level agreements, priority scoring & compliance monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => {
              fetchRules();
              fetchPriorityOrders();
              fetchSLADashboard();
            }}
            className={cn(isDark && "border-white/10 text-slate-300 hover:bg-white/5")}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh All
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={cn(
          "w-full sm:w-auto h-auto p-1 rounded-lg",
          isDark ? "bg-white/[0.05]" : "bg-slate-100"
        )}>
          <TabsTrigger
            value="rules"
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:shadow-none",
              activeTab === "rules"
                ? isDark ? "bg-amber-600/20 text-amber-400" : "bg-white text-slate-900 shadow-sm"
                : isDark ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Shield className="h-4 w-4" /> SLA Rules
          </TabsTrigger>
          <TabsTrigger
            value="priority"
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:shadow-none",
              activeTab === "priority"
                ? isDark ? "bg-amber-600/20 text-amber-400" : "bg-white text-slate-900 shadow-sm"
                : isDark ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Flame className="h-4 w-4" /> Priority Queue
          </TabsTrigger>
          <TabsTrigger
            value="dashboard"
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:shadow-none",
              activeTab === "dashboard"
                ? isDark ? "bg-amber-600/20 text-amber-400" : "bg-white text-slate-900 shadow-sm"
                : isDark ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Gauge className="h-4 w-4" /> SLA Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <RulesTab />
        </TabsContent>
        <TabsContent value="priority">
          <PriorityTab />
        </TabsContent>
        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

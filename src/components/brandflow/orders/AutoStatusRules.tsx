"use client";

import { useEffect, useState, useCallback } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Switch,
} from "@/components/ui/switch";
import {
  Zap,
  Loader2,
  RefreshCw,
  Clock,
  Save,
  Plus,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ──

interface AutoStatusRule {
  id: string;
  triggerStatus: string;
  targetStatus: string;
  delayHours: number;
  enabled: boolean;
}

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "packed", label: "Packed" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// ── Component ──

export function AutoStatusRules() {
  const { organization, appTheme } = useValtrioxStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const [rules, setRules] = useState<AutoStatusRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    const orgId = organization?.id;
    if (!orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/orders/auto-status?orgId=${encodeURIComponent(orgId)}`);
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch (err) {
      console.error("Failed to fetch auto-status rules:", err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleSave = async () => {
    const orgId = organization?.id;
    if (!orgId) return;

    setSaving(true);
    try {
      const res = await fetch("/api/orders/auto-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, rules }),
      });
      if (res.ok) {
        toast.success("Auto-status rules saved successfully");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save rules");
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save auto-status rules");
    } finally {
      setSaving(false);
    }
  };

  const addRule = () => {
    const newRule: AutoStatusRule = {
      id: `rule-${Date.now()}`,
      triggerStatus: "delivered",
      targetStatus: "completed",
      delayHours: 24,
      enabled: false,
    };
    setRules([...rules, newRule]);
  };

  const removeRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  const updateRule = (id: string, field: keyof AutoStatusRule, value: any) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const cardClass = isGold
    ? "bg-white/[0.03] border-white/[0.06]"
    : isDark
    ? "bg-white/[0.03] border-white/[0.06]"
    : "bg-white border-slate-200";

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-400" : "text-muted-foreground";
  const accentColor = isGold ? "text-amber-400" : "text-amber-500";
  const accentBg = isGold ? "bg-amber-500/10" : "bg-amber-500/10";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className={cn("text-base font-semibold flex items-center gap-2", textPrimary)}>
            <Zap className={cn("h-4 w-4", accentColor)} />
            Auto-Status Rules
          </h3>
          <p className={cn("text-xs mt-0.5", textMuted)}>
            Automatically change order status based on triggers and delays
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRules}
            disabled={loading}
            className={cn(
              "text-xs",
              isGold && "border-amber-500/20 text-amber-400 hover:bg-amber-500/10",
              isDark && !isGold && "border-white/10 text-slate-300 hover:bg-white/5"
            )}
          >
            <RefreshCw className={cn("mr-1.5 h-3 w-3", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={addRule}
            className={cn(
              "text-xs",
              isGold && "border-amber-500/20 text-amber-400 hover:bg-amber-500/10",
              isDark && !isGold && "border-white/10 text-slate-300 hover:bg-white/5"
            )}
          >
            <Plus className="mr-1.5 h-3 w-3" /> Add Rule
          </Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={handleSave}
            className={cn(
              "text-xs",
              isGold
                ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black"
                : "bg-amber-600 hover:bg-amber-700 text-white"
            )}
          >
            {saving ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Save className="mr-1.5 h-3 w-3" />}
            Save
          </Button>
        </div>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className={cn("h-6 w-6 animate-spin", accentColor)} />
        </div>
      ) : rules.length === 0 ? (
        <Card className={cardClass}>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Zap className={cn("h-10 w-10 mb-3", isDark ? "text-slate-700" : "text-slate-300")} />
            <p className={cn("text-sm font-semibold", textPrimary)}>No auto-status rules</p>
            <p className={cn("text-xs mt-1 max-w-sm", textMuted)}>
              Create rules to automatically change order statuses. For example: &quot;When delivered, auto-complete after 24 hours.&quot;
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={addRule}
            >
              <Plus className="mr-1.5 h-3 w-3" /> Create First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {rules.map((rule, idx) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: 0.05 * idx }}
              >
                <Card className={cn(
                  "transition-all border",
                  cardClass,
                  rule.enabled
                    ? isGold
                      ? "border-amber-500/20"
                      : "border-amber-500/20"
                    : isDark
                    ? "opacity-60"
                    : "opacity-70"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Rule Number */}
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                        accentBg
                      )}>
                        <span className={cn("text-xs font-bold", accentColor)}>{idx + 1}</span>
                      </div>

                      {/* Rule Content */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
                        {/* Trigger Status */}
                        <div>
                          <label className={cn("text-[10px] font-medium uppercase tracking-wider block mb-1.5", textMuted)}>
                            When status is
                          </label>
                          <Select
                            value={rule.triggerStatus}
                            onValueChange={(val) => updateRule(rule.id, "triggerStatus", val)}
                          >
                            <SelectTrigger className={cn(
                              "h-9 text-xs",
                              isDark && "bg-white/5 border-white/10 text-white"
                            )}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Delay */}
                        <div>
                          <label className={cn("text-[10px] font-medium uppercase tracking-wider block mb-1.5", textMuted)}>
                            Wait (hours)
                          </label>
                          <Input
                            type="number"
                            min={0}
                            max={720}
                            value={rule.delayHours}
                            onChange={(e) => updateRule(rule.id, "delayHours", parseInt(e.target.value) || 0)}
                            className={cn("h-9 text-xs", isDark && "bg-white/5 border-white/10")}
                          />
                        </div>

                        {/* Target Status */}
                        <div>
                          <label className={cn("text-[10px] font-medium uppercase tracking-wider block mb-1.5", textMuted)}>
                            Change to
                          </label>
                          <Select
                            value={rule.targetStatus}
                            onValueChange={(val) => updateRule(rule.id, "targetStatus", val)}
                          >
                            <SelectTrigger className={cn(
                              "h-9 text-xs",
                              isDark && "bg-white/5 border-white/10 text-white"
                            )}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Enable + Delete */}
                        <div className="flex items-center gap-3 pt-5">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={(checked) => updateRule(rule.id, "enabled", checked)}
                            />
                            <span className={cn("text-[10px] font-medium", rule.enabled ? accentColor : textMuted)}>
                              {rule.enabled ? "Active" : "Off"}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                            onClick={() => removeRule(rule.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Rule Description */}
                      <div className={cn("mt-2 ml-12 text-[10px]", textMuted)}>
                        When order is <span className={cn("font-medium", textSecondary)}>{rule.triggerStatus}</span>
                        <ArrowRight className="inline h-2.5 w-2.5 mx-1 opacity-40" />
                        wait <span className={cn("font-medium", textSecondary)}>{rule.delayHours}h</span>
                        <ArrowRight className="inline h-2.5 w-2.5 mx-1 opacity-40" />
                        auto-change to <span className={cn("font-medium", textSecondary)}>{rule.targetStatus}</span>
                        <Badge
                          variant="outline"
                          className={cn("ml-2 text-[9px] px-1.5 py-0", rule.enabled ? accentBg : "bg-slate-500/10")}
                        >
                          {rule.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Info Note */}
      <div className={cn("p-3 rounded-lg text-[10px] flex items-start gap-2", isDark ? "bg-white/[0.02] border border-white/[0.04]" : "bg-slate-50 border border-slate-200")}>
        <Clock className={cn("h-3.5 w-3.5 flex-shrink-0 mt-0.5", accentColor)} />
        <span className={textMuted}>
          Auto-status rules are evaluated periodically. The delay is calculated from when the trigger status is set.
          Only enabled rules will be executed. Disabled rules are saved but inactive.
        </span>
      </div>
    </div>
  );
}

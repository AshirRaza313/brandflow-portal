"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle, Shield, Clock, Plus, Gavel, Ban,
  User, Timer, ChevronRight, XCircle, CheckCircle2,
  AlertCircle, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useValtrioxStore } from "@/store/brandflow-store";

// ── Types ──
interface Penalty {
  id: string;
  memberId: string;
  memberName: string;
  reason: string;
  severity: "warning" | "minor" | "major" | "critical";
  restrictions: string[];
  duration: number;
  imposedBy: string;
  imposedAt: string;
  expiresAt: string;
  isActive: boolean;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: any; label: string }> = {
  warning: { color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/25", icon: AlertTriangle, label: "Warning" },
  minor: { color: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-500/25", icon: AlertCircle, label: "Minor" },
  major: { color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/25", icon: Shield, label: "Major" },
  critical: { color: "text-red-500", bg: "bg-red-500/20", border: "border-red-500/30", icon: Gavel, label: "Critical" },
};

const RESTRICTION_OPTIONS = [
  { id: "orders", label: "Orders" },
  { id: "products", label: "Products" },
  { id: "analytics", label: "Analytics" },
  { id: "marketing", label: "Marketing" },
  { id: "customers", label: "Customers" },
  { id: "reports", label: "Reports" },
  { id: "settings", label: "Settings" },
  { id: "team-management", label: "Team Mgmt" },
];

function getCountdown(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs >= 24) return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
  return `${hrs}h ${mins}m`;
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

export function PenaltyPage() {
  const { user, appTheme } = useValtrioxStore();
  const isDark = appTheme === "premium-dark" || appTheme === "dark";
  const cardCls = isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const inputCls = isDark ? "bg-slate-800/50 border-slate-600 text-white" : "";
  const labelCls = isDark ? "text-slate-300" : "";

  // ── State ──
  const [active, setActive] = useState<Penalty[]>([]);
  const [history, setHistory] = useState<Penalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    memberId: "", memberName: "", reason: "", severity: "warning" as Penalty["severity"],
    restrictions: [] as string[], duration: 24,
  });

  // ── Fetch ──
  const fetchPenalties = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/team/penalty');
      if (res.ok) {
        const data = await res.json();
        setActive(data.active);
        setHistory(data.history);
      }
    } catch { toast.error("Failed to load penalties"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchPenalties(); }, [fetchPenalties]);

  // ── Handlers ──
  const handleCreate = async () => {
    if (!form.memberName.trim() || !form.reason.trim()) { toast.error("Member name and reason are required"); return; }
    try {
      const res = await fetch('/api/team/penalty', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setActive(data.active);
        setHistory(data.history);
        toast.success("Penalty imposed successfully");
        setDialogOpen(false);
        setForm({ memberId: "", memberName: "", reason: "", severity: "warning", restrictions: [], duration: 24 });
      } else toast.error("Failed to impose penalty");
    } catch { toast.error("Something went wrong"); }
  };

  const liftPenalty = async (penalty: Penalty) => {
    try {
      const res = await fetch('/api/team/penalty', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: penalty.id, _lift: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setActive(data.active);
        setHistory(data.history);
        toast.success("Penalty lifted");
      }
    } catch { toast.error("Failed to lift penalty"); }
  };

  const removePenalty = async (penalty: Penalty) => {
    try {
      const res = await fetch('/api/team/penalty', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: penalty.id, _remove: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setActive(data.active);
        setHistory(data.history);
        toast.success("Penalty removed");
      }
    } catch { toast.error("Failed to remove penalty"); }
  };

  const toggleRestriction = (id: string) => {
    setForm(prev => ({
      ...prev,
      restrictions: prev.restrictions.includes(id)
        ? prev.restrictions.filter(r => r !== id)
        : [...prev.restrictions, id],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Team Penalty System</h1>
          <p className={`text-sm mt-1 ${textSecondary}`}>Enforce restrictions and manage team member penalties</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setDialogOpen(true)}>
          <Gavel className="mr-2 h-4 w-4" /> Impose Penalty
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: "Active Penalties", value: active.length, icon: AlertTriangle, color: "text-red-500" },
          { title: "Total Imposed", value: active.length + history.length, icon: Shield, color: "text-amber-500" },
          { title: "Critical", value: active.filter(p => p.severity === "critical").length, icon: Gavel, color: "text-red-400" },
          { title: "Restrictions", value: [...new Set(active.flatMap(p => p.restrictions))].length, icon: Lock, color: "text-purple-500" },
        ].map((stat) => (
          <Card key={stat.title} className={cardCls}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${textSecondary}`}>{stat.title}</p>
                  <p className={`text-2xl font-bold mt-1 ${textPrimary}`}>{stat.value}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className={`w-full ${isDark ? "bg-slate-800/50" : "bg-slate-100"}`}>
          <TabsTrigger value="active" className="flex-1"><AlertTriangle className="mr-2 h-4 w-4" />Active Penalties</TabsTrigger>
          <TabsTrigger value="history" className="flex-1"><Clock className="mr-2 h-4 w-4" />History</TabsTrigger>
        </TabsList>

        {/* ── ACTIVE TAB ── */}
        <TabsContent value="active">
          {active.length === 0 ? (
            <Card className={cardCls}>
              <CardContent className="p-12 text-center">
                <CheckCircle2 className={`h-12 w-12 mx-auto mb-3 text-emerald-500/50`} />
                <p className={`font-medium ${textPrimary}`}>No active penalties</p>
                <p className={`text-sm mt-1 ${textSecondary}`}>All team members are in good standing.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {active.sort((a, b) => {
                const order = { critical: 0, major: 1, minor: 2, warning: 3 };
                return (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
              }).map((penalty) => {
                const sevCfg = SEVERITY_CONFIG[penalty.severity] || SEVERITY_CONFIG.warning;
                const SevIcon = sevCfg.icon;
                const expired = isExpired(penalty.expiresAt);

                return (
                  <Card key={penalty.id} className={`${cardCls} ${expired ? "opacity-50" : `border-l-2 border-l-${penalty.severity === "critical" ? "red" : penalty.severity === "major" ? "orange" : "amber"}-500`}`}>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`h-10 w-10 rounded-xl ${sevCfg.bg} flex items-center justify-center shrink-0`}>
                            <SevIcon className={`h-5 w-5 ${sevCfg.color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className={`font-semibold ${textPrimary}`}>{penalty.memberName}</h3>
                              <Badge className={`${sevCfg.bg} ${sevCfg.color} ${sevCfg.border} text-[10px] border`}>{sevCfg.label}</Badge>
                              {expired && <Badge className="bg-slate-500/15 text-slate-400 border border-slate-500/25 text-[10px]">Expired</Badge>}
                            </div>
                            <p className={`text-sm mt-1 ${textSecondary}`}>{penalty.reason}</p>
                            {penalty.restrictions.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                <Lock className="h-3 w-3 text-slate-500" />
                                {penalty.restrictions.map((r) => (
                                  <Badge key={r} variant="outline" className={`text-[10px] capitalize ${isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                                    {r}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <span className={`text-xs ${textSecondary} flex items-center gap-1`}>
                                <Timer className="h-3 w-3" />
                                {expired ? "Expired" : `Expires in ${getCountdown(penalty.expiresAt)}`}
                              </span>
                              <span className={`text-xs ${textSecondary}`}>{penalty.duration}h duration</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:shrink-0">
                          {!expired && (
                            <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" onClick={() => liftPenalty(penalty)}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Lift
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => removePenalty(penalty)}>
                            <XCircle className="h-3 w-3 mr-1" /> Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── HISTORY TAB ── */}
        <TabsContent value="history">
          {history.length === 0 ? (
            <Card className={cardCls}>
              <CardContent className="p-12 text-center">
                <Clock className={`h-12 w-12 mx-auto mb-3 ${textSecondary}`} />
                <p className={`font-medium ${textPrimary}`}>No penalty history</p>
                <p className={`text-sm mt-1 ${textSecondary}`}>Past penalties will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className={cardCls}>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[500px]">
                  <div className="divide-y divide-white/[0.06]">
                    {history.sort((a, b) => new Date(b.imposedAt).getTime() - new Date(a.imposedAt).getTime()).map((penalty) => {
                      const sevCfg = SEVERITY_CONFIG[penalty.severity] || SEVERITY_CONFIG.warning;
                      const SevIcon = sevCfg.icon;
                      return (
                        <div key={penalty.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`h-9 w-9 rounded-lg ${sevCfg.bg} flex items-center justify-center shrink-0`}>
                              <SevIcon className={`h-4 w-4 ${sevCfg.color}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className={`text-sm font-medium ${textPrimary} truncate`}>{penalty.memberName}</h4>
                                <Badge className={`${sevCfg.bg} ${sevCfg.color} ${sevCfg.border} text-[10px] border`}>{sevCfg.label}</Badge>
                              </div>
                              <p className={`text-xs ${textSecondary} truncate`}>{penalty.reason}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge className="bg-slate-500/15 text-slate-400 border border-slate-500/25 text-[10px]">
                              {isExpired(penalty.expiresAt) ? "Expired" : "Served"}
                            </Badge>
                            <span className={`text-xs ${textSecondary} hidden sm:inline`}>
                              {new Date(penalty.imposedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── IMPOSE PENALTY DIALOG ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={textPrimary}>Impose Penalty</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className={labelCls}>Team Member *</Label>
              <Input placeholder="Member name" value={form.memberName} onChange={(e) => setForm({ ...form, memberName: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Reason *</Label>
              <Textarea placeholder="Describe the reason for this penalty..." rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={labelCls}>Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as Penalty["severity"] })}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="major">Major</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Duration (hours)</Label>
                <Input type="number" min="1" max="720" value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 24 })} className={inputCls} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Restrictions</Label>
              <div className="flex flex-wrap gap-2">
                {RESTRICTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => toggleRestriction(opt.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      form.restrictions.includes(opt.id)
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                        : isDark
                          ? "bg-white/[0.03] border-white/[0.08] text-slate-400 hover:bg-white/[0.06]"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleCreate}>
              <Gavel className="mr-2 h-4 w-4" /> Impose Penalty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

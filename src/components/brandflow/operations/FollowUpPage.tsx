"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare, Clock, Send, Plus, Pencil, Trash2, Search,
  Mail, Smartphone, MessageCircle, FileText, Zap, AlertCircle,
  CheckCircle2, XCircle, Timer, Play, Pause,
} from "lucide-react";
import { toast } from "sonner";
import { useValtrioxStore } from "@/store/brandflow-store";

// ── Types ──
interface FollowUpRule {
  id: string;
  name: string;
  triggerStatus: string;
  delayHours: number;
  channel: "whatsapp" | "email" | "sms";
  messageTemplate: string;
  enabled: boolean;
  autoSend: boolean;
}

interface HistoryEntry {
  id: string;
  orderNumber: string;
  customer: string;
  ruleName: string;
  channel: string;
  status: "sent" | "pending" | "failed";
  sentAt: string;
}

interface Template {
  id: string;
  name: string;
  category: string;
  channel: "whatsapp" | "email" | "sms";
  subject: string;
  body: string;
}

const TEMPLATES: Template[] = [
  { id: "t-1", name: "Order Confirmation", category: "Transactional", channel: "whatsapp", subject: "Order Confirmed", body: "Assalamu Alaikum! Your order {orderNumber} has been confirmed. Expected delivery: 3-5 business days. Thank you for choosing us!" },
  { id: "t-2", name: "Dispatch Notification", category: "Transactional", channel: "whatsapp", subject: "Order Dispatched", body: "Great news! Your order {orderNumber} has been dispatched. Track your order anytime on our website." },
  { id: "t-3", name: "Delivery Delight", category: "Engagement", channel: "whatsapp", subject: "Delivered!", body: "Your order {orderNumber} has been delivered! We hope you love your purchase. Please leave a review — your feedback helps us improve." },
  { id: "t-4", name: "Thank You Email", category: "Retention", channel: "email", subject: "Thank You for Shopping!", body: "Dear {customerName},\n\nThank you for shopping with us! Here's a discount code {discountCode} for your next order. Valid for 7 days.\n\nBest regards,\n{brandName}" },
  { id: "t-5", name: "Abandoned Cart", category: "Recovery", channel: "whatsapp", subject: "Complete Your Order", body: "Hey {customerName}! You left items in your cart. Complete your order now and get free shipping! Use code FREESHIP." },
  { id: "t-6", name: "Review Request SMS", category: "Engagement", channel: "sms", subject: "Leave a Review", body: "Hi {customerName}! How did you like your recent order? Tap here to leave a review: {reviewLink}" },
  { id: "t-7", name: "Restock Alert", category: "Marketing", channel: "whatsapp", subject: "Back in Stock!", body: "Great news! {productName} is back in stock. Order now before it sells out again!" },
  { id: "t-8", name: "Loyalty Milestone", category: "Retention", channel: "email", subject: "You've Earned Rewards!", body: "Dear {customerName},\n\nCongratulations! You've reached {tierName} tier. You now have {points} loyalty points. Redeem them for exclusive rewards!\n\n{brandName} Team" },
];

const SIMULATED_HISTORY: HistoryEntry[] = [
  { id: "h-1", orderNumber: "ORD-2024-001", customer: "Ahmed Khan", ruleName: "Order Confirmation", channel: "whatsapp", status: "sent", sentAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "h-2", orderNumber: "ORD-2024-002", customer: "Sara Ali", ruleName: "Dispatch Update", channel: "whatsapp", status: "sent", sentAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "h-3", orderNumber: "ORD-2024-003", customer: "Fatima Noor", ruleName: "Delivery Follow-Up", channel: "whatsapp", status: "pending", sentAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "h-4", orderNumber: "ORD-2024-004", customer: "Hassan Raza", ruleName: "Thank You", channel: "email", status: "sent", sentAt: new Date(Date.now() - 172800000).toISOString() },
  { id: "h-5", orderNumber: "ORD-2024-005", customer: "Ayesha Malik", ruleName: "Order Confirmation", channel: "whatsapp", status: "failed", sentAt: new Date(Date.now() - 1800000).toISOString() },
  { id: "h-6", orderNumber: "ORD-2024-006", customer: "Omar Siddiqui", ruleName: "Dispatch Update", channel: "whatsapp", status: "sent", sentAt: new Date(Date.now() - 10800000).toISOString() },
];

export function FollowUpPage() {
  const { user, organization, appTheme } = useValtrioxStore();
  const isDark = appTheme === "premium-dark" || appTheme === "dark";

  // ── State ──
  const [rules, setRules] = useState<FollowUpRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FollowUpRule | null>(null);
  const [form, setForm] = useState({
    name: "", triggerStatus: "confirmed", delayHours: 1,
    channel: "whatsapp" as "whatsapp" | "email" | "sms",
    messageTemplate: "", enabled: true, autoSend: false,
  });

  // ── Fetch rules ──
  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/followup/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules);
      }
    } catch {
      toast.error("Failed to load follow-up rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  // ── Handlers ──
  const openCreate = () => {
    setEditingRule(null);
    setForm({ name: "", triggerStatus: "confirmed", delayHours: 1, channel: "whatsapp", messageTemplate: "", enabled: true, autoSend: false });
    setDialogOpen(true);
  };

  const openEdit = (rule: FollowUpRule) => {
    setEditingRule(rule);
    setForm({ name: rule.name, triggerStatus: rule.triggerStatus, delayHours: rule.delayHours, channel: rule.channel, messageTemplate: rule.messageTemplate, enabled: rule.enabled, autoSend: rule.autoSend });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Rule name is required"); return; }
    try {
      if (editingRule) {
        const res = await fetch('/api/followup/rules', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingRule.id, ...form }),
        });
        if (res.ok) { const data = await res.json(); setRules(data.rules); toast.success("Rule updated"); setDialogOpen(false); }
        else toast.error("Failed to update rule");
      } else {
        const res = await fetch('/api/followup/rules', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (res.ok) { const data = await res.json(); setRules(data.rules); toast.success("Rule created"); setDialogOpen(false); }
        else toast.error("Failed to create rule");
      }
    } catch { toast.error("Something went wrong"); }
  };

  const toggleEnabled = async (rule: FollowUpRule) => {
    try {
      const res = await fetch('/api/followup/rules', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
      });
      if (res.ok) { const data = await res.json(); setRules(data.rules); toast.success(rule.enabled ? "Rule disabled" : "Rule enabled"); }
    } catch { toast.error("Failed to toggle rule"); }
  };

  const deleteRule = async (rule: FollowUpRule) => {
    const updated = rules.filter(r => r.id !== rule.id);
    try {
      const res = await fetch('/api/followup/rules', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: '__replace_all__', ...updated }),
      });
      if (res.ok) { setRules(updated); toast.success("Rule deleted"); }
    } catch { toast.error("Failed to delete rule"); }
  };

  const applyTemplate = (tpl: Template) => {
    setForm(prev => ({ ...prev, messageTemplate: tpl.body, channel: tpl.channel, name: tpl.name }));
    setDialogOpen(true);
    setEditingRule(null);
  };

  // ── Helpers ──
  const channelIcon = (ch: string) => {
    if (ch === "whatsapp") return <MessageCircle className="h-4 w-4 text-green-500" />;
    if (ch === "email") return <Mail className="h-4 w-4 text-blue-500" />;
    return <Smartphone className="h-4 w-4 text-purple-500" />;
  };

  const statusBadge = (s: string) => {
    if (s === "sent") return <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs">Sent</Badge>;
    if (s === "pending") return <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/25 text-xs">Pending</Badge>;
    return <Badge className="bg-red-500/15 text-red-400 border border-red-500/25 text-xs">Failed</Badge>;
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return "Just now";
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const cardCls = isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const inputCls = isDark ? "bg-slate-800/50 border-slate-600 text-white" : "";
  const labelCls = isDark ? "text-slate-300" : "";

  const filteredRules = rules.filter(r => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.triggerStatus.toLowerCase().includes(searchQuery.toLowerCase()));

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
          <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Follow-Up Automation</h1>
          <p className={`text-sm mt-1 ${textSecondary}`}>Automate customer communication with smart follow-up rules</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search rules..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`pl-9 w-48 ${inputCls}`} />
          </div>
          <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Rule
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: "Total Rules", value: rules.length, icon: FileText, color: "text-amber-500" },
          { title: "Active", value: rules.filter(r => r.enabled).length, icon: Play, color: "text-emerald-500" },
          { title: "Auto-Sending", value: rules.filter(r => r.autoSend && r.enabled).length, icon: Zap, color: "text-purple-500" },
          { title: "Channels", value: new Set(rules.map(r => r.channel)).size, icon: MessageSquare, color: "text-blue-500" },
        ].map((stat) => (
          <Card key={stat.title} className={cardCls}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${textSecondary}`}>{stat.title}</p>
                  <p className={`text-2xl font-bold mt-1 ${textPrimary}`}>{stat.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList className={`w-full ${isDark ? "bg-slate-800/50" : "bg-slate-100"}`}>
          <TabsTrigger value="rules" className="flex-1"><FileText className="mr-2 h-4 w-4" />Rules</TabsTrigger>
          <TabsTrigger value="history" className="flex-1"><Clock className="mr-2 h-4 w-4" />History</TabsTrigger>
          <TabsTrigger value="templates" className="flex-1"><MessageSquare className="mr-2 h-4 w-4" />Templates</TabsTrigger>
        </TabsList>

        {/* ── RULES TAB ── */}
        <TabsContent value="rules">
          <div className="space-y-3">
            {filteredRules.length === 0 ? (
              <Card className={cardCls}>
                <CardContent className="p-12 text-center">
                  <AlertCircle className={`h-12 w-12 mx-auto mb-3 ${textSecondary}`} />
                  <p className={`font-medium ${textPrimary}`}>No follow-up rules found</p>
                  <p className={`text-sm mt-1 ${textSecondary}`}>Create your first rule to start automating customer communication.</p>
                  <Button className="mt-4 bg-amber-600 hover:bg-amber-700" onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Create Rule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredRules.map((rule) => (
                <Card key={rule.id} className={`${cardCls} ${!rule.enabled ? "opacity-60" : ""}`}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5">{channelIcon(rule.channel)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`font-semibold ${textPrimary} truncate`}>{rule.name}</h3>
                            {rule.autoSend && (
                              <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/25 text-[10px]">
                                <Zap className="h-2.5 w-2.5 mr-1" />AUTO
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className={`text-xs ${textSecondary}`}>
                              Trigger: <span className="font-medium capitalize text-amber-500">{rule.triggerStatus}</span>
                            </span>
                            <span className={`text-xs ${textSecondary}`}>
                              Delay: <span className="font-medium text-amber-500">{rule.delayHours}h</span>
                            </span>
                            <span className={`text-xs ${textSecondary}`}>
                              Channel: <span className="font-medium capitalize">{rule.channel}</span>
                            </span>
                          </div>
                          {rule.messageTemplate && (
                            <p className={`text-xs mt-2 line-clamp-2 ${textSecondary}`}>{rule.messageTemplate}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:shrink-0">
                        <Switch checked={rule.enabled} onCheckedChange={() => toggleEnabled(rule)} />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rule)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => deleteRule(rule)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ── HISTORY TAB ── */}
        <TabsContent value="history">
          <Card className={cardCls}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${textPrimary}`}>
                <Clock className="h-5 w-5 text-amber-500" /> Follow-Up History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                <div className="space-y-2">
                  {SIMULATED_HISTORY.map((entry) => (
                    <div key={entry.id} className={`flex items-center justify-between p-3 rounded-lg border ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-100 bg-slate-50"}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        {channelIcon(entry.channel)}
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${textPrimary} truncate`}>{entry.ruleName}</p>
                          <p className={`text-xs ${textSecondary}`}>{entry.customer} &middot; {entry.orderNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:shrink-0">
                        {statusBadge(entry.status)}
                        <span className={`text-xs ${textSecondary}`}>{timeAgo(entry.sentAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TEMPLATES TAB ── */}
        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEMPLATES.map((tpl) => (
              <Card key={tpl.id} className={cardCls}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5">{channelIcon(tpl.channel)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`font-semibold text-sm ${textPrimary}`}>{tpl.name}</h3>
                          <Badge variant="outline" className={`text-[10px] ${isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>{tpl.category}</Badge>
                        </div>
                        <p className={`text-xs mt-1.5 line-clamp-2 ${textSecondary}`}>{tpl.body}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0 border-amber-500/30 text-amber-500 hover:bg-amber-500/10" onClick={() => applyTemplate(tpl)}>
                      <Send className="h-3 w-3 mr-1" /> Use
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── CREATE/EDIT DIALOG ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={textPrimary}>{editingRule ? "Edit Follow-Up Rule" : "New Follow-Up Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className={labelCls}>Rule Name</Label>
              <Input placeholder="e.g., Order Confirmation" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={labelCls}>Trigger Status</Label>
                <Select value={form.triggerStatus} onValueChange={(v) => setForm({ ...form, triggerStatus: v })}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="dispatched">Dispatched</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Delay (hours)</Label>
                <Input type="number" min="0" max="720" value={form.delayHours} onChange={(e) => setForm({ ...form, delayHours: parseInt(e.target.value) || 0 })} className={inputCls} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Channel</Label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as "whatsapp" | "email" | "sms" })}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Message Template</Label>
              <Textarea placeholder="Use {orderNumber}, {customerName} as placeholders..." rows={4} value={form.messageTemplate} onChange={(e) => setForm({ ...form, messageTemplate: e.target.value })} className={inputCls} />
              <p className={`text-[10px] ${textSecondary}`}>Variables: {'{orderNumber}'}, {'{customerName}'}, {'{brandName}'}, {'{discountCode}'}</p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
                <Label className={labelCls}>Enabled</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.autoSend} onCheckedChange={(v) => setForm({ ...form, autoSend: v })} />
                <Label className={labelCls}>Auto-Send</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSave}>
              {editingRule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

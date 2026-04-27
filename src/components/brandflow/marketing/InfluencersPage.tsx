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
  Users, Search, Filter, Plus, Pencil, Trash2, Instagram,
  Youtube, Facebook, Twitter, TrendingUp, DollarSign, Target,
  Eye, BarChart3, Handshake, Award, Star, ArrowUpRight,
  ExternalLink, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useValtrioxStore } from "@/store/brandflow-store";

// ── Types ──
interface Influencer {
  id: string;
  name: string;
  platform: "instagram" | "tiktok" | "youtube" | "facebook" | "twitter";
  handle: string;
  followers: number;
  tier: "nano" | "micro" | "mid" | "macro" | "mega";
  status: "active" | "paused" | "completed";
  collaborationType: "barter" | "paid" | "affiliate" | "gifting";
  compensation: number;
  campaign: string;
  deliverables: string;
  reach: number;
  engagement: number;
  conversions: number;
  roi: number;
  notes: string;
  addedAt: string;
}

const PLATFORMS = ["instagram", "tiktok", "youtube", "facebook", "twitter"] as const;
const TIERS = ["nano", "micro", "mid", "macro", "mega"] as const;
const STATUSES = ["active", "paused", "completed"] as const;
const COLLAB_TYPES = ["barter", "paid", "affiliate", "gifting"] as const;

const TIER_CONFIG: Record<string, { color: string; bg: string; border: string; min: number; max: number }> = {
  nano: { color: "text-slate-400", bg: "bg-slate-500/15", border: "border-slate-500/25", min: 0, max: 9999 },
  micro: { color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/25", min: 10000, max: 49999 },
  mid: { color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/25", min: 50000, max: 499999 },
  macro: { color: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-500/25", min: 500000, max: 999999 },
  mega: { color: "text-purple-400", bg: "bg-purple-500/15", border: "border-purple-500/25", min: 1000000, max: Infinity },
};

const platformIcon = (p: string, cls = "h-4 w-4") => {
  switch (p) {
    case "instagram": return <Instagram className={`${cls} text-pink-500`} />;
    case "tiktok": return <svg className={`${cls} text-white`} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.72a8.27 8.27 0 004.76 1.5V6.79a4.84 4.84 0 01-1-.1z"/></svg>;
    case "youtube": return <Youtube className={`${cls} text-red-500`} />;
    case "facebook": return <Facebook className={`${cls} text-blue-500`} />;
    case "twitter": return <Twitter className={`${cls} text-sky-400`} />;
    default: return <Users className={cls} />;
  }
};

const formatNumber = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};

const emptyForm = (): Omit<Influencer, 'id' | 'addedAt'> => ({
  name: "", platform: "instagram", handle: "", followers: 0, tier: "nano",
  status: "active", collaborationType: "barter", compensation: 0,
  campaign: "", deliverables: "", reach: 0, engagement: 0, conversions: 0, roi: 0, notes: "",
});

export function InfluencersPage() {
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme === "premium-dark" || appTheme === "dark";
  const cardCls = isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const inputCls = isDark ? "bg-slate-800/50 border-slate-600 text-white" : "";
  const labelCls = isDark ? "text-slate-300" : "";

  // ── State ──
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Influencer | null>(null);
  const [form, setForm] = useState(emptyForm());

  // ── Fetch ──
  const fetchInfluencers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/influencers');
      if (res.ok) {
        const data = await res.json();
        setInfluencers(data.influencers);
      }
    } catch { toast.error("Failed to load influencers"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchInfluencers(); }, [fetchInfluencers]);

  // ── Handlers ──
  const openCreate = () => { setEditing(null); setForm(emptyForm()); setDialogOpen(true); };
  const openEdit = (inf: Influencer) => { setEditing(inf); setForm({ name: inf.name, platform: inf.platform, handle: inf.handle, followers: inf.followers, tier: inf.tier, status: inf.status, collaborationType: inf.collaborationType, compensation: inf.compensation, campaign: inf.campaign, deliverables: inf.deliverables, reach: inf.reach, engagement: inf.engagement, conversions: inf.conversions, roi: inf.roi, notes: inf.notes }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.handle.trim()) { toast.error("Name and handle are required"); return; }
    try {
      const payload = { ...form, followers: Number(form.followers), compensation: Number(form.compensation), reach: Number(form.reach), engagement: Number(form.engagement), conversions: Number(form.conversions), roi: Number(form.roi) };
      if (editing) {
        const res = await fetch('/api/influencers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) });
        if (res.ok) { const d = await res.json(); setInfluencers(d.influencers); toast.success("Influencer updated"); setDialogOpen(false); } else toast.error("Update failed");
      } else {
        const res = await fetch('/api/influencers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) { const d = await res.json(); setInfluencers(d.influencers); toast.success("Influencer added"); setDialogOpen(false); } else toast.error("Create failed");
      }
    } catch { toast.error("Something went wrong"); }
  };

  const handleDelete = async (inf: Influencer) => {
    try {
      const res = await fetch('/api/influencers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: inf.id, _delete: true }) });
      if (res.ok) { const d = await res.json(); setInfluencers(d.influencers); toast.success("Influencer removed"); }
    } catch { toast.error("Delete failed"); }
  };

  // ── Computed ──
  const filtered = influencers.filter(i => {
    if (filterPlatform !== "all" && i.platform !== filterPlatform) return false;
    if (filterTier !== "all" && i.tier !== filterTier) return false;
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    if (searchQuery && !i.name.toLowerCase().includes(searchQuery.toLowerCase()) && !i.handle.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalSpend = influencers.reduce((s, i) => s + i.compensation, 0);
  const totalReach = influencers.reduce((s, i) => s + i.reach, 0);
  const avgEngagement = influencers.length ? Math.round(influencers.reduce((s, i) => s + i.engagement, 0) / influencers.length * 10) / 10 : 0;
  const totalConversions = influencers.reduce((s, i) => s + i.conversions, 0);
  const topPerformer = influencers.reduce((best, i) => (i.conversions > (best?.conversions || 0) ? i : best), influencers[0] || null);

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
          <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Influencer Tracker</h1>
          <p className={`text-sm mt-1 ${textSecondary}`}>Manage partnerships, track performance, and measure ROI</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Influencer
        </Button>
      </div>

      <Tabs defaultValue="directory" className="space-y-6">
        <TabsList className={`w-full ${isDark ? "bg-slate-800/50" : "bg-slate-100"}`}>
          <TabsTrigger value="directory" className="flex-1"><Users className="mr-2 h-4 w-4" />Directory</TabsTrigger>
          <TabsTrigger value="campaigns" className="flex-1"><Handshake className="mr-2 h-4 w-4" />Campaigns</TabsTrigger>
          <TabsTrigger value="roi" className="flex-1"><BarChart3 className="mr-2 h-4 w-4" />ROI Dashboard</TabsTrigger>
        </TabsList>

        {/* ── DIRECTORY TAB ── */}
        <TabsContent value="directory">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or handle..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`pl-9 ${inputCls}`} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                <SelectTrigger className={`w-32 ${inputCls}`}><SelectValue placeholder="Platform" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {PLATFORMS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger className={`w-28 ${inputCls}`}><SelectValue placeholder="Tier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  {TIERS.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className={`w-28 ${inputCls}`}><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <Card className={cardCls}>
              <CardContent className="p-12 text-center">
                <Users className={`h-12 w-12 mx-auto mb-3 ${textSecondary}`} />
                <p className={`font-medium ${textPrimary}`}>No influencers found</p>
                <p className={`text-sm mt-1 ${textSecondary}`}>Add influencers to start tracking partnerships.</p>
                <Button className="mt-4 bg-amber-600 hover:bg-amber-700" onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Influencer</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((inf) => {
                const tierCfg = TIER_CONFIG[inf.tier] || TIER_CONFIG.nano;
                return (
                  <Card key={inf.id} className={`${cardCls} group hover:border-amber-500/30 transition-colors`}>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-11 w-11 rounded-xl ${isDark ? "bg-white/[0.06]" : "bg-slate-100"} flex items-center justify-center shrink-0`}>
                            {platformIcon(inf.platform, "h-5 w-5")}
                          </div>
                          <div className="min-w-0">
                            <h3 className={`font-semibold text-sm ${textPrimary} truncate`}>{inf.name}</h3>
                            <p className={`text-xs ${textSecondary}`}>{inf.handle}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(inf)}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => handleDelete(inf)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Badge className={`${tierCfg.bg} ${tierCfg.color} ${tierCfg.border} text-[10px] border capitalize`}>{inf.tier}</Badge>
                        <Badge className={`text-[10px] border ${inf.status === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : inf.status === "paused" ? "bg-amber-500/15 text-amber-400 border-amber-500/25" : "bg-slate-500/15 text-slate-400 border-slate-500/25"} capitalize`}>{inf.status}</Badge>
                        <span className={`text-[10px] ${textSecondary}`}>{formatNumber(inf.followers)} followers</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-4">
                        {[
                          { label: "Reach", value: formatNumber(inf.reach) },
                          { label: "Engage", value: `${inf.engagement}%` },
                          { label: "Conv.", value: String(inf.conversions) },
                        ].map((m) => (
                          <div key={m.label} className={`text-center p-2 rounded-lg ${isDark ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                            <p className={`text-[10px] ${textSecondary}`}>{m.label}</p>
                            <p className={`text-sm font-semibold ${textPrimary}`}>{m.value}</p>
                          </div>
                        ))}
                      </div>

                      {inf.campaign && (
                        <div className={`mt-3 text-xs ${textSecondary} truncate`}>
                          <Award className="h-3 w-3 inline mr-1 text-amber-500" />{inf.campaign}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── CAMPAIGNS TAB ── */}
        <TabsContent value="campaigns">
          {influencers.filter(i => i.campaign).length === 0 ? (
            <Card className={cardCls}>
              <CardContent className="p-12 text-center">
                <Handshake className={`h-12 w-12 mx-auto mb-3 ${textSecondary}`} />
                <p className={`font-medium ${textPrimary}`}>No campaigns yet</p>
                <p className={`text-sm mt-1 ${textSecondary}`}>Assign campaigns to influencers to track collaborations.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {influencers.filter(i => i.campaign).map((inf) => (
                <Card key={inf.id} className={cardCls}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-10 w-10 rounded-xl ${isDark ? "bg-white/[0.06]" : "bg-slate-100"} flex items-center justify-center`}>
                          {platformIcon(inf.platform, "h-5 w-5")}
                        </div>
                        <div className="min-w-0">
                          <h3 className={`font-semibold text-sm ${textPrimary}`}>{inf.name}</h3>
                          <p className={`text-xs ${textSecondary}`}>{inf.handle} &middot; {inf.campaign}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="text-center">
                          <p className={`text-[10px] ${textSecondary}`}>Type</p>
                          <Badge variant="outline" className={`text-[10px] capitalize ${isDark ? "border-white/10 text-slate-400" : ""}`}>{inf.collaborationType}</Badge>
                        </div>
                        <div className="text-center">
                          <p className={`text-[10px] ${textSecondary}`}>Compensation</p>
                          <p className={`text-sm font-semibold text-amber-500`}>${inf.compensation.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-[10px] ${textSecondary}`}>Deliverables</p>
                          <p className={`text-sm ${textPrimary}`}>{inf.deliverables || "—"}</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-[10px] ${textSecondary}`}>Conversions</p>
                          <p className={`text-sm font-semibold ${textPrimary}`}>{inf.conversions}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10" onClick={() => openEdit(inf)}>
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── ROI DASHBOARD TAB ── */}
        <TabsContent value="roi">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { title: "Total Spend", value: `$${totalSpend.toLocaleString()}`, icon: DollarSign, color: "text-amber-500" },
              { title: "Total Reach", value: formatNumber(totalReach), icon: Eye, color: "text-emerald-500" },
              { title: "Avg Engagement", value: `${avgEngagement}%`, icon: TrendingUp, color: "text-blue-500" },
              { title: "Conversions", value: String(totalConversions), icon: Target, color: "text-purple-500" },
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

          {/* Top Performer */}
          {topPerformer && (
            <Card className={`${cardCls} border-amber-500/30 mb-6`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Star className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-medium uppercase tracking-wider ${textSecondary}`}>Top Performer</p>
                    <h3 className={`text-lg font-bold ${textPrimary}`}>{topPerformer.name}</h3>
                    <p className={`text-xs ${textSecondary}`}>{topPerformer.handle} &middot; {topPerformer.conversions} conversions &middot; {topPerformer.reach.toLocaleString()} reach</p>
                  </div>
                  <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/25">
                    <Zap className="h-3 w-3 mr-1" />ROI: {topPerformer.roi}x
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Conversions Bar Chart */}
          <Card className={cardCls}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${textPrimary}`}>
                <BarChart3 className="h-5 w-5 text-amber-500" /> Conversions by Influencer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {influencers.filter(i => i.conversions > 0).length === 0 ? (
                <p className={`text-sm ${textSecondary} text-center py-8`}>No conversion data available yet.</p>
              ) : (
                <ScrollArea className="max-h-80">
                  <div className="space-y-3">
                    {influencers
                      .filter(i => i.conversions > 0)
                      .sort((a, b) => b.conversions - a.conversions)
                      .map((inf) => {
                        const maxConv = Math.max(...influencers.filter(i => i.conversions > 0).map(i => i.conversions));
                        const pct = maxConv > 0 ? (inf.conversions / maxConv) * 100 : 0;
                        return (
                          <div key={inf.id} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                {platformIcon(inf.platform, "h-3.5 w-3.5")}
                                <span className={`text-xs font-medium ${textPrimary} truncate`}>{inf.name}</span>
                              </div>
                              <span className={`text-xs font-semibold text-amber-500`}>{inf.conversions}</span>
                            </div>
                            <div className={`h-2 rounded-full ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                              <div className="h-2 rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── ADD/EDIT DIALOG ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={textPrimary}>{editing ? "Edit Influencer" : "Add Influencer"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={labelCls}>Name *</Label>
                  <Input placeholder="Influencer name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-2">
                  <Label className={labelCls}>Handle *</Label>
                  <Input placeholder="@username" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={labelCls}>Platform</Label>
                  <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v as Influencer["platform"] })}>
                    <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className={labelCls}>Followers</Label>
                  <Input type="number" placeholder="10000" value={form.followers} onChange={(e) => setForm({ ...form, followers: Number(e.target.value) || 0 })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className={labelCls}>Tier</Label>
                  <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v as Influencer["tier"] })}>
                    <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIERS.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className={labelCls}>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Influencer["status"] })}>
                    <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className={labelCls}>Collab Type</Label>
                  <Select value={form.collaborationType} onValueChange={(v) => setForm({ ...form, collaborationType: v as Influencer["collaborationType"] })}>
                    <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COLLAB_TYPES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={labelCls}>Compensation ($)</Label>
                  <Input type="number" placeholder="0" value={form.compensation} onChange={(e) => setForm({ ...form, compensation: Number(e.target.value) || 0 })} className={inputCls} />
                </div>
                <div className="space-y-2">
                  <Label className={labelCls}>Campaign</Label>
                  <Input placeholder="Campaign name" value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Deliverables</Label>
                <Input placeholder="e.g., 3 posts + 1 reel" value={form.deliverables} onChange={(e) => setForm({ ...form, deliverables: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className={labelCls}>Reach</Label>
                  <Input type="number" placeholder="0" value={form.reach} onChange={(e) => setForm({ ...form, reach: Number(e.target.value) || 0 })} className={inputCls} />
                </div>
                <div className="space-y-2">
                  <Label className={labelCls}>Engagement %</Label>
                  <Input type="number" step="0.1" placeholder="0" value={form.engagement} onChange={(e) => setForm({ ...form, engagement: Number(e.target.value) || 0 })} className={inputCls} />
                </div>
                <div className="space-y-2">
                  <Label className={labelCls}>Conversions</Label>
                  <Input type="number" placeholder="0" value={form.conversions} onChange={(e) => setForm({ ...form, conversions: Number(e.target.value) || 0 })} className={inputCls} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Notes</Label>
                <Textarea placeholder="Additional notes..." rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSave}>{editing ? "Update" : "Add Influencer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

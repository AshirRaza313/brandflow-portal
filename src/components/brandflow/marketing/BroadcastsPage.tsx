"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Megaphone, Search, Plus, Send, Mail, MessageSquare, Smartphone,
  TrendingUp, Eye, MousePointer, BarChart3, Copy, Clock, Users,
  Zap, Gift, Star, Rocket, Heart, Sparkles, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useValtrioxStore } from "@/store/brandflow-store";

// ── Types ──
interface Broadcast {
  id: string;
  name: string;
  channel: "whatsapp" | "email" | "sms";
  status: "draft" | "scheduled" | "sent" | "failed";
  targetAudience: "all" | "vip" | "new" | "inactive" | "segment";
  message: string;
  scheduledAt?: string;
  sentAt?: string;
  recipientCount: number;
  openRate: number;
  clickRate: number;
  createdAt: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  channel: "whatsapp" | "email" | "sms";
  message: string;
  icon: React.ReactNode;
}

const TEMPLATES: Template[] = [
  {
    id: "order-confirm",
    name: "Order Confirmation",
    description: "Confirm a customer's order with details",
    category: "Transaction",
    channel: "whatsapp",
    message: "Hi {name}! Thank you for your order #{order_id}. We're preparing it now and will notify you when it ships. Track your order anytime!",
    icon: <Send className="h-4 w-4" />,
  },
  {
    id: "flash-sale",
    name: "Flash Sale Announcement",
    description: "Drive urgency with a time-limited offer",
    category: "Promotion",
    channel: "email",
    message: "⚡ FLASH SALE ALERT!\n\nFor the next {hours} hours only, get {discount}% off on our entire collection!\n\nUse code: {code}\nShop now before it's gone!",
    icon: <Zap className="h-4 w-4" />,
  },
  {
    id: "new-product",
    name: "New Product Launch",
    description: "Announce a new product to your audience",
    category: "Launch",
    channel: "email",
    message: "🎉 Something exciting just dropped!\n\nIntroducing {product_name} — the latest addition to our collection.\n\nBe among the first to experience it. Early bird pricing available for the first 48 hours!",
    icon: <Rocket className="h-4 w-4" />,
  },
  {
    id: "seasonal-greeting",
    name: "Seasonal Greeting",
    description: "Send holiday or seasonal greetings",
    category: "Engagement",
    channel: "whatsapp",
    message: "✨ {season} Wishes from {brand}!\n\nWishing you and your loved ones a wonderful {season}! As a token of appreciation, enjoy {discount}% off your next purchase.\n\nHappy {season}! 🎊",
    icon: <Gift className="h-4 w-4" />,
  },
  {
    id: "win-back",
    name: "Win-Back for Inactive Customers",
    description: "Re-engage customers who haven't purchased recently",
    category: "Retention",
    channel: "email",
    message: "We miss you, {name}! 💛\n\nIt's been a while since your last visit. Here's an exclusive {discount}% discount just for you, valid for 7 days.\n\nUse code: COMEBACK\nWe'd love to see you again!",
    icon: <Heart className="h-4 w-4" />,
  },
  {
    id: "review-request",
    name: "Review Request",
    description: "Ask customers to leave a review",
    category: "Engagement",
    channel: "sms",
    message: "Hi {name}, thanks for shopping with {brand}! ⭐ Your opinion matters to us. Would you mind leaving a quick review? Tap here: {link}",
    icon: <Star className="h-4 w-4" />,
  },
  {
    id: "loyalty-reward",
    name: "Loyalty Reward",
    description: "Notify VIP customers about loyalty rewards",
    category: "Retention",
    channel: "whatsapp",
    message: "🎉 Congratulations, {name}!\n\nYou've earned {points} loyalty points! Redeem them for amazing rewards or save them for something special.\n\nYour VIP tier: {tier}",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: "abandoned-cart",
    name: "Abandoned Cart Reminder",
    description: "Remind customers about items in their cart",
    category: "Conversion",
    channel: "sms",
    message: "Hi {name}, you left items in your cart! 🛒 Complete your purchase now and get {discount}% off with code: COMPLETENOW. Offer expires in 24h!",
    icon: <AlertCircle className="h-4 w-4" />,
  },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; darkColor: string }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700 border-slate-200", darkColor: "bg-slate-500/15 text-slate-400 border border-slate-500/25" },
  scheduled: { label: "Scheduled", color: "bg-amber-100 text-amber-700 border-amber-200", darkColor: "bg-amber-500/15 text-amber-400 border border-amber-500/25" },
  sent: { label: "Sent", color: "bg-emerald-100 text-emerald-700 border-emerald-200", darkColor: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700 border-red-200", darkColor: "bg-red-500/15 text-red-400 border border-red-500/25" },
};

const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  whatsapp: { label: "WhatsApp", icon: <MessageSquare className="h-3.5 w-3.5" />, color: "text-emerald-500" },
  email: { label: "Email", icon: <Mail className="h-3.5 w-3.5" />, color: "text-amber-500" },
  sms: { label: "SMS", icon: <Smartphone className="h-3.5 w-3.5" />, color: "text-sky-500" },
};

const AUDIENCE_LABELS: Record<string, string> = {
  all: "All Customers",
  vip: "VIP",
  new: "New Customers",
  inactive: "Inactive",
  segment: "Custom Segment",
};

export function BroadcastsPage() {
  const isDark = typeof window !== "undefined" && document.documentElement.classList.contains("dark");
  const { appTheme } = useValtrioxStore();

  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("campaigns");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    channel: "whatsapp" as Broadcast["channel"],
    targetAudience: "all" as Broadcast["targetAudience"],
    message: "",
    scheduledAt: "",
  });

  const fetchBroadcasts = useCallback(async () => {
    try {
      const res = await fetch("/api/broadcasts");
      if (res.ok) {
        const data = await res.json();
        setBroadcasts(data.broadcasts || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBroadcasts(); }, [fetchBroadcasts]);

  const handleCreate = async () => {
    if (!formData.name.trim()) { toast.error("Campaign name is required"); return; }
    if (!formData.message.trim()) { toast.error("Message content is required"); return; }
    try {
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          status: formData.scheduledAt ? "scheduled" : "draft",
        }),
      });
      if (res.ok) {
        toast.success("Broadcast campaign created!");
        setCreateOpen(false);
        setFormData({ name: "", channel: "whatsapp", targetAudience: "all", message: "", scheduledAt: "" });
        fetchBroadcasts();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create broadcast");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/broadcasts?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Broadcast deleted");
        fetchBroadcasts();
      }
    } catch {
      toast.error("Failed to delete broadcast");
    }
  };

  const handleUseTemplate = (template: Template) => {
    setFormData({
      name: template.name,
      channel: template.channel,
      targetAudience: "all",
      message: template.message,
      scheduledAt: "",
    });
    setCreateOpen(true);
    setActiveTab("campaigns");
    toast.success(`Template "${template.name}" loaded`);
  };

  // ── Analytics calculations ──
  const totalSent = broadcasts.filter((b) => b.status === "sent").length;
  const avgOpenRate = broadcasts.filter((b) => b.status === "sent").length > 0
    ? broadcasts.filter((b) => b.status === "sent").reduce((s, b) => s + b.openRate, 0) / broadcasts.filter((b) => b.status === "sent").length
    : 0;
  const avgClickRate = broadcasts.filter((b) => b.status === "sent").length > 0
    ? broadcasts.filter((b) => b.status === "sent").reduce((s, b) => s + b.clickRate, 0) / broadcasts.filter((b) => b.status === "sent").length
    : 0;

  // Channel stats for bar chart
  const channelStats = ["whatsapp", "email", "sms"].map((ch) => {
    const chBroadcasts = broadcasts.filter((b) => b.channel === ch && b.status === "sent");
    return {
      channel: ch,
      count: chBroadcasts.length,
      totalRecipients: chBroadcasts.reduce((s, b) => s + b.recipientCount, 0),
      avgOpen: chBroadcasts.length > 0 ? chBroadcasts.reduce((s, b) => s + b.openRate, 0) / chBroadcasts.length : 0,
    };
  });
  const maxChannelCount = Math.max(...channelStats.map((c) => c.totalRecipients), 1);

  // Best performing channel
  const bestChannel = channelStats.reduce((best, cur) => cur.avgOpen > best.avgOpen ? cur : best, channelStats[0]);

  // Filtered campaigns
  const filteredBroadcasts = broadcasts.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.message.toLowerCase().includes(q);
    }
    return true;
  });

  // Template categories
  const templateCategories = [...new Set(TEMPLATES.map((t) => t.category))];

  const cardClass = isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-white border-slate-200";
  const primaryText = isDark ? "text-white" : "text-slate-900";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-500";
  const inputCls = isDark ? "bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500" : "";
  const labelCls = isDark ? "text-slate-300" : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${primaryText}`}>Broadcast Center</h1>
          <p className={`text-sm mt-1 ${secondaryText}`}>Create, schedule, and track multi-channel campaigns</p>
        </div>
        <Button
          className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" /> New Broadcast
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`w-full sm:w-auto ${isDark ? "bg-white/[0.05]" : "bg-slate-100"}`}>
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
            <Megaphone className="mr-1.5 h-3.5 w-3.5" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Templates
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Analytics
          </TabsTrigger>
        </TabsList>

        {/* ═══ CAMPAIGNS TAB ═══ */}
        <TabsContent value="campaigns" className="mt-6 space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Campaigns", value: broadcasts.length, icon: <Megaphone className="h-4 w-4 text-amber-500" /> },
              { label: "Total Sent", value: totalSent, icon: <Send className="h-4 w-4 text-emerald-500" /> },
              { label: "Scheduled", value: broadcasts.filter((b) => b.status === "scheduled").length, icon: <Clock className="h-4 w-4 text-sky-500" /> },
              { label: "Recipients", value: broadcasts.reduce((s, b) => s + b.recipientCount, 0), icon: <Users className="h-4 w-4 text-rose-500" /> },
            ].map((stat) => (
              <Card key={stat.label} className={cardClass}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${secondaryText}`}>{stat.label}</span>
                    {stat.icon}
                  </div>
                  <p className={`text-2xl font-bold ${primaryText}`}>{stat.value.toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${secondaryText}`} />
              <Input
                placeholder="Search campaigns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`pl-9 ${inputCls}`}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={`w-full sm:w-40 ${inputCls}`}>
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campaign Cards */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : filteredBroadcasts.length > 0 ? (
            <div className="grid gap-3">
              <AnimatePresence>
                {filteredBroadcasts.map((b) => {
                  const chCfg = CHANNEL_CONFIG[b.channel];
                  const stCfg = STATUS_CONFIG[b.status];
                  return (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`p-4 rounded-xl border ${cardClass} hover:border-amber-500/30 transition-colors`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Channel icon */}
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                          <span className={chCfg.color}>{chCfg.icon}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold truncate ${primaryText}`}>{b.name}</h3>
                            <Badge variant="outline" className={isDark ? stCfg.darkColor : stCfg.color}>
                              {stCfg.label}
                            </Badge>
                          </div>
                          <p className={`text-sm truncate ${secondaryText}`}>
                            {b.message.substring(0, 120)}{b.message.length > 120 ? "..." : ""}
                          </p>
                          <div className={`flex flex-wrap items-center gap-3 mt-2 text-xs ${secondaryText}`}>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> {AUDIENCE_LABELS[b.targetAudience]}
                            </span>
                            {b.scheduledAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {new Date(b.scheduledAt).toLocaleDateString()}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Send className="h-3 w-3" /> {b.recipientCount.toLocaleString()} recipients
                            </span>
                            {b.status === "sent" && (
                              <>
                                <span className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" /> {b.openRate.toFixed(1)}% opens
                                </span>
                                <span className="flex items-center gap-1">
                                  <MousePointer className="h-3 w-3" /> {b.clickRate.toFixed(1)}% clicks
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => handleDelete(b.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <Card className={cardClass}>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? "bg-white/[0.05]" : "bg-slate-100"}`}>
                  <Megaphone className={`h-8 w-8 ${secondaryText}`} />
                </div>
                <h3 className={`text-lg font-semibold mb-1 ${primaryText}`}>No campaigns yet</h3>
                <p className={`text-sm ${secondaryText} max-w-sm mb-4`}>
                  Create your first broadcast campaign to reach your customers across WhatsApp, Email, and SMS.
                </p>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create Broadcast
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ TEMPLATES TAB ═══ */}
        <TabsContent value="templates" className="mt-6 space-y-6">
          <div>
            <h2 className={`text-lg font-bold mb-1 ${primaryText}`}>Message Templates</h2>
            <p className={`text-sm ${secondaryText}`}>Pre-built templates for common campaigns. Click to use one.</p>
          </div>

          {templateCategories.map((category) => (
            <div key={category} className="space-y-3">
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${secondaryText}`}>{category}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {TEMPLATES.filter((t) => t.category === category).map((template) => {
                  const chCfg = CHANNEL_CONFIG[template.channel];
                  return (
                    <motion.div
                      key={template.id}
                      whileHover={{ scale: 1.01 }}
                      className={`p-4 rounded-xl border ${cardClass} cursor-pointer hover:border-amber-500/30 transition-colors group`}
                      onClick={() => handleUseTemplate(template)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                          <span className="text-amber-500">{template.icon}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-semibold text-sm truncate ${primaryText}`}>{template.name}</h4>
                          </div>
                          <p className={`text-xs mb-2 ${secondaryText}`}>{template.description}</p>
                          <div className="flex items-center gap-2">
                            <span className={`flex items-center gap-1 text-xs ${chCfg.color}`}>
                              {chCfg.icon} {chCfg.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/[0.06]">
                        <p className={`text-xs line-clamp-2 font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          {template.message.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <span className="text-xs font-medium text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          Use Template →
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ═══ ANALYTICS TAB ═══ */}
        <TabsContent value="analytics" className="mt-6 space-y-6">
          <div>
            <h2 className={`text-lg font-bold mb-1 ${primaryText}`}>Broadcast Analytics</h2>
            <p className={`text-sm ${secondaryText}`}>Performance metrics across all your campaigns</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Sent", value: totalSent.toString(), icon: <Send className="h-5 w-5 text-amber-500" />, sub: "broadcasts delivered" },
              { label: "Avg Open Rate", value: `${avgOpenRate.toFixed(1)}%`, icon: <Eye className="h-5 w-5 text-emerald-500" />, sub: "across sent campaigns" },
              { label: "Avg Click Rate", value: `${avgClickRate.toFixed(1)}%`, icon: <MousePointer className="h-5 w-5 text-sky-500" />, sub: "across sent campaigns" },
              { label: "Best Channel", value: bestChannel ? CHANNEL_CONFIG[bestChannel.channel].label : "N/A", icon: <TrendingUp className="h-5 w-5 text-rose-500" />, sub: bestChannel && bestChannel.avgOpen > 0 ? `${bestChannel.avgOpen.toFixed(1)}% avg open` : "no data yet" },
            ].map((stat) => (
              <Card key={stat.label} className={cardClass}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-medium uppercase tracking-wider ${secondaryText}`}>{stat.label}</span>
                    {stat.icon}
                  </div>
                  <p className={`text-2xl font-bold ${primaryText}`}>{stat.value}</p>
                  <p className={`text-xs mt-1 ${secondaryText}`}>{stat.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Channel Bar Chart */}
          <Card className={cardClass}>
            <CardContent className="p-5">
              <h3 className={`text-sm font-semibold mb-4 ${primaryText}`}>Sends by Channel</h3>
              <div className="space-y-4">
                {channelStats.map((cs) => {
                  const chCfg = CHANNEL_CONFIG[cs.channel];
                  const barWidth = cs.totalRecipients > 0 ? Math.max((cs.totalRecipients / maxChannelCount) * 100, 2) : 2;
                  return (
                    <div key={cs.channel} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`flex items-center gap-2 text-sm ${primaryText}`}>
                          <span className={chCfg.color}>{chCfg.icon}</span>
                          {chCfg.label}
                        </span>
                        <span className={`text-sm font-semibold ${primaryText}`}>
                          {cs.totalRecipients.toLocaleString()}
                        </span>
                      </div>
                      <div className={`h-3 rounded-full overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600"
                        />
                      </div>
                      <div className={`flex items-center gap-3 text-xs ${secondaryText}`}>
                        <span>{cs.count} broadcasts</span>
                        {cs.avgOpen > 0 && <span>{cs.avgOpen.toFixed(1)}% avg open rate</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ CREATE DIALOG ═══ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700/50" : ""}`}>
          <DialogHeader>
            <DialogTitle className={primaryText}>Create Broadcast</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelCls}>Campaign Name</Label>
              <Input
                placeholder="e.g., Holiday Sale Broadcast"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={labelCls}>Channel</Label>
                <Select value={formData.channel} onValueChange={(v) => setFormData({ ...formData, channel: v as Broadcast["channel"] })}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Target Audience</Label>
                <Select value={formData.targetAudience} onValueChange={(v) => setFormData({ ...formData, targetAudience: v as Broadcast["targetAudience"] })}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="new">New Customers</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="segment">Custom Segment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Message Content</Label>
              <Textarea
                placeholder="Write your broadcast message..."
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className={inputCls}
              />
              <p className={`text-xs ${secondaryText}`}>Use {"{name}"}, {"{brand}"}, {"{discount}"} for dynamic placeholders</p>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Schedule (optional)</Label>
              <Input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                className={inputCls}
              />
              <p className={`text-xs ${secondaryText}`}>Leave empty to save as draft</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleCreate}>
              Create Broadcast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

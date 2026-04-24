"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Megaphone, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useBrandFlowStore } from "@/store/brandflow-store";

const subTabs = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "Email" },
  { id: "sms", label: "SMS" },
];

interface Campaign {
  id: number;
  name: string;
  channel: string;
  message: string;
  status: string;
  createdAt: string;
}

export function BroadcastsPage() {
  const { appTheme } = useBrandFlowStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";
  const [activeTab, setActiveTab] = useState("whatsapp");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [formData, setFormData] = useState({ name: "", channel: "whatsapp", message: "", target: "" });

  const handleSubmit = () => {
    if (!formData.name.trim()) { toast.error("Campaign name is required"); return; }
    if (!formData.message.trim()) { toast.error("Message content is required"); return; }
    setCampaigns(prev => [{ id: Date.now(), ...formData, status: "draft", createdAt: new Date().toISOString() }, ...prev]);
    setCreateOpen(false);
    setFormData({ name: "", channel: "whatsapp", message: "", target: "" });
    toast.success("Campaign created successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Broadcasts & Campaigns</h1>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Create and manage marketing campaigns</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setFormData({ name: "", channel: activeTab, message: "", target: "" }); setCreateOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Sent</p><p className="text-xl font-bold">{campaigns.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Recipients</p><p className="text-xl font-bold">0</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Open Rate</p><p className="text-xl font-bold">0%</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Scheduled</p><p className="text-xl font-bold">{campaigns.filter(c => c.status === "scheduled").length}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {subTabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {campaigns.length > 0 ? (
        <div className="space-y-3">
          <AnimatePresence>
            {campaigns.filter(c => c.channel === activeTab || activeTab === "all").map((c) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`p-4 rounded-lg border ${isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{c.name}</h3>
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{c.channel} · {c.message.substring(0, 60)}{c.message.length > 60 ? "..." : ""}</p>
                  </div>
                  <Badge variant="outline">{c.status}</Badge>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Megaphone className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className={`text-lg font-semibold mb-1 ${isDark ? "text-white" : "text-foreground"}`}>No campaigns yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">Create your first campaign to reach your customers!</p>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setFormData({ name: "", channel: activeTab, message: "", target: "" }); setCreateOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> New Campaign
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>Create Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={isDark ? "text-slate-300" : ""}>Campaign Name</Label>
              <Input placeholder="e.g., Holiday Sale Broadcast" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={isDark ? "bg-slate-800 border-slate-600 text-white" : ""} />
            </div>
            <div className="space-y-2">
              <Label className={isDark ? "text-slate-300" : ""}>Channel</Label>
              <Select value={formData.channel} onValueChange={(v) => setFormData({ ...formData, channel: v })}>
                <SelectTrigger className={isDark ? "bg-slate-800 border-slate-600 text-white" : ""}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={isDark ? "text-slate-300" : ""}>Target Audience</Label>
              <Input placeholder="e.g., All Customers" value={formData.target} onChange={(e) => setFormData({ ...formData, target: e.target.value })} className={isDark ? "bg-slate-800 border-slate-600 text-white" : ""} />
            </div>
            <div className="space-y-2">
              <Label className={isDark ? "text-slate-300" : ""}>Message Content</Label>
              <Textarea placeholder="Write your broadcast message..." rows={4} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className={isDark ? "bg-slate-800 border-slate-600 text-white" : ""} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit}>Create Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

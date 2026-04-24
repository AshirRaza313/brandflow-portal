"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Mail, Users, Eye, Send, TrendingUp, Plus, FileEdit, BarChart3,
  Sparkles, MailCheck, Split, Clock,
} from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";
import { useBrandOnyxStore } from "@/store/brandflow-store";

interface EmailCampaign {
  id: number;
  name: string;
  subject: string;
  status: string;
  list: string;
  createdAt: string;
}

interface SubscriberList {
  id: number;
  name: string;
  description: string;
  count: number;
  createdAt: string;
}

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  category: string;
}

export function EmailMarketingPage() {
  const { appTheme } = useBrandOnyxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeCta, setComposeCta] = useState("");

  // Campaigns
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ name: "", subject: "", list: "" });

  // Lists
  const [lists, setLists] = useState<SubscriberList[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [listForm, setListForm] = useState({ name: "", description: "" });

  // Templates
  const [templates] = useState<EmailTemplate[]>([
    { id: 1, name: "Welcome Email", subject: "Welcome to our store!", category: "Onboarding" },
    { id: 2, name: "Abandoned Cart", subject: "You left something behind...", category: "Sales" },
    { id: 3, name: "Monthly Newsletter", subject: "What's new this month", category: "Newsletter" },
    { id: 4, name: "Flash Sale", subject: "⚡ 24hr Flash Sale!", category: "Promotion" },
    { id: 5, name: "Order Confirmation", subject: "Your order is confirmed!", category: "Transactional" },
  ]);
  const [templateOpen, setTemplateOpen] = useState(false);

  // Scheduler
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  const handleCreateCampaign = () => {
    if (!campaignForm.name.trim()) { toast.error("Campaign name is required"); return; }
    if (!campaignForm.subject.trim()) { toast.error("Subject line is required"); return; }
    setCampaigns(prev => [{ id: Date.now(), ...campaignForm, status: "draft", createdAt: new Date().toISOString() }, ...prev]);
    setCampaignOpen(false);
    setCampaignForm({ name: "", subject: "", list: "" });
    toast.success("Campaign created successfully!");
  };

  const handleCreateList = () => {
    if (!listForm.name.trim()) { toast.error("List name is required"); return; }
    setLists(prev => [{ id: Date.now(), ...listForm, count: 0, createdAt: new Date().toISOString() }, ...prev]);
    setListOpen(false);
    setListForm({ name: "", description: "" });
    toast.success("Subscriber list created!");
  };

  const handleAiSuggest = () => {
    if (!composeBody.trim()) {
      toast.error("Write some email content first to get AI suggestions");
      return;
    }
    const suggestions = [
      "Don't miss out — exclusive deals inside!",
      "Your special offer is waiting for you",
      "Limited time: Save big on your favorites",
      "Something exciting just dropped for you",
      "You're invited: Early access to our new collection",
    ];
    setComposeSubject(suggestions[Math.floor(Math.random() * suggestions.length)]);
    toast.success("AI generated a subject line!");
  };

  const handleSchedule = () => {
    if (!scheduleDate) { toast.error("Please select a date and time"); return; }
    setScheduleOpen(false);
    setScheduleDate("");
    toast.success("Email scheduled successfully!");
  };

  const inputCls = isDark ? "bg-slate-800 border-slate-600 text-white" : "";
  const labelCls = isDark ? "text-slate-300" : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Email Marketing</h1>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Create campaigns, manage subscribers, and track performance</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setTemplateOpen(true)}><FileEdit className="mr-2 h-4 w-4" /> Templates</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setCampaignOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Campaign</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Subscribers", value: String(lists.reduce((a, l) => a + l.count, 0)), icon: Users },
          { title: "Avg Open Rate", value: "—", icon: Eye },
          { title: "Avg Click Rate", value: "—", icon: TrendingUp },
          { title: "Unsubscribe Rate", value: "—", icon: Users },
        ].map((stat) => (
          <Card key={stat.title} className={isDark ? "border-slate-700" : "border-slate-200"}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.title}</p>
                  <p className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-slate-900"}`}>{stat.value}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList className="bg-slate-100 overflow-x-auto flex-wrap">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="compose">Compose Email</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${isDark ? "text-white" : ""}`}>
                <Mail className="h-5 w-5 text-emerald-600" /> Campaign Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campaigns.length > 0 ? (
                <div className="space-y-3">
                  {campaigns.map((c) => (
                    <div key={c.id} className={`p-4 rounded-lg border flex items-center justify-between ${isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-white"}`}>
                      <div>
                        <h3 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{c.name}</h3>
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{c.subject}</p>
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">{c.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Mail}
                  title="No campaigns yet"
                  description="Create your first email campaign to start engaging with your subscribers."
                  action={{ label: "Create Campaign", onClick: () => setCampaignOpen(true) }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscribers">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${isDark ? "text-white" : ""}`}>
                  <Users className="h-5 w-5 text-emerald-600" /> Subscriber Lists
                </CardTitle>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setListOpen(true)}>
                  <Plus className="mr-1 h-3 w-3" /> New List
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {lists.length > 0 ? (
                <div className="space-y-3">
                  {lists.map((l) => (
                    <div key={l.id} className={`p-4 rounded-lg border flex items-center justify-between ${isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-white"}`}>
                      <div>
                        <h3 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{l.name}</h3>
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{l.description} · {l.count} subscribers</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Users}
                  title="No subscriber lists yet"
                  description="Create subscriber lists to organize and segment your audience for targeted campaigns."
                  action={{ label: "Create List", onClick: () => setListOpen(true) }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compose">
          <Card>
            <CardHeader>
              <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${isDark ? "text-white" : ""}`}>
                <MailCheck className="h-5 w-5 text-emerald-600" /> Compose Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className={`text-sm font-medium ${labelCls}`}>To (Subscriber List)</Label>
                  <Select>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="Select a list..." /></SelectTrigger>
                    <SelectContent>
                      {lists.length > 0 ? lists.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>) : <SelectItem value="all">All Subscribers</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className={`text-sm font-medium ${labelCls}`}>Template</Label>
                  <Select>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="Choose template..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blank">Blank</SelectItem>
                      {templates.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className={`text-sm font-medium ${labelCls}`}>Subject Line</Label>
                <Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder="Enter email subject..." className={`text-sm ${inputCls}`} />
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="ghost" className="text-xs text-emerald-600 h-7" onClick={handleAiSuggest}>
                    <Sparkles className="mr-1 h-3 w-3" /> AI Suggest Subject
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className={`text-sm font-medium ${labelCls}`}>Email Body</Label>
                <Textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your email content here..."
                  rows={8}
                  className={`text-sm ${inputCls}`}
                />
              </div>
              <div className="space-y-2">
                <Label className={`text-sm font-medium ${labelCls}`}>CTA Button Text</Label>
                <Input value={composeCta} onChange={(e) => setComposeCta(e.target.value)} placeholder="e.g., Shop Now" className={`text-sm ${inputCls}`} />
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => toast.success("Email sent!")}>
                  <Send className="mr-2 h-4 w-4" /> Send Now
                </Button>
                <Button variant="outline" onClick={() => setScheduleOpen(true)}><Clock className="mr-2 h-4 w-4" /> Schedule</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Dialog */}
      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>Create Email Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelCls}>Campaign Name</Label>
              <Input placeholder="e.g., Summer Newsletter" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Subject Line</Label>
              <Input placeholder="Enter email subject..." value={campaignForm.subject} onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Target List</Label>
              <Select value={campaignForm.list} onValueChange={(v) => setCampaignForm({ ...campaignForm, list: v })}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Select list..." /></SelectTrigger>
                <SelectContent>
                  {lists.length > 0 ? lists.map(l => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>) : <SelectItem value="all">All Subscribers</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateCampaign}>Create Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create List Dialog */}
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>Create Subscriber List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelCls}>List Name</Label>
              <Input placeholder="e.g., VIP Customers" value={listForm.name} onChange={(e) => setListForm({ ...listForm, name: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Description</Label>
              <Textarea placeholder="Describe this list..." value={listForm.description} onChange={(e) => setListForm({ ...listForm, description: e.target.value })} className={inputCls} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setListOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateList}>Create List</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Gallery Dialog */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>Template Gallery</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t.id} className={`p-4 rounded-lg border cursor-pointer hover:border-emerald-500 transition-colors ${isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200"}`} onClick={() => { setComposeSubject(t.subject); setTemplateOpen(false); toast.success(`Template "${t.name}" applied!`); }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`font-semibold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>{t.name}</h4>
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t.subject}</p>
                  </div>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">{t.category}</span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>Schedule Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelCls}>Schedule Date & Time</Label>
              <Input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className={inputCls} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSchedule}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DollarSign, Eye, Target, TrendingUp, Plus, Search, BarChart3,
  Users, MapPin, ShoppingCart, ImageIcon, Upload,
} from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";
import { useBrandOnyxStore } from "@/store/brandflow-store";

interface AdCampaign {
  id: number;
  name: string;
  platform: string;
  budget: string;
  status: string;
  createdAt: string;
}

interface Creative {
  id: number;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

export function AdManagerPage() {
  const { appTheme } = useBrandOnyxStore();
  const isDark = appTheme !== "light";

  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);

  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ name: "", platform: "meta", budget: "", objective: "" });

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: "", type: "image" });

  const handleCreateCampaign = () => {
    if (!campaignForm.name.trim()) { toast.error("Campaign name is required"); return; }
    setCampaigns(prev => [{ id: Date.now(), ...campaignForm, status: "draft", createdAt: new Date().toISOString() }, ...prev]);
    setCampaignOpen(false);
    setCampaignForm({ name: "", platform: "meta", budget: "", objective: "" });
    toast.success("Ad campaign created successfully!");
  };

  const handleUploadCreative = () => {
    if (!uploadForm.name.trim()) { toast.error("Creative name is required"); return; }
    setCreatives(prev => [{ id: Date.now(), ...uploadForm, status: "ready", createdAt: new Date().toISOString() }, ...prev]);
    setUploadOpen(false);
    setUploadForm({ name: "", type: "image" });
    toast.success("Creative uploaded successfully!");
  };

  const inputCls = isDark ? "bg-slate-800 border-slate-600 text-white" : "";
  const labelCls = isDark ? "text-slate-300" : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Ad Manager</h1>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Manage campaigns, creatives, and audience targeting</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setCampaignOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { title: "Active Campaigns", value: String(campaigns.filter(c => c.status === "active").length), icon: Target },
          { title: "Total Spend", value: `$${campaigns.reduce((a, c) => a + (parseFloat(c.budget) || 0), 0)}`, icon: DollarSign },
          { title: "Avg ROAS", value: "—", icon: BarChart3 },
          { title: "Impressions", value: "0", icon: Eye },
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
          <TabsTrigger value="creatives">Creative Library</TabsTrigger>
          <TabsTrigger value="audience">Audience Targeting</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-lg font-semibold ${isDark ? "text-white" : ""}`}>All Campaigns</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search campaigns..." className={`pl-9 text-sm ${inputCls}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {campaigns.length > 0 ? (
                <div className="space-y-3">
                  {campaigns.map((c) => (
                    <div key={c.id} className={`p-4 rounded-lg border flex items-center justify-between ${isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-white"}`}>
                      <div>
                        <h4 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{c.name}</h4>
                        <p className={`text-xs capitalize ${isDark ? "text-slate-400" : "text-slate-500"}`}>{c.platform} · Budget: ${c.budget}</p>
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">{c.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Target}
                  title="No ad campaigns yet"
                  description="Create your first ad campaign on Meta, Google, or TikTok to start reaching new customers."
                  action={{ label: "Create Campaign", onClick: () => setCampaignOpen(true) }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creatives">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${isDark ? "text-white" : ""}`}>
                  <ImageIcon className="h-5 w-5 text-emerald-600" /> Creative Library
                </CardTitle>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setUploadOpen(true)}>
                  <Plus className="mr-1 h-3 w-3" /> Upload Creative
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {creatives.length > 0 ? (
                <div className="space-y-3">
                  {creatives.map((c) => (
                    <div key={c.id} className={`p-4 rounded-lg border flex items-center justify-between ${isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <h4 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{c.name}</h4>
                          <p className={`text-xs capitalize ${isDark ? "text-slate-400" : "text-slate-500"}`}>{c.type} · {c.status}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={ImageIcon}
                  title="No creatives uploaded"
                  description="Upload images and videos to use in your ad campaigns."
                  action={{ label: "Upload Creative", onClick: () => setUploadOpen(true) }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audience">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${isDark ? "text-white" : ""}`}>
                  <Users className="h-5 w-5 text-emerald-600" /> Target Interests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={MapPin}
                  title="No audience data yet"
                  description="Audience data will be available once your ad campaigns are running."
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${isDark ? "text-white" : ""}`}>
                  <ShoppingCart className="h-5 w-5 text-emerald-600" /> Target Behaviors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={Users}
                  title="No behavior data yet"
                  description="Behavior targeting data will be available once your ad campaigns are running."
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Dialog */}
      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>Create Ad Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelCls}>Campaign Name</Label>
              <Input placeholder="e.g., Summer Sale Ads" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Platform</Label>
              <Select value={campaignForm.platform} onValueChange={(v) => setCampaignForm({ ...campaignForm, platform: v })}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meta">Meta (Facebook/Instagram)</SelectItem>
                  <SelectItem value="google">Google Ads</SelectItem>
                  <SelectItem value="tiktok">TikTok Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Daily Budget ($)</Label>
              <Input type="number" placeholder="e.g., 50" value={campaignForm.budget} onChange={(e) => setCampaignForm({ ...campaignForm, budget: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Objective</Label>
              <Select value={campaignForm.objective} onValueChange={(v) => setCampaignForm({ ...campaignForm, objective: v })}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Select objective..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="awareness">Brand Awareness</SelectItem>
                  <SelectItem value="traffic">Website Traffic</SelectItem>
                  <SelectItem value="conversions">Conversions</SelectItem>
                  <SelectItem value="engagement">Engagement</SelectItem>
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

      {/* Upload Creative Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>Upload Creative</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelCls}>Creative Name</Label>
              <Input placeholder="e.g., Banner - Summer Sale" value={uploadForm.name} onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Creative Type</Label>
              <Select value={uploadForm.type} onValueChange={(v) => setUploadForm({ ...uploadForm, type: v })}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="carousel">Carousel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${isDark ? "border-slate-600 hover:border-emerald-500" : "border-slate-200 hover:border-emerald-300"}`}>
              <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}>Drop file here or click to browse</p>
              <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>JPG, PNG, MP4, GIF (max 50MB)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleUploadCreative}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

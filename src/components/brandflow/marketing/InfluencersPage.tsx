"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Users, Handshake, DollarSign, Search, Filter, Plus, Instagram,
  Youtube, TrendingUp, BarChart3, ExternalLink, Wallet, ChevronDown,
} from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";
import { useBrandOnyxStore } from "@/store/brandflow-store";

const platformFilters = [
  { id: "all", label: "All Platforms", icon: Users },
  { id: "Instagram", label: "Instagram", icon: Instagram },
  { id: "TikTok", label: "TikTok", icon: Youtube },
  { id: "YouTube", label: "YouTube", icon: Youtube },
];

interface Influencer {
  id: number;
  name: string;
  platform: string;
  handle: string;
  followers: number;
  createdAt: string;
}

interface Collaboration {
  id: number;
  influencerName: string;
  type: string;
  status: string;
  budget: string;
  deliverables: string;
  createdAt: string;
}

export function InfluencersPage() {
  const { appTheme } = useBrandOnyxStore();
  const isDark = appTheme !== "light";

  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterState, setFilterState] = useState({ minFollowers: "", maxFollowers: "", engagement: "", location: "" });

  // Add Influencer
  const [addInfluencerOpen, setAddInfluencerOpen] = useState(false);
  const [influencerForm, setInfluencerForm] = useState({ name: "", platform: "instagram", handle: "", followers: "" });

  // Discover Influencer
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [discoverForm, setDiscoverForm] = useState({ query: "", platform: "all", niche: "" });

  // Collaboration
  const [collabOpen, setCollabOpen] = useState(false);
  const [collabForm, setCollabForm] = useState({ influencerName: "", type: "", budget: "", deliverables: "" });

  const handleAddInfluencer = () => {
    if (!influencerForm.name.trim()) { toast.error("Influencer name is required"); return; }
    if (!influencerForm.handle.trim()) { toast.error("Handle is required"); return; }
    setInfluencers(prev => [{ id: Date.now(), ...influencerForm, followers: parseInt(influencerForm.followers) || 0, createdAt: new Date().toISOString() }, ...prev]);
    setAddInfluencerOpen(false);
    setInfluencerForm({ name: "", platform: "instagram", handle: "", followers: "" });
    toast.success("Influencer added successfully!");
  };

  const handleDiscover = () => {
    if (!discoverForm.query.trim()) { toast.error("Search query is required"); return; }
    // Simulate adding discovered influencers
    setInfluencers(prev => [
      { id: Date.now(), name: `${discoverForm.query} Creator 1`, platform: discoverForm.platform === "all" ? "instagram" : discoverForm.platform, handle: `@${discoverForm.query.toLowerCase().replace(/\s/g, "")}1`, followers: Math.floor(Math.random() * 100000) + 10000, createdAt: new Date().toISOString() },
      { id: Date.now() + 1, name: `${discoverForm.query} Creator 2`, platform: discoverForm.platform === "all" ? "tiktok" : discoverForm.platform, handle: `@${discoverForm.query.toLowerCase().replace(/\s/g, "")}2`, followers: Math.floor(Math.random() * 50000) + 5000, createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setDiscoverOpen(false);
    setDiscoverForm({ query: "", platform: "all", niche: "" });
    toast.success("Influencers discovered! Check the list below.");
  };

  const handleCreateCollaboration = () => {
    if (!collabForm.influencerName.trim()) { toast.error("Influencer name is required"); return; }
    if (!collabForm.type.trim()) { toast.error("Collaboration type is required"); return; }
    setCollaborations(prev => [{ id: Date.now(), ...collabForm, status: "active", createdAt: new Date().toISOString() }, ...prev]);
    setCollabOpen(false);
    setCollabForm({ influencerName: "", type: "", budget: "", deliverables: "" });
    toast.success("Collaboration created successfully!");
  };

  const inputCls = isDark ? "bg-slate-800 border-slate-600 text-white" : "";
  const labelCls = isDark ? "text-slate-300" : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Influencer Management</h1>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Discover, collaborate, and track influencer partnerships</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Button variant="outline" onClick={() => setFiltersOpen(!filtersOpen)}>
              <Filter className="mr-2 h-4 w-4" /> Filters <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
            {filtersOpen && (
              <div className={`absolute right-0 top-full mt-2 w-72 p-4 rounded-lg border shadow-lg z-10 ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
                <h4 className={`font-semibold text-sm mb-3 ${isDark ? "text-white" : "text-slate-900"}`}>Filter Influencers</h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className={`text-xs ${labelCls}`}>Min Followers</Label>
                    <Input type="number" placeholder="e.g., 1000" value={filterState.minFollowers} onChange={(e) => setFilterState({ ...filterState, minFollowers: e.target.value })} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <Label className={`text-xs ${labelCls}`}>Max Followers</Label>
                    <Input type="number" placeholder="e.g., 100000" value={filterState.maxFollowers} onChange={(e) => setFilterState({ ...filterState, maxFollowers: e.target.value })} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <Label className={`text-xs ${labelCls}`}>Min Engagement Rate</Label>
                    <Select value={filterState.engagement} onValueChange={(v) => setFilterState({ ...filterState, engagement: v })}>
                      <SelectTrigger className={inputCls}><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="1">1%+</SelectItem>
                        <SelectItem value="3">3%+</SelectItem>
                        <SelectItem value="5">5%+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className={`text-xs ${labelCls}`}>Location</Label>
                    <Input placeholder="e.g., Dubai" value={filterState.location} onChange={(e) => setFilterState({ ...filterState, location: e.target.value })} className={inputCls} />
                  </div>
                  <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => { setFiltersOpen(false); toast.success("Filters applied!"); }}>Apply Filters</Button>
                </div>
              </div>
            )}
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setAddInfluencerOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Influencer</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Influencers", value: String(influencers.length), icon: Users },
          { title: "Active Collabs", value: String(collaborations.filter(c => c.status === "active").length), icon: Handshake },
          { title: "Total Spend", value: `$${collaborations.reduce((a, c) => a + (parseFloat(c.budget) || 0), 0)}`, icon: DollarSign },
          { title: "Avg Engagement", value: "—", icon: TrendingUp },
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

      <Tabs defaultValue="discovery" className="space-y-6">
        <TabsList className="bg-slate-100 overflow-x-auto flex-wrap">
          <TabsTrigger value="discovery">Discovery</TabsTrigger>
          <TabsTrigger value="collaborations">Active Collaborations</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="payments">Payment Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="discovery">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search influencers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`pl-9 ${inputCls}`} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {platformFilters.map((pf) => (
                    <Button
                      key={pf.id}
                      size="sm"
                      variant={platformFilter === pf.id ? "default" : "outline"}
                      className={platformFilter === pf.id ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                      onClick={() => setPlatformFilter(pf.id)}
                    >
                      <pf.icon className="mr-1.5 h-3.5 w-3.5" />
                      {pf.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {influencers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {influencers
                .filter(i => platformFilter === "all" || i.platform.toLowerCase() === platformFilter.toLowerCase())
                .filter(i => !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.handle.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((i) => (
                  <Card key={i.id} className={isDark ? "border-slate-700" : "border-slate-200"}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Users className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                          <h4 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{i.name}</h4>
                          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{i.handle} · {i.followers.toLocaleString()} followers</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          <Card className="mt-4">
            <CardContent>
              <EmptyState
                icon={Users}
                title="No influencers discovered yet"
                description="Search and discover influencers to collaborate with for your brand."
                action={{ label: "Discover Influencers", onClick: () => setDiscoverOpen(true) }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collaborations">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${isDark ? "text-white" : ""}`}>
                  <Handshake className="h-5 w-5 text-emerald-600" /> Active Collaborations
                </CardTitle>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setCollabOpen(true)}>
                  <Plus className="mr-1 h-3 w-3" /> New Collaboration
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {collaborations.length > 0 ? (
                <div className="space-y-3">
                  {collaborations.map((c) => (
                    <div key={c.id} className={`p-4 rounded-lg border flex items-center justify-between ${isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-white"}`}>
                      <div>
                        <h4 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{c.influencerName}</h4>
                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{c.type} · ${c.budget}</p>
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">{c.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Handshake}
                  title="No collaborations yet"
                  description="Start a collaboration with an influencer to track deliverables and payments."
                  action={{ label: "New Collaboration", onClick: () => setCollabOpen(true) }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardContent>
              <EmptyState
                icon={BarChart3}
                title="No performance data yet"
                description="Performance metrics will appear once your influencer campaigns are active."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Total Paid", amount: `Rs. ${collaborations.filter(c => c.status === "completed").reduce((a, c) => a + (parseFloat(c.budget) || 0), 0).toLocaleString()}`, icon: Wallet, sub: "Completed payments" },
              { title: "Pending", amount: `Rs. ${collaborations.filter(c => c.status === "pending").reduce((a, c) => a + (parseFloat(c.budget) || 0), 0).toLocaleString()}`, icon: DollarSign, sub: "Awaiting payment" },
              { title: "Overdue", amount: "Rs. 0", icon: DollarSign, sub: "Requires attention" },
            ].map((item) => (
              <Card key={item.title} className={isDark ? "border-slate-700" : "border-slate-200"}>
                <CardContent className="p-5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{item.title}</p>
                  <p className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-slate-900"}`}>{item.amount}</p>
                  <p className="text-xs text-slate-400 mt-1">{item.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Influencer Dialog */}
      <Dialog open={addInfluencerOpen} onOpenChange={setAddInfluencerOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>Add Influencer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelCls}>Name</Label>
              <Input placeholder="e.g., Jane Smith" value={influencerForm.name} onChange={(e) => setInfluencerForm({ ...influencerForm, name: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Platform</Label>
              <Select value={influencerForm.platform} onValueChange={(v) => setInfluencerForm({ ...influencerForm, platform: v })}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Handle / Username</Label>
              <Input placeholder="e.g., @janesmith" value={influencerForm.handle} onChange={(e) => setInfluencerForm({ ...influencerForm, handle: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Followers Count</Label>
              <Input type="number" placeholder="e.g., 50000" value={influencerForm.followers} onChange={(e) => setInfluencerForm({ ...influencerForm, followers: e.target.value })} className={inputCls} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddInfluencerOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAddInfluencer}>Add Influencer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discover Influencers Dialog */}
      <Dialog open={discoverOpen} onOpenChange={setDiscoverOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>Discover Influencers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelCls}>Search Query</Label>
              <Input placeholder="e.g., fashion, fitness, beauty" value={discoverForm.query} onChange={(e) => setDiscoverForm({ ...discoverForm, query: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Platform</Label>
              <Select value={discoverForm.platform} onValueChange={(v) => setDiscoverForm({ ...discoverForm, platform: v })}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Niche / Category</Label>
              <Input placeholder="e.g., Fashion, Tech, Food" value={discoverForm.niche} onChange={(e) => setDiscoverForm({ ...discoverForm, niche: e.target.value })} className={inputCls} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscoverOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleDiscover}>Discover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Collaboration Dialog */}
      <Dialog open={collabOpen} onOpenChange={setCollabOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>New Collaboration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelCls}>Influencer Name</Label>
              <Input placeholder="e.g., Jane Smith" value={collabForm.influencerName} onChange={(e) => setCollabForm({ ...collabForm, influencerName: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Collaboration Type</Label>
              <Select value={collabForm.type} onValueChange={(v) => setCollabForm({ ...collabForm, type: v })}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sponsored-post">Sponsored Post</SelectItem>
                  <SelectItem value="product-review">Product Review</SelectItem>
                  <SelectItem value="brand-ambassador">Brand Ambassador</SelectItem>
                  <SelectItem value="affiliate">Affiliate</SelectItem>
                  <SelectItem value="event-coverage">Event Coverage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Budget ($)</Label>
              <Input type="number" placeholder="e.g., 500" value={collabForm.budget} onChange={(e) => setCollabForm({ ...collabForm, budget: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Deliverables</Label>
              <Textarea placeholder="e.g., 3 Instagram posts, 1 Reel, 1 Story series" rows={3} value={collabForm.deliverables} onChange={(e) => setCollabForm({ ...collabForm, deliverables: e.target.value })} className={inputCls} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollabOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateCollaboration}>Create Collaboration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Search, Globe, RefreshCw, FileText, Shield, Zap, BarChart3, Plus,
} from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";
import { useBrandOnyxStore } from "@/store/brandflow-store";

interface Keyword {
  id: number;
  keyword: string;
  location: string;
  position: number;
  volume: number;
  createdAt: string;
}

export function SEOManagerPage() {
  const { appTheme } = useBrandOnyxStore();
  const isDark = appTheme !== "light";

  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [keywordOpen, setKeywordOpen] = useState(false);
  const [keywordForm, setKeywordForm] = useState({ keyword: "", location: "global" });

  const handleAddKeyword = () => {
    if (!keywordForm.keyword.trim()) { toast.error("Keyword is required"); return; }
    setKeywords(prev => [{ id: Date.now(), ...keywordForm, position: 0, volume: 0, createdAt: new Date().toISOString() }, ...prev]);
    setKeywordOpen(false);
    setKeywordForm({ keyword: "", location: "global" });
    toast.success("Keyword added to tracker!");
  };

  const inputCls = isDark ? "bg-slate-800 border-slate-600 text-white" : "";
  const labelCls = isDark ? "text-slate-300" : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>SEO Manager</h1>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Monitor rankings, optimize meta tags, and run SEO audits</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => toast.success("SEO audit queued! Results will appear shortly.")}>
          <RefreshCw className="mr-2 h-4 w-4" /> Run Full Audit
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { title: "Keyword Rankings", value: String(keywords.length), icon: Globe },
          { title: "Organic Traffic", value: "0", icon: BarChart3 },
          { title: "Backlinks", value: "0", icon: Shield },
          { title: "Page Speed Score", value: "—", icon: Zap },
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

      <Tabs defaultValue="keywords" className="space-y-6">
        <TabsList className="bg-slate-100 overflow-x-auto flex-wrap">
          <TabsTrigger value="keywords">Keyword Tracker</TabsTrigger>
          <TabsTrigger value="meta">Meta Tag Editor</TabsTrigger>
          <TabsTrigger value="audit">SEO Audit</TabsTrigger>
          <TabsTrigger value="speed">Page Speed</TabsTrigger>
        </TabsList>

        <TabsContent value="keywords">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${isDark ? "text-white" : ""}`}>
                  <Search className="h-5 w-5 text-emerald-600" /> Keyword Tracker
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setKeywordOpen(true)}>
                    <Plus className="mr-1 h-3 w-3" /> Add Keyword
                  </Button>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Filter keywords..." className={`pl-9 ${inputCls}`} />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {keywords.length > 0 ? (
                <div className="space-y-3">
                  {keywords.map((kw) => (
                    <div key={kw.id} className={`p-4 rounded-lg border flex items-center justify-between ${isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-white"}`}>
                      <div>
                        <h4 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{kw.keyword}</h4>
                        <p className={`text-xs capitalize ${isDark ? "text-slate-400" : "text-slate-500"}`}>{kw.location} · Position: {kw.position || "—"} · Volume: {kw.volume || "—"}</p>
                      </div>
                      <span className="text-xs text-emerald-600">Tracking</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Search}
                  title="No keywords tracked yet"
                  description="Add keywords to track your search engine rankings over time."
                  action={{ label: "Add Keywords", onClick: () => setKeywordOpen(true) }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meta">
          <Card>
            <CardHeader>
              <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${isDark ? "text-white" : ""}`}>
                <FileText className="h-5 w-5 text-emerald-600" /> Meta Tag Editor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className={`text-sm font-medium ${labelCls}`}>Page URL</Label>
                <div className="flex items-center gap-2">
                  <Globe className={`h-4 w-4 ${isDark ? "text-slate-500" : "text-slate-400"} flex-shrink-0`} />
                  <Input placeholder="https://yoursite.com/page" className={`font-mono text-sm ${inputCls}`} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={`text-sm font-medium ${labelCls}`}>Title Tag</Label>
                  <span className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>0/60</span>
                </div>
                <Input placeholder="Enter page title..." className={`text-sm ${inputCls}`} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={`text-sm font-medium ${labelCls}`}>Meta Description</Label>
                  <span className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>0/160</span>
                </div>
                <Textarea placeholder="Enter meta description..." rows={3} className={`text-sm ${inputCls}`} />
              </div>
              <div className="space-y-2">
                <Label className={`text-sm font-medium ${labelCls}`}>Search Engine Preview</Label>
                <div className={`border rounded-lg p-4 space-y-1 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                  <p className="text-lg text-blue-700 font-normal truncate">https://yoursite.com/page</p>
                  <p className={`text-xl font-medium truncate ${isDark ? "text-white" : "text-slate-900"}`}>Your Page Title</p>
                  <p className={`text-sm line-clamp-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Your meta description will appear here...</p>
                </div>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => toast.success("Meta tags saved!")}>Save Meta Tags</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${isDark ? "text-white" : ""}`}>
                <Shield className="h-5 w-5 text-emerald-600" /> SEO Audit Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Shield}
                title="No audit data yet"
                description="Run a full SEO audit to check your site for common issues."
                action={{ label: "Run Audit", onClick: () => toast.success("Audit started!") }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="speed">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${isDark ? "text-white" : ""}`}>
                <Zap className="h-5 w-5 text-emerald-600" /> Page Speed Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Zap}
                title="No speed data yet"
                description="Page speed scores will appear after running a performance audit."
                action={{ label: "Run Speed Test", onClick: () => { toast.info("Speed test queued"); } }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Keyword Dialog */}
      <Dialog open={keywordOpen} onOpenChange={setKeywordOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>Add Keyword to Track</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelCls}>Keyword</Label>
              <Input placeholder="e.g., buy running shoes online" value={keywordForm.keyword} onChange={(e) => setKeywordForm({ ...keywordForm, keyword: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Location</Label>
              <Select value={keywordForm.location} onValueChange={(v) => setKeywordForm({ ...keywordForm, location: v })}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="uk">United Kingdom</SelectItem>
                  <SelectItem value="uae">UAE</SelectItem>
                  <SelectItem value="india">India</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKeywordOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAddKeyword}>Add Keyword</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
  Users, TrendingUp, Eye, Plus, Calendar, Search, Hash, Upload,
  Copy, Send, Instagram, Facebook, Youtube, Link2,
} from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";
import { useBrandOnyxStore } from "@/store/brandflow-store";

interface SocialPost {
  id: number;
  content: string;
  platform: string;
  status: string;
  createdAt: string;
}

interface SocialAccount {
  id: number;
  platform: string;
  handle: string;
  connectedAt: string;
}

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  type: string;
}

export function SocialMediaPage() {
  const { appTheme } = useBrandOnyxStore();
  const isDark = appTheme !== "light";

  const [schedulerPlatform, setSchedulerPlatform] = useState("");
  const [schedulerContent, setSchedulerContent] = useState("");
  const [schedulerDate, setSchedulerDate] = useState("");

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // New Post dialog
  const [postOpen, setPostOpen] = useState(false);
  const [postForm, setPostForm] = useState({ content: "", platform: "instagram" });

  // Connect Account dialog
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectForm, setConnectForm] = useState({ platform: "instagram", handle: "" });

  // Calendar Event dialog
  const [eventOpen, setEventOpen] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", date: "", type: "content" });

  const handleCreatePost = () => {
    if (!postForm.content.trim()) { toast.error("Post content is required"); return; }
    setPosts(prev => [{ id: Date.now(), ...postForm, status: "published", createdAt: new Date().toISOString() }, ...prev]);
    setPostOpen(false);
    setPostForm({ content: "", platform: "instagram" });
    toast.success("Post created successfully!");
  };

  const handleConnectAccount = () => {
    if (!connectForm.handle.trim()) { toast.error("Account handle/username is required"); return; }
    setAccounts(prev => [{ id: Date.now(), ...connectForm, connectedAt: new Date().toISOString() }, ...prev]);
    setConnectOpen(false);
    setConnectForm({ platform: "instagram", handle: "" });
    toast.success("Account connected successfully!");
  };

  const handleCreateEvent = () => {
    if (!eventForm.title.trim()) { toast.error("Event title is required"); return; }
    if (!eventForm.date) { toast.error("Event date is required"); return; }
    setEvents(prev => [{ id: Date.now(), ...eventForm }, ...prev]);
    setEventOpen(false);
    setEventForm({ title: "", date: "", type: "content" });
    toast.success("Event created successfully!");
  };

  const inputCls = isDark ? "bg-slate-800 border-slate-600 text-white" : "";
  const labelCls = isDark ? "text-slate-300" : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Social Media Manager</h1>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Schedule posts, track engagement, and grow your audience</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setPostOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Post
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Followers", value: "0", icon: Users },
          { title: "Engagement Rate", value: "—", icon: TrendingUp },
          { title: "Posts This Week", value: String(posts.length), icon: Send },
          { title: "Total Reach", value: "0", icon: Eye },
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

      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList className="bg-slate-100 overflow-x-auto flex-wrap">
          <TabsTrigger value="accounts">Connected Accounts</TabsTrigger>
          <TabsTrigger value="calendar">Content Calendar</TabsTrigger>
          <TabsTrigger value="posts">Recent Posts</TabsTrigger>
          <TabsTrigger value="scheduler">Post Scheduler</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-lg font-semibold ${isDark ? "text-white" : ""}`}>Connected Accounts</CardTitle>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setConnectOpen(true)}>
                  <Plus className="mr-1 h-3 w-3" /> Connect
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {accounts.length > 0 ? (
                <div className="space-y-3">
                  {accounts.map((a) => (
                    <div key={a.id} className={`p-4 rounded-lg border flex items-center justify-between ${isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          {a.platform === "instagram" ? <Instagram className="h-5 w-5 text-emerald-600" /> : a.platform === "facebook" ? <Facebook className="h-5 w-5 text-emerald-600" /> : <Youtube className="h-5 w-5 text-emerald-600" />}
                        </div>
                        <div>
                          <h4 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>@{a.handle}</h4>
                          <p className={`text-xs capitalize ${isDark ? "text-slate-400" : "text-slate-500"}`}>{a.platform}</p>
                        </div>
                      </div>
                      <span className="text-xs text-emerald-600">Connected</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Instagram}
                  title="No social accounts connected"
                  description="Connect your Instagram, Facebook, TikTok, or YouTube accounts to start managing posts."
                  action={{ label: "Connect Account", onClick: () => setConnectOpen(true) }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${isDark ? "text-white" : ""}`}>
                  <Calendar className="h-5 w-5 text-emerald-600" /> Content Calendar
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setEventOpen(true)}>
                  <Plus className="mr-1 h-3 w-3" /> Add Event
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {events.length > 0 ? (
                <div className="space-y-3">
                  {events.map((e) => (
                    <div key={e.id} className={`p-4 rounded-lg border flex items-center justify-between ${isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-white"}`}>
                      <div>
                        <h4 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{e.title}</h4>
                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{e.date} · {e.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="No content scheduled"
                  description="Schedule your social media posts to plan and organize your content strategy."
                  action={{ label: "Schedule First Post", onClick: () => setPostOpen(true) }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-lg font-semibold ${isDark ? "text-white" : ""}`}>Recent Posts</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search posts..." className={`pl-9 text-sm ${inputCls}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {posts.length > 0 ? (
                <div className="space-y-3">
                  {posts.map((p) => (
                    <div key={p.id} className={`p-4 rounded-lg border flex items-center justify-between ${isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-white"}`}>
                      <div>
                        <h4 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{p.content.substring(0, 50)}{p.content.length > 50 ? "..." : ""}</h4>
                        <p className={`text-xs capitalize ${isDark ? "text-slate-400" : "text-slate-500"}`}>{p.platform} · {p.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Send}
                  title="No posts yet"
                  description="Create and publish your first social media post to start tracking engagement."
                  action={{ label: "Create Post", onClick: () => setPostOpen(true) }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduler">
          <Card>
            <CardHeader>
              <CardTitle className={`text-lg font-semibold ${isDark ? "text-white" : ""}`}>Post Scheduler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className={`text-sm font-medium ${labelCls}`}>Platform</Label>
                  <Select value={schedulerPlatform} onValueChange={setSchedulerPlatform}>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="Select platform..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className={`text-sm font-medium ${labelCls}`}>Scheduled Date & Time</Label>
                  <Input type="datetime-local" value={schedulerDate} onChange={(e) => setSchedulerDate(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className={`text-sm font-medium ${labelCls}`}>Post Content</Label>
                <Textarea
                  value={schedulerContent}
                  onChange={(e) => setSchedulerContent(e.target.value)}
                  placeholder="Write your post content here..."
                  rows={5}
                  className={`text-sm ${inputCls}`}
                />
              </div>
              <div className="space-y-2">
                <Label className={`text-sm font-medium ${labelCls}`}>Media Upload</Label>
                <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${isDark ? "border-slate-600 hover:border-emerald-500 hover:bg-emerald-900/20" : "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30"}`}>
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}>Drop files here or click to upload</p>
                  <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Supports: JPG, PNG, MP4, GIF (max 50MB)</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => toast.success("Post scheduled!")}>
                  <Send className="mr-2 h-4 w-4" /> Schedule Post
                </Button>
                <Button variant="outline" onClick={() => toast.info("Draft saved")}>Save as Draft</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Post Dialog */}
      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>Create New Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelCls}>Platform</Label>
              <Select value={postForm.platform} onValueChange={(v) => setPostForm({ ...postForm, platform: v })}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Post Content</Label>
              <Textarea placeholder="Write your post..." rows={5} value={postForm.content} onChange={(e) => setPostForm({ ...postForm, content: e.target.value })} className={inputCls} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPostOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreatePost}>Create Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connect Account Dialog */}
      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>Connect Social Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelCls}>Platform</Label>
              <Select value={connectForm.platform} onValueChange={(v) => setConnectForm({ ...connectForm, platform: v })}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Username / Handle</Label>
              <Input placeholder="e.g., @mybrand" value={connectForm.handle} onChange={(e) => setConnectForm({ ...connectForm, handle: e.target.value })} className={inputCls} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleConnectAccount}>Connect Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calendar Event Dialog */}
      <Dialog open={eventOpen} onOpenChange={setEventOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>Add Calendar Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelCls}>Event Title</Label>
              <Input placeholder="e.g., Product Launch Post" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Date</Label>
              <Input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Type</Label>
              <Select value={eventForm.type} onValueChange={(v) => setEventForm({ ...eventForm, type: v })}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="content">Content Post</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="launch">Launch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateEvent}>Add Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

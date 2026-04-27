"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus, ChevronLeft, ChevronRight, Megaphone, Calendar as CalendarIcon,
  Instagram, Facebook, Video, FileText, Mail, MessageSquare, Users,
  Clock, CheckCircle, AlertCircle, XCircle, PlayCircle, GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useValtrioxStore } from "@/store/brandflow-store";

// ── Types ──
type EventCategory = "instagram-post" | "facebook-ad" | "tiktok-video" | "blog-article" | "email-campaign" | "whatsapp-broadcast";
type EventStatus = "planned" | "in-progress" | "published" | "cancelled";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  status: EventStatus;
  assignedTo: string;
  date: string;
  createdAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  color: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  { id: "none", name: "Unassigned", initials: "?", color: "bg-slate-400" },
  { id: "tm-1", name: "Sarah Chen", initials: "SC", color: "bg-amber-500" },
  { id: "tm-2", name: "Alex Rivera", initials: "AR", color: "bg-emerald-500" },
  { id: "tm-3", name: "Jordan Lee", initials: "JL", color: "bg-sky-500" },
  { id: "tm-4", name: "Mia Tanaka", initials: "MT", color: "bg-rose-500" },
  { id: "tm-5", name: "Dev Patel", initials: "DP", color: "bg-violet-500" },
];

const CATEGORY_CONFIG: Record<EventCategory, { label: string; icon: React.ReactNode; color: string; bgLight: string; bgDark: string }> = {
  "instagram-post": { label: "Instagram Post", icon: <Instagram className="h-3 w-3" />, color: "bg-pink-500", bgLight: "bg-pink-50 text-pink-700 border-pink-200", bgDark: "bg-pink-500/15 text-pink-400 border border-pink-500/25" },
  "facebook-ad": { label: "Facebook Ad", icon: <Facebook className="h-3 w-3" />, color: "bg-blue-500", bgLight: "bg-blue-50 text-blue-700 border-blue-200", bgDark: "bg-blue-500/15 text-blue-400 border border-blue-500/25" },
  "tiktok-video": { label: "TikTok Video", icon: <Video className="h-3 w-3" />, color: "bg-slate-800", bgLight: "bg-slate-100 text-slate-700 border-slate-200", bgDark: "bg-slate-500/15 text-slate-300 border border-slate-500/25" },
  "blog-article": { label: "Blog Article", icon: <FileText className="h-3 w-3" />, color: "bg-emerald-500", bgLight: "bg-emerald-50 text-emerald-700 border-emerald-200", bgDark: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" },
  "email-campaign": { label: "Email Campaign", icon: <Mail className="h-3 w-3" />, color: "bg-amber-500", bgLight: "bg-amber-50 text-amber-700 border-amber-200", bgDark: "bg-amber-500/15 text-amber-400 border border-amber-500/25" },
  "whatsapp-broadcast": { label: "WhatsApp Broadcast", icon: <MessageSquare className="h-3 w-3" />, color: "bg-emerald-600", bgLight: "bg-emerald-50 text-emerald-700 border-emerald-200", bgDark: "bg-emerald-600/15 text-emerald-400 border border-emerald-600/25" },
};

const STATUS_CONFIG: Record<EventStatus, { label: string; icon: React.ReactNode; color: string; darkColor: string }> = {
  "planned": { label: "Planned", icon: <Clock className="h-3 w-3" />, color: "bg-slate-100 text-slate-600 border-slate-200", darkColor: "bg-slate-500/15 text-slate-400 border border-slate-500/25" },
  "in-progress": { label: "In Progress", icon: <PlayCircle className="h-3 w-3" />, color: "bg-amber-100 text-amber-700 border-amber-200", darkColor: "bg-amber-500/15 text-amber-400 border border-amber-500/25" },
  "published": { label: "Published", icon: <CheckCircle className="h-3 w-3" />, color: "bg-emerald-100 text-emerald-700 border-emerald-200", darkColor: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" },
  "cancelled": { label: "Cancelled", icon: <XCircle className="h-3 w-3" />, color: "bg-red-100 text-red-600 border-red-200", darkColor: "bg-red-500/15 text-red-400 border border-red-500/25" },
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MarketingCalendarPage() {
  const isDark = typeof window !== "undefined" && document.documentElement.classList.contains("dark");

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const [eventOpen, setEventOpen] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [rescheduleEventId, setRescheduleEventId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [eventForm, setEventForm] = useState<{
    title: string;
    description: string;
    category: EventCategory;
    status: EventStatus;
    assignedTo: string;
    date: string;
  }>({ title: "", description: "", category: "instagram-post", status: "planned", assignedTo: "none", date: "" });

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const handleCreateEvent = () => {
    if (!eventForm.title.trim()) { toast.error("Event title is required"); return; }
    if (!eventForm.date) { toast.error("Event date is required"); return; }

    if (editEventId) {
      setEvents(prev => prev.map(e => e.id === editEventId ? { ...e, ...eventForm } : e));
      toast.success("Event updated!");
    } else {
      setEvents(prev => [{
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        ...eventForm,
        createdAt: new Date().toISOString(),
      }, ...prev]);
      toast.success("Marketing event created!");
    }

    setEventOpen(false);
    setEditEventId(null);
    setEventForm({ title: "", description: "", category: "instagram-post", status: "planned", assignedTo: "none", date: "" });
  };

  const handleReschedule = () => {
    if (!rescheduleDate) { toast.error("Please select a date"); return; }
    setEvents(prev => prev.map(e => e.id === rescheduleEventId ? { ...e, date: rescheduleDate } : e));
    toast.success("Event rescheduled!");
    setRescheduleEventId(null);
    setRescheduleDate("");
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEventForm({
      title: event.title,
      description: event.description,
      category: event.category,
      status: event.status,
      assignedTo: event.assignedTo,
      date: event.date,
    });
    setEditEventId(event.id);
    setEventOpen(true);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    toast.success("Event deleted");
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => e.date === dateStr);
  };

  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return events.filter(e => e.date >= today && e.status !== "cancelled").sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  }, [events]);

  const upcomingCount = upcomingEvents.length;

  const getMember = (id: string) => TEAM_MEMBERS.find(m => m.id === id) || TEAM_MEMBERS[0];

  const cardClass = isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-white border-slate-200";
  const primaryText = isDark ? "text-white" : "text-slate-900";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-500";
  const inputCls = isDark ? "bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500" : "";
  const labelCls = isDark ? "text-slate-300" : "";

  const goToPrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${primaryText}`}>Marketing Calendar</h1>
          <p className={`text-sm mt-1 ${secondaryText}`}>Plan, schedule, and track your marketing activities</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20" onClick={() => {
          setEditEventId(null);
          setEventForm({ title: "", description: "", category: "instagram-post", status: "planned", assignedTo: "none", date: "" });
          setEventOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" /> Add Event
        </Button>
      </div>

      {/* Category Legend */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(CATEGORY_CONFIG) as [EventCategory, typeof CATEGORY_CONFIG[EventCategory]][]).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={`h-2.5 w-2.5 rounded-full ${cfg.color}`} />
            <span>{cfg.label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ═══ CALENDAR GRID ═══ */}
        <div className="flex-1">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className={cardClass}>
              <CardContent className="p-4">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <Button variant="outline" size="sm" onClick={goToPrevMonth} className={isDark ? "border-white/[0.1]" : ""}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className={`text-lg font-bold ${primaryText}`}>
                    {MONTHS[currentMonth]} {currentYear}
                  </h2>
                  <Button variant="outline" size="sm" onClick={goToNextMonth} className={isDark ? "border-white/[0.1]" : ""}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Week day headers */}
                <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden">
                  {WEEK_DAYS.map((day) => (
                    <div key={day} className={`py-2 text-center text-xs font-medium ${isDark ? "bg-white/[0.02] text-slate-500" : "bg-slate-50 text-slate-500"}`}>
                      {day}
                    </div>
                  ))}

                  {/* Empty cells before first day */}
                  {Array.from({ length: firstDay }, (_, i) => (
                    <div key={`empty-${i}`} className={`min-h-[110px] p-1.5 ${isDark ? "bg-white/[0.01]" : "bg-slate-50/50"}`} />
                  ))}

                  {/* Day cells */}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dayEvents = getEventsForDay(day);
                    const today = new Date();
                    const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                    return (
                      <div
                        key={day}
                        className={`min-h-[110px] p-1.5 transition-colors ${isDark ? "bg-white/[0.01] hover:bg-white/[0.03]" : "bg-white hover:bg-slate-50"}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium ${isToday ? "h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center" : isDark ? "text-slate-400" : "text-slate-600"}`}>
                            {day}
                          </span>
                          {dayEvents.length > 2 && (
                            <span className={`text-[9px] ${secondaryText}`}>+{dayEvents.length - 2}</span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 2).map((e) => {
                            const catCfg = CATEGORY_CONFIG[e.category];
                            const member = getMember(e.assignedTo);
                            return (
                              <div
                                key={e.id}
                                className={`group relative px-1.5 py-0.5 rounded text-[10px] text-white cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-1 ${catCfg.color}`}
                                onClick={() => {
                                  setRescheduleEventId(e.id);
                                  setRescheduleDate(e.date);
                                }}
                              >
                                <GripVertical className="h-2 w-2 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                                <span className="truncate flex-1">{e.title}</span>
                                {e.assignedTo !== "none" && (
                                  <span className="h-2.5 w-2.5 rounded-full bg-white/40 shrink-0" title={member.name} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ═══ UPCOMING SIDEBAR ═══ */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          {/* Upcoming Events Card */}
          <Card className={cardClass}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-amber-500" />
                  <h3 className={`font-semibold text-sm ${primaryText}`}>Upcoming Events</h3>
                </div>
                <Badge className={isDark ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" : "bg-amber-100 text-amber-700 border-amber-200"}>
                  {upcomingCount}
                </Badge>
              </div>

              {upcomingEvents.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {upcomingEvents.map((e) => {
                    const catCfg = CATEGORY_CONFIG[e.category];
                    const stCfg = STATUS_CONFIG[e.status];
                    const member = getMember(e.assignedTo);
                    return (
                      <div
                        key={e.id}
                        className={`p-3 rounded-lg border ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50"} hover:border-amber-500/30 transition-colors cursor-pointer group`}
                        onClick={() => handleEditEvent(e)}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${catCfg.color}`}>
                            <span className="text-white">{catCfg.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-semibold text-xs truncate ${primaryText}`}>{e.title}</h4>
                            <p className={`text-[10px] ${secondaryText} mt-0.5`}>{e.date}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${isDark ? stCfg.darkColor : stCfg.color}`}>
                                {stCfg.label}
                              </Badge>
                              {e.assignedTo !== "none" && (
                                <div className="flex items-center gap-1">
                                  <Avatar className="h-4 w-4">
                                    <AvatarFallback className={`text-[8px] text-white ${member.color}`}>{member.initials}</AvatarFallback>
                                  </Avatar>
                                  <span className={`text-[9px] ${secondaryText}`}>{member.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${isDark ? "bg-white/[0.05]" : "bg-slate-100"}`}>
                    <Megaphone className={`h-5 w-5 ${secondaryText}`} />
                  </div>
                  <p className={`text-xs ${secondaryText}`}>No upcoming events</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Assignment Overview */}
          <Card className={cardClass}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-amber-500" />
                <h3 className={`font-semibold text-sm ${primaryText}`}>Team Workload</h3>
              </div>
              <div className="space-y-2">
                {TEAM_MEMBERS.filter(m => m.id !== "none").map((member) => {
                  const memberEvents = events.filter(e => e.assignedTo === member.id && e.status !== "cancelled");
                  const inProgress = memberEvents.filter(e => e.status === "in-progress").length;
                  return (
                    <div key={member.id} className={`flex items-center gap-2.5 p-2 rounded-lg ${isDark ? "hover:bg-white/[0.03]" : "hover:bg-slate-50"} transition-colors`}>
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className={`text-[10px] text-white font-semibold ${member.color}`}>{member.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${primaryText}`}>{member.name}</p>
                        <p className={`text-[10px] ${secondaryText}`}>{memberEvents.length} events{inProgress > 0 ? ` · ${inProgress} active` : ""}</p>
                      </div>
                      {inProgress > 0 && (
                        <Badge className={`text-[9px] px-1.5 py-0 ${isDark ? STATUS_CONFIG["in-progress"].darkColor : STATUS_CONFIG["in-progress"].color}`}>
                          {inProgress}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card className={cardClass}>
            <CardContent className="p-4">
              <h3 className={`font-semibold text-sm ${primaryText} mb-3`}>Status Overview</h3>
              <div className="space-y-2">
                {(["planned", "in-progress", "published", "cancelled"] as EventStatus[]).map((status) => {
                  const stCfg = STATUS_CONFIG[status];
                  const count = events.filter(e => e.status === status).length;
                  const total = events.length || 1;
                  const pct = (count / total) * 100;
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`flex items-center gap-1.5 text-xs ${secondaryText}`}>
                          {stCfg.icon} {stCfg.label}
                        </span>
                        <span className={`text-xs font-medium ${primaryText}`}>{count}</span>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            status === "planned" ? "bg-slate-400" :
                            status === "in-progress" ? "bg-amber-500" :
                            status === "published" ? "bg-emerald-500" :
                            "bg-red-500"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══ CREATE/EDIT EVENT DIALOG ═══ */}
      <Dialog open={eventOpen} onOpenChange={(open) => { setEventOpen(open); if (!open) setEditEventId(null); }}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700/50" : ""}`}>
          <DialogHeader>
            <DialogTitle className={primaryText}>{editEventId ? "Edit Marketing Event" : "Add Marketing Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelCls}>Event Title</Label>
              <Input placeholder="e.g., Summer Collection Launch" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Description</Label>
              <Textarea placeholder="Brief description..." rows={2} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} className={inputCls} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={labelCls}>Category</Label>
                <Select value={eventForm.category} onValueChange={(v) => setEventForm({ ...eventForm, category: v as EventCategory })}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(CATEGORY_CONFIG) as [EventCategory, typeof CATEGORY_CONFIG[EventCategory]][]).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Status</Label>
                <Select value={eventForm.status} onValueChange={(v) => setEventForm({ ...eventForm, status: v as EventStatus })}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUS_CONFIG) as [EventStatus, typeof STATUS_CONFIG[EventStatus]][]).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={labelCls}>Assigned To</Label>
                <Select value={eventForm.assignedTo} onValueChange={(v) => setEventForm({ ...eventForm, assignedTo: v })}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEAM_MEMBERS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Date</Label>
                <Input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className={inputCls} />
              </div>
            </div>
          </div>
          <DialogFooter>
            {editEventId && (
              <Button variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 mr-auto" onClick={() => { handleDeleteEvent(editEventId); setEventOpen(false); }}>
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => { setEventOpen(false); setEditEventId(null); }}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleCreateEvent}>
              {editEventId ? "Save Changes" : "Add Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ RESCHEDULE DIALOG ═══ */}
      <Dialog open={!!rescheduleEventId} onOpenChange={(open) => { if (!open) setRescheduleEventId(null); }}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-sm ${isDark ? "bg-slate-900 border-slate-700/50" : ""}`}>
          <DialogHeader>
            <DialogTitle className={primaryText}>Reschedule Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className={`text-sm ${secondaryText}`}>
              Change the date for: <strong className={primaryText}>{events.find(e => e.id === rescheduleEventId)?.title}</strong>
            </p>
            <div className="space-y-2">
              <Label className={labelCls}>New Date</Label>
              <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className={inputCls} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleEventId(null)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleReschedule}>
              Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

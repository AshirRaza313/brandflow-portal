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
import { Plus, Calendar as CalendarIcon, Megaphone, Gift, Tag, ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useBrandOnyxStore } from "@/store/brandflow-store";

interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  type: "sale" | "content" | "event" | "launch";
  date: string;
  createdAt: string;
}

export function MarketingCalendarPage() {
  const { appTheme } = useBrandOnyxStore();
  const isDark = appTheme !== "light";

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const [eventOpen, setEventOpen] = useState(false);
  const [eventForm, setEventForm] = useState<{ title: string; description: string; type: "sale" | "content" | "event" | "launch"; date: string }>({ title: "", description: "", type: "content", date: "" });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  const handleCreateEvent = () => {
    if (!eventForm.title.trim()) { toast.error("Event title is required"); return; }
    if (!eventForm.date) { toast.error("Event date is required"); return; }
    setEvents(prev => [{ id: Date.now(), ...eventForm, createdAt: new Date().toISOString() }, ...prev]);
    setEventOpen(false);
    setEventForm({ title: "", description: "", type: "content", date: "" });
    toast.success("Marketing event created successfully!");
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => e.date === dateStr);
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "sale": return "bg-amber-500";
      case "content": return "bg-blue-500";
      case "event": return "bg-purple-500";
      case "launch": return "bg-rose-500";
      default: return "bg-emerald-500";
    }
  };

  const inputCls = isDark ? "bg-slate-800 border-slate-600 text-white" : "";
  const labelCls = isDark ? "text-slate-300" : "";

  const upcomingEvents = events.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Marketing Calendar</h1>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Plan and schedule your marketing activities</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setEventOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Event</Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {["sale", "content", "event", "launch"].map((type) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={`h-2.5 w-2.5 rounded-full ${typeColor(type)}`} />
            <span className="capitalize">{type}</span>
          </div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="sm" onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); } else { setCurrentMonth(currentMonth - 1); } }}><ChevronLeft className="h-4 w-4" /></Button>
              <h2 className={`text-lg font-bold ${isDark ? "text-white" : ""}`}>
                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][currentMonth]} {currentYear}
              </h2>
              <Button variant="outline" size="sm" onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); } else { setCurrentMonth(currentMonth + 1); } }}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-lg overflow-hidden">
              {weekDays.map((day) => (<div key={day} className="bg-slate-50 py-2 text-center text-xs font-medium text-muted-foreground">{day}</div>))}
              {Array.from({ length: firstDay }, (_, i) => (<div key={`empty-${i}`} className="bg-white min-h-[100px] p-1.5" />))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDay(day);
                return (
                  <div key={day} className={`min-h-[100px] p-1.5 ${isDark ? "bg-slate-800" : "bg-white"}`}>
                    <span className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>{day}</span>
                    {dayEvents.map((e) => (
                      <div key={e.id} className={`mt-1 px-1.5 py-0.5 rounded text-[10px] text-white ${typeColor(e.type)} truncate`}>
                        {e.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Upcoming Events */}
            <div className="mt-6 space-y-3">
              <h3 className={`font-semibold text-sm ${isDark ? "text-white" : ""}`}>Upcoming Activities</h3>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-2">
                  {upcomingEvents.map((e) => (
                    <div key={e.id} className={`p-3 rounded-lg border flex items-center gap-3 ${isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-white"}`}>
                      <div className={`h-3 w-3 rounded-full flex-shrink-0 ${typeColor(e.type)}`} />
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold text-sm truncate ${isDark ? "text-white" : "text-slate-900"}`}>{e.title}</h4>
                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{e.date} · {e.description}</p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{e.type}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Megaphone className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">No upcoming marketing activities</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Event Dialog */}
      <Dialog open={eventOpen} onOpenChange={setEventOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>Add Marketing Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelCls}>Event Title</Label>
              <Input placeholder="e.g., Summer Sale Campaign" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Description</Label>
              <Textarea placeholder="Brief description..." rows={3} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} className={inputCls} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={labelCls}>Type</Label>
                <Select value={eventForm.type} onValueChange={(v) => setEventForm({ ...eventForm, type: v as "sale" | "content" | "event" | "launch" })}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="launch">Launch</SelectItem>
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
            <Button variant="outline" onClick={() => setEventOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateEvent}>Add Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

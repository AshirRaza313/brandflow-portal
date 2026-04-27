"use client";

import { useState } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, Calendar } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function CalendarPage() {
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme === "dark" || appTheme === "premium-dark";
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [eventOpen, setEventOpen] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", date: "", time: "", description: "" });
  const [events, setEvents] = useState<{ id: number; title: string; date: string; time: string; description: string }[]>([]);

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const today = new Date();

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={isDark ? "text-xl sm:text-2xl font-bold text-white" : "text-xl sm:text-2xl font-bold text-slate-900"}>Calendar</h1>
          <p className="text-sm text-slate-500 mt-1">View your schedule and upcoming events</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => { setEventForm({ title: "", date: "", time: "", description: "" }); setEventOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add Event</Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
              <h2 className="text-base sm:text-lg font-bold">{monthNames[currentMonth]} {currentYear}</h2>
              <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            </div>

            {/* Calendar Grid */}
            <div>
            <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-lg overflow-hidden">
              {weekDays.map((day) => (
                <div key={day} className="bg-slate-50 py-2 text-center text-xs font-medium text-muted-foreground">{day}</div>
              ))}
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} className="bg-white min-h-[40px] sm:min-h-[60px] p-1" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                return (
                  <div key={day} className={`bg-white min-h-[40px] sm:min-h-[60px] p-1 hover:bg-slate-50/50 transition-colors ${isToday ? "bg-amber-50/50" : ""}`}>
                    <span className={isDark ? `text-[11px] sm:text-xs font-medium ${isToday ? "bg-amber-600 text-white rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center" : "text-slate-300"}` : `text-[11px] sm:text-xs font-medium ${isToday ? "bg-amber-600 text-white rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center" : "text-slate-700"}`}>
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
            </div>
            <div className="mt-6">
              <h3 className="font-semibold text-sm mb-3">Upcoming Events</h3>
              {events.length === 0 ? (
                <div className="text-center py-8">
                  <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">No upcoming events</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((ev) => (
                    <Card key={ev.id}><CardContent className="p-3 flex items-center justify-between"><div><p className="text-sm font-medium">{ev.title}</p><p className="text-xs text-muted-foreground">{ev.date}{ev.time ? ` at ${ev.time}` : ""}</p></div></CardContent></Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Event Creation Dialog */}
      <Dialog open={eventOpen} onOpenChange={setEventOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!eventForm.title.trim()) { toast.error("Event title is required"); return; }
              if (!eventForm.date) { toast.error("Event date is required"); return; }
              setEvents((prev) => [{ id: Date.now(), ...eventForm }, ...prev]);
              setEventForm({ title: "", date: "", time: "", description: "" });
              setEventOpen(false);
              toast.success("Event created successfully!");
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="Event title"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={eventForm.time}
                  onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEventOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700">Create Event</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

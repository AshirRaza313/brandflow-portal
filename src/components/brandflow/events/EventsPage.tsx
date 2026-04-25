"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useValtrioxStore } from "@/store/brandflow-store";
import {
  getActiveEvents,
  getUpcomingEvents,
  getAllEvents,
  applyEventTheme,
  getAllCountries,
  type SeasonalEvent,
} from "@/lib/event-themes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PartyPopper,
  Calendar,
  Clock,
  Sparkles,
  Palette,
  Globe,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  Filter,
  Info,
  ChevronLeft,
  ChevronRight,
  Tag,
  MapPin,
  X,
  SkipForward,
  RotateCcw,
} from "lucide-react";

// ============================================================================
// Valtriox Icon Component — Uses actual Valtriox logo (PNG converted to icon)
// ============================================================================

function ValtrioxIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/valtriox-icon-32.png"
      alt="Valtriox"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}

// ============================================================================
// Constants & Helpers
// ============================================================================

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

const TYPE_CONFIG: Record<string, { label: string; color: string; darkColor: string }> = {
  religious: { label: "Religious", color: "bg-amber-100 text-amber-700 border-amber-200", darkColor: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  national: { label: "National", color: "bg-amber-100 text-amber-700 border-amber-200", darkColor: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  cultural: { label: "Cultural", color: "bg-amber-100 text-amber-700 border-amber-200", darkColor: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  commercial: { label: "Commercial", color: "bg-rose-100 text-rose-700 border-rose-200", darkColor: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
};

function formatDateRange(date: string, dateEnd?: string): string {
  const [m1, d1] = date.split("-").map(Number);
  const startStr = `${MONTH_NAMES[m1 - 1]} ${d1}`;
  if (!dateEnd) return startStr;
  const [m2, d2] = dateEnd.split("-").map(Number);
  if (m1 === m2) return `${startStr} - ${d2}`;
  return `${startStr} - ${MONTH_NAMES[m2 - 1]} ${d2}`;
}

function parseMMDDToDate(mmdd: string, year: number): Date {
  const [m, d] = mmdd.split("-").map(Number);
  return new Date(year, m - 1, d);
}

function getCountryFlag(code: string): string {
  const country = getAllCountries().find((c) => c.code === code);
  return country ? country.flag : code;
}

function getCountryName(code: string): string {
  const country = getAllCountries().find((c) => c.code === code);
  return country ? country.name : code;
}

// ============================================================================
// Skipped Events Helper (persisted to localStorage per brand)
// ============================================================================

function getSkippedEventIds(): Set<string> {
  try {
    if (typeof window === "undefined") return new Set();
    const raw = localStorage.getItem("valtriox-skipped-events");
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSkippedEventIds(ids: Set<string>) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem("valtriox-skipped-events", JSON.stringify([...ids]));
    }
  } catch {}
}

// ============================================================================
// Event Card Component
// ============================================================================

function EventCard({
  event,
  isPreviewed,
  isApplied,
  isDark,
  isGold,
  isSkipped,
  onApply,
  onSkip,
  onUnskip,
}: {
  event: SeasonalEvent;
  isPreviewed: boolean;
  isApplied: boolean;
  isDark: boolean;
  isGold: boolean;
  isSkipped: boolean;
  onApply: () => void;
  onSkip: () => void;
  onUnskip: () => void;
}) {
  const typeConfig = TYPE_CONFIG[event.type];
  const previewIcons = event.floatingIcons.slice(0, 6);
  const displayCountries = event.countries.includes("all")
    ? getAllCountries().slice(0, 3)
    : event.countries.map((c) => ({ code: c, name: getCountryName(c), flag: getCountryFlag(c) }));

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`overflow-hidden cursor-pointer transition-all duration-200 relative ${
          isSkipped ? "opacity-60" : ""
        } ${
          isDark
            ? "bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05]"
            : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xl"
        } ${isApplied ? `ring-2 ring-offset-2 ${isDark ? "ring-offset-slate-900" : "ring-offset-white"}` : ""}`}
        style={isApplied ? { '--tw-ring-color': event.theme.primary } as React.CSSProperties : undefined}
      >
        {/* Gradient Banner */}
        <div
          className="h-24 sm:h-28 relative overflow-hidden"
          style={{ background: event.theme.gradient }}
        >
          {isSkipped && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
              <Badge className="bg-black/50 text-white border-0 text-xs backdrop-blur-sm">
                <SkipForward className="h-3 w-3 mr-1" />
                Skipped
              </Badge>
            </div>
          )}
          {isApplied && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-2 right-2"
            >
              <Badge className="bg-white/25 text-white border-0 text-[10px] backdrop-blur-sm">
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                Applied
              </Badge>
            </motion.div>
          )}
          <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
            <Badge className="bg-black/20 text-white border-0 text-[10px] backdrop-blur-sm">
              <Tag className="h-2.5 w-2.5 mr-0.5" />
              {event.countries.includes("all") ? "Global" : `${displayCountries.length} regions`}
            </Badge>
          </div>
          <div className="absolute bottom-2 right-3 text-3xl sm:text-4xl opacity-30">
            {event.emoji}
          </div>
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className={`text-sm sm:text-base font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-slate-900"}`}>
              <span className="text-lg sm:text-xl">{event.emoji}</span>
              <span className="truncate">{event.name}</span>
            </CardTitle>
          </div>
          <CardDescription className={`text-xs flex items-center gap-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <Calendar className="h-3 w-3" />
            {formatDateRange(event.date, event.dateEnd)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Badges row */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className={`text-[10px] border ${isDark ? typeConfig.darkColor : typeConfig.color}`}>
              {typeConfig.label}
            </Badge>
            {event.religions[0] !== "all" && (
              <Badge variant="secondary" className={`text-[10px] ${isDark ? "bg-white/[0.06] text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                {event.religions.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(", ")}
              </Badge>
            )}
          </div>

          {/* Country flags */}
          <div className="flex items-center gap-1">
            <MapPin className={`h-3 w-3 flex-shrink-0 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
            <div className="flex items-center gap-0.5 flex-wrap">
              {displayCountries.slice(0, 5).map((c) => (
                <span key={c.code} className="text-sm" title={c.name}>
                  {c.flag}
                </span>
              ))}
              {(event.countries.includes("all") ? 110 : event.countries.length) > 5 && (
                <span className={`text-[10px] ml-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  +{(event.countries.includes("all") ? 110 : event.countries.length) - 5}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p className={`text-xs line-clamp-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {event.description}
          </p>

          {/* Offer template */}
          <div className={`text-xs px-2.5 py-1.5 rounded-md ${isDark ? "bg-white/[0.04] text-slate-300" : "bg-slate-50 text-slate-600"}`}>
            <span className="opacity-60">Offer: </span>
            {event.offerTemplate.replace("{discount}", "20")}
          </div>

          {/* Floating icons preview */}
          {previewIcons.length > 0 && (
            <div className="flex items-center gap-1">
              <span className={`text-[10px] mr-1 ${isDark ? "text-slate-600" : "text-slate-400"}`}>Icons:</span>
              {previewIcons.map((icon, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="text-sm"
                >
                  {icon}
                </motion.span>
              ))}
              {event.floatingIcons.length > 6 && (
                <span className={`text-[10px] ml-0.5 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                  +{event.floatingIcons.length - 6}
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isApplied ? "secondary" : "default"}
              className={`flex-1 h-8 text-xs transition-all ${
                isGold
                  ? isApplied
                    ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
                    : "bg-amber-600 hover:bg-amber-700 text-white"
                  : isApplied
                    ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
                    : "bg-amber-600 hover:bg-amber-700 text-white"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onApply();
              }}
            >
              <Palette className="h-3 w-3 mr-1.5" />
              {isApplied ? "Re-apply" : "Apply Theme"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={`h-8 text-xs px-2.5 shrink-0 ${
                isSkipped
                  ? isDark
                    ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                    : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  : isDark
                    ? "text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (isSkipped) { onUnskip(); } else { onSkip(); }
              }}
              title={isSkipped ? "Unskip this event" : "Skip this event"}
            >
              {isSkipped ? (
                <RotateCcw className="h-3 w-3" />
              ) : (
                <SkipForward className="h-3 w-3" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// Calendar Component — Fully Mobile Responsive
// ============================================================================

function EventCalendar({
  events,
  skippedEventIds,
  isDark,
  isGold,
  onEventClick,
}: {
  events: SeasonalEvent[];
  skippedEventIds: Set<string>;
  isDark: boolean;
  isGold: boolean;
  onEventClick: (event: SeasonalEvent) => void;
}) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const today = new Date();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDaysInMonth = new Date(year, month, 0).getDate();

  // Filter out skipped events
  const visibleEvents = useMemo(
    () => events.filter((e) => !skippedEventIds.has(e.id)),
    [events, skippedEventIds]
  );

  // Map events to calendar days — only for the currently viewed month/year
  const eventsByDay = useMemo(() => {
    const map: Record<number, SeasonalEvent[]> = {};
    visibleEvents.forEach((event) => {
      const start = parseMMDDToDate(event.date, year);
      const end = event.dateEnd ? parseMMDDToDate(event.dateEnd, year) : start;

      // Build full Date objects for each day in the event range
      const totalDays = (start <= end)
        ? Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
        : 1;

      for (let i = 0; i < totalDays; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        // Only include dates that fall in the currently viewed month & year
        if (d.getMonth() === month && d.getFullYear() === year) {
          const day = d.getDate();
          if (!map[day]) map[day] = [];
          if (!map[day].find((e) => e.id === event.id)) {
            map[day].push(event);
          }
        }
      }
    });
    return map;
  }, [visibleEvents, year, month, daysInMonth]);

  const goToPrev = () => setViewDate(new Date(year, month - 1, 1));
  const goToNext = () => setViewDate(new Date(year, month + 1, 1));
  const goToToday = () => setViewDate(new Date());

  const accentClass = isGold ? "text-amber-500" : "text-amber-500";
  const accentBg = isGold ? "bg-amber-500/15" : "bg-amber-500/15";
  const accentRing = isGold ? "ring-amber-500/40" : "ring-amber-500/40";

  const calendarCells: Array<{
    day: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    events: SeasonalEvent[];
  }> = [];

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarCells.push({ day: prevDaysInMonth - i, isCurrentMonth: false, isToday: false, events: [] });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    calendarCells.push({
      day: d,
      isCurrentMonth: true,
      isToday,
      events: eventsByDay[d] || [],
    });
  }

  // Next month leading days
  const remaining = 42 - calendarCells.length;
  for (let d = 1; d <= remaining; d++) {
    calendarCells.push({ day: d, isCurrentMonth: false, isToday: false, events: [] });
  }

  return (
    <Card className={`w-full overflow-hidden ${isDark ? "bg-white/[0.03] border-white/[0.06]" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className={`flex items-center gap-2 text-base sm:text-lg ${isDark ? "text-white" : "text-slate-900"}`}>
            <Calendar className={`h-5 w-5 ${accentClass}`} />
            <span>Event Calendar</span>
          </CardTitle>
          <div className="flex items-center justify-between sm:justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={goToToday} className={`text-xs h-7 px-2 ${isDark ? "text-slate-400 hover:text-white hover:bg-white/[0.06]" : ""}`}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className={`h-7 w-7 ${isDark ? "text-slate-400 hover:text-white hover:bg-white/[0.06]" : ""}`} onClick={goToPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className={`text-sm font-semibold min-w-[90px] sm:min-w-[140px] text-center ${isDark ? "text-white" : "text-slate-900"}`}>
              {MONTH_NAMES[month]} {year}
            </span>
            <Button variant="ghost" size="icon" className={`h-7 w-7 ${isDark ? "text-slate-400 hover:text-white hover:bg-white/[0.06]" : ""}`} onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto -mx-1 px-1">
        <div className="min-w-[280px] sm:min-w-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-px">
            {DAY_NAMES_SHORT.map((day, idx) => (
              <div
                key={idx}
                className={`text-center font-semibold py-1 ${isDark ? "text-slate-500" : "text-slate-400"} text-[9px] sm:text-[11px]`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px">
            {calendarCells.map((cell, idx) => {
              const hasEvents = cell.events.length > 0;
              const activeEvent = cell.events.find((e) => {
                const todayMMDD = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                const eStart = parseMMDDToDate(e.date, today.getFullYear());
                const eEnd = e.dateEnd ? parseMMDDToDate(e.dateEnd, today.getFullYear()) : eStart;
                const cellDate = new Date(year, month, cell.day);
                return cellDate >= eStart && cellDate <= eEnd;
              });

              return (
                <motion.button
                  key={idx}
                  whileHover={cell.isCurrentMonth && hasEvents ? { scale: 1.05 } : {}}
                  onClick={() => cell.isCurrentMonth && hasEvents && cell.events[0] && onEventClick(cell.events[0])}
                  className={`
                    relative aspect-square rounded-md sm:rounded-lg flex flex-col items-center justify-center text-xs
                    transition-all duration-150 min-h-[36px] sm:min-h-[44px]
                    ${!cell.isCurrentMonth ? "opacity-30 cursor-default" : "cursor-default"}
                    ${cell.isToday ? `ring-1.5 sm:ring-2 ${accentRing} font-bold ${accentClass}` : ""}
                    ${cell.isCurrentMonth && !cell.isToday ? (isDark ? "text-slate-300 hover:bg-white/[0.06]" : "text-slate-700 hover:bg-slate-50") : ""}
                    ${cell.isCurrentMonth && hasEvents && !cell.isToday ? (isDark ? "bg-white/[0.03]" : "bg-slate-50") : ""}
                  `}
                >
                  <span className="text-[10px] sm:text-xs leading-none">
                    {cell.day}
                  </span>
                  {/* Event markers — Valtriox Icon for events */}
                  {hasEvents && (
                    <div className="flex gap-px sm:gap-0.5 mt-0.5 items-center justify-center">
                      {cell.events.slice(0, 2).map((ev, i) => (
                        <div
                          key={i}
                          className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-[2px] sm:rounded-[3px] flex items-center justify-center overflow-hidden shadow-sm"
                          style={{ backgroundColor: ev.theme.primary }}
                          title={ev.name}
                        >
                          <img
                            src="/valtriox-icon-32.png"
                            alt="Valtriox"
                            className="h-full w-full object-contain"
                            draggable={false}
                          />
                        </div>
                      ))}
                      {/* Extra events shown as dot */}
                      {cell.events.length > 2 && (
                        <div
                          className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full shadow-sm"
                          style={{ backgroundColor: cell.events[0].theme.primary }}
                          title={`+${cell.events.length - 2} more`}
                        />
                      )}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${isGold ? "bg-amber-500" : "bg-amber-500"}`} />
            <span className={`text-[10px] sm:text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Active Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-[2px] sm:rounded-[3px] bg-yellow-500 flex items-center justify-center overflow-hidden">
              <img
                src="/valtriox-icon-32.png"
                alt="Valtriox"
                className="h-full w-full object-contain"
                draggable={false}
              />
            </div>
            <span className={`text-[10px] sm:text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Has Events</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ring-1.5 sm:ring-2 ${accentRing}`} />
            <span className={`text-[10px] sm:text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Today</span>
          </div>
          {skippedEventIds.size > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-slate-500/40" />
              <span className={`text-[10px] sm:text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                {skippedEventIds.size} skipped
              </span>
            </div>
          )}
        </div>

        {/* Events this month summary */}
        {Object.keys(eventsByDay).length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Events this month ({Object.keys(eventsByDay).length} days)
              </p>
              {skippedEventIds.size > 0 && (
                <p className={`text-[10px] ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                  ({skippedEventIds.size} hidden)
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 sm:max-h-24 overflow-y-auto">
              {[...new Map(visibleEvents.map((e) => [e.id, e])).values()].map((event) => (
                <motion.button
                  key={event.id}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => onEventClick(event)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-[11px] border transition-colors shrink-0 ${
                    isDark
                      ? "bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.08]"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{event.emoji}</span>
                  <span className="truncate max-w-[60px] sm:max-w-[120px]">{event.name}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Skipped Events Panel
// ============================================================================

function SkippedEventsPanel({
  events,
  isDark,
  isGold,
  onUnskip,
}: {
  events: SeasonalEvent[];
  isDark: boolean;
  isGold: boolean;
  onUnskip: (id: string) => void;
}) {
  const accentClass = isGold ? "text-amber-400" : "text-amber-400";
  const [isExpanded, setIsExpanded] = useState(false);

  if (events.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border overflow-hidden ${
        isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-slate-50 border-slate-200"
      }`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-left ${
          isDark ? "hover:bg-white/[0.03]" : "hover:bg-slate-100"
        } transition-colors`}
      >
        <div className="flex items-center gap-2">
          <SkipForward className={`h-4 w-4 ${accentClass}`} />
          <span className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            Skipped Events ({events.length})
          </span>
        </div>
        <ChevronRight
          className={`h-3.5 w-3.5 transition-transform duration-200 ${isDark ? "text-slate-500" : "text-slate-400"} ${
            isExpanded ? "rotate-90" : ""
          }`}
        />
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1.5 max-h-48 overflow-y-auto">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg ${
                    isDark ? "bg-white/[0.03]" : "bg-white border border-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{event.emoji}</span>
                    <span className={`text-xs truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {event.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 w-6 p-0 shrink-0 ${isDark ? "text-slate-500 hover:text-white hover:bg-white/[0.06]" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`}
                    onClick={() => onUnskip(event.id)}
                    title="Unskip"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({ isDark, title, description }: { isDark: boolean; title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12 sm:py-16"
    >
      <Globe className={`h-12 w-12 sm:h-14 sm:w-14 mx-auto mb-4 ${isDark ? "text-slate-700" : "text-slate-300"}`} />
      <h3 className={`text-base sm:text-lg font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>{title}</h3>
      <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{description}</p>
    </motion.div>
  );
}

// ============================================================================
// Main EventsPage Component
// ============================================================================

export function EventsPage() {
  const {
    activeEventTheme,
    setActiveEventTheme,
    eventThemingEnabled,
    setEventThemingEnabled,
    floatingIconsEnabled,
    setFloatingIconsEnabled,
    selectedCountry,
    selectedReligion,
    appTheme,
  } = useValtrioxStore();

  const [previewEventId, setPreviewEventId] = useState<string | null>(null);
  const [skippedEventIds, setSkippedEventIds] = useState<Set<string>>(() => getSkippedEventIds());

  // Theme helpers
  const isDark = appTheme === "premium-dark" || appTheme === "dark";
  const isGold = appTheme === "premium-dark";

  // Resolve country + religion for queries (case-insensitive)
  const resolvedCountry = selectedCountry || "";
  const resolvedReligion = selectedReligion?.toLowerCase() || "";

  // Fetch events from real database
  const activeEvents = useMemo(() => {
    return getActiveEvents(resolvedCountry, resolvedReligion);
  }, [resolvedCountry, resolvedReligion]);

  const upcomingEvents = useMemo(() => {
    return getUpcomingEvents(resolvedCountry, resolvedReligion, 365);
  }, [resolvedCountry, resolvedReligion]);

  const allFilteredEvents = useMemo(() => {
    const all = getAllEvents();
    return all.filter((event) => {
      const countryMatch =
        !resolvedCountry ||
        event.countries.includes("all") ||
        event.countries.includes(resolvedCountry);
      const religionMatch =
        !resolvedReligion ||
        event.religions.includes("all") ||
        event.religions.includes(resolvedReligion);
      return countryMatch && religionMatch;
    });
  }, [resolvedCountry, resolvedReligion]);

  // Filter out skipped events for display
  const visibleActiveEvents = useMemo(
    () => activeEvents.filter((e) => !skippedEventIds.has(e.id)),
    [activeEvents, skippedEventIds]
  );
  const visibleUpcomingEvents = useMemo(
    () => upcomingEvents.filter((e) => !skippedEventIds.has(e.id)),
    [upcomingEvents, skippedEventIds]
  );
  const visibleAllEvents = useMemo(
    () => allFilteredEvents.filter((e) => !skippedEventIds.has(e.id)),
    [allFilteredEvents, skippedEventIds]
  );
  const skippedEvents = useMemo(
    () => allFilteredEvents.filter((e) => skippedEventIds.has(e.id)),
    [allFilteredEvents, skippedEventIds]
  );

  const hasFilters = !!(selectedCountry || selectedReligion);

  // Country display info
  const countryInfo = useMemo(() => {
    if (!selectedCountry) return null;
    return getAllCountries().find((c) => c.code === selectedCountry);
  }, [selectedCountry]);

  // Combined event list for preview lookups
  const allEventsMap = useMemo(() => {
    const map = new Map<string, SeasonalEvent>();
    getAllEvents().forEach((e) => map.set(e.id, e));
    return map;
  }, []);

  // Handlers
  const handleApplyTheme = useCallback(
    (event: SeasonalEvent) => {
      const theme = applyEventTheme(event);
      setActiveEventTheme(theme);
      setPreviewEventId(event.id);
      setFloatingIconsEnabled(true);
    },
    [setActiveEventTheme, setFloatingIconsEnabled],
  );

  const handleClearTheme = useCallback(() => {
    setActiveEventTheme(null);
    setEventThemingEnabled(false);
    setFloatingIconsEnabled(false);
    setPreviewEventId(null);
  }, [setActiveEventTheme, setEventThemingEnabled, setFloatingIconsEnabled]);

  const handleCalendarEventClick = useCallback(
    (event: SeasonalEvent) => {
      handleApplyTheme(event);
    },
    [handleApplyTheme],
  );

  const handleSkipEvent = useCallback((eventId: string) => {
    setSkippedEventIds((prev) => {
      const next = new Set(prev);
      next.add(eventId);
      saveSkippedEventIds(next);
      return next;
    });
  }, []);

  const handleUnskipEvent = useCallback((eventId: string) => {
    setSkippedEventIds((prev) => {
      const next = new Set(prev);
      next.delete(eventId);
      saveSkippedEventIds(next);
      return next;
    });
  }, []);

  const handleUnskipAll = useCallback(() => {
    setSkippedEventIds(new Set());
    saveSkippedEventIds(new Set());
  }, []);

  // Compute previewed event
  const previewedEvent = previewEventId ? allEventsMap.get(previewEventId) : null;

  // Accent color
  const accentClass = isGold ? "text-amber-500" : "text-amber-500";

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className={`text-lg sm:text-2xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-slate-900"}`}>
            <PartyPopper className={`h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 ${accentClass}`} />
            <span className="truncate">Event Themes</span>
          </h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Manage dynamic event theming for seasonal celebrations
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {skippedEventIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnskipAll}
              className={`text-xs h-7 px-2 ${isDark ? "border-white/[0.1] text-slate-300 hover:bg-white/[0.06]" : ""}`}
            >
              <RotateCcw className="h-3 w-3 mr-1.5" />
              Restore All
            </Button>
          )}
          {activeEventTheme && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearTheme}
              className={`text-xs h-7 px-2 ${isDark ? "border-white/[0.1] text-slate-300 hover:bg-white/[0.06]" : ""}`}
            >
              <EyeOff className="h-3.5 w-3.5 mr-1.5" />
              Clear Theme
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => {
              if (activeEventTheme) {
                setEventThemingEnabled(!eventThemingEnabled);
                if (!eventThemingEnabled) setFloatingIconsEnabled(true);
              }
            }}
            disabled={!activeEventTheme}
            className={`text-xs ${
              eventThemingEnabled
                ? isGold
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
                : isDark
                  ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]"
                  : ""
            }`}
          >
            {eventThemingEnabled ? (
              <ToggleRight className="h-4 w-4 mr-1.5" />
            ) : (
              <ToggleLeft className="h-4 w-4 mr-1.5" />
            )}
            <span className="hidden sm:inline">{eventThemingEnabled ? "Theming Active" : "Enable Theming"}</span>
            <span className="sm:hidden">{eventThemingEnabled ? "Active" : "Enable"}</span>
          </Button>
        </div>
      </div>

      {/* Filter Banner */}
      <AnimatePresence mode="wait">
        {hasFilters ? (
          <motion.div
            key="filter-active"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded-xl p-2.5 sm:p-4 border flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 ${
              isDark
                ? `bg-amber-500/5 border-amber-500/20`
                : "bg-amber-50/50 border-amber-200"
            }`}
          >
            <Filter className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${isGold ? "text-amber-500" : "text-amber-600"}`} />
            <div className="min-w-0">
              <p className={`text-xs sm:text-sm font-semibold ${isDark ? "text-amber-300" : "text-amber-800"} break-words`}>
                Showing events for: {countryInfo ? `${countryInfo.name} (${countryInfo.flag})` : "All Countries"}
                {selectedReligion && ` • ${selectedReligion.charAt(0).toUpperCase() + selectedReligion.slice(1)}`}
              </p>
              <p className={`text-[10px] sm:text-xs mt-0.5 ${isDark ? "text-amber-400/60" : "text-amber-600"}`}>
                {visibleActiveEvents.length} active, {visibleUpcomingEvents.length} upcoming, {visibleAllEvents.length} total events match your filters
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="filter-empty"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded-xl p-2.5 sm:p-4 border flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 ${
              isDark
                ? "bg-amber-500/5 border-amber-500/20"
                : "bg-amber-50/50 border-amber-200"
            }`}
          >
            <Info className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
            <div className="min-w-0">
              <p className={`text-xs sm:text-sm font-semibold ${isDark ? "text-amber-300" : "text-amber-800"}`}>
                Select country & religion in Settings
              </p>
              <p className={`text-[10px] sm:text-xs mt-0.5 ${isDark ? "text-amber-400/60" : "text-amber-600"}`}>
                Showing all {visibleAllEvents.length} events globally. Configure your region in Settings for personalized results.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skipped Events Panel */}
      {skippedEvents.length > 0 && (
        <SkippedEventsPanel
          events={skippedEvents}
          isDark={isDark}
          isGold={isGold}
          onUnskip={handleUnskipEvent}
        />
      )}

      {/* Active Theme Status Banner */}
      <AnimatePresence>
        {activeEventTheme && previewedEvent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl p-2.5 sm:p-4 border"
            style={{
              background: activeEventTheme.gradient,
              borderColor: activeEventTheme.primary,
            }}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="text-xl sm:text-2xl flex-shrink-0">{previewedEvent.emoji}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-xs sm:text-sm text-white truncate">
                    {previewedEvent.name} Applied
                  </p>
                  <p className="text-[10px] sm:text-xs text-white/80">
                    {eventThemingEnabled
                      ? "Event theming is active across your storefront"
                      : "Click 'Enable Theming' to activate"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 bg-black/20 backdrop-blur-sm">
                  <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                  <span className="text-[10px] sm:text-xs font-medium text-white">Preview</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 sm:h-7 sm:w-auto sm:px-2 text-xs text-white hover:bg-white/20"
                  onClick={handleClearTheme}
                >
                  <EyeOff className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Clear</span>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Tabs */}
      <Tabs defaultValue="active">
        <TabsList className={`${isDark ? "bg-white/[0.04] border border-white/[0.06]" : ""} overflow-x-auto flex-nowrap w-full justify-start sm:justify-center`}>
          <TabsTrigger
            value="active"
            className={`gap-1 sm:gap-1.5 text-xs sm:text-sm data-[state=active]:${
              isGold ? "bg-amber-500/15 text-amber-400" : "bg-amber-500/15 text-amber-600"
            } ${isDark ? "text-slate-400" : ""} shrink-0`}
          >
            <PartyPopper className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Active
            {visibleActiveEvents.length > 0 && (
              <Badge variant="secondary" className={`h-4 sm:h-5 min-w-[16px] sm:min-w-[20px] text-[9px] sm:text-[10px] px-1 ${isGold ? "bg-amber-500/20 text-amber-400" : "bg-amber-500/20 text-amber-600"}`}>
                {visibleActiveEvents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="upcoming"
            className={`gap-1 sm:gap-1.5 text-xs sm:text-sm data-[state=active]:${
              isGold ? "bg-amber-500/15 text-amber-400" : "bg-amber-500/15 text-amber-600"
            } ${isDark ? "text-slate-400" : ""} shrink-0`}
          >
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Upcoming
            {visibleUpcomingEvents.length > 0 && (
              <Badge variant="secondary" className={`h-4 sm:h-5 min-w-[16px] sm:min-w-[20px] text-[9px] sm:text-[10px] px-1 ${isGold ? "bg-amber-500/20 text-amber-400" : "bg-amber-500/20 text-amber-600"}`}>
                {visibleUpcomingEvents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="all"
            className={`gap-1 sm:gap-1.5 text-xs sm:text-sm data-[state=active]:${
              isGold ? "bg-amber-500/15 text-amber-400" : "bg-amber-500/15 text-amber-600"
            } ${isDark ? "text-slate-400" : ""} shrink-0`}
          >
            <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            All Events
            <Badge variant="secondary" className={`h-4 sm:h-5 min-w-[16px] sm:min-w-[20px] text-[9px] sm:text-[10px] px-1 ${isDark ? "bg-white/[0.06] text-slate-400" : "bg-slate-100 text-slate-500"}`}>
              {visibleAllEvents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="calendar"
            className={`gap-1 sm:gap-1.5 text-xs sm:text-sm data-[state=active]:${
              isGold ? "bg-amber-500/15 text-amber-400" : "bg-amber-500/15 text-amber-600"
            } ${isDark ? "text-slate-400" : ""} shrink-0`}
          >
            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Calendar
          </TabsTrigger>
        </TabsList>

        {/* Active Events Tab */}
        <TabsContent value="active" className="mt-3 sm:mt-4">
          {visibleActiveEvents.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4"
            >
              {visibleActiveEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isPreviewed={previewEventId === event.id}
                  isApplied={previewEventId === event.id}
                  isDark={isDark}
                  isGold={isGold}
                  isSkipped={skippedEventIds.has(event.id)}
                  onApply={() => handleApplyTheme(event)}
                  onSkip={() => handleSkipEvent(event.id)}
                  onUnskip={() => handleUnskipEvent(event.id)}
                />
              ))}
            </motion.div>
          ) : (
            <EmptyState
              isDark={isDark}
              title="No active events right now"
              description={
                hasFilters
                  ? "No events are happening today for your selected country and religion. Check the Upcoming tab!"
                  : "No events are happening today globally. Check the Upcoming or All Events tab."
              }
            />
          )}
        </TabsContent>

        {/* Upcoming Events Tab */}
        <TabsContent value="upcoming" className="mt-3 sm:mt-4">
          {visibleUpcomingEvents.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4"
            >
              {visibleUpcomingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isPreviewed={previewEventId === event.id}
                  isApplied={previewEventId === event.id}
                  isDark={isDark}
                  isGold={isGold}
                  isSkipped={skippedEventIds.has(event.id)}
                  onApply={() => handleApplyTheme(event)}
                  onSkip={() => handleSkipEvent(event.id)}
                  onUnskip={() => handleUnskipEvent(event.id)}
                />
              ))}
            </motion.div>
          ) : (
            <EmptyState
              isDark={isDark}
              title="No upcoming events"
              description={
                hasFilters
                  ? "No events found in the next 365 days for your filters."
                  : "No upcoming events found in the next 365 days."
              }
            />
          )}
        </TabsContent>

        {/* All Events Tab */}
        <TabsContent value="all" className="mt-3 sm:mt-4">
          {visibleAllEvents.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4"
            >
              {visibleAllEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isPreviewed={previewEventId === event.id}
                  isApplied={previewEventId === event.id}
                  isDark={isDark}
                  isGold={isGold}
                  isSkipped={skippedEventIds.has(event.id)}
                  onApply={() => handleApplyTheme(event)}
                  onSkip={() => handleSkipEvent(event.id)}
                  onUnskip={() => handleUnskipEvent(event.id)}
                />
              ))}
            </motion.div>
          ) : (
            <EmptyState
              isDark={isDark}
              title="No matching events"
              description="No events found for your current country and religion settings."
            />
          )}
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-3 sm:mt-4">
          <EventCalendar
            events={allFilteredEvents}
            skippedEventIds={skippedEventIds}
            isDark={isDark}
            isGold={isGold}
            onEventClick={handleCalendarEventClick}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

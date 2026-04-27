"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useValtrioxStore } from "@/store/brandflow-store";
import { applyEventTheme, type SeasonalEvent } from "@/lib/event-themes";
import { getEventsForRegion, getCountryName, getCountryFlag, type RegionEvent } from "@/lib/events-library";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PartyPopper,
  Calendar,
  Clock,
  Sparkles,
  Palette,
  Globe,
  Eye,
  EyeOff,
  Filter,
  Plus,
  Search,
  Trash2,
  Edit3,
  Zap,
  CalendarDays,
  X,
  Timer,
  ZapOff,
  MapPin,
  Heart,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// Constants & Helpers
// ============================================================================

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const TYPE_CONFIG: Record<string, { label: string; color: string; darkColor: string }> = {
  religious: { label: "Religious", color: "bg-amber-100 text-amber-700 border-amber-200", darkColor: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  national: { label: "National", color: "bg-sky-100 text-sky-700 border-sky-200", darkColor: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  cultural: { label: "Cultural", color: "bg-violet-100 text-violet-700 border-violet-200", darkColor: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  commercial: { label: "Commercial", color: "bg-rose-100 text-rose-700 border-rose-200", darkColor: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
};

function normalizeCountryCode(input: string): string {
  if (!input) return "";
  const aliases: Record<string, string> = {
    PK: "PK", pak: "PK", pakistan: "PK", PAK: "PK",
    IN: "IN", ind: "IN", india: "IN", IND: "IN",
    AE: "AE", are: "AE", uae: "AE", UAE: "AE",
    SA: "SA", saudi: "SA", SAU: "SA", KSA: "SA",
    US: "US", usa: "US", USA: "US", united_states: "US",
    GB: "GB", gbr: "GB", uk: "GB", UK: "GB", united_kingdom: "GB",
    BD: "BD", bgd: "BD", bangladesh: "BD", BGD: "BD",
    TR: "TR", tur: "TR", turkey: "TR", TUR: "TR",
  };
  return aliases[input.trim().toLowerCase()] || input.trim().toUpperCase();
}

function formatDateRange(date: string, dateEnd?: string): string {
  const [m1, d1] = date.split("-").map(Number);
  const startStr = `${MONTH_NAMES[m1 - 1]} ${d1}`;
  if (!dateEnd) return startStr;
  const [m2, d2] = dateEnd.split("-").map(Number);
  if (m1 === m2) return `${startStr} - ${d2}`;
  return `${startStr} - ${MONTH_NAMES[m2 - 1]} ${d2}`;
}

function getDaysUntilEvent(dateStr: string): number {
  if (dateStr === "dynamic") return -1;
  const now = new Date();
  const year = now.getFullYear();
  const [m, d] = dateStr.split("-").map(Number);
  const eventDate = new Date(year, m - 1, d);
  if (eventDate < now) {
    eventDate.setFullYear(year + 1);
  }
  const diff = eventDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getCountdownLabel(days: number): string {
  if (days < 0) return "Date varies";
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow";
  return `${days} days away`;
}

function getRegionEventCountdown(event: RegionEvent): string {
  if (event.date === "dynamic" && event.month) {
    return `~${MONTH_NAMES[event.month - 1]} (lunar)`;
  }
  return getCountdownLabel(getDaysUntilEvent(event.date));
}

function getActiveStatus(event: RegionEvent): "active" | "upcoming" | "past" {
  if (event.date === "dynamic") return "upcoming";
  const days = getDaysUntilEvent(event.date);
  if (days <= event.autoDetectDaysBefore && days >= 0) return "active";
  if (days > 0) return "upcoming";
  return "past";
}

// ============================================================================
// Active Event Card (Tab 1)
// ============================================================================

function ActiveEventCard({
  event,
  isActive,
  isDark,
  onForceActivate,
  onDeactivate,
  onPreview,
}: {
  event: RegionEvent;
  isActive: boolean;
  isDark: boolean;
  onForceActivate: () => void;
  onDeactivate: () => void;
  onPreview: () => void;
}) {
  const status = isActive ? "active" : getActiveStatus(event);
  const countdown = getRegionEventCountdown(event);
  const typeConfig = TYPE_CONFIG[event.category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`overflow-hidden transition-all duration-200 ${
          isDark
            ? "bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]"
            : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg"
        }`}
      >
        <div className="h-20 sm:h-24 relative overflow-hidden" style={{ background: event.theme.gradient }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
            <Badge className={`text-[10px] border ${isDark ? typeConfig.darkColor : typeConfig.color}`}>
              {typeConfig.label}
            </Badge>
          </div>
          {status === "active" && (
            <Badge className="absolute top-2 right-2 bg-emerald-500/90 text-white border-0 text-[10px] backdrop-blur-sm">
              <Zap className="h-2.5 w-2.5 mr-1" />
              Active
            </Badge>
          )}
          {status === "upcoming" && (
            <Badge className="absolute top-2 right-2 bg-amber-500/90 text-white border-0 text-[10px] backdrop-blur-sm">
              <Clock className="h-2.5 w-2.5 mr-1" />
              Upcoming
            </Badge>
          )}
          <div className="absolute bottom-2 right-3 text-3xl opacity-30">{event.emoji}</div>
        </div>
        <CardContent className="p-3 sm:p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className={`text-sm font-bold flex items-center gap-1.5 ${isDark ? "text-white" : "text-slate-900"}`}>
                <span>{event.emoji}</span>
                <span className="truncate">{event.name}</span>
              </h3>
              <p className={`text-xs mt-0.5 flex items-center gap-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                <Timer className="h-3 w-3" />
                {event.date === "dynamic" ? `~${MONTH_NAMES[(event.month || 1) - 1]} (lunar)` : formatDateRange(event.date)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className={`h-3 w-3 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
            <span className={status === "active" ? "text-emerald-500 font-medium" : isDark ? "text-slate-400" : "text-slate-500"}>
              {countdown}
            </span>
          </div>
          {event.promotionalMessage && (
            <p className={`text-[10px] sm:text-xs px-2 py-1 rounded ${isDark ? "bg-white/[0.04] text-amber-300" : "bg-amber-50 text-amber-700"}`}>
              {event.promotionalMessage}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant={status === "active" ? "outline" : "default"}
              className={`flex-1 h-7 text-[11px] ${
                status === "active"
                  ? isDark
                    ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }`}
              onClick={onForceActivate}
            >
              {status === "active" ? (
                <><Zap className="h-3 w-3 mr-1" /> Active</>
              ) : (
                <><ZapOff className="h-3 w-3 mr-1" /> Activate</>
              )}
            </Button>
            {status === "active" && (
              <Button
                size="sm"
                variant="ghost"
                className={`h-7 text-[11px] px-2 ${isDark ? "text-red-400 hover:bg-red-500/10" : "text-red-500 hover:bg-red-50"}`}
                onClick={onDeactivate}
              >
                <EyeOff className="h-3 w-3 mr-1" />
                Deactivate
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className={`h-7 text-[11px] px-2 ${isDark ? "text-slate-400 hover:text-white hover:bg-white/[0.06]" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
              onClick={onPreview}
            >
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// All Events Card (Tab 2)
// ============================================================================

function AllEventCard({
  event,
  isDark,
  onPreview,
}: {
  event: RegionEvent;
  isDark: boolean;
  onPreview: () => void;
}) {
  const status = getActiveStatus(event);
  const countdown = getRegionEventCountdown(event);
  const typeConfig = TYPE_CONFIG[event.category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
    >
      <div
        className={`rounded-xl border p-3 sm:p-4 transition-all cursor-pointer ${
          isDark
            ? "bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]"
            : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"
        }`}
        onClick={onPreview}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-xl sm:text-2xl shrink-0"
            style={{ background: event.theme.gradient }}
          >
            {event.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                  {event.name}
                </h4>
                <p className={`text-xs mt-0.5 flex items-center gap-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  <Calendar className="h-3 w-3" />
                  {event.date === "dynamic" ? `~${MONTH_NAMES[(event.month || 1) - 1]} (lunar)` : formatDateRange(event.date)}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] border shrink-0 ${
                  status === "active"
                    ? "border-emerald-500/50 text-emerald-500"
                    : status === "upcoming"
                      ? isDark ? "text-amber-400 border-amber-500/30" : "text-amber-600 border-amber-200"
                      : isDark ? "text-slate-600 border-white/[0.08]" : "text-slate-400 border-slate-200"
                }`}
              >
                {status === "active" ? "Active" : status === "upcoming" ? `${countdown}` : "Past"}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Badge variant="outline" className={`text-[10px] border ${isDark ? typeConfig.darkColor : typeConfig.color}`}>
                {typeConfig.label}
              </Badge>
            </div>
            <div className="flex gap-1.5 mt-2">
              <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: event.theme.primary, backgroundColor: event.theme.primary }} title="Primary" />
              <div className="w-5 h-5 rounded-full border-2 border-slate-300" style={{ backgroundColor: event.theme.secondary }} title="Secondary" />
              <div className="w-5 h-5 rounded-full border border-slate-300" style={{ background: event.theme.gradient }} title="Gradient" />
            </div>
            {event.promotionalMessage && (
              <p className={`text-[10px] mt-2 ${isDark ? "text-slate-500" : "text-slate-400"}`} style={{ color: event.theme.primary }}>
                {event.promotionalMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Event Preview Card (Tab 4)
// ============================================================================

function EventPreviewCard({ event, isDark }: { event: RegionEvent; isDark: boolean }) {
  return (
    <div className="space-y-4">
      {/* Mockup Storefront Card */}
      <Card className={`overflow-hidden ${isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200"}`}>
        <div className="h-32 sm:h-40 relative overflow-hidden" style={{ background: event.theme.gradient }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className="text-4xl sm:text-5xl block mb-1">{event.emoji}</span>
              <span className="text-sm sm:text-base font-bold text-white drop-shadow-lg">{event.name}</span>
            </div>
          </div>
          <div className="absolute inset-0" style={{ backgroundColor: event.theme.bgPattern }} />
        </div>
        <CardContent className="p-4 sm:p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: event.theme.primary }} />
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: event.theme.secondary }} />
            </div>
            <Badge className="text-xs" style={{ backgroundColor: event.theme.primary, color: "#fff" }}>
              Live Preview
            </Badge>
          </div>
          <div className={`rounded-lg p-3 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
            <p className={`text-xs font-medium mb-1 ${isDark ? "text-white" : "text-slate-700"}`}>Promotional Banner</p>
            <div className="rounded-md p-2 text-center" style={{ background: event.theme.gradient }}>
              <p className="text-xs font-semibold text-white drop-shadow">{event.emoji} {event.name}</p>
              <p className="text-[10px] text-white/80 mt-0.5">{event.promotionalMessage || "Special event promotion!"}</p>
            </div>
          </div>
          <div className={`rounded-lg p-3 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
            <p className={`text-xs font-medium mb-2 ${isDark ? "text-white" : "text-slate-700"}`}>Product Card Preview</p>
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-lg shrink-0" style={{ backgroundColor: event.theme.bgPattern }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 rounded-full w-3/4" style={{ backgroundColor: event.theme.primary }} />
                <div className="h-2 rounded-full w-1/2" style={{ backgroundColor: event.theme.secondary + "60" }} />
                <div className="h-2 rounded-full w-2/3" style={{ backgroundColor: event.theme.primary + "30" }} />
              </div>
            </div>
          </div>
          <div className={`rounded-lg p-3 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
            <p className={`text-xs font-medium mb-2 ${isDark ? "text-white" : "text-slate-700"}`}>CTA Button</p>
            <div className="flex gap-2">
              <div className="px-4 py-2 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: event.theme.primary }}>
                Shop Now
              </div>
              <div className="px-4 py-2 rounded-lg border-2 text-xs font-semibold" style={{ borderColor: event.theme.primary, color: event.theme.primary }}>
                Learn More
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Details */}
      <Card className={`p-4 ${isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200"}`}>
        <h4 className={`text-sm font-semibold mb-3 ${isDark ? "text-white" : "text-slate-900"}`}>
          Theme Details
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={`rounded-lg p-2 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
            <p className={isDark ? "text-slate-500" : "text-slate-400"}>Primary</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: event.theme.primary }} />
              <code className={`text-[10px] ${isDark ? "text-slate-300" : "text-slate-600"}`}>{event.theme.primary}</code>
            </div>
          </div>
          <div className={`rounded-lg p-2 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
            <p className={isDark ? "text-slate-500" : "text-slate-400"}>Secondary</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: event.theme.secondary }} />
              <code className={`text-[10px] ${isDark ? "text-slate-300" : "text-slate-600"}`}>{event.theme.secondary}</code>
            </div>
          </div>
          <div className={`rounded-lg p-2 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
            <p className={isDark ? "text-slate-500" : "text-slate-400"}>Gradient</p>
            <div className="mt-1 h-4 rounded-full" style={{ background: event.theme.gradient }} />
          </div>
          <div className={`rounded-lg p-2 ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
            <p className={isDark ? "text-slate-500" : "text-slate-400"}>Category</p>
            <p className={`mt-1 font-medium ${isDark ? "text-white" : "text-slate-700"}`}>
              {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// Custom Event Form Dialog
// ============================================================================

function CustomEventDialog({
  open,
  onClose,
  editEvent,
  onSubmit,
  isDark,
}: {
  open: boolean;
  onClose: () => void;
  editEvent?: RegionEvent | null;
  onSubmit: (data: Partial<RegionEvent>) => void;
  isDark: boolean;
}) {
  const [form, setForm] = useState({
    name: editEvent?.name || "",
    date: editEvent?.date || "",
    emoji: editEvent?.emoji || "🎉",
    description: editEvent?.description || "",
    category: editEvent?.category || "cultural" as RegionEvent["category"],
    primaryColor: editEvent?.theme?.primary || "#C9A227",
    secondaryColor: editEvent?.theme?.secondary || "#f59e0b",
    promotionalMessage: editEvent?.promotionalMessage || "",
  });

  const categories: Array<{ value: RegionEvent["category"]; label: string }> = [
    { value: "religious", label: "Religious" },
    { value: "cultural", label: "Cultural" },
    { value: "national", label: "National" },
    { value: "commercial", label: "Commercial" },
  ];

  /* eslint-disable react-hooks/set-state-in-effect -- form reset on dialog open is intentional */
  useEffect(() => {
    if (open) {
      setForm({
        name: editEvent?.name || "",
        date: editEvent?.date || "",
        emoji: editEvent?.emoji || "🎉",
        description: editEvent?.description || "",
        category: editEvent?.category || "cultural" as RegionEvent["category"],
        primaryColor: editEvent?.theme?.primary || "#C9A227",
        secondaryColor: editEvent?.theme?.secondary || "#f59e0b",
        promotionalMessage: editEvent?.promotionalMessage || "",
      });
    }
  }, [open, editEvent]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = () => {
    if (!form.name.trim() || !form.date.trim()) return;
    onSubmit({
      name: form.name,
      date: form.date,
      emoji: form.emoji,
      description: form.description,
      category: form.category,
      promotionalMessage: form.promotionalMessage,
      theme: {
        primary: form.primaryColor,
        secondary: form.secondaryColor,
        gradient: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})`,
        bgPattern: `${form.primaryColor}08`,
      },
    });
    onClose();
  };

  const inputClass = isDark
    ? "bg-white/[0.06] border-white/[0.1] text-white placeholder:text-slate-500 focus:border-amber-500/50"
    : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-amber-500";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={`max-w-md ${isDark ? "bg-slate-900 border-white/[0.06]" : "bg-white"} sm:max-w-[480px]`}>
        <DialogHeader>
          <DialogTitle className={`text-base font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
            {editEvent ? "Edit Custom Event" : "Create Custom Event"}
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-slate-500"}>
            Add brand-specific events like anniversaries, brand launches, or local holidays
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3">
              <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Event Name</Label>
              <Input className={`mt-1 ${inputClass}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Brand Anniversary" />
            </div>
            <div>
              <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Emoji</Label>
              <Input className={`mt-1 ${inputClass} text-center text-xl`} value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="🎉" maxLength={4} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Date (MM-DD)</Label>
              <Input className={`mt-1 ${inputClass}`} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} placeholder="06-15" />
            </div>
            <div>
              <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Category</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setForm({ ...form, category: cat.value })}
                    className={`px-2.5 py-1 rounded-md text-[11px] border transition-colors ${
                      form.category === cat.value
                        ? isDark
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                          : "bg-amber-50 border-amber-200 text-amber-700"
                        : isDark
                          ? "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:bg-white/[0.08]"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Description</Label>
            <Textarea className={`mt-1 ${inputClass} resize-none`} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." />
          </div>
          <div>
            <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Promotional Message</Label>
            <Input className={`mt-1 ${inputClass}`} value={form.promotionalMessage} onChange={(e) => setForm({ ...form, promotionalMessage: e.target.value })} placeholder="e.g., Special 25% off!" />
          </div>
          <div>
            <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Theme Colors</Label>
            <div className="mt-1 flex items-center gap-3">
              <div>
                <p className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Primary</p>
                <input type="color" className="w-8 h-8 rounded cursor-pointer border-0 p-0" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
              </div>
              <div>
                <p className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Secondary</p>
                <input type="color" className="w-8 h-8 rounded cursor-pointer border-0 p-0" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} />
              </div>
              <div
                className="flex-1 h-8 rounded-md"
                style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})` }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={onClose} className={isDark ? "text-slate-400 hover:text-white hover:bg-white/[0.06]" : ""}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
              {editEvent ? "Save Changes" : "Create Event"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState({ isDark, title, description }: { isDark: boolean; title: string; description: string; icon?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-10 sm:py-14"
    >
      <div className={`mx-auto mb-3 w-12 h-12 rounded-full flex items-center justify-center ${isDark ? "bg-white/[0.04]" : "bg-slate-100"}`}>
        {icon || <Globe className={`h-5 w-5 ${isDark ? "text-slate-600" : "text-slate-400"}`} />}
      </div>
      <h3 className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>{title}</h3>
      <p className={`text-xs mt-1 max-w-xs mx-auto ${isDark ? "text-slate-500" : "text-slate-400"}`}>{description}</p>
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
    organization,
  } = useValtrioxStore();

  const isDark = appTheme === "premium-dark" || appTheme === "dark";
  const isGold = appTheme === "premium-dark";
  const accentClass = isGold ? "text-amber-500" : "text-amber-500";

  // State
  const [regionEvents, setRegionEvents] = useState<RegionEvent[]>([]);
  const [customEvents, setCustomEvents] = useState<RegionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [previewEvent, setPreviewEvent] = useState<RegionEvent | null>(null);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<RegionEvent | null>(null);
  const [forceActivatedIds, setForceActivatedIds] = useState<Set<string>>(new Set());
  const [deactivatedIds, setDeactivatedIds] = useState<Set<string>>(new Set());

  // Country/religion from store or org
  const country = selectedCountry || organization?.country || "";
  const religion = selectedReligion || organization?.religion || "";

  // Fetch events
  /* eslint-disable react-hooks/set-state-in-effect -- data fetching pattern is standard */
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    if (!country && !religion) {
      // Use library directly on client
      const events = getEventsForRegion("", "");
      if (!signal.aborted) {
        setRegionEvents(events);
        setIsLoading(false);
      }
      return () => controller.abort();
    }

    setIsLoading(true);
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (religion) params.set("religion", religion);

    fetch(`/api/events/region?${params.toString()}`, { signal })
      .then((res) => res.json())
      .then((data) => {
        if (!signal.aborted) {
          setRegionEvents(data.regionEvents || data.events?.filter((e: RegionEvent) => !e.id.startsWith("custom-")) || []);
          setCustomEvents(data.customEvents || data.events?.filter((e: RegionEvent) => e.id.startsWith("custom-")) || []);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError" && !signal.aborted) {
          setRegionEvents(getEventsForRegion(country, religion));
        }
      })
      .finally(() => {
        if (!signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [country, religion]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Derived data
  const allEvents = useMemo(() => [...regionEvents, ...customEvents], [regionEvents, customEvents]);

  const activeEvents = useMemo(() => {
    return allEvents.filter((e) => {
      if (deactivatedIds.has(e.id)) return false;
      if (forceActivatedIds.has(e.id)) return true;
      return getActiveStatus(e) === "active" || getActiveStatus(e) === "upcoming";
    });
  }, [allEvents, forceActivatedIds, deactivatedIds]);

  const filteredAllEvents = useMemo(() => {
    let filtered = allEvents;
    if (categoryFilter !== "all") {
      filtered = filtered.filter((e) => e.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.category.includes(q)
      );
    }
    return filtered;
  }, [allEvents, categoryFilter, searchQuery]);

  // Handlers
  const handleForceActivate = useCallback((eventId: string) => {
    setForceActivatedIds((prev) => {
      const next = new Set(prev);
      next.add(eventId);
      if (deactivatedIds.has(eventId)) {
        setDeactivatedIds((prev) => {
          const n = new Set(prev);
          n.delete(eventId);
          return n;
        });
      }
      return next;
    });
    toast.success("Event activated!");
  }, [deactivatedIds]);

  const handleDeactivate = useCallback((eventId: string) => {
    setDeactivatedIds((prev) => {
      const next = new Set(prev);
      next.add(eventId);
      if (forceActivatedIds.has(eventId)) {
        setForceActivatedIds((prev) => {
          const n = new Set(prev);
          n.delete(eventId);
          return n;
        });
      }
      return next;
    });
    toast.info("Event deactivated");
  }, [forceActivatedIds]);

  const handlePreview = useCallback((event: RegionEvent) => {
    setPreviewEvent(event);
  }, []);

  const handleApplyPreview = useCallback(() => {
    if (!previewEvent) return;
    // Convert RegionEvent to SeasonalEvent format for applyEventTheme
    const seasonEvent: SeasonalEvent = {
      id: previewEvent.id,
      name: previewEvent.name,
      emoji: previewEvent.emoji,
      date: previewEvent.date === "dynamic" ? "03-15" : previewEvent.date,
      type: previewEvent.category === "commercial" ? "commercial" : previewEvent.category,
      religions: [religion || "all"],
      countries: [country || "all"],
      theme: {
        primary: previewEvent.theme.primary,
        secondary: previewEvent.theme.secondary,
        accent: previewEvent.theme.primary,
        gradient: previewEvent.theme.gradient,
        bgPattern: previewEvent.theme.bgPattern,
        textOnPrimary: "#ffffff",
        glow: previewEvent.theme.primary + "60",
      },
      description: previewEvent.description,
      offerTemplate: `{discount}% off — ${previewEvent.name}`,
      floatingIcons: [previewEvent.emoji],
    };
    const theme = applyEventTheme(seasonEvent);
    setActiveEventTheme(theme);
    setFloatingIconsEnabled(true);
    setEventThemingEnabled(true);
    toast.success(`${previewEvent.emoji} ${previewEvent.name} theme applied!`);
  }, [previewEvent, religion, country, setActiveEventTheme, setFloatingIconsEnabled, setEventThemingEnabled]);

  const handleClearTheme = useCallback(() => {
    setActiveEventTheme(null);
    setEventThemingEnabled(false);
    setFloatingIconsEnabled(false);
    setPreviewEvent(null);
    toast.info("Theme cleared");
  }, [setActiveEventTheme, setEventThemingEnabled, setFloatingIconsEnabled]);

  const handleCreateCustom = useCallback(
    (data: Partial<RegionEvent>) => {
      if (!country) {
        toast.error("Set country in Settings first");
        return;
      }
      fetch("/api/events/region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.event) {
            setCustomEvents((prev) => [...prev, data.event]);
            toast.success(`Created "${data.event.name}"`);
          }
        })
        .catch(() => toast.error("Failed to create event"));
    },
    [country],
  );

  const handleEditCustom = useCallback(
    (data: Partial<RegionEvent>) => {
      if (!editingEvent) return;
      setCustomEvents((prev) =>
        prev.map((e) => (e.id === editingEvent.id ? { ...e, ...data } : e)),
      );
      toast.success(`Updated "${editingEvent.name}"`);
      setEditingEvent(null);
    },
    [editingEvent],
  );

  const handleDeleteCustom = useCallback(
    (eventId: string) => {
      if (!country) return;
      fetch(`/api/events/region?id=${eventId}`, { method: "DELETE" })
        .then((res) => res.json())
        .then(() => {
          setCustomEvents((prev) => prev.filter((e) => e.id !== eventId));
          toast.success("Event deleted");
        })
        .catch(() => toast.error("Failed to delete event"));
    },
    [country],
  );

  const accentColor = isGold ? "text-amber-500" : "text-amber-500";

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className={`text-lg sm:text-2xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-slate-900"}`}>
            <PartyPopper className={`h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 ${accentColor}`} />
            <span className="truncate">Seasonal Events</span>
          </h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Region-based events for your brand
          </p>
          {/* Country + Religion Badge Bar */}
          {(country || religion) && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {country && (
                <Badge
                  variant="outline"
                  className={`text-[11px] gap-1.5 px-2.5 py-1 border ${
                    isDark
                      ? "border-white/[0.1] bg-white/[0.04] text-slate-300"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <MapPin className="h-3 w-3" />
                  {getCountryFlag(normalizeCountryCode(country))} {getCountryName(normalizeCountryCode(country))}
                </Badge>
              )}
              {religion && (
                <Badge
                  variant="outline"
                  className={`text-[11px] gap-1.5 px-2.5 py-1 border ${
                    isDark
                      ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  <Heart className="h-3 w-3" />
                  {religion.charAt(0).toUpperCase() + religion.slice(1)}
                </Badge>
              )}
              <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                {allEvents.length} event{allEvents.length !== 1 ? "s" : ""} available
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeEventTheme && (
            <Button variant="outline" size="sm" onClick={handleClearTheme} className={`text-xs h-7 ${isDark ? "border-white/[0.1] text-slate-300" : ""}`}>
              <EyeOff className="h-3.5 w-3.5 mr-1.5" />
              Clear Theme
            </Button>
          )}
          <Button size="sm" onClick={() => setCustomDialogOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Custom Event
          </Button>
        </div>
      </div>

      {/* Active Theme Banner */}
      <AnimatePresence>
        {activeEventTheme && !previewEvent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl p-2.5 sm:p-3 border"
            style={{
              background: activeEventTheme.gradient,
              borderColor: activeEventTheme.primary,
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-4 w-4 text-white shrink-0" />
                <p className="text-xs font-semibold text-white truncate">
                  {eventThemingEnabled ? "Event theme is live" : "Preview ready — click Enable in header"}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={handleClearTheme} className="h-7 text-xs text-white/80 hover:text-white hover:bg-white/10">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className={`${isDark ? "bg-white/[0.04] border-white/[0.06]" : ""} overflow-x-auto flex-nowrap w-full justify-start`}>
          <TabsTrigger value="active" className={`text-xs ${isDark ? "data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 data-[state=active]:border-amber-500/30" : ""}`}>
            <CalendarDays className="h-3.5 w-3.5 mr-1" />
            Active Events
          </TabsTrigger>
          <TabsTrigger value="all" className={`text-xs ${isDark ? "data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 data-[state=active]:border-amber-500/30" : ""}`}>
            <Filter className="h-3.5 w-3.5 mr-1" />
            All Events
          </TabsTrigger>
          <TabsTrigger value="custom" className={`text-xs ${isDark ? "data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 data-[state=active]:border-amber-500/30" : ""}`}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Custom Events
          </TabsTrigger>
          <TabsTrigger value="preview" className={`text-xs ${isDark ? "data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 data-[state=active]:border-amber-500/30" : ""}`}>
            <Eye className="h-3.5 w-3.5 mr-1" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Active Events */}
        <TabsContent value="active" className="mt-3 sm:mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`h-48 rounded-xl animate-pulse ${isDark ? "bg-white/[0.03]" : "bg-slate-100"}`} />
              ))}
            </div>
          ) : activeEvents.length === 0 ? (
            <EmptyState
              isDark={isDark}
              title="No active events"
              description={country ? "No events are currently active for your region. They will appear here automatically when the time comes." : "Set your country and religion in Settings to see region-specific events."}
              icon={<CalendarDays className="h-5 w-5" />}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {activeEvents.map((event) => (
                <ActiveEventCard
                  key={event.id}
                  event={event}
                  isActive={forceActivatedIds.has(event.id) || getActiveStatus(event) === "active"}
                  isDark={isDark}
                  onForceActivate={() => handleForceActivate(event.id)}
                  onDeactivate={() => handleDeactivate(event.id)}
                  onPreview={() => handlePreview(event)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: All Events */}
        <TabsContent value="all" className="mt-3 sm:mt-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3">
            <div className="relative flex-1">
              <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-8 h-8 text-xs ${isDark ? "bg-white/[0.06] border-white/[0.1] text-white placeholder:text-slate-500" : ""}`}
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-2.5 py-1.5 rounded-md text-[11px] border transition-colors ${
                  categoryFilter === "all"
                    ? isGold
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                    : isDark
                      ? "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:bg-white/[0.08]"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                All
              </button>
              {(["religious", "cultural", "national", "commercial"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] border transition-colors ${
                    categoryFilter === cat
                      ? isDark
                        ? `${TYPE_CONFIG[cat].darkColor}`
                        : `${TYPE_CONFIG[cat].color}`
                      : isDark
                        ? "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:bg-white/[0.08]"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {TYPE_CONFIG[cat].label}
                </button>
              ))}
            </div>
          </div>
          {filteredAllEvents.length === 0 ? (
            <EmptyState
              isDark={isDark}
              title="No matching events"
              description={searchQuery ? "Try a different search term." : "No events found for the selected filters."}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-h-[600px] overflow-y-auto">
              {filteredAllEvents.map((event) => (
                <AllEventCard key={event.id} event={event} isDark={isDark} onPreview={() => handlePreview(event)} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Custom Events */}
        <TabsContent value="custom" className="mt-3 sm:mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {customEvents.length} custom event{customEvents.length !== 1 ? "s" : ""}
            </p>
            <Button size="sm" onClick={() => { setEditingEvent(null); setCustomDialogOpen(true); }} className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Event
            </Button>
          </div>
          {customEvents.length === 0 ? (
            <EmptyState
              isDark={isDark}
              title="No custom events yet"
              description="Create your first custom event for brand anniversaries, local holidays, or promotional campaigns."
              icon={<Plus className="h-5 w-5" />}
            />
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {customEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      isDark
                        ? "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                      style={{ background: event.theme.gradient }}
                    >
                      {event.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                        {event.name}
                      </h4>
                      <p className={`text-[10px] flex items-center gap-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        <Calendar className="h-2.5 w-2.5" />
                        {event.date === "dynamic" ? "Lunar" : formatDateRange(event.date)} • {TYPE_CONFIG[event.category]?.label}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 w-7 p-0 ${isDark ? "text-slate-400 hover:text-white hover:bg-white/[0.06]" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
                        onClick={() => { setEditingEvent(event); setCustomDialogOpen(true); }}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 w-7 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10`}
                        onClick={() => handleDeleteCustom(event.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 4: Event Preview */}
        <TabsContent value="preview" className="mt-3 sm:mt-4">
          {previewEvent ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h3 className={`text-sm font-semibold mb-3 ${isDark ? "text-white" : "text-slate-900"}`}>
                  Event Details
                </h3>
                <Card className={`p-4 ${isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200"}`}>
                  <div className="flex items-start gap-3">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
                      style={{ background: previewEvent.theme.gradient }}
                    >
                      {previewEvent.emoji}
                    </div>
                    <div className="min-w-0">
                      <h4 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        {previewEvent.name}
                      </h4>
                      <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {previewEvent.description}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Badge variant="outline" className={`text-[10px] border ${isDark ? TYPE_CONFIG[previewEvent.category]?.darkColor : TYPE_CONFIG[previewEvent.category]?.color}`}>
                          {TYPE_CONFIG[previewEvent.category]?.label}
                        </Badge>
                        <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          {previewEvent.date === "dynamic" ? `Lunar (~${MONTH_NAMES[(previewEvent.month || 1) - 1]})` : formatDateRange(previewEvent.date)}
                        </span>
                      </div>
                      {previewEvent.promotionalMessage && (
                        <p className={`text-xs mt-2 font-medium px-2.5 py-1.5 rounded-md ${isDark ? "bg-white/[0.04] text-amber-300" : "bg-amber-50 text-amber-700"}`}>
                          {previewEvent.promotionalMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
              <EventPreviewCard event={previewEvent} isDark={isDark} />
            </div>
          ) : (
            <EmptyState
              isDark={isDark}
              title="Select an event to preview"
              description="Click the eye icon on any event card to see how the theme would look on your storefront."
              icon={<Eye className="h-5 w-5" />}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Apply CTA */}
      <AnimatePresence>
        {previewEvent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="rounded-xl p-3 border flex flex-col sm:flex-row sm:items-center gap-3"
            style={{
              background: previewEvent.theme.gradient,
              borderColor: previewEvent.theme.primary,
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl">{previewEvent.emoji}</span>
              <div className="min-w-0">
                <p className="font-semibold text-xs sm:text-sm text-white truncate">{previewEvent.name}</p>
                <p className="text-[10px] text-white/80">
                  {eventThemingEnabled ? "Theme is active on your storefront" : "Click below to apply this theme"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {eventThemingEnabled && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClearTheme}
                  className="h-7 text-[11px] text-white/80 hover:text-white hover:bg-white/10"
                >
                  <EyeOff className="h-3.5 w-3.5 mr-1" />
                  Hide
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleApplyPreview}
                className={`h-7 text-[11px font-semibold text-white ${
                  isGold ? "bg-amber-600 hover:bg-amber-700" : "bg-white/20 hover:bg-white/30"
                }`}
              >
                <Palette className="h-3.5 w-3.5 mr-1.5" />
                Apply Theme
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

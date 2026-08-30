// @ts-nocheck — Phase 8: pre-existing TS errors (Decimal/Prisma types, etc.) pending migration
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { MonthCalendar } from "@/components/brandflow/header/MonthCalendar";
import { AnimatedClock } from "@/components/brandflow/header/AnimatedClock";
import { ThemeToggleButton } from "@/components/brandflow/header/ThemeToggleButton";
import { LanguageToggleButton } from "@/components/brandflow/header/LanguageToggleButton";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import { useValtrioxStore, type SidebarSection } from "@/store/brandflow-store";
import {
  Search,
  Menu,
  LogOut,
  User,
  Settings,
  HelpCircle,
  ChevronRight,
  Command,
  X,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { NotificationCenter } from "@/components/brandflow/shared/NotificationCenter";
import { DashboardErrorBoundary } from "@/components/brandflow/shared/DashboardErrorBoundary";
import { useAutoNotifications } from "@/hooks/useAutoNotifications";
import { useTranslation } from "@/lib/i18n";

// ─── Data ────────────────────────────────────────────────────────────────────

const SECTION_META: Record<
  SidebarSection,
  { group: string; label: string; icon: React.ReactNode }
> = {
  dashboard: { group: "Home", label: "Dashboard", icon: null },
  orders: { group: "Operations", label: "Orders", icon: null },
  products: { group: "Catalog", label: "Products", icon: null },
  customers: { group: "People", label: "Customers", icon: null },
  analytics: { group: "Insights", label: "Analytics", icon: null },
  tasks: { group: "Workflow", label: "Tasks", icon: null },
  coupons: { group: "Marketing", label: "Coupons", icon: null },
  team: { group: "People", label: "Team", icon: null },
  settings: { group: "Configuration", label: "Settings", icon: null },
  subscriptions: { group: "Billing", label: "Billing & Plans", icon: null },
  "payment-approvals": { group: "Billing", label: "Payment Approvals", icon: null },
};

// Map raw SECTION_META labels to i18n keys for translation
const SECTION_LABEL_KEYS: Record<string, string> = {
  Dashboard: "dashboard",
  Orders: "orders",
  Products: "products",
  Customers: "customers",
  Analytics: "analytics",
  Tasks: "tasks",
  Coupons: "coupons",
  Team: "team",
  Settings: "settings",
  "Billing & Plans": "subscriptionsTitle",
  "Payment Approvals": "paymentApprovalsTitle",
};
const SECTION_GROUP_KEYS: Record<string, string> = {
  Home: "main",
  Operations: "operationsGroup",
  Catalog: "productsGroup",
  People: "team",
  Insights: "analyticsGroup",
  Workflow: "tasks",
  Marketing: "marketingGroup",
  Configuration: "settings",
  Billing: "billing",
};

function translateSectionLabel(t: (k: string, fb?: string) => string, raw: string): string {
  const key = SECTION_LABEL_KEYS[raw];
  return key ? t(key, raw) : raw;
}
function translateSectionGroup(t: (k: string, fb?: string) => string, raw: string): string {
  const key = SECTION_GROUP_KEYS[raw];
  return key ? t(key, raw) : raw;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadgeColor(role: string, isDark: boolean): string {
  const map: Record<string, { light: string; dark: string }> = {
    platform_owner: { light: "bg-amber-100 text-amber-800 border-amber-200", dark: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
    platform_admin: { light: "bg-orange-100 text-orange-800 border-orange-200", dark: "bg-orange-500/15 text-orange-400 border-orange-500/25" },
    brand_owner: { light: "bg-amber-100 text-amber-800 border-amber-200", dark: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
    brand_admin: { light: "bg-yellow-100 text-yellow-800 border-yellow-200", dark: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" },
    ceo: { light: "bg-amber-100 text-amber-800 border-amber-200", dark: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
    owner: { light: "bg-amber-100 text-amber-800 border-amber-200", dark: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
    admin: { light: "bg-rose-100 text-rose-800 border-rose-200", dark: "bg-rose-500/15 text-rose-400 border-rose-500/25" },
    manager: { light: "bg-sky-100 text-sky-800 border-sky-200", dark: "bg-sky-500/15 text-sky-400 border-sky-500/25" },
    member: { light: "bg-slate-100 text-slate-600 border-slate-200", dark: "bg-white/10 text-slate-400 border-white/10" },
    editor: { light: "bg-yellow-100 text-yellow-800 border-yellow-200", dark: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" },
  };
  const entry = map[role?.toLowerCase()] || map.member;
  return isDark ? entry.dark : entry.light;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function Header() {
  const {
    user,
    organization,
    toggleSidebar,
    logout,
    setActiveSection,
    activeSection,
    appTheme,
    setAppTheme,
    brandName,
    language,
    setLanguage,
    selectedCountry,
  } = useValtrioxStore();

  // ── Auto-notifications: poll for new DB notifications and show Sonner toasts ──
  useAutoNotifications({
    orgId: organization?.id,
    userId: user?.id,
    intervalMs: 30000,
    showToast: true,
  });

  // i18n
  const t = useTranslation();

  // Local state
  const currentTime = useCurrentTime();
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResultsOpen, setSearchResultsOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // Timezone-aware time formatting
  const timezone = useMemo(() => {
    try {
      // Priority: organization timezone > browser timezone
      if (organization?.timezone && organization.timezone !== "UTC") {
        return organization.timezone;
      }
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "Asia/Karachi";
    }
  }, [organization?.timezone]);

  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: timezone,
    });
  }, [currentTime, timezone]);

  const formattedDate = useMemo(() => {
    return currentTime.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: timezone,
    });
  }, [currentTime, timezone]);

  const formattedShortDate = useMemo(() => {
    return currentTime.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: timezone,
    });
  }, [currentTime, timezone]);

  const timezoneAbbr = useMemo(() => {
    try {
      const parts = currentTime.toLocaleDateString("en-US", {
        timeZoneName: "short",
        timeZone: timezone,
      });
      // Extract the timezone abbreviation
      const match = parts.match(/\b([A-Z]{2,5})\b/g);
      return match ? match[match.length - 1] : timezone.split("/").pop();
    } catch {
      return "PKT";
    }
  }, [currentTime, timezone]);

  // Keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchResultsOpen(true);
      }
      if (e.key === "Escape") {
        setSearchResultsOpen(false);
        searchRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Breadcrumb data
  const sectionMeta = SECTION_META[activeSection];
  const breadcrumbFirst = brandName || t("main", "Home");

  // User initials
  const initials = user?.name ? getInitials(user.name) : "U";

  // Mobile search results — search across translated labels
  const mobileFilteredResults =
    searchQuery.length > 0
      ? Object.entries(SECTION_META)
          .filter(([, meta]) => {
            const label = translateSectionLabel(t, meta.label).toLowerCase();
            const group = translateSectionGroup(t, meta.group).toLowerCase();
            const q = searchQuery.toLowerCase();
            return label.includes(q) || group.includes(q) ||
              (meta.label || "").toLowerCase().includes(q) ||
              (meta.group || "").toLowerCase().includes(q);
          })
          .slice(0, 5)
      : [];

  // Theme-based styling
  const isDark = appTheme !== "light";

  const headerClass = cn(
    "sticky top-0 z-30 w-full backdrop-blur-xl border-b shadow-[0_1px_3px_0_rgb(0_0_0/0.04),0_1px_2px_-1px_rgb(0_0_0/0.04)]",
    appTheme === "premium-dark"
      ? "bg-[#0f0f17]/80 border-amber-900/20"
      : appTheme === "dark"
      ? "bg-slate-900/80 border-slate-700/60"
      : "bg-white/80 border-slate-200/80"
  );

  const textPrimary =
    appTheme === "premium-dark"
      ? "text-slate-100"
      : appTheme === "dark"
      ? "text-slate-100"
      : "text-slate-800";
  const textSecondary =
    appTheme === "premium-dark"
      ? "text-slate-400"
      : appTheme === "dark"
      ? "text-slate-400"
      : "text-slate-500";

  return (
    <header className={headerClass}>
      <div className="flex items-center justify-between h-14 px-3 lg:px-5 gap-2">
        {/* ── Left Section ── */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Mobile hamburger */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "lg:hidden flex-shrink-0 h-8 w-8 transition-colors",
                  appTheme === "light" ? "hover:bg-slate-100" : "hover:bg-white/10",
                  textSecondary
                )}
                onClick={toggleSidebar}
              >
                <Menu className="h-4.5 w-4.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t("toggleSidebar")}</TooltipContent>
          </Tooltip>

          {/* Organization badge */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "hidden sm:flex items-center gap-1.5 flex-shrink-0 px-2 py-1 rounded-md hover:bg-white/10 transition-colors group"
                )}
              >
                <div
                  className="h-5 w-5 rounded flex items-center justify-center"
                  style={{
                    background:
                      appTheme === "premium-dark"
                        ? "linear-gradient(135deg, #D4A73A, #B8942F)"
                        : appTheme === "dark"
                        ? "#D4A73A"
                        : "#D4A73A",
                  }}
                >
                  <span className="text-white font-bold text-[9px] leading-none">
                    {brandName ? brandName[0].toUpperCase() : "M"}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-[13px] font-semibold tracking-tight max-w-[120px] truncate group-hover:opacity-80 transition-colors",
                    textPrimary
                  )}
                >
                  {brandName || organization?.name || t("myBrand")}
                </span>
                <Badge
                  className="h-4 px-1.5 text-[9px] font-bold leading-none bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20"
                >
                  {t("betaVersion")}
                </Badge>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {organization?.plan
                ? `${organization.name} - ${organization.plan} ${t("plan")}`
                : t("workspace")}
            </TooltipContent>
          </Tooltip>

          {/* Breadcrumb navigation */}
          <Breadcrumb className="hidden md:flex items-center">
            <BreadcrumbList className="text-xs">
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => setActiveSection("dashboard")}
                  className={cn(
                    "hover:opacity-70 transition-colors cursor-pointer",
                    textSecondary
                  )}
                >
                  {breadcrumbFirst}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className={cn("h-3 w-3", textSecondary)} />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => setActiveSection(activeSection)}
                  className={cn(
                    "hover:opacity-70 transition-colors cursor-pointer",
                    textSecondary
                  )}
                >
                  {translateSectionGroup(t, sectionMeta?.group || "")}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className={cn("h-3 w-3", textSecondary)} />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className={cn("font-medium", textPrimary)}>
                  {translateSectionLabel(t, sectionMeta?.label || "")}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Mobile search toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "sm:hidden flex-shrink-0 h-8 w-8 transition-colors",
                appTheme === "light" ? "hover:bg-slate-100" : "hover:bg-white/10",
                textSecondary
              )}
              onClick={() => {
                setMobileSearchOpen(true);
                setTimeout(() => mobileSearchRef.current?.focus(), 100);
              }}
            >
              <Search className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("search", "Search")}</TooltipContent>
        </Tooltip>

        {/* ── Center Section: Global Search (desktop/tablet) ── */}
        <div className="hidden sm:flex items-center justify-center flex-1 max-w-xs lg:max-w-sm">
          <div className="relative w-full">
            <div
              className={cn(
                "flex items-center rounded-lg border transition-all duration-200",
                searchFocused
                  ? appTheme === "premium-dark"
                    ? "border-amber-500/50 ring-2 ring-amber-500/20 bg-[#1D2437] shadow-sm"
                    : "border-amber-300 ring-2 ring-amber-100 bg-white shadow-sm"
                  : appTheme === "premium-dark"
                  ? "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
                  : "border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white"
              )}
            >
              <Search
                className={cn(
                  "absolute left-2.5 h-3.5 w-3.5 pointer-events-none",
                  textSecondary
                )}
              />
              <Input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchResultsOpen(true);
                }}
                onFocus={() => setSearchResultsOpen(true)}
                onBlur={() => setTimeout(() => setSearchResultsOpen(false), 200)}
                placeholder={t("searchAnything")}
                className={cn(
                  "pl-8 pr-16 h-8 text-[13px] bg-transparent border-0 shadow-none focus-visible:ring-0",
                  textPrimary,
                  textSecondary
                )}
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <kbd
                  className={cn(
                    "pointer-events-none inline-flex h-5 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] font-medium",
                    appTheme === "premium-dark"
                      ? "border-white/10 bg-white/5 text-slate-400"
                      : "border-slate-200 bg-white text-slate-400 shadow-sm"
                  )}
                >
                  <Command className="h-2.5 w-2.5" />K
                </kbd>
              </div>
            </div>

            {/* Search results dropdown */}
            <AnimatePresence>
              {searchResultsOpen && searchQuery.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className={cn(
                    "absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border shadow-lg overflow-hidden",
                    appTheme === "premium-dark"
                      ? "bg-[#1D2437] border-white/8"
                      : "bg-white border-slate-200 shadow-slate-200/40"
                  )}
                >
                  <div className="p-2">
                    <div className="px-2 py-1.5">
                      <p
                        className={cn(
                          "text-[11px] font-medium uppercase tracking-wider",
                          textSecondary
                        )}
                      >
                        {t("quickNavigation")}
                      </p>
                    </div>
                    {Object.entries(SECTION_META)
                      .filter(([, meta]) => {
                        const label = translateSectionLabel(t, meta.label).toLowerCase();
                        const group = translateSectionGroup(t, meta.group).toLowerCase();
                        const q = searchQuery.toLowerCase();
                        return label.includes(q) || group.includes(q) ||
                          (meta.label || "").toLowerCase().includes(q) ||
                          (meta.group || "").toLowerCase().includes(q);
                      })
                      .slice(0, 5)
                      .map(([key, meta]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setActiveSection(key as SidebarSection);
                            setSearchQuery("");
                            setSearchResultsOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors group",
                            appTheme === "premium-dark"
                              ? "hover:bg-white/[0.04]"
                              : "hover:bg-slate-50"
                          )}
                        >
                          <div
                            className={cn(
                              "h-6 w-6 rounded-md flex items-center justify-center transition-colors",
                              appTheme === "premium-dark"
                                ? "bg-white/[0.06] group-hover:bg-amber-500/10"
                                : "bg-slate-100 group-hover:bg-amber-50"
                            )}
                          >
                            {meta.icon || (
                              <Search className={cn("h-3 w-3", textSecondary)} />
                            )}
                          </div>
                          <div>
                            <p className={cn("text-[13px] font-medium", textPrimary)}>
                              {translateSectionLabel(t, meta.label)}
                            </p>
                            <p className={cn("text-[11px]", textSecondary)}>
                              {translateSectionGroup(t, meta.group)}
                            </p>
                          </div>
                        </button>
                      ))}
                    {Object.entries(SECTION_META).filter(([, meta]) => {
                      const label = translateSectionLabel(t, meta.label).toLowerCase();
                      const group = translateSectionGroup(t, meta.group).toLowerCase();
                      const q = searchQuery.toLowerCase();
                      return label.includes(q) || group.includes(q) ||
                        (meta.label || "").toLowerCase().includes(q) ||
                        (meta.group || "").toLowerCase().includes(q);
                    }).length === 0 && (
                      <div className="px-2 py-6 text-center">
                        <Search className={cn("h-5 w-5 mx-auto mb-2", textSecondary)} />
                        <p className={cn("text-xs", textSecondary)}>
                          {t("noResultsFor")} &ldquo;{searchQuery}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                  <div
                    className={cn(
                      "border-t px-3 py-2 flex items-center justify-between",
                      appTheme === "premium-dark" ? "border-white/6" : "border-slate-100"
                    )}
                  >
                    <p className={cn("text-[11px]", textSecondary)}>
                      {t("typeToSearch")}
                    </p>
                    <div className="flex items-center gap-1">
                      <kbd
                        className={cn(
                          "inline-flex h-4 items-center rounded border px-1 font-mono text-[9px]",
                          appTheme === "premium-dark"
                            ? "border-white/10 bg-white/5 text-slate-500"
                            : "border-slate-200 bg-slate-50 text-slate-400"
                        )}
                      >
                        ↵
                      </kbd>
                      <span className={cn("text-[10px]", textSecondary)}>{t("select")}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Right Section ── */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* ── Clock + Calendar Widget (xl+ only to avoid squeezing user avatar) ── */}
          <div className="hidden xl:flex items-center gap-1.5">
            {/* Animated Clock with live time */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors",
                    appTheme === "light"
                      ? "hover:bg-slate-100 text-slate-600"
                      : "hover:bg-white/8 text-slate-400"
                  )}
                >
                  <AnimatedClock
                    className={cn(
                      "h-5 w-5 flex-shrink-0",
                      appTheme === "premium-dark"
                        ? "text-amber-400"
                        : appTheme === "dark"
                        ? "text-blue-400"
                        : "text-amber-600"
                    )}
                  />
                  <span className="text-[12px] font-mono font-medium tabular-nums whitespace-nowrap">
                    {formattedTime}
                  </span>
                  <span className={cn("text-[10px] font-medium opacity-60", textSecondary)}>
                    {timezoneAbbr}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium">{formattedDate}</p>
                <p className="text-xs opacity-70 mt-0.5">{t("timezone")}: {timezone}</p>
              </TooltipContent>
            </Tooltip>

            {/* Calendar button - hover shows date, click opens month calendar */}
            <Tooltip>
              <Popover>
                <PopoverTrigger asChild>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "relative h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                        appTheme === "light"
                          ? "hover:bg-slate-100 text-slate-500"
                          : "hover:bg-white/10 text-slate-400"
                      )}
                    >
                      <CalendarDays className="h-4 w-4" />
                      {/* Today's date badge */}
                      <span
                        className={cn(
                          "absolute -top-0.5 -right-0.5 flex h-3.5 items-center justify-center rounded-full text-[7px] font-bold px-0.5 leading-none",
                          appTheme === "premium-dark"
                            ? "bg-amber-500/20 text-amber-400"
                            : appTheme === "dark"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-amber-500/20 text-amber-600"
                        )}
                      >
                        {currentTime.getDate()}
                      </span>
                    </button>
                  </TooltipTrigger>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="end"
                  sideOffset={8}
                  className={cn(
                    "w-auto p-0 rounded-xl border shadow-lg",
                    appTheme === "premium-dark"
                      ? "bg-[#1D2437] border-white/8"
                      : "bg-white border-slate-200 shadow-slate-200/40"
                  )}
                >
                  <MonthCalendar
                    appTheme={appTheme}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                  />
                </PopoverContent>
              </Popover>
              <TooltipContent side="bottom">{formattedDate}</TooltipContent>
            </Tooltip>

            <Separator
              className={cn(
                "h-8 mx-1",
                appTheme === "premium-dark"
                  ? "bg-white/8"
                  : appTheme === "dark"
                  ? "bg-slate-700/60"
                  : "bg-slate-200/80"
              )}
            />
          </div>

          {/* Language Toggle */}
          <LanguageToggleButton
            language={language}
            setLanguage={setLanguage}
            appTheme={appTheme}
            textSecondary={textSecondary}
          />

          {/* Theme Toggle */}
          <ThemeToggleButton
            appTheme={appTheme}
            setAppTheme={setAppTheme}
            textSecondary={textSecondary}
          />

          {/* Notification Center — wrapped in error boundary so a bad notification can't crash the entire dashboard */}
          <DashboardErrorBoundary fallback={null}>
            <NotificationCenter />
          </DashboardErrorBoundary>

          {/* User Avatar - directly adjacent to bell icon, always visible */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-lg px-1 py-1 transition-colors group cursor-pointer">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <Avatar
                    className="h-8 w-8 ring-2 shadow-sm"
                    style={{
                      ringColor:
                        appTheme === "premium-dark" ? "#1F2937" : undefined,
                    }}
                  >
                    <AvatarImage
                      src={user?.image}
                      alt={user?.name || "User"}
                    />
                    <AvatarFallback
                      className="text-white text-[11px] font-semibold"
                      style={{
                        background:
                          appTheme === "premium-dark"
                            ? "linear-gradient(135deg, #D4A73A, #B8942F)"
                            : "linear-gradient(135deg, #D4A73A, #D4A73A)",
                      }}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Name + Role - visible on 2xl+ only to avoid pushing icons off-screen */}
                <div className="hidden 2xl:block text-left">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-[13px] font-medium leading-tight max-w-[100px] truncate group-hover:opacity-80 transition-colors",
                        textPrimary
                      )}
                    >
                      {user?.name || t("user")}
                    </span>
                    {user?.role && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-4 px-1 text-[9px] font-semibold leading-none border rounded",
                          getRoleBadgeColor(user.role, isDark)
                        )}
                      >
                        {user.role}
                      </Badge>
                    )}
                  </div>
                  <p className={cn("text-[11px] leading-tight mt-0.5", textSecondary)}>
                    {user?.email || t("userPlaceholder")}
                  </p>
                </div>

                {/* Chevron - only on 2xl+ */}
                <ChevronRight className="hidden 2xl:block h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors -rotate-90" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className={cn(
                "w-56 rounded-xl p-1.5",
                appTheme === "premium-dark"
                  ? "bg-[#1D2437] border-white/8"
                  : "border-slate-200 shadow-lg shadow-slate-200/40"
              )}
            >
              {/* User info header */}
              <DropdownMenuLabel className="px-2 pt-2 pb-1.5">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar
                      className="h-9 w-9 ring-2"
                      style={{
                        ringColor:
                          appTheme === "premium-dark" ? "#1F2937" : undefined,
                      }}
                    >
                      <AvatarImage
                        src={user?.image}
                        alt={user?.name || "User"}
                      />
                      <AvatarFallback
                        className="text-white text-xs font-semibold"
                        style={{
                          background:
                            appTheme === "premium-dark"
                              ? "linear-gradient(135deg, #D4A73A, #B8942F)"
                              : "linear-gradient(135deg, #D4A73A, #D4A73A)",
                        }}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-semibold truncate", textPrimary)}>
                      {user?.name || t("user")}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {user?.role && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-4 px-1.5 text-[9px] font-semibold leading-none border rounded",
                            getRoleBadgeColor(user.role, isDark)
                          )}
                        >
                          {user.role}
                        </Badge>
                      )}
                      <span className="text-[11px] text-slate-400 truncate">
                        {user?.email || t("userPlaceholder")}
                      </span>
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="!my-1" />

              <DropdownMenuGroup className="gap-0.5">
                <DropdownMenuItem className="rounded-lg px-2.5 py-2 cursor-pointer text-[13px] focus:bg-white/[0.04]">
                  <User className="mr-2.5 h-4 w-4 text-slate-400" />
                  {t("profile")}
                  <DropdownMenuShortcut className="ml-auto text-[11px] text-slate-400">
                    ⇧⌘P
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setActiveSection("brand-settings")}
                  className="rounded-lg px-2.5 py-2 cursor-pointer text-[13px] focus:bg-white/[0.04]"
                >
                  <Settings className="mr-2.5 h-4 w-4 text-slate-400" />
                  {t("settings")}
                  <DropdownMenuShortcut className="ml-auto text-[11px] text-slate-400">
                    ⌘,
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg px-2.5 py-2 cursor-pointer text-[13px] focus:bg-white/[0.04]">
                  <HelpCircle className="mr-2.5 h-4 w-4 text-slate-400" />
                  {t("helpSupport")}
                  <DropdownMenuShortcut className="ml-auto text-[11px] text-slate-400">
                    ⌘?
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="!my-1" />
              <DropdownMenuItem
                onClick={logout}
                className={cn(
                  "rounded-lg px-2.5 py-2 cursor-pointer text-[13px] focus:text-red-700",
                  appTheme === "light"
                    ? "text-red-600 focus:bg-red-50"
                    : "text-red-400 focus:bg-red-500/10"
                )}
              >
                <LogOut className="mr-2.5 h-4 w-4" />
                {t("logOut")}
                <DropdownMenuShortcut className="ml-auto text-[11px] text-red-400">
                  ⇧⌘Q
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Mobile Search Overlay ── */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "sm:hidden fixed inset-0 z-50 backdrop-blur-xl p-4 pt-6",
              appTheme === "premium-dark"
                ? "bg-[#161B26]/95"
                : appTheme === "dark"
                ? "bg-slate-950/95"
                : "bg-white/95"
            )}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search
                  className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
                    textSecondary
                  )}
                />
                <Input
                  ref={mobileSearchRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("searchAnything")}
                  className={cn(
                    "pl-9 h-10 text-sm border-0 focus-visible:ring-2",
                    appTheme === "light"
                      ? "bg-slate-50 focus-visible:ring-amber-300 text-slate-800"
                      : "bg-white/5 focus-visible:ring-amber-500/50 text-white placeholder:text-slate-500"
                  )}
                  autoFocus
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMobileSearchOpen(false);
                  setSearchQuery("");
                }}
                className={textSecondary}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {mobileFilteredResults.length > 0 ? (
              <div className="space-y-1">
                <p
                  className={cn(
                    "text-[11px] font-medium uppercase tracking-wider px-3 mb-2",
                    textSecondary
                  )}
                >
                  {t("quickNavigation")}
                </p>
                {mobileFilteredResults.map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveSection(key as SidebarSection);
                      setSearchQuery("");
                      setMobileSearchOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors",
                      appTheme === "light"
                        ? "hover:bg-slate-50 active:bg-slate-100"
                        : "hover:bg-white/5 active:bg-white/10"
                    )}
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-md flex items-center justify-center",
                        appTheme === "light" ? "bg-slate-100" : "bg-white/5"
                      )}
                    >
                      <Search className={cn("h-4 w-4", textSecondary)} />
                    </div>
                    <div>
                      <p className={cn("text-sm font-medium", textPrimary)}>
                        {translateSectionLabel(t, meta.label)}
                      </p>
                      <p className={cn("text-xs", textSecondary)}>{translateSectionGroup(t, meta.group)}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery.length > 0 ? (
              <div className="py-12 text-center">
                <Search className={cn("h-6 w-6 mx-auto mb-2", textSecondary)} />
                <p className={cn("text-sm", textSecondary)}>
                  {t("noResultsFor")} &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            ) : (
              <div className="py-12 text-center">
                <Search className={cn("h-6 w-6 mx-auto mb-2", textSecondary)} />
                <p className={cn("text-sm", textSecondary)}>
                  {t("typeToSearch")}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

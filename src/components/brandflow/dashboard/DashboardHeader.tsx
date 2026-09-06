"use client";

import { useMemo } from "react";
import { Search, Bell, Menu, Clock, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useValtrioxStore } from "@/store/brandflow-store";
import { getRoleByName } from "@/lib/roles";

interface DashboardHeaderProps {
  onToggleSidebar: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

function formatLastUpdated(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function DashboardHeader({ onToggleSidebar }: DashboardHeaderProps) {
  const { user, appTheme } = useValtrioxStore();
  const isDark = appTheme === "dark" || appTheme === "premium-dark";
  const isGold = appTheme === "premium-dark";

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const greeting = useMemo(() => getGreeting(), []);
  const lastUpdated = useMemo(() => formatLastUpdated(), []);

  return (
    <header
      className={`h-16 border-b flex items-center justify-between px-4 lg:px-6 flex-shrink-0 transition-all duration-300 ${
        isGold
          ? "bg-gradient-to-r from-black via-black to-black/95 border-amber-500/10"
          : isDark
          ? "bg-slate-900/80 border-slate-700/50 backdrop-blur-sm"
          : "bg-gradient-to-r from-white via-white to-slate-50/80 border-slate-200"
      }`}
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className={isDark ? "lg:hidden text-slate-400 hover:text-white" : "lg:hidden text-slate-600"}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Greeting area */}
        <div className="hidden sm:block">
          <div className="flex items-center gap-2">
            {isGold && <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />}
            <h1 className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
              {greeting}, {user?.name?.split(" ")[0] || "User"}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock className={`w-3 h-3 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
            <span className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Updated {lastUpdated}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative hidden md:block ml-2">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
          <Input
            placeholder="Search orders, products, customers..."
            className={`pl-10 w-64 lg:w-80 h-10 transition-all duration-200 focus:ring-2 focus:ring-amber-500/30 ${
              isGold
                ? "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-500 focus:bg-white/[0.06] focus:border-amber-500/30"
                : isDark
                ? "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:bg-slate-800 focus:border-amber-500/30"
                : "bg-slate-50 border-slate-200 focus:bg-white"
            }`}
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notification bell with subtle pulse */}
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${
            isGold
              ? "text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/10"
              : isDark
              ? "text-slate-400 hover:text-white hover:bg-slate-800"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Bell className="w-5 h-5" />
        </Button>

        <div className={`h-8 w-px ${isGold ? "bg-white/[0.06]" : isDark ? "bg-slate-700/50" : "bg-slate-200"}`} />

        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 ring-2 ring-offset-1 ring-offset-background transition-all duration-200 hover:ring-amber-500/40">
            <AvatarFallback
              className={`text-xs font-semibold ${
                isGold
                  ? "bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-400"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{user?.name || "User"}</p>
            <p className={`text-xs ${isGold ? "text-amber-500/60" : "text-slate-500"}`}>{user?.role ? getRoleByName(user.role)?.label || user.role : ""}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

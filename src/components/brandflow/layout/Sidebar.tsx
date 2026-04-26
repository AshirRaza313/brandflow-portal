"use client";

import { useValtrioxStore, SIDEBAR_GROUP_ORDER, SIDEBAR_STRUCTURE, SidebarSection, SidebarGroup } from "@/store/brandflow-store";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, useCallback, useMemo, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePlatformIdentity } from "@/lib/platform-identity";
import {
  Home, LayoutDashboard, ShoppingCart, Package, Users,
  PlusCircle, FolderTree, Warehouse as WarehouseIcon, DollarSign, Layers,
  BarChart3, TrendingUp, PieChart, DollarSign as RevenueIcon, Globe,
  Megaphone, Search, Share2, Mail, Target, Award, PartyPopper, UserCircle, Gift,
  RotateCcw, Clock, Ticket, Box, Truck, Building2, Warehouse as WHIcon, Star,
  UserCog, Bot, Smartphone, BookOpen, Settings, Shield, Plug, FileText,
  ChevronDown, X, LogOut, Sparkles, ChevronsUpDown, ChevronLeft, ChevronRight,
  Lock, Crown, Eye, MessageCircle, Headphones, Zap,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { isSectionAccessible, isPlatformRole, isPlatformOwner, isReadOnlyRole, getRoleBadgeStyle } from "@/lib/roles";
import { isFeatureAvailableWithOverrides, getFeatureLock, getPlanDisplayName } from "@/lib/feature-lock";
import { useSubscriptionSync } from "@/hooks/useSubscriptionSync";

// ============================================================================
// Icon Map for Sidebar Items
// ============================================================================

const ICON_MAP: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="h-4 w-4" />,
  orders: <ShoppingCart className="h-4 w-4" />,
  products: <Package className="h-4 w-4" />,
  customers: <Users className="h-4 w-4" />,
  "add-product": <PlusCircle className="h-4 w-4" />,
  categories: <FolderTree className="h-4 w-4" />,
  inventory: <WarehouseIcon className="h-4 w-4" />,
  "pricing-rules": <DollarSign className="h-4 w-4" />,
  variants: <Layers className="h-4 w-4" />,
  "sales-analytics": <TrendingUp className="h-4 w-4" />,
  "product-analytics": <PieChart className="h-4 w-4" />,
  "customer-analytics": <UserCircle className="h-4 w-4" />,
  "revenue-analytics": <RevenueIcon className="h-4 w-4" />,
  "traffic-analytics": <Globe className="h-4 w-4" />,
  campaigns: <Megaphone className="h-4 w-4" />,
  "seo-manager": <Search className="h-4 w-4" />,
  "social-media": <Share2 className="h-4 w-4" />,
  "email-marketing": <Mail className="h-4 w-4" />,
  "ad-manager": <Target className="h-4 w-4" />,
  loyalty: <Award className="h-4 w-4" />,
  "seasonal-sales": <PartyPopper className="h-4 w-4" />,
  influencers: <UserCircle className="h-4 w-4" />,
  affiliates: <Gift className="h-4 w-4" />,
  returns: <RotateCcw className="h-4 w-4" />,
  "sla-engine": <Clock className="h-4 w-4" />,
  "support-tickets": <Ticket className="h-4 w-4" />,
  packaging: <Box className="h-4 w-4" />,
  shipping: <Truck className="h-4 w-4" />,
  suppliers: <Building2 className="h-4 w-4" />,
  warehouse: <WHIcon className="h-4 w-4" />,
  "product-reviews": <Star className="h-4 w-4" />,
  "team-management": <UserCog className="h-4 w-4" />,
  "team-chat": <MessageCircle className="h-4 w-4" />,
  "support-chat": <Headphones className="h-4 w-4" />,
  integrations: <Plug className="h-4 w-4" />,
  "wa-business": <Smartphone className="h-4 w-4" />,
  "ai-tools": <Bot className="h-4 w-4" />,
  "user-guide": <BookOpen className="h-4 w-4" />,
  "brand-settings": <Settings className="h-4 w-4" />,
  "user-management": <Shield className="h-4 w-4" />,
  "admin-dashboard": <Shield className="h-4 w-4" />,
  "client-management": <Building2 className="h-4 w-4" />,
  "invoice-management": <FileText className="h-4 w-4" />,
  "audit-log": <FileText className="h-4 w-4" />,
  "integration-management": <Plug className="h-4 w-4" />,
};

// All badges set to 0
const BADGE_MAP: Record<string, number> = {};

// ============================================================================
// Main Sidebar Component
// ============================================================================

export function Sidebar() {
  const {
    activeSection, setActiveSection, sidebarOpen, setSidebarOpen,
    user, logout, brandLogo, brandName, appTheme, sidebarCollapsed, toggleSidebarCollapsed,
    brandTagline, brandConfigured, organization,
  } = useValtrioxStore();
  const [expandedGroups, setExpandedGroups] = useState<Set<SidebarGroup>>(() => new Set(["main", "guide"]));
  const [adminLockedFeatures, setAdminLockedFeatures] = useState<Set<string>>(new Set());
  const t = useTranslation();
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;
  const allExpanded = expandedGroups.size === SIDEBAR_GROUP_ORDER.length;

  // ── Real-time subscription sync (shared hook, polls every 60s) ──
  const { subscriptionPlan } = useSubscriptionSync();

  // Fetch admin feature toggles (refetch when plan changes)
  useEffect(() => {
    const fetchToggles = async () => {
      try {
        const res = await fetch("/api/admin/feature-toggles");
        if (res.ok) {
          const data = await res.json();
          const locked = new Set<string>([
            ...(data.lockedGrowth || []),
            ...(data.lockedEnterprise || []),
          ]);
          setAdminLockedFeatures(locked);
        }
      } catch {}
    };
    fetchToggles();
  }, [subscriptionPlan]);

  const displayName = brandName || "My Brand";
  const displayInitial = brandName ? brandName[0].toUpperCase() : "M";

  const userInitials = user?.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : displayInitial;

  // Current user's role for RBAC
  const userRole = user?.role || "brand_owner";
  const isReadOnly = isReadOnlyRole(userRole);
  const isPlatformUser = isPlatformRole(userRole);

  const toggleGroup = useCallback((g: SidebarGroup) => {
    setExpandedGroups((prev) => {
      const n = new Set(prev);
      if (n.has(g)) n.delete(g); else n.add(g);
      return n;
    });
  }, []);
  const expandAll = useCallback(() => setExpandedGroups(new Set(SIDEBAR_GROUP_ORDER)), []);
  const collapseAll = useCallback(() => setExpandedGroups(new Set()), []);
  const handleItemClick = useCallback((id: SidebarSection, group: SidebarGroup) => {
    // Check if section is accessible before navigating
    if (!isSectionAccessible(id, userRole)) {
      return;
    }
    setActiveSection(id);
    setExpandedGroups((prev) => { if (prev.has(group)) return prev; const n = new Set(prev); n.add(group); return n; });
  }, [setActiveSection, userRole]);

  const accentColor = appTheme === "premium-dark" ? "#d4a017" : "#D4AF37";
  const isCollapsed = sidebarCollapsed;

  // Pre-compute group visibility to avoid hiding groups with no visible items
  const visibleGroups = useMemo(() => {
    return SIDEBAR_GROUP_ORDER.filter((groupId) => {
      const groupDef = SIDEBAR_STRUCTURE[groupId];
      // Always show guide group
      if (groupId === "guide") return true;

      // For system group, filter items based on role
      if (groupId === "system") {
        return groupDef.items.some((item) => {
          // Admin-only items: only for platform roles
          if (["admin-dashboard", "client-management", "payment-approvals", "invoice-management", "audit-log", "platform-settings", "integration-management"].includes(item.id)) {
            return isPlatformOwner(userRole);
          }
          return isSectionAccessible(item.id, userRole);
        });
      }

      // Check if at least one item in the group is accessible
      return groupDef.items.some((item) => isSectionAccessible(item.id, userRole));
    });
  }, [userRole]);

  // Get user role display label
  const getUserRoleLabel = () => {
    const roleLabels: Record<string, string> = {
      platform_owner: "Platform Owner",
      platform_admin: "Platform Admin",
      brand_owner: "Brand Owner",
      brand_admin: "Brand Admin",
      operations_manager: "Ops Manager",
      sales_manager: "Sales Manager",
      marketing_manager: "Marketing Mgr",
      warehouse_manager: "Warehouse Mgr",
      support_agent: "Support Agent",
      content_creator: "Content Creator",
      accountant: "Accountant",
      team_lead: "Team Lead",
      sales_rep: "Sales Rep",
      inventory_clerk: "Inventory Clerk",
      viewer: "Viewer",
      owner: "Owner",
      admin: "Admin",
      manager: "Manager",
      member: "Member",
    };
    return roleLabels[userRole] || userRole;
  };

  // Get role badge style for the current user
  const userBadgeStyle = useMemo(() => getRoleBadgeStyle(userRole), [userRole]);

  return (
    <TooltipProvider delayDuration={0}>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed top-0 left-0 z-50 flex h-full flex-col transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        sidebarOpen ? "translate-x-0 w-[280px] max-w-[85vw]" : "-translate-x-full w-[280px] max-w-[85vw]",
        "lg:translate-x-0",
        isCollapsed ? "lg:w-[60px]" : "lg:w-[260px]",
      )} style={{ background: "linear-gradient(180deg, #020617 0%, #0f172a 40%, #1e293b 100%)" } as React.CSSProperties}>
        {/* Accent line */}
        <div className="h-[2px] w-full shrink-0" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, opacity: 0.8 }} />

        {/* Logo / Brand Identity */}
        <div className="relative px-4 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-br opacity-80 blur-[0.5px]"
                style={{ background: appTheme === "premium-dark"
                  ? "linear-gradient(135deg, #d4a017, #f5d060, #b8860b)"
                  : "linear-gradient(135deg, #D4AF37, #C9A227, #B8860B)" }} />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 shadow-lg overflow-hidden">
                {brandLogo ? <img src={brandLogo} alt="Logo" className="h-8 w-8 rounded-lg object-cover" /> : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: appTheme === "premium-dark"
                      ? "linear-gradient(135deg, #d4a017, #b8860b)"
                      : "linear-gradient(135deg, #D4AF37, #C9A227)" }}>
                    <span className="text-sm font-black text-white">{displayInitial}</span>
                  </div>
                )}
              </div>
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-bold tracking-tight text-white truncate">{displayName}</h1>
                {brandTagline ? (
                  <p className="truncate text-[11px] font-medium text-slate-500">{brandTagline}</p>
                ) : (
                  <p className="truncate text-[11px] font-medium text-slate-500">Operations Hub</p>
                )}
              </div>
            )}
            <button onClick={() => setSidebarOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors lg:hidden">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />

        {/* Collapse/Expand toggle (desktop) + Expand/Collapse All (not collapsed) */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-1">
            <button onClick={allExpanded ? collapseAll : expandAll}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500 hover:bg-white/[0.04] hover:text-slate-400">
              <ChevronsUpDown className="h-3 w-3" />
              <span>{allExpanded ? t("collapseAll") : t("expandAll")}</span>
            </button>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 min-h-0 px-2 py-1">
          <nav className="space-y-0.5 pb-4">
            {visibleGroups.map((groupId) => {
              const groupDef = SIDEBAR_STRUCTURE[groupId];
              const isExpanded = expandedGroups.has(groupId);
              const hasActive = groupDef.items.some((i) => i.id === activeSection);
              // Count accessible items in this group
              const accessibleItems = groupDef.items.filter((item) => isSectionAccessible(item.id, userRole));
              const allItemsAccessible = accessibleItems.length === groupDef.items.length;
              return (
                <div key={groupId} className="mb-0.5">
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="flex w-full items-center justify-center py-2 text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
                          onClick={() => handleItemClick(accessibleItems[0]?.id || groupDef.items[0].id, groupId)}
                        >
                          <span className="text-sm">{groupDef.emoji}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {t(groupDef.label.toLowerCase())} ({accessibleItems.length} {t("items")})
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={() => toggleGroup(groupId)} className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all hover:bg-white/[0.04]",
                          hasActive ? "text-amber-400" : "text-slate-500 hover:text-slate-300"
                        )}>
                          <span className="flex-shrink-0 text-sm">{groupDef.emoji}</span>
                          <span className="flex-1 text-[11px] font-semibold uppercase tracking-widest">{groupDef.label}</span>
                          <span className="mr-1 flex h-4 min-w-[18px] items-center justify-center rounded-full bg-white/[0.06] px-1 text-[9px] font-medium text-slate-400">{accessibleItems.length}</span>
                          <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
                            <ChevronDown className="h-3 w-3" />
                          </motion.span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">{t(groupDef.label.toLowerCase())} ({accessibleItems.length})</TooltipContent>
                    </Tooltip>
                  )}

                  <AnimatePresence initial={false}>
                    {isExpanded && !isCollapsed && (
                      <motion.div key={`c-${groupId}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                        <div className="mt-0.5 space-y-px pl-1.5 pr-1">
                          {groupDef.items.map((item) => {
                            const isActive = item.id === activeSection;
                            const isAccessible = isSectionAccessible(item.id, userRole);
                            const isSubLocked = isAccessible && !isPlatformOwner(userRole) && !isFeatureAvailableWithOverrides(item.id, subscriptionPlan, userRole, adminLockedFeatures);
                            const badge = BADGE_MAP[item.id];

                            if (!isAccessible) return null;
                            // Show locked features with plan badge instead of hiding
                            const featureLock = getFeatureLock(item.id);
                            const requiredPlan = featureLock?.minPlan || "growth";

                            return (
                              <Tooltip key={item.id}>
                                <TooltipTrigger asChild>
                                  <button onClick={() => handleItemClick(item.id, groupId)} className={cn(
                                    "group/item relative flex w-full items-center gap-3 rounded-lg px-3 py-[9px] text-left text-[13px] font-medium transition-all",
                                    isActive
                                      ? appTheme === "premium-dark"
                                        ? "text-yellow-100 bg-gradient-to-r from-amber-600/[0.18] via-amber-500/[0.08] to-transparent"
                                        : "text-amber-50 bg-gradient-to-r from-amber-500/[0.18] via-amber-500/[0.08] to-transparent"
                                      : isSubLocked
                                        ? "text-slate-500 hover:bg-white/[0.03] hover:text-slate-300"
                                        : isReadOnly
                                          ? "text-slate-500 hover:bg-white/[0.02] hover:text-slate-300"
                                          : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                                  )}>
                                    {isActive && <motion.div layoutId="active-accent" className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                                      style={{ background: appTheme === "premium-dark"
                                        ? "linear-gradient(to bottom, #d4a017, #b8860b)"
                                        : "linear-gradient(to bottom, #E8D48B, #C9A227)" }}
                                      transition={{ type: "spring", stiffness: 350, damping: 30 }} />}
                                    <span className={cn("flex-shrink-0 transition-colors", isActive
                                      ? appTheme === "premium-dark" ? "text-amber-400" : "text-amber-400"
                                      : isSubLocked
                                        ? "text-slate-600 group-hover/item:text-slate-500"
                                        : "text-slate-500 group-hover/item:text-slate-400"
                                    )}>{ICON_MAP[item.id] || <Home className="h-4 w-4" />}</span>
                                    <span className="flex-1 truncate">{item.label}</span>
                                    {isReadOnly && !isSubLocked && (
                                      <Eye className="h-3 w-3 text-slate-600 flex-shrink-0" />
                                    )}
                                    {/* Plan badge for locked features */}
                                    {isSubLocked && (
                                      <span className={cn(
                                        "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold flex-shrink-0 whitespace-nowrap",
                                        requiredPlan === "enterprise"
                                          ? "bg-amber-500/10 text-amber-400/80 border border-amber-500/15"
                                          : "bg-amber-500/10 text-amber-400/80 border border-amber-500/15"
                                      )}>
                                        <Zap className="h-2.5 w-2.5" />
                                        {requiredPlan === "enterprise" ? "Enterprise" : "Growth"}
                                      </span>
                                    )}
                                    {badge ? (
                                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none text-white"
                                        style={{ background: appTheme === "premium-dark" ? "rgba(212,160,23,0.9)" : "rgba(16,185,129,0.9)" }}>
                                        {badge > 99 ? "99+" : badge}
                                      </span>
                                    ) : null}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="text-xs max-w-[220px]">
                                  {isSubLocked ? (
                                    <div>
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <Crown className="h-3 w-3 text-amber-500" />
                                        <span className="font-semibold">{item.label}</span>
                                      </div>
                                      <p className="text-slate-400">Requires <span className={cn(
                                        "font-medium",
                                        requiredPlan === "enterprise" ? "text-amber-400" : "text-amber-400"
                                      )}>{getPlanDisplayName(requiredPlan)}</span> plan</p>
                                      <p className="text-slate-500 mt-0.5">Click to upgrade →</p>
                                    </div>
                                  ) : (
                                    <>
                                      {item.label}
                                      {isReadOnly && " (Read-only)"}
                                    </>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Bottom: Collapse Toggle + User Card */}
        <div className="flex-shrink-0 border-t border-white/[0.06] bg-slate-950/50 backdrop-blur-xl">
          {/* Desktop collapse toggle */}
          <div className="hidden lg:flex items-center justify-center px-3 pt-2 pb-1">
            <button
              onClick={toggleSidebarCollapsed}
              className="flex items-center justify-center gap-1.5 w-full rounded-lg px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500 hover:bg-white/[0.04] hover:text-slate-400 transition-colors"
            >
              {isCollapsed ? (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span>Expand</span>
                </>
              ) : (
                <>
                  <ChevronLeft className="h-3 w-3" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>

          {/* User Card */}
          <div className={cn("px-3 pt-3 pb-2", isCollapsed && "lg:px-1")}>
            <div className={cn(
              "flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/[0.06] hover:bg-white/[0.07]",
              isCollapsed && "lg:justify-center lg:px-2 lg:py-2"
            )}>
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-[1px] rounded-full opacity-60"
                  style={{ background: appTheme === "premium-dark"
                    ? "linear-gradient(135deg, #d4a017, #b8860b)"
                    : "linear-gradient(135deg, #D4AF37, #C9A227)" }} />
                <Avatar className="relative h-8 w-8 ring-2 ring-slate-900">
                  {user?.image ? <AvatarImage src={user.image} /> : null}
                  <AvatarFallback className="text-[11px] font-bold text-white"
                    style={{ background: appTheme === "premium-dark"
                      ? "linear-gradient(135deg, #d4a017, #b8860b)"
                      : "linear-gradient(135deg, #D4AF37, #C9A227)" }}>
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900"
                  style={{ background: appTheme === "premium-dark" ? "#d4a017" : "#D4AF37",
                    boxShadow: appTheme === "premium-dark" ? "0 0 6px rgba(212,160,23,0.6)" : "0 0 6px rgba(16,185,129,0.6)" }} />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-slate-200">{user?.name || "User"}</p>
                    {isPlatformUser && <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                  </div>
                  <p className="truncate text-[11px] text-slate-500">{getUserRoleLabel()}</p>
                </div>
              )}
              <button onClick={logout} className={cn(
                "flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors",
                "h-8 w-8 min-h-[44px] min-w-[44px]"
              )}>
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className={cn("flex items-center justify-between px-5 pb-3", isCollapsed && "lg:px-2 lg:flex-col lg:gap-1")}>
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
              <Sparkles className="h-3 w-3" style={{ color: appTheme === "premium-dark" ? "rgba(212,160,23,0.6)" : "rgba(16,185,129,0.6)" }} />
              {!isCollapsed && <span>v3.0</span>}
            </span>
            {!isCollapsed && <span className="text-[10px] font-medium text-slate-500">{visibleGroups.length} groups</span>}
          </div>
          {/* "Powered by Valtriox" subtle text */}
          <div className="pb-3 flex justify-center">
            <span className="text-[10px] text-slate-500/60">Powered by {companyName}</span>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

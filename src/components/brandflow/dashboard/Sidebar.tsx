"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  LayoutDashboard,
  Command,
  Bell,
  Package,
  ShoppingBag,
  ClipboardList,
  Users,
  BarChart3,
  DollarSign,
  UserCheck,
  Brain,
  FileText,
  MessageSquare,
  Calendar,
  Settings,
  Shield,
  ChevronDown,
  ChevronRight,
  LogOut,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
  activeItem: string;
  onItemClick: (item: string) => void;
}

interface NavGroup {
  label: string;
  items: { icon: React.ElementType; label: string; id: string }[];
}

const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
      { icon: Command, label: "Command Center", id: "command-center" },
      { icon: Bell, label: "Notifications", id: "notifications" },
    ],
  },
  {
    label: "Products",
    items: [
      { icon: Package, label: "Inventory", id: "inventory" },
      { icon: ShoppingBag, label: "Products", id: "products" },
      { icon: ClipboardList, label: "Orders", id: "orders" },
      { icon: Users, label: "Customers", id: "customers" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { icon: BarChart3, label: "Sales Analytics", id: "sales-analytics" },
      { icon: DollarSign, label: "Expenses", id: "expenses" },
      { icon: UserCheck, label: "Team Stats", id: "team-stats" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { icon: Brain, label: "AI Brain", id: "ai-brain" },
      { icon: FileText, label: "Content Planner", id: "content-planner" },
      { icon: MessageSquare, label: "Reviews", id: "reviews" },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: Users, label: "Team", id: "team" },
      { icon: Calendar, label: "Attendance", id: "attendance" },
    ],
  },
  {
    label: "Settings",
    items: [
      { icon: Settings, label: "Brand Settings", id: "brand-settings" },
      { icon: Shield, label: "Team Roles", id: "team-roles" },
    ],
  },
];

export function Sidebar({ collapsed, onToggle, onLogout, activeItem, onItemClick }: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(navGroups.map((g) => [g.label, true]))
  );

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 0 : 260 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 dashboard-sidebar flex flex-col overflow-hidden",
          "lg:z-auto"
        )}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between h-16 px-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-lg font-bold text-white overflow-hidden whitespace-nowrap"
                >
                  Valtriox
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-slate-400 hover:text-white hover:bg-slate-700/50 lg:block hidden"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <Separator className="bg-slate-700/50" />

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <div className="px-3 space-y-1">
            {navGroups.map((group) => (
              <div key={group.label} className="mb-2">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-300 transition-colors"
                >
                  {!collapsed && <span>{group.label}</span>}
                  {!collapsed && (
                    <span className="text-[10px]">
                      {expandedGroups[group.label] ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </span>
                  )}
                </button>

                {/* Group items */}
                <AnimatePresence>
                  {expandedGroups[group.label] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => onItemClick(item.id)}
                          className={cn(
                            "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all duration-200",
                            activeItem === item.id
                              ? "bg-amber-600/20 text-amber-400"
                              : "text-slate-400 hover:bg-slate-800 hover:text-white"
                          )}
                        >
                          <item.icon className="w-4 h-4 shrink-0" />
                          {!collapsed && <span>{item.label}</span>}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* User section */}
        {!collapsed && (
          <div className="p-4 border-t border-slate-700/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-amber-600/20 text-amber-400 text-sm">
                  JD
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">John Doe</p>
                <p className="text-xs text-slate-500 truncate">john@brand.com</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 h-8 w-8"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.aside>
    </>
  );
}

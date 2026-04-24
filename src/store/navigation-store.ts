// ============================================================================
// Navigation Store — Sub-tab states for all sidebar sections
// ============================================================================
"use client";

import { create } from "zustand";

// ── Sub-Tab Types ──
export type OrdersSubTab = "all" | "pending" | "confirmed" | "packing" | "dispatched" | "delivered" | "cancelled" | "returns";
export type TasksSubTab = "board" | "list" | "calendar";
export type ProductsSubTab = "all-products" | "add-product";
export type CustomersSubTab = "all" | "vip" | "segments" | "notes";
export type LoyaltySubTab = "tiers" | "rewards" | "points-history";
export type BroadcastsSubTab = "whatsapp" | "email" | "sms";
export type CouponsSubTab = "active" | "expired" | "create";
export type SalesAnalyticsSubTab = "daily" | "weekly" | "monthly" | "custom";
export type ProductAnalyticsSubTab = "best-sellers" | "low-stock" | "categories";
export type CustomerAnalyticsSubTab = "acquisition" | "retention" | "lifetime-value";
export type AIToolsSubTab = "ai-brain" | "reply-writer" | "descriptions" | "daily-briefing" | "forecast" | "restock-ai";
export type WaBusinessSubTab = "overview" | "api-setup" | "broadcast" | "campaigns" | "templates";
export type TeamManagementSubTab = "members" | "attendance" | "payroll";
export type BrandSettingsSubTab = "general" | "theme-colors" | "logo-branding" | "event-theming";
export type UserManagementSubTab = "users" | "roles" | "permissions";
// Legacy aliases
export type SalesReportsSubTab = SalesAnalyticsSubTab;
export type CustomerReportsSubTab = CustomerAnalyticsSubTab;
export type ProductReportsSubTab = ProductAnalyticsSubTab;
export type AIAssistantSubTab = AIToolsSubTab;
export type WhatsAppIntegrationSubTab = WaBusinessSubTab;
export type TeamMembersSubTab = TeamManagementSubTab;

interface NavigationStore {
  // Sub-Tab States
  ordersSubTab: OrdersSubTab;
  setOrdersSubTab: (tab: OrdersSubTab) => void;
  tasksSubTab: TasksSubTab;
  setTasksSubTab: (tab: TasksSubTab) => void;
  productsSubTab: ProductsSubTab;
  setProductsSubTab: (tab: ProductsSubTab) => void;
  customersSubTab: CustomersSubTab;
  setCustomersSubTab: (tab: CustomersSubTab) => void;
  loyaltySubTab: LoyaltySubTab;
  setLoyaltySubTab: (tab: LoyaltySubTab) => void;
  broadcastsSubTab: BroadcastsSubTab;
  setBroadcastsSubTab: (tab: BroadcastsSubTab) => void;
  couponsSubTab: CouponsSubTab;
  setCouponsSubTab: (tab: CouponsSubTab) => void;
  salesAnalyticsSubTab: SalesAnalyticsSubTab;
  setSalesAnalyticsSubTab: (tab: SalesAnalyticsSubTab) => void;
  productAnalyticsSubTab: ProductAnalyticsSubTab;
  setProductAnalyticsSubTab: (tab: ProductAnalyticsSubTab) => void;
  customerAnalyticsSubTab: CustomerAnalyticsSubTab;
  setCustomerAnalyticsSubTab: (tab: CustomerAnalyticsSubTab) => void;
  aiToolsSubTab: AIToolsSubTab;
  setAIToolsSubTab: (tab: AIToolsSubTab) => void;
  waBusinessSubTab: WaBusinessSubTab;
  setWaBusinessSubTab: (tab: WaBusinessSubTab) => void;
  teamManagementSubTab: TeamManagementSubTab;
  setTeamManagementSubTab: (tab: TeamManagementSubTab) => void;
  teamChatOpen: boolean;
  setTeamChatOpen: (open: boolean) => void;
  brandSettingsSubTab: BrandSettingsSubTab;
  setBrandSettingsSubTab: (tab: BrandSettingsSubTab) => void;
  userManagementSubTab: UserManagementSubTab;
  setUserManagementSubTab: (tab: UserManagementSubTab) => void;
  eventsSubTab: string;
  setEventsSubTab: (tab: string) => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  ordersSubTab: "all",
  setOrdersSubTab: (tab) => set({ ordersSubTab: tab }),
  tasksSubTab: "board",
  setTasksSubTab: (tab) => set({ tasksSubTab: tab }),
  productsSubTab: "all-products",
  setProductsSubTab: (tab) => set({ productsSubTab: tab }),
  customersSubTab: "all",
  setCustomersSubTab: (tab) => set({ customersSubTab: tab }),
  loyaltySubTab: "tiers",
  setLoyaltySubTab: (tab) => set({ loyaltySubTab: tab }),
  broadcastsSubTab: "whatsapp",
  setBroadcastsSubTab: (tab) => set({ broadcastsSubTab: tab }),
  couponsSubTab: "active",
  setCouponsSubTab: (tab) => set({ couponsSubTab: tab }),
  salesAnalyticsSubTab: "daily",
  setSalesAnalyticsSubTab: (tab) => set({ salesAnalyticsSubTab: tab }),
  productAnalyticsSubTab: "best-sellers",
  setProductAnalyticsSubTab: (tab) => set({ productAnalyticsSubTab: tab }),
  customerAnalyticsSubTab: "acquisition",
  setCustomerAnalyticsSubTab: (tab) => set({ customerAnalyticsSubTab: tab }),
  aiToolsSubTab: "ai-brain",
  setAIToolsSubTab: (tab) => set({ aiToolsSubTab: tab }),
  waBusinessSubTab: "overview",
  setWaBusinessSubTab: (tab) => set({ waBusinessSubTab: tab }),
  teamManagementSubTab: "members",
  setTeamManagementSubTab: (tab) => set({ teamManagementSubTab: tab }),
  teamChatOpen: false,
  setTeamChatOpen: (open) => set({ teamChatOpen: open }),
  brandSettingsSubTab: "general",
  setBrandSettingsSubTab: (tab) => set({ brandSettingsSubTab: tab }),
  userManagementSubTab: "users",
  setUserManagementSubTab: (tab) => set({ userManagementSubTab: tab }),
  eventsSubTab: "active-events",
  setEventsSubTab: (tab) => set({ eventsSubTab: tab }),
}));

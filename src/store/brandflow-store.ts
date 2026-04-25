"use client";

import { create } from "zustand";

// ============================================================================
// View & Feature Enums — 8 Groups, 37 Core + Legacy Features
// ============================================================================

export type AppView = "landing" | "auth" | "dashboard";

export type Feature =
  // ── Group 1: MAIN ──
  | "dashboard"
  | "orders"
  | "products"
  | "customers"
  | "tasks"
  | "calendar"
  // ── Group 2: PRODUCTS ──
  | "add-product"
  | "categories"
  | "inventory"
  | "pricing-rules"
  | "variants"
  | "catalog"
  | "reviews"
  // ── Group 3: ANALYTICS ──
  | "sales-analytics"
  | "product-analytics"
  | "customer-analytics"
  | "revenue-analytics"
  | "traffic-analytics"
  // ── Group 4: MARKETING ──
  | "campaigns"
  | "seo-manager"
  | "social-media"
  | "email-marketing"
  | "ad-manager"
  | "loyalty"
  | "seasonal-sales"
  | "influencers"
  | "affiliates"
  | "coupons"
  | "marketing-calendar"
  | "events"
  // ── Group 5: OPERATIONS ──
  | "returns"
  | "sla-engine"
  | "support-tickets"
  | "packaging"
  | "shipping"
  | "suppliers"
  | "warehouse"
  | "product-reviews"
  | "team-management"
  | "team-chat"
  | "support-chat"
  | "attendance"
  | "payroll"
  // ── Group 6: CONNECTIONS ──
  | "integrations"
  | "wa-business"
  | "ai-tools"
  | "whatsapp-integration"
  | "whatsapp-messages"
  | "import-export"
  // ── Group 7: GUIDE ──
  | "user-guide"
  // ── Group 8: SYSTEM ──
  | "brand-settings"
  | "user-management"
  | "admin-dashboard"
  | "audit-log"
  | "subscriptions"
  | "payment-approvals"
  | "subscription-management"
  | "invoice-management"
  | "platform-settings"
  // Legacy aliases
  | "broadcasts"
  | "referral"
  | "team-members"
  | "sales-reports"
  | "customer-reports"
  | "product-reports"
  | "ai-assistant"
  | "api-integrations"
  | "team"
  | "settings"
  | "analytics";

export type SidebarSection = Feature;

// ============================================================================
// Sidebar Group Enum — 8 Groups (User Spec)
// ============================================================================

export type SidebarGroup =
  | "main"
  | "products"
  | "analytics"
  | "marketing"
  | "operations"
  | "connections"
  | "guide"
  | "system";

export const SECTION_GROUP_MAP: Record<SidebarSection, SidebarGroup> = {
  // Group 1: MAIN
  dashboard: "main",
  orders: "main",
  products: "main",
  customers: "main",
  tasks: "main",
  calendar: "main",
  // Group 2: PRODUCTS
  "add-product": "products",
  categories: "products",
  inventory: "products",
  "pricing-rules": "products",
  variants: "products",
  catalog: "products",
  reviews: "products",
  // Group 3: ANALYTICS
  "sales-analytics": "analytics",
  "product-analytics": "analytics",
  "customer-analytics": "analytics",
  "revenue-analytics": "analytics",
  "traffic-analytics": "analytics",
  // Group 4: MARKETING
  campaigns: "marketing",
  "seo-manager": "marketing",
  "social-media": "marketing",
  "email-marketing": "marketing",
  "ad-manager": "marketing",
  loyalty: "marketing",
  "seasonal-sales": "marketing",
  influencers: "marketing",
  affiliates: "marketing",
  coupons: "marketing",
  "marketing-calendar": "marketing",
  events: "marketing",
  // Group 5: OPERATIONS
  returns: "operations",
  "sla-engine": "operations",
  "support-tickets": "operations",
  packaging: "operations",
  shipping: "operations",
  suppliers: "operations",
  warehouse: "operations",
  "product-reviews": "operations",
  "team-management": "operations",
  "team-chat": "operations",
  "support-chat": "operations",
  attendance: "operations",
  payroll: "operations",
  // Group 6: CONNECTIONS
  integrations: "connections",
  "wa-business": "connections",
  "ai-tools": "connections",
  "whatsapp-integration": "connections",
  "whatsapp-messages": "connections",
  "import-export": "connections",
  // Group 7: GUIDE
  "user-guide": "guide",
  // Group 8: SYSTEM
  "brand-settings": "system",
  "user-management": "system",
  "admin-dashboard": "system",
  "audit-log": "system",
  "subscriptions": "system",
  "payment-approvals": "system",
  "subscription-management": "system",
  "invoice-management": "system",
  "platform-settings": "system",
  // Legacy
  broadcasts: "marketing",
  referral: "marketing",
  "team-members": "operations",
  "sales-reports": "analytics",
  "customer-reports": "analytics",
  "product-reports": "analytics",
  "ai-assistant": "connections",
  "api-integrations": "connections",
  team: "operations",
  settings: "system",
  analytics: "analytics",
};

// ============================================================================
// Sidebar Structure — 8 Groups, 37 Core Items
// ============================================================================

export interface SidebarItem {
  id: SidebarSection;
  label: string;
  icon?: string;
  subTabs?: string[];
}

export const SIDEBAR_STRUCTURE: Record<SidebarGroup, { label: string; emoji: string; items: SidebarItem[] }> = {
  main: {
    label: "MAIN",
    emoji: "🏠",
    items: [
      { id: "dashboard", label: "Dashboard" },
      { id: "orders", label: "Orders", subTabs: ["All", "Pending", "Confirmed", "Packing", "Dispatched", "Delivered", "Cancelled", "Returns"] },
      { id: "products", label: "Products", subTabs: ["All Products", "Add Product"] },
      { id: "customers", label: "Customers", subTabs: ["All", "VIP", "Segments", "Notes"] },
    ],
  },
  products: {
    label: "PRODUCTS",
    emoji: "📦",
    items: [
      { id: "add-product", label: "Add / Edit Product", subTabs: ["Create", "Edit", "Bulk Import"] },
      { id: "categories", label: "Categories" },
      { id: "inventory", label: "Inventory" },
      { id: "pricing-rules", label: "Pricing Rules" },
      { id: "variants", label: "Variants" },
    ],
  },
  analytics: {
    label: "ANALYTICS",
    emoji: "📊",
    items: [
      { id: "sales-analytics", label: "Sales Analytics", subTabs: ["Daily", "Weekly", "Monthly", "Custom"] },
      { id: "product-analytics", label: "Product Analytics", subTabs: ["Best Sellers", "Low Stock", "Categories"] },
      { id: "customer-analytics", label: "Customer Analytics", subTabs: ["Acquisition", "Retention", "LTV"] },
      { id: "revenue-analytics", label: "Revenue Analytics" },
      { id: "traffic-analytics", label: "Traffic Analytics" },
    ],
  },
  marketing: {
    label: "MARKETING",
    emoji: "📢",
    items: [
      { id: "campaigns", label: "Campaigns", subTabs: ["WhatsApp", "Email", "SMS"] },
      { id: "seo-manager", label: "SEO Manager" },
      { id: "social-media", label: "Social Media" },
      { id: "email-marketing", label: "Email Marketing" },
      { id: "ad-manager", label: "Ad Manager" },
      { id: "loyalty", label: "Loyalty Program", subTabs: ["Tiers", "Rewards", "Points History"] },
      { id: "seasonal-sales", label: "Seasonal Sales", subTabs: ["Active Events", "Upcoming", "Calendar"] },
      { id: "influencers", label: "Influencers" },
      { id: "affiliates", label: "Affiliates" },
    ],
  },
  operations: {
    label: "OPERATIONS",
    emoji: "⚙️",
    items: [
      { id: "returns", label: "Returns" },
      { id: "sla-engine", label: "SLA Engine" },
      { id: "support-tickets", label: "Support Tickets" },
      { id: "packaging", label: "Packaging" },
      { id: "shipping", label: "Shipping" },
      { id: "suppliers", label: "Suppliers" },
      { id: "warehouse", label: "Warehouse" },
      { id: "product-reviews", label: "Product Reviews" },
      { id: "team-management", label: "Team Management", subTabs: ["Members", "Attendance", "Payroll"] },
      { id: "team-chat", label: "Team Chat" },
      { id: "support-chat", label: "Support Chat" },
    ],
  },
  connections: {
    label: "CONNECTIONS",
    emoji: "🔗",
    items: [
      { id: "integrations", label: "Integrations" },
      { id: "wa-business", label: "WA Business", subTabs: ["Overview", "API Setup", "Broadcast", "Campaigns", "Templates"] },
      { id: "ai-tools", label: "AI Tools", subTabs: ["AI Brain", "Reply Writer", "Descriptions", "Daily Briefing", "Forecast", "Restock AI"] },
    ],
  },
  guide: {
    label: "GUIDE",
    emoji: "📖",
    items: [
      { id: "user-guide", label: "User Guide" },
    ],
  },
  system: {
    label: "SYSTEM",
    emoji: "⚙️",
    items: [
      { id: "subscriptions", label: "Billing & Plans" },
      { id: "brand-settings", label: "Settings", subTabs: ["General", "Theme & Colors", "Logo & Branding", "Event Theming"] },
      { id: "user-management", label: "User Management", subTabs: ["Users", "Roles", "Permissions"] },
      { id: "admin-dashboard", label: "Admin Dashboard" },
      { id: "payment-approvals", label: "Payment Approvals" },
      { id: "invoice-management", label: "Invoice Management" },
      { id: "subscription-management", label: "Subscription Management" },
      { id: "audit-log", label: "Audit Log" },
      { id: "platform-settings", label: "Platform Settings", subTabs: ["Personal Details", "Company Info", "Contact & Support", "Payment Methods", "Branding"] },
    ],
  },
};

export const SIDEBAR_GROUP_ORDER: SidebarGroup[] = [
  "main", "products", "analytics", "marketing", "operations", "connections", "guide", "system",
];

// ============================================================================
// Sub-Tab Types
// ============================================================================

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

// Legacy kept for backward compat
export type SalesReportsSubTab = SalesAnalyticsSubTab;
export type CustomerReportsSubTab = CustomerAnalyticsSubTab;
export type ProductReportsSubTab = ProductAnalyticsSubTab;
export type AIAssistantSubTab = AIToolsSubTab;
export type WhatsAppIntegrationSubTab = WaBusinessSubTab;
export type ImportExportSubTab = "import-data" | "export-data" | "backup";
export type TeamMembersSubTab = TeamManagementSubTab;
export type AttendanceSubTab = "daily" | "monthly" | "reports";
export type PayrollSubTab = "salaries" | "expenses" | "reports";
export type APIIntegrationsSubTab = "woocommerce" | "payment-gateways" | "webhooks";

// ============================================================================
// Brand Theme & Event Theme Types
// ============================================================================

export interface BrandTheme {
  brandColor: string;
  brandGradient: string;
  brandBgColor: string;
}

export interface EventTheme {
  primary: string;
  secondary: string;
  accent: string;
  gradient: string;
  bgPattern: string;
  textOnPrimary: string;
  glow: string;
}

// ============================================================================
// User & Organization Types
// ============================================================================

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  favicon?: string;
  website?: string;
  phone?: string;
  email?: string;
  currency: string;
  timezone: string;
  plan: string;
  country?: string;
  religion?: string;
  brandLogo?: string;
}

// ============================================================================
// Store Interface
// ============================================================================

interface ValtrioxStore {
  view: AppView;
  setView: (view: AppView) => void;
  activeSection: SidebarSection;
  setActiveSection: (section: SidebarSection) => void;

  // Brand Name
  brandName: string;
  setBrandName: (name: string) => void;

  // Brand Tagline
  brandTagline: string;
  setBrandTagline: (tagline: string) => void;

  // App Theme
  appTheme: "light" | "dark" | "premium-dark";
  setAppTheme: (theme: "light" | "dark" | "premium-dark") => void;

  // Language
  language: "en" | "ur";
  setLanguage: (lang: "en" | "ur") => void;

  // Sidebar Collapse (Desktop)
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;

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

  // Brand Theme
  brandColor: string;
  setBrandColor: (color: string) => void;
  brandGradient: string;
  setBrandGradient: (gradient: string) => void;
  brandBgColor: string;
  setBrandBgColor: (color: string) => void;
  setBrandTheme: (theme: Partial<BrandTheme>) => void;

  // User & Org
  user: UserInfo | null;
  setUser: (user: UserInfo | null) => void;
  organization: OrganizationInfo | null;
  setOrganization: (org: OrganizationInfo | null) => void;

  // Sidebar (Mobile Overlay)
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Notifications
  notificationCount: number;
  setNotificationCount: (count: number) => void;
  incrementNotifications: (by?: number) => void;
  decrementNotifications: (by?: number) => void;
  clearNotifications: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;

  // Brand Logo
  brandLogo: string | null;
  setBrandLogo: (logo: string | null) => void;

  // Brand Configured (set after brand owner saves settings)
  brandConfigured: boolean;
  setBrandConfigured: (v: boolean) => void;

  // Event Theming
  activeEventTheme: EventTheme | null;
  setActiveEventTheme: (theme: EventTheme | null) => void;
  eventThemingEnabled: boolean;
  setEventThemingEnabled: (v: boolean) => void;
  floatingIconsEnabled: boolean;
  setFloatingIconsEnabled: (v: boolean) => void;

  // Country & Religion
  selectedCountry: string;
  setSelectedCountry: (c: string) => void;
  selectedReligion: string;
  setSelectedReligion: (r: string) => void;

  // Auth Modal (shown from landing page)
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalMode: "login" | "signup" | null;
  setAuthModalMode: (mode: "login" | "signup" | null) => void;

  // Logout
  logout: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

// Helper to safely read localStorage (SSR-safe)
function getSavedLanguage(): "en" | "ur" {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem("valtriox-language");
    if (saved === "en" || saved === "ur") return saved;
  } catch {}
  return "en";
}

function saveLanguageToStorage(lang: "en" | "ur") {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem("valtriox-language", lang);
    }
  } catch {}
}

function getSavedTheme(): "light" | "dark" | "premium-dark" {
  if (typeof window === "undefined") return "premium-dark";
  try {
    const saved = localStorage.getItem("valtriox-theme");
    if (saved === "light" || saved === "dark" || saved === "premium-dark") return saved;
  } catch {}
  return "premium-dark";
}

function saveThemeToStorage(theme: "light" | "dark" | "premium-dark") {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem("valtriox-theme", theme);
    }
  } catch {}
}

// Persist auth state to localStorage
function getSavedUser(): any {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('valtriox-user') : null;
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}
function getSavedOrg(): any {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('valtriox-org') : null;
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

/**
 * Sync auth info from localStorage to cookies.
 * This ensures existing logged-in users (who have localStorage but no cookies)
 * get their auth headers injected by the Next.js middleware.
 * Called once on store initialization.
 */
function syncAuthCookies() {
  try {
    if (typeof window === 'undefined') return;
    // Only sync if cookies don't already exist (user hasn't logged in via new flow)
    if (document.cookie.includes('vt-user-id')) return;
    const user = getSavedUser();
    const org = getSavedOrg();
    if (user?.id) {
      const maxAge = 30 * 24 * 60 * 60;
      const base = `path=/; max-age=${maxAge}; SameSite=Lax`;
      const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
      document.cookie = `vt-user-id=${user.id}; ${base}${secure}`;
      if (user.email) document.cookie = `vt-user-email=${user.email}; ${base}${secure}`;
      if (user.role) document.cookie = `vt-user-role=${user.role}; ${base}${secure}`;
      if (org?.id) document.cookie = `vt-org-id=${org.id}; ${base}${secure}`;
    }
  } catch { /* silent */ }
}
// Run cookie sync on module load (client-side only)
if (typeof window !== 'undefined') syncAuthCookies();
function getSavedBrandName(): string {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('valtriox-brandname') || '' : '';
  } catch { return ''; }
}
function getSavedBrandLogo(): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('valtriox-logo') : null;
  } catch { return null; }
}
function getSavedBrandTagline(): string {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('valtriox-tagline') || '' : '';
  } catch { return ''; }
}
function getSavedBrandConfigured(): boolean {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('valtriox-configured') === 'true' : false;
  } catch { return false; }
}

export const useValtrioxStore = create<ValtrioxStore>((set, get) => ({
  view: getSavedUser() ? "dashboard" : "landing",
  setView: (view) => set({ view }),
  activeSection: "dashboard",
  setActiveSection: (section) => set({ activeSection: section, sidebarOpen: false }),

  // Brand Name
  brandName: getSavedBrandName(),
  setBrandName: (name) => {
    try { localStorage.setItem('valtriox-brandname', name); } catch {}
    set({ brandName: name });
  },

  // Brand Tagline
  brandTagline: getSavedBrandTagline(),
  setBrandTagline: (tagline) => {
    try { localStorage.setItem('valtriox-tagline', tagline); } catch {}
    set({ brandTagline: tagline });
  },

  // App Theme — persisted to localStorage
  appTheme: getSavedTheme(),
  setAppTheme: (theme) => {
    saveThemeToStorage(theme);
    set({ appTheme: theme });
  },

  // Language — persisted to localStorage
  language: getSavedLanguage(),
  setLanguage: (lang) => {
    saveLanguageToStorage(lang);
    set({ language: lang });
  },

  // Sidebar Collapse (Desktop)
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // Sub-Tab States
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

  // Brand Theme
  brandColor: "#C9A227",
  setBrandColor: (color) => set({ brandColor: color }),
  brandGradient: "linear-gradient(135deg, #C9A227 0%, #B8860B 100%)",
  setBrandGradient: (gradient) => set({ brandGradient: gradient }),
  brandBgColor: "#ffffff",
  setBrandBgColor: (color) => set({ brandBgColor: color }),
  setBrandTheme: (theme) =>
    set((s) => ({
      brandColor: theme.brandColor ?? s.brandColor,
      brandGradient: theme.brandGradient ?? s.brandGradient,
      brandBgColor: theme.brandBgColor ?? s.brandBgColor,
    })),

  // User & Org — persisted to localStorage
  user: getSavedUser(),
  setUser: (user) => {
    try { localStorage.setItem('valtriox-user', JSON.stringify(user)); } catch {}
    set({ user, view: user ? 'dashboard' : 'landing' });
  },
  organization: getSavedOrg(),
  setOrganization: (org) => {
    try { localStorage.setItem('valtriox-org', JSON.stringify(org)); } catch {}
    set({ organization: org });
  },

  // Sidebar (Mobile Overlay)
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // Notifications
  notificationCount: 0,
  setNotificationCount: (count) => set({ notificationCount: count }),
  incrementNotifications: (by = 1) => set((s) => ({ notificationCount: Math.max(0, s.notificationCount + by) })),
  decrementNotifications: (by = 1) => set((s) => ({ notificationCount: Math.max(0, s.notificationCount - by) })),
  clearNotifications: () => set({ notificationCount: 0 }),

  // Search
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearSearch: () => set({ searchQuery: "" }),

  // Brand Logo — persisted to localStorage
  brandLogo: getSavedBrandLogo(),
  setBrandLogo: (logo) => {
    try { localStorage.setItem('valtriox-logo', logo || ''); } catch {}
    set({ brandLogo: logo });
  },

  // Brand Configured — persisted to localStorage
  brandConfigured: getSavedBrandConfigured(),
  setBrandConfigured: (v) => {
    try { localStorage.setItem('valtriox-configured', v ? 'true' : 'false'); } catch {}
    set({ brandConfigured: v });
  },

  // Event Theming
  activeEventTheme: null,
  setActiveEventTheme: (theme) => set({ activeEventTheme: theme }),
  eventThemingEnabled: false,
  setEventThemingEnabled: (v) => set({ eventThemingEnabled: v }),
  floatingIconsEnabled: false,
  setFloatingIconsEnabled: (v) => set({ floatingIconsEnabled: v }),

  // Country & Religion
  selectedCountry: "",
  setSelectedCountry: (c) => set({ selectedCountry: c }),
  selectedReligion: "",
  setSelectedReligion: (r) => set({ selectedReligion: r }),

  // Auth Modal (shown from landing page)
  authModalOpen: false,
  setAuthModalOpen: (open) => set({ authModalOpen: open, authModalMode: open ? (get().authModalMode || "login") : null }),
  authModalMode: null as "login" | "signup" | null,
  setAuthModalMode: (mode) => set({ authModalMode: mode, authModalOpen: mode !== null }),

  // Logout — clear persisted auth, keep appTheme and sidebarCollapsed
  logout: () => {
    try {
      localStorage.removeItem('valtriox-user');
      localStorage.removeItem('valtriox-org');
      localStorage.removeItem('valtriox-brandname');
      localStorage.removeItem('valtriox-logo');
      localStorage.removeItem('valtriox-tagline');
      localStorage.removeItem('valtriox-configured');
      // Clear auth cookies (set by login API for middleware auth injection)
      document.cookie = 'vt-user-id=; path=/; max-age=0';
      document.cookie = 'vt-user-email=; path=/; max-age=0';
      document.cookie = 'vt-user-role=; path=/; max-age=0';
      document.cookie = 'vt-org-id=; path=/; max-age=0';
    } catch {}
    set({
      view: "landing",
      user: null,
      organization: null,
      activeSection: "dashboard",
      sidebarOpen: false,
      notificationCount: 0,
      searchQuery: "",
      brandName: "",
      authModalOpen: false,
      authModalMode: null,
      ordersSubTab: "all",
      tasksSubTab: "board",
      productsSubTab: "all-products",
      customersSubTab: "all",
      loyaltySubTab: "tiers",
      broadcastsSubTab: "whatsapp",
      couponsSubTab: "active",
      salesAnalyticsSubTab: "daily",
      productAnalyticsSubTab: "best-sellers",
      customerAnalyticsSubTab: "acquisition",
      aiToolsSubTab: "ai-brain",
      waBusinessSubTab: "overview",
      teamManagementSubTab: "members",
      teamChatOpen: false,
      brandSettingsSubTab: "general",
      userManagementSubTab: "users",
      eventsSubTab: "active-events",
      brandLogo: getSavedBrandLogo(),
      brandTagline: "",
      brandConfigured: false,
      activeEventTheme: null,
      eventThemingEnabled: false,
      floatingIconsEnabled: false,
      selectedCountry: "",
      selectedReligion: "",
      // appTheme is NOT reset — remember user preference
      // sidebarCollapsed is NOT reset — remember user preference
    });
  },
}));

export function useSubTabForSection(section: SidebarSection): string | null {
  const store = useValtrioxStore();
  switch (section) {
    case "orders": return store.ordersSubTab;
    case "tasks": return store.tasksSubTab;
    case "products": return store.productsSubTab;
    case "customers": return store.customersSubTab;
    case "loyalty": case "seasonal-sales": return store.loyaltySubTab;
    case "broadcasts": case "campaigns": return store.broadcastsSubTab;
    case "coupons": return store.couponsSubTab;
    case "sales-analytics": case "sales-reports": return store.salesAnalyticsSubTab;
    case "product-analytics": case "product-reports": return store.productAnalyticsSubTab;
    case "customer-analytics": case "customer-reports": return store.customerAnalyticsSubTab;
    case "ai-tools": case "ai-assistant": return store.aiToolsSubTab;
    case "wa-business": case "whatsapp-integration": return store.waBusinessSubTab;
    case "team-management": case "team-members": return store.teamManagementSubTab;
    case "brand-settings": return store.brandSettingsSubTab;
    case "user-management": return store.userManagementSubTab;
    case "events": return store.eventsSubTab;
    default: return null;
  }
}

export function getSidebarItem(section: SidebarSection): SidebarItem | undefined {
  const group = SECTION_GROUP_MAP[section];
  const groupDef = SIDEBAR_STRUCTURE[group];
  return groupDef?.items.find((item) => item.id === section);
}

export function getSubTabsForSection(section: SidebarSection): string[] | null {
  const item = getSidebarItem(section);
  return item?.subTabs ?? null;
}

export function getTotalSidebarItems(): number {
  return SIDEBAR_GROUP_ORDER.reduce((sum, group) => sum + SIDEBAR_STRUCTURE[group].items.length, 0);
}

export function getTotalSubTabs(): number {
  return SIDEBAR_GROUP_ORDER.reduce(
    (sum, group) => sum + SIDEBAR_STRUCTURE[group].items.reduce((s, item) => s + (item.subTabs?.length ?? 0), 0),
    0,
  );
}

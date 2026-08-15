// ============================================================================
// 16-Role RBAC System for Valtriox Portal
// ============================================================================

export interface RolePermission {
  [key: string]: boolean;
}

export interface RoleDefinition {
  name: string;
  label: string;
  description: string;
  level: number;
  permissions: RolePermission;
}

export const ROLES: RoleDefinition[] = [
  {
    name: "platform_owner",
    label: "Platform Owner",
    description: "Full access to everything - the Valtriox portal owner",
    level: 100,
    permissions: { all: true },
  },
  {
    name: "platform_admin",
    label: "Platform Admin",
    description: "Full access except platform settings modification",
    level: 95,
    permissions: { all: true, manage_platform: false },
  },
  {
    name: "valtriox_team",
    label: "Valtriox Team",
    description: "Valtriox internal team member - complete portal access (toggleable per-page)",
    level: 88,
    permissions: { all: true },
  },
  {
    name: "brand_owner",
    label: "Brand Owner",
    description: "Full access to their own brand/organization",
    level: 90,
    permissions: {
      dashboard: true, orders: true, products: true, customers: true,
      analytics: true, marketing: true, operations: true, connections: true,
      team_manage: true, settings: true, billing: true, reports: true,
      integrations: true,
    },
  },
  {
    name: "brand_admin",
    label: "Brand Admin",
    description: "Full brand management except billing and critical settings",
    level: 80,
    permissions: {
      dashboard: true, orders: true, products: true, customers: true,
      analytics: true, marketing: true, operations: true, connections: true,
      team_manage: true, settings: true, billing: false, reports: true,
      integrations: true,
    },
  },
  {
    name: "operations_manager",
    label: "Operations Manager",
    description: "Manages orders, inventory, shipping, warehouse",
    level: 70,
    permissions: {
      dashboard: true, orders: true, products: true, customers: true,
      analytics: true, marketing: false, operations: true, connections: false,
      team_view: true, settings: false, billing: false, reports: true,
      integrations: true,
    },
  },
  {
    name: "sales_manager",
    label: "Sales Manager",
    description: "Manages sales, customers, orders, marketing campaigns",
    level: 65,
    permissions: {
      dashboard: true, orders: true, products: true, customers: true,
      analytics: true, marketing: true, operations: false, connections: false,
      team_view: true, settings: false, billing: false, reports: true,
      integrations: false,
    },
  },
  {
    name: "marketing_manager",
    label: "Marketing Manager",
    description: "Manages all marketing campaigns, SEO, social media, ads",
    level: 65,
    permissions: {
      dashboard: true, orders: false, products: false, customers: true,
      analytics: true, marketing: true, operations: false, connections: true,
      team_view: true, settings: false, billing: false, reports: true,
      integrations: false,
    },
  },
  {
    name: "warehouse_manager",
    label: "Warehouse Manager",
    description: "Manages warehouse, inventory, packaging, shipping",
    level: 60,
    permissions: {
      dashboard: true, orders: true, products: true, customers: false,
      analytics: false, marketing: false, operations: true, connections: false,
      team_view: true, settings: false, billing: false, reports: false,
      integrations: true,
    },
  },
  {
    name: "support_agent",
    label: "Support Agent",
    description: "Handles customer support tickets and WhatsApp messages",
    level: 50,
    permissions: {
      dashboard: true, orders: true, products: false, customers: true,
      analytics: false, marketing: false, operations: true, connections: true,
      team_view: false, settings: false, billing: false, reports: false,
      integrations: false,
    },
  },
  {
    name: "content_creator",
    label: "Content Creator",
    description: "Creates marketing content, social media posts, descriptions",
    level: 45,
    permissions: {
      dashboard: false, orders: false, products: true, customers: false,
      analytics: false, marketing: true, operations: false, connections: true,
      team_view: false, settings: false, billing: false, reports: false,
      integrations: false,
    },
  },
  {
    name: "accountant",
    label: "Accountant",
    description: "Access to financial reports, expenses, revenue analytics",
    level: 55,
    permissions: {
      dashboard: true, orders: true, products: false, customers: true,
      analytics: true, marketing: false, operations: false, connections: false,
      team_view: false, settings: false, billing: true, reports: true,
      integrations: false,
    },
  },
  {
    name: "team_lead",
    label: "Team Lead",
    description: "Leads a team, manages tasks, attendance, payroll view",
    level: 55,
    permissions: {
      dashboard: true, orders: true, products: true, customers: true,
      analytics: true, marketing: false, operations: true, connections: false,
      team_manage: true, settings: false, billing: false, reports: true,
      integrations: false,
    },
  },
  {
    name: "sales_rep",
    label: "Sales Representative",
    description: "Manages orders and customer interactions",
    level: 40,
    permissions: {
      dashboard: true, orders: true, products: true, customers: true,
      analytics: false, marketing: false, operations: false, connections: false,
      team_view: false, settings: false, billing: false, reports: false,
      integrations: false,
    },
  },
  {
    name: "inventory_clerk",
    label: "Inventory Clerk",
    description: "Manages product inventory and stock updates",
    level: 35,
    permissions: {
      dashboard: false, orders: true, products: true, customers: false,
      analytics: false, marketing: false, operations: false, connections: false,
      team_view: false, settings: false, billing: false, reports: false,
      integrations: false,
    },
  },
  {
    name: "viewer",
    label: "Viewer",
    description: "Read-only access to dashboard and reports",
    level: 20,
    permissions: {
      dashboard: true, orders: true, products: true, customers: true,
      analytics: true, marketing: true, operations: true, connections: true,
      team_view: true, settings: false, billing: false, reports: true,
      integrations: true,
    },
  },
  {
    name: "custom",
    label: "Custom Role",
    description: "Custom role with configurable permissions",
    level: 0,
    permissions: {},
  },
];

// ============================================================================
// Permission Constants
// ============================================================================

export const ALL_PERMISSION_KEYS = [
  "dashboard",
  "orders",
  "products",
  "customers",
  "analytics",
  "marketing",
  "operations",
  "connections",
  "team_manage",
  "team_view",
  "settings",
  "billing",
  "reports",
  "integrations",
  "manage_platform",
] as const;

export const PERMISSION_LABELS: Record<string, string> = {
  all: "All Access",
  manage_platform: "Manage Platform",
  dashboard: "Dashboard",
  orders: "Orders",
  products: "Products",
  customers: "Customers",
  analytics: "Analytics",
  marketing: "Marketing",
  operations: "Operations",
  connections: "Connections",
  team_manage: "Team Management",
  team_view: "View Team",
  settings: "Settings",
  billing: "Billing",
  reports: "Reports",
  integrations: "Integrations",
};

/** Get the admin email from environment (server-side only) */
export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Check if a role has a specific permission */
export function hasPermission(role: RoleDefinition | null, permission: string): boolean {
  if (!role) return false;
  if (role.permissions.all) return true;
  // Special case: platform_admin has all but manage_platform
  if (permission === "manage_platform" && role.permissions.manage_platform === false) return false;
  return role.permissions[permission] === true;
}

/** Get the role definition by name */
export function getRoleByName(name: string): RoleDefinition | undefined {
  return ROLES.find((r) => r.name === name);
}

/** Get the role definition by label */
export function getRoleByLabel(label: string): RoleDefinition | undefined {
  return ROLES.find((r) => r.label === label);
}

/** Check if a role can manage other members' roles */
export function canManageRoles(roleName: string): boolean {
  const managingRoles = ["platform_owner", "platform_admin", "brand_owner", "brand_admin", "valtriox_team"];
  return managingRoles.includes(roleName);
}

/**
 * Check if an inviter can assign a target role to someone else.
 * Returns { allowed: true } or { allowed: false, reason: string }
 *
 * Rules:
 * - Platform roles can ONLY be assigned by ADMIN_EMAIL holder
 * - No one can assign a role >= their own level
 * - Brand owners cannot assign brand_owner or brand_admin
 * - Brand admins cannot assign roles at their level or above
 */
export function canAssignRole(
  inviterRole: string,
  inviterEmail: string,
  targetRole: string,
  adminEmail: string
): { allowed: boolean; reason?: string; code?: string } {
  const PLATFORM_ROLES = ["platform_owner", "platform_admin"];
  const LEVELS: Record<string, number> = {
    platform_owner: 100, platform_admin: 95,
    brand_owner: 90, brand_admin: 80,
    operations_manager: 70, sales_manager: 65, marketing_manager: 65,
    warehouse_manager: 60, accountant: 55, team_lead: 55,
    support_agent: 50, content_creator: 45, sales_rep: 40,
    inventory_clerk: 35, viewer: 20, custom: 0,
    valtriox_team: 88, owner: 90, admin: 80, ceo: 90, manager: 70, member: 20,
  };

  const target = targetRole.toLowerCase();
  const inviter = inviterRole.toLowerCase();
  const isPlatformOwner = adminEmail && inviterEmail.toLowerCase() === adminEmail.toLowerCase();

  // Platform roles: only ADMIN_EMAIL holder
  if (PLATFORM_ROLES.includes(target)) {
    if (!isPlatformOwner) {
      return { allowed: false, reason: "Platform roles can only be assigned by the Valtriox owner.", code: "PLATFORM_ROLE_BLOCKED" };
    }
    return { allowed: true };
  }

  // Non-platform-owner cannot assign roles >= their own level
  if (!isPlatformOwner) {
    const inviterLevel = LEVELS[inviter] ?? 0;
    const targetLevel = LEVELS[target] ?? -1;

    if (targetLevel >= inviterLevel) {
      return { allowed: false, reason: `Cannot assign ${target} - it is equal to or higher than your role (${inviter}).`, code: "ROLE_HIERARCHY" };
    }

    // Brand owner extra restriction
    if (inviter === "brand_owner" || inviter === "owner" || inviter === "ceo") {
      if (targetLevel >= 80) {
        return { allowed: false, reason: "Brand owners cannot assign brand_admin or higher roles.", code: "BRAND_OWNER_LIMIT" };
      }
    }
  }

  return { allowed: true };
}

/** Check if a role is a platform-level role (includes legacy 'owner' and 'admin' for backward compat, and valtriox_team) */
export function isPlatformRole(roleName: string): boolean {
  return roleName === "platform_owner" || roleName === "platform_admin" || roleName === "owner" || roleName === "admin" || roleName === "valtriox_team";
}

/** Check if a role is read-only (viewer) */
export function isReadOnlyRole(roleName: string): boolean {
  return roleName === "viewer";
}

/** Check if a role is the platform owner (only ONE person) */
export function isPlatformOwner(roleName: string): boolean {
  return roleName === "platform_owner" || roleName === "owner"; // "owner" is legacy for first user
}

/** Check if a role is a client (business owner) or valtriox team */
export function isClientRole(roleName: string): boolean {
  return roleName === "brand_owner" || roleName === "brand_admin" || roleName === "valtriox_team";
}

/** Check if a role is a team member (not platform, not client) */
export function isTeamMemberRole(roleName: string): boolean {
  return !isPlatformRole(roleName) && !isClientRole(roleName);
}

/** Check if a role can access admin panel */
export function canAccessAdminPanel(roleName: string): boolean {
  return isPlatformRole(roleName); // Only platform roles see admin panel
}

/** Check if a role can edit billing plans */
export function canEditBillingPlans(roleName: string): boolean {
  return isPlatformRole(roleName); // Only platform owner can edit billing plans
}

/** Check if a role can set payment methods */
export function canSetPaymentMethods(roleName: string): boolean {
  return isPlatformRole(roleName); // Only platform owner can set payment methods
}

/** Check if a role can add/edit features in tabs */
export function canEditFeatures(roleName: string): boolean {
  return isPlatformRole(roleName); // Only platform owner can add/edit features
}

/** Check if a role is a brand-level owner/admin or valtriox team */
export function isBrandManager(roleName: string): boolean {
  return roleName === "brand_owner" || roleName === "brand_admin" || roleName === "valtriox_team";
}

/** Get the badge color config for a role */
export function getRoleBadgeStyle(roleName: string): {
  light: string;
  dark: string;
} {
  const styles: Record<string, { light: string; dark: string }> = {
    platform_owner: {
      light: "bg-amber-100 text-amber-800 border-amber-200",
      dark: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
    },
    platform_admin: {
      light: "bg-orange-100 text-orange-800 border-orange-200",
      dark: "bg-orange-500/15 text-orange-400 border border-orange-500/25",
    },
    brand_owner: {
      light: "bg-amber-100 text-amber-800 border-amber-200",
      dark: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
    },
    brand_admin: {
      light: "bg-yellow-100 text-yellow-800 border-yellow-200",
      dark: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25",
    },
    operations_manager: {
      light: "bg-sky-100 text-sky-800 border-sky-200",
      dark: "bg-sky-500/15 text-sky-400 border border-sky-500/25",
    },
    sales_manager: {
      light: "bg-amber-100 text-amber-800 border-amber-200",
      dark: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
    },
    marketing_manager: {
      light: "bg-pink-100 text-pink-800 border-pink-200",
      dark: "bg-pink-500/15 text-pink-400 border border-pink-500/25",
    },
    warehouse_manager: {
      light: "bg-cyan-100 text-cyan-800 border-cyan-200",
      dark: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25",
    },
    support_agent: {
      light: "bg-teal-100 text-teal-800 border-teal-200",
      dark: "bg-teal-500/15 text-teal-400 border border-teal-500/25",
    },
    content_creator: {
      light: "bg-rose-100 text-rose-800 border-rose-200",
      dark: "bg-rose-500/15 text-rose-400 border border-rose-500/25",
    },
    accountant: {
      light: "bg-amber-100 text-amber-800 border-amber-200",
      dark: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
    },
    team_lead: {
      light: "bg-blue-100 text-blue-800 border-blue-200",
      dark: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
    },
    sales_rep: {
      light: "bg-lime-100 text-lime-800 border-lime-200",
      dark: "bg-lime-500/15 text-lime-400 border border-lime-500/25",
    },
    inventory_clerk: {
      light: "bg-yellow-100 text-yellow-800 border-yellow-200",
      dark: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25",
    },
    viewer: {
      light: "bg-slate-100 text-slate-600 border-slate-200",
      dark: "bg-white/10 text-slate-400 border border-white/10",
    },
    valtriox_team: {
      light: "bg-violet-100 text-violet-800 border-violet-200",
      dark: "bg-violet-500/15 text-violet-400 border border-violet-500/25",
    },
    custom: {
      light: "bg-gray-100 text-gray-600 border-gray-200",
      dark: "bg-white/5 text-slate-500 border border-white/10",
    },
    owner: {
      light: "bg-amber-100 text-amber-800 border-amber-200",
      dark: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
    },
    manager: {
      light: "bg-blue-100 text-blue-800 border-blue-200",
      dark: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
    },
    platform_engineer: {
      light: "bg-cyan-100 text-cyan-800 border-cyan-200",
      dark: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25",
    },
    platform_support: {
      light: "bg-teal-100 text-teal-800 border-teal-200",
      dark: "bg-teal-500/15 text-teal-400 border border-teal-500/25",
    },
    platform_sales: {
      light: "bg-lime-100 text-lime-800 border-lime-200",
      dark: "bg-lime-500/15 text-lime-400 border border-lime-500/25",
    },
    platform_marketing: {
      light: "bg-pink-100 text-pink-800 border-pink-200",
      dark: "bg-pink-500/15 text-pink-400 border border-pink-500/25",
    },
    member: {
      light: "bg-slate-100 text-slate-600 border-slate-200",
      dark: "bg-white/10 text-slate-400 border border-white/10",
    },
  };
  return styles[roleName] || styles.member;
}

/** Get sidebar sections accessible by a role */
export function getAccessibleSections(roleName: string): string[] {
  const role = getRoleByName(roleName);

  // Fallback for legacy roles
  if (!role) {
    const legacyMap: Record<string, string[]> = {
      owner: ["all"],
      admin: ["all"],
      manager: ["dashboard", "orders", "products", "customers", "analytics", "team-management"],
      member: ["dashboard", "orders", "products", "customers"],
    };
    return legacyMap[roleName] || ["dashboard"];
  }

  if (role.permissions.all) {
    // Platform owner has everything including admin sections
    if (roleName === "platform_owner") return ["all"];
    // Brand-level all access does NOT include admin-dashboard or payment-approvals
    return [
      "dashboard", "orders", "products", "add-product", "categories", "inventory", "pricing-rules", "variants", "catalog", "reviews",
      "customers",
      "sales-analytics", "product-analytics", "customer-analytics", "revenue-analytics", "traffic-analytics",
      "campaigns", "seo-manager", "social-media", "email-marketing", "ad-manager", "loyalty", "seasonal-sales", "flash-sales", "influencers", "affiliates", "coupons", "marketing-calendar",
      "returns", "sla-engine", "follow-up", "support-tickets", "packaging", "shipping", "suppliers", "warehouse", "product-reviews", "team-management", "team-chat", "support-chat", "attendance", "payroll", "penalty",
      "integrations", "wa-business", "ai-tools", "whatsapp-messages", "import-export",
      "brand-settings", "user-management",
    ];
  }

  const permissionToSection: Record<string, string[]> = {
    dashboard: ["dashboard"],
    orders: ["orders"],
    products: ["products", "add-product", "categories", "inventory", "pricing-rules", "variants", "catalog", "reviews"],
    customers: ["customers"],
    analytics: ["sales-analytics", "product-analytics", "customer-analytics", "revenue-analytics", "traffic-analytics"],
    marketing: ["campaigns", "seo-manager", "social-media", "email-marketing", "ad-manager", "loyalty", "seasonal-sales", "flash-sales", "influencers", "affiliates", "coupons", "marketing-calendar"],
    operations: ["returns", "sla-engine", "follow-up", "support-tickets", "packaging", "shipping", "suppliers", "warehouse", "product-reviews", "team-management", "team-chat", "support-chat", "attendance", "payroll", "penalty"],
    connections: ["integrations", "wa-business", "ai-tools", "whatsapp-messages", "import-export"],
    settings: ["brand-settings", "user-management"],
    billing: ["subscriptions"],
    reports: ["sales-reports", "product-reports", "customer-reports"],
    integrations: ["integrations", "wa-business", "import-export"],
    team_manage: ["team-management", "attendance", "payroll", "user-management"],
    team_view: ["team-management"],
  };

  const sections: string[] = [];
  for (const [perm, secs] of Object.entries(permissionToSection)) {
    if (role.permissions[perm]) {
      sections.push(...secs);
    }
  }

  // Brand owner and brand admin get subscriptions
  if (roleName === "brand_owner" || roleName === "brand_admin") {
    if (!sections.includes("subscriptions")) sections.push("subscriptions");
  }

  return [...new Set(sections)];
}

/** Check if a specific sidebar section is accessible for a role */
export function isSectionAccessible(sectionId: string, roleName: string, hiddenSections?: string[]): boolean {
  // User Guide - always accessible to everyone (help page)
  if (sectionId === "user-guide") return true;

  // If this section is explicitly hidden for this user (per-member toggle), block it
  if (hiddenSections?.includes(sectionId)) return false;

  // ── Phase 16 rev 2: Client Inbox ──
  // "Messages from Valtriox" inbox — receives messages sent by admin from
  // the Communication Center. Every client (brand_owner, brand_admin, and
  // all their team members: operations_manager, sales_manager, etc.) must
  // be able to READ admin messages, so the inbox is visible to every
  // non-platform role. Platform roles (platform_owner, platform_admin) and
  // valtriox_team use the Communication Center instead — they don't need
  // the client inbox. This rule applies to BOTH existing clients and new
  // signups (new signups get brand_owner automatically in /api/auth/register).
  if (sectionId === "client-inbox") {
    return !isPlatformRole(roleName) && roleName !== "valtriox_team";
  }

  // Platform-only sections - only visible to platform_owner, platform_admin, owner (first user), and valtriox_team
  if (["admin-dashboard", "client-management", "payment-approvals", "subscription-management", "audit-log", "platform-settings", "integration-management", "valtriox-team", "proposals", "documents", "lead-magnet-manager", "custom-invoices", "reports-center", "invoice-management"].includes(sectionId)) {
    return isPlatformRole(roleName) || roleName === "valtriox_team";
  }

  // Client-only sections - NOT accessible to platform roles (admin uses admin panel, not team chat)
  // Team Chat is for brand owners and their team members, NOT for the platform admin
  if (sectionId === "team-chat") {
    return !isPlatformRole(roleName);
  }

  // Subscriptions: visible to platform roles, brand owners/admins
  // But brand owners can only VIEW their own subscription, not edit plans
  if (sectionId === "subscriptions") {
    return ["platform_owner", "platform_admin", "owner", "brand_owner", "brand_admin"].includes(roleName);
  }

  const accessible = getAccessibleSections(roleName);
  if (accessible.includes("all")) return true;
  return accessible.includes(sectionId);
}

// ============================================================================
// Valtriox Team Page Restrictions
// ============================================================================

/** Pages that Valtriox team cannot access - show security message instead */
export const VALTRIOX_TEAM_RESTRICTED_PAGES = new Set([
  "account-settings",
  "privacy",
  "security",
]);

/** Check if a page is restricted for Valtriox team */
export function isValtrioxTeamRestrictedPage(pageId: string, roleName: string): boolean {
  return roleName === "valtriox_team" && VALTRIOX_TEAM_RESTRICTED_PAGES.has(pageId);
}

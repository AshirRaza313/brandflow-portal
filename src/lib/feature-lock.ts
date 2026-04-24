// ============================================================================
// Subscription-Based Feature Locking System
// ============================================================================
// Features available per plan:
//   "starter"    = free forever plan
//   "growth"     = Rs 4,999/month
//   "enterprise" = Rs 14,999/month
//   "trial"      = trial (14 days) — same access as growth
// ============================================================================
// Platform Owner (owner / platform_owner / platform_admin) BYPASSES all locks.
// Brand Owner (brand_owner) and their team see locks based on their plan.
//
// IMPORTANT: Team members AUTOMATICALLY inherit the brand owner's plan features.
// The subscription is per-organization, not per-user. When a brand owner buys
// Growth plan, ALL team members in that organization get Growth-level access.
// Team members do NOT need their own subscription. The only limit is the
// number of team members allowed by the plan:
//   Starter: 3 members | Growth: 15 members | Enterprise: unlimited
// ============================================================================

export interface FeatureLock {
  id: string;
  label: string;
  minPlan: "starter" | "growth" | "enterprise";
  locked?: boolean; // Admin can toggle this to lock/unlock per feature
}

// Features locked for specific plans
export const FEATURE_LOCKS: FeatureLock[] = [
  // ── Growth-only features ──
  { id: "campaigns", label: "Campaigns", minPlan: "growth" },
  { id: "seo-manager", label: "SEO Manager", minPlan: "growth" },
  { id: "social-media", label: "Social Media", minPlan: "growth" },
  { id: "email-marketing", label: "Email Marketing", minPlan: "growth" },
  { id: "ad-manager", label: "Ad Manager", minPlan: "growth" },
  { id: "influencers", label: "Influencers", minPlan: "growth" },
  { id: "affiliates", label: "Affiliates", minPlan: "growth" },
  { id: "marketing-calendar", label: "Marketing Calendar", minPlan: "growth" },
  { id: "wa-business", label: "WA Business API", minPlan: "growth" },
  { id: "ai-tools", label: "AI Tools", minPlan: "growth" },
  { id: "import-export", label: "Import/Export", minPlan: "growth" },
  { id: "revenue-analytics", label: "Revenue Analytics", minPlan: "growth" },
  { id: "traffic-analytics", label: "Traffic Analytics", minPlan: "growth" },

  // ── Enterprise-only features ──
  { id: "integrations", label: "Custom Integrations", minPlan: "enterprise" },
  { id: "sla-engine", label: "SLA Engine", minPlan: "enterprise" },
  { id: "support-tickets", label: "Support Tickets", minPlan: "enterprise" },
  { id: "warehouse", label: "Warehouse Management", minPlan: "enterprise" },
  { id: "audit-log", label: "Audit Log", minPlan: "enterprise" },
];

// Plan hierarchy — higher number = more features unlocked
export const PLAN_LEVELS: Record<string, number> = {
  starter: 0,
  growth: 1,
  enterprise: 2,
  trial: 1, // Trial has growth-level access
};

// Roles that bypass ALL feature locks (platform-level roles)
const BYPASS_ROLES = new Set(["platform_owner", "platform_admin", "owner"]);

/** Check if a role bypasses feature locks (is a platform-level role) */
export function isPlatformBypassRole(roleName: string): boolean {
  return BYPASS_ROLES.has(roleName);
}

/** Check if a specific feature is available for the given plan (no role check) */
export function isFeatureAvailable(featureId: string, currentPlan: string): boolean {
  const lock = FEATURE_LOCKS.find((f) => f.id === featureId);
  if (!lock) return true; // Not locked = always available

  const currentLevel = PLAN_LEVELS[currentPlan] ?? 0;
  const requiredLevel = PLAN_LEVELS[lock.minPlan] ?? 0;

  return currentLevel >= requiredLevel;
}

/**
 * Role-aware feature check — platform roles bypass ALL locks.
 * Use this in UI components where user role is available.
 */
export function isFeatureAvailableForRole(
  featureId: string,
  currentPlan: string,
  userRole: string
): boolean {
  // Platform roles bypass ALL feature locks
  if (BYPASS_ROLES.has(userRole)) return true;
  return isFeatureAvailable(featureId, currentPlan);
}

/** Get the feature lock definition for a feature ID */
export function getFeatureLock(featureId: string): FeatureLock | undefined {
  return FEATURE_LOCKS.find((f) => f.id === featureId);
}

/** Get all features locked for a given plan */
export function getLockedFeatures(currentPlan: string): FeatureLock[] {
  const currentLevel = PLAN_LEVELS[currentPlan] ?? 0;
  return FEATURE_LOCKS.filter((f) => (PLAN_LEVELS[f.minPlan] ?? 0) > currentLevel);
}

/** Get features by plan tier */
export function getFeaturesByPlan(plan: "growth" | "enterprise"): FeatureLock[] {
  return FEATURE_LOCKS.filter((f) => f.minPlan === plan);
}

/** Get human-readable plan name */
export function getPlanDisplayName(plan: string): string {
  const names: Record<string, string> = {
    starter: "Starter",
    growth: "Growth",
    enterprise: "Enterprise",
    trial: "Trial",
  };
  return names[plan] || plan;
}

/** Check if a feature is available considering admin overrides */
export function isFeatureAvailableWithOverrides(
  featureId: string,
  currentPlan: string,
  userRole: string,
  adminLockedFeatures?: Set<string>
): boolean {
  // Platform roles bypass ALL locks
  if (BYPASS_ROLES.has(userRole)) return true;

  // Admin-locked features are locked for everyone except platform roles
  if (adminLockedFeatures?.has(featureId)) return false;

  return isFeatureAvailable(featureId, currentPlan);
}

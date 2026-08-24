import type { AuthContext } from "@/lib/auth-middleware";
import { db, withRetry } from "@/lib/db";
import { getRoleByName, type RolePermission } from "@/lib/roles";

export type TeamPermission = "team_view" | "team_manage";

export type TeamAccess = {
  allowed: boolean;
  canView: boolean;
  canManage: boolean;
  isPlatform: boolean;
  role: string | null;
  level: number;
  membershipId: string | null;
  organizationId: string;
  reason?: "NO_ORGANIZATION" | "ORGANIZATION_UNAVAILABLE" | "CROSS_ORG" | "NO_MEMBERSHIP" | "INVALID_ROLE" | "PENALTY_ACTIVE" | "SECTION_HIDDEN";
};

export type TeamRoleTarget = {
  name: string;
  level: number;
  roleId: string | null;
};

export type TeamPolicyResult =
  | { allowed: true }
  | { allowed: false; status: 400 | 403; code: string; reason: string };

const ACTIVE_PLATFORM_TEAM_ROLES = new Set([
  "platform_owner",
  "platform_admin",
  "platform_engineer",
  "platform_support",
  "platform_sales",
  "platform_marketing",
  "valtriox_team",
]);

const PLATFORM_TEAM_GRANTS: Record<string, { canView: boolean; canManage: boolean; level: number }> = {
  platform_owner: { canView: true, canManage: true, level: 100 },
  platform_admin: { canView: true, canManage: true, level: 95 },
  // Legacy VTM identity remains supported only when backed by an active VTM row.
  valtriox_team: { canView: true, canManage: true, level: 88 },
  platform_engineer: { canView: false, canManage: false, level: 0 },
  platform_support: { canView: false, canManage: false, level: 0 },
  platform_sales: { canView: false, canManage: false, level: 0 },
  platform_marketing: { canView: false, canManage: false, level: 0 },
};

/**
 * Roles that must never be granted through an organization endpoint.
 * The legacy aliases are included because they historically inherited
 * owner/admin privileges and are not valid new assignments.
 */
const PROTECTED_TEAM_ROLES = new Set([
  "valtriox_team",
  "owner",
  "admin",
  "ceo",
]);

const LEGACY_ORGANIZATION_ROLE_MAP: Record<string, string> = {
  owner: "brand_owner",
  ceo: "brand_owner",
  admin: "brand_admin",
  manager: "operations_manager",
  editor: "content_creator",
  member: "viewer",
};

const ASSIGNABLE_BUILT_IN_ROLES = new Set([
  "brand_owner",
  "brand_admin",
  "operations_manager",
  "sales_manager",
  "marketing_manager",
  "warehouse_manager",
  "accountant",
  "team_lead",
  "support_agent",
  "content_creator",
  "sales_rep",
  "inventory_clerk",
  "viewer",
]);

function normalizeRole(role: string): string {
  return role.trim().toLowerCase();
}

function parsePermissions(value: string): RolePermission | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    if (!Object.values(parsed).every((permission) => typeof permission === "boolean")) return null;
    return parsed as RolePermission;
  } catch {
    return null;
  }
}

function permissionFlags(permissions: RolePermission | null): { canView: boolean; canManage: boolean } {
  if (!permissions) return { canView: false, canManage: false };
  const canManage = permissions.all === true || permissions.team_manage === true;
  const canView = canManage || permissions.team_view === true;
  return { canView, canManage };
}

function hiddenTeamSections(value: string | null | undefined): Set<string> {
  if (!value) return new Set();
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
      return new Set(["*"]);
    }
    return new Set(parsed);
  } catch {
    return new Set(["*"]);
  }
}

export function isProtectedTeamRole(role: string): boolean {
  const normalized = normalizeRole(role);
  return normalized.startsWith("platform_") || PROTECTED_TEAM_ROLES.has(normalized);
}

function isPlatformMembershipRole(role: string): boolean {
  const normalized = normalizeRole(role);
  return normalized.startsWith("platform_") || normalized === "valtriox_team";
}

export function isOwnerMembershipRole(role: string): boolean {
  return ["brand_owner", "owner", "ceo"].includes(normalizeRole(role));
}

function deniedAccess(
  organizationId: string,
  reason: TeamAccess["reason"],
  role: string | null = null,
): TeamAccess {
  return {
    allowed: false,
    canView: false,
    canManage: false,
    isPlatform: false,
    role,
    level: 0,
    membershipId: null,
    organizationId,
    reason,
  };
}

/**
 * Resolve team permissions from current database rows on every request.
 * Auth/session roles are deliberately never an authorization source.
 */
export async function resolveTeamAccess(
  authCtx: AuthContext,
  organizationId: string,
  client: Pick<typeof db, "organization" | "valtrioxTeamMember" | "organizationMember"> = db,
): Promise<TeamAccess> {
  if (!organizationId) return deniedAccess(organizationId, "NO_ORGANIZATION");

  const query = <T>(operation: () => Promise<T>): Promise<T> =>
    client === db ? withRetry(operation, 2, 500) : operation();

  const organization = await query(
    async () => client.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, isActive: true, isBanned: true },
    }),
  );
  if (!organization || !organization.isActive || organization.isBanned) {
    return deniedAccess(organizationId, "ORGANIZATION_UNAVAILABLE");
  }

  const [activeVtm, membership] = await Promise.all([
    query(async () => client.valtrioxTeamMember.findFirst({
      where: { userId: authCtx.userId, status: "active" },
      select: { role: true, visibleSections: true },
    })),
    query(async () => client.organizationMember.findFirst({
      where: { organizationId, userId: authCtx.userId },
      select: {
        id: true,
        role: true,
        penaltyUntil: true,
        roleDef: { select: { name: true, permissions: true, level: true } },
      },
    })),
  ]);

  if (membership?.penaltyUntil && membership.penaltyUntil > new Date()) {
    return deniedAccess(organizationId, "PENALTY_ACTIVE", membership.role);
  }

  if (activeVtm) {
    const role = normalizeRole(activeVtm.role);
    if (!ACTIVE_PLATFORM_TEAM_ROLES.has(role)) {
      return deniedAccess(organizationId, "INVALID_ROLE", role);
    }

    const hidden = hiddenTeamSections(activeVtm.visibleSections);
    if (hidden.has("*") || hidden.has("team-management") || hidden.has("user-management")) {
      return deniedAccess(organizationId, "SECTION_HIDDEN", role);
    }
    const grant = PLATFORM_TEAM_GRANTS[role];
    const flags = { canView: grant.canView, canManage: grant.canManage };
    return {
      allowed: flags.canView,
      ...flags,
      isPlatform: true,
      role,
      level: grant.level,
      membershipId: null,
      organizationId,
      reason: flags.canView ? undefined : "INVALID_ROLE",
    };
  }

  // A normal organization member is only authorized inside the organization
  // selected by the authenticated session. Membership in some other org is not
  // an implicit context switch.
  if (!authCtx.organizationId || authCtx.organizationId !== organizationId) {
    return deniedAccess(organizationId, "CROSS_ORG");
  }

  if (!membership) return deniedAccess(organizationId, "NO_MEMBERSHIP");

  const storedRole = normalizeRole(membership.role);
  // A stale OrganizationMember platform role must never replace a revoked VTM.
  if (isPlatformMembershipRole(storedRole)) {
    return deniedAccess(organizationId, "INVALID_ROLE", storedRole);
  }
  const role = LEGACY_ORGANIZATION_ROLE_MAP[storedRole] ?? storedRole;
  const builtInRole = getRoleByName(role);
  const matchedCustomRole =
    !builtInRole && membership.roleDef && normalizeRole(membership.roleDef.name) === storedRole
      ? membership.roleDef
      : null;
  const permissions = matchedCustomRole
    ? parsePermissions(matchedCustomRole.permissions)
    : builtInRole?.permissions ?? null;
  const flags = permissionFlags(permissions);
  const level = matchedCustomRole?.level ?? builtInRole?.level ?? 0;

  return {
    allowed: flags.canView,
    ...flags,
    isPlatform: false,
    role,
    level,
    membershipId: membership.id,
    organizationId,
    reason: flags.canView ? undefined : "INVALID_ROLE",
  };
}

export function requireTeamPermission(
  access: TeamAccess,
  permission: TeamPermission,
): TeamPolicyResult {
  const allowed = permission === "team_manage" ? access.canManage : access.canView;
  if (allowed) return { allowed: true };
  return {
    allowed: false,
    status: 403,
    code: access.reason === "PENALTY_ACTIVE" ? "PENALTY_ACTIVE" : "TEAM_PERMISSION_DENIED",
    reason: permission === "team_manage"
      ? "You do not have permission to manage team members"
      : "You do not have permission to view team members",
  };
}

export function resolveBuiltInRoleTarget(roleName: string): TeamRoleTarget | null {
  const name = normalizeRole(roleName);
  if (!ASSIGNABLE_BUILT_IN_ROLES.has(name)) return null;
  const definition = getRoleByName(name);
  if (!definition) return null;
  return { name, level: definition.level, roleId: null };
}

export function resolveDatabaseRoleTarget(role: {
  id: string;
  name: string;
  level: number;
  permissions: string;
}): TeamRoleTarget | null {
  const name = normalizeRole(role.name);
  if (isProtectedTeamRole(name)) return null;
  if (!/^[a-z][a-z0-9_]{1,49}$/.test(name)) return null;
  if (!Number.isInteger(role.level) || role.level < 0 || role.level >= 90) return null;
  if (!parsePermissions(role.permissions)) return null;

  const builtIn = getRoleByName(name);
  // Built-in names must use roleName. A DB Role collision could otherwise
  // smuggle custom permissions behind a low built-in hierarchy level.
  if (builtIn) return null;
  return {
    name,
    level: role.level,
    roleId: role.id,
  };
}

export function evaluateRoleAssignment(
  access: TeamAccess,
  target: TeamRoleTarget,
): TeamPolicyResult {
  const permission = requireTeamPermission(access, "team_manage");
  if (!permission.allowed) return permission;

  if (isProtectedTeamRole(target.name)) {
    return {
      allowed: false,
      status: 403,
      code: "PLATFORM_ROLE_BLOCKED",
      reason: "Platform and legacy privileged roles cannot be assigned through organization endpoints",
    };
  }

  if (access.isPlatform) return { allowed: true };

  if (target.level >= access.level) {
    return {
      allowed: false,
      status: 403,
      code: "ROLE_HIERARCHY_VIOLATION",
      reason: `You cannot assign ${target.name} because it is equal to or higher than your role`,
    };
  }

  if (access.role === "brand_owner" && target.level >= 80) {
    return {
      allowed: false,
      status: 403,
      code: "BRAND_OWNER_ROLE_LIMIT",
      reason: "Brand owners cannot assign brand_admin or higher roles",
    };
  }

  if (access.role === "brand_admin" && target.level >= 60) {
    return {
      allowed: false,
      status: 403,
      code: "BRAND_ADMIN_ROLE_LIMIT",
      reason: "Brand admins can only assign roles below manager level",
    };
  }

  return { allowed: true };
}

export function evaluateExistingTarget(
  access: TeamAccess,
  target: { role: string; roleDef?: { name: string; level: number } | null },
): TeamPolicyResult {
  const storedRole = normalizeRole(target.role);
  if (isPlatformMembershipRole(storedRole)) {
    return {
      allowed: false,
      status: 403,
      code: "PLATFORM_ROLE_BLOCKED",
      reason: "Platform and legacy privileged memberships cannot be changed through organization endpoints",
    };
  }

  if (access.isPlatform) return { allowed: true };
  const role = LEGACY_ORGANIZATION_ROLE_MAP[storedRole] ?? storedRole;
  const builtInRole = getRoleByName(role);
  const matchedRole = !builtInRole && target.roleDef && normalizeRole(target.roleDef.name) === storedRole
    ? target.roleDef
    : null;
  const targetLevel = builtInRole?.level ?? matchedRole?.level;
  if (targetLevel === undefined || targetLevel >= access.level) {
    return {
      allowed: false,
      status: 403,
      code: "TARGET_ROLE_HIERARCHY",
      reason: "You cannot manage a member whose role is equal to or higher than your role",
    };
  }

  return { allowed: true };
}

export function policyResponseBody(result: Exclude<TeamPolicyResult, { allowed: true }>) {
  return { error: result.reason, code: result.code };
}

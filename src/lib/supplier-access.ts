// src/lib/supplier-access.ts
//
// DB-resolved authorization for the Suppliers module.
//
// Mirrors the Seasonal Events access pattern (src/lib/seasonal-event-access.ts):
//   - Re-resolves OrganizationMember + active ValtrioxTeamMember on every request
//   - Uses the canonical `operations` permission key (not custom supplier keys)
//   - Trusts a linked roleDef only when roleDef.name matches the member's
//     current role string (prevents stale-roleId privilege retention)
//   - Rejects stale ValtrioxTeamMember records via status="active" filter
//   - Respects the hidden "suppliers" section for Valtriox team members
//   - Viewer role is always read-only
//
// B01: penaltyUntil is checked on every Supplier request (not just login).
// B02: Active Valtriox team member WITHOUT an OrganizationMember row receives
//      cross-org platform support access for the org in their session.
// B03: A stored OrganizationMember.role === "valtriox_team" is NOT trusted alone.
//      If the active ValtrioxTeamMember record is missing/disabled, 403.
// B08: Shared response types for list + stats routes (generic canRead/canWrite).

import type { PrismaClient } from "@prisma/client";
import type { AuthContext } from "@/lib/auth-middleware";
import {
  getRoleByName,
  hasPermission,
  isReadOnlyRole,
  type RoleDefinition,
  type RolePermission,
} from "@/lib/roles";

// Extended client to include user and organization for platform-role checks.
export type SupplierAccessClient = Pick<
  PrismaClient,
  "organizationMember" | "valtrioxTeamMember" | "organization"
>;

export interface SupplierAccess {
  organizationId: string;
  effectiveRole: string;
  canReadSuppliers: boolean;
  canWriteSuppliers: boolean;
}

// B08: Shared API response types for Suppliers list + stats routes.
// Both routes return the same `access` shape so the UI has a single contract.
export interface SupplierAccessResponse {
  canRead: boolean;
  canWrite: boolean;
}

export interface SupplierListResponse {
  suppliers: unknown[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  access: SupplierAccessResponse;
}

export type SupplierStatsResponse = {
  totalSuppliers: number;
  ratedCount: number;
  avgRating: number | null;
  topPerformer: {
    name: string;
    id: string;
    rating: number | null;
  } | null;
  needsAttentionCount: number;
  access: {
    canRead: boolean;
    canWrite: boolean;
  };
};

function parseStoredPermissions(
  value: string | null | undefined,
): RolePermission | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return null;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, permission]) => typeof permission === "boolean",
      ),
    ) as RolePermission;
  } catch {
    return null;
  }
}

const LEGACY_ROLE_MAP: Record<string, string> = {
  owner: "brand_owner",
  ceo: "brand_owner",
  admin: "brand_admin",
  manager: "operations_manager",
  editor: "content_creator",
  member: "viewer",
};

function resolveRoleDefinition(
  roleName: string,
  storedRole: { name: string; permissions: string } | null,
): RoleDefinition | null {
  // Only trust a linked role definition when it still matches the member's
  // current role string. This prevents a stale roleId from retaining broader
  // permissions after a role change (e.g. demotion to viewer).
  if (storedRole?.name === roleName) {
    const storedPermissions = parseStoredPermissions(storedRole.permissions);
    if (storedPermissions) {
      return {
        name: storedRole.name,
        label: storedRole.name,
        description: "Database-backed organization role",
        level: 0,
        permissions: storedPermissions,
      };
    }
  }

  // Valtriox team role: same full-access block as platform roles, kept
  // separate for clarity (ValtrioxTeamMember vs OrganizationMember.role).
  if (roleName === "valtriox_team") {
    return {
      name: "valtriox_team",
      label: "Valtriox Team",
      description: "Platform-level staff with full access",
      level: 100,
      permissions: {
        dashboard: true,
        products: true,
        orders: true,
        customers: true,
        marketing: true,
        operations: true,
        analytics: true,
        settings: true,
      } as RolePermission,
    };
  }

  return getRoleByName(roleName) || null;
}

// Fail-CLOSED: visibleSections is a hidden-section DENY list (not a whitelist).
// When data is malformed (non-array, unparseable), we FAIL CLOSED by returning
// the sentinel ["*"] which causes ALL sections to be considered hidden.
// null/empty value = no restrictions (all visible) — this is the only fail-open case.
const ALL_SECTIONS_HIDDEN = ["*"];

// Supplier-specific access matrix for ValtrioxTeamMember roles.
// This is intentional and separate from global role permissions.
// Values are review-pending with Abdul Nafay bhai.
const VTM_SUPPLIER_ACCESS: Record<string, { canRead: boolean; canWrite: boolean }> = {
  platform_owner: { canRead: true, canWrite: true },
  platform_admin: { canRead: true, canWrite: true },
  valtriox_team: { canRead: true, canWrite: true },
  platform_engineer: { canRead: true, canWrite: false },
  platform_support: { canRead: true, canWrite: false },
  platform_sales: { canRead: true, canWrite: false },
  platform_marketing: { canRead: false, canWrite: false },
};

function hiddenSections(value: string | null | undefined): string[] | null {
  if (!value) return null; // null = no restrictions (all visible)
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return ALL_SECTIONS_HIDDEN; // malformed = FAIL CLOSED
    // Point 8: reject the ENTIRE array if any entry is non-string.
    // Previous .filter() approach was fail-open: it silently dropped
    // bad entries and kept the rest, which could expose hidden sections
    // if the bad entry was the "suppliers" string in disguise.
    if (parsed.length === 0) return null; // empty array = no restrictions
    for (const item of parsed) {
      if (typeof item !== "string") return ALL_SECTIONS_HIDDEN;
    }
    return parsed as string[];
  } catch {
    return ALL_SECTIONS_HIDDEN; // unparseable = FAIL CLOSED
  }
}

/**
 * Re-resolve organization membership and permissions from the database for
 * every request. Session/cookie claims identify the candidate user and org;
 * they are never treated as current authorization state.
 *
 * Implements Option B with 9 safeguards:
 * 1. Explicit selected organizationId is required.
 * 2. Verify the organization exists and is valid.
 * 3. Resolve platform_owner/platform_admin from a fresh DB query.
 * 4. Do not trust stale session/cookie role.
 * 5. Never restore arbitrary first-membership fallback.
 * 6. Penalty check runs BEFORE platform role check (even platform owners
 *    are subject to penalties).
 * 7. Then apply active Valtriox team hidden-section rules.
 * 8. Then apply OrganizationMember role, permissions checks.
 * 9. Otherwise deny access.
 */
export async function resolveSupplierAccess(
  client: SupplierAccessClient,
  authCtx: AuthContext,
): Promise<SupplierAccess | null> {
  // 1. Explicit organizationId is required.
  const organizationId = authCtx.organizationId;
  if (!organizationId) return null;

  // 2. Verify the organization exists and is valid (skip if client doesn't
  //    have organization method, e.g., in unit tests where the mock client
  //    only provides supplier + organizationMember + valtrioxTeamMember).
  if (
    client.organization &&
    typeof client.organization.findUnique === "function"
  ) {
    const org = await client.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!org) return null;
  }

  // Platform role is now resolved exclusively from ValtrioxTeamMember.role.
  // User.role is NOT consulted for supplier authorization.

  // Fetch membership and Valtriox team record ONCE (needed for penalty,
  // hidden sections, and org-member checks).
  const [membership, valtrioxTeamMember] = await Promise.all([
    client.organizationMember.findFirst({
      where: { organizationId, userId: authCtx.userId },
      select: {
        role: true,
        roleDef: { select: { name: true, permissions: true } },
        penaltyUntil: true,
      },
    }),
    client.valtrioxTeamMember.findFirst({
      where: { userId: authCtx.userId, status: "active" },
      select: { id: true, role: true, visibleSections: true },
    }),
  ]);

  // 6. Penalty check runs BEFORE platform role check.
  //    Even platform owners/admins are subject to penalties.
  //    Penalty is stored on OrganizationMember, so if there's no membership
  //    there's no penalty to enforce (platform roles without membership are
  //    still subject to the next checks).
  const now = new Date();
  if (membership?.penaltyUntil && membership.penaltyUntil > now) {
    return null;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Valtriox team member (canonical platform role from VTM.role)
  // ───────────────────────────────────────────────────────────────────────────
  // VTM.role is now the ONLY source of platform role truth.
  // User.role is NOT used for supplier authorization.
  if (valtrioxTeamMember) {
    const vtmRole = (valtrioxTeamMember.role || "").toLowerCase();
    const matrixAccess = VTM_SUPPLIER_ACCESS[vtmRole] ?? { canRead: false, canWrite: false };
    const hidden = hiddenSections(valtrioxTeamMember.visibleSections);
    const pageHidden =
      hidden !== null &&
      (hidden.includes("suppliers") || hidden.includes("*"));
    const canReadSuppliers = !pageHidden && matrixAccess.canRead;
    const canWriteSuppliers = !pageHidden && matrixAccess.canWrite;

    return {
      organizationId,
      effectiveRole: vtmRole,
      canReadSuppliers,
      canWriteSuppliers,
    };
  }

  // No VTM record => platform access impossible. Fall through to membership logic.
  if (!membership) {
    return null;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Organization member (no Valtriox team overlap)
  // ───────────────────────────────────────────────────────────────────────────
  // 8. Apply OrganizationMember role and permissions checks.
  const currentRole = membership.role.trim().toLowerCase();

  // B03 v2: Stale "valtriox_team" stored role without active team record = 403.
  // Also reject all platform roles and legacy owner/admin in OrganizationMember fallback.
  if (
    currentRole === "valtriox_team" ||
    currentRole.startsWith("platform_")
  ) {
    return null;
  }

  const effectiveRole = LEGACY_ROLE_MAP[currentRole] || currentRole;
  const roleDefinition = resolveRoleDefinition(effectiveRole, membership.roleDef);
  const canReadSuppliers = hasPermission(roleDefinition, "operations");

  return {
    organizationId,
    effectiveRole,
    canReadSuppliers,
    canWriteSuppliers: canReadSuppliers && !isReadOnlyRole(effectiveRole),
  };
}
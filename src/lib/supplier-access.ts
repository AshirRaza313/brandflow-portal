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

export type SupplierAccessClient = Pick<
  PrismaClient,
  "organizationMember" | "valtrioxTeamMember"
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

export interface SupplierStatsResponse {
  totalSuppliers: number;
  activeSuppliers: number;
  ratedCount: number;
  avgRating: number | null;
  topPerformer: { id: string; name: string; rating: number | null } | null;
  needsAttentionCount: number;
  access: SupplierAccessResponse;
}

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

function hiddenSections(value: string | null | undefined): string[] | null {
  if (!value) return null; // null = no restrictions (all visible)
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return ALL_SECTIONS_HIDDEN; // malformed = FAIL CLOSED
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return ALL_SECTIONS_HIDDEN; // unparseable = FAIL CLOSED
  }
}

/**
 * Re-resolve organization membership and permissions from the database for
 * every request. Session/cookie claims identify the candidate user and org;
 * they are never treated as current authorization state.
 */
export async function resolveSupplierAccess(
  client: SupplierAccessClient,
  authCtx: AuthContext,
): Promise<SupplierAccess | null> {
  // Organization context MUST come from the authenticated session (cookie or
  // NextAuth). We do NOT fall back to OrganizationMember.findFirst({ userId })
  // because that is unsafe for multi-organization users (arbitrary org select).
  // If organizationId is missing, deny access.
  const organizationId = authCtx.organizationId;
  if (!organizationId) return null;

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
      select: { id: true, visibleSections: true },
    }),
  ]);

  // B02: Active Valtriox team member WITHOUT an OrganizationMember row.
  if (!membership) {
    if (valtrioxTeamMember) {
      const hidden = hiddenSections(valtrioxTeamMember.visibleSections);
      // Fail-CLOSED: malformed visibleSections returns ["*"] sentinel, hiding all.
      const pageHidden = hidden !== null && (hidden.includes("suppliers") || hidden.includes("*"));
      const canReadSuppliers = !pageHidden;
      return {
        organizationId,
        effectiveRole: "valtriox_team",
        canReadSuppliers,
        canWriteSuppliers: canReadSuppliers,
      };
    }
    return null;
  }

  // B01: Per-request penalty check from DB.
  const now = new Date();
  if (membership.penaltyUntil && membership.penaltyUntil > now) {
    return null;
  }

  const currentRole = membership.role.trim().toLowerCase();

  // B03 v2: Stale "valtriox_team" stored role without active team record = 403.
  if (currentRole === "valtriox_team" && !valtrioxTeamMember) {
    return null;
  }

  const effectiveRole = valtrioxTeamMember
    ? "valtriox_team"
    : LEGACY_ROLE_MAP[currentRole] || currentRole;
  const roleDefinition = resolveRoleDefinition(
    effectiveRole,
    valtrioxTeamMember ? null : membership.roleDef,
  );
  const hidden = valtrioxTeamMember
    ? hiddenSections(valtrioxTeamMember.visibleSections)
    : null;
  // Fail-CLOSED: malformed visibleSections returns ["*"] sentinel, hiding all.
  const pageHidden = hidden !== null && (hidden.includes("suppliers") || hidden.includes("*"));
  const canReadSuppliers =
    !pageHidden && hasPermission(roleDefinition, "operations");

  return {
    organizationId,
    effectiveRole,
    canReadSuppliers,
    canWriteSuppliers: canReadSuppliers && !isReadOnlyRole(effectiveRole),
  };
}
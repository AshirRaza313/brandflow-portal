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
//      An actively penalized user receives 403 for list/get/POST/PATCH/DELETE/stats.
// B02: Active Valtriox team member WITHOUT an OrganizationMember row receives
//      cross-org platform support access for the org in their session.
// B03: A stored OrganizationMember.role === "valtriox_team" is NOT trusted alone.
//      If the active ValtrioxTeamMember record is missing/disabled, the user
//      receives 403 (no demotion to Viewer — "valtriox_team" is a platform role,
//      not an organization role, so there is no fallback org role to use).

import type { PrismaClient } from "@prisma/client";
import type { AuthContext } from "@/lib/auth-middleware";
import {
  getRoleByName,
  hasPermission,
  isReadOnlyRole,
  type RoleDefinition,
  type RolePermission,
} from "@/lib/roles";

type SupplierAccessClient = Pick<
  PrismaClient,
  "organizationMember" | "valtrioxTeamMember"
>;

export interface SupplierAccess {
  organizationId: string;
  effectiveRole: string;
  canReadSuppliers: boolean;
  canWriteSuppliers: boolean;
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
    );
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

  return getRoleByName(roleName) || null;
}

function hiddenSections(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * Re-resolve organization membership and permissions from the database for
 * every request. Session/cookie claims identify the candidate user and org;
 * they are never treated as current authorization state.
 *
 * Returns null when:
 *   - authCtx has no organizationId
 *   - no OrganizationMember row exists AND no active ValtrioxTeamMember record
 *
 * B01: penaltyUntil is checked per-request from the DB (not from session).
 *      An active penalty denies all Supplier access.
 * B02: An active ValtrioxTeamMember without an OrganizationMember row still
 *      gets platform-team access to the org in their session.
 * B03: A stored role of "valtriox_team" without an active ValtrioxTeamMember
 *      record returns null (403). No Viewer demotion — see header comment.
 */
export async function resolveSupplierAccess(
  client: SupplierAccessClient,
  authCtx: AuthContext,
): Promise<SupplierAccess | null> {
  const organizationId = authCtx.organizationId;
  if (!organizationId) return null;

  const [membership, valtrioxTeamMember] = await Promise.all([
    client.organizationMember.findFirst({
      where: { organizationId, userId: authCtx.userId },
      select: {
        role: true,
        roleDef: { select: { name: true, permissions: true } },
        penaltyUntil: true, // B01: per-request penalty check
      },
    }),
    client.valtrioxTeamMember.findFirst({
      where: { userId: authCtx.userId, status: "active" },
      select: { id: true, visibleSections: true },
    }),
  ]);

  // B02: Active Valtriox team member WITHOUT an OrganizationMember row.
  // Cross-org platform support access — grant team role for the org in session.
  if (!membership) {
    if (valtrioxTeamMember) {
      const pageHidden = hiddenSections(
        valtrioxTeamMember.visibleSections,
      ).includes("suppliers");
      const canReadSuppliers = !pageHidden;
      return {
        organizationId,
        effectiveRole: "valtriox_team",
        canReadSuppliers,
        canWriteSuppliers: canReadSuppliers, // platform team has full write
      };
    }
    return null;
  }

  // B01: Per-request penalty check from DB.
  // An actively penalized user is denied all Supplier access (read & write).
  const now = new Date();
  if (membership.penaltyUntil && membership.penaltyUntil > now) {
    return null;
  }

  const currentRole = membership.role.trim().toLowerCase();

  // B03 v2: Stale "valtriox_team" stored role without an active team record.
  // "valtriox_team" is a platform role, NOT an organization role. If the
  // active ValtrioxTeamMember record is missing/disabled, the user has no
  // legitimate authorization path — deny access entirely (403).
  // (Previous behavior demoted to read-only Viewer, which granted unintended
  //  read access to a user with no valid role. Expert review flagged this.)
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
  const pageHidden = valtrioxTeamMember
    ? hiddenSections(valtrioxTeamMember.visibleSections).includes("suppliers")
    : false;
  const canReadSuppliers =
    !pageHidden && hasPermission(roleDefinition, "operations");

  return {
    organizationId,
    effectiveRole,
    canReadSuppliers,
    canWriteSuppliers: canReadSuppliers && !isReadOnlyRole(effectiveRole),
  };
}
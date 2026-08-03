import type { PrismaClient } from "@prisma/client";
import type { AuthContext } from "@/lib/auth-middleware";
import {
  getRoleByName,
  hasPermission,
  isReadOnlyRole,
  type RoleDefinition,
  type RolePermission,
} from "@/lib/roles";

type SeasonalEventAccessClient = Pick<
  PrismaClient,
  "organizationMember" | "valtrioxTeamMember"
>;

export interface SeasonalEventAccess {
  organizationId: string;
  effectiveRole: string;
  canReadMarketing: boolean;
  canManageMarketing: boolean;
}

function parseStoredPermissions(value: string | null | undefined): RolePermission | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, permission]) => typeof permission === "boolean"),
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
  // permissions after a role change.
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
 */
export async function resolveSeasonalEventAccess(
  client: SeasonalEventAccessClient,
  authCtx: AuthContext,
): Promise<SeasonalEventAccess | null> {
  const organizationId = authCtx.organizationId;
  if (!organizationId) return null;

  const [membership, valtrioxTeamMember] = await Promise.all([
    client.organizationMember.findFirst({
      where: { organizationId, userId: authCtx.userId },
      select: {
        role: true,
        roleDef: { select: { name: true, permissions: true } },
      },
    }),
    client.valtrioxTeamMember.findFirst({
      where: { userId: authCtx.userId, status: "active" },
      select: { id: true, visibleSections: true },
    }),
  ]);

  if (!membership) return null;

  const currentRole = membership.role.trim().toLowerCase();
  const effectiveRole = valtrioxTeamMember
    ? "valtriox_team"
    : LEGACY_ROLE_MAP[currentRole] || currentRole;
  const roleDefinition = resolveRoleDefinition(
    effectiveRole,
    valtrioxTeamMember ? null : membership.roleDef,
  );
  const pageHidden = valtrioxTeamMember
    ? hiddenSections(valtrioxTeamMember.visibleSections).includes("seasonal-sales")
    : false;
  const canReadMarketing = !pageHidden && hasPermission(roleDefinition, "marketing");

  return {
    organizationId,
    effectiveRole,
    canReadMarketing,
    canManageMarketing: canReadMarketing && !isReadOnlyRole(effectiveRole),
  };
}

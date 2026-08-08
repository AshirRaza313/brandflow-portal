// src/lib/supplier-access.ts
// ─────────────────────────────────────────────────────────────────────────────
// Supplier authorization helper (PR #6 — Issue #2)
// ─────────────────────────────────────────────────────────────────────────────
// Re-resolves the current OrganizationMember from the DB on every request,
// so stale sessions (member removed, role demoted, org switched) cannot
// bypass authorization.
//
// Resolution order (DB is source of truth):
//   1. Platform team (ValtrioxTeamMember.status="active") → cross-org full access
//   2. OrganizationMember found + Role.permissions has explicit "suppliers" /
//      "suppliers_write" key → use DB permissions
//   3. OrganizationMember found but no explicit suppliers permission → fall
//      back to member.role string via canReadSuppliers / canWriteSuppliers
//      (backward compat for brand_owner, brand_admin, operations_manager, etc.)
//
// Failure modes (all return 403, except cross-org supplier access → 404):
//   - Member row missing in authCtx.organizationId  → 403 (removed / org-mismatch)
//   - Member.penaltyUntil > now()                   → 403 (inactive / penalized)
//   - No organizationId and not platform team       → 403 (org context required)
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import type { AuthContext } from "@/lib/auth-middleware";
import { db } from "@/lib/db";
import { canReadSuppliers, canWriteSuppliers } from "@/lib/supplier-store";
import { isPlatformRole } from "@/lib/roles";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface SupplierAccessResult {
  canRead: boolean;
  canWrite: boolean;
  /** The resolved OrganizationMember (null when access is via platform team). */
  member: {
    id: string;
    userId: string;
    organizationId: string;
    role: string;
    roleId: string | null;
  } | null;
  /** The resolved Role definition (null when no roleId or role-name fallback used). */
  role: {
    id: string;
    name: string;
    permissions: Record<string, boolean>;
  } | null;
  /** True when access was granted via ValtrioxTeamMember (platform team). */
  isPlatformTeam: boolean;
  /** The organizationId to scope all supplier queries by. */
  organizationId: string;
  /** Where the canRead/canWrite decision came from — useful for debugging. */
  accessSource: "platform_team" | "explicit_permissions" | "role_name_fallback";
}

type AccessFailure = { ok: false; response: NextResponse };
type AccessSuccess = { ok: true; access: SupplierAccessResult };
export type SupplierAccessOutcome = AccessFailure | AccessSuccess;

export interface ResolveSupplierAccessOptions {
  /** If true, return 403 when canRead is false. */
  requireRead?: boolean;
  /** If true, return 403 when canWrite is false. */
  requireWrite?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Re-resolves the caller's authorization for the suppliers module by hitting
 * the database on every request. Never trusts authCtx.role alone.
 *
 * Usage in route handlers:
 *
 *   const outcome = await resolveSupplierAccess(authCtx, { requireRead: true });
 *   if (!outcome.ok) return outcome.response;
 *   const { access } = outcome;
 *   // ...use access.organizationId to scope Prisma queries...
 *   // ...return access: { canRead, canWrite } in response body for UI...
 */
export async function resolveSupplierAccess(
  authCtx: AuthContext,
  options: ResolveSupplierAccessOptions = {},
): Promise<SupplierAccessOutcome> {
  const { requireRead = false, requireWrite = false } = options;

  // ── Path A: authCtx carries an organizationId → resolve member in that org ──
  if (authCtx.organizationId) {
    const member = await db.organizationMember.findFirst({
      where: {
        userId: authCtx.userId,
        organizationId: authCtx.organizationId,
      },
      include: { roleDef: true },
    });

    if (!member) {
      // Maybe the user is platform team impersonating / supporting this org.
      const platformMember = await db.valtrioxTeamMember.findUnique({
        where: { userId: authCtx.userId },
      });
      if (platformMember && platformMember.status === "active") {
        return ok({
          canRead: true,
          canWrite: true,
          member: null,
          role: null,
          isPlatformTeam: true,
          organizationId: authCtx.organizationId,
          accessSource: "platform_team",
        });
      }
      // Not a member of this org AND not platform team → reject.
      return forbidden(
        "Membership not found or removed from this organization.",
      );
    }

    // ── Inactive / penalized check ──
    if (member.penaltyUntil && member.penaltyUntil > new Date()) {
      return forbidden(
        "Your access is temporarily restricted. Please contact your organization admin.",
      );
    }

    // ── Resolve canRead / canWrite ──
    const perms = parsePermissions(member.roleDef?.permissions);
    const hasExplicitSuppliersPerm =
      "suppliers" in perms || "suppliers_write" in perms;

    let canRead: boolean;
    let canWrite: boolean;
    let accessSource: SupplierAccessResult["accessSource"];

    if (hasExplicitSuppliersPerm) {
      // Tier 2: DB-defined permissions are the source of truth.
      canRead = perms.suppliers === true || perms.suppliers_write === true;
      canWrite = perms.suppliers_write === true;
      accessSource = "explicit_permissions";
    } else {
      // Tier 3: Fall back to member.role string.
      canRead = canReadSuppliers(member.role);
      canWrite = canWriteSuppliers(member.role);
      accessSource = "role_name_fallback";
    }

    const access: SupplierAccessResult = {
      canRead,
      canWrite,
      member: {
        id: member.id,
        userId: member.userId,
        organizationId: member.organizationId,
        role: member.role,
        roleId: member.roleId,
      },
      role: member.roleDef
        ? {
            id: member.roleDef.id,
            name: member.roleDef.name,
            permissions: perms,
          }
        : null,
      isPlatformTeam: false,
      organizationId: member.organizationId,
      accessSource,
    };

    return enforceRequired(access, requireRead, requireWrite);
  }

  // ── Path B: no organizationId in authCtx ──
  if (isPlatformRole(authCtx.role)) {
    const platformMember = await db.valtrioxTeamMember.findUnique({
      where: { userId: authCtx.userId },
    });
    if (platformMember && platformMember.status === "active") {
      return forbidden(
        "Organization context required to access suppliers. Specify an organization.",
      );
    }
  }

  return forbidden("Organization context required.");
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function parsePermissions(
  raw: string | null | undefined,
): Record<string, boolean> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, boolean>;
    }
    return {};
  } catch {
    return {};
  }
}

function enforceRequired(
  access: SupplierAccessResult,
  requireRead: boolean,
  requireWrite: boolean,
): SupplierAccessOutcome {
  if (requireRead && !access.canRead) {
    return forbidden("You do not have permission to view suppliers.");
  }
  if (requireWrite && !access.canWrite) {
    return forbidden("You do not have permission to modify suppliers.");
  }
  return ok(access);
}

function ok(access: SupplierAccessResult): AccessSuccess {
  return { ok: true, access };
}

function forbidden(message: string): AccessFailure {
  return {
    ok: false,
    response: NextResponse.json({ error: message }, { status: 403 }),
  };
}
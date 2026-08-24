import { NextRequest, NextResponse } from "next/server";
import { db, dbErrorResponse, isDbUnavailable } from "@/lib/db";
import { withAuth, type AuthContext, type RouteContext } from "@/lib/auth-middleware";
import { validateBody } from "@/lib/validations/api";
import { updateMemberRoleApiSchema } from "@/lib/validations/schemas";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import {
  evaluateExistingTarget,
  evaluateRoleAssignment,
  isOwnerMembershipRole,
  isProtectedTeamRole,
  policyResponseBody,
  requireTeamPermission,
  resolveBuiltInRoleTarget,
  resolveDatabaseRoleTarget,
  resolveTeamAccess,
  type TeamRoleTarget,
} from "@/lib/team-access";

function errorInfo(error: unknown): { code: string; message: string } {
  if (!error || typeof error !== "object") return { code: "", message: String(error) };
  const record = error as Record<string, unknown>;
  return {
    code: typeof record.code === "string" ? record.code : "",
    message: typeof record.message === "string" ? record.message : String(error),
  };
}

function throwPolicy(result: { code: string; reason: string }): never {
  throw Object.assign(new Error(result.reason), { code: result.code });
}

// PUT /api/organization/members/[id]/role
export const PUT = withRateLimit(withAuth(async (
  req: NextRequest,
  authCtx: AuthContext,
  routeContext: RouteContext,
) => {
  try {
    logger.info("[Org Members Role] PUT request", { userId: authCtx.userId });
    const { id: rawId } = await routeContext.params;
    const id = rawId?.trim();
    if (!id) {
      return NextResponse.json({ error: "Member id is required", code: "MEMBER_ID_REQUIRED" }, { status: 400 });
    }

    const result = await validateBody(req, updateMemberRoleApiSchema);
    if (!result.success) return result.response;
    const { roleId, roleName } = result.data;
    if ((roleId && roleName) || (!roleId && !roleName)) {
      return NextResponse.json(
        { error: "Provide exactly one of roleId or roleName", code: "ROLE_SELECTOR_XOR" },
        { status: 400 },
      );
    }

    const existingMember = await db.organizationMember.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        userId: true,
        role: true,
        roleDef: { select: { name: true, level: true } },
      },
    });
    if (!existingMember) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    const access = await resolveTeamAccess(authCtx, existingMember.organizationId);
    const permission = requireTeamPermission(access, "team_manage");
    if (!permission.allowed) {
      return NextResponse.json(policyResponseBody(permission), { status: permission.status });
    }
    if (existingMember.userId === authCtx.userId) {
      return NextResponse.json(
        { error: "You cannot change your own role", code: "SELF_MUTATION_BLOCKED" },
        { status: 403 },
      );
    }
    const existingTargetPolicy = evaluateExistingTarget(access, existingMember);
    if (!existingTargetPolicy.allowed) {
      return NextResponse.json(policyResponseBody(existingTargetPolicy), { status: existingTargetPolicy.status });
    }

    let target: TeamRoleTarget | null = null;
    if (roleId) {
      const role = await db.role.findUnique({
        where: { id: roleId },
        select: { id: true, name: true, level: true, permissions: true },
      });
      if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
      if (isProtectedTeamRole(role.name)) {
        return NextResponse.json(
          { error: "Platform and legacy privileged roles cannot be assigned through organization endpoints", code: "PLATFORM_ROLE_BLOCKED" },
          { status: 403 },
        );
      }
      target = resolveDatabaseRoleTarget(role);
    } else if (roleName) {
      if (isProtectedTeamRole(roleName)) {
        return NextResponse.json(
          { error: "Platform and legacy privileged roles cannot be assigned through organization endpoints", code: "PLATFORM_ROLE_BLOCKED" },
          { status: 403 },
        );
      }
      target = resolveBuiltInRoleTarget(roleName);
    }

    if (!target) {
      return NextResponse.json(
        { error: "Invalid or non-assignable role", code: "INVALID_ROLE" },
        { status: 400 },
      );
    }
    const assignment = evaluateRoleAssignment(access, target);
    if (!assignment.allowed) {
      return NextResponse.json(policyResponseBody(assignment), { status: assignment.status });
    }

    const updatedMember = await db.$transaction(async (tx) => {
      const currentMember = await tx.organizationMember.findUnique({
        where: { id },
        select: {
          id: true,
          organizationId: true,
          userId: true,
          role: true,
          roleDef: { select: { name: true, level: true } },
        },
      });
      if (!currentMember || currentMember.organizationId !== existingMember.organizationId) {
        throw Object.assign(new Error("Team member changed during role update"), { code: "TEAM_MEMBER_CHANGED" });
      }

      const currentAccess = await resolveTeamAccess(authCtx, currentMember.organizationId, tx);
      const currentPermission = requireTeamPermission(currentAccess, "team_manage");
      if (!currentPermission.allowed) throwPolicy(currentPermission);
      if (currentMember.userId === authCtx.userId) {
        throw Object.assign(new Error("You cannot change your own role"), { code: "SELF_MUTATION_BLOCKED" });
      }
      const currentTargetPolicy = evaluateExistingTarget(currentAccess, currentMember);
      if (!currentTargetPolicy.allowed) throwPolicy(currentTargetPolicy);

      let currentRequestedTarget: TeamRoleTarget | null = target;
      if (roleId) {
        const currentRole = await tx.role.findUnique({
          where: { id: roleId },
          select: { id: true, name: true, level: true, permissions: true },
        });
        currentRequestedTarget = currentRole ? resolveDatabaseRoleTarget(currentRole) : null;
      }
      if (!currentRequestedTarget) {
        throw Object.assign(new Error("Requested role changed or is no longer assignable"), { code: "ROLE_CHANGED" });
      }
      const currentAssignment = evaluateRoleAssignment(currentAccess, currentRequestedTarget);
      if (!currentAssignment.allowed) throwPolicy(currentAssignment);

      if (isOwnerMembershipRole(currentMember.role) && currentRequestedTarget.name !== "brand_owner") {
        const ownerCount = await tx.organizationMember.count({
          where: {
            organizationId: currentMember.organizationId,
            role: { in: ["brand_owner", "owner", "ceo"], mode: "insensitive" },
          },
        });
        if (ownerCount <= 1) {
          throw Object.assign(new Error("An organization must keep at least one brand owner"), {
            code: "LAST_OWNER_REQUIRED",
          });
        }
      }

      return tx.organizationMember.update({
        where: { id },
        data: { role: currentRequestedTarget.name, roleId: currentRequestedTarget.roleId },
        select: {
          id: true,
          organizationId: true,
          userId: true,
          role: true,
          roleId: true,
          joinedAt: true,
          user: { select: { id: true, name: true, email: true, image: true } },
          roleDef: { select: { id: true, name: true, label: true, description: true, level: true } },
        },
      });
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ message: "Role updated successfully", member: updatedMember });
  } catch (error: unknown) {
    const info = errorInfo(error);
    logger.error("Member role update error:", error);
    if (isDbUnavailable(error)) return dbErrorResponse(error);
    if ([
      "TEAM_PERMISSION_DENIED",
      "PENALTY_ACTIVE",
      "SELF_MUTATION_BLOCKED",
      "PLATFORM_ROLE_BLOCKED",
      "TARGET_ROLE_HIERARCHY",
      "ROLE_HIERARCHY_VIOLATION",
      "BRAND_OWNER_ROLE_LIMIT",
      "BRAND_ADMIN_ROLE_LIMIT",
      "LAST_OWNER_REQUIRED",
    ].includes(info.code)) {
      return NextResponse.json({ error: info.message, code: info.code }, { status: 403 });
    }
    if (["TEAM_MEMBER_CHANGED", "ROLE_CHANGED"].includes(info.code)) {
      return NextResponse.json({ error: info.message, code: info.code }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}, { requireOrg: false }), { maxRequests: 30, windowSeconds: 60 });

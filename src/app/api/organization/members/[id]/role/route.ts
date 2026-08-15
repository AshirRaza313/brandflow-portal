import { NextRequest, NextResponse } from "next/server";
import { db, dbErrorResponse, isDbUnavailable, withRetry} from "@/lib/db";
import { withAuth, type AuthContext } from "@/lib/auth-middleware";
import { canAssignRole, getAdminEmail, getRoleByName, hasPermission } from "@/lib/roles";
import { validateBody } from "@/lib/validations/api";
import { updateMemberRoleApiSchema } from "@/lib/validations/schemas";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";

// PUT /api/organization/members/[id]/role
// Update a team member's role assignment
export const PUT = withRateLimit(withAuth(async (
  req: NextRequest,
  authCtx: AuthContext
) => {
  try {
    logger.info("[Org Members Role] PUT request", { userId: authCtx.userId });
    // Extract member ID from URL path
    const urlParts = req.url.split("/");
    const id = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
    const result = await validateBody(req, updateMemberRoleApiSchema);
    if (!result.success) return result.response;
    const body = result.data;
    const { roleId, roleName } = body;

    // Fresh same-org membership and active VTM resolution
    const membership = await withRetry(async () => {
      return db.organizationMember.findFirst({
        where: { organizationId: authCtx.organizationId, userId: authCtx.userId },
        select: { role: true, roleDef: { select: { name: true, permissions: true } } },
      });
    }, 2, 500);

    const vtm = await withRetry(async () => {
      return db.valtrioxTeamMember.findFirst({
        where: { userId: authCtx.userId, status: "active" },
        select: { role: true },
      });
    }, 2, 500);

    const freshRole = vtm?.role || membership?.role || authCtx.role;
    const isFreshPlatformAdmin = ["platform_owner", "platform_admin"].includes(freshRole) && !!vtm;
    let hasTeamManage = false;
    if (membership?.roleDef && membership.roleDef.name === membership.role) {
      try {
        const perms = JSON.parse(membership.roleDef.permissions);
        hasTeamManage = perms.team_manage === true;
      } catch {
        hasTeamManage = false;
      }
    }
    if (!hasTeamManage) {
      const builtInRole = getRoleByName(freshRole);
      hasTeamManage = hasPermission(builtInRole ?? null, "team_manage") || isFreshPlatformAdmin;
    }

    if (!hasTeamManage && !isFreshPlatformAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient permissions to change roles" },
        { status: 403 }
      );
    }

    // Verify the member exists
    const existingMember = await withRetry(async () => {
      return await db.organizationMember.findUnique({
        where: { id },
      });
    }, 2, 500);

    if (!existingMember) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    // SECURITY: Org ownership check — cross-org only for fresh active platform admin
    if (!isFreshPlatformAdmin && existingMember.organizationId !== authCtx.organizationId) {
      return NextResponse.json(
        { error: "Access denied. This member does not belong to your organization." },
        { status: 403 }
      );
    }

    const updateData: { roleId?: string; role?: string } = {};

    if (roleId) {
      const roleExists = await withRetry(async () => {
        return await db.role.findUnique({
          where: { id: roleId },
        });
      }, 2, 500);
      if (!roleExists) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }
      const targetRole = roleExists.name.toLowerCase();
      if (
        targetRole.startsWith("platform_") ||
        targetRole === "valtriox_team" ||
        targetRole === "owner" ||
        targetRole === "admin"
      ) {
        return NextResponse.json(
          { error: "Platform roles cannot be assigned through organization role update", code: "PLATFORM_ROLE_BLOCKED" },
          { status: 403 }
        );
      }
      const adminEmail = getAdminEmail();
      const roleCheck = canAssignRole(freshRole, authCtx.email, targetRole, adminEmail);
      if (!roleCheck.allowed) {
        return NextResponse.json(
          { error: roleCheck.reason || "Insufficient permissions to assign this role", code: roleCheck.code },
          { status: 403 }
        );
      }
      updateData.roleId = roleId;
      updateData.role = roleExists.name;
    }

    if (roleName) {
      const targetRole = roleName.toLowerCase().trim();
      if (
        targetRole.startsWith("platform_") ||
        targetRole === "valtriox_team" ||
        targetRole === "owner" ||
        targetRole === "admin"
      ) {
        return NextResponse.json(
          { error: "Platform roles cannot be assigned through organization role update", code: "PLATFORM_ROLE_BLOCKED" },
          { status: 403 }
        );
      }
      const adminEmail = getAdminEmail();
      const roleCheck = canAssignRole(freshRole, authCtx.email, targetRole, adminEmail);
      if (!roleCheck.allowed) {
        return NextResponse.json(
          { error: roleCheck.reason || "Insufficient permissions to assign this role", code: roleCheck.code },
          { status: 403 }
        );
      }
      updateData.role = roleName;
    }

    const updatedMember = await withRetry(async () => {
      return await db.organizationMember.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, role: true },
        },
        roleDef: {
          select: { id: true, name: true, label: true, description: true, level: true },
        },
      },
    })
    }, 2, 500);

    return NextResponse.json({
      message: "Role updated successfully",
      member: updatedMember,
    });
  } catch (error: unknown) {
    logger.error("Member role update error:", error);
    if (isDbUnavailable(error)) {
      return dbErrorResponse(error);
    }
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}), { maxRequests: 30, windowSeconds: 60 });

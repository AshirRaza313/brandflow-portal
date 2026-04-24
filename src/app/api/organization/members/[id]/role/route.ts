import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { sanitizeObject } from "@/lib/sanitize";
import logger from "@/lib/logger";

// PUT /api/organization/members/[id]/role
// Update a team member's role assignment
export const PUT = withAuth(async (
  req: NextRequest,
  authCtx: any
) => {
  try {
    logger.info("[Org Members Role] PUT request", { userId: authCtx.userId });
    await ensureDb();
    // Extract member ID from URL path
    const urlParts = req.url.split("/");
    const id = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const { roleId, roleName, updatedByRole } = body;

    if (!roleId && !roleName) {
      return NextResponse.json(
        { error: "roleId or roleName is required" },
        { status: 400 }
      );
    }

    // Authorization check
    const allowedRoles = ["platform_owner", "platform_admin", "brand_owner", "brand_admin"];
    if (!updatedByRole || !allowedRoles.includes(updatedByRole)) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient permissions to change roles" },
        { status: 403 }
      );
    }

    // Verify the member exists
    const existingMember = await db.organizationMember.findUnique({
      where: { id },
    });

    if (!existingMember) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (roleId) {
      const roleExists = await db.role.findUnique({
        where: { id: roleId },
      });
      if (!roleExists) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }
      updateData.roleId = roleId;
      // Also update the role string for consistency
      if (roleExists.name) updateData.role = roleExists.name;
    }

    if (roleName) {
      updateData.role = roleName;
    }

    const updatedMember = await db.organizationMember.update({
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
    });

    return NextResponse.json({
      message: "Role updated successfully",
      member: updatedMember,
    });
  } catch (error: any) {
    console.error("Member role update error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
});

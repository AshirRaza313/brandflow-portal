import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

/**
 * POST /api/fix-old-roles
 *
 * Fixes legacy user roles to the new 16-role RBAC system.
 * Accepts adminEmail in body OR falls back to ADMIN_EMAIL env var.
 *
 * Legacy roles fixed:
 *   - "owner"  → "brand_owner"  (unless admin)
 *   - "admin"  → "brand_admin"  (unless admin)
 *   - "ceo"    → "brand_owner"
 *   - "manager" → "operations_manager"
 *   - "member" → "viewer"
 *   - "editor" → "content_creator"
 *   - Any other unknown role → "viewer"
 *
 * Admin user (identified by ADMIN_EMAIL or body param) → "platform_owner"
 */
export const POST = withAuth(async (req: NextRequest, authCtx) => {
  try {
    await ensureDb();
    logger.info("[Fix Old Roles] POST request", { userId: authCtx.userId });

    // Try body first, then env var
    let body = {};
    try {
      body = await req.json();
    } catch {}

    const adminEmail = (
      (body as { adminEmail?: string })?.adminEmail ||
      process.env.ADMIN_EMAIL ||
      ""
    ).toLowerCase().trim();

    if (!adminEmail) {
      return NextResponse.json(
        {
          error:
            "No admin email provided. Either set ADMIN_EMAIL environment variable or pass { adminEmail: '...' } in request body.",
          hint: "Example: POST with { \"adminEmail\": \"your@email.com\" }",
        },
        { status: 400 }
      );
    }

    // ── 1. Get all users before migration (for reporting) ──
    const allUsersBefore = await db.user.findMany({
      select: { id: true, email: true, role: true },
    });

    const adminUser = await db.user.findUnique({ where: { email: adminEmail } });
    if (!adminUser) {
      return NextResponse.json(
        {
          error: `Admin user (${adminEmail}) not found in database.`,
          existingUsers: allUsersBefore.map((u) => ({
            email: u.email,
            currentRole: u.role,
          })),
        },
        { status: 404 }
      );
    }

    const changes: { email: string; from: string; to: string }[] = [];

    // ── 2. Fix admin user → platform_owner ──
    if (adminUser.role !== "platform_owner") {
      changes.push({
        email: adminUser.email,
        from: adminUser.role,
        to: "platform_owner",
      });
    }
    await db.user.update({
      where: { email: adminEmail },
      data: { role: "platform_owner" },
    });

    // ── 3. Fix all legacy roles for non-admin users ──
    const validRoles = [
      "platform_owner", "platform_admin", "brand_owner", "brand_admin",
      "operations_manager", "sales_manager", "marketing_manager",
      "warehouse_manager", "support_agent", "content_creator",
      "accountant", "team_lead", "sales_rep", "inventory_clerk",
      "viewer", "custom",
    ];

    const legacyRoleMap: Record<string, string> = {
      owner: "brand_owner",
      ceo: "brand_owner",
      admin: "brand_admin",
      manager: "operations_manager",
      editor: "content_creator",
      member: "viewer",
    };

    // Get all non-admin users
    const nonAdminUsers = await db.user.findMany({
      where: { email: { not: adminEmail } },
      select: { id: true, email: true, role: true },
    });

    for (const user of nonAdminUsers) {
      if (!validRoles.includes(user.role)) {
        const newRole = legacyRoleMap[user.role] || "viewer";
        if (newRole !== user.role) {
          changes.push({ email: user.email, from: user.role, to: newRole });
          await db.user.update({
            where: { id: user.id },
            data: { role: newRole },
          });
        }
      }
    }

    // ── 4. Fix OrganizationMember records ──
    const adminMembership = await db.organizationMember.findFirst({
      where: { userId: adminUser.id },
    });

    if (adminMembership) {
      if (adminMembership.role !== "platform_owner") {
        changes.push({
          email: adminUser.email,
          from: `org:${adminMembership.role}`,
          to: "org:platform_owner",
        });
      }
      await db.organizationMember.update({
        where: { id: adminMembership.id },
        data: { role: "platform_owner" },
      });
    }

    // Fix all legacy org member roles
    const allOrgMembers = await db.organizationMember.findMany({
      where: adminMembership ? { id: { not: adminMembership.id } } : undefined,
      select: { id: true, userId: true, role: true, user: { select: { email: true } } },
    });

    const orgLegacyMap: Record<string, string> = {
      owner: "brand_owner",
      ceo: "brand_owner",
      admin: "brand_admin",
      manager: "operations_manager",
      editor: "content_creator",
      member: "viewer",
    };

    for (const member of allOrgMembers) {
      if (!validRoles.includes(member.role)) {
        const newRole = orgLegacyMap[member.role] || "viewer";
        if (newRole !== member.role) {
          changes.push({
            email: member.user?.email || member.userId,
            from: `org:${member.role}`,
            to: `org:${newRole}`,
          });
          await db.organizationMember.update({
            where: { id: member.id },
            data: { role: newRole },
          });
        }
      }
    }

    // ── 5. Get final state for verification ──
    const allUsersAfter = await db.user.findMany({
      select: { id: true, email: true, role: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      message: `Role migration complete! Admin: ${adminEmail} → platform_owner`,
      adminEmail,
      totalChanges: changes.length,
      changes,
      allUsersAfter: allUsersAfter.map((u) => ({
        email: u.email,
        role: u.role,
      })),
    });
  } catch (error: any) {
    console.error("Role migration error:", error?.message || error);
    return NextResponse.json(
      { error: "Migration failed: " + (error?.message || "Unknown error") },
      { status: 500 }
    );
  }
}, { requireRole: ["platform_owner", "platform_admin", "admin"], requireOrg: false });

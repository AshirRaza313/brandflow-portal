import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { ROLES } from "@/lib/roles";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

export const POST = withAuth(async (req: NextRequest, authCtx) => {
  try {
    await ensureDb();
    logger.info("[Roles Seed] POST request", { userId: authCtx.userId });

    // Upsert all 16 roles into the database
    const results = [];
    for (const role of ROLES) {
      const result = await db.role.upsert({
        where: { name: role.name },
        update: {
          label: role.label,
          description: role.description,
          permissions: JSON.stringify(role.permissions),
          level: role.level,
        },
        create: {
          name: role.name,
          label: role.label,
          description: role.description,
          permissions: JSON.stringify(role.permissions),
          level: role.level,
        },
      });
      results.push(result);
    }

    return NextResponse.json({
      message: `${results.length} roles seeded successfully`,
      seeded: results.length,
      roles: results.map((r) => ({
        id: r.id,
        name: r.name,
        label: r.label,
        level: r.level,
      })),
    });
  } catch (error: any) {
    console.error("Roles seed error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json(
      { error: "Failed to seed roles" },
      { status: 500 }
    );
  }
}, { requireRole: ["platform_owner", "platform_admin", "admin"], requireOrg: false });

import { NextResponse } from "next/server";
import { ROLES } from "@/lib/roles";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

export const GET = withAuth(async () => {
  try {
    logger.info("[Roles] GET request");
    return NextResponse.json({
      roles: ROLES.map((r) => ({
        name: r.name,
        label: r.label,
        description: r.description,
        level: r.level,
        permissions: r.permissions,
      })),
      total: ROLES.length,
    });
  } catch (error: any) {
    console.error("Roles API error:", error?.message || error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}, { requireOrg: false });

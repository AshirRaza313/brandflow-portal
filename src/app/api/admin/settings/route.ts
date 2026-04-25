import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// GET /api/admin/settings — Return platform settings (LATEST row, with logo)
export const GET = withAuth(async (_req: NextRequest, authCtx) => {
  logger.info("[Admin Settings] GET request", { userId: authCtx.userId });
  try {
    await ensureDb();

    // Always get the LATEST settings row (most recent = has actual data)
    let settings = await db.platformSettings.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!settings) {
      // Create default settings
      settings = await db.platformSettings.create({
        data: {
          companyName: "Valtriox",
          companyEmail: "support@valtriox.pk",
          currency: "PKR",
        },
      });
    }

    // Clean up duplicate rows if more than 1 exists
    try {
      const allSettings = await db.platformSettings.findMany({
        orderBy: { createdAt: "desc" },
      });
      if (allSettings.length > 1) {
        const keepId = allSettings[0].id;
        const duplicateIds = allSettings.slice(1).map((s) => s.id);
        for (const dupId of duplicateIds) {
          await db.platformSettings.delete({ where: { id: dupId } }).catch(() => {});
        }
      }
    } catch (cleanupErr: any) {
      console.warn("[Settings] Duplicate cleanup failed:", cleanupErr?.message);
    }

    return NextResponse.json({
      settings: {
        id: settings.id,
        companyName: settings.companyName,
        companyEmail: settings.companyEmail,
        companyPhone: settings.companyPhone,
        companyWebsite: settings.companyWebsite,
        companyAddress: settings.companyAddress,
        supportHours: settings.supportHours,
        whatsappNumber: settings.whatsappNumber,
        instagramUrl: settings.instagramUrl,
        facebookUrl: settings.facebookUrl,
        twitterUrl: settings.twitterUrl,
        paymentMethods: JSON.parse(settings.paymentMethods || "[]"),
        currency: settings.currency,
        logoUrl: settings.logoUrl,
        faviconUrl: settings.faviconUrl,
        primaryBrandColor: settings.primaryBrandColor,
        secondaryBrandColor: settings.secondaryBrandColor,
        currencySymbol: settings.currencySymbol,
        customCss: settings.customCss,
        emailFooterText: settings.emailFooterText,
        invoiceHeaderText: settings.invoiceHeaderText,
      },
    });
  } catch (error: any) {
    console.error("Fetch settings error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}, { requireRole: ["admin", "owner", "platform_owner", "platform_admin"], requireOrg: false });

// PUT /api/admin/settings — Update platform settings (admin only)
export const PUT = withAuth(async (req: NextRequest, authCtx) => {
  logger.info("[Admin Settings] PUT request", { userId: authCtx.userId });
  try {
    await ensureDb();
    const body = await req.json();

    // Find existing settings (LATEST row)
    const existing = await db.platformSettings.findFirst({
      orderBy: { createdAt: "desc" },
    });

    const updateData: any = {};
    const allowedFields = [
      "companyName", "companyEmail", "companyPhone", "companyWebsite",
      "companyAddress", "supportHours", "whatsappNumber", "instagramUrl",
      "facebookUrl", "twitterUrl", "currency", "logoUrl", "faviconUrl",
      "primaryBrandColor", "secondaryBrandColor", "currencySymbol",
      "customCss", "emailFooterText", "invoiceHeaderText",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle paymentMethods as JSON string
    if (body.paymentMethods) {
      updateData.paymentMethods = JSON.stringify(body.paymentMethods);
    }

    if (!existing) {
      const settings = await db.platformSettings.create({
        data: {
          companyName: updateData.companyName || "Valtriox",
          companyEmail: updateData.companyEmail || "",
          ...updateData,
        },
      });

      return NextResponse.json({ success: true, settings });
    }

    // Clean up duplicate rows before updating
    try {
      const allSettings = await db.platformSettings.findMany({
        orderBy: { createdAt: "desc" },
      });
      if (allSettings.length > 1) {
        const duplicateIds = allSettings.slice(1).map((s) => s.id);
        for (const dupId of duplicateIds) {
          await db.platformSettings.delete({ where: { id: dupId } }).catch(() => {});
        }
      }
    } catch (cleanupErr: any) {
      console.warn("[Settings] Duplicate cleanup failed:", cleanupErr?.message);
    }

    const settings = await db.platformSettings.update({
      where: { id: existing.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        paymentMethods: JSON.parse(settings.paymentMethods || "[]"),
      },
    });
  } catch (error: any) {
    console.error("Update settings error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}, { requireRole: ["admin", "owner", "platform_owner", "platform_admin"], requireOrg: false });

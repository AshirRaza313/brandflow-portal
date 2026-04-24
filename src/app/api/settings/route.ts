import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { sanitizeObject, sanitizeEmail, sanitizePhone } from "@/lib/sanitize";
import logger from "@/lib/logger";

// GET — Fetch organization settings from DB
export const GET = withAuth(async (req, authCtx) => {
  try {
    await ensureDb();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || authCtx.organizationId;

    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    // Security: Ensure user can only access their own org's data
    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const org = await db.organization.findUnique({ where: { id: orgId } });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    return NextResponse.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      website: org.website,
      phone: org.phone,
      email: org.email,
      currency: org.currency,
      timezone: org.timezone,
      plan: org.plan,
      // Brand settings
      country: org.country || "",
      religion: org.religion || "",
      brandTagline: org.brandTagline || "",
      brandColor: org.brandColor || "",
      secondaryBrandColor: org.secondaryBrandColor || "",
      brandDescription: org.brandDescription || "",
      address: org.address || "",
      taxId: org.taxId || "",
      favicon: org.favicon || "",
    });
  } catch (error: any) {
    logger.error("Settings GET error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
});

// PUT — Update organization settings in DB
export const PUT = withAuth(async (req, authCtx) => {
  try {
    await ensureDb();
    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const {
      id,
      name,
      website,
      phone,
      email,
      currency,
      timezone,
      // Brand settings
      logo,
      favicon,
      country,
      religion,
      brandTagline,
      brandColor,
      secondaryBrandColor,
      brandDescription,
      address,
      taxId,
    } = body;

    const orgId = id || authCtx.organizationId;

    if (!orgId) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Security: Ensure user can only update their own org's settings
    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Build update payload — only include fields that are provided
    const data: Record<string, any> = {};
    if (name !== undefined) data.name = name;
    if (website !== undefined) data.website = website;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (currency !== undefined) data.currency = currency;
    if (timezone !== undefined) data.timezone = timezone;
    if (logo !== undefined) data.logo = logo;
    if (favicon !== undefined) data.favicon = favicon;
    if (country !== undefined) data.country = country || null;
    if (religion !== undefined) data.religion = religion || null;
    if (brandTagline !== undefined) data.brandTagline = brandTagline || null;
    if (brandColor !== undefined) data.brandColor = brandColor || null;
    if (secondaryBrandColor !== undefined) data.secondaryBrandColor = secondaryBrandColor || null;
    if (brandDescription !== undefined) data.brandDescription = brandDescription || null;
    if (address !== undefined) data.address = address || null;
    if (taxId !== undefined) data.taxId = taxId || null;

    // Also update slug if name changed
    if (name) {
      const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "my-brand";
      let slug = baseSlug;
      let counter = 1;
      while (counter < 100) {
        const existing = await db.organization.findFirst({
          where: { slug, NOT: { id: orgId } },
          select: { id: true },
        });
        if (!existing) break;
        slug = `${baseSlug}-${counter++}`;
      }
      data.slug = slug;
    }

    const org = await db.organization.update({
      where: { id: orgId },
      data,
    });

    return NextResponse.json({ organization: org });
  } catch (error: any) {
    logger.error("Settings PUT error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
});

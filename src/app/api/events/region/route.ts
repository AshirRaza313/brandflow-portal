import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { sanitizeObject } from "@/lib/sanitize";
import logger from "@/lib/logger";
import { getEventsForRegion } from "@/lib/events-library";
import type { RegionEvent } from "@/lib/events-library";

// GET — Returns events for org's country + religion (with optional preview params)
export const GET = withAuth(async (req, authCtx) => {
  try {
    await ensureDb();
    const { searchParams } = new URL(req.url);

    const orgId = authCtx.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: "Organization required" }, { status: 400 });
    }

    // Allow preview via query params (for settings page testing)
    let country = searchParams.get("country") || "";
    let religion = searchParams.get("religion") || "";

    // If not previewing, use org settings
    if (!country || !religion) {
      const org = await db.organization.findUnique({
        where: { id: orgId },
        select: { country: true, religion: true },
      });
      if (org) {
        country = country || org.country || "";
        religion = religion || org.religion || "";
      }
    }

    // Get region-specific events
    const regionEvents = getEventsForRegion(country, religion);

    // Load custom events for this org from SystemSetting
    const customKey = `custom-events-${orgId}`;
    const customSetting = await db.systemSetting.findUnique({
      where: { key: customKey },
    });

    let customEvents: RegionEvent[] = [];
    if (customSetting) {
      try {
        customEvents = JSON.parse(customSetting.value);
      } catch {
        customEvents = [];
      }
    }

    // Combine: region events first, then custom events
    const allEvents = [...regionEvents, ...customEvents];

    return NextResponse.json({
      country,
      religion,
      events: allEvents,
      regionEvents,
      customEvents,
      customCount: customEvents.length,
      regionCount: regionEvents.length,
    });
  } catch (error: any) {
    logger.error("Events region GET error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
});

// POST — Create a custom event for the org
export const POST = withAuth(async (req, authCtx) => {
  try {
    await ensureDb();
    const orgId = authCtx.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: "Organization required" }, { status: 400 });
    }

    const body = await req.json();
    const sanitized = sanitizeObject(body);
    const { name, date, emoji, description, category, theme } = sanitized;

    if (!name || !date) {
      return NextResponse.json({ error: "Name and date are required" }, { status: 400 });
    }

    const customKey = `custom-events-${orgId}`;

    // Load existing custom events
    const customSetting = await db.systemSetting.findUnique({
      where: { key: customKey },
    });

    let customEvents: RegionEvent[] = [];
    if (customSetting) {
      try {
        customEvents = JSON.parse(customSetting.value);
      } catch {
        customEvents = [];
      }
    }

    // Create new custom event
    const newEvent: RegionEvent = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name || "Custom Event",
      description: description || "",
      date: date || "01-01",
      emoji: emoji || "🎉",
      isActive: true,
      autoDetectDaysBefore: 7,
      category: (category as RegionEvent["category"]) || "cultural",
      theme: theme || {
        primary: "#C9A227",
        secondary: "#f59e0b",
        gradient: "linear-gradient(135deg, #C9A227, #B8860B, #f59e0b)",
        bgPattern: "rgba(201,162,39,0.04)",
      },
    };

    customEvents.push(newEvent);

    // Upsert the SystemSetting
    await db.systemSetting.upsert({
      where: { key: customKey },
      update: {
        value: JSON.stringify(customEvents),
        category: "events",
      },
      create: {
        key: customKey,
        value: JSON.stringify(customEvents),
        category: "events",
      },
    });

    return NextResponse.json({ event: newEvent, customCount: customEvents.length });
  } catch (error: any) {
    logger.error("Events region POST error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to create custom event" }, { status: 500 });
  }
});

// DELETE — Delete a custom event by ID
export const DELETE = withAuth(async (req, authCtx) => {
  try {
    await ensureDb();
    const orgId = authCtx.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: "Organization required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("id");

    if (!eventId) {
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
    }

    const customKey = `custom-events-${orgId}`;
    const customSetting = await db.systemSetting.findUnique({
      where: { key: customKey },
    });

    if (!customSetting) {
      return NextResponse.json({ error: "No custom events found" }, { status: 404 });
    }

    let customEvents: RegionEvent[] = [];
    try {
      customEvents = JSON.parse(customSetting.value);
    } catch {
      customEvents = [];
    }

    customEvents = customEvents.filter((e) => e.id !== eventId);

    await db.systemSetting.update({
      where: { key: customKey },
      data: { value: JSON.stringify(customEvents) },
    });

    return NextResponse.json({ customCount: customEvents.length });
  } catch (error: any) {
    logger.error("Events region DELETE error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to delete custom event" }, { status: 500 });
  }
});

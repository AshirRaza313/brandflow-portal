import { NextRequest, NextResponse } from "next/server";
import { db, ensurePlatformSettingsColumns, withRetry} from "@/lib/db";
import { generateLeadMagnetPDF } from "@/lib/lead-magnet-generator";
import { withAuth } from "@/lib/auth-middleware";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { SUPPORT_EMAIL } from "@/lib/email";

// Simple in-memory cache: generated PDFs are valid for 10 minutes
let cachedPdf: { buffer: Buffer; timestamp: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/lead-magnet - Generates and serves the lead magnet PDF dynamically.
 * Uses PlatformSettings from DB for logo, contact info, social links.
 * NO AUTH required - public endpoint for lead downloads.
 * 
 * Phase 7: Added rate limiting to prevent PDF generation DoS.
 * Cache: PDF is cached in memory for 10 minutes to avoid regenerating on every request.
 */
export const GET = withRateLimit(async () => {
  try {
    // Check cache first
    if (cachedPdf && Date.now() - cachedPdf.timestamp < CACHE_TTL) {
      return new NextResponse(new Uint8Array(cachedPdf.buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="valtriox-introduction.pdf"`,
          "Cache-Control": "public, max-age=600",
        },
      });
    }

    // Ensure DB columns exist
    await ensurePlatformSettingsColumns();

    // Fetch settings from DB
    const settings = await withRetry(async () => {
      return await db.platformSettings.findFirst({
      orderBy: { createdAt: "desc" },
    })
    }, 2, 500);

    const companyName = settings?.companyName || "Valtriox";

    // Generate PDF with current settings
    const pdfBuffer = await generateLeadMagnetPDF({
      companyName,
      tagline: settings?.tagline || "COMMAND YOUR BRAND UNIVERSE",
      logoUrl: settings?.logoUrl || null,
      companyEmail: settings?.companyEmail || SUPPORT_EMAIL,
      companyPhone: settings?.companyPhone || null,
      companyWebsite: settings?.companyWebsite || null,
      companyAddress: settings?.companyAddress || null,
      whatsappNumber: settings?.whatsappNumber || null,
      instagramUrl: settings?.instagramUrl || null,
      facebookUrl: settings?.facebookUrl || null,
      twitterUrl: settings?.twitterUrl || null,
      linkedinUrl: settings?.linkedinUrl || null,
      discordUrl: settings?.discordUrl || null,
      redditUrl: settings?.redditUrl || null,
      youtubeUrl: settings?.youtubeUrl || null,
      tiktokUrl: settings?.tiktokUrl || null,
      supportHours: settings?.supportHours || "Monday–Friday, 9:00 AM–6:00 PM PKT",
      primaryBrandColor: settings?.primaryBrandColor || "#D4A73A",
    });

    // Cache the result
    cachedPdf = { buffer: pdfBuffer, timestamp: Date.now() };

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${(companyName || "").toLowerCase().replace(/\s+/g, '-')}-introduction.pdf"`,
        "Cache-Control": "public, max-age=600",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("[Lead Magnet] PDF generation error:", message);

    // If dynamic generation fails, fall back to static file
    try {
      const fs = await import("fs");
      const path = await import("path");
      const staticPath = path.join(process.cwd(), "public", "downloads", "valtriox-introduction.pdf");
      if (fs.existsSync(staticPath)) {
        const buffer = fs.readFileSync(staticPath);
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="valtriox-introduction.pdf"`,
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    } catch {}

    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}, { maxRequests: 20, windowSeconds: 60 });

/**
 * POST /api/lead-magnet - Force regenerate PDF (clears cache).
 * Requires admin auth - used by admin panel "Regenerate PDF" button.
 */
// FIX 1.8: POST requires platform admin auth — only admins can regenerate the PDF
export const POST = withRateLimit(withAuth(async (_req: NextRequest) => {
  try {
    // Clear cache
    cachedPdf = null;

    // Ensure DB columns exist
    await ensurePlatformSettingsColumns();

    // Fetch settings
    const settings = await withRetry(async () => {
      return await db.platformSettings.findFirst({
      orderBy: { createdAt: "desc" },
    })
    }, 2, 500);

    const companyName = settings?.companyName || "Valtriox";

    // Generate fresh PDF
    const pdfBuffer = await generateLeadMagnetPDF({
      companyName,
      tagline: settings?.tagline || "COMMAND YOUR BRAND UNIVERSE",
      logoUrl: settings?.logoUrl || null,
      companyEmail: settings?.companyEmail || SUPPORT_EMAIL,
      companyPhone: settings?.companyPhone || null,
      companyWebsite: settings?.companyWebsite || null,
      companyAddress: settings?.companyAddress || null,
      whatsappNumber: settings?.whatsappNumber || null,
      instagramUrl: settings?.instagramUrl || null,
      facebookUrl: settings?.facebookUrl || null,
      twitterUrl: settings?.twitterUrl || null,
      linkedinUrl: settings?.linkedinUrl || null,
      discordUrl: settings?.discordUrl || null,
      redditUrl: settings?.redditUrl || null,
      youtubeUrl: settings?.youtubeUrl || null,
      tiktokUrl: settings?.tiktokUrl || null,
      supportHours: settings?.supportHours || "Monday–Friday, 9:00 AM–6:00 PM PKT",
      primaryBrandColor: settings?.primaryBrandColor || "#D4A73A",
    });

    // Update cache
    cachedPdf = { buffer: pdfBuffer, timestamp: Date.now() };

    return NextResponse.json({
      success: true,
      message: "PDF regenerated successfully",
      size: pdfBuffer.length,
      pages: 9,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("[Lead Magnet] Regenerate error:", message);
    return NextResponse.json(
      { error: "Failed to regenerate PDF" },
      { status: 500 }
    );
  }
}, { requireRole: ["platform_owner", "platform_admin"] }), { maxRequests: 20, windowSeconds: 60 });

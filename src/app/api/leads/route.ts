import { NextRequest, NextResponse } from "next/server";
import { db, dbErrorResponse, withRetry} from "@/lib/db";
import { sanitizeObject } from "@/lib/sanitize";
import logger from "@/lib/logger";
import { sendEmail, SUPPORT_FROM, SUPPORT_REPLY_TO, SUPPORT_EMAIL } from "@/lib/email";
import { getLeadCaptureEmailHtml } from "@/lib/email-templates";
import { withRateLimit } from "@/lib/rate-limit";
import { createLeadSchema } from "@/lib/validations/schemas";

/**
 * Fire-and-forget: send a lead capture confirmation email to the new lead.
 * Tries to fetch platform settings from DB for personalized content;
 * falls back to env vars / defaults if DB is unavailable.
 * Wrapped in try-catch so email failures never break the lead submission.
 */
function sendLeadConfirmationEmail(leadEmail: string, leadName: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://valtriox.com';
  // Dynamic PDF - generated on-the-fly from PlatformSettings (logo + contact info)
  const downloadUrl = `${baseUrl}/api/lead-magnet`;

  // Build email data - fetch settings from DB for personalization
  db.platformSettings.findFirst()
    .then((settings) => {
      const platformName = settings?.companyName || 'Valtriox';
      const emailData = {
        leadName,
        leadEmail,
        companyName: settings?.companyName || 'Valtriox',
        platformName,
        platformWebsite: settings?.companyWebsite || baseUrl,
        companyEmail: settings?.companyEmail || SUPPORT_EMAIL,
        companyPhone: settings?.companyPhone || null,
        companyAddress: settings?.companyAddress || null,
        whatsappNumber: settings?.whatsappNumber || null,
        instagramUrl: settings?.instagramUrl || null,
        linkedinUrl: settings?.linkedinUrl || null,
        discordUrl: settings?.discordUrl || null,
        redditUrl: settings?.redditUrl || null,
        downloadUrl,
      };

      return sendEmail({
        to: leadEmail,
        from: SUPPORT_FROM,
        replyTo: SUPPORT_REPLY_TO,
        subject: `Thank You for Your Interest - ${platformName}`,
        html: getLeadCaptureEmailHtml(emailData),
      });
    })
    .catch(() => {
      // DB fetch failed - send with defaults
      logger.warn('[Leads] Could not fetch platform settings for email, using defaults');
      return sendEmail({
        to: leadEmail,
        subject: 'Thank You for Your Interest - Valtriox',
        html: getLeadCaptureEmailHtml({
          leadName,
          leadEmail,
          companyName: 'Valtriox',
          platformName: 'Valtriox',
          platformWebsite: baseUrl,
          companyEmail: SUPPORT_EMAIL,
          companyPhone: null,
          companyAddress: null,
          whatsappNumber: null,
          instagramUrl: null,
          linkedinUrl: null,
          discordUrl: null,
          redditUrl: null,
          downloadUrl,
        }),
      });
    })
    .then((sent) => {
      if (sent) {
        logger.info('[Leads] Confirmation email sent', { to: leadEmail });
      }
    })
    .catch((err) => {
      logger.warn('[Leads] Failed to send confirmation email', { to: leadEmail, error: String(err) });
    });
}

// POST /api/leads - Submit contact form (PUBLIC - no auth required)
// Phase 6: Added withRateLimit (5 req/min) + Zod validation
async function leadsPostHandler(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const sanitized = sanitizeObject(rawBody);
    // Phase 6: Zod validation for lead submission
    const parseResult = createLeadSchema.safeParse(sanitized);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json({ error: `Validation failed: ${errors}` }, { status: 422 });
    }
    const {
      fullName,
      email,
      phone,
      company,
      companySize,
      industry,
      interest,
      message,
      consultationType,
      calendlyBookingLink,
      source,
    } = parseResult.data;

    // Validation
    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
      return NextResponse.json({ error: "Full name is required (min 2 characters)" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    try {
      // Check for duplicate email within last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentLead = await withRetry(async () => {
        return await db.lead.findFirst({
        where: {
          email: email.trim().toLowerCase(),
          createdAt: { gte: oneDayAgo },
        },
      })
      }, 2, 500);

      if (recentLead) {
        return NextResponse.json({
          success: true,
          message: "We already received your inquiry recently. Our team will respond within 24 hours.",
          duplicate: true,
        });
      }

      // Create lead
      const lead = await withRetry(async () => {
        return await db.lead.create({
        data: {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone?.trim() || null,
          company: company?.trim() || null,
          companySize: companySize || null,
          industry: industry || null,
          interest: interest || null,
          message: message?.trim() || null,
          consultationType: consultationType || null,
          calendlyBookingLink: calendlyBookingLink?.trim() || null,
          status: "new",
          source: source || "website",
        },
      })
      }, 2, 500);

      logger.info("[Leads] New lead captured", { leadId: lead.id, email: lead.email, name: lead.fullName });

      // Fire-and-forget: send confirmation email
      sendLeadConfirmationEmail(lead.email, lead.fullName);

      return NextResponse.json({
        success: true,
        message: "Thank you! Your inquiry has been received. We'll respond within 24 hours.",
        leadId: lead.id,
      });
    } catch (dbError: unknown) {
      // Phase 6: Removed auto-repair DDL — schema changes must be done via migrations, not in request handlers
      const errMsg = dbError instanceof Error ? dbError.message : String(dbError);
      logger.error("[Leads] DB error during lead creation", { error: errMsg });

      // Database connection error - still return success for UX
      if (errMsg.includes("DATABASE_URL") || errMsg.includes("connection") || errMsg.includes("ENOTFOUND") || errMsg.includes("ECONNREFUSED") || errMsg.includes("ETIMEDOUT") || errMsg.includes("too many connections") || errMsg.includes("pool")) {
        logger.error("[Leads] Database connection failed, logging lead data", { fullName, email });
        // Fire-and-forget: send confirmation email even on DB failure
        const connErrEmail = (email as string).trim().toLowerCase();
        const connErrName = (fullName as string).trim();
        if (connErrEmail) {
          sendLeadConfirmationEmail(connErrEmail, connErrName);
        }
        return NextResponse.json({
          success: true,
          message: "Thank you! Your inquiry has been received. We'll respond within 24 hours.",
          fallback: true,
        });
      }

      throw dbError;
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("[Leads] Submit error", { message: errMsg });
    // Still return success for better UX - log lead data for manual processing
    logger.warn("[Leads] Returning success despite error (UX fallback)");
    return NextResponse.json({
      success: true,
      message: "Thank you! Your inquiry has been received. We'll respond within 24 hours.",
      fallback: true,
    });
  }
}

export const POST = withRateLimit(leadsPostHandler, { maxRequests: 5, windowSeconds: 60 });

// GET /api/leads - List leads (admin only)
export { GET } from "@/app/api/admin/leads/route";

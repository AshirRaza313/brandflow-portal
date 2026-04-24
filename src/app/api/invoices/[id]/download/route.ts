import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { generateInvoicePDF } from "@/lib/pdf-generator";
import { withAuth, RouteContext } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// Helper: safely parse date from DB (could be string if TEXT column type)
function safeDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  try {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

// GET /api/invoices/[id]/download — Download invoice as PDF
export const GET = withAuth(async (
  req: NextRequest,
  authCtx,
  ctx: RouteContext
) => {
  try {
    logger.info("[Invoices] Download GET request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const { id } = await ctx.params;

    if (!id) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    // 1. Fetch invoice with organization and payment proof
    let invoice: any;
    try {
      invoice = await db.invoice.findUnique({
        where: { id },
        include: {
          organization: {
            select: {
              id: true, name: true, email: true, phone: true, address: true,
              country: true, taxId: true, website: true,
            },
          },
        },
      });
    } catch (dbErr: any) {
      console.error("[Invoice Download] DB findUnique error:", dbErr?.message || dbErr);
      return NextResponse.json(
        { error: "Database error fetching invoice", details: dbErr?.message },
        { status: 500 }
      );
    }

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Security: verify the invoice belongs to the user's organization
    if (invoice.organizationId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // 2. Fetch platform settings (LATEST row — has logo + real data)
    let platformSettings: any = null;
    try {
      platformSettings = await db.platformSettings.findFirst({ orderBy: { createdAt: "desc" } });
    } catch (psErr: any) {
      console.warn("[Invoice Download] platformSettings fetch failed, using defaults:", psErr?.message || psErr);
    }

    // 3. Fetch subscription + plan details (for features, limits)
    let planFeatures: string[] = [];
    let planTeamLimit = 0;
    let planOrderLimit = 0;
    let planProductLimit = 0;
    let planTrialDays = 0;
    let paymentMethod: string | undefined;
    let transactionId: string | undefined;

    if (invoice.subscriptionId) {
      try {
        const subscription = await db.subscription.findUnique({
          where: { id: invoice.subscriptionId },
          include: {
            plan: true,
          },
        });
        if (subscription?.plan) {
          try {
            planFeatures = JSON.parse(subscription.plan.features || "[]");
          } catch { planFeatures = []; }
          planTeamLimit = subscription.plan.teamLimit || 0;
          planOrderLimit = subscription.plan.orderLimit || 0;
          planProductLimit = subscription.plan.productLimit || 0;
          planTrialDays = subscription.plan.trialDays || 0;
        }
      } catch (subErr: any) {
        console.warn("[Invoice Download] Subscription fetch failed:", subErr?.message);
      }
    }

    // 4. Fetch payment proof for payment method + transaction ID
    if (invoice.paymentProofId) {
      try {
        const proof = await db.paymentProof.findUnique({
          where: { id: invoice.paymentProofId },
          select: { paymentMethod: true, transactionId: true },
        });
        if (proof) {
          paymentMethod = proof.paymentMethod || undefined;
          transactionId = proof.transactionId || undefined;
        }
      } catch (proofErr: any) {
        console.warn("[Invoice Download] PaymentProof fetch failed:", proofErr?.message);
      }
    }

    // 5. Parse payment methods from platform settings (could be strings or objects)
    let parsedPaymentMethods: string[] = [];
    if (platformSettings?.paymentMethods) {
      try {
        const rawMethods = JSON.parse(platformSettings.paymentMethods);
        if (Array.isArray(rawMethods)) {
          parsedPaymentMethods = rawMethods.map((m: any) =>
            typeof m === "string" ? m : m?.name || "Payment Method"
          );
        }
      } catch { parsedPaymentMethods = []; }
    }

    // 6. Build comprehensive invoice data
    const invoiceData = {
      invoiceNumber: invoice.invoiceNumber || "N/A",
      status: invoice.status || "pending",
      planName: invoice.planName || "Unknown",
      amount: Number(invoice.amount) || 0,
      billingCycle: invoice.billingCycle || "monthly",
      currencySymbol: invoice.currencySymbol || "Rs.",
      currencyCode: invoice.currencyCode || "PKR",
      issuedAt: safeDate(invoice.issuedAt) || new Date(),
      dueDate: safeDate(invoice.dueDate),
      paidAt: safeDate(invoice.paidAt),
      periodStart: safeDate(invoice.periodStart),
      periodEnd: safeDate(invoice.periodEnd),
      notes: invoice.notes || null,
      paymentMethod: paymentMethod,
      transactionId: transactionId,
      // Organization details
      orgName: invoice.orgName || invoice.organization?.name || "Unknown Organization",
      orgEmail: invoice.orgEmail || invoice.organization?.email || undefined,
      orgPhone: invoice.orgPhone || invoice.organization?.phone || undefined,
      orgAddress: invoice.orgAddress || invoice.organization?.address || undefined,
      orgCountry: invoice.organization?.country || undefined,
      orgTaxId: invoice.organization?.taxId || undefined,
      // Platform/branding details from Professional Details tab
      platformName: platformSettings?.companyName || "BrandFlow",
      platformEmail: platformSettings?.companyEmail || undefined,
      platformPhone: platformSettings?.companyPhone || undefined,
      platformAddress: platformSettings?.companyAddress || undefined,
      platformWebsite: platformSettings?.companyWebsite || undefined,
      platformWhatsapp: platformSettings?.whatsappNumber || undefined,
      platformInstagram: platformSettings?.instagramUrl || undefined,
      platformFacebook: platformSettings?.facebookUrl || undefined,
      platformTwitter: platformSettings?.twitterUrl || undefined,
      platformSupportHours: platformSettings?.supportHours || undefined,
      platformInvoiceHeaderText: platformSettings?.invoiceHeaderText || undefined,
      platformPaymentMethods: parsedPaymentMethods.length > 0 ? parsedPaymentMethods : undefined,
      // Logo (base64 PNG)
      platformLogo: platformSettings?.logoUrl || undefined,
      platformTagline: platformSettings?.tagline || "Pakistan's #1 Brand Management Portal",
      // Plan details
      planFeatures: planFeatures.length > 0 ? planFeatures : undefined,
      planTeamLimit: planTeamLimit || undefined,
      planOrderLimit: planOrderLimit || undefined,
      planProductLimit: planProductLimit || undefined,
      planTrialDays: planTrialDays || undefined,
    };

    // 7. Generate PDF
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateInvoicePDF(invoiceData);
    } catch (pdfErr: any) {
      console.error("[Invoice Download] PDF generation error:", pdfErr?.message || pdfErr);
      return NextResponse.json(
        { error: "PDF generation failed", details: pdfErr?.message || String(pdfErr) },
        { status: 500 }
      );
    }

    // 8. Validate PDF buffer
    if (!pdfBuffer || pdfBuffer.length < 100) {
      console.error("[Invoice Download] PDF buffer too small:", pdfBuffer?.length);
      return NextResponse.json(
        { error: "Generated PDF is invalid or empty" },
        { status: 500 }
      );
    }

    // 9. Return PDF
    const statusLabel = (invoice.status || "pending").charAt(0).toUpperCase() + (invoice.status || "pending").slice(1);
    const filename = `${invoice.invoiceNumber || "invoice"}_${statusLabel}.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-cache, no-store",
      },
    });
  } catch (error: any) {
    console.error("[Invoice Download] Unhandled error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json(
      { error: "Failed to download invoice", details: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
});

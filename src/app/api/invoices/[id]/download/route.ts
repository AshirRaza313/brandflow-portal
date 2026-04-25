import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { generateInvoicePDF } from "@/lib/pdf-generator";
import { withAuth, RouteContext, isPlatformRole } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

function safeDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  try {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch { return null; }
}

export const GET = withAuth(async (req: NextRequest, authCtx, ctx: RouteContext) => {
  try {
    logger.info("[Invoice Download] GET request", { userId: authCtx.userId });
    await ensureDb();
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });

    const invoice = await db.invoice.findUnique({ where: { id } });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (!isPlatformRole(authCtx.role) && invoice.organizationId !== authCtx.organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let platformSettings: any = null;
    try { platformSettings = await db.platformSettings.findFirst(); } catch {}

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
      orgName: invoice.orgName || "Unknown",
      orgEmail: invoice.orgEmail || undefined,
      orgPhone: invoice.orgPhone || undefined,
      orgAddress: invoice.orgAddress || undefined,
      platformName: platformSettings?.companyName || "Valtriox",
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
      platformPaymentMethods: (() => { try { const p = platformSettings?.paymentMethods; return p ? JSON.parse(p) : undefined; } catch { return undefined; } })(),
      platformLogo: platformSettings?.logoUrl || undefined,
      platformTagline: platformSettings?.tagline || "The Universal Brand Management Portal",
    };

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateInvoicePDF(invoiceData);
    } catch (pdfErr: any) {
      console.error("[Invoice Download] PDF generation error:", pdfErr?.message);
      return NextResponse.json({ error: "PDF generation failed", details: pdfErr?.message }, { status: 500 });
    }

    if (!pdfBuffer || pdfBuffer.length < 100) {
      console.error("[Invoice Download] Invalid PDF buffer, length:", pdfBuffer?.length);
      return NextResponse.json({ error: "Generated invoice PDF is invalid" }, { status: 500 });
    }

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber || "invoice"}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("[Invoice Download] Error:", error?.message);
    return NextResponse.json({ error: "Failed to generate invoice PDF", details: error?.message }, { status: 500 });
  }
});

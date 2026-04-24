import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { generateInvoicePDF } from "@/lib/pdf-generator";
import { withAuth, RouteContext } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// Helper: safely parse date from DB
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

// GET /api/invoices/[id] — Get single invoice data or PDF
export const GET = withAuth(async (
  req: NextRequest,
  authCtx,
  ctx: RouteContext
) => {
  try {
    logger.info("[Invoices] GET request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const { id } = await ctx.params;
    const format = req.nextUrl.searchParams.get("format"); // "pdf" or null for JSON

    if (!id) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    let invoice;
    try {
      invoice = await db.invoice.findUnique({ where: { id } });
    } catch (dbErr: any) {
      console.error("[Invoice GET] DB error:", dbErr?.message);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Security: verify the invoice belongs to the user's organization
    if (invoice.organizationId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // If format=pdf, return PDF buffer
    if (format === "pdf") {
      let platformSettings: any = null;
      try {
        platformSettings = await db.platformSettings.findFirst();
      } catch (psErr: any) {
        console.warn("[Invoice GET] platformSettings fetch failed, using defaults");
      }

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
        platformName: platformSettings?.companyName || "BrandFlow",
        platformEmail: platformSettings?.companyEmail,
        platformPhone: platformSettings?.companyPhone || undefined,
        platformAddress: platformSettings?.companyAddress || undefined,
      };

      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await generateInvoicePDF(invoiceData);
      } catch (pdfErr: any) {
        console.error("[Invoice GET] PDF generation error:", pdfErr?.message);
        return NextResponse.json(
          { error: "PDF generation failed", details: pdfErr?.message },
          { status: 500 }
        );
      }

      return new Response(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${invoice.invoiceNumber || "invoice"}.pdf"`,
          "Content-Length": String(pdfBuffer.length),
          "Cache-Control": "no-cache",
        },
      });
    }

    // Otherwise return JSON
    return NextResponse.json({ invoice });
  } catch (error: any) {
    console.error("[Invoice GET] Unhandled error:", error?.message);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch invoice", details: error?.message }, { status: 500 });
  }
});

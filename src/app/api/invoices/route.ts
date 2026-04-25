import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { generateInvoiceNumber, generateInvoicePDF } from "@/lib/pdf-generator";
import { getCurrencyForCountry } from "@/lib/currency";
import { withAuth, isPlatformRole } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// POST /api/invoices — Create a new invoice
export const POST = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Invoices] POST request", { userId: authCtx.userId, orgId: authCtx.organizationId, role: authCtx.role });
    await ensureDb();
    const body = await req.json();
    const {
      organizationId,
      subscriptionId,
      paymentProofId,
      planName,
      amount,
      billingCycle,
      status = "pending",
      currencyCode,
      currencySymbol,
      notes,
      periodStart,
      periodEnd,
    } = body;

    if (!organizationId || !planName || amount === undefined) {
      return NextResponse.json(
        { error: "organizationId, planName, and amount are required" },
        { status: 400 }
      );
    }

    // Security: platform admins can create invoices for ANY organization;
    // regular users can only create for their own.
    const isAdmin = isPlatformRole(authCtx.role);
    if (!isAdmin && organizationId !== authCtx.organizationId) {
      return NextResponse.json(
        { error: "Organization mismatch. You can only create invoices for your own organization." },
        { status: 403 }
      );
    }

    // Get organization info
    let organization;
    try {
      organization = await db.organization.findUnique({
        where: { id: organizationId },
      });
    } catch (dbErr: any) {
      console.error("[Invoice Create] DB findUnique error:", dbErr?.message);
      return NextResponse.json(
        { error: "Database error fetching organization", details: dbErr?.message },
        { status: 500 }
      );
    }

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get currency info
    const country = organization.country || "PK";
    const currency = getCurrencyForCountry(country);

    // Count existing invoices for sequential number
    let invoiceCount = 0;
    try {
      invoiceCount = await db.invoice.count({
        where: { organizationId },
      });
    } catch (countErr: any) {
      console.warn("[Invoice Create] Invoice count failed, using 0:", countErr?.message);
    }
    const invoiceNumber = generateInvoiceNumber(invoiceCount);

    // Calculate due date (7 days from now for pending)
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    let invoice;
    try {
      invoice = await db.invoice.create({
        data: {
          invoiceNumber,
          organizationId,
          subscriptionId: subscriptionId || null,
          paymentProofId: paymentProofId || null,
          planName,
          amount: parseFloat(amount) || 0,
          billingCycle: billingCycle || "monthly",
          status,
          currencyCode: currencyCode || currency.code,
          currencySymbol: currencySymbol || currency.symbol,
          dueDate,
          periodStart: periodStart ? new Date(periodStart) : null,
          periodEnd: periodEnd ? new Date(periodEnd) : null,
          notes: notes || null,
          orgName: organization.name,
          orgEmail: organization.email || null,
          orgPhone: organization.phone || null,
          orgAddress: organization.address || null,
        },
      });
    } catch (createErr: any) {
      console.error("[Invoice Create] DB create error:", createErr?.message);
      if (createErr?.code === "P2002") {
        return NextResponse.json({ error: "Invoice number conflict. Please retry." }, { status: 409 });
      }
      return NextResponse.json(
        { error: "Failed to create invoice in database", details: createErr?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error: any) {
    console.error("[Invoice Create] Unhandled error:", error?.message);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to create invoice", details: error?.message }, { status: 500 });
  }
});

"use client";

import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useValtrioxStore } from "@/store/brandflow-store";
import { usePlatformIdentity } from "@/lib/platform-identity";
import { Printer, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ──

interface SubscriptionInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  planName: string;
  amount: number;
  billingCycle: string;
  currencySymbol: string;
  currencyCode: string;
  issuedAt: string;
  dueDate: string | null;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  notes: string | null;
  orgName: string | null;
  orgEmail: string | null;
  orgPhone: string | null;
  orgAddress: string | null;
  orgCountry: string | null;
  orgTaxId: string | null;
  paymentMethod: string | null;
  transactionId: string | null;
  platformName?: string;
  platformEmail?: string;
  platformPhone?: string;
  platformAddress?: string;
  platformWebsite?: string;
  platformTagline?: string;
  platformLogo?: string;
}

interface SubscriptionInvoiceViewProps {
  invoice: SubscriptionInvoice | null;
  open: boolean;
  onClose: () => void;
}

// ── Helpers ──

function formatCurrency(amount: number, symbol: string): string {
  return `${symbol} ${amount.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getStatusConfig(status: string) {
  switch (status) {
    case "paid":
    case "approved":
      return { label: status === "paid" ? "PAID" : "APPROVED", color: "#059669", bg: "#ecfdf5", dot: "#059669" };
    case "pending":
      return { label: "PENDING", color: "#d97706", bg: "#fffbeb", dot: "#d97706" };
    case "cancelled":
      return { label: "CANCELLED", color: "#dc2626", bg: "#fef2f2", dot: "#dc2626" };
    case "refunded":
      return { label: "REFUNDED", color: "#7c3aed", bg: "#f5f3ff", dot: "#7c3aed" };
    default:
      return { label: status.toUpperCase(), color: "#64748b", bg: "#f1f5f9", dot: "#64748b" };
  }
}

// ── Component ──

export function SubscriptionInvoiceView({ invoice, open, onClose }: SubscriptionInvoiceViewProps) {
  const { brandName, brandLogo, organization } = useValtrioxStore();
  const { identity } = usePlatformIdentity();
  const invoiceRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  const statusConfig = getStatusConfig(invoice.status);
  const platformName = invoice.platformName || identity.companyName || "Valtriox";
  const platformLogo = invoice.platformLogo || null;
  const displayBrand = brandName || organization?.name || platformName;
  const displayLogo = platformLogo || brandLogo || organization?.logo || null;
  const cycleLabel = invoice.billingCycle === "annually" ? "Annual" : "Monthly";

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print invoices");
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* ── Tailwind fallback classes for print window ── */
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .items-start { align-items: flex-start; }
    .justify-between { justify-content: space-between; }
    .justify-end { justify-content: flex-end; }
    .gap-1\\.5 { gap: 6px; }
    .gap-2 { gap: 8px; }
    .gap-3 { gap: 12px; }
    .gap-8 { gap: 32px; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .w-full { width: 100%; }
    .w-12, .h-12 { width: 48px; height: 48px; }
    .rounded-xl { border-radius: 12px; }
    .rounded-lg { border-radius: 8px; }
    .rounded-full { border-radius: 9999px; }
    .inline-flex { display: inline-flex; }
    .object-cover { object-fit: cover; }
    .space-y-1 > * + * { margin-top: 4px; }
    .space-y-2 > * + * { margin-top: 8px; }
    .font-medium { font-weight: 500; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .font-extrabold { font-weight: 800; }
    .tracking-tight { letter-spacing: -0.025em; }
    .tracking-wider { letter-spacing: 0.05em; }
    .tracking-\\[0\\.3em\\] { letter-spacing: 0.3em; }
    .mt-1 { margin-top: 4px; }
    .mt-2 { margin-top: 8px; }
    .mt-4 { margin-top: 16px; }
    .mt-6 { margin-top: 24px; }
    .mb-3 { margin-bottom: 12px; }
    .mb-4 { margin-bottom: 16px; }
    .mx-8 { margin-left: 32px; margin-right: 32px; }
    .px-3 { padding-left: 12px; padding-right: 12px; }
    .px-4 { padding-left: 16px; padding-right: 16px; }
    .px-5 { padding-left: 20px; padding-right: 20px; }
    .px-8 { padding-left: 32px; padding-right: 32px; }
    .py-1 { padding-top: 4px; padding-bottom: 4px; }
    .py-2 { padding-top: 8px; padding-bottom: 8px; }
    .pt-1 { padding-top: 4px; }
    .pt-5 { padding-top: 20px; }
    .pt-8 { padding-top: 32px; }
    .pb-3 { padding-bottom: 12px; }
    .pb-6 { padding-bottom: 24px; }
    .pb-8 { padding-bottom: 32px; }
    .p-5 { padding: 20px; }
    .p-4 { padding: 16px; }
    .uppercase { text-transform: uppercase; }
    .capitalize { text-transform: capitalize; }
    .overflow-hidden { overflow: hidden; }
    .border-2 { border-width: 2px; border-style: solid; }
    .border-b-2 { border-bottom-width: 2px; }
    .border-t-2 { border-top-width: 2px; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }
    .shrink-0 { flex-shrink: 0; }
    .h-1 { height: 4px; }
    .h-2 { height: 8px; }
    .w-2 { width: 8px; }
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .leading-relaxed { line-height: 1.625; }
    .italic { font-style: italic; }
    .font-mono { font-family: 'Courier New', monospace; }
    .text-xs { font-size: 0.75rem; line-height: 1rem; }
    .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
    .text-base { font-size: 1rem; line-height: 1.5rem; }
    .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
    .text-2xl { font-size: 1.5rem; line-height: 2rem; }
    .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
    .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
    .text-\\[11px\\] { font-size: 11px; }
    .text-\\[10px\\] { font-size: 10px; }
    .tracking-widest { letter-spacing: 0.1em; }
    .mb-5 { margin-bottom: 20px; }
    .max-w-\\[85vw\\] { max-width: 85vw; }
    .bg-gradient-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops)); }
    .from-amber-400 { --tw-gradient-from: #fbbf24; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to); }
    .via-amber-500 { --tw-gradient-via: #f59e0b; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to); }
    .to-amber-400 { --tw-gradient-to: #fbbf24; }

    /* ── Color utilities ── */
    .text-slate-900 { color: #0f172a; }
    .text-slate-700 { color: #334155; }
    .text-slate-600 { color: #475569; }
    .text-slate-500 { color: #64748b; }
    .text-slate-400 { color: #94a3b8; }
    .text-slate-50 { color: #f8fafc; }
    .text-amber-500 { color: #f59e0b; }
    .text-amber-900 { color: #78350f; }
    .text-amber-800 { color: #92400e; }
    .text-amber-700 { color: #b45309; }
    .text-emerald-600 { color: #059669; }
    .text-muted-foreground { color: #64748b; }
    .text-foreground { color: #0f172a; }
    .bg-slate-50 { background-color: #f8fafc; }
    .bg-slate-100 { background-color: #f1f5f9; }
    .bg-amber-50 { background-color: #fffbeb; }
    .bg-gradient-to-br { background-image: linear-gradient(to bottom right, var(--tw-gradient-stops)); }
    .from-amber-50 { --tw-gradient-from: #fffbeb; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
    .to-yellow-50 { --tw-gradient-to: #fefce8; }
    .from-amber-400 { --tw-gradient-from: #fbbf24; }
    .to-amber-600 { --tw-gradient-to: #d97706; }
    .border-amber-200\\/60 { border-color: rgba(253, 224, 71, 0.6); }
    .border-slate-100 { border-color: #f1f5f9; }
    .border-slate-200 { border-color: #e2e8f0; }
    .border-amber-200 { border-color: #fde68a; }

    /* ── Separator ── */
    [data-slot="separator"] { border-bottom: 1px solid #e2e8f0; }
    .my-3 { margin-top: 12px; margin-bottom: 12px; }

    /* ── Shadow ── */
    .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1); }
    .shadow-amber-200 { box-shadow: 0 10px 15px -3px rgba(253, 224, 71, 0.2); }
    .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); }

    body {
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #1e293b;
      background: #fff;
      padding: 48px;
      max-width: 800px;
      margin: 0 auto;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Top accent bar */
    .top-bar {
      height: 4px;
      background: linear-gradient(90deg, #f59e0b 0%, #d97706 50%, #f59e0b 100%);
      margin: -48px -48px 0 -48px;
      border-radius: 0;
    }

    /* Header */
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 36px;
      padding-bottom: 28px;
      border-bottom: 2px solid #e2e8f0;
    }
    .brand-info { display: flex; align-items: center; gap: 14px; }
    .brand-logo {
      width: 48px; height: 48px; border-radius: 12px; object-fit: cover;
      border: 2px solid #f1f5f9;
    }
    .brand-logo-placeholder {
      width: 48px; height: 48px; border-radius: 12px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 800; font-size: 16px;
    }
    .brand-info h1 { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .brand-info .tagline { font-size: 11px; color: #94a3b8; margin-top: 2px; font-style: italic; }
    .brand-info .contact { font-size: 11px; color: #64748b; margin-top: 6px; line-height: 1.6; }

    .invoice-title-section { text-align: right; }
    .invoice-title-section h2 {
      font-size: 32px; font-weight: 800; color: #C9A227;
      letter-spacing: 1px; text-transform: uppercase;
    }
    .invoice-number { font-size: 12px; color: #64748b; margin-top: 4px; font-family: 'Courier New', monospace; }
    .status-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 14px; border-radius: 100px; font-size: 11px;
      font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
      margin-top: 10px;
    }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; }

    /* Bill To + Details Grid */
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 32px;
    }
    .detail-section h3 {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 12px;
    }
    .bill-to .org-name { font-size: 16px; font-weight: 700; color: #0f172a; }
    .bill-to .detail-line { font-size: 12px; color: #475569; line-height: 1.8; }
    .invoice-details .detail-row {
      display: flex; justify-content: space-between;
      padding: 6px 0; border-bottom: 1px solid #f1f5f9;
      font-size: 12px;
    }
    .invoice-details .detail-label { color: #64748b; }
    .invoice-details .detail-value { color: #1e293b; font-weight: 600; }

    /* Plan Card */
    .plan-card {
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      border: 1px solid #fde68a;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .plan-card-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 16px;
    }
    .plan-name { font-size: 18px; font-weight: 800; color: #92400e; }
    .plan-cycle-badge {
      background: rgba(217, 119, 6, 0.15); color: #92400e;
      padding: 4px 12px; border-radius: 100px;
      font-size: 11px; font-weight: 700; text-transform: uppercase;
    }
    .plan-description {
      font-size: 13px; color: #78350f; line-height: 1.6;
    }

    /* Amount Section */
    .amount-section {
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .amount-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0;
    }
    .amount-label { font-size: 13px; color: #64748b; }
    .amount-value { font-size: 13px; color: #334155; font-weight: 600; }
    .amount-divider { border-top: 2px solid #cbd5e1; margin: 8px 0; }
    .total-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 0 0;
    }
    .total-label { font-size: 14px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; }
    .total-value { font-size: 28px; font-weight: 800; color: #C9A227; }

    /* Payment Info */
    .payment-info {
      background: #f1f5f9;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 24px;
      font-size: 12px;
      color: #475569;
    }
    .payment-info strong { color: #334155; }

    /* Notes */
    .notes {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .notes strong { color: #92400e; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .notes p { font-size: 12px; color: #78350f; margin-top: 6px; line-height: 1.6; }

    /* Footer */
    .invoice-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
    }
    .invoice-footer .thank-you { font-size: 14px; font-weight: 600; color: #334155; }
    .invoice-footer .powered-by { font-size: 11px; color: #94a3b8; margin-top: 6px; }
    .invoice-footer .contact-row { font-size: 10px; color: #94a3b8; margin-top: 8px; }
    .invoice-footer .watermark {
      font-size: 48px; font-weight: 800; color: rgba(0,0,0,0.015);
      text-transform: uppercase; letter-spacing: 12px; margin-top: 16px;
      transform: rotate(-15deg);
    }

    @media print {
      body { padding: 24px; }
      .top-bar { margin: -24px -24px 0 -24px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  ${printContent.innerHTML}
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      toast.success("Invoice sent to printer");
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Invoice — {invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur-sm">
          <div>
            <h2 className="text-sm font-semibold">Invoice Preview</h2>
            <p className="text-xs text-muted-foreground">{invoice.invoiceNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              size="sm"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Invoice Content (printable) */}
        <div ref={invoiceRef}>
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400" />

          {/* Header */}
          <div className="flex items-start justify-between px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              {displayLogo ? (
                <img src={displayLogo} alt={displayBrand} className="w-12 h-12 rounded-xl object-cover border-2 border-slate-100" />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 text-white font-extrabold text-base shadow-lg shadow-amber-200">
                  {displayBrand[0]?.toUpperCase() || "V"}
                </div>
              )}
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{displayBrand}</h1>
                <p className="text-[11px] text-slate-400 italic">{invoice.platformTagline || "The Universal Brand Management Portal"}</p>
                {(invoice.platformEmail || invoice.platformPhone || invoice.platformWebsite) && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    {[invoice.platformEmail, invoice.platformPhone, invoice.platformWebsite].filter(Boolean).join("  |  ")}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-extrabold text-amber-500 tracking-wider uppercase">INVOICE</h2>
              <p className="text-xs text-slate-400 font-mono mt-1">{invoice.invoiceNumber}</p>
              <div className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mt-2",
              )}
              style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusConfig.dot }} />
                {statusConfig.label}
              </div>
            </div>
          </div>

          <Separator className="mx-8" />

          {/* Bill To & Invoice Details */}
          <div className="grid grid-cols-2 gap-8 px-8 py-6">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Billed To</h3>
              <p className="text-base font-bold text-slate-900">{invoice.orgName || "Organization"}</p>
              {invoice.orgEmail && <p className="text-xs text-slate-500 mt-1">{invoice.orgEmail}</p>}
              {invoice.orgPhone && <p className="text-xs text-slate-500">{invoice.orgPhone}</p>}
              {invoice.orgAddress && <p className="text-xs text-slate-500">{invoice.orgAddress}</p>}
              {invoice.orgCountry && <p className="text-xs text-slate-500">{invoice.orgCountry}</p>}
              {invoice.orgTaxId && <p className="text-[11px] text-slate-400 mt-1 font-mono">Tax ID: {invoice.orgTaxId}</p>}
            </div>
            <div className="text-right">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Invoice Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Issue Date</span>
                  <span className="font-medium text-slate-700">{formatDate(invoice.issuedAt)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Due Date</span>
                  <span className="font-medium text-slate-700">{formatDate(invoice.dueDate || invoice.issuedAt)}</span>
                </div>
                {invoice.paidAt && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Paid On</span>
                    <span className="font-medium text-emerald-600">{formatDate(invoice.paidAt)}</span>
                  </div>
                )}
                {invoice.periodStart && invoice.periodEnd && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Period</span>
                    <span className="font-medium text-slate-700">{formatDate(invoice.periodStart)} — {formatDate(invoice.periodEnd)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Plan Card */}
          <div className="mx-8 mb-4 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200/60 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-extrabold text-amber-900 capitalize">
                {invoice.planName.charAt(0).toUpperCase() + invoice.planName.slice(1)} Plan
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-200/50 text-amber-800 text-[11px] font-bold uppercase">
                {cycleLabel} Billing
              </span>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              Professional subscription plan with premium features and priority support for your business growth.
            </p>
          </div>

          {/* Amount Section */}
          <div className="mx-8 mb-4 rounded-xl bg-slate-50 border-2 border-slate-200 p-5">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-500">
                {invoice.planName.charAt(0).toUpperCase() + invoice.planName.slice(1)} Plan — {cycleLabel} Subscription
              </span>
              <span className="text-sm font-semibold text-slate-700">
                {formatCurrency(invoice.amount, invoice.currencySymbol)}
              </span>
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-600">Total Due</span>
              <span className="text-2xl font-extrabold text-amber-500">
                {formatCurrency(invoice.amount, invoice.currencySymbol)}
              </span>
            </div>
          </div>

          {/* Payment Info */}
          {(invoice.paymentMethod || invoice.transactionId) && (
            <div className="mx-8 mb-4 rounded-lg bg-slate-100 p-4 space-y-1">
              {invoice.paymentMethod && (
                <p className="text-xs">
                  <span className="font-semibold text-slate-600">Payment Method:</span>{" "}
                  <span className="text-slate-500">{invoice.paymentMethod.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                </p>
              )}
              {invoice.transactionId && (
                <p className="text-xs">
                  <span className="font-semibold text-slate-600">Transaction ID:</span>{" "}
                  <span className="text-slate-500 font-mono">{invoice.transactionId}</span>
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="mx-8 mb-4 rounded-lg bg-amber-50 border border-amber-200/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">Notes</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mx-8 mt-6 pt-5 border-t-2 border-slate-200 text-center pb-8">
            <p className="text-sm font-semibold text-slate-600">
              Thank you for choosing {platformName}!
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {displayBrand} — Powered by {platformName}
            </p>
            {(invoice.platformWebsite || invoice.platformEmail || invoice.platformPhone) && (
              <p className="text-[10px] text-slate-400 mt-2">
                {[invoice.platformWebsite, invoice.platformEmail, invoice.platformPhone].filter(Boolean).join("  |  ")}
              </p>
            )}
            <p className="text-4xl font-extrabold text-slate-50 mt-4 tracking-[0.3em] uppercase" style={{ WebkitTextStroke: "1px rgba(0,0,0,0.03)" }}>
              Valtriox
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

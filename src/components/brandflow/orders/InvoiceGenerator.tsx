"use client";

import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useValtrioxStore } from "@/store/brandflow-store";
import { usePlatformIdentity } from "@/lib/platform-identity";
import { Printer, Download, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

interface InvoiceOrder {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  channel: string;
  notes?: string | null;
  createdAt: string;
  customer: { name: string; email?: string | null; phone?: string | null; city?: string | null; address?: string | null } | null;
  items: OrderItem[];
}

interface InvoiceGeneratorProps {
  order: InvoiceOrder | null;
  open: boolean;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPKR(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "pending": return "Pending";
    case "confirmed": return "Confirmed";
    case "packed": return "Packed";
    case "dispatched": return "Dispatched";
    case "delivered": return "Delivered";
    case "cancelled": return "Cancelled";
    case "returns": return "Returned";
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function getPaymentStatus(status: string): { label: string; color: string; bgColor: string } {
  switch (status) {
    case "delivered":
      return { label: "Paid", color: "text-amber-700", bgColor: "bg-amber-50" };
    case "cancelled":
      return { label: "Cancelled", color: "text-red-700", bgColor: "bg-red-50" };
    case "returns":
      return { label: "Refunded", color: "text-amber-700", bgColor: "bg-amber-50" };
    default:
      return { label: "Unpaid", color: "text-amber-700", bgColor: "bg-amber-50" };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InvoiceGenerator({ order, open, onClose }: InvoiceGeneratorProps) {
  const { brandName, brandLogo, organization } = useValtrioxStore();
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;
  const invoiceRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const paymentStatus = getPaymentStatus(order.status);
  const displayBrand = brandName || organization?.name || companyName;
  const displayLogo = brandLogo || organization?.logo;

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print invoices");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${order.orderNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1e293b;
            background: #fff;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          /* ── Fallback: make flex layouts work via common Tailwind classes ── */
          .flex { display: flex; }
          .flex-col { flex-direction: column; }
          .items-center { align-items: center; }
          .items-start { align-items: flex-start; }
          .justify-between { justify-content: space-between; }
          .justify-end { justify-content: flex-end; }
          .gap-2 { gap: 8px; }
          .gap-3 { gap: 12px; }
          .gap-8 { gap: 32px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .w-full { width: 100%; }
          .w-64 { width: 256px; }
          .w-10, .h-10 { width: 40px; height: 40px; }
          .rounded-lg { border-radius: 8px; }
          .rounded-xl { border-radius: 12px; }
          .inline-flex { display: inline-flex; }
          .object-cover { object-fit: cover; }
          .space-y-2 > * + * { margin-top: 8px; }
          .space-y-1 > * + * { margin-top: 4px; }
          .font-medium { font-weight: 500; }
          .font-semibold { font-weight: 600; }
          .font-bold { font-weight: 700; }
          .font-extrabold { font-weight: 800; }
          .tracking-tight { letter-spacing: -0.025em; }
          .tracking-wider { letter-spacing: 0.05em; }
          .mt-1 { margin-top: 4px; }
          .mt-2 { margin-top: 8px; }
          .mt-6 { margin-top: 24px; }
          .mt-8 { margin-top: 32px; }
          .mb-1 { margin-bottom: 4px; }
          .mb-2 { margin-bottom: 8px; }
          .mx-8 { margin-left: 32px; margin-right: 32px; }
          .pt-1 { padding-top: 4px; }
          .pt-4 { padding-top: 16px; }
          .pt-6 { padding-top: 24px; }
          .pt-8 { padding-top: 32px; }
          .pb-3 { padding-bottom: 12px; }
          .pb-6 { padding-bottom: 24px; }
          .pb-8 { padding-bottom: 32px; }
          .px-2 { padding-left: 8px; padding-right: 8px; }
          .px-3 { padding-left: 12px; padding-right: 12px; }
          .px-4 { padding-left: 16px; padding-right: 16px; }
          .px-8 { padding-left: 32px; padding-right: 32px; }
          .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
          .py-3 { padding-top: 12px; padding-bottom: 12px; }
          .py-4 { padding-top: 16px; padding-bottom: 16px; }
          .p-4 { padding: 16px; }
          .uppercase { text-transform: uppercase; }
          .overflow-hidden { overflow: hidden; }
          .text-xs { font-size: 0.75rem; line-height: 1rem; }
          .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
          .text-base { font-size: 1rem; line-height: 1.5rem; }
          .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
          .text-2xl { font-size: 1.5rem; line-height: 2rem; }
          .text-\\[11px\\] { font-size: 11px; }
          .text-\\[10px\\] { font-size: 10px; }

          /* ── Color utilities ── */
          .text-slate-900 { color: #0f172a; }
          .text-slate-700 { color: #334155; }
          .text-slate-500 { color: #64748b; }
          .text-amber-600 { color: #C9A227; }
          .text-red-600 { color: #dc2626; }
          .text-muted-foreground { color: #64748b; }
          .text-foreground { color: #0f172a; }
          .bg-amber-600 { background-color: #C9A227; }
          .bg-slate-50 { background-color: #f8fafc; }
          .bg-amber-50 { background-color: #fffbeb; }
          .bg-red-50 { background-color: #fef2f2; }
          .bg-amber-500\\/20 { background-color: rgba(245, 158, 11, 0.2); }
          .bg-red-500\\/20 { background-color: rgba(239, 68, 68, 0.2); }
          .border-slate-100 { border-color: #f1f5f9; }
          .border-slate-200 { border-color: #e2e8f0; }
          .border-b { border-bottom-width: 1px; }
          .border-b-2 { border-bottom-width: 2px; }
          .border-t { border-top-width: 1px; }
          .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }

          /* ── Separator ── */
          [data-slot="separator"] {
            border-bottom: 1px solid #e2e8f0;
            margin-left: 32px;
            margin-right: 32px;
          }
          .shrink-0 { flex-shrink: 0; }
          .h-px { height: 1px; }
          .h-1\\.5 { height: 6px; }
          .w-1\\.5 { width: 6px; }
          .bg-current { background-color: currentColor; }
          .border { border-width: 1px; border-style: solid; }
          .relative { position: relative; }
          .absolute { position: absolute; }
          .top-1\\/2 { top: 50%; }
          .-translate-y-1\\/2 { transform: translateY(-50%); }
          .right-3 { right: 12px; }
          .cursor-pointer { cursor: pointer; }
          .hover\\:text-amber-400:hover { color: #fbbf24; }
          .transition-colors { transition-property: color, background-color, border-color; }
          .bg-gradient-to-br { background-image: linear-gradient(to bottom right, var(--tw-gradient-stops)); }
          .from-amber-400 { --tw-gradient-from: #fbbf24; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
          .to-amber-600 { --tw-gradient-to: #d97706; }
          .text-white { color: #ffffff; }
          .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1); }
          .max-w-sm { max-width: 24rem; }
          .bg-\\[\\#0a0a0f\\] { background-color: #0a0a0f; }
          .backdrop-blur-xl { backdrop-filter: blur(24px); }
          .border-b \\+ \\{ border-bottom-width: 1px; }

          /* ── Invoice-specific layout ── */
          table {
            width: 100%;
            border-collapse: collapse;
          }
          table thead th {
            background: #f8fafc;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            padding: 12px 16px;
            text-align: left;
            border-bottom: 2px solid #e2e8f0;
          }
          table thead th:nth-child(2) { text-align: center; width: 80px; }
          table thead th:nth-child(3),
          table thead th:nth-child(4) { text-align: right; width: 112px; }
          table tbody td {
            padding: 12px 16px;
            font-size: 13px;
            color: #334155;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
          }
          table tbody td:nth-child(2) { text-align: center; }
          table tbody td:nth-child(3),
          table tbody td:nth-child(4) { text-align: right; }
          table tbody tr:last-child td { border-bottom: none; }

          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      toast.success("Invoice sent to printer");
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Invoice Preview — {order.orderNumber}</DialogTitle>
        </DialogHeader>

        {/* ── Toolbar ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur-sm">
          <div>
            <h2 className="text-sm font-semibold">Invoice Preview</h2>
            <p className="text-xs text-muted-foreground">{order.orderNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              size="sm"
            >
              <Printer className="h-4 w-4" />
              Print Invoice
            </Button>
          </div>
        </div>

        {/* ── Invoice Content (printable) ── */}
        <div ref={invoiceRef}>
          {/* Header */}
          <div className="flex items-start justify-between px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              {displayLogo ? (
                <img src={displayLogo} alt={displayBrand} className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-amber-600 text-white font-bold text-sm">
                  {displayBrand[0]?.toUpperCase() || "B"}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold tracking-tight">{displayBrand}</h1>
                {organization?.email && (
                  <p className="text-xs text-muted-foreground">{organization.email}</p>
                )}
                {organization?.phone && (
                  <p className="text-xs text-muted-foreground">{organization.phone}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-extrabold text-amber-600 tracking-tight">INVOICE</h2>
              <p className="text-xs text-muted-foreground mt-1">{formatDate(order.createdAt)}</p>
              <div className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-2",
                paymentStatus.bgColor, paymentStatus.color
              )}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {paymentStatus.label}
              </div>
            </div>
          </div>

          <Separator className="mx-8" />

          {/* Bill To & Invoice Details */}
          <div className="flex justify-between gap-8 px-8 py-6">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Bill To</h3>
              <p className="font-semibold text-sm">{order.customer?.name || "Walk-in Customer"}</p>
              {order.customer?.phone && <p className="text-xs text-muted-foreground mt-0.5">{order.customer.phone}</p>}
              {order.customer?.email && <p className="text-xs text-muted-foreground">{order.customer.email}</p>}
              {(order.customer as any)?.city && <p className="text-xs text-muted-foreground">{(order.customer as any).city}</p>}
              {(order.customer as any)?.address && <p className="text-xs text-muted-foreground">{(order.customer as any).address}</p>}
            </div>
            <div className="text-right">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Invoice Details</h3>
              <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Invoice #:</span> {order.orderNumber}</p>
              <p className="text-xs text-muted-foreground mt-0.5"><span className="font-medium text-foreground">Date:</span> {formatDate(order.createdAt)}</p>
              <p className="text-xs text-muted-foreground mt-0.5"><span className="font-medium text-foreground">Channel:</span> {order.channel.charAt(0).toUpperCase() + order.channel.slice(1)}</p>
              <p className="text-xs text-muted-foreground mt-0.5"><span className="font-medium text-foreground">Status:</span> {getStatusLabel(order.status)}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="px-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-3 px-4 text-left bg-slate-50/80">
                    Product
                  </th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-3 px-4 text-center bg-slate-50/80 w-20">
                    Qty
                  </th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-3 px-4 text-right bg-slate-50/80 w-28">
                    Unit Price
                  </th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-3 px-4 text-right bg-slate-50/80 w-28">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium">{item.productName}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm text-muted-foreground">{item.quantity}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm text-muted-foreground">{formatPKR(item.price)}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-semibold">{formatPKR(item.total)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end px-8 pt-4">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPKR(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium text-red-600">-{formatPKR(order.discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-extrabold pt-1">
                <span>Total</span>
                <span className="text-amber-600">{formatPKR(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="mx-8 mt-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-xs">
                <strong className="text-foreground">Notes:</strong>{" "}
                <span className="text-muted-foreground">{order.notes}</span>
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="px-8 mt-8 pb-8 pt-6 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Thank you for your business!
            </p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              {displayBrand} — Powered by {companyName} Portal
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

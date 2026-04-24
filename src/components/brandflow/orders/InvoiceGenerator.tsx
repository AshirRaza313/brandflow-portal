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
import { useBrandOnyxStore } from "@/store/brandflow-store";
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
      return { label: "Paid", color: "text-emerald-700", bgColor: "bg-emerald-50" };
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
  const { brandName, brandLogo, organization } = useBrandOnyxStore();
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
          .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 32px;
            padding-bottom: 24px;
            border-bottom: 2px solid #e2e8f0;
          }
          .brand-info h1 {
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          .brand-info p {
            font-size: 12px;
            color: #64748b;
            margin-top: 4px;
          }
          .invoice-meta {
            text-align: right;
          }
          .invoice-meta h2 {
            font-size: 28px;
            font-weight: 800;
            color: #059669;
            letter-spacing: -0.5px;
          }
          .invoice-meta p {
            font-size: 13px;
            color: #64748b;
            margin-top: 4px;
          }
          .billing-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 32px;
            gap: 40px;
          }
          .bill-to h3, .invoice-details h3 {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #94a3b8;
            margin-bottom: 12px;
          }
          .bill-to p, .invoice-details p {
            font-size: 13px;
            color: #334155;
            line-height: 1.8;
          }
          .bill-to .name {
            font-weight: 600;
            font-size: 15px;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          thead th {
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
          thead th:last-child {
            text-align: right;
          }
          tbody td {
            padding: 12px 16px;
            font-size: 13px;
            color: #334155;
            border-bottom: 1px solid #f1f5f9;
          }
          tbody td:last-child {
            text-align: right;
            font-weight: 600;
            color: #0f172a;
          }
          tbody tr:last-child td {
            border-bottom: none;
          }
          .totals-section {
            display: flex;
            justify-content: flex-end;
          }
          .totals-table {
            width: 280px;
          }
          .totals-table .row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 13px;
            color: #64748b;
          }
          .totals-table .row.total {
            border-top: 2px solid #e2e8f0;
            margin-top: 8px;
            padding-top: 16px;
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
          }
          .payment-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 16px;
            border-radius: 100px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 16px;
          }
          .payment-badge.paid { background: #ecfdf5; color: #059669; }
          .payment-badge.unpaid { background: #fffbeb; color: #d97706; }
          .payment-badge.cancelled { background: #fef2f2; color: #dc2626; }
          .payment-badge.refunded { background: #fffbeb; color: #d97706; }
          .footer {
            margin-top: 48px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #94a3b8;
            font-size: 11px;
          }
          .notes {
            margin-top: 24px;
            padding: 16px;
            background: #f8fafc;
            border-radius: 8px;
            font-size: 13px;
            color: #64748b;
          }
          .notes strong {
            color: #334155;
          }
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
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
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
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-emerald-600 text-white font-bold text-sm">
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
              <h2 className="text-2xl font-extrabold text-emerald-600 tracking-tight">INVOICE</h2>
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
                <span className="text-emerald-600">{formatPKR(order.total)}</span>
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

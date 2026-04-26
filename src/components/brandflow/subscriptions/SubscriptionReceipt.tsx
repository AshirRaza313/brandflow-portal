"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { usePlatformIdentity } from "@/lib/platform-identity";
import {
  CheckCircle2,
  Download,
  X,
  Shield,
  CalendarDays,
  CreditCard,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export interface ReceiptData {
  receiptNumber: string;
  date: string;
  orgName: string;
  orgEmail: string;
  orgPhone?: string;
  planName: string;
  amount: number;
  currencySymbol: string;
  currencyFlag: string;
  paymentMethod: string;
  transactionId: string;
  periodStart: string;
  periodEnd: string;
  approvedBy: string;
  approvedAt: string;
  platformName: string;
  platformEmail: string;
  platformPhone?: string;
  platformAddress?: string;
  platformLogo?: string;
}

export function SubscriptionReceipt({
  data,
  onClose,
}: {
  data: ReceiptData;
  onClose: () => void;
}) {
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create printable version
    const printContent = document.getElementById("receipt-printable");
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${data.receiptNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; }
          .receipt { max-width: 800px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #0a0a0f, #1a1a2e); color: white; padding: 32px; position: relative; }
          .header h1 { font-size: 28px; font-weight: 800; }
          .header .brand { color: #C9A227; }
          .watermark { position: absolute; top: 50%; right: 30px; transform: translateY(-50%) rotate(-15deg); font-size: 60px; opacity: 0.06; font-weight: 900; color: #C9A227; }
          .approved-badge { display: inline-flex; align-items: center; gap: 6px; background: #C9A227; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 12px; }
          .body { padding: 32px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
          .info-block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 8px; }
          .info-block p { font-size: 14px; color: #374151; line-height: 1.6; }
          .divider { border: none; border-top: 1px solid #f3f4f6; margin: 24px 0; }
          .plan-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
          .plan-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
          .plan-row.total { border-top: 2px solid #C9A227; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 700; color: #C9A227; }
          .plan-row .label { font-size: 14px; color: #6b7280; }
          .plan-row .value { font-size: 14px; font-weight: 600; color: #111827; }
          .footer { text-align: center; padding: 24px 32px; border-top: 1px solid #f3f4f6; background: #f9fafb; }
          .footer p { font-size: 11px; color: #9ca3af; line-height: 1.6; }
          .footer .brand { color: #C9A227; font-weight: 600; }
          .stamp { position: absolute; bottom: 120px; right: 40px; width: 120px; height: 120px; border: 3px solid #C9A227; border-radius: 50%; display: flex; align-items: center; justify-content: center; transform: rotate(-15deg); opacity: 0.3; }
          .stamp-text { color: #C9A227; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
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
    }, 500);
  };

  const textPrimary = "text-white";
  const textSecondary = "text-slate-400";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative max-w-2xl w-full max-h-[90vh] overflow-auto rounded-2xl border shadow-2xl"
        style={{ background: "#0f0f17", borderColor: "rgba(217,119,6,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-amber-400" />
            <h2 className={cn("text-base font-semibold", textPrimary)}>Payment Receipt</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="gap-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-white/10">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Receipt Content */}
        <div id="receipt-printable">
          {/* Valtriox Header */}
          <div className="relative p-8 overflow-hidden" style={{ background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)" }}>
            <div className="absolute inset-0 opacity-5" style={{ background: "radial-gradient(circle at 80% 50%, rgba(217,119,6,0.3), transparent 60%)" }} />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight" style={{ color: "#C9A227" }}>
                    {data.platformName || companyName}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">Command Your Brand Universe</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Payment Confirmed</span>
                  </div>
                  <p className="text-xs text-slate-500">Receipt #{data.receiptNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(217,119,6,0.15)", color: "#C9A227" }}>
                  Official Receipt
                </span>
                <span className="text-[10px] text-slate-600">
                  {new Date(data.date).toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
            {/* Watermark */}
            <div className="absolute top-1/2 right-8 -translate-y-1/2 -rotate-12 text-6xl font-black opacity-[0.03]" style={{ color: "#C9A227" }}>
              APPROVED
            </div>
          </div>

          {/* Receipt Body */}
          <div className="p-6 space-y-5">
            {/* Organization & Payment Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Billed To</h3>
                <p className="text-sm font-semibold text-white">{data.orgName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{data.orgEmail}</p>
                {data.orgPhone && <p className="text-xs text-slate-400">{data.orgPhone}</p>}
              </div>
              <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Payment Details</h3>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">
                    <span className="text-slate-500">Method:</span> <span className="text-white capitalize">{data.paymentMethod.replace(/_/g, " ")}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    <span className="text-slate-500">Transaction:</span> <span className="text-white font-mono">{data.transactionId}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    <span className="text-slate-500">Approved By:</span> <span className="text-white">{data.approvedBy}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Plan & Amount */}
            <div className="p-4 rounded-lg overflow-hidden" style={{ background: "rgba(217,119,6,0.05)", border: "1px solid rgba(217,119,6,0.15)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-white capitalize">{data.planName} Plan</h3>
                </div>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">Active</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Plan Price</span>
                  <span className="text-white font-medium">{data.currencyFlag} {data.currencySymbol} {data.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Period Start
                  </span>
                  <span className="text-white">{new Date(data.periodStart).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Period End
                  </span>
                  <span className="text-white">{new Date(data.periodEnd).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <div className="border-t border-amber-500/20 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-amber-400">Total Paid</span>
                    <span className="text-xl font-black text-amber-400">{data.currencyFlag} {data.currencySymbol} {data.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Info */}
            <div className="p-3 rounded-lg text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <p className="text-[10px] text-slate-500">
                For billing inquiries, contact us at{" "}
                <span className="text-amber-400/80">{data.platformEmail}</span>
                {data.platformPhone && <> or <span className="text-amber-400/80">{data.platformPhone}</span></>}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 text-center border-t" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}>
            <p className="text-[10px] text-slate-600">
              This is an official receipt generated by{" "}
              <span className="font-semibold" style={{ color: "#C9A227" }}>{companyName}</span>.
              {" "}Thank you for your business!
            </p>
            {data.platformAddress && (
              <p className="text-[9px] text-slate-700 mt-1">{data.platformAddress}</p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

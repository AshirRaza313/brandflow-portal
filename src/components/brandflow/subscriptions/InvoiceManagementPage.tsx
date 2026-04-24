"use client";

import { useState, useEffect, useCallback } from "react";
import { useBrandFlowStore } from "@/store/brandflow-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  FileText,
  Download,
  RefreshCw,
  Search,
  Loader2,
  Eye,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──
interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  planName: string;
  amount: number;
  status: string;
  billingCycle: string;
  currencySymbol: string;
  currencyCode: string;
  issuedAt: string;
  dueDate: string | null;
  paidAt: string | null;
  orgName: string | null;
  organization: {
    id: string;
    name: string;
    email: string | null;
    plan: string;
  } | null;
}

interface InvoiceStats {
  total: number;
  totalRevenue: { _sum: { amount: number | null } };
  pending: number;
  paid: number;
}

// ── Status Badge ──
function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    case "paid":
    case "approved":
      return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1"><CheckCircle2 className="h-3 w-3" /> {status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
    case "cancelled":
      return <Badge className="bg-red-500/20 text-red-300 border-red-500/30 gap-1"><AlertCircle className="h-3 w-3" /> Cancelled</Badge>;
    case "refunded":
      return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1"><AlertCircle className="h-3 w-3" /> Refunded</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ── Main Component ──
export function InvoiceManagementPage() {
  const { appTheme } = useBrandFlowStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  const cardBg = isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const accentColor = isGold ? "text-amber-400" : "text-emerald-400";
  const accentBg = isGold ? "bg-amber-500/10" : "bg-emerald-500/10";

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/admin/invoices?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices);
        setStats(data.stats);
      } else {
        toast.error("Failed to load invoices");
      }
    } catch {
      toast.error("Failed to load invoices");
    }
    setLoading(false);
  }, [statusFilter, searchQuery]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleDownload = async (invoice: InvoiceItem) => {
    setDownloadingId(invoice.id);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/download`);
      if (res.ok) {
        const blob = await res.blob();
        // Validate it's actually a PDF (not an error JSON)
        if (blob.size < 100 || blob.type === "application/json") {
          // Server returned JSON error disguised as OK
          const errText = await blob.text();
          console.error("Invalid PDF response:", errText);
          toast.error("Received invalid PDF from server");
          setDownloadingId(null);
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Invoice ${invoice.invoiceNumber} downloaded!`);
      } else {
        // Parse the error details from the server
        let errorMsg = "Failed to download invoice PDF";
        try {
          const errData = await res.json();
          if (errData.details) {
            errorMsg = `${errData.error || errorMsg}: ${errData.details}`;
          } else if (errData.error) {
            errorMsg = errData.error;
          }
          console.error("Download error response:", errData);
        } catch {
          errorMsg = `Server returned ${res.status} ${res.statusText}`;
        }
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error("Download network error:", err);
      toast.error("Network error downloading invoice");
    }
    setDownloadingId(null);
  };

  const totalRevenue = stats?.totalRevenue?._sum?.amount || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl font-bold", textPrimary)}>Invoice Management</h1>
          <p className={cn("text-sm mt-1", textSecondary)}>View and manage all invoices across organizations</p>
        </div>
        <Button variant="outline" onClick={fetchInvoices} className={cn("gap-2", isDark ? "border-white/[0.1]" : "")}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className={cn(cardBg)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className={cn("h-4 w-4", accentColor)} />
                <p className={cn("text-xs", textSecondary)}>Total Invoices</p>
              </div>
              <p className={cn("text-xl font-bold", textPrimary)}>{stats.total}</p>
            </CardContent>
          </Card>
          <Card className={cn(cardBg)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <p className={cn("text-xs", textSecondary)}>Total Revenue</p>
              </div>
              <p className="text-xl font-bold text-emerald-400">Rs. {totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className={cn(cardBg)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-yellow-400" />
                <p className={cn("text-xs", textSecondary)}>Pending</p>
              </div>
              <p className="text-xl font-bold text-yellow-400">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card className={cn(cardBg)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <p className={cn("text-xs", textSecondary)}>Paid</p>
              </div>
              <p className="text-xl font-bold text-emerald-400">{stats.paid}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by organization or invoice #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn("pl-10", isDark ? "border-white/[0.1] bg-white/[0.03]" : "")}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className={cn("w-40", isDark ? "border-white/[0.1] bg-white/[0.03]" : "")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoice Table */}
      {invoices.length === 0 ? (
        <Card className={cn(cardBg)}>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-slate-400/50 mb-3" />
            <h3 className={cn("font-semibold", textPrimary)}>No Invoices Found</h3>
            <p className={cn("text-sm mt-1", textSecondary)}>
              {searchQuery || statusFilter !== "all"
                ? "No invoices match your filters. Try adjusting your search."
                : "No invoices have been generated yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className={cn(cardBg, "overflow-hidden")}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={cn("border-b", isDark ? "border-white/[0.06]" : "border-slate-200")}>
                    <th className={cn("text-left text-[10px] font-bold uppercase tracking-wider px-4 py-3", textSecondary)}>Invoice #</th>
                    <th className={cn("text-left text-[10px] font-bold uppercase tracking-wider px-4 py-3", textSecondary)}>Organization</th>
                    <th className={cn("text-left text-[10px] font-bold uppercase tracking-wider px-4 py-3", textSecondary)}>Plan</th>
                    <th className={cn("text-right text-[10px] font-bold uppercase tracking-wider px-4 py-3", textSecondary)}>Amount</th>
                    <th className={cn("text-left text-[10px] font-bold uppercase tracking-wider px-4 py-3", textSecondary)}>Status</th>
                    <th className={cn("text-left text-[10px] font-bold uppercase tracking-wider px-4 py-3", textSecondary)}>Billing Cycle</th>
                    <th className={cn("text-left text-[10px] font-bold uppercase tracking-wider px-4 py-3", textSecondary)}>Date</th>
                    <th className={cn("text-right text-[10px] font-bold uppercase tracking-wider px-4 py-3", textSecondary)}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <motion.tr
                      key={inv.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        "border-b transition-colors",
                        isDark ? "border-white/[0.03] hover:bg-white/[0.02]" : "border-slate-100 hover:bg-slate-50"
                      )}
                    >
                      <td className="px-4 py-3">
                        <span className={cn("text-sm font-mono font-medium", textPrimary)}>
                          {inv.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className={cn("h-3.5 w-3.5", textSecondary)} />
                          <span className={cn("text-sm", textPrimary)}>
                            {inv.orgName || inv.organization?.name || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-sm capitalize", textSecondary)}>{inv.planName}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-emerald-400">
                          {inv.currencySymbol || "Rs."} {inv.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(inv.status)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn(
                          "text-[10px] px-1.5 py-0",
                          inv.billingCycle === "annually"
                            ? "bg-purple-500/20 text-purple-300"
                            : "bg-blue-500/20 text-blue-300"
                        )}>
                          {inv.billingCycle === "annually" ? "Annual" : "Monthly"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span className={cn("text-xs", textSecondary)}>
                            {new Date(inv.issuedAt).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn("h-7 gap-1 text-xs", isDark ? "hover:bg-white/[0.05]" : "")}
                            onClick={() => setSelectedInvoice(selectedInvoice?.id === inv.id ? null : inv)}
                          >
                            <Eye className="h-3 w-3" />
                            <span className="hidden sm:inline">Details</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn("h-7 gap-1 text-xs", isDark ? "hover:bg-white/[0.05]" : "")}
                            onClick={() => handleDownload(inv)}
                            disabled={downloadingId === inv.id}
                          >
                            {downloadingId === inv.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                            <span className="hidden sm:inline">PDF</span>
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expanded Detail Row */}
            <AnimatePresence>
              {selectedInvoice && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <Separator className={isDark ? "bg-white/[0.06]" : "bg-slate-200"} />
                  <div className="p-4 space-y-3">
                    <h4 className={cn("text-sm font-semibold", textPrimary)}>
                      Invoice Details — {selectedInvoice.invoiceNumber}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className={cn("p-3 rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                        <p className={cn("text-[10px]", textSecondary)}>Organization</p>
                        <p className={cn("text-sm font-semibold", textPrimary)}>
                          {selectedInvoice.orgName || selectedInvoice.organization?.name || "Unknown"}
                        </p>
                        {selectedInvoice.organization?.email && (
                          <p className={cn("text-[10px]", textSecondary)}>{selectedInvoice.organization.email}</p>
                        )}
                      </div>
                      <div className={cn("p-3 rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                        <p className={cn("text-[10px]", textSecondary)}>Plan</p>
                        <p className={cn("text-sm font-semibold capitalize", textPrimary)}>{selectedInvoice.planName}</p>
                        <p className={cn("text-[10px]", textSecondary)}>
                          {selectedInvoice.billingCycle === "annually" ? "Annual" : "Monthly"} billing
                        </p>
                      </div>
                      <div className={cn("p-3 rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                        <p className={cn("text-[10px]", textSecondary)}>Amount</p>
                        <p className="text-sm font-semibold text-emerald-400">
                          {selectedInvoice.currencySymbol || "Rs."} {selectedInvoice.amount.toLocaleString()}
                        </p>
                        <p className={cn("text-[10px]", textSecondary)}>{selectedInvoice.currencyCode || "PKR"}</p>
                      </div>
                      <div className={cn("p-3 rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                        <p className={cn("text-[10px]", textSecondary)}>Status</p>
                        <div className="mt-0.5">{getStatusBadge(selectedInvoice.status)}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className={cn("p-3 rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                        <p className={cn("text-[10px]", textSecondary)}>Issued</p>
                        <p className={cn("text-xs font-medium", textPrimary)}>
                          {new Date(selectedInvoice.issuedAt).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      {selectedInvoice.dueDate && (
                        <div className={cn("p-3 rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                          <p className={cn("text-[10px]", textSecondary)}>Due Date</p>
                          <p className={cn("text-xs font-medium", textPrimary)}>
                            {new Date(selectedInvoice.dueDate).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      )}
                      {selectedInvoice.paidAt && (
                        <div className={cn("p-3 rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                          <p className={cn("text-[10px]", textSecondary)}>Paid At</p>
                          <p className={cn("text-xs font-medium text-emerald-400")}>
                            {new Date(selectedInvoice.paidAt).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

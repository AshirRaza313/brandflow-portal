"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
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
  CalendarIcon,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { DateRange } from "react-day-picker";

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

const ITEMS_PER_PAGE = 10;

// ── Status Badge ──
function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    case "paid":
    case "approved":
      return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1"><CheckCircle2 className="h-3 w-3" /> {status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
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
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const cardBg = isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const accentColor = isGold ? "text-amber-400" : "text-amber-400";
  const accentBg = isGold ? "bg-amber-500/10" : "bg-amber-500/10";
  const inputBg = isDark ? "border-white/[0.1] bg-white/[0.03]" : "";

  // ── Debounced search (300ms) ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // ── Reset page (called directly in handlers, not via effect) ──
  // Page is reset inline when statusFilter or dateRange changes to avoid setState-in-effect.

  // ── Client-side filtering ──
  const filteredInvoices = useMemo(() => {
    let result = invoices;

    // Status filter
    if (statusFilter && statusFilter !== "all") {
      result = result.filter((inv) => inv.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          (inv.orgName && inv.orgName.toLowerCase().includes(q)) ||
          (inv.organization?.name && inv.organization.name.toLowerCase().includes(q)) ||
          inv.planName.toLowerCase().includes(q)
      );
    }

    // Date range filter
    if (dateRange?.from) {
      const from = new Date(dateRange.from);
      from.setHours(0, 0, 0, 0);
      result = result.filter((inv) => new Date(inv.issuedAt) >= from);
    }
    if (dateRange?.to) {
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);
      result = result.filter((inv) => new Date(inv.issuedAt) <= to);
    }

    return result;
  }, [invoices, statusFilter, searchQuery, dateRange]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE));
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInvoices, currentPage]);

  const fetchInvoices = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      if (signal?.aborted) return;
      const res = await fetchWithAuth("/api/admin/invoices", { signal });
      if (!res.ok) {
        toast.error("Failed to load invoices");
        return;
      }
      const data = await res.json();
      if (signal?.aborted) return;
      setInvoices(data.invoices);
      setStats(data.stats);
    } catch (err) {
      if (signal?.aborted) return;
      toast.error("Failed to load invoices");
    }
    setLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- fetching initial data on mount */
  useEffect(() => {
    const controller = new AbortController();
    fetchInvoices(controller.signal);
    return () => controller.abort();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleDownload = async (invoice: InvoiceItem) => {
    setDownloadingId(invoice.id);
    try {
      const res = await fetchWithAuth(`/api/invoices/${invoice.id}/download`);
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

  const clearDateRange = () => {
    setDateRange(undefined);
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || dateRange?.from || dateRange?.to;
  const showNoResults = !loading && filteredInvoices.length === 0 && hasActiveFilters;
  const showEmptyState = !loading && filteredInvoices.length === 0 && !hasActiveFilters;

  // ── Pagination helper: generate page numbers to show ──
  const getVisiblePages = (current: number, total: number): (number | "ellipsis")[] => {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | "ellipsis")[] = [1];
    if (current > 3) pages.push("ellipsis");
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push("ellipsis");
    pages.push(total);
    return pages;
  };

  const totalRevenue = stats?.totalRevenue?._sum?.amount || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
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
                <DollarSign className="h-4 w-4 text-amber-400" />
                <p className={cn("text-xs", textSecondary)}>Total Revenue</p>
              </div>
              <p className="text-xl font-bold text-amber-400">Rs. {totalRevenue.toLocaleString()}</p>
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
                <CheckCircle2 className="h-4 w-4 text-amber-400" />
                <p className={cn("text-xs", textSecondary)}>Paid</p>
              </div>
              <p className="text-xl font-bold text-amber-400">{stats.paid}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search with debounce */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by organization, invoice #, or plan..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={cn("pl-10", inputBg)}
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
          <SelectTrigger className={cn("w-40", inputBg)}>
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

        {/* Date range filter */}
        <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-auto gap-2 justify-start text-left font-normal",
                inputBg,
                dateRange?.from && (isDark ? "text-amber-400 border-amber-500/30" : "text-amber-600 border-amber-300")
              )}
            >
              <CalendarIcon className="h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <span className="text-xs">
                    {format(dateRange.from, "MMM d, yyyy")} – {format(dateRange.to, "MMM d, yyyy")}
                  </span>
                ) : (
                  <span className="text-xs">{format(dateRange.from, "MMM d, yyyy")}</span>
                )
              ) : (
                <span className="text-xs text-muted-foreground">Date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                setDateRange(range);
                setCurrentPage(1);
                if (range?.to) setDateRangeOpen(false);
              }}
              numberOfMonths={2}
              defaultMonth={dateRange?.from || new Date()}
            />
            {dateRange?.from && (
              <div className="border-t px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {dateRange.from && dateRange.to
                    ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d, yyyy")}`
                    : format(dateRange.from, "MMM d, yyyy")}
                </span>
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={clearDateRange}>
                  <X className="h-3 w-3" /> Clear
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filters indicator */}
      {hasActiveFilters && !showNoResults && (
        <div className="flex items-center gap-2">
          <span className={cn("text-xs", textSecondary)}>
            Showing {filteredInvoices.length} of {invoices.length} invoices
          </span>
        </div>
      )}

      {/* No Results Found (search/filter returns empty) */}
      {showNoResults && (
        <Card className={cn(cardBg)}>
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-red-400/60" />
            </div>
            <h3 className={cn("text-lg font-semibold mb-1", textPrimary)}>No results found</h3>
            <p className={cn("text-sm mb-4 max-w-md mx-auto", textSecondary)}>
              No invoices match your current filters. Try adjusting your search query, date range, or status filter.
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {searchQuery && (
                <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-red-500/10" onClick={() => setSearchInput("")}>
                  Search: &quot;{searchQuery}&quot; <X className="h-3 w-3" />
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-red-500/10" onClick={() => setStatusFilter("all")}>
                  Status: {statusFilter} <X className="h-3 w-3" />
                </Badge>
              )}
              {dateRange?.from && (
                <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-red-500/10" onClick={clearDateRange}>
                  {dateRange.to
                    ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d")}`
                    : format(dateRange.from, "MMM d")}{" "}
                  <X className="h-3 w-3" />
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2"
              onClick={() => {
                setSearchInput("");
                setStatusFilter("all");
                clearDateRange();
              }}
            >
              <X className="h-3.5 w-3.5" /> Clear all filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State (no invoices at all) */}
      {showEmptyState && (
        <Card className={cn(cardBg)}>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-slate-400/50 mb-3" />
            <h3 className={cn("font-semibold", textPrimary)}>No Invoices Found</h3>
            <p className={cn("text-sm mt-1", textSecondary)}>
              No invoices have been generated yet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Invoice Table */}
      {!showNoResults && !showEmptyState && (
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
                  {paginatedInvoices.map((inv) => (
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
                        <span className="text-sm font-semibold text-amber-400">
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
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-blue-500/20 text-blue-300"
                        )}>
                          {inv.billingCycle === "annually" ? "Annual" : "Monthly"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="h-3 w-3 text-slate-400" />
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
                        <p className="text-sm font-semibold text-amber-400">
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
                          <p className={cn("text-xs font-medium text-amber-400")}>
                            {new Date(selectedInvoice.paidAt).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className={cn("text-xs", textSecondary)}>
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)} of {filteredInvoices.length} invoices
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className={cn(
                          currentPage === 1 && "pointer-events-none opacity-50",
                          isDark && "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                        )}
                      />
                    </PaginationItem>
                    {getVisiblePages(currentPage, totalPages).map((page, idx) =>
                      page === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${idx}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={page}>
                          <PaginationLink
                            isActive={currentPage === page}
                            onClick={() => setCurrentPage(page)}
                            className={cn(
                              isDark && !currentPage === page && "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                            )}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className={cn(
                          currentPage === totalPages && "pointer-events-none opacity-50",
                          isDark && "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DollarSign, Search, Plus, Download, TrendingUp, Receipt, Trash2, Pencil, RefreshCw, Loader2, AlertCircle, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ExpenseModal } from "@/components/brandflow/expenses/ExpenseModal";
import { ConfirmDialog } from "@/components/brandflow/shared/ConfirmDialog";
import { LoadingSkeleton } from "@/components/brandflow/shared/LoadingSkeleton";
import { StatsCard } from "@/components/brandflow/shared/StatsCard";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

// ── Types ──────────────────────────────────────────────────────────────────

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const subTabs = [
  { id: "salaries", label: "Salaries" },
  { id: "expenses", label: "Expenses" },
  { id: "reports", label: "Reports" },
];

const categoryConfig: Record<string, { label: string; color: string; darkColor: string }> = {
  marketing: { label: "Marketing", color: "bg-amber-100 text-amber-700", darkColor: "bg-amber-500/15 text-amber-400" },
  operations: { label: "Operations", color: "bg-blue-100 text-blue-700", darkColor: "bg-blue-500/15 text-blue-400" },
  salaries: { label: "Salaries", color: "bg-amber-100 text-amber-700", darkColor: "bg-amber-500/15 text-amber-400" },
  rent: { label: "Rent", color: "bg-amber-100 text-amber-700", darkColor: "bg-amber-500/15 text-amber-400" },
  utilities: { label: "Utilities", color: "bg-cyan-100 text-cyan-700", darkColor: "bg-cyan-500/15 text-cyan-400" },
  shipping: { label: "Shipping", color: "bg-orange-100 text-orange-700", darkColor: "bg-orange-500/15 text-orange-400" },
  other: { label: "Other", color: "bg-slate-100 text-slate-700", darkColor: "bg-white/10 text-slate-400" },
};

// ── Component ──────────────────────────────────────────────────────────────

export function PayrollPage() {
  const { organization, appTheme } = useValtrioxStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  // State
  const [activeTab, setActiveTab] = useState("salaries");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [errorExpenses, setErrorExpenses] = useState<string | null>(null);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseSearchInput, setExpenseSearchInput] = useState("");
  const [salarySearch, setSalarySearch] = useState("");

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Local salary entries
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({ employee: "", type: "salary", amount: "", description: "" });
  const [entries, setEntries] = useState<{ id: number; employee: string; type: string; amount: string; description: string }[]>([]);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch Expenses ────────────────────────────────────────────────────

  const fetchExpenses = useCallback(async () => {
    if (!organization?.id) return;

    setLoadingExpenses(true);
    setErrorExpenses(null);

    try {
      const res = await fetchWithAuth(`/api/expenses?orgId=${organization.id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch expenses");
      }
      const data = await res.json();
      setExpenses(data.expenses || []);
    } catch (err: any) {
      console.error("Fetch expenses error:", err);
      setErrorExpenses(err.message || "Something went wrong");
    } finally {
      setLoadingExpenses(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    if (activeTab === "expenses") fetchExpenses();
  }, [activeTab, fetchExpenses]);

  // ── Debounced Search ──────────────────────────────────────────────────

  const handleExpenseSearchChange = (value: string) => {
    setExpenseSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => { setExpenseSearch(value); }, 300);
  };

  // ── Filtered Expenses ─────────────────────────────────────────────────

  const filteredExpenses = useMemo(() => {
    if (!expenseSearch.trim()) return expenses;
    const q = expenseSearch.toLowerCase();
    return expenses.filter((e) =>
      (e.title || "").toLowerCase().includes(q) ||
      (e.description || "").toLowerCase().includes(q) ||
      (e.category || "").toLowerCase().includes(q)
    );
  }, [expenses, expenseSearch]);

  // ── Stats ─────────────────────────────────────────────────────────────

  const expenseStats = useMemo(() => {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const thisMonth = expenses.filter((e) => {
      const d = new Date(e.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, e) => s + e.amount, 0);
    return { total, thisMonth, count: expenses.length };
  }, [expenses]);

  // ── Delete Expense ────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deletingExpenseId) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/expenses/${deletingExpenseId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Expense deleted");
      setDeletingExpenseId(null);
      fetchExpenses();
    } catch {
      toast.error("Failed to delete expense");
    } finally {
      setDeleting(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────

  const handleAddEntry = () => {
    if (!entryForm.employee.trim()) { toast.error("Employee name is required"); return; }
    if (!entryForm.amount.trim() || isNaN(Number(entryForm.amount))) { toast.error("Valid amount is required"); return; }
    setEntries((prev) => [{ id: Date.now(), ...entryForm }, ...prev]);
    setEntryOpen(false);
    setEntryForm({ employee: "", type: "salary", amount: "", description: "" });
    toast.success("Payroll entry added successfully!");
  };

  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseModalOpen(true);
  };

  const handleExpenseModalClose = (open: boolean) => {
    setExpenseModalOpen(open);
    if (!open) setEditingExpense(null);
  };

  // ── CSV Export Helper ──────────────────────────────────────────

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filename}.csv`);
  };

  const handleExportExpenses = () => {
    const headers = ["Expense", "Category", "Amount", "Date", "Description"];
    const rows = filteredExpenses.map(e => [
      e.title || "",
      categoryConfig[e.category]?.label || e.category,
      String(e.amount),
      new Date(e.date).toLocaleDateString(),
      e.description || "",
    ]);
    downloadCSV("expenses-report", headers, rows);
  };

  const handleExportPayroll = () => {
    const headers = ["Employee", "Type", "Amount", "Description"];
    const rows = entries.map(e => [e.employee, e.type, e.amount, e.description || ""]);
    downloadCSV("payroll-report", headers, rows);
  };

  const handleDownloadPDF = () => window.print();

  const handleExportExcel = () => {
    // CSV format works in Excel — generate with BOM for better Excel compat
    const headers = ["Expense", "Category", "Amount", "Date", "Description"];
    const rows = filteredExpenses.map(e => [
      e.title || "",
      categoryConfig[e.category]?.label || e.category,
      String(e.amount),
      new Date(e.date).toLocaleDateString(),
      e.description || "",
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "expenses-report.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Excel report exported (CSV format)");
  };

  // ── Theme Classes ────────────────────────────────────────────────────

  const cardClass = isGold
    ? "bg-white/[0.03] border-white/[0.06]"
    : isDark
      ? "bg-white/[0.03] border-white/[0.06]"
      : "bg-white";

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-400" : "text-muted-foreground";
  const borderColor = isGold ? "border-white/[0.06]" : isDark ? "border-white/[0.06]" : "border-slate-200";

  const getCategoryBadgeClass = (category: string) => {
    const cfg = categoryConfig[category];
    if (!cfg) return isDark ? "bg-white/10 text-slate-400" : "bg-slate-100 text-slate-600";
    return isDark ? cfg.darkColor : cfg.color;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-xl sm:text-2xl font-bold", textPrimary)}>Payroll & Expenses</h1>
          <p className={cn("text-sm mt-1", textSecondary)}>Manage salaries and business expenses</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => fetchExpenses()} disabled={loadingExpenses}
              className={cn(isGold && "border-amber-500/20 text-amber-400 hover:bg-amber-500/10", isDark && !isGold && "border-white/10 text-slate-300 hover:bg-white/5")}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", loadingExpenses && "animate-spin")} />
              Refresh
            </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => { if (activeTab === "expenses") handleExportExpenses(); else handleExportPayroll(); }}
            className={cn(isGold && "border-amber-500/20 text-amber-400 hover:bg-amber-500/10", isDark && !isGold && "border-white/10 text-slate-300 hover:bg-white/5")}
          >
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button
            className={isGold ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black hover:shadow-[0_4px_20px_rgba(211,166,56,0.3)] hover:-translate-y-0.5" : "bg-amber-600 hover:bg-amber-700"}
            onClick={() => {
              if (activeTab === "expenses") { setEditingExpense(null); setExpenseModalOpen(true); }
              else setEntryOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> {activeTab === "expenses" ? "Add Expense" : "Add Entry"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard title="Total Expenses" value={`Rs. ${expenseStats.total.toLocaleString()}`} icon={DollarSign} loading={loadingExpenses} />
        <StatsCard title="This Month" value={`Rs. ${expenseStats.thisMonth.toLocaleString()}`} icon={CalendarDays} loading={loadingExpenses} variant="warning" />
        <StatsCard title="Entries" value={expenseStats.count} icon={Receipt} loading={loadingExpenses} />
        <StatsCard title="Payroll Entries" value={entries.length} icon={TrendingUp} loading={false} variant="success" />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b overflow-x-auto tab-bar-scroll" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? isGold
                  ? "border-amber-500 text-amber-400"
                  : isDark
                    ? "border-amber-500 text-amber-400"
                    : "border-amber-600 text-amber-600"
                : isDark
                  ? "border-transparent text-slate-500 hover:text-slate-300"
                  : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Salaries Tab ─────────────────────────────────────────────── */}
        {activeTab === "salaries" && (
          <motion.div key="salaries" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search employee..." value={salarySearch} onChange={(e) => setSalarySearch(e.target.value)} className={cn("pl-9", isDark && "border-white/10 bg-white/[0.03] placeholder:text-slate-500")} />
            </div>
            {entries.length === 0 ? (
              <Card className={cardClass}>
                <CardContent className="p-4">
                  <EmptyState
                    icon={DollarSign}
                    title="No salary data"
                    description="Salary records will appear once entries are added."
                    action={{ label: "Add Entry", onClick: () => setEntryOpen(true) }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className={cn(cardClass, "overflow-hidden")}>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className={cn("border-b", borderColor, isDark && "bg-white/[0.02]")}>
                          <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Employee</TableHead>
                          <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Type</TableHead>
                          <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Amount</TableHead>
                          <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map((entry) => (
                          <TableRow key={entry.id} className={cn("border-b", borderColor, isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50")}>
                            <TableCell className={cn("text-sm font-medium", textPrimary)}>{entry.employee}</TableCell>
                            <TableCell><span className={cn("text-xs px-2 py-0.5 rounded-full", isDark ? "bg-white/10 text-slate-400" : "bg-slate-100 text-slate-600")}>{entry.type}</span></TableCell>
                            <TableCell className={cn("text-sm font-medium", textPrimary)}>Rs. {Number(entry.amount).toLocaleString()}</TableCell>
                            <TableCell className={cn("text-sm", textMuted)}>{entry.description || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* ── Expenses Tab (Real API) ─────────────────────────────────── */}
        {activeTab === "expenses" && (
          <motion.div key="expenses" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={expenseSearchInput}
                onChange={(e) => handleExpenseSearchChange(e.target.value)}
                className={cn("pl-9", isDark && "border-white/10 bg-white/[0.03] focus-visible:border-amber-500/50 placeholder:text-slate-500")}
              />
            </div>

            {loadingExpenses && <LoadingSkeleton />}

            {!loadingExpenses && errorExpenses && (
              <Card className={cn(cardClass, "border-red-500/30")}>
                <CardContent className="p-6 text-center">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-500 font-medium mb-1">Failed to load expenses</p>
                  <p className={cn("text-sm mb-4", textMuted)}>{errorExpenses}</p>
                  <Button variant="outline" onClick={() => fetchExpenses()}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Try Again
                  </Button>
                </CardContent>
              </Card>
            )}

            {!loadingExpenses && !errorExpenses && filteredExpenses.length === 0 && expenses.length === 0 && (
              <Card className={cardClass}>
                <CardContent className="p-4">
                  <EmptyState
                    icon={DollarSign}
                    title="No expenses yet"
                    description="Track your business expenses here."
                    action={{ label: "Add Expense", onClick: () => { setEditingExpense(null); setExpenseModalOpen(true); } }}
                  />
                </CardContent>
              </Card>
            )}

            {!loadingExpenses && !errorExpenses && filteredExpenses.length === 0 && expenses.length > 0 && (
              <Card className={cardClass}>
                <CardContent className="p-4">
                  <EmptyState icon={Search} title="No matching expenses" description={`No expenses match "${expenseSearch}".`} />
                </CardContent>
              </Card>
            )}

            {!loadingExpenses && !errorExpenses && filteredExpenses.length > 0 && (
              <Card className={cn(cardClass, "overflow-hidden")}>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className={cn("border-b", borderColor, isDark && "bg-white/[0.02]")}>
                          <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Expense</TableHead>
                          <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Category</TableHead>
                          <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Amount</TableHead>
                          <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Date</TableHead>
                          <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExpenses.map((expense) => (
                          <TableRow key={expense.id} className={cn("border-b", borderColor, isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50")}>
                            <TableCell>
                              <div>
                                <p className={cn("text-sm font-medium", textPrimary)}>{expense.title}</p>
                                {expense.description && (
                                  <p className={cn("text-xs mt-0.5 line-clamp-1 max-w-[200px]", textMuted)}>{expense.description}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", getCategoryBadgeClass(expense.category))}>
                                {categoryConfig[expense.category]?.label || expense.category}
                              </span>
                            </TableCell>
                            <TableCell className={cn("text-sm font-medium", textPrimary)}>
                              Rs. {expense.amount.toLocaleString()}
                            </TableCell>
                            <TableCell className={cn("text-xs", textSecondary)}>
                              {new Date(expense.date).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className={cn("h-8 w-8", isDark && "text-slate-400 hover:text-white hover:bg-white/5")} onClick={() => openEditExpense(expense)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => setDeletingExpenseId(expense.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* ── Reports Tab ─────────────────────────────────────────────── */}
        {activeTab === "reports" && (
          <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className={cardClass}>
              <CardContent className="p-8 text-center">
                <TrendingUp className={cn("h-12 w-12 mx-auto mb-3", isDark ? "text-slate-400" : "text-muted-foreground")} />
                <h3 className={cn("font-semibold mb-1", textPrimary)}>Payroll Reports</h3>
                <p className={cn("text-sm mb-4", textMuted)}>Generate comprehensive payroll and expense reports.</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button
                    className={isGold ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black" : "bg-amber-600 hover:bg-amber-700"}
                    onClick={handleDownloadPDF}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                  </Button>
                  <Button variant="outline" onClick={handleExportExcel} className={cn(isGold && "border-white/10 text-slate-300 hover:bg-white/5")}>
                    Export Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Expense Modal ─────────────────────────────────────────────── */}
      {organization && (
        <ExpenseModal
          open={expenseModalOpen}
          onOpenChange={handleExpenseModalClose}
          organizationId={organization.id}
          editExpense={editingExpense}
          onSaved={() => fetchExpenses()}
        />
      )}

      {/* ── Salary Entry Dialog ───────────────────────────────────────── */}
      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className={cn("sm:max-w-md", isGold && "bg-[#1D2437] border-white/[0.08]")}>
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2", isDark && "text-white")}>
              <Receipt className="h-5 w-5" /> Add Payroll Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>Employee Name</Label>
              <Input placeholder="Enter employee name" value={entryForm.employee} onChange={(e) => setEntryForm({ ...entryForm, employee: e.target.value })} className={cn(isDark && "border-white/10 bg-white/[0.03] placeholder:text-slate-500")} />
            </div>
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>Entry Type</Label>
              <Select value={entryForm.type} onValueChange={(v) => setEntryForm({ ...entryForm, type: v })}>
                <SelectTrigger className={cn(isDark && "border-white/10 bg-white/[0.03]")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                  <SelectItem value="deduction">Deduction</SelectItem>
                  <SelectItem value="expense">Business Expense</SelectItem>
                  <SelectItem value="advance">Salary Advance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>Amount (Rs.)</Label>
              <Input type="number" placeholder="Enter amount" value={entryForm.amount} onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })} className={cn(isDark && "border-white/10 bg-white/[0.03] placeholder:text-slate-500")} />
            </div>
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>Description (optional)</Label>
              <Input placeholder="Brief description" value={entryForm.description} onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })} className={cn(isDark && "border-white/10 bg-white/[0.03] placeholder:text-slate-500")} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEntryOpen(false)} className={cn(isGold && "border-white/10 text-slate-300 hover:bg-white/5")}>Cancel</Button>
              <Button className={isGold ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black" : "bg-amber-600 hover:bg-amber-700"} onClick={handleAddEntry}>Add Entry</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delete ────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deletingExpenseId}
        onOpenChange={(open) => { if (!open) setDeletingExpenseId(null); }}
        title="Delete Expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

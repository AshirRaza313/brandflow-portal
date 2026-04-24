"use client";

import { useState, useEffect } from "react";
import { useBrandOnyxStore } from "@/store/brandflow-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  description: string | null;
}

interface FormErrors {
  title?: string;
  amount?: string;
  category?: string;
}

interface ExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  editExpense?: Expense | null;
  onSaved?: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const categories = [
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
  { value: "salaries", label: "Salaries" },
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "shipping", label: "Shipping" },
  { value: "other", label: "Other" },
];

const emptyForm = {
  title: "",
  amount: "",
  category: "",
  date: new Date().toISOString().split("T")[0],
  description: "",
};

// ── Component ──────────────────────────────────────────────────────────────

export function ExpenseModal({ open, onOpenChange, organizationId, editExpense, onSaved }: ExpenseModalProps) {
  const { appTheme } = useBrandOnyxStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState(emptyForm);

  // Reset form when modal opens or editExpense changes
  useEffect(() => {
    if (!open) return;

    if (editExpense) {
      setForm({
        title: editExpense.title || "",
        amount: editExpense.amount?.toString() || "",
        category: editExpense.category || "",
        date: editExpense.date ? new Date(editExpense.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        description: editExpense.description || "",
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [open, editExpense]);

  // Escape key closes modal
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onOpenChange(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onOpenChange]);

  // ── Validation ───────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = "Valid amount is required";
    if (!form.category) errs.category = "Category is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const body: any = {
        title: form.title.trim(),
        amount: parseFloat(form.amount),
        category: form.category,
        date: new Date(form.date).toISOString(),
        description: form.description.trim() || null,
      };

      if (editExpense) {
        const res = await fetch(`/api/expenses/${editExpense.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update expense");
        }
        toast.success("Expense updated successfully");
      } else {
        body.organizationId = organizationId;
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to add expense");
        }
        toast.success("Expense added successfully");
      }
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      console.error("Expense submit error:", err);
      toast.error(err.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // ── Theme Helpers ────────────────────────────────────────────────────

  const inputClass = cn(
    isDark && "border-white/10 bg-white/[0.03] focus-visible:border-emerald-500/50 placeholder:text-slate-500",
    isGold && "border-white/10 bg-white/[0.03] focus-visible:border-amber-500/50 placeholder:text-slate-500"
  );

  const submitBtnClass = isGold
    ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black hover:shadow-[0_4px_20px_rgba(212,160,23,0.3)] hover:-translate-y-0.5"
    : "bg-emerald-600 hover:bg-emerald-700";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className={cn("sm:max-w-md", isGold && "bg-[#15151e] border-white/[0.08]")}>
        <DialogHeader>
          <DialogTitle className={cn(isDark && "text-white")}>
            {editExpense ? "Edit Expense" : "Add Expense"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="expense-title" className={cn(isDark && "text-slate-300")}>
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="expense-title"
              placeholder="e.g. Office Rent"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              className={cn(inputClass, errors.title && "border-red-500 focus-visible:border-red-500")}
              autoFocus
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
          </div>

          {/* Amount & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense-amount" className={cn(isDark && "text-slate-300")}>
                Amount (Rs.) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => updateField("amount", e.target.value)}
                className={cn(inputClass, errors.amount && "border-red-500 focus-visible:border-red-500")}
              />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-category" className={cn(isDark && "text-slate-300")}>
                Category <span className="text-red-500">*</span>
              </Label>
              <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
                <SelectTrigger id="expense-category" className={cn(inputClass, errors.category && "border-red-500")}>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="expense-date" className={cn(isDark && "text-slate-300")}>
              Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="expense-date"
              type="date"
              value={form.date}
              onChange={(e) => updateField("date", e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="expense-desc" className={cn(isDark && "text-slate-300")}>Description</Label>
            <Textarea
              id="expense-desc"
              placeholder="Optional notes..."
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={2}
              className={cn(inputClass, "resize-none")}
            />
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button
              type="button" variant="outline"
              onClick={() => onOpenChange(false)}
              className={cn(isGold && "border-white/10 text-slate-300 hover:bg-white/5")}
            >
              Cancel
            </Button>
            <Button type="submit" className={submitBtnClass} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editExpense ? "Save Changes" : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

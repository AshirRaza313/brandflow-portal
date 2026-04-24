"use client";

import { useState, useEffect } from "react";
import { useBrandFlowStore } from "@/store/brandflow-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrder: number | null;
  usageLimit: number | null;
  usageCount: number;
  expiresAt: string | null;
  isActive: boolean;
}

interface FormErrors {
  code?: string;
  value?: string;
}

interface CouponModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  editCoupon?: Coupon | null;
  onSaved?: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const emptyForm = {
  code: "",
  type: "percentage" as string,
  value: "",
  minOrder: "",
  usageLimit: "",
  expiresAt: "",
  isActive: true,
};

// ── Component ──────────────────────────────────────────────────────────────

export function CouponModal({ open, onOpenChange, organizationId, editCoupon, onSaved }: CouponModalProps) {
  const { appTheme } = useBrandFlowStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState(emptyForm);

  // Reset form when modal opens or editCoupon changes
  useEffect(() => {
    if (!open) return;

    if (editCoupon) {
      setForm({
        code: editCoupon.code || "",
        type: editCoupon.type || "percentage",
        value: editCoupon.value?.toString() || "",
        minOrder: editCoupon.minOrder?.toString() || "",
        usageLimit: editCoupon.usageLimit?.toString() || "",
        expiresAt: editCoupon.expiresAt ? new Date(editCoupon.expiresAt).toISOString().split("T")[0] : "",
        isActive: editCoupon.isActive ?? true,
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [open, editCoupon]);

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
    if (!form.code.trim()) errs.code = "Coupon code is required";
    else if (form.code.trim().length < 3) errs.code = "Code must be at least 3 characters";
    else if (!/^[A-Za-z0-9_-]+$/.test(form.code.trim())) errs.code = "Only letters, numbers, hyphens, underscores";

    if (!form.value) errs.value = "Discount value is required";
    else if (parseFloat(form.value) <= 0) errs.value = "Value must be positive";
    else if (form.type === "percentage" && parseFloat(form.value) > 100) errs.value = "Percentage cannot exceed 100";

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
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: parseFloat(form.value),
        minOrder: form.minOrder ? parseFloat(form.minOrder) : null,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        isActive: form.isActive,
      };

      if (editCoupon) {
        const res = await fetch(`/api/coupons/${editCoupon.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update coupon");
        }
        toast.success("Coupon updated successfully");
      } else {
        body.organizationId = organizationId;
        const res = await fetch("/api/coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create coupon");
        }
        toast.success("Coupon created successfully");
      }
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      console.error("Coupon submit error:", err);
      toast.error(err.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────

  const updateField = (field: string, value: string | boolean) => {
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
            {editCoupon ? "Edit Coupon" : "Create Coupon"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Code */}
          <div className="space-y-2">
            <Label htmlFor="coupon-code" className={cn(isDark && "text-slate-300")}>
              Coupon Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="coupon-code"
              placeholder="e.g. SUMMER25"
              value={form.code}
              onChange={(e) => updateField("code", e.target.value.toUpperCase())}
              className={cn(inputClass, "uppercase font-mono tracking-wider", errors.code && "border-red-500 focus-visible:border-red-500")}
              autoFocus
            />
            {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
          </div>

          {/* Type & Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>Discount Type</Label>
              <Select value={form.type} onValueChange={(v) => updateField("type", v)}>
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed (Rs.)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-value" className={cn(isDark && "text-slate-300")}>
                Value <span className="text-red-500">*</span>
              </Label>
              <Input
                id="coupon-value"
                type="number"
                step="0.01"
                min="0"
                max={form.type === "percentage" ? "100" : undefined}
                placeholder={form.type === "percentage" ? "10" : "500"}
                value={form.value}
                onChange={(e) => updateField("value", e.target.value)}
                className={cn(inputClass, errors.value && "border-red-500 focus-visible:border-red-500")}
              />
              {errors.value && <p className="text-xs text-red-500">{errors.value}</p>}
            </div>
          </div>

          {/* Min Order & Usage Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coupon-min" className={cn(isDark && "text-slate-300")}>Min Order (Rs.)</Label>
              <Input
                id="coupon-min"
                type="number"
                step="0.01"
                min="0"
                placeholder="No minimum"
                value={form.minOrder}
                onChange={(e) => updateField("minOrder", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-limit" className={cn(isDark && "text-slate-300")}>Usage Limit</Label>
              <Input
                id="coupon-limit"
                type="number"
                min="0"
                placeholder="Unlimited"
                value={form.usageLimit}
                onChange={(e) => updateField("usageLimit", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label htmlFor="coupon-expiry" className={cn(isDark && "text-slate-300")}>Expiry Date</Label>
            <Input
              id="coupon-expiry"
              type="date"
              value={form.expiresAt}
              onChange={(e) => updateField("expiresAt", e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <Label className={cn(isDark && "text-slate-300")}>Active</Label>
              <p className={cn("text-xs", isDark ? "text-slate-500" : "text-muted-foreground")}>
                {form.isActive ? "Coupon is currently active" : "Coupon is disabled"}
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => updateField("isActive", v)}
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
              {editCoupon ? "Save Changes" : "Create Coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

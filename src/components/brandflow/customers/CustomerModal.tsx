"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useValtrioxStore } from "@/store/brandflow-store";
import { cn } from "@/lib/utils";

interface CustomerForm {
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  notes: string;
  loyaltyTier: string;
}

interface CustomerModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  organizationId: string;
  customer?: Record<string, any> | null;
}

const LOYALTY_TIERS = [
  { value: "new", label: "New", color: "text-slate-500" },
  { value: "bronze", label: "Bronze", color: "text-amber-700" },
  { value: "silver", label: "Silver", color: "text-slate-400" },
  { value: "gold", label: "Gold", color: "text-yellow-500" },
];

const emptyForm: CustomerForm = {
  name: "",
  email: "",
  phone: "",
  city: "",
  address: "",
  notes: "",
  loyaltyTier: "new",
};

export function CustomerModal({
  open,
  onClose,
  onSaved,
  organizationId,
  customer,
}: CustomerModalProps) {
  const { appTheme } = useValtrioxStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerForm, string>>>({});

  const isEdit = !!customer;

  // Populate form when editing
  useEffect(() => {
    if (open && customer) {
      setForm({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        city: customer.city || "",
        address: customer.address || "",
        notes: customer.notes || "",
        loyaltyTier: customer.loyaltyTier || "new",
      });
    } else if (open && !customer) {
      setForm(emptyForm);
    }
    setErrors({});
  }, [customer, open]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !loading) {
        onClose();
      }
    },
    [open, loading, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CustomerForm, string>> = {};

    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email format";
    }

    if (form.phone && !/^[\d\s\-+()]{7,20}$/.test(form.phone)) {
      newErrors.phone = "Invalid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const url = isEdit ? `/api/customers/${customer.id}` : "/api/customers";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, organizationId }),
      });

      if (res.ok) {
        toast.success(isEdit ? "Customer updated successfully" : "Customer added successfully");
        onSaved();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save customer");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = cn(
    isGold && "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-500 focus:border-amber-500/50",
    isDark && !isGold && "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-500",
    errors.name && "border-red-500",
    errors.email && "border-red-500",
    errors.phone && "border-red-500",
    errors.city && "border-red-500"
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !loading) onClose(); }}>
      <DialogContent
        className={cn(
          "max-w-md max-h-[90vh] overflow-y-auto",
          isGold && "bg-[#15151e] border-white/[0.08]"
        )}
      >
        <DialogHeader>
          <DialogTitle className={cn(isDark && "text-white")}>
            {isEdit ? "Edit Customer" : "Add Customer"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className={cn(isDark && "text-slate-300")}>
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Customer name"
              className={inputClasses}
              autoFocus
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className={cn(isDark && "text-slate-300")}>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                className={inputClasses}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className={cn(isDark && "text-slate-300")}>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+92 300-0000000"
                className={inputClasses}
              />
              {errors.phone && (
                <p className="text-xs text-red-500">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <Label className={cn(isDark && "text-slate-300")}>City</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="e.g. Lahore, Karachi, Islamabad"
              className={inputClasses}
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label className={cn(isDark && "text-slate-300")}>Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Full address"
              className={cn(inputClasses, isDark && "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-500")}
            />
          </div>

          {/* Loyalty Tier */}
          <div className="space-y-1.5">
            <Label className={cn(isDark && "text-slate-300")}>Loyalty Tier</Label>
            <Select
              value={form.loyaltyTier}
              onValueChange={(v) => setForm({ ...form, loyaltyTier: v })}
            >
              <SelectTrigger
                className={cn(
                  isGold && "bg-white/[0.04] border-white/[0.08] text-white",
                  isDark && !isGold && "bg-white/[0.04] border-white/[0.08] text-white"
                )}
              >
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                {LOYALTY_TIERS.map((tier) => (
                  <SelectItem key={tier.value} value={tier.value}>
                    {tier.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className={cn(isDark && "text-slate-300")}>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any notes about this customer..."
              rows={2}
              className={cn(
                isGold && "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-500",
                isDark && !isGold && "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-500"
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={cn(
                "flex-1",
                isGold && "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
              )}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={cn(
                "flex-1",
                isGold
                  ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black hover:shadow-[0_4px_20px_rgba(212,160,23,0.3)]"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              )}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                "Update Customer"
              ) : (
                "Add Customer"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

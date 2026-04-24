"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useBrandFlowStore } from "@/store/brandflow-store";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  price: number;
  costPrice?: number | null;
  stock: number;
  category?: string | null;
  status: string;
  imageUrl?: string | null;
  [key: string]: unknown;
}

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  organizationId: string;
  product?: Product | null;
}

interface FormErrors {
  name?: string;
  price?: string;
  stock?: string;
}

export function ProductModal({ open, onClose, onSaved, organizationId, product }: ProductModalProps) {
  const { appTheme } = useBrandFlowStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const nameRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    price: "",
    costPrice: "",
    stock: "",
    category: "",
    status: "active" as string,
  });

  const isEdit = !!product;

  // Reset form when product changes or modal opens
  useEffect(() => {
    if (open) {
      if (product) {
        setForm({
          name: product.name || "",
          sku: product.sku || "",
          description: product.description || "",
          price: String(product.price ?? ""),
          costPrice: String(product.costPrice ?? ""),
          stock: String(product.stock ?? ""),
          category: product.category || "",
          status: product.status || "active",
        });
      } else {
        setForm({ name: "", sku: "", description: "", price: "", costPrice: "", stock: "", category: "", status: "active" });
      }
      setErrors({});
      // Focus name field after dialog animation
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [product, open]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    },
    [loading, onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "Product name is required";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (form.name.trim().length > 200) {
      newErrors.name = "Name must be under 200 characters";
    }

    if (form.price !== "" && isNaN(Number(form.price))) {
      newErrors.price = "Price must be a valid number";
    } else if (Number(form.price) < 0) {
      newErrors.price = "Price cannot be negative";
    }

    if (form.stock !== "" && isNaN(Number(form.stock))) {
      newErrors.stock = "Stock must be a valid number";
    } else if (Number(form.stock) < 0) {
      newErrors.stock = "Stock cannot be negative";
    } else if (!Number.isInteger(Number(form.stock))) {
      newErrors.stock = "Stock must be a whole number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      const url = isEdit ? `/api/products/${product!.id}` : "/api/products";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, organizationId }),
      });

      if (res.ok) {
        toast.success(isEdit ? "Product updated successfully" : "Product created successfully");
        onSaved();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to save product");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error for field on change
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !loading) onClose(); }}>
      <DialogContent className={cn(
        "max-w-md max-h-[90vh] overflow-y-auto",
        isGold && "bg-[#15151e] border-white/[0.08]"
      )}>
        <DialogHeader>
          <DialogTitle className={cn(isDark && "text-white")}>
            {isEdit ? "Edit Product" : "Add New Product"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label className={cn(isDark && "text-slate-300")}>
              Product Name <span className="text-red-400">*</span>
            </Label>
            <Input
              ref={nameRef}
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g. Rose Hip Serum"
              className={cn(
                isGold && "bg-white/5 border-white/10 text-white",
                isDark && !isGold && "bg-white/5 border-white/10 text-white",
                errors.name && "border-red-500"
              )}
            />
            {errors.name && (
              <p className="text-xs text-red-400">{errors.name}</p>
            )}
          </div>

          {/* SKU + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>SKU</Label>
              <Input
                value={form.sku}
                onChange={(e) => updateField("sku", e.target.value)}
                placeholder="SKU-001"
                className={cn(
                  isGold && "bg-white/5 border-white/10 text-white",
                  isDark && !isGold && "bg-white/5 border-white/10 text-white"
                )}
              />
            </div>
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>Category</Label>
              <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
                <SelectTrigger className={cn(
                  isGold && "bg-white/5 border-white/10 text-white",
                  isDark && !isGold && "bg-white/5 border-white/10 text-white"
                )}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Skincare">Skincare</SelectItem>
                  <SelectItem value="Oils">Oils</SelectItem>
                  <SelectItem value="Lip Care">Lip Care</SelectItem>
                  <SelectItem value="Sun Care">Sun Care</SelectItem>
                  <SelectItem value="Eye Care">Eye Care</SelectItem>
                  <SelectItem value="Body Care">Body Care</SelectItem>
                  <SelectItem value="Masks">Masks</SelectItem>
                  <SelectItem value="Hair Care">Hair Care</SelectItem>
                  <SelectItem value="Fragrances">Fragrances</SelectItem>
                  <SelectItem value="Makeup">Makeup</SelectItem>
                  <SelectItem value="Accessories">Accessories</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className={cn(isDark && "text-slate-300")}>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Brief product description..."
              rows={3}
              className={cn(
                isGold && "bg-white/5 border-white/10 text-white",
                isDark && !isGold && "bg-white/5 border-white/10 text-white"
              )}
            />
          </div>

          {/* Price + Cost Price + Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>
                Price <span className="text-red-400">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => updateField("price", e.target.value)}
                placeholder="0.00"
                className={cn(
                  isGold && "bg-white/5 border-white/10 text-white",
                  isDark && !isGold && "bg-white/5 border-white/10 text-white",
                  errors.price && "border-red-500"
                )}
              />
              {errors.price && (
                <p className="text-xs text-red-400">{errors.price}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>Cost Price</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.costPrice}
                onChange={(e) => updateField("costPrice", e.target.value)}
                placeholder="0.00"
                className={cn(
                  isGold && "bg-white/5 border-white/10 text-white",
                  isDark && !isGold && "bg-white/5 border-white/10 text-white"
                )}
              />
            </div>
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>Stock</Label>
              <Input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => updateField("stock", e.target.value)}
                placeholder="0"
                className={cn(
                  isGold && "bg-white/5 border-white/10 text-white",
                  isDark && !isGold && "bg-white/5 border-white/10 text-white",
                  errors.stock && "border-red-500"
                )}
              />
              {errors.stock && (
                <p className="text-xs text-red-400">{errors.stock}</p>
              )}
            </div>
          </div>

          {/* Currency hint */}
          <p className={cn("text-[11px]", isDark ? "text-slate-500" : "text-muted-foreground")}>
            All prices are in PKR (Rs.)
          </p>

          {/* Status */}
          <div className="space-y-2">
            <Label className={cn(isDark && "text-slate-300")}>Status</Label>
            <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
              <SelectTrigger className={cn(
                isGold && "bg-white/5 border-white/10 text-white",
                isDark && !isGold && "bg-white/5 border-white/10 text-white"
              )}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className={cn(
                "flex-1",
                isGold && "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
              )}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={cn(
                "flex-1",
                isGold
                  ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black font-bold hover:shadow-[0_4px_20px_rgba(212,160,23,0.3)]"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isEdit ? "Updating..." : "Creating..."}
                </span>
              ) : isEdit ? "Update Product" : "Create Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

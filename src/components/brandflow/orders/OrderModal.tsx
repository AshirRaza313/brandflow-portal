"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface OrderModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  organizationId: string;
}

export function OrderModal({ open, onClose, onCreated, organizationId }: OrderModalProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customerId: "",
    channel: "manual",
    notes: "",
  });
  const [items, setItems] = useState<{ productId: string; productName: string; quantity: number; price: number }[]>([]);

  useEffect(() => {
    if (open && organizationId) {
      fetchDropdowns();
    }
  }, [open, organizationId]);

  const fetchDropdowns = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        fetch(`/api/customers?orgId=${organizationId}`),
        fetch(`/api/products?orgId=${organizationId}`),
      ]);
      if (custRes.ok) setCustomers((await custRes.json()).customers);
      if (prodRes.ok) setProducts((await prodRes.json()).products);
    } catch (err) {
      console.error(err);
    }
  };

  const addItem = () => {
    setItems([...items, { productId: "", productName: "", quantity: 1, price: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[index] = { productId: product.id, productName: product.name, quantity: 1, price: product.price };
      }
    } else if (field === "quantity") {
      updated[index] = { ...updated[index], quantity: parseInt(value) || 1 };
    }
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    const validItems = items.filter((i) => i.productId);
    if (validItems.length === 0) {
      toast.error("Select products for all items");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          customerId: form.customerId || null,
          channel: form.channel,
          notes: form.notes,
          items: validItems,
        }),
      });
      if (res.ok) {
        toast.success("Order created successfully");
        onCreated();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create order");
      }
    } catch {
      toast.error("Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-3 w-3" /> Add Item
              </Button>
            </div>
            {items.map((item, index) => (
              <div key={index} className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-0">
                  <Select value={item.productId} onValueChange={(v) => updateItem(index, "productId", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} — ${p.price}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", e.target.value)}
                  className="w-20 h-9"
                />
                <span className="text-sm font-medium w-16 text-right">${(item.price * item.quantity).toFixed(2)}</span>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-500" onClick={() => removeItem(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t">
            <span className="font-semibold text-lg">Total: ${total.toFixed(2)}</span>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-initial">Cancel</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 flex-1 sm:flex-initial" disabled={loading}>
                Create Order
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

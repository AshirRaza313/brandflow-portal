"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, ShoppingCart, DollarSign, Truck, Star } from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";
import { useBrandOnyxStore } from "@/store/brandflow-store";

interface Supplier {
  id: number;
  name: string;
  contactEmail: string;
  phone: string;
  category: string;
  address: string;
  createdAt: string;
}

export function SuppliersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState({ name: "", contactEmail: "", phone: "", category: "", address: "" });
  const { appTheme } = useBrandOnyxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  const handleSubmit = () => {
    if (!formData.name) { toast.error("Supplier name is required"); return; }
    if (!formData.contactEmail) { toast.error("Contact email is required"); return; }
    setSuppliers(prev => [
      { id: Date.now(), ...formData, createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setCreateOpen(false);
    setFormData({ name: "", contactEmail: "", phone: "", category: "", address: "" });
    toast.success("Supplier added successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supplier Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage vendors, track orders, and monitor supplier performance</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setCreateOpen(true)}>
          <Building2 className="mr-2 h-4 w-4" /> Add Supplier
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Suppliers", value: String(suppliers.length), icon: Building2 },
          { title: "Active Orders", value: "0", icon: ShoppingCart },
          { title: "Pending Payments", value: "Rs. 0", icon: DollarSign },
          { title: "On-Time Delivery", value: "—", icon: Truck },
        ].map((stat) => (
          <Card key={stat.title} className="border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.title}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toggle */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        <button className="px-4 py-2.5 text-sm font-medium border-b-2 border-emerald-600 text-emerald-600">Supplier Directory</button>
        <button className="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700">Performance Ratings</button>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-8">
          {suppliers.length > 0 ? (
            <div className="space-y-3">
              <p className="text-base font-semibold text-slate-900 mb-4">Supplier Directory</p>
              {suppliers.map((supplier) => (
                <div key={supplier.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{supplier.name}</p>
                    <p className="text-xs text-slate-500">{supplier.contactEmail} · {supplier.category || "No category"}</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">Active</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Building2}
              title="No suppliers added yet"
              description="Add suppliers to manage purchase orders, track deliveries, and monitor quality."
              actionLabel="Add Supplier"
              onAction={() => setCreateOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-4">
          <p className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-emerald-600" /> Order History</p>
          <EmptyState icon={ShoppingCart} title="No orders placed yet" description="Purchase orders will appear here once you place orders with suppliers." />
        </CardContent>
      </Card>

      {/* Create Supplier Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={isDark ? "bg-slate-800 border-slate-700 text-slate-100" : ""}>
          <DialogHeader>
            <DialogTitle className={isGold ? "text-amber-400" : isDark ? "text-slate-100" : "text-slate-900"}>Add New Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Supplier Name</Label>
              <Input
                placeholder="Enter supplier name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Contact Email</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                  className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Phone</Label>
                <Input
                  placeholder="+971 50 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Category</Label>
              <Input
                placeholder="e.g. Skincare, Packaging, Raw Materials"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Address</Label>
              <Textarea
                placeholder="Enter supplier address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                rows={2}
                className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} className={isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : ""}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Add Supplier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

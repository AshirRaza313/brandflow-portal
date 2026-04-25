"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Warehouse, Package, BarChart3, AlertTriangle, Boxes, Move, ClipboardList, ShoppingCart, ArrowRightLeft } from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";
import { useValtrioxStore } from "@/store/brandflow-store";

interface StockMovement {
  id: number;
  type: "transfer" | "receiving";
  sku: string;
  productName: string;
  quantity: number;
  fromZone: string;
  toZone: string;
  notes: string;
  createdAt: string;
}

export function WarehousePage() {
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  const [movements, setMovements] = useState<StockMovement[]>([]);

  // Stock Transfer dialog
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ sku: "", productName: "", quantity: "", fromZone: "", toZone: "", notes: "" });

  const handleTransferSubmit = () => {
    if (!transferForm.sku) { toast.error("SKU is required"); return; }
    if (!transferForm.quantity || Number(transferForm.quantity) <= 0) { toast.error("Valid quantity is required"); return; }
    setMovements(prev => [
      { id: Date.now(), type: "transfer", ...transferForm, quantity: Number(transferForm.quantity), createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setTransferOpen(false);
    setTransferForm({ sku: "", productName: "", quantity: "", fromZone: "", toZone: "", notes: "" });
    toast.success("Stock transfer created successfully!");
  };

  // Stock Receiving dialog
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState({ sku: "", productName: "", quantity: "", toZone: "", notes: "" });

  const handleReceiveSubmit = () => {
    if (!receiveForm.sku) { toast.error("SKU is required"); return; }
    if (!receiveForm.quantity || Number(receiveForm.quantity) <= 0) { toast.error("Valid quantity is required"); return; }
    setMovements(prev => [
      { id: Date.now(), type: "receiving", ...receiveForm, quantity: Number(receiveForm.quantity), fromZone: "External", createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setReceiveOpen(false);
    setReceiveForm({ sku: "", productName: "", quantity: "", toZone: "", notes: "" });
    toast.success("Stock received successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Warehouse Management</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor inventory, zones, picking, and capacity</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="text-xs" onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Stock Transfer
          </Button>
          <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setReceiveOpen(true)}>
            <Package className="mr-2 h-4 w-4" /> Receive Stock
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { title: "Total SKUs", value: "0", icon: Boxes },
          { title: "Total Capacity", value: "0", icon: Warehouse },
          { title: "Occupancy Rate", value: "0%", icon: BarChart3 },
          { title: "Orders Pending", value: "0", icon: ClipboardList },
        ].map((stat) => (
          <Card key={stat.title} className="border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.title}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Zones */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Zones & Racks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[{ zone: "Zone A", label: "Skincare" }, { zone: "Zone B", label: "Cosmetics" }, { zone: "Zone C", label: "Packaging" }, { zone: "Zone D", label: "Materials" }].map((z) => (
            <Card key={z.zone} className="border-slate-200">
              <CardContent className="p-4">
                <p className="text-sm font-bold text-slate-900">{z.zone}</p>
                <p className="text-xs text-slate-600 mb-2">{z.label}</p>
                <div className="text-xs text-slate-400">0/0 capacity · 0 items</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2"><Move className="h-4 w-4 text-amber-600" /> Stock Movement Log</p>
            {movements.length > 0 ? (
              <div className="space-y-2">
                {movements.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{m.productName || m.sku}</p>
                      <p className="text-xs text-slate-500">
                        {m.type === "transfer" ? `${m.fromZone} → ${m.toZone}` : `Received into ${m.toZone}`} · Qty: {m.quantity}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${m.type === "transfer" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                      {m.type === "transfer" ? "Transfer" : "Received"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Move} title="No stock movements" description="Stock movement records will appear when inventory is received, transferred, or shipped." />
            )}
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-amber-600" /> Picking Queue</p>
            <EmptyState icon={ShoppingCart} title="No picking orders" description="Orders will appear here once they are ready for warehouse picking." />
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-base font-semibold text-slate-900 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Low Stock Alerts</p>
            <span className="text-xs text-slate-400">0 alerts</span>
          </div>
          <EmptyState icon={AlertTriangle} title="No low stock alerts" description="Low stock alerts will appear when inventory falls below minimum thresholds." />
        </CardContent>
      </Card>

      {/* Stock Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className={isDark ? "bg-slate-800 border-slate-700 text-slate-100" : ""}>
          <DialogHeader>
            <DialogTitle className={isGold ? "text-amber-400" : isDark ? "text-slate-100" : "text-slate-900"}>Stock Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>SKU</Label>
                <Input
                  placeholder="e.g. SKU-001"
                  value={transferForm.sku}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, sku: e.target.value }))}
                  className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Product Name</Label>
                <Input
                  placeholder="e.g. Face Serum"
                  value={transferForm.productName}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, productName: e.target.value }))}
                  className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>From Zone</Label>
                <select
                  value={transferForm.fromZone}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, fromZone: e.target.value }))}
                  className={`w-full h-9 px-3 text-xs rounded-md border ${isDark ? "bg-slate-700 border-slate-600 text-slate-100" : "bg-white border-slate-300 text-slate-900"}`}
                >
                  <option value="">Select zone</option>
                  <option value="Zone A - Skincare">Zone A - Skincare</option>
                  <option value="Zone B - Cosmetics">Zone B - Cosmetics</option>
                  <option value="Zone C - Packaging">Zone C - Packaging</option>
                  <option value="Zone D - Materials">Zone D - Materials</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>To Zone</Label>
                <select
                  value={transferForm.toZone}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, toZone: e.target.value }))}
                  className={`w-full h-9 px-3 text-xs rounded-md border ${isDark ? "bg-slate-700 border-slate-600 text-slate-100" : "bg-white border-slate-300 text-slate-900"}`}
                >
                  <option value="">Select zone</option>
                  <option value="Zone A - Skincare">Zone A - Skincare</option>
                  <option value="Zone B - Cosmetics">Zone B - Cosmetics</option>
                  <option value="Zone C - Packaging">Zone C - Packaging</option>
                  <option value="Zone D - Materials">Zone D - Materials</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Quantity</Label>
              <Input
                type="number"
                placeholder="Enter quantity"
                value={transferForm.quantity}
                onChange={(e) => setTransferForm(prev => ({ ...prev, quantity: e.target.value }))}
                className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Notes</Label>
              <Textarea
                placeholder="Optional notes about the transfer"
                value={transferForm.notes}
                onChange={(e) => setTransferForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setTransferOpen(false)} className={isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : ""}>
                Cancel
              </Button>
              <Button onClick={handleTransferSubmit} className="bg-amber-600 hover:bg-amber-700 text-white">
                Create Transfer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Receiving Dialog */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className={isDark ? "bg-slate-800 border-slate-700 text-slate-100" : ""}>
          <DialogHeader>
            <DialogTitle className={isGold ? "text-amber-400" : isDark ? "text-slate-100" : "text-slate-900"}>Receive Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>SKU</Label>
                <Input
                  placeholder="e.g. SKU-001"
                  value={receiveForm.sku}
                  onChange={(e) => setReceiveForm(prev => ({ ...prev, sku: e.target.value }))}
                  className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Product Name</Label>
                <Input
                  placeholder="e.g. Face Serum"
                  value={receiveForm.productName}
                  onChange={(e) => setReceiveForm(prev => ({ ...prev, productName: e.target.value }))}
                  className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Quantity</Label>
                <Input
                  type="number"
                  placeholder="Enter quantity"
                  value={receiveForm.quantity}
                  onChange={(e) => setReceiveForm(prev => ({ ...prev, quantity: e.target.value }))}
                  className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Assign to Zone</Label>
                <select
                  value={receiveForm.toZone}
                  onChange={(e) => setReceiveForm(prev => ({ ...prev, toZone: e.target.value }))}
                  className={`w-full h-9 px-3 text-xs rounded-md border ${isDark ? "bg-slate-700 border-slate-600 text-slate-100" : "bg-white border-slate-300 text-slate-900"}`}
                >
                  <option value="">Select zone</option>
                  <option value="Zone A - Skincare">Zone A - Skincare</option>
                  <option value="Zone B - Cosmetics">Zone B - Cosmetics</option>
                  <option value="Zone C - Packaging">Zone C - Packaging</option>
                  <option value="Zone D - Materials">Zone D - Materials</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Notes</Label>
              <Textarea
                placeholder="Optional notes about the receiving (e.g. PO number, supplier)"
                value={receiveForm.notes}
                onChange={(e) => setReceiveForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setReceiveOpen(false)} className={isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : ""}>
                Cancel
              </Button>
              <Button onClick={handleReceiveSubmit} className="bg-amber-600 hover:bg-amber-700 text-white">
                Receive Stock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Truck, CheckCircle2, Clock, Calculator, Printer, Globe, BarChart3, MapPin } from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";
import { useBrandForgeStore } from "@/store/brandflow-store";

interface Shipment {
  id: number;
  recipientName: string;
  destination: string;
  weight: string;
  items: string;
  status: string;
  createdAt: string;
}

interface Carrier {
  id: number;
  name: string;
  serviceType: string;
  apiKey: string;
  active: boolean;
  createdAt: string;
}

export function ShippingPage() {
  const [calculatedRate, setCalculatedRate] = useState<string | null>(null);
  const { appTheme } = useBrandForgeStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  // Shipment dialog
  const [shipmentOpen, setShipmentOpen] = useState(false);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shipmentForm, setShipmentForm] = useState({ recipientName: "", destination: "", weight: "", items: "" });

  const handleShipmentSubmit = () => {
    if (!shipmentForm.recipientName) { toast.error("Recipient name is required"); return; }
    if (!shipmentForm.destination) { toast.error("Destination is required"); return; }
    setShipments(prev => [
      { id: Date.now(), ...shipmentForm, status: "pending", createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setShipmentOpen(false);
    setShipmentForm({ recipientName: "", destination: "", weight: "", items: "" });
    toast.success("Shipment created successfully!");
  };

  // Carrier dialog
  const [carrierOpen, setCarrierOpen] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carrierForm, setCarrierForm] = useState({ name: "", serviceType: "", apiKey: "" });

  const handleCarrierSubmit = () => {
    if (!carrierForm.name) { toast.error("Carrier name is required"); return; }
    setCarriers(prev => [
      { id: Date.now(), ...carrierForm, active: true, createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setCarrierOpen(false);
    setCarrierForm({ name: "", serviceType: "", apiKey: "" });
    toast.success("Carrier configured successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shipping Management</h1>
          <p className="text-sm text-slate-500 mt-1">Track shipments, manage carriers, and calculate rates</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShipmentOpen(true)}>
          <Truck className="mr-2 h-4 w-4" /> Create Shipment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { title: "Orders to Ship", value: String(shipments.filter(s => s.status === "pending").length), icon: Package },
          { title: "In Transit", value: String(shipments.filter(s => s.status === "in_transit").length), icon: Truck },
          { title: "Delivered Today", value: String(shipments.filter(s => s.status === "delivered").length), icon: CheckCircle2 },
          { title: "Avg Delivery Time", value: "—", icon: Clock },
        ].map((stat) => (
          <Card key={stat.title} className="border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.title}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-4">
          <p className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-600" />Carrier Comparison</p>
          {carriers.length > 0 ? (
            <div className="space-y-2">
              {carriers.map((carrier) => (
                <div key={carrier.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{carrier.name}</p>
                    <p className="text-xs text-slate-500">{carrier.serviceType} · {carrier.apiKey ? "Connected" : "No API key"}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${carrier.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {carrier.active ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Truck}
              title="No carriers configured"
              description="Set up carrier integrations to compare rates and track shipments."
              actionLabel="Configure Carriers"
              onAction={() => setCarrierOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-base font-semibold text-slate-900 flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-600" /> Tracking Dashboard</p>
                <span className="text-xs text-slate-400">{shipments.filter(s => s.status === "in_transit").length} in transit</span>
              </div>
              {shipments.length > 0 ? (
                <div className="space-y-2">
                  {shipments.map((shipment) => (
                    <div key={shipment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{shipment.recipientName}</p>
                        <p className="text-xs text-slate-500">{shipment.destination} · {shipment.weight} kg</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${shipment.status === "delivered" ? "bg-emerald-100 text-emerald-700" : shipment.status === "in_transit" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                        {shipment.status.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={MapPin} title="No shipments tracked" description="Active shipments will appear here with tracking information." />
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <p className="text-base font-semibold text-slate-900 flex items-center gap-2"><Calculator className="h-4 w-4 text-emerald-600" /> Rate Calculator</p>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-700">Origin</Label>
                  <Select><SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select origin" /></SelectTrigger>
                    <SelectContent><SelectItem value="dubai">Dubai, UAE</SelectItem><SelectItem value="riyadh">Riyadh, KSA</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-700">Destination</Label>
                  <Select><SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select destination" /></SelectTrigger>
                    <SelectContent><SelectItem value="abu-dhabi">Abu Dhabi, UAE</SelectItem><SelectItem value="jeddah">Jeddah, KSA</SelectItem></SelectContent></Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2"><Label className="text-xs font-medium text-slate-700">Weight (kg)</Label><Input type="number" placeholder="0.5" className="text-xs h-9" /></div>
                  <div className="space-y-2"><Label className="text-xs font-medium text-slate-700">Dimensions (cm)</Label><Input placeholder="20x15x10" className="text-xs h-9" /></div>
                </div>
                <Button onClick={() => setCalculatedRate("Select origin and destination")} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                  Calculate Rate
                </Button>
                {calculatedRate && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center mt-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Note</p>
                    <p className="text-sm font-medium text-slate-700">{calculatedRate}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Shipment Dialog */}
      <Dialog open={shipmentOpen} onOpenChange={setShipmentOpen}>
        <DialogContent className={isDark ? "bg-slate-800 border-slate-700 text-slate-100" : ""}>
          <DialogHeader>
            <DialogTitle className={isGold ? "text-amber-400" : isDark ? "text-slate-100" : "text-slate-900"}>Create New Shipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Recipient Name</Label>
              <Input
                placeholder="Enter recipient name"
                value={shipmentForm.recipientName}
                onChange={(e) => setShipmentForm(prev => ({ ...prev, recipientName: e.target.value }))}
                className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Destination</Label>
              <Input
                placeholder="Enter destination address or city"
                value={shipmentForm.destination}
                onChange={(e) => setShipmentForm(prev => ({ ...prev, destination: e.target.value }))}
                className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Weight (kg)</Label>
                <Input
                  type="number"
                  placeholder="0.5"
                  value={shipmentForm.weight}
                  onChange={(e) => setShipmentForm(prev => ({ ...prev, weight: e.target.value }))}
                  className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Items Description</Label>
                <Input
                  placeholder="e.g. Skincare set"
                  value={shipmentForm.items}
                  onChange={(e) => setShipmentForm(prev => ({ ...prev, items: e.target.value }))}
                  className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShipmentOpen(false)} className={isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : ""}>
                Cancel
              </Button>
              <Button onClick={handleShipmentSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Create Shipment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Carrier Setup Dialog */}
      <Dialog open={carrierOpen} onOpenChange={setCarrierOpen}>
        <DialogContent className={isDark ? "bg-slate-800 border-slate-700 text-slate-100" : ""}>
          <DialogHeader>
            <DialogTitle className={isGold ? "text-amber-400" : isDark ? "text-slate-100" : "text-slate-900"}>Configure Carrier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Carrier Name</Label>
              <Input
                placeholder="e.g. DHL, FedEx, Aramex"
                value={carrierForm.name}
                onChange={(e) => setCarrierForm(prev => ({ ...prev, name: e.target.value }))}
                className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Service Type</Label>
              <Input
                placeholder="e.g. Express, Standard, Economy"
                value={carrierForm.serviceType}
                onChange={(e) => setCarrierForm(prev => ({ ...prev, serviceType: e.target.value }))}
                className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>API Key</Label>
              <Input
                type="password"
                placeholder="Enter carrier API key"
                value={carrierForm.apiKey}
                onChange={(e) => setCarrierForm(prev => ({ ...prev, apiKey: e.target.value }))}
                className={isDark ? "bg-slate-700 border-slate-600 text-slate-100" : ""}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setCarrierOpen(false)} className={isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : ""}>
                Cancel
              </Button>
              <Button onClick={handleCarrierSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Save Carrier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

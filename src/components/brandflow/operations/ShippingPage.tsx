// @ts-nocheck — Phase 8: pre-existing TS errors (Decimal/Prisma types, etc.) pending migration
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Truck, CheckCircle2, Clock, Calculator, Globe, BarChart3, MapPin, Copy, Check, Plane, Warehouse, ClipboardCheck, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";
import { useValtrioxStore } from "@/store/brandflow-store";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Shipment {
  id: number;
  recipientName: string;
  destination: string;
  weight: string;
  items: string;
  status: string;
  trackingNumber: string;
  carrier: string;
  createdAt: string;
  estimatedDelivery?: string;
  timeline?: ShipmentEvent[];
}

interface ShipmentEvent {
  status: string;
  label: string;
  timestamp: string;
  completed: boolean;
}

interface Carrier {
  id: number;
  name: string;
  serviceType: string;
  apiKey: string;
  active: boolean;
  logo?: string;
  estimatedDays: string;
  createdAt: string;
}

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: ClipboardCheck, color: "text-slate-400", activeColor: "text-amber-500" },
  { key: "processing", label: "Processing", icon: Package, color: "text-slate-400", activeColor: "text-blue-500" },
  { key: "shipped", label: "Shipped", icon: Warehouse, color: "text-slate-400", activeColor: "text-indigo-500" },
  { key: "in_transit", label: "In Transit", icon: Plane, color: "text-slate-400", activeColor: "text-purple-500" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck, color: "text-slate-400", activeColor: "text-orange-500" },
  { key: "delivered", label: "Delivered", icon: CheckCircle2, color: "text-slate-400", activeColor: "text-emerald-500" },
];

const STATUS_FLOW = ["pending", "processing", "shipped", "in_transit", "out_for_delivery", "delivered"];

function getStepIndex(status: string): number {
  return STATUS_FLOW.indexOf(status);
}

function generateTrackingNumber(): string {
  const prefix = "BRF";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = prefix + "-";
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateTimeline(status: string): ShipmentEvent[] {
  const idx = getStepIndex(status);
  const now = new Date();
  return STATUS_STEPS.map((step, i) => {
    const hoursAgo = (idx - i) * 12;
    const ts = hoursAgo > 0
      ? new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString()
      : undefined;
    return {
      status: step.key,
      label: step.label,
      timestamp: ts || "",
      completed: i <= idx,
    };
  });
}

// ── Status Timeline Component ──
function ShipmentTimeline({ shipment, isDark, isGold }: { shipment: Shipment; isDark: boolean; isGold: boolean }) {
  const currentIdx = getStepIndex(shipment.status);

  return (
    <div className="flex items-start gap-0 w-full py-2">
      {STATUS_STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isCompleted = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        const isLast = idx === STATUS_STEPS.length - 1;

        return (
          <div key={step.key} className="flex items-start flex-1 relative">
            {/* Connector line */}
            {!isLast && (
              <div className="absolute top-4 left-[calc(50%+12px)] right-[calc(-50%+12px)] h-0.5 z-0">
                <div className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isCompleted
                    ? isGold ? "bg-amber-500/60" : isDark ? "bg-amber-500/50" : "bg-amber-400"
                    : isDark ? "bg-white/[0.06]" : "bg-slate-200"
                )} style={{ width: idx < currentIdx ? "100%" : "0%" }} />
              </div>
            )}
            <div className="flex flex-col items-center flex-1 z-10">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                isCurrent
                  ? isGold ? "bg-amber-500/20 border-amber-500 shadow-lg shadow-amber-500/20" : isDark ? "bg-amber-500/15 border-amber-500 shadow-lg shadow-amber-500/10" : "bg-amber-50 border-amber-500 shadow-lg shadow-amber-200"
                  : isCompleted
                    ? isGold ? "bg-amber-500/30 border-amber-500/70" : isDark ? "bg-amber-500/20 border-amber-500/60" : "bg-amber-100 border-amber-400"
                    : isDark ? "bg-white/[0.04] border-white/[0.1]" : "bg-white border-slate-200"
              )}>
                <Icon className={cn(
                  "h-3.5 w-3.5 transition-colors",
                  isCurrent || isCompleted ? step.activeColor : step.color
                )} />
              </div>
              <span className={cn(
                "text-[9px] sm:text-[10px] mt-1.5 font-medium text-center leading-tight max-w-[3.5rem]",
                isCurrent ? (isDark ? "text-amber-400" : "text-amber-600") : (isDark ? "text-slate-500" : "text-slate-400")
              )}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ShippingPage() {
  const [calculatedRate, setCalculatedRate] = useState<string | null>(null);
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  const cardBg = isGold ? "bg-[#1D2437] border-white/8" : isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

  // Shipment dialog
  const [shipmentOpen, setShipmentOpen] = useState(false);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [expandedShipment, setExpandedShipment] = useState<number | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<number | null>(null);
  const [shipmentForm, setShipmentForm] = useState({ recipientName: "", destination: "", weight: "", items: "" });

  const handleShipmentSubmit = () => {
    if (!shipmentForm.recipientName) { toast.error("Recipient name is required"); return; }
    if (!shipmentForm.destination) { toast.error("Destination is required"); return; }
    const statuses = ["pending", "processing", "shipped", "in_transit", "out_for_delivery", "delivered"];
    const randomStatus = statuses[Math.floor(Math.random() * 3)]; // Mostly early statuses
    const trackingNum = generateTrackingNumber();
    const carrierNames = ["DHL Express", "FedEx", "Aramex", "UPS"];
    const carrier = carrierNames[Math.floor(Math.random() * carrierNames.length)];
    const estDelivery = new Date(Date.now() + (3 + Math.floor(Math.random() * 5)) * 24 * 60 * 60 * 1000).toISOString();

    const newShipment: Shipment = {
      id: Date.now(),
      ...shipmentForm,
      status: randomStatus,
      trackingNumber: trackingNum,
      carrier: carrier,
      createdAt: new Date().toISOString(),
      estimatedDelivery: estDelivery,
      timeline: generateTimeline(randomStatus),
    };
    setShipments(prev => [newShipment, ...prev]);
    setShipmentOpen(false);
    setShipmentForm({ recipientName: "", destination: "", weight: "", items: "" });
    toast.success("Shipment created successfully!");
  };

  const handleCopyTracking = async (shipmentId: number, trackingNumber: string) => {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopiedTracking(shipmentId);
      toast.success("Tracking number copied!");
      setTimeout(() => setCopiedTracking(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  // Carrier dialog
  const [carrierOpen, setCarrierOpen] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carrierForm, setCarrierForm] = useState({ name: "", serviceType: "", apiKey: "" });

  const handleCarrierSubmit = () => {
    if (!carrierForm.name) { toast.error("Carrier name is required"); return; }
    setCarriers(prev => [
      { id: Date.now(), ...carrierForm, active: true, estimatedDays: "3-5 business days", createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setCarrierOpen(false);
    setCarrierForm({ name: "", serviceType: "", apiKey: "" });
    toast.success("Carrier configured successfully!");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "in_transit": case "out_for_delivery": return isDark ? "bg-sky-500/15 text-sky-400 border-sky-500/25" : "bg-sky-50 text-sky-700 border-sky-200";
      case "shipped": return isDark ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/25" : "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "processing": return isDark ? "bg-blue-500/15 text-blue-400 border-blue-500/25" : "bg-blue-50 text-blue-700 border-blue-200";
      default: return isDark ? "bg-amber-500/15 text-amber-400 border-amber-500/25" : "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl font-bold", textPrimary)}>Shipping Management</h1>
          <p className={cn("text-sm mt-1", textSecondary)}>Track shipments, manage carriers, and calculate rates</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20" onClick={() => setShipmentOpen(true)}>
          <Truck className="mr-2 h-4 w-4" /> Create Shipment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {[
          { title: "Orders to Ship", value: String(shipments.filter(s => s.status === "pending" || s.status === "processing").length), icon: Package, accent: "text-amber-500", bgAccent: isDark ? "bg-amber-500/10" : "bg-amber-50" },
          { title: "In Transit", value: String(shipments.filter(s => s.status === "in_transit" || s.status === "shipped").length), icon: Truck, accent: "text-sky-500", bgAccent: isDark ? "bg-sky-500/10" : "bg-sky-50" },
          { title: "Delivered", value: String(shipments.filter(s => s.status === "delivered").length), icon: CheckCircle2, accent: "text-emerald-500", bgAccent: isDark ? "bg-emerald-500/10" : "bg-emerald-50" },
          { title: "Avg Delivery", value: shipments.length > 0 ? "3.2d" : "-", icon: Clock, accent: "text-purple-500", bgAccent: isDark ? "bg-purple-500/10" : "bg-purple-50" },
        ].map((stat) => (
          <Card key={stat.title} className={cn("border", cardBg)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className={cn("text-xs font-medium uppercase tracking-wider", textSecondary)}>{stat.title}</p>
                <div className={cn("p-1.5 rounded-lg", stat.bgAccent)}>
                  <stat.icon className={cn("h-4 w-4", stat.accent)} />
                </div>
              </div>
              <p className={cn("text-2xl font-bold", textPrimary)}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Carrier Comparison */}
      <Card className={cn("border", cardBg)}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <p className={cn("text-base font-semibold flex items-center gap-2", textPrimary)}>
              <BarChart3 className="h-4 w-4 text-amber-600" /> Carrier Comparison
            </p>
            <Button
              variant="ghost"
              size="sm"
              className={cn("text-xs gap-1", isDark ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50")}
              onClick={() => setCarrierOpen(true)}
            >
              <Globe className="h-3.5 w-3.5" /> Add Carrier
            </Button>
          </div>
          {carriers.length > 0 ? (
            <div className="space-y-2">
              {carriers.map((carrier) => (
                <div key={carrier.id} className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all",
                  isDark ? "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]" : "bg-slate-50 border-slate-100 hover:border-amber-200"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", isDark ? "bg-white/[0.06]" : "bg-white border border-slate-200")}>
                      <Truck className={cn("h-5 w-5", isDark ? "text-amber-400" : "text-amber-600")} />
                    </div>
                    <div>
                      <p className={cn("text-sm font-semibold", textPrimary)}>{carrier.name}</p>
                      <p className={cn("text-xs", textSecondary)}>{carrier.serviceType} · Est. {carrier.estimatedDays}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-full border",
                    carrier.active
                      ? (isDark ? "bg-amber-500/15 text-amber-400 border-amber-500/25" : "bg-amber-50 text-amber-700 border-amber-200")
                      : (isDark ? "bg-white/[0.04] text-slate-500 border-white/[0.08]" : "bg-slate-100 text-slate-500 border-slate-200")
                  )}>
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
          <Card className={cn("border", cardBg)}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <p className={cn("text-base font-semibold flex items-center gap-2", textPrimary)}>
                  <MapPin className="h-4 w-4 text-amber-600" /> Tracking Dashboard
                </p>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", isDark ? "bg-sky-500/10 text-sky-400" : "bg-sky-50 text-sky-600")}>
                  {shipments.filter(s => s.status === "in_transit").length} in transit
                </span>
              </div>
              {shipments.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  <AnimatePresence>
                    {shipments.map((shipment) => (
                      <motion.div
                        key={shipment.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className={cn(
                          "rounded-xl border transition-all cursor-pointer",
                          isDark ? "bg-white/[0.02] border-white/[0.06] hover:border-amber-500/20" : "bg-white border-slate-100 hover:border-amber-200",
                          expandedShipment === shipment.id && (isDark ? "border-amber-500/30 bg-white/[0.04]" : "border-amber-300 bg-amber-50/30")
                        )}
                        onClick={() => setExpandedShipment(expandedShipment === shipment.id ? null : shipment.id)}
                      >
                        {/* Shipment header */}
                        <div className="p-3 sm:p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", isDark ? "bg-white/[0.06]" : "bg-slate-100")}>
                                <Package className={cn("h-5 w-5", isDark ? "text-amber-400" : "text-amber-600")} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className={cn("text-sm font-semibold truncate", textPrimary)}>{shipment.recipientName}</p>
                                  <span className={cn(
                                    "px-2 py-0.5 text-[10px] font-semibold rounded-full border capitalize",
                                    getStatusColor(shipment.status)
                                  )}>
                                    {shipment.status.replace("_", " ")}
                                  </span>
                                </div>
                                <p className={cn("text-xs mt-0.5", textSecondary)}>{shipment.destination} · {shipment.weight} kg</p>
                                {shipment.carrier && (
                                  <p className="text-xs text-slate-400 mt-0.5">via {shipment.carrier}</p>
                                )}
                              </div>
                            </div>

                            {/* Tracking number + copy */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <code className={cn(
                                "text-[11px] font-mono px-2 py-1 rounded-md border",
                                isDark ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
                              )}>
                                {shipment.trackingNumber}
                              </code>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCopyTracking(shipment.id, shipment.trackingNumber); }}
                                className={cn(
                                  "p-1 rounded-md transition-colors",
                                  copiedTracking === shipment.id
                                    ? "text-emerald-500"
                                    : isDark ? "text-slate-500 hover:text-amber-400 hover:bg-amber-500/10" : "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                )}
                                title="Copy tracking number"
                              >
                                {copiedTracking === shipment.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Expand indicator */}
                          <div className="flex items-center justify-center mt-2">
                            <ArrowRight className={cn(
                              "h-3.5 w-3.5 transition-transform duration-200",
                              textSecondary,
                              expandedShipment === shipment.id && "rotate-90"
                            )} />
                          </div>
                        </div>

                        {/* Expanded timeline */}
                        <AnimatePresence>
                          {expandedShipment === shipment.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className={cn("px-4 pb-4 pt-1 border-t", isDark ? "border-white/[0.06]" : "border-slate-100")}>
                                <p className={cn("text-xs font-semibold uppercase tracking-wider mb-3", textSecondary)}>
                                  Shipment Timeline
                                </p>
                                <ShipmentTimeline shipment={shipment} isDark={isDark} isGold={isGold} />
                                {shipment.estimatedDelivery && (
                                  <div className={cn(
                                    "mt-3 flex items-center justify-between p-2.5 rounded-lg",
                                    isDark ? "bg-white/[0.03]" : "bg-slate-50"
                                  )}>
                                    <span className={cn("text-xs", textSecondary)}>Estimated Delivery</span>
                                    <span className={cn("text-xs font-semibold", textPrimary)}>
                                      {new Date(shipment.estimatedDelivery).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <EmptyState icon={MapPin} title="No shipments tracked" description="Active shipments will appear here with tracking information." />
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className={cn("border", cardBg)}>
            <CardContent className="p-4 sm:p-5">
              <p className={cn("text-base font-semibold flex items-center gap-2 mb-4", textPrimary)}>
                <Calculator className="h-4 w-4 text-amber-600" /> Rate Calculator
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className={cn("text-xs font-medium", textSecondary)}>Origin</Label>
                  <Select><SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select origin" /></SelectTrigger>
                    <SelectContent><SelectItem value="dubai">Dubai, UAE</SelectItem><SelectItem value="riyadh">Riyadh, KSA</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Label className={cn("text-xs font-medium", textSecondary)}>Destination</Label>
                  <Select><SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select destination" /></SelectTrigger>
                    <SelectContent><SelectItem value="abu-dhabi">Abu Dhabi, UAE</SelectItem><SelectItem value="jeddah">Jeddah, KSA</SelectItem></SelectContent></Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2"><Label className={cn("text-xs font-medium", textSecondary)}>Weight (kg)</Label><Input type="number" placeholder="0.5" className="text-xs h-9" /></div>
                  <div className="space-y-2"><Label className={cn("text-xs font-medium", textSecondary)}>Dimensions (cm)</Label><Input placeholder="20x15x10" className="text-xs h-9" /></div>
                </div>
                <Button onClick={() => setCalculatedRate("Select origin and destination")} className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs shadow-lg shadow-amber-600/20">
                  Calculate Rate
                </Button>
                {calculatedRate && (
                  <div className={cn("p-3 rounded-xl border text-center", isDark ? "bg-amber-500/5 border-amber-500/15" : "bg-amber-50 border-amber-200")}>
                    <p className={cn("text-xs uppercase tracking-wider", textSecondary)}>Note</p>
                    <p className={cn("text-sm font-medium mt-1", textPrimary)}>{calculatedRate}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Shipment Dialog */}
      <Dialog open={shipmentOpen} onOpenChange={setShipmentOpen}>
        <DialogContent className={cn("max-w-[calc(100vw-2rem)] sm:max-w-lg", isDark ? "bg-[#1D2437] border-white/10" : "")}>
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2", isGold ? "text-amber-400" : textPrimary)}>
              <Truck className="h-4 w-4 text-amber-500" /> Create New Shipment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className={cn("text-xs font-medium", textSecondary)}>Recipient Name</Label>
              <Input
                placeholder="Enter recipient name"
                value={shipmentForm.recipientName}
                onChange={(e) => setShipmentForm(prev => ({ ...prev, recipientName: e.target.value }))}
                className={isDark ? "bg-white/5 border-white/10 text-white" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label className={cn("text-xs font-medium", textSecondary)}>Destination</Label>
              <Input
                placeholder="Enter destination address or city"
                value={shipmentForm.destination}
                onChange={(e) => setShipmentForm(prev => ({ ...prev, destination: e.target.value }))}
                className={isDark ? "bg-white/5 border-white/10 text-white" : ""}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className={cn("text-xs font-medium", textSecondary)}>Weight (kg)</Label>
                <Input
                  type="number"
                  placeholder="0.5"
                  value={shipmentForm.weight}
                  onChange={(e) => setShipmentForm(prev => ({ ...prev, weight: e.target.value }))}
                  className={isDark ? "bg-white/5 border-white/10 text-white" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label className={cn("text-xs font-medium", textSecondary)}>Items Description</Label>
                <Input
                  placeholder="e.g. Skincare set"
                  value={shipmentForm.items}
                  onChange={(e) => setShipmentForm(prev => ({ ...prev, items: e.target.value }))}
                  className={isDark ? "bg-white/5 border-white/10 text-white" : ""}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShipmentOpen(false)} className={isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : ""}>
                Cancel
              </Button>
              <Button onClick={handleShipmentSubmit} className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20">
                Create Shipment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Carrier Setup Dialog */}
      <Dialog open={carrierOpen} onOpenChange={setCarrierOpen}>
        <DialogContent className={cn("max-w-[calc(100vw-2rem)] sm:max-w-lg", isDark ? "bg-[#1D2437] border-white/10" : "")}>
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2", isGold ? "text-amber-400" : textPrimary)}>
              <Globe className="h-4 w-4 text-amber-500" /> Configure Carrier
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className={cn("text-xs font-medium", textSecondary)}>Carrier Name</Label>
              <Input
                placeholder="e.g. DHL, FedEx, Aramex"
                value={carrierForm.name}
                onChange={(e) => setCarrierForm(prev => ({ ...prev, name: e.target.value }))}
                className={isDark ? "bg-white/5 border-white/10 text-white" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label className={cn("text-xs font-medium", textSecondary)}>Service Type</Label>
              <Input
                placeholder="e.g. Express, Standard, Economy"
                value={carrierForm.serviceType}
                onChange={(e) => setCarrierForm(prev => ({ ...prev, serviceType: e.target.value }))}
                className={isDark ? "bg-white/5 border-white/10 text-white" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label className={cn("text-xs font-medium", textSecondary)}>API Key</Label>
              <Input
                type="password"
                placeholder="Enter carrier API key"
                value={carrierForm.apiKey}
                onChange={(e) => setCarrierForm(prev => ({ ...prev, apiKey: e.target.value }))}
                className={isDark ? "bg-white/5 border-white/10 text-white" : ""}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setCarrierOpen(false)} className={isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : ""}>
                Cancel
              </Button>
              <Button onClick={handleCarrierSubmit} className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20">
                Save Carrier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

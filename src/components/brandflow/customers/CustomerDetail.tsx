"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Phone, MapPin, ShoppingBag, DollarSign, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface CustomerDetailProps {
  open: boolean;
  onClose: () => void;
  customerId?: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  packed: "bg-purple-100 text-purple-700",
  dispatched: "bg-cyan-100 text-cyan-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const tierColors: Record<string, string> = {
  new: "bg-slate-100 text-slate-600",
  bronze: "bg-orange-100 text-orange-700",
  silver: "bg-gray-200 text-gray-700",
  gold: "bg-amber-100 text-amber-700",
};

export function CustomerDetail({ open, onClose, customerId }: CustomerDetailProps) {
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchCustomer = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.customer) setCustomer(data.customer);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load customer details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && customerId) {
      fetchCustomer(customerId);
    }
    if (!open) setCustomer(null);
  }, [open, customerId, fetchCustomer]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customer Details</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <Separator />
            <Skeleton className="h-32" />
          </div>
        )}

        {!loading && customer && (
          <div className="space-y-4">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-emerald-700 font-bold text-lg">
                    {customer.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{customer.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className={`${tierColors[customer.loyaltyTier] || ""} text-xs`}>
                      {customer.loyaltyTier}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Joined {format(new Date(customer.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 text-sm">
              {customer.email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {customer.email}
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {customer.phone}
                </div>
              )}
              {customer.city && (
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {customer.city}{customer.address ? `, ${customer.address}` : ""}
                </div>
              )}
            </div>

            <Separator />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Total Spent</span>
                </div>
                <p className="text-xl font-bold text-emerald-700 mt-1">${customer.totalSpent.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Orders</span>
                </div>
                <p className="text-xl font-bold text-slate-700 mt-1">{customer.orderCount}</p>
              </div>
            </div>

            {/* Notes */}
            {customer.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-slate-700">{customer.notes}</p>
                </div>
              </>
            )}

            {/* Order History */}
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Recent Orders</p>
              {customer.orders?.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customer.orders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{order.orderNumber}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <CalendarDays className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{format(new Date(order.createdAt), "MMM d, yyyy")}</span>
                          <span className="text-xs text-muted-foreground ml-1">
                            &middot; {order.items?.length || 0} items
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-medium">${order.total.toFixed(2)}</p>
                        <Badge variant="secondary" className={`${statusColors[order.status] || ""} text-[10px]`}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No orders yet</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

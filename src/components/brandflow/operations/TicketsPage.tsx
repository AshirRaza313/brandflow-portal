"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Ticket, Clock, Star, TrendingUp, Filter, Zap } from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";
import { useValtrioxStore } from "@/store/brandflow-store";

interface TicketItem {
  id: number;
  subject: string;
  description: string;
  priority: string;
  customerName: string;
  status: string;
  createdAt: string;
}

export function TicketsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [formData, setFormData] = useState({ subject: "", description: "", priority: "Medium", customerName: "" });
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme === "premium-dark" || appTheme === "dark";
  const isGold = appTheme === "premium-dark";

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardClass = isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-white border-slate-200";
  const inputClass = isDark ? "bg-white/[0.06] border-white/[0.1] text-white placeholder:text-slate-500 focus-visible:border-amber-500/50" : "";

  const handleSubmit = () => {
    if (!formData.subject) { toast.error("Subject is required"); return; }
    if (!formData.customerName) { toast.error("Customer name is required"); return; }
    setTickets(prev => [
      { id: Date.now(), ...formData, status: "open", createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setCreateOpen(false);
    setFormData({ subject: "", description: "", priority: "Medium", customerName: "" });
    toast.success("Ticket created successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Support Tickets</h1>
          <p className={`text-sm ${textSecondary} mt-1`}>Manage customer support requests and track resolutions</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setCreateOpen(true)}>
          <Ticket className="mr-2 h-4 w-4" /> New Ticket
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { title: "Open Tickets", value: String(tickets.filter(t => t.status === "open").length), icon: Ticket },
          { title: "Avg Resolution", value: "\u2014", icon: Clock },
          { title: "Satisfaction Score", value: "\u2014", icon: Star },
          { title: "Today's Tickets", value: String(tickets.filter(t => new Date(t.createdAt).toDateString() === new Date().toDateString()).length), icon: TrendingUp },
        ].map((stat) => (
          <Card key={stat.title} className={cardClass}>
            <CardContent className="p-4">
              <p className={`text-xs font-medium uppercase tracking-wider ${textSecondary}`}>{stat.title}</p>
              <p className={`text-2xl font-bold mt-1 ${textPrimary}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className={`h-4 w-4 ${textSecondary}`} />
          <span className={`text-xs font-medium ${textSecondary}`}>Priority:</span>
          {["all", "Critical", "High", "Medium", "Low"].map((p) => (
            <button key={p} className={`px-3 py-1 rounded-full text-xs font-medium ${isDark ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{p}</button>
          ))}
        </div>
      </div>

      <Card className={cardClass}>
        <CardContent className="p-4">
          <p className={`text-base font-semibold ${textPrimary} mb-4`}>Ticket List</p>
          {tickets.length > 0 ? (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <div key={ticket.id} className={`flex items-center justify-between p-3 rounded-lg ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>{ticket.subject}</p>
                    <p className={`text-xs ${textSecondary}`}>{ticket.customerName} &middot; {ticket.priority} priority</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${isDark ? "bg-amber-500/15 text-amber-300" : "bg-amber-100 text-amber-700"}`}>{ticket.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Ticket}
              title="No support tickets yet"
              description="Support tickets will appear here when customers submit inquiries."
              actionLabel="Create Ticket"
              onAction={() => setCreateOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className={cardClass}>
            <CardContent className="p-4">
              <p className={`text-base font-semibold ${textPrimary} mb-4`}>Ticket Details</p>
              <EmptyState
                icon={Ticket}
                title="Select a ticket to view details"
                description="Click on a ticket from the list to see the conversation thread and take action."
              />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className={cardClass}>
            <CardContent className="p-4">
              <p className={`text-base font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
                <Zap className="h-4 w-4 text-amber-500" /> Auto-Routing Rules
              </p>
              <EmptyState icon={Zap} title="No routing rules configured" description="Set up auto-routing rules to assign tickets to the right team automatically." />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Ticket Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={isDark ? "bg-slate-900 border-white/[0.08]" : ""}>
          <DialogHeader>
            <DialogTitle className={`text-base font-semibold ${textPrimary}`}>Create New Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className={`text-xs font-medium ${textSecondary}`}>Customer Name</Label>
              <Input
                placeholder="Enter customer name"
                value={formData.customerName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label className={`text-xs font-medium ${textSecondary}`}>Subject</Label>
              <Input
                placeholder="Brief description of the issue"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label className={`text-xs font-medium ${textSecondary}`}>Description</Label>
              <Textarea
                placeholder="Detailed description of the issue"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label className={`text-xs font-medium ${textSecondary}`}>Priority</Label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className={`w-full h-9 px-3 text-xs rounded-md border ${isDark ? "bg-white/[0.06] border-white/[0.1] text-white" : "bg-white border-slate-300 text-slate-900"}`}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} className={isDark ? "border-white/[0.1] text-slate-300 hover:bg-white/[0.06]" : ""}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-amber-600 hover:bg-amber-700 text-white">
                Create Ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

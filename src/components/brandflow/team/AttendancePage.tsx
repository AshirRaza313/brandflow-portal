"use client";

import { useValtrioxStore } from "@/store/brandflow-store";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ClipboardCheck, Search, Calendar, Download, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const subTabs = [
  { id: "daily", label: "Daily" },
  { id: "monthly", label: "Monthly" },
  { id: "reports", label: "Reports" },
];

export function AttendancePage() {
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme === "dark" || appTheme === "premium-dark";
  const [activeTab, setActiveTab] = useState("daily");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [markOpen, setMarkOpen] = useState(false);
  const [markForm, setMarkForm] = useState({ employee: "", status: "present", notes: "" });
  const [reportOpen, setReportOpen] = useState(false);
  const [reportForm, setReportForm] = useState({ type: "daily", from: "", to: "" });
  const [records, setRecords] = useState<{ id: number; employee: string; status: string; notes: string }[]>([]);

  const handleMarkAttendance = () => {
    if (!markForm.employee.trim()) { toast.error("Employee name is required"); return; }
    setRecords(prev => [{ id: Date.now(), ...markForm }, ...prev]);
    setMarkOpen(false);
    setMarkForm({ employee: "", status: "present", notes: "" });
    toast.success("Attendance marked successfully!");
  };

  const handleGenerateReport = () => {
    if (!reportForm.from || !reportForm.to) { toast.error("Please select date range"); return; }
    setReportOpen(false);
    setReportForm({ type: "daily", from: "", to: "" });
    toast.success("Report generated successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={isDark ? "text-2xl font-bold text-white" : "text-2xl font-bold text-slate-900"}>Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">Track team attendance and working hours</p>
        </div>
        <div className="flex flex-wrap gap-2"><Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button>
          <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => setMarkOpen(true)}>Mark Attendance</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">0</p></CardContent></Card>
        <Card className="bg-amber-50 border-amber-200"><CardContent className="p-3"><p className="text-xs text-amber-600">Present</p><p className="text-xl font-bold text-amber-700">0</p></CardContent></Card>
        <Card className="bg-red-50 border-red-200"><CardContent className="p-3"><p className="text-xs text-red-600">Absent</p><p className="text-xl font-bold text-red-700">0</p></CardContent></Card>
        <Card className="bg-amber-50 border-amber-200"><CardContent className="p-3"><p className="text-xs text-amber-600">Late</p><p className="text-xl font-bold text-amber-700">0</p></CardContent></Card>
      </div>

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {subTabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={isDark ? `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-300"}` : `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "daily" && (
          <motion.div key="daily" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
              </div>
            </div>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <ClipboardCheck className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">No attendance data</h3>
                <p className="text-sm text-muted-foreground max-w-sm">Attendance records will appear here once team members are added.</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "monthly" && (
          <motion.div key="monthly" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <Calendar className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">No monthly data</h3>
                <p className="text-sm text-muted-foreground max-w-sm">Monthly summaries will appear after attendance is tracked.</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "reports" && (
          <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="p-8 text-center">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Attendance Reports</h3>
                <p className="text-sm text-muted-foreground mb-4">Generate detailed attendance reports for payroll processing.</p>
                <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => setReportOpen(true)}><Download className="mr-2 h-4 w-4" /> Generate Report</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={markOpen} onOpenChange={setMarkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" /> Mark Attendance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1 block">Employee Name</Label>
              <Input placeholder="Enter employee name" value={markForm.employee} onChange={(e) => setMarkForm({ ...markForm, employee: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Status</Label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={markForm.status} onChange={(e) => setMarkForm({ ...markForm, status: e.target.value })}>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half-day">Half Day</option>
              </select>
            </div>
            <div>
              <Label className="mb-1 block">Notes (optional)</Label>
              <Input placeholder="Any additional notes" value={markForm.notes} onChange={(e) => setMarkForm({ ...markForm, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setMarkOpen(false)}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleMarkAttendance}>Mark Attendance</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Generate Attendance Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1 block">Report Type</Label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={reportForm.type} onChange={(e) => setReportForm({ ...reportForm, type: e.target.value })}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
              <Label className="mb-1 block">From</Label>
              <input type="date" className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={reportForm.from} onChange={(e) => setReportForm({ ...reportForm, from: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">To</Label>
              <input type="date" className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={reportForm.to} onChange={(e) => setReportForm({ ...reportForm, to: e.target.value })} />
            </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleGenerateReport}><Download className="mr-2 h-4 w-4" /> Generate</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

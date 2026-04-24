"use client";

import { useState, useEffect } from "react";
import { useBrandFlowStore } from "@/store/brandflow-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedTo: string | null;
}

interface FormErrors {
  title?: string;
}

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  editTask?: Task | null;
  defaultStatus?: string;
  onSaved?: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const statuses = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const emptyForm = {
  title: "",
  description: "",
  priority: "medium",
  status: "todo",
  assignedTo: "",
  dueDate: "",
};

// ── Component ──────────────────────────────────────────────────────────────

export function TaskModal({ open, onOpenChange, organizationId, editTask, defaultStatus, onSaved }: TaskModalProps) {
  const { appTheme } = useBrandFlowStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState(emptyForm);

  // Reset form when modal opens or editTask changes
  useEffect(() => {
    if (!open) return;

    if (editTask) {
      setForm({
        title: editTask.title || "",
        description: editTask.description || "",
        priority: editTask.priority || "medium",
        status: editTask.status || "todo",
        assignedTo: editTask.assignedTo || "",
        dueDate: editTask.dueDate ? new Date(editTask.dueDate).toISOString().split("T")[0] : "",
      });
    } else {
      setForm({
        ...emptyForm,
        status: defaultStatus || "todo",
      });
    }
    setErrors({});
  }, [open, editTask, defaultStatus]);

  // Escape key closes modal
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onOpenChange(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onOpenChange]);

  // ── Validation ───────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.title.trim()) errs.title = "Task title is required";
    if (form.title.trim().length > 200) errs.title = "Title must be under 200 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (editTask) {
        const res = await fetch(`/api/tasks/${editTask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim() || null,
            priority: form.priority,
            status: form.status,
            assignedTo: form.assignedTo.trim() || null,
            dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update task");
        }
        toast.success("Task updated successfully");
      } else {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId,
            title: form.title.trim(),
            description: form.description.trim() || null,
            priority: form.priority,
            status: form.status,
            assignedTo: form.assignedTo.trim() || null,
            dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create task");
        }
        toast.success("Task created successfully");
      }
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      console.error("Task submit error:", err);
      toast.error(err.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // ── Theme Helpers ────────────────────────────────────────────────────

  const inputClass = cn(
    isDark && "border-white/10 bg-white/[0.03] focus-visible:border-emerald-500/50 placeholder:text-slate-500",
    isGold && "border-white/10 bg-white/[0.03] focus-visible:border-amber-500/50 placeholder:text-slate-500"
  );

  const submitBtnClass = isGold
    ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black hover:shadow-[0_4px_20px_rgba(212,160,23,0.3)] hover:-translate-y-0.5"
    : "bg-emerald-600 hover:bg-emerald-700";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className={cn("sm:max-w-md", isGold && "bg-[#15151e] border-white/[0.08]")}>
        <DialogHeader>
          <DialogTitle className={cn(isDark && "text-white")}>
            {editTask ? "Edit Task" : "New Task"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title" className={cn(isDark && "text-slate-300")}>
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="task-title"
              placeholder="What needs to be done?"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              className={cn(inputClass, errors.title && "border-red-500 focus-visible:border-red-500")}
              autoFocus
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task-desc" className={cn(isDark && "text-slate-300")}>Description</Label>
            <Textarea
              id="task-desc"
              placeholder="Add details..."
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={3}
              className={cn(inputClass, "resize-none")}
            />
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => updateField("priority", v)}>
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>Status</Label>
              <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="task-assigned" className={cn(isDark && "text-slate-300")}>Assigned To</Label>
            <Input
              id="task-assigned"
              placeholder="Team member name"
              value={form.assignedTo}
              onChange={(e) => updateField("assignedTo", e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="task-due" className={cn(isDark && "text-slate-300")}>Due Date</Label>
            <Input
              id="task-due"
              type="date"
              value={form.dueDate}
              onChange={(e) => updateField("dueDate", e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button
              type="button" variant="outline"
              onClick={() => onOpenChange(false)}
              className={cn(isGold && "border-white/10 text-slate-300 hover:bg-white/5")}
            >
              Cancel
            </Button>
            <Button type="submit" className={submitBtnClass} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editTask ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

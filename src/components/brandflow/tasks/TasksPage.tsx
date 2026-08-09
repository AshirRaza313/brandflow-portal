"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  LayoutGrid, List, Plus, ClipboardList, Search, Pencil, Trash2, RefreshCw, Loader2, AlertCircle,
  CalendarDays, Flag, GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { TaskModal } from "./TaskModal";
import { ConfirmDialog } from "@/components/brandflow/shared/ConfirmDialog";
import { LoadingSkeleton } from "@/components/brandflow/shared/LoadingSkeleton";
import { StatsCard } from "@/components/brandflow/shared/StatsCard";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners,
} from "@dnd-kit/core";

// ── Types ──────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = "board" | "list";
type TaskStatus = "todo" | "in_progress" | "done";

// ── Constants ──────────────────────────────────────────────────────────────

const viewTabs = [
  { id: "board" as const, label: "Board", icon: LayoutGrid },
  { id: "list" as const, label: "List", icon: List },
];

const statusColumns: { id: TaskStatus; label: string; color: string; headerColor: string; dotColor: string }[] = [
  { id: "todo", label: "To Do", color: "bg-slate-50", headerColor: "text-slate-700", dotColor: "bg-slate-400" },
  { id: "in_progress", label: "In Progress", color: "bg-amber-50/80", headerColor: "text-amber-700", dotColor: "bg-amber-400" },
  { id: "done", label: "Done", color: "bg-amber-50/80", headerColor: "text-amber-700", dotColor: "bg-amber-400" },
];

const priorityConfig: Record<string, { label: string; color: string; dotClass: string }> = {
  urgent: { label: "Urgent", color: "bg-red-500/15 text-red-500 border-red-500/20", dotClass: "bg-red-500" },
  high: { label: "High", color: "bg-orange-500/15 text-orange-500 border-orange-500/20", dotClass: "bg-orange-500" },
  medium: { label: "Medium", color: "bg-amber-500/15 text-amber-500 border-amber-500/20", dotClass: "bg-amber-500" },
  low: { label: "Low", color: "bg-slate-500/15 text-slate-500 border-slate-500/20", dotClass: "bg-slate-400" },
};

// ── Component ──────────────────────────────────────────────────────────────

export function TasksPage() {
  const { organization, appTheme } = useValtrioxStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("board");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch Tasks ──────────────────────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    if (!organization?.id) { setLoading(false); return; }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithAuth(`/api/tasks?orgId=${organization.id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch tasks");
      }
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err: any) {
      console.error("Fetch tasks error:", err);
      setError(err.message || "Something went wrong");
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // ── Debounced Search ──────────────────────────────────────────────────

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => { setSearch(value); }, 300);
  };

  // ── Filtered Tasks ────────────────────────────────────────────────────

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter((t) =>
      (t.title || "").toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q)
    );
  }, [tasks, search]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    filteredTasks.forEach((t) => {
      const status = (t.status as TaskStatus) || "todo";
      if (grouped[status]) grouped[status].push(t);
    });
    return grouped;
  }, [filteredTasks]);

  const stats = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  }), [tasks]);

  // ── DnD ───────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const newStatus = String(over.id) as TaskStatus;
    if (!statusColumns.some((c) => c.id === newStatus)) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      const res = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success("Task status updated");
    } catch {
      // Revert
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: task.status } : t));
      toast.error("Failed to update task status");
    }
  };

  // ── Delete Task ───────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deletingTaskId) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/tasks/${deletingTaskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Task deleted");
      setDeletingTaskId(null);
      fetchTasks();
    } catch {
      toast.error("Failed to delete task");
    } finally {
      setDeleting(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const openCreate = (defaultStatus?: string) => {
    setEditingTask(null);
    setTaskModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setTaskModalOpen(open);
    if (!open) setEditingTask(null);
  };

  const formatDueDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const isOverdue = d < now && d.toDateString() !== now.toDateString();
    const formatted = d.toLocaleDateString("en-PK", { day: "2-digit", month: "short" });
    return { formatted, isOverdue };
  };

  // ── Theme Classes ────────────────────────────────────────────────────

  const cardClass = isGold
    ? "bg-white/[0.03] border-white/[0.06]"
    : isDark
      ? "bg-white/[0.03] border-white/[0.06]"
      : "bg-white";

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-400" : "text-muted-foreground";
  const borderColor = isGold ? "border-white/[0.06]" : isDark ? "border-white/[0.06]" : "border-slate-200";

  const getColumnCardBg = (colId: TaskStatus) => {
    if (isGold) return "bg-white/[0.02] border-white/[0.06]";
    if (isDark) return "bg-white/[0.02] border-white/[0.06]";
    return colId === "todo" ? "bg-slate-50/80 border-slate-200" : colId === "in_progress" ? "bg-amber-50/60 border-amber-200" : "bg-amber-50/60 border-amber-200";
  };

  const getTaskCardBg = () => {
    if (isGold) return "bg-white/[0.05] border-white/[0.08] hover:border-amber-500/20";
    if (isDark) return "bg-white/[0.05] border-white/[0.08] hover:border-amber-500/20";
    return "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm";
  };

  const getPriorityBadgeClasses = (priority: string) => {
    const cfg = priorityConfig[priority] || priorityConfig.medium;
    if (isDark) {
      const darkMap: Record<string, string> = {
        urgent: "bg-red-500/15 text-red-400 border-red-500/20",
        high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
        medium: "bg-amber-500/15 text-amber-400 border-amber-500/20",
        low: "bg-slate-500/15 text-slate-400 border-slate-500/20",
      };
      return cn("px-1.5 py-0.5 rounded text-[10px] font-medium border", darkMap[priority] || darkMap.medium);
    }
    return cn("px-1.5 py-0.5 rounded text-[10px] font-medium border", cfg.color);
  };

  // ── Render ────────────────────────────────────────────────────────────

  const activeDragTask = activeDragId ? tasks.find((t) => t.id === activeDragId) : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-xl sm:text-2xl font-bold", textPrimary)}>Tasks</h1>
          <p className={cn("text-sm mt-1", textSecondary)}>Organize and track your team&apos;s work</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => fetchTasks()} disabled={loading}
            className={cn(isGold && "border-amber-500/20 text-amber-400 hover:bg-amber-500/10", isDark && !isGold && "border-white/10 text-slate-300 hover:bg-white/5")}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            className={isGold ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black hover:shadow-[0_4px_20px_rgba(211,166,56,0.3)] hover:-translate-y-0.5" : "bg-amber-600 hover:bg-amber-700"}
            onClick={() => openCreate()}
          >
            <Plus className="mr-2 h-4 w-4" /> New Task
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatsCard title="Total Tasks" value={stats.total} icon={ClipboardList} loading={loading} />
        <StatsCard title="To Do" value={stats.todo} icon={ClipboardList} loading={loading} variant="warning" />
        <StatsCard title="In Progress" value={stats.inProgress} icon={Loader2} loading={loading} variant="default" />
        <StatsCard title="Done" value={stats.done} icon={ClipboardList} loading={loading} variant="success" />
      </div>

      {/* View Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className={cn("flex gap-1 rounded-lg p-1", isDark ? "bg-white/5" : "bg-slate-100")}>
          {viewTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                view === tab.id
                  ? isGold
                    ? "bg-gradient-to-r from-amber-600/20 to-yellow-500/20 text-amber-400"
                    : isDark
                      ? "bg-amber-600/20 text-amber-400"
                      : "bg-white text-slate-900 shadow-sm"
                  : isDark
                    ? "text-slate-400 hover:text-slate-300"
                    : "text-slate-500 hover:text-slate-700"
              )}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={cn("pl-9", isDark && "border-white/10 bg-white/[0.03] focus-visible:border-amber-500/50 placeholder:text-slate-500")}
          />
        </div>
      </div>

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* Error */}
      {!loading && error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={cn(cardClass, "border-red-500/30")}>
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-500 font-medium mb-1">Failed to load tasks</p>
              <p className={cn("text-sm mb-4", textMuted)}>{error}</p>
              <Button variant="outline" onClick={() => fetchTasks()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Try Again
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Board View (Kanban) ──────────────────────────────────────── */}
      {!loading && !error && view === "board" && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[400px]">
            {statusColumns.map((col) => {
              const colTasks = tasksByStatus[col.id];
              return (
                <div key={col.id} data-droppable-id={col.id} className={cn("rounded-xl border p-3 flex flex-col min-h-[300px]", getColumnCardBg(col.id))}>
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", col.dotColor)} />
                      <h3 className={cn("font-semibold text-sm", isDark ? textPrimary : col.headerColor)}>{col.label}</h3>
                      <span className={cn("text-[10px] rounded-full px-2 py-0.5 font-medium",
                        isGold ? "bg-amber-500/15 text-amber-400" : isDark ? "bg-white/10 text-slate-400" : "bg-white text-slate-600"
                      )}>
                        {colTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Task Cards */}
                  <div className="flex-1 space-y-2 max-h-[500px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                    {colTasks.length === 0 && (
                      <div className="text-center py-10">
                        <ClipboardList className={cn("h-8 w-8 mx-auto mb-2", isDark ? "text-slate-400" : "text-slate-300")} />
                        <p className={cn("text-xs", isDark ? "text-slate-400" : "text-muted-foreground")}>No tasks</p>
                      </div>
                    )}
                    {colTasks.map((task) => {
                      const due = formatDueDate(task.dueDate);
                      return (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          data-draggable-id={task.id}
                          className={cn("group rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-all", getTaskCardBg())}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <GripVertical className={cn("h-3.5 w-3.5", isDark ? "text-slate-400" : "text-slate-300")} />
                              <span className={getPriorityBadgeClasses(task.priority)}>
                                {priorityConfig[task.priority]?.label || task.priority}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                              <button onClick={() => openEdit(task)} className={cn("h-7 w-7 rounded flex items-center justify-center", isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700")}>
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button onClick={() => setDeletingTaskId(task.id)} className="h-7 w-7 rounded flex items-center justify-center hover:bg-red-500/10 text-slate-400 hover:text-red-500">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          <h4 className={cn("text-sm font-medium mt-1.5 leading-snug", textPrimary, task.status === "done" && "line-through opacity-60")}>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className={cn("text-xs mt-1 line-clamp-2 leading-relaxed", textMuted)}>
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-2">
                            {due && (
                              <div className={cn("flex items-center gap-1 text-[10px] font-medium", due.isOverdue ? "text-red-500" : isDark ? "text-slate-400" : "text-slate-500")}>
                                <CalendarDays className="h-3 w-3" />
                                {due.formatted}
                              </div>
                            )}
                            {task.assignedTo && (
                              <span className={cn("text-[10px]", isDark ? "text-slate-400" : "text-slate-500")}>
                                <Flag className="h-3 w-3 inline mr-0.5" />
                                Assigned
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Add Task Button */}
                  <Button
                    variant="ghost"
                    className={cn("mt-2 text-xs w-full justify-start", isDark ? "text-slate-400 hover:text-slate-200" : "text-muted-foreground")}
                    onClick={() => openCreate(col.id)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add task
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeDragTask && (
              <div className={cn("rounded-lg border p-3 shadow-xl max-w-[260px]", getTaskCardBg())}>
                <span className={getPriorityBadgeClasses(activeDragTask.priority)}>
                  {priorityConfig[activeDragTask.priority]?.label}
                </span>
                <h4 className={cn("text-sm font-medium mt-1", textPrimary)}>{activeDragTask.title}</h4>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── List View ────────────────────────────────────────────────── */}
      {!loading && !error && view === "list" && (
        <AnimatePresence mode="wait">
          <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {filteredTasks.length === 0 ? (
              <Card className={cardClass}>
                <CardContent className="p-4">
                  <EmptyState
                    icon={ClipboardList}
                    title={search ? "No matching tasks" : "No tasks yet"}
                    description={search ? `No tasks match "${search}".` : "Create tasks to organize your team's work."}
                    action={!search ? { label: "Create First Task", onClick: () => openCreate() } : undefined}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className={cn(cardClass, "overflow-hidden")}>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className={cn("border-b", borderColor, isDark && "bg-white/[0.02]")}>
                          <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Title</TableHead>
                          <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Priority</TableHead>
                          <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Status</TableHead>
                          <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Due Date</TableHead>
                          <TableHead className={cn("text-xs font-semibold uppercase tracking-wider", textMuted)}>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTasks.map((task) => {
                          const due = formatDueDate(task.dueDate);
                          const col = statusColumns.find((c) => c.id === task.status);
                          return (
                            <TableRow key={task.id} className={cn("border-b", borderColor, isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50")}>
                              <TableCell>
                                <div>
                                  <p className={cn("text-sm font-medium", textPrimary, task.status === "done" && "line-through opacity-60")}>{task.title}</p>
                                  {task.description && (
                                    <p className={cn("text-xs mt-0.5 line-clamp-1 max-w-[300px]", textMuted)}>{task.description}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className={getPriorityBadgeClasses(task.priority)}>
                                  {priorityConfig[task.priority]?.label || task.priority}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <span className={cn("h-2 w-2 rounded-full", col?.dotColor)} />
                                  <span className={cn("text-xs font-medium", isDark ? "text-slate-300" : "text-slate-700")}>{col?.label || task.status}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {due ? (
                                  <span className={cn("text-xs", due.isOverdue ? "text-red-500 font-medium" : textSecondary)}>{due.formatted}</span>
                                ) : (
                                  <span className={cn("text-xs", textMuted)}>-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className={cn("h-8 w-8", isDark && "text-slate-400 hover:text-white hover:bg-white/5")} onClick={() => openEdit(task)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => setDeletingTaskId(task.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Task Modal */}
      {organization && (
        <TaskModal
          open={taskModalOpen}
          onOpenChange={handleModalClose}
          organizationId={organization.id}
          editTask={editingTask}
          onSaved={() => fetchTasks()}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!deletingTaskId}
        onOpenChange={(open) => { if (!open) setDeletingTaskId(null); }}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

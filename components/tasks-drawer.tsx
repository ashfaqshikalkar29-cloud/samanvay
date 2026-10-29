"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  ListTodo,
  Plus,
  Send,
  UserCheck,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/lib/store";
import { DEMO_TODAY, OFFICERS, type Bureau } from "@/lib/mock";
import {
  InterBureauTask,
  TaskPriority,
  TaskStatus,
  isTaskOverdue,
  getTaskDaysRemaining,
} from "@/lib/tasks";
import { fmtDate } from "@/components/ui-bits";

const PRIORITY_BADGES: Record<TaskPriority, string> = {
  urgent: "border-red-300 bg-red-100 text-red-800 font-bold animate-pulse",
  high: "border-orange-200 bg-orange-100 text-orange-800 font-semibold",
  medium: "border-blue-200 bg-blue-50 text-blue-700",
  low: "border-slate-200 bg-slate-100 text-slate-700",
};

export function TasksDrawer({
  isOpen,
  onClose,
  presetComplaintId,
}: {
  isOpen: boolean;
  onClose: () => void;
  presetComplaintId?: string;
}) {
  const { tasks, createTask, updateTaskStatus, role, complaints } = useApp();

  // Tab filter: "assigned_to_me", "delegated_by_me", "all"
  const defaultTab = role === "Admin" || role === "Chairperson" ? "all" : "assigned_to_me";
  const [tab, setTab] = useState<"assigned_to_me" | "delegated_by_me" | "all">(defaultTab);

  // New task dialog
  const [showCreate, setShowCreate] = useState(false);
  const [complaintId, setComplaintId] = useState(presetComplaintId || "C-1001");
  const [toBureau, setToBureau] = useState<Bureau>(role === "RB Officer" ? "PGRC" : "RB");
  const [assignedTo, setAssignedTo] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [deadline, setDeadline] = useState("2026-10-30");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const myBureau: Bureau = role === "PGRC Officer" ? "PGRC" : "RB";

  const filteredTasks = tasks.filter((t) => {
    if (tab === "assigned_to_me") {
      return role === "Admin" || role === "Chairperson" || t.to_bureau === myBureau;
    }
    if (tab === "delegated_by_me") {
      return role === "Admin" || role === "Chairperson" || t.from_bureau === myBureau;
    }
    return true;
  });

  const pendingCount = tasks.filter(
    (t) =>
      t.status !== "completed" &&
      (role === "Admin" || role === "Chairperson" || t.to_bureau === myBureau)
  ).length;

  const overdueCount = tasks.filter(
    (t) =>
      isTaskOverdue(t, DEMO_TODAY) &&
      (role === "Admin" || role === "Chairperson" || t.to_bureau === myBureau)
  ).length;

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !complaintId || !deadline) return;

    setIsSubmitting(true);
    const fromBureau: Bureau = role === "PGRC Officer" ? "PGRC" : "RB";
    const officerMention = assignedTo ? `@${assignedTo}` : `@${toBureau} Officer`;

    await createTask({
      complaint_id: complaintId,
      from_bureau: fromBureau,
      to_bureau: toBureau,
      assigned_to: assignedTo || `${toBureau} Duty Officer`,
      title: title.trim(),
      description: desc.trim(),
      deadline,
      status: "pending",
      priority,
      mentions: [officerMention],
      created_by: role,
    });

    setIsSubmitting(false);
    setShowCreate(false);
    setTitle("");
    setDesc("");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-900 text-white">
              <ListTodo className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Inter-Bureau Task Desk</h2>
              <p className="text-xs text-slate-500">
                {pendingCount} active task(s) · {overdueCount > 0 && <span className="text-red-600 font-semibold">{overdueCount} overdue</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-blue-900 hover:bg-blue-800 text-white text-xs h-8"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Delegate Task
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex border-b border-slate-200 bg-white px-6 py-2 text-xs">
          <button
            onClick={() => setTab("assigned_to_me")}
            className={`mr-4 border-b-2 py-2 font-medium transition-colors ${
              tab === "assigned_to_me"
                ? "border-blue-900 text-blue-950 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Assigned to My Bureau ({tasks.filter((t) => t.to_bureau === myBureau && t.status !== "completed").length})
          </button>
          <button
            onClick={() => setTab("delegated_by_me")}
            className={`mr-4 border-b-2 py-2 font-medium transition-colors ${
              tab === "delegated_by_me"
                ? "border-blue-900 text-blue-950 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Delegated by My Bureau
          </button>
          <button
            onClick={() => setTab("all")}
            className={`border-b-2 py-2 font-medium transition-colors ${
              tab === "all"
                ? "border-blue-900 text-blue-950 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            All Tasks ({tasks.length})
          </button>
        </div>

        {/* Task List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
              No tasks found under this filter view.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const overdue = isTaskOverdue(task, DEMO_TODAY);
              const daysLeft = getTaskDaysRemaining(task, DEMO_TODAY);

              return (
                <div
                  key={task.id}
                  className={`rounded-xl border p-4 transition-all shadow-xs ${
                    overdue
                      ? "border-red-300 bg-red-50/60 ring-1 ring-red-200"
                      : task.status === "completed"
                      ? "border-slate-200 bg-slate-50 opacity-80"
                      : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-950">
                        <Link href={`/complaint/${task.complaint_id}`} className="hover:underline">
                          {task.complaint_id}
                        </Link>
                      </span>
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200">
                        {task.from_bureau} → {task.to_bureau}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider border ${PRIORITY_BADGES[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {overdue ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          <AlertTriangle className="h-3 w-3" /> OVERDUE by {-daysLeft}d
                        </span>
                      ) : task.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                          <Calendar className="h-3 w-3" /> Due {fmtDate(task.deadline)} ({daysLeft}d left)
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="mt-2 text-sm font-semibold text-slate-900 leading-snug">
                    {task.title}
                  </h3>

                  {task.description && (
                    <div className="mt-2 rounded-md bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-200/70">
                      <span className="font-semibold text-slate-700 block text-[10px] uppercase tracking-wider text-amber-800 mb-0.5">
                        🔒 Confidential Internal Bureau Note (Hidden from Complainant)
                      </span>
                      {task.description}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                      <span>Assigned: <strong className="text-slate-700">{task.assigned_to}</strong></span>
                      {task.mentions?.length > 0 && (
                        <span className="text-blue-700 font-medium ml-1">{task.mentions.join(" ")}</span>
                      )}
                    </div>

                    {task.status !== "completed" && (
                      <div className="flex items-center gap-1.5">
                        {task.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-slate-300"
                            onClick={() => updateTaskStatus(task.id, "in_progress")}
                          >
                            Mark In Progress
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                          onClick={() => updateTaskStatus(task.id, "completed")}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Mark Resolved
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Create Task Modal Overlay */}
        {showCreate && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <p className="font-semibold text-slate-900 text-sm">Delegate Inter-Bureau Task</p>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowCreate(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleCreateTask} className="mt-4 space-y-3.5 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs">Related Grievance Case</Label>
                  <Select value={complaintId} onValueChange={(v) => { if (v) setComplaintId(v); }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {complaints.slice(0, 15).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.id} · {c.category} ({c.bureau})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Target Bureau</Label>
                    <Select value={toBureau} onValueChange={(v) => { if (v) setToBureau(v as Bureau); }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RB">Regional Bureau (RB)</SelectItem>
                        <SelectItem value="PGRC">PGRC Bureau</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Priority</Label>
                    <Select value={priority} onValueChange={(v) => { if (v) setPriority(v as TaskPriority); }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Assignee / @mention Officer</Label>
                  <Select value={assignedTo} onValueChange={(v) => { if (v) setAssignedTo(v); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Officer" /></SelectTrigger>
                    <SelectContent>
                      {OFFICERS.filter((o) => o.bureau === toBureau).map((o) => (
                        <SelectItem key={o.name} value={o.name}>
                          {o.name} ({o.bureau})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Task Directive / Title <span className="text-red-500">*</span></Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Conduct Joint On-site Lab Machinery Inspection"
                    className="h-8 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">
                    Confidential Internal Notes <span className="text-slate-400 font-normal">(Hidden from citizen)</span>
                  </Label>
                  <Textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Specific investigation questions, audit points, or statutory handbook clauses..."
                    rows={3}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Completion Deadline</Label>
                  <Input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowCreate(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="h-7 text-xs bg-blue-900 text-white" disabled={isSubmitting || !title.trim()}>
                    <Send className="mr-1 h-3 w-3" /> Delegate Task
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

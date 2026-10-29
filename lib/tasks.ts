// ==============================================================================
// SAMANVAY: Inter-Bureau Tasking System (2.6)
// Tasks, Deadlines, @mentions, and Cross-Bureau Delegation
// ==============================================================================

import type { Bureau } from "@/lib/mock";

export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface InterBureauTask {
  id: string;
  complaint_id: string;
  from_bureau: Bureau;
  to_bureau: Bureau;
  assigned_to: string;
  title: string;
  description: string; // Internal notes hidden from public complainants
  deadline: string; // YYYY-MM-DD
  status: TaskStatus;
  priority: TaskPriority;
  mentions: string[]; // e.g. ["@Dr. A. Kulkarni", "@Ms. R. Iyer"]
  created_by: string;
  created_at: string;
  completed_at?: string;
  completed_by?: string;
}

/** Check if task is overdue relative to constant demo date */
export function isTaskOverdue(task: InterBureauTask, todayIso: string): boolean {
  if (task.status === "completed") return false;
  return task.deadline < todayIso;
}

export function getTaskDaysRemaining(task: InterBureauTask, todayIso: string): number {
  const d1 = new Date(task.deadline);
  const d2 = new Date(todayIso);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Seed Inter-Bureau Tasks for realistic demo experience
export const SEED_INTER_BUREAU_TASKS: InterBureauTask[] = [
  {
    id: "task-001",
    complaint_id: "C-1001",
    from_bureau: "RB",
    to_bureau: "PGRC",
    assigned_to: "Ms. R. Iyer",
    title: "Verify Student Fee Refund Ledger with Bank Records",
    description: "Regional Bureau inspection revealed potential duplicate billing. Please audit fee receipts against state fee committee caps under confidential cover.",
    deadline: "2026-10-22", // Overdue for demo highlighting
    status: "pending",
    priority: "high",
    mentions: ["@Ms. R. Iyer", "@Dr. A. Kulkarni"],
    created_by: "Dr. A. Kulkarni",
    created_at: "2026-10-18T10:30:00.000Z",
  },
  {
    id: "task-002",
    complaint_id: "C-1002",
    from_bureau: "PGRC",
    to_bureau: "RB",
    assigned_to: "Dr. A. Kulkarni",
    title: "Verify Sanctioned Intake vs Admitted Student List",
    description: "Complainant claims 40 excess students admitted beyond AICTE approval. Cross-reference college admission register with portal EoA file.",
    deadline: "2026-10-26", // Due soon
    status: "in_progress",
    priority: "urgent",
    mentions: ["@Dr. A. Kulkarni"],
    created_by: "Ms. R. Iyer",
    created_at: "2026-10-20T14:15:00.000Z",
  },
  {
    id: "task-003",
    complaint_id: "C-1004",
    from_bureau: "RB",
    to_bureau: "PGRC",
    assigned_to: "Mr. V. Nair",
    title: "Examine Anti-Ragging Committee Minutes",
    description: "Obtain certified copy of College Anti-Ragging Committee resolution for incident dated 2026-10-14.",
    deadline: "2026-10-28",
    status: "pending",
    priority: "medium",
    mentions: ["@Mr. V. Nair"],
    created_by: "Dr. A. Kulkarni",
    created_at: "2026-10-22T11:00:00.000Z",
  },
  {
    id: "task-004",
    complaint_id: "C-1003",
    from_bureau: "PGRC",
    to_bureau: "RB",
    assigned_to: "Ms. P. Sharma",
    title: "Physical Inspection of Mechanical Lab Safety Equipment",
    description: "Conduct surprise on-site verification of workshop machine emergency brakes and fire extinguishers.",
    deadline: "2026-10-21",
    status: "completed",
    priority: "high",
    mentions: ["@Ms. P. Sharma"],
    created_by: "Ms. R. Iyer",
    created_at: "2026-10-16T09:00:00.000Z",
    completed_at: "2026-10-21T16:00:00.000Z",
    completed_by: "Ms. P. Sharma",
  },
];

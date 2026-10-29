// ==============================================================================
// SAMANVAY: Unified Cross-Bureau Timeline Service (2.5)
// Normalized Event Stream across Bureaus with Categorized Filtering
// ==============================================================================

import type { Bureau } from "@/lib/mock";

export type EventType =
  | "status_change"
  | "note"
  | "notice"
  | "hearing"
  | "merge"
  | "task"
  | "conflict";

export interface CaseEvent {
  id: string;
  complaint_id: string;
  bureau: Bureau | "System";
  event_type: EventType;
  actor: string;
  title: string;
  description: string;
  created_at: string; // ISO
  metadata?: Record<string, any>;
}

export const EVENT_TYPE_CONFIG: Record<
  EventType,
  { label: string; color: string; badgeClass: string }
> = {
  status_change: {
    label: "Status Transition",
    color: "#2563eb",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
  },
  note: {
    label: "Internal Note",
    color: "#64748b",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
  },
  notice: {
    label: "Formal Notice / Show Cause",
    color: "#d97706",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
  },
  hearing: {
    label: "Statutory Hearing",
    color: "#7c3aed",
    badgeClass: "border-purple-200 bg-purple-50 text-purple-700",
  },
  merge: {
    label: "Duplicate Merged",
    color: "#ea580c",
    badgeClass: "border-orange-200 bg-orange-50 text-orange-700",
  },
  task: {
    label: "Inter-Bureau Task",
    color: "#0d9488",
    badgeClass: "border-teal-200 bg-teal-50 text-teal-700",
  },
  conflict: {
    label: "Contradiction Alert",
    color: "#dc2626",
    badgeClass: "border-red-200 bg-red-50 text-red-700",
  },
};

export const BUREAU_COLORS: Record<Bureau | "System", { bg: string; text: string; ring: string }> = {
  RB: { bg: "bg-indigo-50", text: "text-indigo-700", ring: "ring-indigo-300" },
  PGRC: { bg: "bg-teal-50", text: "text-teal-700", ring: "ring-teal-300" },
  System: { bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-300" },
};

// Seed timeline events across multiple bureaus
export const SEED_CASE_EVENTS: CaseEvent[] = [
  // C-1001 Timeline
  {
    id: "evt-1001-1",
    complaint_id: "C-1001",
    bureau: "System",
    event_type: "status_change",
    actor: "System Intake Gateway",
    title: "Grievance Docketed via Web Portal",
    description: "Citizen registered complaint regarding capitation fees demanded during admission at Apex Institute of Technology.",
    created_at: "2026-10-01T09:30:00.000Z",
  },
  {
    id: "evt-1001-2",
    complaint_id: "C-1001",
    bureau: "RB",
    event_type: "note",
    actor: "Dr. A. Kulkarni",
    title: "Initial Scrutiny & File Creation",
    description: "Reviewed complaint allegations against approved intake under AICTE Approval Process Handbook norm 2.4.",
    created_at: "2026-10-02T11:00:00.000Z",
  },
  {
    id: "evt-1001-3",
    complaint_id: "C-1001",
    bureau: "RB",
    event_type: "notice",
    actor: "Dr. A. Kulkarni",
    title: "Show-Cause Notice Issued to College Management",
    description: "Directed institution principal to submit verified admission register and bank challans within 10 days.",
    created_at: "2026-10-05T14:20:00.000Z",
  },
  {
    id: "evt-1001-4",
    complaint_id: "C-1001",
    bureau: "System",
    event_type: "conflict",
    actor: "Samanvay Conflict Engine",
    title: "Contradiction Alert Flagged",
    description: "Detected opposing status between RB approval extension and PGRC sanction proceedings for Apex Institute of Technology.",
    created_at: "2026-10-12T16:00:00.000Z",
  },
  {
    id: "evt-1001-5",
    complaint_id: "C-1001",
    bureau: "RB",
    event_type: "hearing",
    actor: "Regional Officer",
    title: "First Standing Hearing Conducted",
    description: "College representatives appeared via hybrid conference; ordered to produce fee refund records by next sitting.",
    created_at: "2026-10-15T15:30:00.000Z",
  },
  {
    id: "evt-1001-6",
    complaint_id: "C-1001",
    bureau: "RB",
    event_type: "task",
    actor: "Dr. A. Kulkarni",
    title: "Task Assigned to PGRC",
    description: "Delegated task: 'Verify Student Fee Refund Ledger with Bank Records' to Ms. R. Iyer.",
    created_at: "2026-10-18T10:30:00.000Z",
  },

  // C-1002 Timeline
  {
    id: "evt-1002-1",
    complaint_id: "C-1002",
    bureau: "System",
    event_type: "status_change",
    actor: "System Intake Gateway",
    title: "Complaint Received via National Helpline",
    description: "Student parent reported withholding of original 10th and 12th certificates by Apex Institute of Technology.",
    created_at: "2026-10-04T10:15:00.000Z",
  },
  {
    id: "evt-1002-2",
    complaint_id: "C-1002",
    bureau: "PGRC",
    event_type: "note",
    actor: "Ms. R. Iyer",
    title: "PGRC Grievance Committee Review",
    description: "Verified prima facie violation of AICTE Public Notice Advt. No. AICTE/Legal/04(01)/2007 prohibiting certificate retention.",
    created_at: "2026-10-06T12:00:00.000Z",
  },
  {
    id: "evt-1002-3",
    complaint_id: "C-1002",
    bureau: "PGRC",
    event_type: "notice",
    actor: "Ms. R. Iyer",
    title: "Direct Order Issued for Certificate Return",
    description: "Ordered college to release certificates within 48 hours or face reduction of 50% sanctioned intake.",
    created_at: "2026-10-09T14:45:00.000Z",
  },
];

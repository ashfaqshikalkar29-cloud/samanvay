// ==============================================================================
// SAMANVAY: Smart Assignment & Officer Roster Engine (A. Smart Assignment)
// Round-robin, least-workload, skill/region routing, leave tracking & delegations
// ==============================================================================

import { Bureau, Complaint, Role, AuditEntry } from "./mock";
import { CaseEvent } from "./timeline";

export type AssignmentStrategy = "round-robin" | "least-workload" | "skill-region";

export interface OfficerProfile {
  id: string;
  name: string;
  bureau: Bureau;
  designation: string;
  email: string;
  skills: string[];
  assignedRegions: string[];
  onLeave: boolean;
  leaveUntil?: string; // YYYY-MM-DD
  leaveReason?: string;
  delegateOfficerId?: string;
  activeCasesCount?: number;
}

export interface AssignmentDecision {
  officerName: string;
  officerId: string;
  bureau: Bureau;
  strategyUsed: AssignmentStrategy;
  rationale: string;
  delegatedFrom?: string;
}

export interface ReassignmentRecord {
  complaintId: string;
  previousOfficer: string;
  newOfficer: string;
  justification: string;
  reassignedBy: string;
  reassignedAt: string;
  bureau: Bureau;
}

// ── Master Officer Roster with AICTE Expertise & Regional Mapping ─────────────
export const OFFICER_ROSTER: OfficerProfile[] = [
  {
    id: "off-rb-1",
    name: "Dr. A. Kulkarni",
    bureau: "RB",
    designation: "Deputy Director (Approval & Regulations)",
    email: "a.kulkarni@aicte-india.org",
    skills: ["Fee Regulation", "Approval / Affiliation", "Audit", "Capitation"],
    assignedRegions: ["Western", "Northern"],
    onLeave: false,
    activeCasesCount: 14,
  },
  {
    id: "off-rb-2",
    name: "Mr. S. Verma",
    bureau: "RB",
    designation: "Assistant Director (Regulatory Norms)",
    email: "s.verma@aicte-india.org",
    skills: ["Faculty Norms", "7th CPC", "Infrastructure", "Cadre Ratio"],
    assignedRegions: ["Southern", "North-West", "Central"],
    onLeave: false,
    activeCasesCount: 12,
  },
  {
    id: "off-rb-3",
    name: "Dr. Meera Nambiar",
    bureau: "RB",
    designation: "Legal & Regulatory Advisor",
    email: "m.nambiar@aicte-india.org",
    skills: ["Fee Regulation", "Admission Irregularity", "Legal Compliance"],
    assignedRegions: ["Eastern", "South-Western"],
    onLeave: true,
    leaveUntil: "2026-11-05",
    leaveReason: "On Statutory Inspection Duty in Bengaluru",
    delegateOfficerId: "off-rb-1", // Delegated to Dr. A. Kulkarni
    activeCasesCount: 3,
  },
  {
    id: "off-pgrc-1",
    name: "Ms. R. Iyer",
    bureau: "PGRC",
    designation: "Senior Grievance Officer (Student Welfare)",
    email: "r.iyer@aicte-india.org",
    skills: ["Ragging & Campus Safety", "Student Services", "Fee Refund", "Mental Health"],
    assignedRegions: ["Southern", "Western"],
    onLeave: false,
    activeCasesCount: 16,
  },
  {
    id: "off-pgrc-2",
    name: "Mr. P. Nair",
    bureau: "PGRC",
    designation: "Grievance Redressal Officer",
    email: "p.nair@aicte-india.org",
    skills: ["Scholarship", "Student Services", "Certificate Retention", "Hostel & Amenities"],
    assignedRegions: ["Northern", "Central", "North-West"],
    onLeave: false,
    activeCasesCount: 11,
  },
  {
    id: "off-pgrc-3",
    name: "Dr. Sunita Rao",
    bureau: "PGRC",
    designation: "Assistant Director (Ombudsperson Liaison)",
    email: "s.rao@aicte-india.org",
    skills: ["Ragging & Campus Safety", "Faculty Harassment", "Hostel & Amenities"],
    assignedRegions: ["Eastern", "South-Western"],
    onLeave: false,
    activeCasesCount: 9,
  },
];

class SmartAssignmentEngine {
  private roster: OfficerProfile[] = [...OFFICER_ROSTER];
  private roundRobinPointers: Record<Bureau, number> = { RB: 0, PGRC: 0 };

  constructor(roster?: OfficerProfile[]) {
    if (roster) this.roster = [...roster];
  }

  getRoster(): OfficerProfile[] {
    return this.roster;
  }

  getOfficerById(id: string): OfficerProfile | undefined {
    return this.roster.find((o) => o.id === id);
  }

  getOfficerByName(name: string): OfficerProfile | undefined {
    return this.roster.find((o) => o.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Updates dynamic workload counts based on a live list of complaints
   */
  recomputeWorkloads(complaints: Complaint[]): void {
    const counts: Record<string, number> = {};
    for (const c of complaints) {
      if (c.status !== "Disposed" && c.assigned_officer) {
        counts[c.assigned_officer] = (counts[c.assigned_officer] || 0) + 1;
      }
    }
    for (const off of this.roster) {
      off.activeCasesCount = counts[off.name] || 0;
    }
  }

  /**
   * Smartly chooses the optimal officer based on chosen strategy
   */
  assignOfficer(
    bureau: Bureau,
    category: string,
    region?: string,
    strategy: AssignmentStrategy = "least-workload"
  ): AssignmentDecision {
    const bureauOfficers = this.roster.filter((o) => o.bureau === bureau);
    if (bureauOfficers.length === 0) {
      return {
        officerName: bureau === "RB" ? "Dr. A. Kulkarni" : "Ms. R. Iyer",
        officerId: bureau === "RB" ? "off-rb-1" : "off-pgrc-1",
        bureau,
        strategyUsed: strategy,
        rationale: "Default bureau fallback",
      };
    }

    let selected: OfficerProfile | undefined;
    let rationale = "";

    // 1. Skill & Region Matching Strategy
    if (strategy === "skill-region") {
      const scored = bureauOfficers.map((o) => {
        let score = 0;
        if (o.skills.some((s) => category.toLowerCase().includes(s.toLowerCase()))) {
          score += 3;
        }
        if (region && o.assignedRegions.some((r) => r.toLowerCase() === region.toLowerCase())) {
          score += 2;
        }
        // Penalize higher workload
        score -= (o.activeCasesCount || 0) * 0.1;
        return { officer: o, score };
      });
      scored.sort((a, b) => b.score - a.score);
      selected = scored[0].officer;
      rationale = `Matched by domain skill specialization for "${category}" and region "${region || "All"}".`;
    }

    // 2. Least Workload Strategy
    else if (strategy === "least-workload") {
      const available = bureauOfficers.filter((o) => !o.onLeave);
      const candidates = available.length > 0 ? available : bureauOfficers;
      candidates.sort((a, b) => (a.activeCasesCount || 0) - (b.activeCasesCount || 0));
      selected = candidates[0];
      rationale = `Assigned via least-workload load balancing (${selected.activeCasesCount ?? 0} active cases).`;
    }

    // 3. Round-Robin Strategy
    else {
      const available = bureauOfficers.filter((o) => !o.onLeave);
      const pool = available.length > 0 ? available : bureauOfficers;
      const idx = this.roundRobinPointers[bureau] % pool.length;
      selected = pool[idx];
      this.roundRobinPointers[bureau] = (idx + 1) % pool.length;
      rationale = `Assigned via sequential round-robin distribution.`;
    }

    // Check if on leave and needs delegation
    let delegatedFrom: string | undefined;
    if (selected.onLeave && selected.delegateOfficerId) {
      const delegate = this.getOfficerById(selected.delegateOfficerId);
      if (delegate) {
        delegatedFrom = selected.name;
        rationale += ` (Note: ${selected.name} is on leave until ${selected.leaveUntil}; auto-delegated to ${delegate.name})`;
        selected = delegate;
      }
    }

    return {
      officerName: selected.name,
      officerId: selected.id,
      bureau: selected.bureau,
      strategyUsed: strategy,
      rationale,
      delegatedFrom,
    };
  }

  /**
   * Manual reassignment with mandatory justification and audit trail entries
   */
  reassignComplaint(
    complaint: Complaint,
    newOfficerName: string,
    justification: string,
    reassignedBy: string,
    role: Role
  ): {
    success: boolean;
    error?: string;
    patch?: Partial<Complaint>;
    auditEntry?: AuditEntry;
    timelineEvent?: CaseEvent;
  } {
    if (!justification || justification.trim().length < 5) {
      return {
        success: false,
        error: "A valid reassignment justification (minimum 5 characters) is mandatory.",
      };
    }

    const previousOfficer = complaint.assigned_officer;
    if (previousOfficer === newOfficerName) {
      return {
        success: false,
        error: "Complaint is already assigned to this officer.",
      };
    }

    const targetOfficer = this.getOfficerByName(newOfficerName);
    const targetBureau = targetOfficer?.bureau || complaint.bureau;

    const timestamp = new Date().toISOString();
    const patch: Partial<Complaint> = {
      assigned_officer: newOfficerName,
      bureau: targetBureau,
      dynamic_fields: {
        ...(complaint.dynamic_fields || {}),
        reassignment_history: [
          ...(complaint.dynamic_fields?.reassignment_history || []),
          {
            previous_officer: previousOfficer,
            new_officer: newOfficerName,
            justification,
            reassigned_by: reassignedBy,
            reassigned_at: timestamp,
          },
        ],
      },
    };

    const auditEntry: AuditEntry = {
      complaint_id: complaint.id,
      action: "Officer Reassigned",
      timestamp,
      officer: reassignedBy,
      remarks: `Reassigned from ${previousOfficer} to ${newOfficerName} (${targetBureau}). Reason: ${justification}`,
    };

    const timelineEvent: CaseEvent = {
      id: `evt-reassign-${Date.now()}`,
      complaint_id: complaint.id,
      bureau: targetBureau,
      actor: `${reassignedBy} (${role})`,
      event_type: "transfer",
      title: "Officer Reassignment",
      description: `Case reassigned from ${previousOfficer} to ${newOfficerName}. Justification: ${justification}`,
      created_at: timestamp,
      metadata: { previousOfficer, newOfficerName, justification, actor_role: role },
    };

    return {
      success: true,
      patch,
      auditEntry,
      timelineEvent,
    };
  }
}

export const defaultAssignmentEngine = new SmartAssignmentEngine();
export const smartAssignmentEngine = defaultAssignmentEngine;

// ==============================================================================
// SAMANVAY: Contradictory Directions & Conflict Alert Engine (2.7)
// Cross-Bureau Decision Conflict Detection & Resolution Workflow
// ==============================================================================

import type { Bureau, Complaint, Institution } from "@/lib/mock";

export type DecisionType =
  | "grant_approval"
  | "withdraw_approval"
  | "reduce_intake"
  | "impose_penalty"
  | "issue_noc"
  | "withhold_admissions"
  | "dismiss";

export interface ConflictAlert {
  id: string;
  institution_id: string;
  institution_name: string;
  complaint_ids: string[];
  conflict_type: string;
  bureaus: Bureau[];
  description: string;
  status: "Open" | "Resolved";
  detected_at: string;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
}

// Map opposing regulatory stances that generate statutory conflict
const OPPOSING_DECISION_PAIRS: [DecisionType, DecisionType][] = [
  ["grant_approval", "withdraw_approval"],
  ["grant_approval", "withhold_admissions"],
  ["issue_noc", "withdraw_approval"],
  ["issue_noc", "reduce_intake"],
  ["grant_approval", "reduce_intake"],
];

export function isContradictory(d1?: DecisionType, d2?: DecisionType): boolean {
  if (!d1 || !d2) return false;
  return OPPOSING_DECISION_PAIRS.some(
    ([a, b]) => (d1 === a && d2 === b) || (d1 === b && d2 === a)
  );
}

/**
 * Scans active complaints for contradictory regulatory directions
 * on the same institution across different bureaus
 */
export function detectConflicts(
  complaints: Complaint[],
  getInstitution: (id: string) => Institution | undefined
): ConflictAlert[] {
  const alerts: ConflictAlert[] = [];
  const instMap = new Map<string, Complaint[]>();

  for (const c of complaints) {
    const list = instMap.get(c.institution_id) || [];
    list.push(c);
    instMap.set(c.institution_id, list);
  }

  for (const [instId, instComplaints] of instMap.entries()) {
    if (instComplaints.length < 2) continue;

    const rbCases = instComplaints.filter((c) => c.bureau === "RB");
    const pgrcCases = instComplaints.filter((c) => c.bureau === "PGRC");

    if (rbCases.length === 0 || pgrcCases.length === 0) continue;

    for (const rb of rbCases) {
      for (const pgrc of pgrcCases) {
        let conflictFound = false;
        let conflictDesc = "";

        // Check structured decision types if present
        if (rb.decision_type && pgrc.decision_type) {
          if (isContradictory(rb.decision_type as DecisionType, pgrc.decision_type as DecisionType)) {
            conflictFound = true;
            conflictDesc = `RB directive "${rb.decision_type.replace(/_/g, " ")}" directly contradicts PGRC directive "${pgrc.decision_type.replace(/_/g, " ")}" on cases ${rb.id} and ${pgrc.id}.`;
          }
        }

        // Check next_action keywords indicating contradictory rulings
        if (!conflictFound) {
          const rbNext = (rb.next_action || "").toLowerCase();
          const pgrcNext = (pgrc.next_action || "").toLowerCase();

          const rbApproves = rbNext.includes("grant") || rbNext.includes("approve") || rbNext.includes("clear") || rbNext.includes("valid");
          const pgrcSanctions = pgrcNext.includes("withdraw") || pgrcNext.includes("penalty") || pgrcNext.includes("show-cause") || pgrcNext.includes("withhold");

          const pgrcApproves = pgrcNext.includes("settled") || pgrcNext.includes("disposed") || pgrcNext.includes("refund issued");
          const rbSanctions = rbNext.includes("reduce intake") || rbNext.includes("cancel") || rbNext.includes("deficiency");

          if ((rbApproves && pgrcSanctions) || (pgrcApproves && rbSanctions)) {
            conflictFound = true;
            conflictDesc = `Opposing actions recorded: RB is directing "${rb.next_action}", while PGRC is directing "${pgrc.next_action}".`;
          }
        }

        if (conflictFound) {
          const inst = getInstitution(instId);
          const alertId = `conflict-${instId}-${rb.id}-${pgrc.id}`;
          alerts.push({
            id: alertId,
            institution_id: instId,
            institution_name: inst?.name || instId,
            complaint_ids: [rb.id, pgrc.id],
            conflict_type: "Contradictory Cross-Bureau Regulatory Directives",
            bureaus: ["RB", "PGRC"],
            description: conflictDesc,
            status: "Open",
            detected_at: "2026-10-24T05:30:00.000Z",
          });
        }
      }
    }
  }

  return alerts;
}

// Pre-seeded conflict alert for demo case C-1001 & C-1002 (inst-1: Apex Institute of Technology)
export const SEED_CONFLICT_ALERTS: ConflictAlert[] = [
  {
    id: "conflict-inst-1-C-1001-C-1002",
    institution_id: "inst-1",
    institution_name: "Apex Institute of Technology",
    complaint_ids: ["C-1001", "C-1002"],
    conflict_type: "Contradictory Regulatory Directives",
    bureaus: ["RB", "PGRC"],
    description: "Regional Bureau issued Extension of Approval (EoA) clearance for AY 2026-27 under C-1001, while PGRC issued a show-cause notice directing withholding of student admissions due to fee capitation violations under C-1002.",
    status: "Open",
    detected_at: "2026-10-24T06:00:00.000Z",
  },
];

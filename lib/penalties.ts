/**
 * Samanvay AICTE Grievance Portal
 * Regulatory Action & Penalty Tracking Engine (Domain A)
 * Tracks compliance with statutory directives (fee refunds, certificate returns,
 * intake sanctions, derecognition) with proof verification and overdue tracking.
 */

import { auditChain } from "@/lib/security/audit-chain";

export type PenaltyType =
  | "FEE_REFUND_ORDER"
  | "CERTIFICATE_RESTORATION"
  | "INTAKE_REDUCTION"
  | "ADMISSION_FREEZE"
  | "FINANCIAL_PENALTY"
  | "APPROVAL_WITHDRAWAL";

export interface RegulatoryPenalty {
  id: string;
  complaint_id: string;
  institution_id: string;
  institution_name: string;
  penalty_type: PenaltyType;
  title: string;
  directive_details: string;
  monetary_amount?: number;
  compliance_deadline: string; // YYYY-MM-DD
  ordered_by: string; // e.g. "Chairperson Office, AICTE"
  ordered_at: string; // ISO
  status: "PENDING_COMPLIANCE" | "COMPLIANCE_VERIFIED" | "OVERDUE_BREACHED";
  compliance_proof?: {
    submitted_at: string;
    proof_document_url: string;
    verified_by_officer?: string;
    verification_notes?: string;
  };
}

class PenaltyTracker {
  private penalties = new Map<string, RegulatoryPenalty>();

  constructor() {
    const sampleId = "PEN-2026-001";
    this.penalties.set(sampleId, {
      id: sampleId,
      complaint_id: "C-1001",
      institution_id: "inst-1",
      institution_name: "Sahyadri Institute of Engineering & Technology",
      penalty_type: "FEE_REFUND_ORDER",
      title: "Mandatory Full Refund of Unapproved Capitation Fee",
      directive_details:
        "Institute is directed to refund the sum of Rs 45,000 directly to the student's bank account within 15 days, failing which 25% intake reduction shall be initiated for 2026-27.",
      monetary_amount: 45000,
      compliance_deadline: "2026-11-10",
      ordered_by: "Chairperson, AICTE",
      ordered_at: "2026-10-26T12:00:00Z",
      status: "PENDING_COMPLIANCE",
    });
  }

  /**
   * Impose a new statutory penalty or regulatory directive
   */
  async imposePenalty(params: {
    complaintId: string;
    institutionId: string;
    institutionName: string;
    penaltyType: PenaltyType;
    title: string;
    directiveDetails: string;
    monetaryAmount?: number;
    complianceDeadline: string;
    orderedBy: string;
  }): Promise<RegulatoryPenalty> {
    const penaltyId = `PEN-2026-${Date.now().toString().slice(-4)}`;

    const penalty: RegulatoryPenalty = {
      id: penaltyId,
      complaint_id: params.complaintId,
      institution_id: params.institutionId,
      institution_name: params.institutionName,
      penalty_type: params.penaltyType,
      title: params.title,
      directive_details: params.directiveDetails,
      monetary_amount: params.monetaryAmount,
      compliance_deadline: params.complianceDeadline,
      ordered_by: params.orderedBy,
      ordered_at: new Date().toISOString(),
      status: "PENDING_COMPLIANCE",
    };

    this.penalties.set(penaltyId, penalty);

    auditChain.appendBlock(
      params.complaintId,
      "REGULATORY_PENALTY_IMPOSED",
      { id: "chairperson", name: params.orderedBy, role: "Chairperson" },
      { penaltyId, type: params.penaltyType, deadline: params.complianceDeadline, amount: params.monetaryAmount }
    );

    return penalty;
  }

  /**
   * Submit compliance proof from institute
   */
  async submitComplianceProof(
    penaltyId: string,
    proofUrl: string
  ): Promise<RegulatoryPenalty | null> {
    const penalty = this.penalties.get(penaltyId);
    if (!penalty) return null;

    penalty.compliance_proof = {
      submitted_at: new Date().toISOString(),
      proof_document_url: proofUrl,
    };

    return penalty;
  }

  /**
   * Verify and close compliance
   */
  async verifyCompliance(
    penaltyId: string,
    officerName: string,
    notes: string
  ): Promise<RegulatoryPenalty | null> {
    const penalty = this.penalties.get(penaltyId);
    if (!penalty) return null;

    penalty.status = "COMPLIANCE_VERIFIED";
    if (penalty.compliance_proof) {
      penalty.compliance_proof.verified_by_officer = officerName;
      penalty.compliance_proof.verification_notes = notes;
    }

    auditChain.appendBlock(
      penalty.complaint_id,
      "PENALTY_COMPLIANCE_VERIFIED",
      { id: "officer", name: officerName, role: "Admin" },
      { penaltyId, verifiedAt: new Date().toISOString(), notes }
    );

    return penalty;
  }

  getPenaltiesForComplaint(complaintId: string): RegulatoryPenalty[] {
    return Array.from(this.penalties.values()).filter((p) => p.complaint_id === complaintId);
  }

  getAllPenalties(): RegulatoryPenalty[] {
    return Array.from(this.penalties.values());
  }
}

export const penaltyTracker = new PenaltyTracker();

/**
 * Samanvay AICTE Grievance Portal
 * Cross-Regulator Referral Adapter (Domain D)
 * Handles statutory referrals to partner regulatory bodies (UGC, BCI, PCI, State DTE, State Police)
 * when a grievance falls under shared or outside jurisdiction.
 */

import { ExternalRegulator, RegulatorReferral } from "./types";

export const REGULATOR_INFO: Record<
  ExternalRegulator,
  { name: string; statutoryAct: string; contactEmail: string; standardDays: number }
> = {
  UGC: {
    name: "University Grants Commission",
    statutoryAct: "UGC Act 1956 Section 12",
    contactEmail: "grievance.cell@ugc.ac.in",
    standardDays: 30,
  },
  BCI: {
    name: "Bar Council of India",
    statutoryAct: "Advocates Act 1961 Legal Education Rules",
    contactEmail: "legal.education@barcouncilofindia.org",
    standardDays: 30,
  },
  PCI: {
    name: "Pharmacy Council of India",
    statutoryAct: "Pharmacy Act 1948 Section 10",
    contactEmail: "registrar@pci.nic.in",
    standardDays: 30,
  },
  COA: {
    name: "Council of Architecture",
    statutoryAct: "Architects Act 1972",
    contactEmail: "registrar-coa@gov.in",
    standardDays: 30,
  },
  STATE_DTE: {
    name: "State Directorate of Technical Education",
    statutoryAct: "State Technical Education Statutory Regulations",
    contactEmail: "dte.grievance@state.gov.in",
    standardDays: 21,
  },
  STATE_POLICE: {
    name: "State Police / Cyber Crime Special Cell (Anti-Ragging)",
    statutoryAct: "Supreme Court Ragging Guidelines & BNS 2023",
    contactEmail: "cybercrime.antiragging@police.gov.in",
    standardDays: 7, // Rapid response for physical safety
  },
  DISABILITY_COMMISSION: {
    name: "Office of the Chief Commissioner for Persons with Disabilities",
    statutoryAct: "Rights of Persons with Disabilities (RPwD) Act 2016",
    contactEmail: "ccpd@nic.in",
    standardDays: 15,
  },
};

class RegulatorForwardAdapter {
  private referrals = new Map<string, RegulatorReferral>();

  /**
   * Forward a grievance to an external statutory regulator with official cover memo
   */
  async forwardGrievance(params: {
    complaintId: string;
    regulator: ExternalRegulator;
    officerName: string;
    remarks: string;
  }): Promise<RegulatorReferral> {
    const regInfo = REGULATOR_INFO[params.regulator];
    const referralId = `REF-${params.regulator}-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const expectedReplyDate = new Date(now.getTime() + regInfo.standardDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const referral: RegulatorReferral = {
      referral_id: referralId,
      complaint_id: params.complaintId,
      regulator: params.regulator,
      officer_in_charge: params.officerName,
      date_referred: now.toISOString().split("T")[0],
      statutory_clause: regInfo.statutoryAct,
      expected_reply_date: expectedReplyDate,
      status: "OUTWARD_DISPATCHED",
      official_reference_number: `F.No. AICTE/INTER-REG/${params.regulator}/2026/${referralId}`,
      cover_letter_url: `/api/complaints/pdf-summary?id=${params.complaintId}&referral=${referralId}`,
    };

    this.referrals.set(referralId, referral);
    return referral;
  }

  getReferral(referralId: string): RegulatorReferral | undefined {
    return this.referrals.get(referralId);
  }

  getReferralsForComplaint(complaintId: string): RegulatorReferral[] {
    return Array.from(this.referrals.values()).filter((r) => r.complaint_id === complaintId);
  }
}

export const regulatorForwardAdapter = new RegulatorForwardAdapter();

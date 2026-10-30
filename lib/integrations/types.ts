/**
 * Samanvay AICTE Grievance Portal
 * Domain D: External Integration Adapter Interfaces & Data Contracts
 * Provides pluggable adapter signatures for national educational and regulatory registries.
 */

import { Bureau, Role } from "@/lib/mock";

// ── 1. AICTE Approval Database Adapter ─────────────────────────────────────
export interface ApprovedProgramme {
  course_name: string;
  level: "Undergraduate" | "Postgraduate" | "Diploma";
  sanctioned_intake: number;
  approved_year: string;
  accreditation_status: "NBA Accredited" | "NAAC A+" | "Approved" | "Under Review";
}

export interface AicteApprovalRecord {
  aicte_id: string;
  institution_id: string;
  institution_name: string;
  approval_status: "Approved" | "Show-Cause Pending" | "Approval Withdrawn" | "Deficiency Noticed";
  current_eoa_year: string; // Extension of Approval Year e.g. "2026-27"
  regional_office: string;
  programmes: ApprovedProgramme[];
  faculty_cadre_ratio: string; // e.g. "1:15"
  mandatory_committees: {
    anti_ragging_committee: boolean;
    internal_complaints_committee: boolean;
    grievance_redressal_cell: boolean;
    equal_opportunity_cell: boolean;
  };
  last_sanction_order?: string;
  last_inspection_date?: string;
}

// ── 2. CPGRAMS Grievance Ingestion Adapter ──────────────────────────────────
export interface CpgramsComplaintRecord {
  cpgrams_reg_no: string;
  source_ministry: string; // e.g. "Ministry of Education"
  applicant_name: string;
  applicant_phone: string;
  applicant_email: string;
  subject: string;
  grievance_text: string;
  target_institution_name: string;
  date_received_mow: string; // Ministry of Welfare / Education date
  target_bureau: Bureau;
  priority: "Normal" | "Urgent" | "VIP Reference" | "PMO Reference";
}

export interface CpgramsIngestionResult {
  cpgrams_reg_no: string;
  samanvay_docket_id: string;
  is_duplicate: boolean;
  matched_case_id?: string;
  similarity_score?: number;
  status: "INGESTED_NEW" | "CONSOLIDATED_DUPLICATE" | "REFERRED_EXISTING";
}

// ── 3. DigiLocker Identity Verification Adapter ────────────────────────────
export interface DigiLockerProfile {
  digilocker_id: string;
  full_name: string;
  dob: string;
  gender: "M" | "F" | "O";
  masked_aadhaar: string; // e.g. "XXXXXXXX1234"
  verified_mobile: string;
  is_verified: boolean;
  verified_at: string;
  certificate_type: "Aadhaar Card" | "ABC Student ID" | "APAAR ID";
}

// ── 4. NSP / PFMS Scholarship Lookup Adapter ──────────────────────────────
export interface ScholarshipDisbursementRecord {
  application_id: string;
  student_aadhaar_last4: string;
  scheme_name: string; // e.g. "Pragati Scholarship Scheme for Girl Students"
  academic_year: string;
  disbursement_status: "DISBURSED" | "PFMS_PROCESSING" | "PENDING_INSTITUTE_VERIFICATION" | "REJECTED_DEFICIENCY";
  sanctioned_amount: number;
  utr_reference?: string;
  disbursed_date?: string;
  bank_account_last4?: string;
  rejection_reason?: string;
}

// ── 5. Cross-Regulator Referral Adapter ────────────────────────────────────
export type ExternalRegulator =
  | "UGC"           // University Grants Commission
  | "BCI"           // Bar Council of India
  | "PCI"           // Pharmacy Council of India
  | "COA"           // Council of Architecture
  | "STATE_DTE"     // State Directorate of Technical Education
  | "STATE_POLICE"  // State Police / Cyber Crime Cell (Anti-Ragging)
  | "DISABILITY_COMMISSION"; // Chief Commissioner for Persons with Disabilities

export interface RegulatorReferral {
  referral_id: string;
  complaint_id: string;
  regulator: ExternalRegulator;
  officer_in_charge: string;
  date_referred: string;
  cover_letter_url?: string;
  statutory_clause: string;
  expected_reply_date: string;
  status: "OUTWARD_DISPATCHED" | "ACKNOWLEDGED" | "REPORT_RECEIVED" | "OVERDUE";
  official_reference_number: string;
  external_reply_summary?: string;
}

// ── 6. e-Office Dossier Export Adapter ──────────────────────────────────────
export interface EOfficeDossier {
  dossier_id: string;
  complaint_id: string;
  diarize_number: string; // e.g. "EO-AICTE-2026-D-49102"
  file_number: string;    // e.g. "F.No. AICTE/PGRC/2026/MAH-01/104"
  subject: string;
  green_sheet_notes: string[];
  pdf_dossier_url: string;
  generated_at: string;
  dispatch_status: "DISPATCHED_TO_SECTION" | "APPROVED_BY_CHAIRPERSON" | "RETURNED_FOR_FACTS";
}

// ── 7. Video Hearing Adapter ──────────────────────────────────────────────
export interface VideoMeetingConfig {
  hearing_id: string;
  complaint_id: string;
  title: string;
  start_iso: string;
  end_iso: string;
  provider: "Google Meet" | "Zoom" | "NIC BharatVC";
  meeting_url: string;
  meeting_passcode: string;
  dial_in_number?: string;
  ics_calendar_data: string;
}

// ── 8. eSign National Digital Signature Adapter ───────────────────────────
export interface ESignRequest {
  documentId: string;
  documentTitle: string;
  documentHashSha256: string;
  signerName: string;
  signerRole: string;
  signerAadhaarLast4?: string;
  authMode: "OTP" | "Biometric" | "Mock";
}

export interface ESignVerification {
  signatureId: string;
  documentId: string;
  signerName: string;
  signerRole: string;
  timestamp: string;
  certificateIssuer: string; // e.g. "CDAC eSign CA 2026 / NIC CA"
  verificationQrCodeUrl: string;
  isDocumentLocked: boolean;
  tamperSealHash: string;
}

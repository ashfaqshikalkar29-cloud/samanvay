/**
 * Samanvay AICTE Grievance Portal
 * e-Office Dossier Export Adapter (Domain D)
 * Generates official NIC e-Office electronic dossiers with green-sheet noting sheets,
 * diarization numbers, and simulated approval return webhooks.
 */

import { EOfficeDossier } from "./types";

class EOfficeAdapter {
  private dossiers = new Map<string, EOfficeDossier>();

  /**
   * Export complaint as an e-Office green-sheet noting dossier
   */
  async exportToEOffice(params: {
    complaintId: string;
    officerName: string;
    bureau: string;
    subject: string;
    notingText: string;
  }): Promise<EOfficeDossier> {
    const timestamp = new Date();
    const diarizeNumber = `EO-AICTE-${timestamp.getFullYear()}-D-${Math.floor(10000 + Math.random() * 90000)}`;
    const fileNumber = `F.No. AICTE/${params.bureau}/${timestamp.getFullYear()}/DL/${params.complaintId.replace(/[^A-Za-z0-9]/g, "")}`;
    const dossierId = `DOSSIER-${Date.now().toString().slice(-6)}`;

    const initialGreenSheet = [
      `Note #1: Case submitted for statutory consideration of competent authority. Grievance Reference: ${params.complaintId}.`,
      `Submitted by: ${params.officerName}, ${params.bureau} Bureau, AICTE New Delhi on ${timestamp.toLocaleDateString("en-IN")}.`,
      `Statutory Note: ${params.notingText}`,
    ];

    const dossier: EOfficeDossier = {
      dossier_id: dossierId,
      complaint_id: params.complaintId,
      diarize_number: diarizeNumber,
      file_number: fileNumber,
      subject: params.subject,
      green_sheet_notes: initialGreenSheet,
      pdf_dossier_url: `/api/complaints/pdf-summary?id=${params.complaintId}&eoffice=${diarizeNumber}`,
      generated_at: timestamp.toISOString(),
      dispatch_status: "DISPATCHED_TO_SECTION",
    };

    this.dossiers.set(dossierId, dossier);
    return dossier;
  }

  /**
   * Simulate competent authority (Chairperson / Member Secretary) approval return webhook
   */
  async processApprovalWebhook(dossierId: string, approvalRemarks: string): Promise<EOfficeDossier | null> {
    const dossier = this.dossiers.get(dossierId);
    if (!dossier) return null;

    dossier.dispatch_status = "APPROVED_BY_CHAIRPERSON";
    dossier.green_sheet_notes.push(
      `Note #2: Approved as proposed. Issue formal statutory directive to institute. Remarks: "${approvalRemarks}". Approved by Chairperson Office, AICTE.`
    );

    return dossier;
  }

  getDossier(dossierId: string): EOfficeDossier | undefined {
    return this.dossiers.get(dossierId);
  }
}

export const eOfficeAdapter = new EOfficeAdapter();

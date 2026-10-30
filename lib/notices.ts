/**
 * Samanvay AICTE Grievance Portal
 * Statutory Show-Cause Notice Engine (Domain A)
 * Dynamic template merging, deadline tracking, overdue flagging,
 * and institutional reply processing with compliance evidence.
 */

import { auditChain } from "@/lib/security/audit-chain";

export interface ShowCauseNotice {
  id: string;
  complaint_id: string;
  notice_reference: string;
  institution_id: string;
  institution_name: string;
  category: string;
  allegation_summary: string;
  issued_by_officer: string;
  issued_at: string; // ISO
  compliance_deadline: string; // YYYY-MM-DD
  is_overdue: boolean;
  status: "ISSUED_AWAITING_REPLY" | "REPLY_SUBMITTED" | "OVERDUE_BREACHED" | "DISCHARGED";
  rendered_text: string;
  institution_reply?: {
    replied_at: string;
    explanation: string;
    attachment_urls: string[];
    is_extension_requested?: boolean;
  };
}

export const SHOW_CAUSE_TEMPLATES: Record<string, string> = {
  default: `ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
(A Statutory Body of the Government of India)
Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070

STATUTORY SHOW-CAUSE NOTICE
Ref: {{notice_reference}}                                              Date: {{issued_date}}

To,
The Principal / Chairman / Secretary,
{{institute_name}}
(AICTE Permanent Institute ID: {{institution_id}})

Sub: SHOW-CAUSE NOTICE under AICTE Approval Process Regulations for {{category}} regarding Grievance Docket {{complaint_id}}.

WHEREAS, a formal grievance has been docketed with AICTE under reference {{complaint_id}} alleging non-compliance of statutory norms, specifically:
"{{allegation_summary}}"

WHEREAS, prima facie examination by the AICTE Competent Regulatory Bureau indicates serious infraction of AICTE Approval Process Handbook Regulations.

NOW, THEREFORE, you are hereby directed to SHOW CAUSE within 15 days (on or before {{compliance_deadline}}) as to why punitive regulatory action including but not limited to:
  1. Withdrawal of AICTE Approval for the academic year 2026-27;
  2. Imposition of financial penalty under AICTE Act Section 10;
  3. Reduction in 50% sanctioned intake in concerned programmes;
should not be initiated against your institution.

Your formal reply accompanied by documentary evidence must be uploaded directly to the Samanvay AICTE Institutional Docket portal on or before {{compliance_deadline}}. Failure to reply will result in ex-parte punitive adjudication.

By Order of the Competent Regulatory Authority,
{{issued_by_officer}}
All India Council for Technical Education`,
};

class NoticeManager {
  private notices = new Map<string, ShowCauseNotice>();

  constructor() {
    const sampleId = "SCN-2026-001";
    this.notices.set(sampleId, {
      id: sampleId,
      complaint_id: "C-1001",
      notice_reference: "AICTE/WRO/PGRC/2026/SCN-001",
      institution_id: "inst-1",
      institution_name: "Sahyadri Institute of Engineering & Technology",
      category: "Fee Regulation",
      allegation_summary: "Collection of unapproved capitation/development fee of Rs 45,000 for certificate release.",
      issued_by_officer: "Dr. Rajesh Verma (Regional Officer)",
      issued_at: "2026-10-18T10:00:00Z",
      compliance_deadline: "2026-11-02",
      is_overdue: false,
      status: "ISSUED_AWAITING_REPLY",
      rendered_text: "Statutory show-cause notice issued under AICTE APH Regulations 2026.",
    });
  }

  /**
   * Render and issue a statutory show-cause notice
   */
  async issueNotice(params: {
    complaintId: string;
    institutionId: string;
    institutionName: string;
    category: string;
    allegationSummary: string;
    issuedByOfficer: string;
    deadlineDays?: number;
  }): Promise<ShowCauseNotice> {
    const noticeId = `SCN-2026-${Date.now().toString().slice(-4)}`;
    const now = new Date();
    const deadlineDays = params.deadlineDays || 15;
    const deadlineDate = new Date(now.getTime() + deadlineDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const noticeReference = `AICTE/LEGAL/SCN/2026/${noticeId}`;
    const rawTemplate = SHOW_CAUSE_TEMPLATES.default;

    const renderedText = rawTemplate
      .replace(/{{notice_reference}}/g, noticeReference)
      .replace(/{{issued_date}}/g, now.toLocaleDateString("en-IN"))
      .replace(/{{institute_name}}/g, params.institutionName)
      .replace(/{{institution_id}}/g, params.institutionId)
      .replace(/{{category}}/g, params.category)
      .replace(/{{complaint_id}}/g, params.complaintId)
      .replace(/{{allegation_summary}}/g, params.allegationSummary)
      .replace(/{{compliance_deadline}}/g, deadlineDate)
      .replace(/{{issued_by_officer}}/g, params.issuedByOfficer);

    const notice: ShowCauseNotice = {
      id: noticeId,
      complaint_id: params.complaintId,
      notice_reference: noticeReference,
      institution_id: params.institutionId,
      institution_name: params.institutionName,
      category: params.category,
      allegation_summary: params.allegationSummary,
      issued_by_officer: params.issuedByOfficer,
      issued_at: now.toISOString(),
      compliance_deadline: deadlineDate,
      is_overdue: false,
      status: "ISSUED_AWAITING_REPLY",
      rendered_text: renderedText,
    };

    this.notices.set(noticeId, notice);

    auditChain.appendBlock(
      params.complaintId,
      "SHOW_CAUSE_NOTICE_ISSUED",
      { id: "officer", name: params.issuedByOfficer, role: "RB Officer" },
      { noticeId, noticeReference, deadline: deadlineDate, institution: params.institutionName }
    );

    return notice;
  }

  /**
   * Submit institutional reply to show-cause notice
   */
  async submitReply(
    noticeId: string,
    reply: { explanation: string; attachmentUrls: string[]; isExtensionRequested?: boolean }
  ): Promise<ShowCauseNotice | null> {
    const notice = this.notices.get(noticeId);
    if (!notice) return null;

    notice.status = "REPLY_SUBMITTED";
    notice.institution_reply = {
      replied_at: new Date().toISOString(),
      explanation: reply.explanation,
      attachment_urls: reply.attachmentUrls,
      is_extension_requested: reply.isExtensionRequested,
    };

    auditChain.appendBlock(
      notice.complaint_id,
      "SHOW_CAUSE_REPLY_SUBMITTED",
      { id: notice.institution_id, name: notice.institution_name, role: "Institute" },
      { noticeId, repliedAt: notice.institution_reply.replied_at, attachments: reply.attachmentUrls.length }
    );

    return notice;
  }

  getNoticesForComplaint(complaintId: string): ShowCauseNotice[] {
    return Array.from(this.notices.values()).filter((n) => n.complaint_id === complaintId);
  }

  getNoticesForInstitute(institutionId: string): ShowCauseNotice[] {
    return Array.from(this.notices.values()).filter((n) => n.institution_id === institutionId);
  }
}

export const noticeManager = new NoticeManager();

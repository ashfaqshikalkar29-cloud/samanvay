import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";
import { resumeSla } from "@/lib/sla-engine";
import { defaultNotificationService } from "@/lib/notifications/service";
import { EvidenceFile } from "@/lib/mock";
import { CaseEvent } from "@/lib/timeline";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      complaint_id,
      additional_text,
      evidence_files = [],
      actor = "Complainant Citizen",
    } = body as {
      complaint_id: string;
      additional_text?: string;
      evidence_files?: EvidenceFile[];
      actor?: string;
    };

    if (!complaint_id || (!additional_text && evidence_files.length === 0)) {
      return NextResponse.json(
        { error: "complaint_id and either additional_text or evidence_files are required." },
        { status: 400 }
      );
    }

    const repo = getRepo();
    const data = await repo.loadAll();
    const complaint = data.complaints.find((c) => c.id === complaint_id);

    if (!complaint) {
      return NextResponse.json({ error: `Complaint "${complaint_id}" not found.` }, { status: 404 });
    }

    const timestamp = new Date().toISOString();

    // Append evidence files
    const currentEvidence = complaint.evidence || [];
    const updatedEvidence = [...currentEvidence, ...evidence_files];
    complaint.evidence = updatedEvidence;

    // Append to additional_submissions list
    const currentSubmissions = complaint.dynamic_fields?.additional_submissions || [];
    const newSubmission = {
      submitted_by: actor,
      submitted_at: timestamp,
      text: additional_text || "",
      file_count: evidence_files.length,
    };

    let wasPaused = Boolean(complaint.dynamic_fields?.is_paused_awaiting_info);
    let dynamicFields = {
      ...(complaint.dynamic_fields || {}),
      additional_submissions: [...currentSubmissions, newSubmission],
    };

    // Auto-resume SLA if it was paused awaiting information!
    if (wasPaused) {
      const resumePatch = resumeSla(complaint, timestamp);
      dynamicFields = {
        ...dynamicFields,
        ...resumePatch.dynamic_fields,
      };
    }

    complaint.dynamic_fields = dynamicFields;

    // Log Audit Entry
    await repo.addAudit({
      complaint_id,
      action: "Additional Information Submitted",
      timestamp,
      officer: actor,
      remarks: `Submitted: ${additional_text ? `"${additional_text.slice(0, 80)}..." ` : ""}${evidence_files.length} document(s) attached.${wasPaused ? " SLA timer resumed." : ""}`,
    });

    // Log Case Timeline Event
    const event: CaseEvent = {
      id: `evt-add-info-${Date.now()}`,
      complaint_id,
      bureau: complaint.bureau,
      actor: `${actor} (Complainant)`,
      event_type: "note",
      title: "Citizen Supplementary Submission",
      description: `Additional facts/evidence submitted by complainant: ${additional_text || `${evidence_files.length} attached documents`}${wasPaused ? " (Statutory SLA clock resumed)" : ""}`,
      created_at: timestamp,
      metadata: { fileCount: evidence_files.length, wasPaused },
    };
    await repo.addEvent(event);

    // Notify Assigned Officer
    await defaultNotificationService.sendNotification({
      complaint_id,
      tracking_id: complaint.tracking_id,
      recipient_role: "officer",
      recipient_name: complaint.assigned_officer || "Assigned Officer",
      recipient_contact: "officer@aicte-india.org",
      channel: "in_app",
      title: `New Evidence Submitted: ${complaint.id}`,
      message: `Complainant has uploaded supplementary documentation for Docket ${complaint.id}. Review and proceed with statutory inquiry.`,
      priority: "normal",
      action_url: `/complaint/${complaint_id}`,
    });

    return NextResponse.json({
      success: true,
      complaint_id,
      evidence_count: updatedEvidence.length,
      sla_resumed: wasPaused,
      submitted_at: timestamp,
    });
  } catch (err: any) {
    console.error("Error submitting additional information:", err);
    return NextResponse.json({ error: "Failed to submit additional information." }, { status: 500 });
  }
}

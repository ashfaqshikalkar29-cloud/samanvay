import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";
import { defaultNotificationService } from "@/lib/notifications/service";
import { CaseEvent } from "@/lib/timeline";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      complaint_id,
      requested_days = 7,
      justification,
      actor = "Institution Nodal Officer",
    } = body;

    if (!complaint_id || !justification || justification.trim().length < 5) {
      return NextResponse.json(
        { error: "complaint_id and a valid extension justification (min 5 chars) are required." },
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
    const currentRequests = complaint.dynamic_fields?.extension_requests || [];

    const requestRecord = {
      requested_days: Number(requested_days),
      justification,
      requested_by: actor,
      requested_at: timestamp,
      status: "pending_officer_review",
    };

    complaint.dynamic_fields = {
      ...(complaint.dynamic_fields || {}),
      extension_requests: [...currentRequests, requestRecord],
    };

    // Log Audit Entry
    await repo.addAudit({
      complaint_id,
      action: "Deadline Extension Requested",
      timestamp,
      officer: actor,
      remarks: `Institution requested ${requested_days} additional days for Show-Cause reply. Reason: ${justification}`,
    });

    // Log Timeline Event
    const event: CaseEvent = {
      id: `evt-ext-${Date.now()}`,
      complaint_id,
      bureau: complaint.bureau,
      actor: `${actor} (Institute)`,
      event_type: "notice",
      title: "Show-Cause Deadline Extension Requested",
      description: `Institution requested ${requested_days}-day statutory extension. Justification: ${justification}`,
      created_at: timestamp,
      metadata: { requested_days, justification },
    };
    await repo.addEvent(event);

    // Notify Officer
    await defaultNotificationService.sendNotification({
      complaint_id,
      tracking_id: complaint.tracking_id,
      recipient_role: "officer",
      recipient_name: complaint.assigned_officer || "Assigned Officer",
      recipient_contact: "officer@aicte-india.org",
      channel: "in_app",
      title: `Extension Request: Docket ${complaint.id}`,
      message: `Institution has requested ${requested_days} days extension for Show-Cause notice reply. Review and adjudicate.`,
      priority: "high",
      action_url: `/complaint/${complaint_id}`,
    });

    return NextResponse.json({
      success: true,
      complaint_id,
      requested_days,
      justification,
      status: "pending_officer_review",
      requested_at: timestamp,
    });
  } catch (err: any) {
    console.error("Error submitting deadline extension request:", err);
    return NextResponse.json({ error: "Failed to submit deadline extension request." }, { status: 500 });
  }
}

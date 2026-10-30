import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";
import { defaultNotificationService } from "@/lib/notifications/service";
import { CaseEvent } from "@/lib/timeline";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { complaint_id, reason, actor = "Complainant Citizen" } = body;

    if (!complaint_id || !reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "complaint_id and a valid withdrawal reason (min 5 chars) are required." },
        { status: 400 }
      );
    }

    const repo = getRepo();
    const data = await repo.loadAll();
    const complaint = data.complaints.find((c) => c.id === complaint_id);

    if (!complaint) {
      return NextResponse.json({ error: `Complaint "${complaint_id}" not found.` }, { status: 404 });
    }

    if (complaint.status === "Disposed") {
      return NextResponse.json({ error: "Cannot withdraw an already disposed grievance." }, { status: 422 });
    }

    const timestamp = new Date().toISOString();

    // Update in repo
    await repo.updateComplaint(complaint_id, {
      status: "Disposed",
    });

    complaint.status = "Disposed";
    complaint.decision_type = "Withdrawn by Complainant";
    complaint.dynamic_fields = {
      ...(complaint.dynamic_fields || {}),
      withdrawal_details: {
        reason,
        withdrawn_by: actor,
        withdrawn_at: timestamp,
      },
    };

    // Add Audit Entry
    await repo.addAudit({
      complaint_id,
      action: "Grievance Withdrawn",
      timestamp,
      officer: actor,
      remarks: `Complaint withdrawn by citizen. Reason: ${reason}`,
    });

    // Add Timeline Event
    const event: CaseEvent = {
      id: `evt-withdraw-${Date.now()}`,
      complaint_id,
      bureau: complaint.bureau,
      actor: `${actor} (Complainant)`,
      event_type: "decision",
      title: "Grievance Withdrawn by Citizen",
      description: `Complainant formally withdrew this grievance. Reason: ${reason}`,
      created_at: timestamp,
      metadata: { reason },
    };
    await repo.addEvent(event);

    // Send confirmation notification
    await defaultNotificationService.sendNotification({
      complaint_id,
      tracking_id: complaint.tracking_id,
      recipient_role: "complainant",
      recipient_name: actor,
      recipient_contact: "+91 98123 45678",
      channel: "sms",
      title: "Grievance Withdrawn Successfully",
      message: `Your grievance ${complaint.tracking_id || complaint_id} has been recorded as withdrawn and closed.`,
      priority: "normal",
    });

    return NextResponse.json({
      success: true,
      complaint_id,
      status: "Disposed",
      decision_type: "Withdrawn by Complainant",
      withdrawn_at: timestamp,
    });
  } catch (err: any) {
    console.error("Error withdrawing complaint:", err);
    return NextResponse.json({ error: "Failed to withdraw complaint." }, { status: 500 });
  }
}

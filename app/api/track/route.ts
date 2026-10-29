import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";
import { getSla } from "@/lib/sla";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const trackingId = (searchParams.get("id") || "").trim();
    const verify = (searchParams.get("verify") || "").trim();

    if (!trackingId) {
      return NextResponse.json({ error: "Tracking ID (or Complaint ID) is required." }, { status: 400 });
    }

    const repo = getRepo();
    const { complaints, institutions, audit } = await repo.loadAll();

    const complaint = complaints.find(
      (c) =>
        (c.tracking_id && c.tracking_id.toLowerCase() === trackingId.toLowerCase()) ||
        c.id.toLowerCase() === trackingId.toLowerCase()
    );

    if (!complaint) {
      return NextResponse.json(
        { error: `No grievance found matching Tracking ID "${trackingId}". Please verify your reference number.` },
        { status: 404 }
      );
    }

    const inst = institutions.find((i) => i.id === complaint.institution_id);
    const caseAudit = audit.filter((a) => a.complaint_id === complaint.id);
    const sla = getSla(complaint);

    // Verification check for full vs public safe view
    let isFullAccess = false;
    if (complaint.is_anonymous) {
      if (verify && complaint.anonymous_access_key && verify.toLowerCase() === complaint.anonymous_access_key.toLowerCase()) {
        isFullAccess = true;
      }
    } else if (complaint.complainant_phone_last4) {
      if (verify && verify === complaint.complainant_phone_last4) {
        isFullAccess = true;
      }
    } else {
      isFullAccess = true;
    }

    // Milestones progression
    const milestones = [
      {
        step: 1,
        title: "Grievance Received",
        description: `Docketed through ${complaint.channel?.toUpperCase() || "WEB"} channel.`,
        date: complaint.date_received,
        completed: true,
      },
      {
        step: 2,
        title: `Bureau Scrutiny (${complaint.bureau})`,
        description: `Under scrutiny by ${complaint.bureau} Officer. Next Action: ${complaint.next_action}`,
        date: complaint.date_received,
        completed: complaint.status === "In-Process" || complaint.status === "Disposed",
      },
      {
        step: 3,
        title: "Adjudication & Final Order",
        description:
          complaint.status === "Disposed"
            ? "Grievance formally disposed with official orders issued."
            : `Expected completion within AICTE SLA (${sla.due}).`,
        date: complaint.status === "Disposed" ? complaint.date_received : undefined,
        completed: complaint.status === "Disposed",
      },
    ];

    return NextResponse.json({
      success: true,
      tracking_id: complaint.tracking_id || complaint.id,
      id: complaint.id,
      institution_name: inst?.name || "AICTE Approved Institution",
      institution_state: inst?.state || inst?.region,
      category: complaint.category,
      channel: complaint.channel,
      status: complaint.status,
      bureau: complaint.bureau,
      date_received: complaint.date_received,
      is_anonymous: complaint.is_anonymous,
      requires_verification: !isFullAccess,
      // Full details available only when verified:
      description: isFullAccess ? complaint.description : `${(complaint.description || "").slice(0, 60)}... [Verify phone to view complete grievance text]`,
      dynamic_fields: isFullAccess ? complaint.dynamic_fields : undefined,
      evidence_count: complaint.evidence?.length || 0,
      evidence: isFullAccess ? complaint.evidence : undefined,
      milestones,
      history: isFullAccess
        ? caseAudit.map((a) => ({ action: a.action, timestamp: a.timestamp, officer: a.officer, remarks: a.remarks }))
        : caseAudit.map((a) => ({ action: a.action, timestamp: a.timestamp })),
    });
  } catch (err: any) {
    console.error("Tracking API error:", err);
    return NextResponse.json({ error: "Failed to fetch tracking details." }, { status: 500 });
  }
}

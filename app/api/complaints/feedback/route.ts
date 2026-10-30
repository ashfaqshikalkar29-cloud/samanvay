import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { complaint_id, rating, comments = "", actor = "Citizen Complainant" } = body;

    if (!complaint_id || typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "complaint_id and a valid rating (integer between 1 and 5) are required." },
        { status: 400 }
      );
    }

    const repo = getRepo();
    const data = await repo.loadAll();
    const complaint = data.complaints.find((c) => c.id === complaint_id);

    if (!complaint) {
      return NextResponse.json({ error: `Complaint "${complaint_id}" not found.` }, { status: 404 });
    }

    if (complaint.status !== "Disposed") {
      return NextResponse.json(
        { error: "Feedback can only be submitted after the grievance is resolved and disposed." },
        { status: 422 }
      );
    }

    const timestamp = new Date().toISOString();
    const feedbackRecord = {
      rating,
      comments,
      rated_by: actor,
      rated_at: timestamp,
    };

    complaint.dynamic_fields = {
      ...(complaint.dynamic_fields || {}),
      citizen_feedback: feedbackRecord,
    };

    // Log Audit
    await repo.addAudit({
      complaint_id,
      action: "Citizen Feedback Received",
      timestamp,
      officer: actor,
      remarks: `Resolution rated ${rating}/5 stars. Comment: "${comments}"`,
    });

    return NextResponse.json({
      success: true,
      complaint_id,
      rating,
      comments,
      rated_at: timestamp,
    });
  } catch (err: any) {
    console.error("Error saving citizen feedback:", err);
    return NextResponse.json({ error: "Failed to save feedback." }, { status: 500 });
  }
}

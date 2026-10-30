import { NextRequest, NextResponse } from "next/server";
import { hearingManager } from "@/lib/hearings";
import { extractAuthContext, hasPermission } from "@/lib/security/rbac";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const complaintId = searchParams.get("complaint_id");

    if (complaintId) {
      const hearings = hearingManager.getHearingsForComplaint(complaintId);
      return NextResponse.json({ success: true, count: hearings.length, hearings });
    }

    const hearings = hearingManager.getAllHearings();
    return NextResponse.json({ success: true, count: hearings.length, hearings });
  } catch (err: any) {
    console.error("Get Hearings Error:", err);
    return NextResponse.json({ error: "Failed to fetch hearings." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = extractAuthContext(req, body);

    // Officers and Admin can schedule hearings
    if (auth.role === "Institute" || auth.role === "Complainant") {
      return NextResponse.json(
        { error: `Access Denied: Role '${auth.role}' is not authorized to convene statutory hearings.` },
        { status: 403 }
      );
    }

    const { complaint_id, title, date, start_time, end_time, mode, presiding_officer, participants } = body;

    if (!complaint_id || !title || !date || !start_time || !end_time) {
      return NextResponse.json(
        { error: "Missing required fields: complaint_id, title, date, start_time, and end_time are mandatory." },
        { status: 400 }
      );
    }

    const result = await hearingManager.scheduleHearing({
      complaintId: complaint_id,
      title,
      date,
      startTime: start_time,
      endTime: end_time,
      mode: mode || "Video",
      presidingOfficer: presiding_officer || "Dr. Rajesh Verma (Regional Officer)",
      participants: participants || [
        { name: "Complainant Citizen", email: "citizen@example.com", role: "Complainant", attendance_status: "Invited" },
        { name: "Principal / Registrar", email: "principal@institute.edu", role: "Principal / Institute Head", attendance_status: "Invited" },
      ],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Statutory hearing successfully convened with automated video provisioning and conflict check.",
        hearing: result.hearing,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Schedule Hearing Error:", err);
    return NextResponse.json({ error: err.message || "Failed to schedule hearing." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { hearing_id, minutes, outcome_order } = body;

    if (!hearing_id || !minutes) {
      return NextResponse.json(
        { error: "Hearing ID and minutes of hearing text are required." },
        { status: 400 }
      );
    }

    const updated = await hearingManager.recordHearingMinutes(hearing_id, minutes, outcome_order);
    if (!updated) {
      return NextResponse.json({ error: "Hearing not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Minutes of Hearing and regulatory outcome recorded.",
      hearing: updated,
    });
  } catch (err: any) {
    console.error("Record Minutes Error:", err);
    return NextResponse.json({ error: "Failed to record minutes of hearing." }, { status: 500 });
  }
}

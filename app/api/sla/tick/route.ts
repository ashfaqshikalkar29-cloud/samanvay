import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";
import { calculateStageSla, runSlaTick, pauseSla, resumeSla } from "@/lib/sla-engine";
import { DEMO_TODAY, Role } from "@/lib/mock";
import { CaseEvent } from "@/lib/timeline";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const complaintId = searchParams.get("complaint_id");
    const refDate = searchParams.get("reference_date") || DEMO_TODAY;

    const repo = getRepo();
    const data = await repo.loadAll();

    if (complaintId) {
      const c = data.complaints.find((x) => x.id === complaintId);
      if (!c) {
        return NextResponse.json({ error: `Complaint "${complaintId}" not found.` }, { status: 404 });
      }
      const sla = calculateStageSla(c, refDate);
      return NextResponse.json({ success: true, sla });
    }

    const tick = runSlaTick(data.complaints, refDate);
    return NextResponse.json({ success: true, ...tick });
  } catch (err: any) {
    console.error("Error evaluating SLA:", err);
    return NextResponse.json({ error: "Failed to evaluate SLA." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      action = "tick",
      complaint_id,
      reason,
      actor = "SLA Automation Engine",
      role = "Admin" as Role,
      reference_date = DEMO_TODAY,
    } = body;

    const repo = getRepo();
    const data = await repo.loadAll();

    if (action === "pause") {
      if (!complaint_id) {
        return NextResponse.json({ error: "complaint_id is required to pause SLA." }, { status: 400 });
      }
      const complaint = data.complaints.find((c) => c.id === complaint_id);
      if (!complaint) {
        return NextResponse.json({ error: `Complaint "${complaint_id}" not found.` }, { status: 404 });
      }

      const pausePatch = pauseSla(complaint, reason || "Awaiting institutional inquiry reply");
      complaint.dynamic_fields = pausePatch.dynamic_fields;

      const now = new Date().toISOString();
      await repo.addAudit({
        complaint_id,
        action: "SLA Timer Paused",
        timestamp: now,
        officer: actor,
        remarks: `Timer paused. Reason: ${reason || "Awaiting institutional reply"}`,
      });

      const event: CaseEvent = {
        id: `evt-sla-pause-${Date.now()}`,
        complaint_id,
        bureau: complaint.bureau,
        actor: `${actor} (${role})`,
        event_type: "status_change",
        title: "SLA Clock Paused",
        description: `Countdown timer paused while awaiting information: ${reason || "Awaiting reply"}`,
        created_at: now,
      };
      await repo.addEvent(event);

      return NextResponse.json({
        success: true,
        complaint_id,
        is_paused: true,
        pause_reason: reason,
      });
    }

    if (action === "resume") {
      if (!complaint_id) {
        return NextResponse.json({ error: "complaint_id is required to resume SLA." }, { status: 400 });
      }
      const complaint = data.complaints.find((c) => c.id === complaint_id);
      if (!complaint) {
        return NextResponse.json({ error: `Complaint "${complaint_id}" not found.` }, { status: 404 });
      }

      const resumePatch = resumeSla(complaint);
      complaint.dynamic_fields = resumePatch.dynamic_fields;

      const now = new Date().toISOString();
      await repo.addAudit({
        complaint_id,
        action: "SLA Timer Resumed",
        timestamp: now,
        officer: actor,
        remarks: "Information received. SLA countdown timer resumed.",
      });

      const event: CaseEvent = {
        id: `evt-sla-resume-${Date.now()}`,
        complaint_id,
        bureau: complaint.bureau,
        actor: `${actor} (${role})`,
        event_type: "status_change",
        title: "SLA Clock Resumed",
        description: "Countdown resumed following receipt of required documents/reply.",
        created_at: now,
      };
      await repo.addEvent(event);

      return NextResponse.json({
        success: true,
        complaint_id,
        is_paused: false,
        total_paused_duration_ms: complaint.dynamic_fields?.total_paused_duration_ms,
      });
    }

    // Default action: "tick"
    const tick = runSlaTick(data.complaints, reference_date);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...tick,
    });
  } catch (err: any) {
    console.error("Error processing SLA tick action:", err);
    return NextResponse.json({ error: "Failed to process SLA action." }, { status: 500 });
  }
}

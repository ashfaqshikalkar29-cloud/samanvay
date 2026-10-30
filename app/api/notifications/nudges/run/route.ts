import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";
import { evaluateAndGenerateNudges, dispatchProactiveNudges } from "@/lib/notifications/nudges";
import { DEMO_TODAY } from "@/lib/mock";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const referenceDate = body.reference_date || DEMO_TODAY;

    const repo = getRepo();
    const data = await repo.loadAll();

    const nudges = evaluateAndGenerateNudges(data.complaints, data.institutions, referenceDate);
    const dispatched = await dispatchProactiveNudges(nudges);

    return NextResponse.json({
      success: true,
      evaluated_cases: data.complaints.length,
      nudges_generated: nudges.length,
      nudges_dispatched: dispatched.length,
      summary: {
        institute_50_reminders: nudges.filter((n) => n.type === "show_cause_50").length,
        institute_80_urgent: nudges.filter((n) => n.type === "show_cause_80").length,
        complainant_info_requests: nudges.filter((n) => n.type === "info_request").length,
        sla_breach_escalations: nudges.filter((n) => n.type === "sla_breach_warning").length,
      },
      dispatched_records: dispatched.slice(0, 10),
    });
  } catch (err: any) {
    console.error("Error running proactive nudges:", err);
    return NextResponse.json({ error: "Failed to evaluate and run proactive nudges." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const complaintId = searchParams.get("complaint_id");
    const bureauFilter = searchParams.get("bureau");
    const eventTypeFilter = searchParams.get("event_type");

    if (!complaintId) {
      return NextResponse.json({ error: "complaint_id query parameter is required." }, { status: 400 });
    }

    const repo = getRepo();
    let events = await repo.getEvents(complaintId);

    if (bureauFilter && bureauFilter !== "All") {
      events = events.filter((e) => e.bureau === bureauFilter);
    }

    if (eventTypeFilter && eventTypeFilter !== "All") {
      events = events.filter((e) => e.event_type === eventTypeFilter);
    }

    return NextResponse.json({
      success: true,
      complaint_id: complaintId,
      total_events: events.length,
      events,
    });
  } catch (err: any) {
    console.error("Timeline events error:", err);
    return NextResponse.json({ error: "Failed to fetch timeline events." }, { status: 500 });
  }
}

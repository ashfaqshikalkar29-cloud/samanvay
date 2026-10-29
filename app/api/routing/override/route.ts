import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";
import type { Bureau } from "@/lib/mock";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { complaint_id, predicted_bureau, selected_bureau, confidence, officer, reason } = body;

    if (!complaint_id || !predicted_bureau || !selected_bureau) {
      return NextResponse.json(
        { error: "complaint_id, predicted_bureau, and selected_bureau are required." },
        { status: 400 }
      );
    }

    const repo = getRepo();
    await repo.recordRoutingFeedback({
      id: `fb-${Date.now()}`,
      complaint_id,
      predicted_bureau: predicted_bureau as Bureau,
      selected_bureau: selected_bureau as Bureau,
      confidence: Number(confidence) || 0.5,
      officer: officer || "Officer",
      reason: reason || "Manual bureau reassignment by officer",
      timestamp: new Date().toISOString(),
    });

    // Also update complaint bureau in repo
    await repo.transferComplaint(complaint_id, officer || "Officer", selected_bureau as Bureau);

    return NextResponse.json({
      success: true,
      message: `Routing override recorded as feedback. Case assigned to ${selected_bureau}.`,
      complaint_id,
      selected_bureau,
    });
  } catch (err: any) {
    console.error("Routing override error:", err);
    return NextResponse.json({ error: "Failed to record routing override." }, { status: 500 });
  }
}

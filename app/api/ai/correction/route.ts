import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";
import { AICorrectionLog } from "@/lib/ai/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const repo = getRepo();

    // Support batch composite correction format
    if (body.corrected_category || body.corrected_urgency) {
      const complaintId = body.complaint_id;
      const officer = body.officer_name || body.officer || "Officer";
      const reason = body.officer_notes || body.reason || "Manual verification";

      const log: AICorrectionLog = {
        id: `corr-${Date.now()}`,
        complaint_id: complaintId,
        field: "urgency",
        original_value: body.original_predictions?.urgency || "medium",
        corrected_value: body.corrected_urgency || body.corrected_category || "high",
        officer,
        reason,
        timestamp: new Date().toISOString(),
      };

      await repo.recordAICorrection(log);

      return NextResponse.json({
        success: true,
        message: `Composite correction logged for complaint ${complaintId}.`,
        correction: log,
      });
    }

    // Standard single-field correction
    const {
      complaint_id,
      field,
      original_value,
      corrected_value,
      officer = "Officer",
      reason = "Manual verification",
    } = body;

    if (!complaint_id || !field || original_value === undefined || corrected_value === undefined) {
      return NextResponse.json(
        { error: "complaint_id, field, original_value, and corrected_value are required." },
        { status: 400 }
      );
    }

    const log: AICorrectionLog = {
      id: `corr-${Date.now()}`,
      complaint_id,
      field,
      original_value: String(original_value),
      corrected_value: String(corrected_value),
      officer,
      reason,
      timestamp: new Date().toISOString(),
    };

    await repo.recordAICorrection(log);

    return NextResponse.json({
      success: true,
      message: `Correction logged for ${field} on complaint ${complaint_id}.`,
      correction: log,
    });
  } catch (err: any) {
    console.error("AI Correction log error:", err);
    return NextResponse.json(
      { error: "Failed to record AI prediction correction." },
      { status: 500 }
    );
  }
}

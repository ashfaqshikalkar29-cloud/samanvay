import { NextRequest, NextResponse } from "next/server";
import { defaultDistressScanner } from "@/lib/ai/distress";
import { getRepo } from "@/lib/data/repo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, description, complaint_id, trigger_notification = true } = body;
    const content = description || text;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content text is required for distress scanning." },
        { status: 400 }
      );
    }

    const scanResult = await defaultDistressScanner.scan(content);

    // If linked to an active complaint and distress is detected, elevate urgency to critical
    if (complaint_id && scanResult.has_distress && trigger_notification) {
      const repo = getRepo();
      await repo.updateComplaint(complaint_id, {
        has_distress: true,
        distress_details: scanResult,
        urgency: "critical",
        next_action: "EMERGENCY: Immediate safety protocol initiated. Case placed in high-priority officer queue.",
      });

      // Add timeline safety event
      await repo.addEvent({
        id: `evt-safety-${Date.now()}`,
        complaint_id,
        bureau: "System",
        event_type: "notice",
        actor: "AICTE Student Welfare Safety Cell",
        title: `🚨 Emergency Distress Signal Flagged (${scanResult.distress_category.toUpperCase()})`,
        description: `Automated distress scanner flagged high-risk distress signals: ${scanResult.matched_phrases.join(", ")}. Protocol: "${scanResult.immediate_safety_action}". Designated safety officers notified. Standard auto-replies suppressed.`,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      complaint_id: complaint_id || null,
      scan: scanResult,
    });
  } catch (err: any) {
    console.error("Distress scan error:", err);
    return NextResponse.json(
      { error: "Failed to perform distress and safety scan." },
      { status: 500 }
    );
  }
}

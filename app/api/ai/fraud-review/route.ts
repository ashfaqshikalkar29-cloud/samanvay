import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";
import { defaultFraudEngine } from "@/lib/ai/fraud";

export async function GET() {
  try {
    const repo = getRepo();
    const cases = await repo.getSuspiciousComplaints();

    return NextResponse.json({
      success: true,
      total_suspicious: cases.filter((c) => c.review_status === "pending").length,
      cases,
    });
  } catch (err: any) {
    console.error("Fraud review queue error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve suspicious queue." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = "evaluate", ...payload } = body;
    const repo = getRepo();

    // 1. Officer Review Action
    if (action === "review") {
      const { complaint_id, decision, officer = "Officer" } = payload;
      if (!complaint_id || !decision || !["cleared_legitimate", "confirmed_spam"].includes(decision)) {
        return NextResponse.json(
          { error: "complaint_id and decision ('cleared_legitimate' | 'confirmed_spam') are required." },
          { status: 400 }
        );
      }

      await repo.reviewFraudCase(complaint_id, decision, officer);

      // If marked as confirmed spam, update complaint status or next action
      if (decision === "confirmed_spam") {
        await repo.updateComplaint(complaint_id, {
          status: "Disposed",
          next_action: `Closed as confirmed fraudulent / spam submission by ${officer}.`,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Docket ${complaint_id} marked as ${decision} by ${officer}.`,
      });
    }

    // 2. Score New Submission
    const { text, institution_id = "inst-1", complaint_id = "NEW", ip, user_agent, phone } = payload;
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Submission text is required for fraud evaluation." },
        { status: 400 }
      );
    }

    const evaluation = defaultFraudEngine.evaluate(complaint_id, text, institution_id, {
      ip,
      userAgent: user_agent,
      phone,
    });

    return NextResponse.json({
      success: true,
      evaluation,
    });
  } catch (err: any) {
    console.error("Fraud review API error:", err);
    return NextResponse.json(
      { error: "Failed to process fraud evaluation." },
      { status: 500 }
    );
  }
}

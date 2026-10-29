import { NextRequest, NextResponse } from "next/server";
import { defaultSummarizer } from "@/lib/ai/summarizer";
import { getRepo } from "@/lib/data/repo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      complaint_id,
      description,
      category = "General",
      institution_name = "Technical Institution",
      force_regenerate = false,
    } = body;

    if (!complaint_id) {
      return NextResponse.json(
        { error: "complaint_id is required for case summarisation." },
        { status: 400 }
      );
    }

    const repo = getRepo();
    const events = await repo.getEvents(complaint_id);
    const { audit, complaints, institutions } = await repo.loadAll();
    const complaint = complaints.find((c) => c.id === complaint_id);
    const caseAudit = audit.filter((a) => a.complaint_id === complaint_id);

    const descToUse = description || complaint?.description || "Grievance pending full docket text.";
    const catToUse = category || complaint?.category || "General";
    const instObj = complaint ? institutions.find((i) => i.id === complaint.institution_id) : undefined;
    const instName = institution_name || instObj?.name || "AICTE Approved Institution";

    const summary = await defaultSummarizer.summarize(
      complaint_id,
      descToUse,
      catToUse,
      instName,
      events,
      caseAudit
    );

    // Persist summary into complaint record if complaint exists
    if (complaint && (!complaint.ai_summary || force_regenerate)) {
      await repo.updateComplaint(complaint_id, {
        ai_summary: summary,
      });
    }

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (err: any) {
    console.error("AI Summarizer error:", err);
    return NextResponse.json(
      { error: "Failed to generate case summary." },
      { status: 500 }
    );
  }
}

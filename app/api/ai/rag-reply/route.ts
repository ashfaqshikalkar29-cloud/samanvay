import { NextRequest, NextResponse } from "next/server";
import { defaultRAGResolution } from "@/lib/ai/rag-resolution";
import { getRepo } from "@/lib/data/repo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { complaint_id, description, category, institution_name } = body;

    let desc = description;
    let cat = category || "General";
    let inst = institution_name || "Technical Institution";

    if (complaint_id) {
      const repo = getRepo();
      const { complaints, institutions } = await repo.loadAll();
      const c = complaints.find((x) => x.id === complaint_id);
      if (c) {
        desc = desc || c.description || "";
        cat = c.category;
        const instObj = institutions.find((i) => i.id === c.institution_id);
        inst = instObj?.name || inst;
      }
    }

    if (!desc || typeof desc !== "string" || desc.trim().length === 0) {
      return NextResponse.json(
        { error: "Grievance description or valid complaint_id is required for RAG draft reply." },
        { status: 400 }
      );
    }

    const draft = await defaultRAGResolution.generateDraftReply(desc, cat, inst);

    return NextResponse.json({
      success: true,
      complaint_id: complaint_id || null,
      draft,
    });
  } catch (err: any) {
    console.error("RAG Draft reply error:", err);
    return NextResponse.json(
      { error: "Failed to generate RAG suggested resolution and draft reply." },
      { status: 500 }
    );
  }
}

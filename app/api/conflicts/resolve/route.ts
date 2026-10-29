import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conflict_id, resolution_notes, resolved_by, role } = body;

    if (role && !["Admin", "RB Officer", "PGRC Officer", "Chairperson"].includes(role)) {
      return NextResponse.json(
        { error: "Access Denied: Only bureau officers and administrators can resolve regulatory conflicts." },
        { status: 403 }
      );
    }

    if (!conflict_id || !resolution_notes || resolution_notes.trim().length < 10) {
      return NextResponse.json(
        { error: "Conflict ID and formal resolution notes (at least 10 characters) are required." },
        { status: 400 }
      );
    }

    const repo = getRepo();
    await repo.resolveConflict(conflict_id, {
      notes: resolution_notes.trim(),
      resolved_by: resolved_by || "Bureau Joint Committee",
    });

    return NextResponse.json({
      success: true,
      message: "Regulatory contradiction resolved and recorded in case audit trails.",
      conflict_id,
    });
  } catch (err: any) {
    console.error("Conflict resolution error:", err);
    return NextResponse.json({ error: "Failed to resolve conflict alert." }, { status: 500 });
  }
}

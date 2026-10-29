import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";
import type { Bureau } from "@/lib/mock";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { master_id, child_ids, lead_bureau, officer, role } = body;

    // 1. Role validation
    if (role && !["Admin", "RB Officer", "PGRC Officer", "Chairperson"].includes(role)) {
      return NextResponse.json(
        { error: "Access Denied: Only bureau officers and administrators can merge complaints." },
        { status: 403 }
      );
    }

    if (!master_id || !Array.isArray(child_ids) || child_ids.length === 0) {
      return NextResponse.json(
        { error: "Master complaint ID and at least one child complaint ID are required." },
        { status: 400 }
      );
    }

    if (!lead_bureau || !["RB", "PGRC"].includes(lead_bureau)) {
      return NextResponse.json(
        { error: "A valid Lead Bureau ('RB' or 'PGRC') must be designated for consolidated proceedings." },
        { status: 400 }
      );
    }

    const repo = getRepo();
    const ok = await repo.mergeComplaints(
      master_id,
      child_ids,
      lead_bureau as Bureau,
      officer || "Officer"
    );

    if (!ok) {
      return NextResponse.json({ error: "Master complaint not found or merge failed." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully merged ${child_ids.length} complaint(s) into master case ${master_id}.`,
      master_id,
      child_ids,
      lead_bureau,
    });
  } catch (err: any) {
    console.error("Merge error:", err);
    return NextResponse.json({ error: "Failed to merge complaints." }, { status: 500 });
  }
}
